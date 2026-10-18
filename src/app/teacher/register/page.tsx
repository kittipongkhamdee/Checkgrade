"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Register() {
  const router = useRouter();
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password.length < 6) return setMsg("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    setBusy(true);
    const { data, error } = await supabase().auth.signUp({
      email: f.email,
      password: f.password,
      options: { data: { full_name: f.full_name } },
    });
    setBusy(false);
    if (error) return setMsg(error.message.includes("registered") ? "อีเมลนี้ลงทะเบียนแล้ว" : "ลงทะเบียนไม่สำเร็จ: " + error.message);
    if (data.session) router.push("/teacher");
    else setMsg("ลงทะเบียนสำเร็จ กรุณายืนยันอีเมลแล้วเข้าสู่ระบบ");
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <main className="px-5 pt-12">
      <Link href="/teacher" className="text-sm text-muted">‹ เข้าสู่ระบบ</Link>
      <form onSubmit={submit} className="card mt-4 space-y-4 p-6">
        <h1 className="text-xl font-semibold">ลงทะเบียนครู</h1>
        <div><label className="label">ชื่อ-สกุล</label><input className="input" value={f.full_name} onChange={set("full_name")} required /></div>
        <div><label className="label">อีเมล</label><input className="input" type="email" value={f.email} onChange={set("email")} required /></div>
        <div><label className="label">รหัสผ่าน</label><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} required /></div>
        {msg && <p className="text-sm text-warn">{msg}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "กำลังบันทึก…" : "ลงทะเบียน"}</button>
      </form>
    </main>
  );
}
