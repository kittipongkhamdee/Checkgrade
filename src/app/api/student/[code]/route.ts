import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";

// Responses are cached at Vercel's edge per student code, so a burst of
// students re-checking results is served from CDN instead of the database.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[0-9A-Za-z-]{1,20}$/.test(code)) {
    return NextResponse.json({ status: "notfound" }, { status: 400 });
  }
  const { data, error } = await serverSupabase().rpc("student_lookup", { p_code: code });
  if (error) return NextResponse.json({ status: "error" }, { status: 500 });
  const ttl = data?.status === "ok" ? 120 : 20;
  return NextResponse.json(data, {
    headers: { "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=600` },
  });
}
