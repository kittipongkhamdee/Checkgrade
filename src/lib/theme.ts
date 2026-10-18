import type { Settings, Theme } from "./types";

/** Main color of each preset theme (status bar, manifest). */
export const THEME_PRIMARY: Record<Theme, string> = {
  academic: "#1e3a8a",
  pastel: "#7c3aed",
  mono: "#09090b",
  red: "#b91c1c",
};

export const primaryOf = (s: Pick<Settings, "theme" | "primary_color">) => s.primary_color || THEME_PRIMARY[s.theme];

/** CSS variable overrides when the admin picked a custom school color. */
export function customColorVars(hex: string | null): Record<string, string> | undefined {
  if (!hex) return undefined;
  const mix = (pct: number, other = "#ffffff") => `color-mix(in srgb, ${hex} ${pct}%, ${other})`;
  return {
    "--primary": hex,
    "--accent": mix(80),
    "--hero": `linear-gradient(135deg, ${mix(80, "#000000")}, ${mix(85)})`,
    "--icon-a": `linear-gradient(135deg, ${mix(85)}, ${mix(80, "#000000")})`,
    "--icon-b": `linear-gradient(135deg, ${mix(60)}, ${hex})`,
    "--mesh-1": mix(28),
    "--mesh-2": mix(10),
    "--mesh-3": mix(20),
    "--surface-2": mix(7),
    "--border": mix(12),
  };
}
