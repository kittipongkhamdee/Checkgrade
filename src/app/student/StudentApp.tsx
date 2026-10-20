"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings, StudentTerm } from "@/lib/types";
import { windowState } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { Logo } from "@/components/Brand";
import ResultView from "./ResultView";
import { UserIcon } from "@/components/Icons";
import { isMuted, loadApplause, setMuted, unlockAudio } from "@/components/Motion";

type Step = "input" | "confirm" | "opening" | "result";
const IDLE_MS = 3 * 60 * 1000;
const WARN_S = 30;

export default function StudentApp({ settings: s }: { settings: Settings }) {
  const [state, setState] = useState(() => windowState(s.open_at, s.close_at));
  const [step, setStep] = useState<Step>("input");
  const [code, setCode] = useState("");
  const [terms, setTerms] = useState<StudentTerm[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStep("input");
    setCode("");
    setTerms([]);
    setError("");
  }, []);

  // Arriving from the home page tab: /student?code=1234 looks up right away
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code")?.trim();
    if (c) {
      setCode(c);
      history.replaceState(null, "", "/student");
      search(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    search(code);
  }

  async function search(raw: string) {
    const c = raw.trim();
    if (!c) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/student/${encodeURIComponent(c)}`);
      const data = await res.json();
      if (data.status === "ok") {
        setTerms(data.terms);
        setStep("confirm");
      } else if (data.status === "closed") {
        setState(windowState(s.open_at, s.close_at));
        setError("ระบบยังไม่เปิดให้ตรวจสอบในขณะนี้");
      } else {
        setError("ไม่พบเลขประจำตัวนี้ กรุณาตรวจสอบอีกครั้ง");
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    unlockAudio();
    if (s.fx_sound) loadApplause(s.applause_url); // fetched during the drum-roll
    // short drum-roll before revealing results
    setStep("opening");
    setTimeout(() => setStep((st) => (st === "opening" ? "result" : st)), 1400);
    fetch("/api/log", { method: "POST", body: JSON.stringify({ code: code.trim(), name: terms[0]?.full_name ?? "" }), keepalive: true }).catch(() => {});
  }

  const first = terms[0];

  return (
    <main className="min-h-dvh pb-10">
      <header className="glass sticky top-1.5 z-20 flex items-center gap-3 px-5 py-3 md:top-3 md:mt-3 md:rounded-2xl">
        <Logo s={s} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{s.system_name}</div>
          <div className="truncate text-sm text-muted">{s.school_name}</div>
        </div>
        {step === "result" && s.fx_sound && s.applause_url && <SoundToggle />}
        {step === "result" ? (
          <button onClick={reset} className="btn btn-ghost min-h-9 px-3 text-sm">ออกจากระบบ</button>
        ) : (
          <Link href="/" className="btn btn-ghost min-h-9 px-3 text-sm">หน้าแรก</Link>
        )}
      </header>

      <div className={`px-5 pt-5 ${step === "result" ? "" : "mx-auto max-w-md md:pt-12"}`}>
        {state === "before" && s.open_at ? (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">ระบบจะเปิดให้ตรวจสอบในอีก</h2>
            <Countdown to={s.open_at} onDone={() => setState("open")} />
            <p className="text-sm text-muted">กรุณารอสักครู่ หน้านี้จะเปิดให้ใช้งานอัตโนมัติ</p>
          </div>
        ) : state === "after" ? (
          <div className="card p-6 text-center">
            <div className="text-4xl">🔒</div>
            <h2 className="mt-2 text-lg font-semibold">ปิดการตรวจสอบผลการเรียนแล้ว</h2>
            <p className="text-sm text-muted">ติดต่อครูประจำชั้นหากมีข้อสงสัย</p>
          </div>
        ) : step === "input" ? (
          <form onSubmit={lookup} className="card space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">ตรวจสอบผลการเรียน</h2>
              <p className="text-sm text-muted">{s.open_semesters.length ? `ภาคเรียนที่ ${s.open_semesters.join(" และ ")} / ${s.academic_year}` : `ปีการศึกษา ${s.academic_year}`}</p>
            </div>
            <div>
              <label className="label" htmlFor="code">เลขประจำตัวนักเรียน</label>
              <input id="code" className="input text-center text-xl tracking-widest" inputMode="numeric" autoComplete="off"
                placeholder="เช่น 0000" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            </div>
            {error && <p className="text-sm text-bad">{error}</p>}
            <button className="btn btn-primary w-full" disabled={loading || !code.trim()}>
              {loading ? "กำลังค้นหา…" : "ค้นหา"}
            </button>
          </form>
        ) : step === "confirm" && first ? (
          <div className="card space-y-4 p-6 text-center">
            <p className="text-sm text-muted">กรุณายืนยันว่าเป็นข้อมูลของคุณ</p>
            <div className="pop mx-auto grid size-16 place-items-center rounded-[20px] text-white shadow-md" style={{ background: "var(--icon-a)" }}><UserIcon size={32} /></div>
            <div>
              <div className="text-xl font-semibold">{first.full_name}</div>
              <div className="text-muted">{first.level} / {first.room} · เลขที่ {first.no ?? "-"}</div>
              <div className="text-sm text-muted">เลขประจำตัว {first.student_code}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={reset} className="btn btn-ghost">ไม่ใช่</button>
              <button onClick={confirm} className="btn btn-primary">ตกลง</button>
            </div>
          </div>
        ) : step === "opening" ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="relative grid size-24 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
              <span className="pop grid size-20 place-items-center rounded-full bg-primary text-4xl text-primary-fg">📜</span>
            </div>
            <div className="rise text-lg font-semibold">กำลังเปิดผลการเรียน…</div>
            <div className="rise text-sm text-muted" style={{ animationDelay: "200ms" }}>ลุ้นกันเลย!</div>
          </div>
        ) : step === "result" ? (
          <ResultView terms={terms} settings={s} />
        ) : null}
      </div>

      {step !== "input" && <IdleGuard onLogout={reset} />}
    </main>
  );
}

/** Auto sign-out after inactivity, with a warning dialog. */
function IdleGuard({ onLogout }: { onLogout: () => void }) {
  const [warn, setWarn] = useState<number | null>(null);
  const last = useRef(Date.now());

  useEffect(() => {
    const bump = () => { last.current = Date.now(); setWarn(null); };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS + WARN_S * 1000) onLogout();
      else if (idle >= IDLE_MS) setWarn(Math.ceil((IDLE_MS + WARN_S * 1000 - idle) / 1000));
    }, 1000);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); };
  }, [onLogout]);

  if (warn == null) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6">
      <div className="card w-full max-w-sm space-y-3 p-6 text-center">
        <div className="text-3xl">⏳</div>
        <h3 className="text-lg font-semibold">ออกจากระบบอัตโนมัติ</h3>
        <p className="text-muted">ไม่มีการใช้งาน ระบบจะออกจากระบบใน <b className="tabular-nums">{warn}</b> วินาที</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-ghost" onClick={onLogout}>ออกเลย</button>
          <button className="btn btn-primary" onClick={() => { setWarn(null); }}>ใช้งานต่อ</button>
        </div>
      </div>
    </div>
  );
}

function SoundToggle() {
  const [muted, set] = useState(isMuted);
  return (
    <button aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"} className="btn btn-ghost min-h-9 px-2.5 text-base"
      onClick={() => { setMuted(!muted); set(!muted); }}>
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
