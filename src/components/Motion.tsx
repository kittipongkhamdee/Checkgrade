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

/** One-shot confetti burst on a full-screen canvas. */
export function confetti(colors = ["#0a84ff", "#5e5ce6", "#ff375f", "#ff9f0a", "#34c759", "#ffd60a"]) {
  if (reduced()) return;
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60";
  c.width = innerWidth * devicePixelRatio;
  c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const ctx = c.getContext("2d")!;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    r: Math.random() * 6 + 4, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
    color: colors[(Math.random() * colors.length) | 0],
  }));
  const t0 = performance.now();
  const frame = (now: number) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.color; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    }
    if (now - t0 < 2600) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
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

/** Build a short decaying-noise impulse response for a small-hall reverb. */
function hall(a: AudioContext, seconds = 1.4) {
  const len = a.sampleRate * seconds;
  const ir = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return ir;
}

/**
 * Crowd applause: ~28 people, each clapping at their own steady tempo with
 * their own hand "tone", fading in and out, through a soft hall reverb.
 */
export function applause() {
  if (!ctx || isMuted() || reduced()) return;
  const a = ctx;
  const sr = a.sampleRate;
  const now = a.currentTime + 0.02;
  const dur = 3.4;

  // one clap = very sharp attack, ~15 ms decay
  const clap = a.createBuffer(1, Math.floor(sr * 0.03), sr);
  const c = clap.getChannelData(0);
  for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.0045));

  const out = a.createGain();
  out.gain.value = 0.9;
  const hp = a.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 350;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 6500;
  const verb = a.createConvolver();
  verb.buffer = hall(a);
  const wet = a.createGain(); wet.gain.value = 0.35;
  const dry = a.createGain(); dry.gain.value = 0.8;
  out.connect(hp).connect(lp);
  lp.connect(dry).connect(a.destination);
  lp.connect(verb).connect(wet).connect(a.destination);

  const people = 28;
  for (let p = 0; p < people; p++) {
    const rate = 3.6 + Math.random() * 2.2;           // claps per second
    const tone = 900 + Math.random() * 1600;           // hand resonance
    const start = Math.random() * 0.5;                 // people join in
    const stop = dur - Math.random() * 0.9;            // and drop out
    const loud = 0.25 + Math.random() * 0.35;
    const f = a.createBiquadFilter();
    f.type = "peaking"; f.frequency.value = tone; f.Q.value = 1.2; f.gain.value = 9;
    const pan = a.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    f.connect(pan).connect(out);
    for (let t = start; t < stop; t += (1 / rate) * (0.9 + Math.random() * 0.2)) {
      const env = Math.min(1, t / 0.6) * Math.min(1, (stop - t) / 0.8); // swell in, fade out
      const src = a.createBufferSource();
      src.buffer = clap;
      src.playbackRate.value = 0.85 + Math.random() * 0.3;
      const g = a.createGain();
      g.gain.value = loud * env * (0.7 + Math.random() * 0.3);
      src.connect(g).connect(f);
      src.start(now + t);
    }
  }
}
