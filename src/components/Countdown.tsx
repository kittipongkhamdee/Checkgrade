"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Counts down to `to`; calls onDone when reached. */
export function Countdown({ to, onDone }: { to: string; onDone?: () => void }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, target - now);
  useEffect(() => {
    if (left === 0) onDone?.();
  }, [left, onDone]);
  const d = Math.floor(left / 86400000), h = Math.floor(left / 3600000) % 24, m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60;
  const parts: [number, string][] = [[d, "วัน"], [h, "ชั่วโมง"], [m, "นาที"], [s, "วินาที"]];
  return (
    <div className="grid grid-cols-4 gap-2">
      {parts.map(([v, l]) => (
        <div key={l} className="card py-3 text-center">
          <div className="text-2xl font-bold tabular-nums">{pad(v)}</div>
          <div className="text-xs text-muted">{l}</div>
        </div>
      ))}
    </div>
  );
}
