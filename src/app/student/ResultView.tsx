"use client";
import { useRef, useState } from "react";
import type { Settings, StudentTerm } from "@/lib/types";
import { gradeColor } from "@/lib/format";
import { CountUp, Reveal, schoolConfetti } from "@/components/Motion";

const fmt = (v: unknown) => (v == null || v === "" ? "-" : String(v));

export default function ResultView({ terms, settings: s }: { terms: StudentTerm[]; settings: Settings }) {
  const sorted = [...terms].sort((a, b) => a.semester - b.semester);
  const [idx, setIdx] = useState(() => Math.max(0, sorted.findIndex((t) => t.semester === s.semester)));
  const t = sorted[idx] ?? sorted[0];
  const cardRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"" | "card" | "full">("");
  const [shot, setShot] = useState<{ url: string; file: File } | null>(null);

  const credits = t.subjects.reduce((a, x) => a + (x.credit || 0), 0);
  const gradeOf = (code: string) => t.scores.find((x) => x.code === code);

  /** Render a node to PNG and open the save sheet. */
  async function capture(kind: "card" | "full") {
    const node = kind === "card" ? certRef.current : fullRef.current;
    if (!node) return;
    setBusy(kind);
    fullRef.current?.classList.add("capturing");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const { toBlob } = await import("html-to-image");
      const bg = kind === "card" ? "#ffffff" : getComputedStyle(document.body).backgroundColor;
      const blob = await toBlob(node, {
        pixelRatio: 2.5,
        backgroundColor: bg && bg !== "rgba(0, 0, 0, 0)" ? bg : "#ffffff",
        ...(kind === "full"
          ? { width: node.offsetWidth + 32, height: node.offsetHeight + 32, style: { margin: "0", padding: "16px", boxSizing: "content-box" } }
          : { style: { position: "static", left: "0" } }),
        filter: (n) => !(n instanceof HTMLElement && n.dataset.noCapture != null),
      });
      if (!blob) throw new Error("capture failed");
      const name = `ผลการเรียน-${t.student_code}-ภาค${t.semester}${kind === "full" ? "-ทั้งหมด" : ""}.png`;
      setShot({ url: URL.createObjectURL(blob), file: new File([blob], name, { type: "image/png" }) });
    } catch {
      alert("สร้างรูปไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      fullRef.current?.classList.remove("capturing");
      setBusy("");
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

      <div ref={fullRef} className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-4 lg:space-y-0">
      <div className="space-y-4">
      {/* Shareable card */}
      <div ref={cardRef} key={t.semester} className="hero unveil shine overflow-hidden rounded-[var(--radius)] p-6">
        <div className="text-sm opacity-80">{s.school_name}</div>
        <div className="mt-1 text-xl font-bold">{t.full_name}</div>
        <div className="text-sm opacity-80">{t.level}/{t.room} · ภาคเรียนที่ {t.semester}/{t.academic_year}</div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70">เกรดเฉลี่ย (GPA)</div>
            <div className="text-6xl font-bold tabular-nums leading-none">{t.gpa != null ? <CountUp value={Number(t.gpa)} decimals={2} delay={500} onDone={() => Number(t.gpa) >= 2.5 && schoolConfetti()} /> : "-"}</div>
          </div>
          <div className="text-right text-sm">
            <div>ลำดับที่ <b className="text-lg">{t.rank != null ? <CountUp value={Number(t.rank)} delay={500} /> : "-"}</b></div>
            <div className="opacity-80">{t.subjects.length} วิชา · {credits} หน่วยกิต</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="คะแนนรวม" v={t.total != null ? <CountUp value={Number(t.total)} delay={700} /> : "-"} />
          <Stat label="ร้อยละ" v={t.percent != null ? <CountUp value={Number(t.percent)} decimals={2} delay={700} /> : "-"} />
          <Stat label="คุณลักษณะ" v={fmt(t.traits)} />
        </div>
      </div>

      </div>
      <div className="space-y-4">
      <div className="card divide-y divide-[var(--border)]">
        <div className="flex px-4 py-3 text-xs text-muted">
          <span className="flex-1">รายวิชา</span><span className="w-12 text-center">คะแนน</span><span className="w-12 text-center">เกรด</span>
        </div>
        {t.subjects.map((sub, i) => {
          const g = gradeOf(sub.code);
          return (
            <Reveal key={t.semester + sub.code + sub.name} delay={(i % 4) * 70}>
            <div className="flex items-center px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{sub.name}</div>
                <div className="text-xs text-muted">{sub.code} · {sub.type || "-"} · {sub.credit} นก.</div>
              </div>
              <div className="w-12 text-center tabular-nums">{fmt(g?.score)}</div>
              <div className="w-12 text-center text-lg font-bold tabular-nums" style={{ color: gradeColor(g?.grade) }}>{fmt(g?.grade)}</div>
            </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal><div className="card space-y-2 p-4 text-sm">
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
      </div></Reveal>
      </div>
      <div className="pt-1 text-center text-xs text-muted lg:col-span-2">{s.system_name} · {s.school_name}</div>
      </div>

      <div data-no-capture className="mx-auto grid max-w-md grid-cols-2 gap-2">
        <button onClick={() => capture("card")} disabled={!!busy} className="btn btn-primary">
          {busy === "card" ? "กำลังสร้าง…" : "🖼️ บันทึกการ์ด"}
        </button>
        <button onClick={() => capture("full")} disabled={!!busy} className="btn btn-ghost">
          {busy === "full" ? "กำลังสร้าง…" : "📄 บันทึกทั้งหน้า"}
        </button>
      </div>

      <CertCard ref={certRef} t={t} s={s} credits={credits} />
      {shot && <SaveSheet shot={shot} onClose={() => { URL.revokeObjectURL(shot.url); setShot(null); }} />}
    </div>
  );
}

/** Preview + save/share. Long-press on the image saves to Photos on iOS/Android too. */
function SaveSheet({ shot, onClose }: { shot: { url: string; file: File }; onClose: () => void }) {
  const canShare = typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [shot.file] });
  function download() {
    const a = document.createElement("a");
    a.href = shot.url;
    a.download = shot.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  async function share() {
    try { await navigator.share({ files: [shot.file] }); } catch { /* cancelled */ }
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4" onClick={onClose}>
      <div className="flex-1 overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.url} alt="ผลการเรียน" className="mx-auto max-w-full rounded-xl" />
      </div>
      <div className="mx-auto w-full max-w-md space-y-2 pt-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-xs text-white/80">หรือกดค้างที่รูป แล้วเลือก “บันทึกรูปภาพ” เพื่อเก็บลงแกลเลอรี</p>
        <div className="grid grid-cols-2 gap-2">
          {canShare ? (
            <button className="btn btn-primary" onClick={share}>📥 บันทึก / แชร์</button>
          ) : (
            <button className="btn btn-primary" onClick={download}>📥 ดาวน์โหลด</button>
          )}
          <button className="btn bg-white text-black" onClick={onClose}>ปิด</button>
        </div>
        {canShare && <button className="w-full text-center text-sm text-white/80 underline" onClick={download}>ดาวน์โหลดเป็นไฟล์</button>}
      </div>
    </div>
  );
}

/** Certificate-style share card in the school colors (rendered off-screen, captured on demand). */
function CertCard({ ref, t, s, credits }: { ref: React.Ref<HTMLDivElement>; t: StudentTerm; s: Settings; credits: number }) {
  return (
    <div ref={ref} aria-hidden className="fixed -left-[10000px] top-0 w-[540px] bg-white p-5 text-[#1f1416]">
      <div className="rounded-[28px] bg-white p-[6px]" style={{ border: "5px solid var(--primary)" }}>
        <div className="rounded-[20px] bg-white px-8 pb-8 pt-7 text-center" style={{ border: "1.5px solid var(--primary)" }}>
          {s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt="" crossOrigin="anonymous" className="mx-auto size-20 object-contain" />
          ) : null}
          <div className="mt-2 text-lg font-bold" style={{ color: "var(--primary)" }}>{s.school_name}</div>
          <div className="mx-auto my-3 h-[3px] w-24 rounded-full" style={{ background: "var(--primary)" }} />
          <div className="text-sm tracking-wide text-[#6b5458]">รายงานผลการเรียน ภาคเรียนที่ {t.semester}/{t.academic_year}</div>
          <div className="mt-4 text-2xl font-bold">{t.full_name}</div>
          <div className="text-[#6b5458]">{t.level}/{t.room} · เลขประจำตัว {t.student_code}</div>
          <div className="mx-auto mt-5 w-fit rounded-3xl px-10 py-4 text-white" style={{ background: "var(--hero)" }}>
            <div className="text-xs opacity-80">เกรดเฉลี่ย (GPA)</div>
            <div className="text-6xl font-bold leading-none tabular-nums">{t.gpa != null ? Number(t.gpa).toFixed(2) : "-"}</div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            {[["ลำดับที่", fmt(t.rank)], ["หน่วยกิต", String(credits)], ["ร้อยละ", t.percent != null ? Number(t.percent).toFixed(2) : "-"]].map(([k, v]) => (
              <div key={k} className="rounded-2xl border py-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, white)" }}>
                <div className="text-xs text-[#6b5458]">{k}</div>
                <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-xs text-[#8a7478]">{s.system_name}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: React.ReactNode }) {
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
