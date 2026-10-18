import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";
import { primaryOf } from "@/lib/theme";

export const revalidate = 60;

// "Add to Home Screen": school logo on white, status bar in the school color.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: s.system_name,
    short_name: s.school_name.replace(/^โรงเรียน/, "") || s.system_name,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: primaryOf(s),
    icons: s.logo_url ? [{ src: s.logo_url, sizes: "256x256", type: "image/webp", purpose: "any" }] : [],
  };
}
