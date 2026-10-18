import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Called after admin saves settings so cached pages pick up the change now.
export async function POST() {
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
