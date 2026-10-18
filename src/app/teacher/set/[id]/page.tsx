"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { StudentTable } from "@/components/StudentTable";
import { SetMetaForm } from "@/components/SetMetaForm";
import { supabase } from "@/lib/supabase";
import { saveSet } from "@/lib/saveSet";
import { logTeacher } from "@/lib/useAuth";
import { confirmDialog } from "@/components/Dialog";
import type { ReportSet, StudentRow } from "@/lib/types";

export default function SetPage() {
  return <Guard>{(p) => <Editor name={p.full_name} me={p.id} isAdmin={p.role === "admin"} />}</Guard>;
}

function Editor({ name, me, isAdmin }: { name: string; me: string; isAdmin: boolean }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [set, setSet] = useState<ReportSet | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sb = supabase();
    sb.from("report_sets").select("*").eq("id", id).single().then(({ data }) => setSet(data as ReportSet));
    sb.from("student_results").select("*").eq("report_set_id", id).order("no").then(({ data }) => setRows((data as StudentRow[]) ?? []));
  }, [id]);

  async function save() {
    if (!set) return;
    setBusy(true);
    setMsg("");
    try {
      await saveSet(set, rows);
      logTeacher(`edit ${set.level}/${set.room} ภาค ${set.semester}`, name);
      setMsg("บันทึกแล้ว ✓");
    } catch (e) {
      setMsg("บันทึกไม่สำเร็จ: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!set || !(await confirmDialog({
      title: "ลบผลการเรียนชุดนี้?",
      message: <>{set.level}/{set.room} ภาคเรียนที่ {set.semester}/{set.academic_year} · {rows.length} คน<br /><b className="text-bad">ลบแล้วกู้คืนไม่ได้</b></>,
      confirmText: "ลบ", danger: true,
    }))) return;
    await supabase().from("report_sets").delete().eq("id", id);
    logTeacher(`delete ${set.level}/${set.room} ภาค ${set.semester}`, name);
    router.push(back);
  }

  const back = isAdmin && set?.teacher_id !== me ? "/admin" : "/teacher";
  if (!set) return <div className="space-y-3 p-5"><div className="skeleton h-12" /><div className="skeleton h-64" /></div>;
  return (
    <main className="pb-24">
      <TopBar title={`${set.level}/${set.room} · ภาค ${set.semester}`} back={back}
        right={<button className="btn btn-danger min-h-9 px-3 text-sm" onClick={remove}>ลบชุดนี้</button>} />
      <div className="space-y-4 p-4">
        <SetMetaForm set={set} onChange={setSet} />
        <StudentTable subjects={set.subjects} rows={rows} onChange={setRows} />
        {msg && <p className="text-center text-sm">{msg}</p>}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto flex max-w-md md:max-w-3xl lg:max-w-5xl justify-end p-4 [&>*]:pointer-events-auto">
        <button className="btn btn-primary w-full shadow-lg md:w-auto md:px-8" onClick={save} disabled={busy}>{busy ? "กำลังบันทึก…" : "💾 บันทึกการแก้ไข"}</button>
      </div>
    </main>
  );
}
