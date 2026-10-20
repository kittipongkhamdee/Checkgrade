"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { logTeacher } from "@/lib/useAuth";
import { windowState } from "@/lib/format";
import { Countdown } from "./Countdown";
import { BoardIcon, CapIcon } from "./Icons";

const IdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 14h3" /></svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 4l16 16" />}
  </svg>
);

type Tab = "student" | "teacher";

/** Home page login card: student (default) and teacher tabs. */
export function HomeTabs({ openAt, closeAt }: { openAt: string | null; closeAt: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("student");
  const [state, setState] = useState(() => windowState(openAt, closeAt));
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "teacher") setTab("teacher");
  }, []);

  function switchTab(t: Tab) {
    setTab(t);
    setErr("");
  }

  function student(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (!c) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      document.getElementById("home-code")?.focus();
      return;
    }
    setBusy(true);
    router.push(`/student?code=${encodeURIComponent(c)}`);
  }

  async function teacher(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setErr("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    logTeacher("login", (data.user?.user_metadata?.full_name as string) ?? email);
    router.push("/teacher");
  }

  const tabBtn = (t: Tab, label: string, icon: React.ReactNode) => (
    <button type="button" role="tab" aria-selected={tab === t} onClick={() => switchTab(t)}
      className={`flex h-12 items-center justify-center gap-2 rounded-xl font-semibold transition ${tab === t ? "text-white" : "text-muted hover:bg-white/50"}`}
      style={tab === t ? { background: "var(--hero)", boxShadow: "0 6px 16px color-mix(in srgb, var(--primary) 35%, transparent), inset 0 1px 0 rgb(255 255 255 / .25)" } : undefined}>
      {icon} {label}
    </button>
  );

  return (
    <div className="glass rise w-full rounded-[28px] p-4" style={{ animationDelay: "380ms" }}>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl p-1" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        {tabBtn("student", "นักเรียน", <CapIcon size={20} />)}
        {tabBtn("teacher", "ครู", <BoardIcon size={20} />)}
      </div>

      {tab === "student" ? (
        state === "before" && openAt ? (
          <div className="space-y-3 pt-5 text-center">
            <div className="font-semibold">ระบบจะเปิดให้ตรวจสอบในอีก</div>
            <Countdown to={openAt} onDone={() => setState("open")} />
          </div>
        ) : state === "after" ? (
          <div className="py-8 text-center">
            <div className="text-3xl">🔒</div>
            <div className="mt-2 font-semibold">ปิดการตรวจสอบผลการเรียนแล้ว</div>
            <div className="text-sm text-muted">ติดต่อครูประจำชั้นหากมีข้อสงสัย</div>
          </div>
        ) : (
          <form onSubmit={student}>
            <label htmlFor="home-code" className="mb-1.5 mt-4 flex items-center gap-1.5 text-sm text-muted"><IdIcon /> เลขประจำตัวนักเรียน</label>
            <input id="home-code" className={`input h-14 text-center text-2xl tracking-[.3em] ${shake ? "shake" : ""}`} inputMode="numeric" autoComplete="off"
              placeholder="0000" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn btn-primary mt-4 h-14 w-full text-lg shadow-lg" disabled={busy} style={{ background: "var(--hero)" }}>
              <SearchIcon /> {busy ? "กำลังค้นหา…" : "ตรวจสอบผลการเรียน"}
            </button>
            <p className="mt-3 text-center text-xs text-muted">ใช้เลขประจำตัวนักเรียนเท่านั้น ไม่ต้องใช้รหัสผ่าน</p>
          </form>
        )
      ) : (
        <form onSubmit={teacher}>
          <label htmlFor="home-email" className="mb-1.5 mt-4 flex items-center gap-1.5 text-sm text-muted"><MailIcon /> อีเมล</label>
          <input id="home-email" className="input h-[52px]" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="home-pw" className="mb-1.5 mt-3 flex items-center gap-1.5 text-sm text-muted"><LockIcon /> รหัสผ่าน</label>
          <div className="relative">
            <input id="home-pw" className="input h-[52px] pr-12" type={show ? "text" : "password"} autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted"><EyeIcon off={show} /></button>
          </div>
          {err && <p className="mt-2 text-sm text-bad">{err}</p>}
          <button className="btn btn-primary mt-4 h-14 w-full text-lg shadow-lg" disabled={busy} style={{ background: "var(--hero)" }}>
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
          <p className="mt-3 text-center text-sm text-muted">
            ยังไม่มีบัญชี? <Link href="/teacher/register" className="font-semibold text-primary">ลงทะเบียนครู</Link>
          </p>
        </form>
      )}
    </div>
  );
}
