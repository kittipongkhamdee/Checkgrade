import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";

// Daily Vercel cron: keeps the free Supabase project from pausing after 7 idle days
// and trims old access logs.
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = serverSupabase();
  const { error } = await sb.from("settings").select("id").eq("id", 1).single();
  const trim = await sb.rpc("keepalive");
  return NextResponse.json({ ok: !error, trimmed: trim.data ?? null });
}
