import { serverSupabase } from "./supabase";
import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  system_name: "ระบบตรวจสอบผลการเรียน",
  school_name: "โรงเรียน",
  logo_url: null,
  semester: 1,
  academic_year: 2569,
  open_semesters: [1],
  levels: [],
  rooms: [],
  open_at: null,
  close_at: null,
  theme: "academic",
};

export async function getSettings(): Promise<Settings> {
  try {
    const { data } = await serverSupabase().from("settings").select("*").eq("id", 1).single();
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
