"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { logTeacher } from "@/lib/useAuth";

export function LoginForm({ title = "เข้าสู่ระบบครู" }: { title?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { data, error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    logTeacher("login", (data.user?.user_metadata?.full_name as string) ?? email);
  }

  return (
    <main className="px-5 pt-12">
      <Link href="/" className="text-sm text-muted">‹ หน้าแรก</Link>
      <form onSubmit={submit} className="card mt-4 space-y-4 p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div>
          <label className="label">อีเมล</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">รหัสผ่าน</label>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-bad">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
        <p className="text-center text-sm text-muted">
          ยังไม่มีบัญชี? <Link href="/teacher/register" className="font-medium text-accent">ลงทะเบียน</Link>
        </p>
      </form>
    </main>
  );
}
