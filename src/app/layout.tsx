import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "600", "700"], variable: "--font-thai", display: "swap" });
import { getSettings } from "@/lib/settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: s.system_name, description: `${s.system_name} ${s.school_name}`, icons: s.logo_url ? [s.logo_url] : undefined };
}

// Always light: opt out of OS dark mode and browser "force dark" (Chrome/Samsung Internet).
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1e3a8a", colorScheme: "only light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="th" data-theme={s.theme} className={thai.variable} style={{ colorScheme: "only light" }}>
      <body className="antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-md md:max-w-3xl lg:max-w-5xl">{children}</div>
      </body>
    </html>
  );
}
