"use client";
import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from 0 to `value` with ease-out; calls onDone at the end. */
export function CountUp({ value, decimals = 0, duration = 2600, delay = 0, onDone }: {
  value: number; decimals?: number; duration?: number; delay?: number; onDone?: () => void;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduced()) { setV(value); onDone?.(); return; }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setV(value * (1 - Math.pow(1 - t, 5))); // ease-out quint: fast start, long gentle settle
      if (t < 1) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{v.toFixed(decimals)}</>;
}

/** Fades/slides children in when scrolled into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${shown ? "reveal-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Resolve theme CSS variables to concrete colors (works with color-mix values). */
export function themeColors(vars = ["--primary", "--accent", "--mesh-1"]) {
  const el = document.createElement("span");
  document.body.appendChild(el);
  const out = vars.map((v) => { el.style.color = `var(${v})`; return getComputedStyle(el).color; });
  el.remove();
  return out;
}

/** Confetti in the school colors plus white. */
export const schoolConfetti = () => {
  const [p, a, m] = themeColors();
  confetti([p, p, a, "#ffffff", "#ffffff", m]);
};

/**
 * Full-screen confetti: two side cannons fire up and inward, then a shower
 * falls across the whole width. Particle count and speed scale with the
 * viewport so narrow phones look as full as desktops.
 */
export function confetti(colors = ["#0a84ff", "#5e5ce6", "#ff375f", "#ff9f0a", "#34c759", "#ffd60a"]) {
  if (reduced()) return;
  const W = innerWidth, H = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2); // cap for phone performance
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60";
  c.width = W * dpr;
  c.height = H * dpr;
  document.body.appendChild(c);
  const ctx2 = c.getContext("2d")!;
  ctx2.scale(dpr, dpr);

  type P = { x: number; y: number; vx: number; vy: number; w: number; h: number; a: number; va: number; tilt: number; color: string; round: boolean; delay: number };
  const pick = () => colors[(Math.random() * colors.length) | 0];
  const speed = Math.max(H, 600) / 50; // taller screens → stronger launch
  const parts: P[] = [];
  const make = (x: number, y: number, vx: number, vy: number, delay: number): P => ({
    x, y, vx, vy, delay,
    w: Math.random() * 7 + 6, h: Math.random() * 5 + 4,
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.35, tilt: Math.random() * Math.PI,
    color: pick(), round: Math.random() < 0.25,
  });

  const perCannon = Math.round(Math.min(180, 60 + (W * H) / 6000));
  for (let i = 0; i < perCannon; i++) {
    const ang = (-65 - Math.random() * 25) * (Math.PI / 180); // up and inward
    const v = speed * (0.75 + Math.random() * 0.6);
    parts.push(make(0, H, Math.cos(ang) * v, Math.sin(ang) * v, Math.random() * 6));
    parts.push(make(W, H, -Math.cos(ang) * v, Math.sin(ang) * v, Math.random() * 6));
  }
  const shower = Math.round(Math.min(160, W / 3));
  for (let i = 0; i < shower; i++) {
    parts.push(make(Math.random() * W, -20 - Math.random() * H * 0.4, (Math.random() - 0.5) * 2, Math.random() * 2 + 1, 25 + Math.random() * 40));
  }

  let frame = 0;
  const tick = () => {
    frame++;
    ctx2.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of parts) {
      if (frame < p.delay) { alive++; continue; }
      p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985;
      p.vy = Math.min(p.vy, 5.5); // flutter down instead of dropping
      p.x += p.vx + Math.sin(p.tilt) * 0.6; p.y += p.vy;
      p.a += p.va; p.tilt += 0.08;
      if (p.y > H + 30) continue;
      alive++;
      ctx2.save();
      ctx2.translate(p.x, p.y);
      ctx2.rotate(p.a);
      ctx2.scale(1, Math.cos(p.tilt)); // paper flip
      ctx2.fillStyle = p.color;
      if (p.color.includes("255, 255, 255") || p.color === "#ffffff") { ctx2.strokeStyle = "rgba(0,0,0,.12)"; ctx2.lineWidth = 0.6; }
      if (p.round) { ctx2.beginPath(); ctx2.arc(0, 0, p.h / 1.6, 0, Math.PI * 2); ctx2.fill(); }
      else { ctx2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); if (p.color === "#ffffff") ctx2.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      ctx2.restore();
    }
    if (alive && frame < 420) requestAnimationFrame(tick); else c.remove();
  };
  requestAnimationFrame(tick);
}

// ---- Sound: synthesized with Web Audio (no audio files to download) ----
let ctx: AudioContext | null = null;
const MUTE_KEY = "cg-muted";

export const isMuted = () => { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; } };
export const setMuted = (m: boolean) => { try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* ignore */ } };

/** Must run inside a user tap (e.g. the "ตกลง" button) so mobile browsers allow sound later. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") ctx.resume();
  } catch { /* no audio support */ }
}

let clip: AudioBuffer | null = null;

/** Download and decode the admin's applause recording (call after unlockAudio). */
export async function loadApplause(url: string | null) {
  if (!url || !ctx || clip) return;
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    clip = await ctx.decodeAudioData(buf);
  } catch { /* unsupported file: stay silent */ }
}

/** Play the applause recording with a short fade-out at the end. */
export function applause() {
  if (!ctx || !clip || isMuted() || reduced()) return;
  const src = ctx.createBufferSource();
  src.buffer = clip;
  const g = ctx.createGain();
  const t = ctx.currentTime, end = Math.min(clip.duration, 6);
  g.gain.setValueAtTime(1, t);
  g.gain.setValueAtTime(1, t + Math.max(0, end - 0.8));
  g.gain.linearRampToValueAtTime(0, t + end);
  src.connect(g).connect(ctx.destination);
  src.start(t);
  src.stop(t + end);
}
