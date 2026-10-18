import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "600", "700"], variable: "--font-thai", display: "swap" });
import { getSettings } from "@/lib/settings";
import { customColorVars, primaryOf } from "@/lib/theme";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.system_name,
    description: `${s.system_name} ${s.school_name}`,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: s.system_name, statusBarStyle: "default" },
    icons: s.logo_url ? { icon: s.logo_url, apple: s.logo_url } : undefined,
  };
}

// Always light: opt out of OS dark mode and browser "force dark" (Chrome/Samsung Internet).
export async function generateViewport(): Promise<Viewport> {
  const s = await getSettings();
  return { width: "device-width", initialScale: 1, themeColor: primaryOf(s), colorScheme: "only light" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="th" data-theme={s.theme} className={thai.variable} style={{ colorScheme: "only light", ...customColorVars(s.primary_color) } as CSSProperties}>
      <body className="antialiased pt-1.5">
        <div className="school-stripe" aria-hidden />
        <div className="mesh fixed inset-0 -z-10" aria-hidden />
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="float-a absolute -left-24 -top-24 size-80 rounded-full opacity-60 blur-3xl" style={{ background: "var(--mesh-1)" }} />
          <div className="float-b absolute -right-28 top-1/3 size-96 rounded-full opacity-50 blur-3xl" style={{ background: "var(--mesh-2)" }} />
          <div className="float-a absolute -bottom-32 left-1/4 size-96 rounded-full opacity-50 blur-3xl" style={{ background: "var(--mesh-3)" }} />
        </div>
        <div className="mx-auto min-h-dvh w-full max-w-md md:max-w-3xl lg:max-w-5xl">{children}</div>
      </body>
    </html>
  );
}
