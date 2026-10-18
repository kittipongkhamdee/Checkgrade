import { supabase } from "./supabase";
import type { ReportSet, StudentRow } from "./types";

/** Upserts a report set (one class × semester) and replaces its student rows. */
export async function saveSet(set: ReportSet, rows: StudentRow[]) {
  const sb = supabase();
  const valid = rows.filter((r) => r.student_code && r.full_name);
  const codes = new Set<string>();
  for (const r of valid) {
    if (codes.has(r.student_code)) throw new Error(`เลขประจำตัวซ้ำ: ${r.student_code}`);
    codes.add(r.student_code);
  }
  const { id: _id, ...fields } = set;
  const teacher_id = set.teacher_id ?? (await sb.auth.getUser()).data.user?.id;
  const { data, error } = await sb
    .from("report_sets")
    .upsert({ ...fields, teacher_id }, { onConflict: "teacher_id,level,room,semester,academic_year" })
    .select("id")
    .single();
  if (error) throw error;
  const setId = data.id as string;
  const del = await sb.from("student_results").delete().eq("report_set_id", setId);
  if (del.error) throw del.error;
  if (valid.length) {
    const ins = await sb.from("student_results").insert(
      valid.map(({ id: _rid, ...r }) => ({ ...r, report_set_id: setId, teacher_id, updated_at: new Date().toISOString() })),
    );
    if (ins.error) throw ins.error;
  }
  return setId;
}
