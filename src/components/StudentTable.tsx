"use client";
import type { StudentRow, Subject } from "@/lib/types";

const parse = (v: string): string | number | null => {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
};
const numOrNull = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const show = (v: unknown) => (v == null ? "" : String(v));

/** Editable grid of students × subjects. Horizontal scroll on mobile. */
export function StudentTable({ subjects, rows, onChange }: { subjects: Subject[]; rows: StudentRow[]; onChange: (r: StudentRow[]) => void }) {
  const update = (i: number, patch: Partial<StudentRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setScore = (i: number, code: string, key: "score" | "grade", v: string) =>
    update(i, { scores: rows[i].scores.map((s) => (s.code === code ? { ...s, [key]: parse(v) } : s)) });

  const addRow = () =>
    onChange([...rows, { no: rows.length + 1, student_code: "", full_name: "", scores: subjects.map((s) => ({ code: s.code, score: null, grade: null })),
      total: null, percent: null, gpa: null, rank: null, club: null, traits: null, thinking: null, activity: null, comment: null }]);

  const cell = "h-9 w-full min-w-0 bg-transparent px-1.5 text-center outline-none focus:bg-surface-2 rounded";
  const extra: [keyof StudentRow, string, boolean][] = [
    ["total", "รวม", true], ["percent", "ร้อยละ", true], ["gpa", "GPA", true], ["rank", "ที่", true],
    ["club", "ชุมนุม", false], ["traits", "คุณลักษณะ", false], ["thinking", "คิดวิเคราะห์", false], ["activity", "กิจกรรม", false], ["comment", "ความเห็นครู", false],
  ];

  return (
    <div className="space-y-3">
      <div className="card overflow-x-auto">
        <table className="w-max min-w-full text-sm">
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-surface-2 px-2 py-2 text-left">นักเรียน</th>
              {subjects.map((s) => (
                <th key={s.code + s.name} colSpan={2} className="px-2 py-2" title={s.name}>
                  <div>{s.code}</div><div className="max-w-24 truncate font-normal">{s.name}</div>
                </th>
              ))}
              {extra.map(([, l]) => <th key={l} className="px-2 py-2">{l}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                <td className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1">
                  <div className="flex gap-1">
                    <input className={`${cell} w-8`} value={show(r.no)} onChange={(e) => update(i, { no: numOrNull(e.target.value) })} aria-label="เลขที่" />
                    <input className={`${cell} w-16`} value={r.student_code} onChange={(e) => update(i, { student_code: e.target.value.trim() })} placeholder="เลขประจำตัว" />
                  </div>
                  <input className={`${cell} w-44 text-left`} value={r.full_name} onChange={(e) => update(i, { full_name: e.target.value })} placeholder="ชื่อ-สกุล" />
                </td>
                {subjects.map((s) => {
                  const sc = r.scores.find((x) => x.code === s.code);
                  const bad = sc?.grade == null;
                  return [
                    <td key={s.code + "s"} className={`px-0.5 ${bad ? "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)]" : ""}`}>
                      <input className={`${cell} w-11`} value={show(sc?.score)} onChange={(e) => setScore(i, s.code, "score", e.target.value)} />
                    </td>,
                    <td key={s.code + "g"} className={`px-0.5 ${bad ? "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)]" : ""}`}>
                      <input className={`${cell} w-10 font-semibold`} value={show(sc?.grade)} onChange={(e) => setScore(i, s.code, "grade", e.target.value)} />
                    </td>,
                  ];
                })}
                {extra.map(([k, l, isNum]) => (
                  <td key={l} className="px-0.5">
                    <input className={`${cell} ${k === "comment" ? "w-64 text-left" : isNum ? "w-14" : "w-20"}`} value={show(r[k])}
                      onChange={(e) => update(i, { [k]: isNum ? numOrNull(e.target.value) : e.target.value || null } as Partial<StudentRow>)} />
                  </td>
                ))}
                <td className="px-1">
                  <button className="grid size-8 place-items-center rounded-full text-bad hover:bg-surface-2" aria-label="ลบ"
                    onClick={() => confirm(`ลบ ${r.full_name || "แถวนี้"}?`) && onChange(rows.filter((_, j) => j !== i))}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-ghost w-full" onClick={addRow}>+ เพิ่มนักเรียน</button>
    </div>
  );
}
