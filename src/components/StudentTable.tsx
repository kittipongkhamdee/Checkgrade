"use client";
import { useState } from "react";
import type { StudentRow, Subject } from "@/lib/types";
import { gradeColor } from "@/lib/format";
import { confirmDialog } from "./Dialog";

const parse = (v: string): string | number | null => {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
};
const numOrNull = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const show = (v: unknown) => (v == null ? "" : String(v));

const EXTRA: [keyof StudentRow, string, boolean][] = [
  ["total", "คะแนนรวม", true], ["percent", "ร้อยละ", true], ["gpa", "เกรดเฉลี่ย", true], ["rank", "ได้ที่", true],
  ["club", "ชุมนุม", false], ["traits", "คุณลักษณะ", false], ["thinking", "คิดวิเคราะห์", false], ["activity", "กิจกรรมพัฒนาผู้เรียน", false],
];

/** Mobile-first list of students; tap a card to review/edit every field. */
export function StudentTable({ subjects, rows, onChange }: { subjects: Subject[]; rows: StudentRow[]; onChange: (r: StudentRow[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const update = (i: number, patch: Partial<StudentRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setScore = (i: number, code: string, key: "score" | "grade", v: string) =>
    update(i, { scores: rows[i].scores.map((s) => (s.code === code ? { ...s, [key]: parse(v) } : s)) });

  const addRow = () => {
    onChange([...rows, { no: rows.length + 1, student_code: "", full_name: "", scores: subjects.map((s) => ({ code: s.code, score: null, grade: null })),
      total: null, percent: null, gpa: null, rank: null, club: null, traits: null, thinking: null, activity: null, comment: null }]);
    setOpen(rows.length);
  };

  return (
    <div className="grid gap-2 md:grid-cols-2 md:items-start">
      <p className="text-xs text-muted md:col-span-2">แตะที่ชื่อนักเรียนเพื่อดู/แก้ไขคะแนนทุกวิชา · {subjects.length} วิชา</p>
      {rows.map((r, i) => {
        const missing = r.scores.filter((s) => s.grade == null).length;
        const isOpen = open === i;
        return (
          <div key={i} className={`card overflow-hidden ${isOpen ? "md:col-span-2" : ""}`}>
            <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen(isOpen ? null : i)}>
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold">{r.no ?? "-"}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.full_name || <span className="text-muted">(ยังไม่ระบุชื่อ)</span>}</div>
                <div className="text-xs text-muted">
                  {r.student_code || "-"}
                  {missing > 0 && <span className="ml-2 rounded bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] px-1.5 text-warn">ไม่มีเกรด {missing} วิชา</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted">GPA</div>
                <div className="font-bold tabular-nums">{r.gpa != null ? Number(r.gpa).toFixed(2) : "-"}</div>
              </div>
              <span className={`text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-line p-3">
                <div className="grid grid-cols-[4rem_6rem_1fr] gap-2">
                  <Field label="เลขที่" value={show(r.no)} onChange={(v) => update(i, { no: numOrNull(v) })} mode="numeric" />
                  <Field label="เลขประจำตัว" value={r.student_code} onChange={(v) => update(i, { student_code: v.trim() })} mode="numeric" />
                  <Field label="ชื่อ-สกุล" value={r.full_name} onChange={(v) => update(i, { full_name: v })} />
                </div>

                <div className="divide-y divide-[var(--border)] rounded-xl border border-line md:grid md:grid-cols-2 md:divide-y-0 md:[&>*]:border-b md:[&>*]:border-line">
                  <div className="flex px-3 py-2 text-xs text-muted md:col-span-2">
                    <span className="flex-1">รายวิชา</span><span className="w-16 text-center">คะแนน</span><span className="w-14 text-center">เกรด</span>
                  </div>
                  {subjects.map((s) => {
                    const sc = r.scores.find((x) => x.code === s.code);
                    return (
                      <div key={s.code + s.name} className={`flex items-center gap-2 px-3 py-1.5 ${sc?.grade == null ? "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)]" : ""}`}>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{s.name}</div>
                          <div className="text-[11px] text-muted">{s.code} · {s.credit} นก.</div>
                        </div>
                        <input className="input h-10 min-h-0 w-16 px-1 text-center" inputMode="decimal" value={show(sc?.score)} onChange={(e) => setScore(i, s.code, "score", e.target.value)} />
                        <input className="input h-10 min-h-0 w-14 px-1 text-center font-bold" style={{ color: gradeColor(sc?.grade) }} inputMode="decimal"
                          value={show(sc?.grade)} onChange={(e) => setScore(i, s.code, "grade", e.target.value)} />
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {EXTRA.map(([k, l, isNum]) => (
                    <Field key={k} label={l} value={show(r[k])} mode={isNum ? "decimal" : undefined}
                      onChange={(v) => update(i, { [k]: isNum ? numOrNull(v) : v || null } as Partial<StudentRow>)} />
                  ))}
                </div>
                <div>
                  <label className="label">ความเห็นของครูที่ปรึกษา</label>
                  <textarea className="input min-h-20 py-2" value={show(r.comment)} onChange={(e) => update(i, { comment: e.target.value || null })} />
                </div>
                <button className="btn btn-danger w-full" onClick={async () => {
                  if (await confirmDialog({ title: "ลบนักเรียนคนนี้?", message: `${r.full_name || "(ไม่มีชื่อ)"} จะถูกลบเมื่อกดบันทึก`, confirmText: "ลบ", danger: true })) { onChange(rows.filter((_, j) => j !== i)); setOpen(null); }
                }}>
                  ลบนักเรียนคนนี้
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-ghost w-full md:col-span-2" onClick={addRow}>+ เพิ่มนักเรียน</button>
    </div>
  );
}

function Field({ label, value, onChange, mode }: { label: string; value: string; onChange: (v: string) => void; mode?: "numeric" | "decimal" }) {
  return (
    <div className="min-w-0">
      <label className="label text-xs">{label}</label>
      <input className="input h-10 min-h-0 px-2" inputMode={mode} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
