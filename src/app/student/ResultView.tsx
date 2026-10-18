"use client";
import { useRef, useState } from "react";
import type { Settings, StudentTerm } from "@/lib/types";
import { gradeColor } from "@/lib/format";

const fmt = (v: unknown) => (v == null || v === "" ? "-" : String(v));

export default function ResultView({ terms, settings: s }: { terms: StudentTerm[]; settings: Settings }) {
  const sorted = [...terms].sort((a, b) => a.semester - b.semester);
  const [idx, setIdx] = useState(() => Math.max(0, sorted.findIndex((t) => t.semester === s.semester)));
  const t = sorted[idx] ?? sorted[0];
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const credits = t.subjects.reduce((a, x) => a + (x.credit || 0), 0);
  const gradeOf = (code: string) => t.scores.find((x) => x.code === code);

  async function share() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `ผลการเรียน-${t.student_code}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: s.system_name });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
      }
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {sorted.length > 1 && (
        <div className="card grid grid-cols-2 gap-1 p-1">
          {sorted.map((x, i) => (
            <button key={x.semester} onClick={() => setIdx(i)}
              className={`rounded-xl py-2 text-sm font-medium ${i === idx ? "bg-primary text-primary-fg" : "text-muted"}`}>
              ภาคเรียนที่ {x.semester}
            </button>
          ))}
        </div>
      )}

      {/* Shareable card */}
      <div ref={cardRef} className="hero overflow-hidden rounded-[var(--radius)] p-6">
        <div className="text-sm opacity-80">{s.school_name}</div>
        <div className="mt-1 text-xl font-bold">{t.full_name}</div>
        <div className="text-sm opacity-80">{t.level}/{t.room} · ภาคเรียนที่ {t.semester}/{t.academic_year}</div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70">เกรดเฉลี่ย (GPA)</div>
            <div className="text-6xl font-bold tabular-nums leading-none">{t.gpa != null ? Number(t.gpa).toFixed(2) : "-"}</div>
          </div>
          <div className="text-right text-sm">
            <div>ลำดับที่ <b className="text-lg">{fmt(t.rank)}</b></div>
            <div className="opacity-80">{t.subjects.length} วิชา · {credits} หน่วยกิต</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="คะแนนรวม" v={fmt(t.total)} />
          <Stat label="ร้อยละ" v={t.percent != null ? Number(t.percent).toFixed(2) : "-"} />
          <Stat label="คุณลักษณะ" v={fmt(t.traits)} />
        </div>
      </div>

      <button onClick={share} disabled={busy} className="btn btn-primary w-full">
        {busy ? "กำลังสร้างภาพ…" : "📤 บันทึก / แชร์การ์ดผลการเรียน"}
      </button>

      <div className="card divide-y divide-[var(--border)]">
        <div className="flex px-4 py-3 text-xs text-muted">
          <span className="flex-1">รายวิชา</span><span className="w-12 text-center">คะแนน</span><span className="w-12 text-center">เกรด</span>
        </div>
        {t.subjects.map((sub) => {
          const g = gradeOf(sub.code);
          return (
            <div key={sub.code + sub.name} className="flex items-center px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{sub.name}</div>
                <div className="text-xs text-muted">{sub.code} · {sub.type || "-"} · {sub.credit} นก.</div>
              </div>
              <div className="w-12 text-center tabular-nums">{fmt(g?.score)}</div>
              <div className="w-12 text-center text-lg font-bold tabular-nums" style={{ color: gradeColor(g?.grade) }}>{fmt(g?.grade)}</div>
            </div>
          );
        })}
      </div>

      <div className="card space-y-2 p-4 text-sm">
        <Row k="ชุมนุม" v={t.club} />
        <Row k="คุณลักษณะอันพึงประสงค์" v={t.traits} />
        <Row k="อ่าน คิดวิเคราะห์ และเขียน" v={t.thinking} />
        <Row k="กิจกรรมพัฒนาผู้เรียน" v={t.activity} />
        <Row k="ครูประจำชั้น" v={t.homeroom_teacher} />
        {t.comment && (
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">ความเห็นของครูที่ปรึกษา</div>
            <div>{t.comment}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-xl bg-white/15 px-2 py-2">
      <div className="opacity-75">{label}</div>
      <div className="text-sm font-semibold">{v}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium">{v || "-"}</span>
    </div>
  );
}
