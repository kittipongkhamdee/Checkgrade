import type { Settings } from "@/lib/types";

export function Logo({ s, size = 72 }: { s: Pick<Settings, "logo_url" | "system_name">; size?: number }) {
  return s.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={s.logo_url} alt="โลโก้" width={size} height={size} className="rounded-2xl object-contain bg-white" style={{ width: size, height: size }} />
  ) : (
    <div className="grid place-items-center rounded-2xl bg-white/20 text-3xl font-bold" style={{ width: size, height: size }}>
      🎓
    </div>
  );
}
