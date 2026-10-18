import { supabase } from "./supabase";
import type { ReportSet, StudentRow } from "./types";

/** Saves a report set (one class × semester) and replaces its student rows. */
export async function saveSet(set: ReportSet, rows: StudentRow[]) {
  const sb = supabase();
  const valid = rows.filter((r) => r.student_code && r.full_name);
  const codes = new Set<string>();
  for (const r of valid) {
    if (codes.has(r.student_code)) throw new Error(`เลขประจำตัวซ้ำ: ${r.student_code}`);
    codes.add(r.student_code);
  }
  const payload = valid.map(({ id: _rid, ...r }) => r);

  // Preferred: one transaction in the database (0004_atomic_save.sql)
  const rpc = await sb.rpc("save_report_set", { p_set: set, p_rows: payload });
  if (!rpc.error) return rpc.data as string;
  if (rpc.error.code !== "PGRST202") throw rpc.error;

  // Fallback until the RPC is installed
  const { id, ...fields } = set;
  const teacher_id = set.teacher_id ?? (await sb.auth.getUser()).data.user?.id;
  let setId = id;
  if (setId) {
    const { error } = await sb.from("report_sets").update(fields).eq("id", setId);
    if (error) throw error;
  } else {
    const { data, error } = await sb.from("report_sets")
      .upsert({ ...fields, teacher_id }, { onConflict: "teacher_id,level,room,semester,academic_year" }).select("id").single();
    if (error) throw error;
    setId = data.id as string;
  }
  const del = await sb.from("student_results").delete().eq("report_set_id", setId);
  if (del.error) throw del.error;
  if (payload.length) {
    const ins = await sb.from("student_results").insert(payload.map((r) => ({ ...r, report_set_id: setId, teacher_id })));
    if (ins.error) throw ins.error;
  }
  return setId!;
}
