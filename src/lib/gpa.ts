import type { Score, Subject } from "./types";

const PENDING = new Set(["ร", "มส"]);

/** Subjects still awaiting a result: ร / มส, or no grade at all. */
export function pendingCodes(scores: Score[]) {
  return scores
    .filter((s) => PENDING.has(String(s.grade ?? "").trim()) || PENDING.has(String(s.score ?? "").trim()) || s.grade == null || s.grade === "")
    .map((s) => s.code);
}

/** Label to show for a pending subject: "มส" wins over "ร". */
export function pendingLabel(s: Score | undefined) {
  const v = [s?.score, s?.grade].map((x) => String(x ?? "").trim());
  if (v.includes("มส")) return "มส";
  if (v.includes("ร")) return "ร";
  return "ร";
}

/**
 * GPA per สพฐ.: Σ(credit × grade) / Σ credit over every subject with credit,
 * grade 0 included, truncated (not rounded) to 2 decimals.
 * Returns null while any subject is ร / มส.
 */
export function computeGpa(subjects: Subject[], scores: Score[]): number | null {
  if (pendingCodes(scores.filter((s) => subjects.some((x) => x.code === s.code && x.credit > 0))).length) return null;
  let w = 0, sum = 0;
  for (const sub of subjects) {
    if (!sub.credit) continue;
    const g = Number(scores.find((s) => s.code === sub.code)?.grade);
    if (!Number.isFinite(g)) return null;
    w += sub.credit;
    sum += sub.credit * g;
  }
  return w ? Math.floor((sum / w) * 100 + 1e-9) / 100 : null;
}
