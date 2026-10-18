export function thaiDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
}

/** Window state for student checking. */
export function windowState(open_at: string | null, close_at: string | null, now = Date.now()) {
  if (open_at && now < new Date(open_at).getTime()) return "before" as const;
  if (close_at && now > new Date(close_at).getTime()) return "after" as const;
  return "open" as const;
}

export function gradeColor(g: unknown) {
  if (typeof g !== "number") return "var(--warn)";
  if (g >= 3) return "var(--ok)";
  if (g >= 1) return "#2563eb"; // fixed blue so mid grades never read as "fail" in the red theme
  return "var(--bad)";
}
