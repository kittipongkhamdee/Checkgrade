"use client";
import type { ReportSet } from "@/lib/types";

export function SetMetaForm({ set, onChange }: { set: ReportSet; onChange: (s: ReportSet) => void }) {
  const f = (k: keyof ReportSet, num = false) => ({
    value: String(set[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...set, [k]: num ? Number(e.target.value) || 0 : e.target.value }),
  });
  return (
    <div className="card grid grid-cols-2 gap-3 p-4">
      <div className="col-span-2"><label className="label">โรงเรียน</label><input className="input" {...f("school_name")} /></div>
      <div><label className="label">ระดับชั้น</label><input className="input" {...f("level")} /></div>
      <div><label className="label">ห้อง</label><input className="input" {...f("room")} /></div>
      <div><label className="label">ภาคเรียน</label><input className="input" inputMode="numeric" {...f("semester", true)} /></div>
      <div><label className="label">ปีการศึกษา</label><input className="input" inputMode="numeric" {...f("academic_year", true)} /></div>
      <div className="col-span-2"><label className="label">ครูประจำชั้น</label><input className="input" {...f("homeroom_teacher")} /></div>
    </div>
  );
}
