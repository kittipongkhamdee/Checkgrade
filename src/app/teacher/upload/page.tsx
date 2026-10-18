"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { StudentTable } from "@/components/StudentTable";
import { SetMetaForm } from "@/components/SetMetaForm";
import type { ParsedTerm } from "@/lib/excel";
import { saveSet } from "@/lib/saveSet";
import { logTeacher } from "@/lib/useAuth";

export default function UploadPage() {
  return <Guard>{(p) => <Upload name={p.full_name} />}</Guard>;
}

function Upload({ name }: { name: string }) {
  const router = useRouter();
  const [terms, setTerms] = useState<ParsedTerm[]>([]);
  const [pick, setPick] = useState<boolean[]>([]);
  const [tab, setTab] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    try {
      const { parseWorkbook } = await import("@/lib/excel");
      const parsed = parseWorkbook(await file.arrayBuffer()).filter((t) => t.students.length);
      if (!parsed.length) return setErr("ไม่พบชีต เทอม1 / เทอม2 หรือไม่มีรายชื่อนักเรียน");
      setTerms(parsed);
      setPick(parsed.map(() => true));
      setTab(0);
    } catch {
      setErr("อ่านไฟล์ไม่สำเร็จ กรุณาใช้ไฟล์ .xlsx ตามแบบฟอร์ม");
    }
  }

  async function save() {
    setBusy(true);
    setErr("");
    try {
      for (let i = 0; i < terms.length; i++) if (pick[i]) await saveSet(terms[i].set, terms[i].students);
      logTeacher(`upload ${terms.filter((_, i) => pick[i]).map((t) => `${t.set.level}/${t.set.room} ภาค ${t.set.semester}`).join(", ")}`, name);
      router.push("/teacher");
    } catch (e) {
      setErr("บันทึกไม่สำเร็จ: " + (e as Error).message);
      setBusy(false);
    }
  }

  const t = terms[tab];
  const patch = (p: Partial<ParsedTerm>) => setTerms(terms.map((x, i) => (i === tab ? { ...x, ...p } : x)));

  return (
    <main className="pb-24">
      <TopBar title="อัปโหลดผลการเรียน" back="/teacher" />
      <div className="space-y-4 p-4">
        <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-6 text-center">
          <span className="text-3xl">📄</span>
          <span className="font-medium">{terms.length ? "เลือกไฟล์ใหม่" : "เลือกไฟล์ Excel (.xlsx)"}</span>
          <span className="text-xs text-muted">ระบบจะอ่านชีต หน้าหลัก, เทอม1 และ เทอม2</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
        </label>
        {err && <p className="text-sm text-bad">{err}</p>}

        {t && (
          <>
            <div className="card grid gap-1 p-1" style={{ gridTemplateColumns: `repeat(${terms.length}, 1fr)` }}>
              {terms.map((x, i) => (
                <button key={i} onClick={() => setTab(i)} className={`rounded-xl py-2 text-sm font-medium ${i === tab ? "bg-primary text-primary-fg" : "text-muted"}`}>
                  ภาคเรียนที่ {x.set.semester} ({x.students.length})
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={pick[tab]} onChange={(e) => setPick(pick.map((v, i) => (i === tab ? e.target.checked : v)))} />
              บันทึกภาคเรียนนี้
            </label>
            {t.warnings.map((w) => <p key={w} className="rounded-xl bg-surface-2 p-3 text-sm text-warn">⚠ {w} — ช่องสีเหลืองคือช่องที่ไม่มีเกรด</p>)}
            <SetMetaForm set={t.set} onChange={(set) => patch({ set })} />
            <StudentTable subjects={t.set.subjects} rows={t.students} onChange={(students) => patch({ students })} />
          </>
        )}
      </div>
      {t && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
          <button className="btn btn-primary w-full shadow-lg" onClick={save} disabled={busy || !pick.some(Boolean)}>
            {busy ? "กำลังบันทึก…" : `💾 บันทึก (${terms.filter((_, i) => pick[i]).reduce((a, x) => a + x.students.length, 0)} รายการ)`}
          </button>
        </div>
      )}
    </main>
  );
}
