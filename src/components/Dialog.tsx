"use client";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Opts = { title: string; message?: React.ReactNode; confirmText?: string; cancelText?: string; danger?: boolean };

/** Themed replacement for window.confirm(). Resolves true when confirmed. */
export function confirmDialog(opts: Opts): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: boolean) => {
      resolve(v);
      setTimeout(() => { root.unmount(); host.remove(); }, 200);
    };
    root.render(<ConfirmView {...opts} onDone={done} />);
  });
}

function ConfirmView({ title, message, confirmText = "ตกลง", cancelText = "ยกเลิก", danger, onDone }: Opts & { onDone: (v: boolean) => void }) {
  const [closing, setClosing] = useState(false);
  const close = (v: boolean) => { setClosing(true); onDone(v); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div role="dialog" aria-modal className={`fixed inset-0 z-[70] grid place-items-center p-6 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => close(false)} />
      <div className={`card pop relative w-full max-w-sm space-y-4 p-6 text-center ${closing ? "scale-95" : ""}`} style={{ background: "color-mix(in srgb, #ffffff 88%, transparent)" }}>
        <div className="mx-auto grid size-14 place-items-center rounded-[18px] text-white shadow-md"
          style={{ background: danger ? "linear-gradient(135deg, #ef4444, #991b1b)" : "var(--icon-a)" }}>
          {danger ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          {message && <div className="mt-1 text-sm text-muted">{message}</div>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button autoFocus className="btn btn-ghost outline-none" onClick={() => close(false)}>{cancelText}</button>
          <button className={`btn outline-none ${danger ? "text-white" : "btn-primary"}`} style={danger ? { background: "linear-gradient(135deg, #dc2626, #991b1b)" } : undefined} onClick={() => close(true)}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Circular progress ring with % in the middle, in the theme color. */
export function ProgressRing({ value, label, sub }: { value: number; label: string; sub?: string }) {
  const r = 52, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, value));
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-6">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
      <div className="card pop relative flex w-full max-w-xs flex-col items-center gap-3 p-7" style={{ background: "color-mix(in srgb, #ffffff 88%, transparent)" }}>
        <div className="relative size-36">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .35s ease" }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>{Math.round(pct)}%</span>
          </div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{label}</div>
          {sub && <div className="text-sm text-muted">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
