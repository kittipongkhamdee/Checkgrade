"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { StudentTable } from "@/components/StudentTable";
import { SetMetaForm } from "@/components/SetMetaForm";
import type { ParsedTerm } from "@/lib/excel";
import { saveSet } from "@/lib/saveSet";
import { logTeacher } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import { ProgressRing } from "@/components/Dialog";

export default function UploadPage() {
  return <Guard>{(p) => <Upload name={p.full_name} />}</Guard>;
}

function Upload({ name }: { name: string }) {
  const router = useRouter();
  const [sheets, setSheets] = useState<ParsedTerm[]>([]);
  const [term, setTerm] = useState<ParsedTerm | null>(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ value: number; label: string; sub?: string } | null>(null);
  const [active, setActive] = useState<{ semester: number; academic_year: number } | null>(null);

  useEffect(() => {
    supabase().from("settings").select("semester, academic_year").eq("id", 1).single().then(({ data }) => setActive(data));
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !active) return;
    setErr("");
    setTerm(null);
    try {
      setProgress({ value: 0, label: "กำลังอ่านไฟล์", sub: file.name });
      const buf = await readWithProgress(file, (p) => setProgress({ value: p * 60, label: "กำลังอ่านไฟล์", sub: file.name }));
      setProgress({ value: 70, label: "กำลังวิเคราะห์ชีต" });
      const { parseWorkbook } = await import("@/lib/excel");
      await new Promise((r) => setTimeout(r, 50)); // let the ring paint before the blocking parse
      const found = parseWorkbook(buf).filter((t) => t.students.length);
      setProgress({ value: 100, label: "อ่านไฟล์เสร็จแล้ว" });
      await new Promise((r) => setTimeout(r, 400));
      if (!found.length) return setErr("ไม่พบชีตที่มีหัวตาราง 'เลขประจำตัว' และรายชื่อนักเรียน");
      setFileName(file.name);
      setSheets(found);
    } catch {
      setErr("อ่านไฟล์ไม่สำเร็จ กรุณาใช้ไฟล์ .xlsx ตามแบบฟอร์ม");
    } finally {
      setProgress(null);
    }
  }

  /** The chosen sheet is always saved as the semester the admin opened for upload. */
  function choose(t: ParsedTerm) {
    setTerm({ ...t, set: { ...t.set, semester: active!.semester, academic_year: active!.academic_year } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!term) return;
    setBusy(true);
    setErr("");
    // The save is one database call, so ease toward 90% while it runs, then finish.
    let v = 0;
    const sub = `${term.set.level}/${term.set.room} · ${term.students.length} คน`;
    setProgress({ value: 0, label: "กำลังบันทึกผลการเรียน", sub });
    const timer = setInterval(() => { v += (90 - v) * 0.12; setProgress({ value: v, label: "กำลังบันทึกผลการเรียน", sub }); }, 120);
    try {
      await saveSet(term.set, term.students);
      clearInterval(timer);
      setProgress({ value: 100, label: "บันทึกสำเร็จ ✓", sub });
      await new Promise((r) => setTimeout(r, 700));
      logTeacher(`upload ${term.set.level}/${term.set.room} ภาค ${term.set.semester} (ชีต ${term.sheet})`, name);
      router.push("/teacher");
    } catch (e) {
      clearInterval(timer);
      setProgress(null);
      setErr("บันทึกไม่สำเร็จ: " + (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="pb-24">
      {progress && <ProgressRing {...progress} />}
      <TopBar title="อัปโหลดผลการเรียน" back="/teacher" />
      <div className="space-y-4 p-4">
        <label className="card flex cursor-pointer flex-col items-center gap-2 border-dashed p-6 text-center">
          <span className="grid size-14 place-items-center rounded-[18px] text-2xl text-white shadow-md" style={{ background: "var(--icon-a)" }}>⬆</span>
          <span className="font-medium">{fileName || "เลือกไฟล์ Excel (.xlsx)"}</span>
          <span className="text-xs text-muted">
            {active ? `จะบันทึกเป็น ภาคเรียนที่ ${active.semester}/${active.academic_year}` : "กำลังโหลดการตั้งค่า…"}
          </span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} disabled={!active} />
        </label>
        {err && <p className="text-sm text-bad">{err}</p>}

        {sheets.length > 0 && !term && (
          <section className="space-y-3">
            <div>
              <h2 className="font-semibold">เลือกชีตที่มีผลการเรียน ภาคเรียนที่ {active?.semester}</h2>
              <p className="text-sm text-muted">ระบบพบ {sheets.length} ชีต ตรวจดูรายชื่อและรายวิชาก่อนเลือก</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {sheets.map((t) => (
                <button key={t.sheet} onClick={() => choose(t)} className="card space-y-2 p-4 text-left transition active:scale-[.99]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-primary px-2.5 py-1 text-sm font-semibold text-primary-fg">ชีต “{t.sheet}”</span>
                    <span className="text-sm text-muted">{t.students.length} คน · {t.set.subjects.length} วิชา</span>
                  </div>
                  {t.title && <p className="line-clamp-2 text-xs text-muted">{t.title}</p>}
                  <div className="text-sm">
                    <span className="text-muted">วิชา: </span>
                    {t.set.subjects.slice(0, 3).map((s) => s.name).join(", ")}{t.set.subjects.length > 3 ? " …" : ""}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted">นักเรียน: </span>
                    {t.students.slice(0, 3).map((s) => s.full_name).join(", ")}{t.students.length > 3 ? " …" : ""}
                  </div>
                  {t.warnings.map((w) => <p key={w} className="text-xs text-warn">⚠ {w}</p>)}
                  <div className="pt-1 text-right text-sm font-semibold text-primary">ใช้ชีตนี้ ›</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {term && (
          <>
            <div className="card flex items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                อ่านจากชีต <b>“{term.sheet}”</b> → บันทึกเป็น <b>ภาคเรียนที่ {term.set.semester}/{term.set.academic_year}</b>
              </div>
              <button className="btn btn-ghost min-h-9 shrink-0 px-3 text-sm" onClick={() => setTerm(null)}>เปลี่ยนชีต</button>
            </div>
            {term.warnings.map((w) => <p key={w} className="rounded-xl bg-surface-2 p-3 text-sm text-warn">⚠ {w} — ช่องสีเหลืองคือช่องที่ไม่มีเกรด</p>)}
            <SetMetaForm set={term.set} onChange={(set) => setTerm({ ...term, set })} lockTerm />
            <StudentTable subjects={term.set.subjects} rows={term.students} onChange={(students) => setTerm({ ...term, students })} />
          </>
        )}
      </div>
      {term && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto flex max-w-md md:max-w-3xl lg:max-w-5xl justify-end p-4 [&>*]:pointer-events-auto">
          <button className="btn btn-primary w-full shadow-lg md:w-auto md:px-8" onClick={save} disabled={busy}>
            {busy ? "กำลังบันทึก…" : `💾 บันทึก (${term.students.length} คน)`}
          </button>
        </div>
      )}
    </main>
  );
}

/** Read a File with progress callbacks (0..1). */
function readWithProgress(file: File, onProgress: (p: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    r.onload = () => { onProgress(1); resolve(r.result as ArrayBuffer); };
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}
