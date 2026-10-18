"use client";
import { useAuth, type Profile } from "@/lib/useAuth";
import { LoginForm } from "./LoginForm";
import { supabase } from "@/lib/supabase";

/** Renders children only for a signed-in, active teacher (or admin when adminOnly). */
export function Guard({ adminOnly, children }: { adminOnly?: boolean; children: (p: Profile) => React.ReactNode }) {
  const { session, profile, ready } = useAuth();
  if (!ready) return <div className="space-y-3 p-5"><div className="skeleton h-12" /><div className="skeleton h-40" /></div>;
  if (!session) return <LoginForm title={adminOnly ? "เข้าสู่ระบบผู้ดูแล" : undefined} />;
  if (!profile || !profile.active || (adminOnly && profile.role !== "admin")) {
    return (
      <main className="p-6 text-center">
        <div className="card space-y-3 p-6">
          <p>{!profile?.active ? "บัญชีของคุณรอผู้ดูแลระบบอนุมัติ (หรือถูกระงับ) กรุณาติดต่อผู้ดูแลระบบ" : "เฉพาะผู้ดูแลระบบเท่านั้น"}</p>
          <button className="btn btn-ghost" onClick={() => supabase().auth.signOut()}>ออกจากระบบ</button>
        </div>
      </main>
    );
  }
  return <>{children(profile)}</>;
}
