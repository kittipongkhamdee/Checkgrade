import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";

// Student view log. Kept server-side so the student page doesn't ship supabase-js.
export async function POST(req: Request) {
  const { code, name } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !/^[0-9A-Za-z-]{1,20}$/.test(code)) return NextResponse.json({ ok: false }, { status: 400 });
  await serverSupabase().rpc("log_student", { p_code: code, p_name: String(name ?? "").slice(0, 120), p_action: "view" });
  return NextResponse.json({ ok: true });
}
