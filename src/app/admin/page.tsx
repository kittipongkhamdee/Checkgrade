"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/lib/supabase";
import { thaiDateTime } from "@/lib/format";
import { logTeacher, type Profile } from "@/lib/useAuth";
import type { Settings, Theme } from "@/lib/types";
import { shrinkImage } from "@/lib/image";
import { customColorVars } from "@/lib/theme";
import { confirmDialog } from "@/components/Dialog";
import { CapIcon, UserIcon } from "@/components/Icons";

const TABS = ["ผลการเรียน", "ตั้งค่า", "ครู", "ประวัติ"] as const;

export default function AdminPage() {
  return <Guard adminOnly>{(p) => <Admin p={p} />}</Guard>;
}

function Admin({ p }: { p: Profile }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("ผลการเรียน");
  return (
    <main className="pb-10">
      <TopBar title="ผู้ดูแลระบบ" right={<Link href="/teacher" className="btn btn-ghost min-h-9 px-3 text-sm">หน้าครู</Link>} />
      <div className="glass sticky top-[67px] z-10 mx-3 mt-3 flex gap-1 overflow-x-auto rounded-2xl p-1.5 md:top-[82px]">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium ${t === tab ? "bg-primary text-primary-fg" : "text-muted"}`}>{t}</button>
        ))}
      </div>
      <div className="p-4">
        {tab === "ผลการเรียน" && <ResultsTab />}
        {tab === "ตั้งค่า" && <SettingsTab name={p.full_name} />}
        {tab === "ครู" && <TeachersTab me={p.id} />}
        {tab === "ประวัติ" && <LogsTab />}
      </div>
    </main>
  );
}

// datetime-local <-> ISO
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

const THEMES: { id: Theme; name: string; colors: string[] }[] = [
  { id: "academic", name: "Clean Academic", colors: ["#1e3a8a", "#2563eb", "#f6f8fb"] },
  { id: "pastel", name: "Soft Pastel", colors: ["#a78bfa", "#f472b6", "#ecfeff"] },
  { id: "mono", name: "Bold Mono", colors: ["#09090b", "#d9f99d", "#fafafa"] },
  { id: "red", name: "Crimson Red", colors: ["#991b1b", "#e11d48", "#fbf7f7"] },
];

function SettingsTab({ name }: { name: string }) {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase().from("settings").select("*").eq("id", 1).single().then(({ data }) => setS(data as Settings));
  }, []);
  if (!s) return <div className="skeleton h-96" />;

  const field = (k: keyof Settings, num = false) => ({
    value: String(s[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: num ? Number(e.target.value) || 0 : e.target.value }),
  });

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !s) return;
    setMsg("กำลังอัปโหลดโลโก้…");
    try {
      const blob = await shrinkImage(file);
      const path = `logo-${Date.now()}.webp`;
      const { error } = await supabase().storage.from("assets").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      setS({ ...s, logo_url: supabase().storage.from("assets").getPublicUrl(path).data.publicUrl });
      setMsg(`อัปโหลดโลโก้แล้ว (${Math.round(blob.size / 1024)} KB) — กด "บันทึกการตั้งค่า" เพื่อใช้งาน`);
    } catch (err) {
      setMsg("อัปโหลดโลโก้ไม่สำเร็จ: " + (err as Error).message);
    }
  }

  async function uploadSound(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !s) return;
    if (file.size > 2 * 1024 * 1024) return setMsg("ไฟล์เสียงใหญ่เกิน 2 MB");
    setMsg("กำลังอัปโหลดไฟล์เสียง…");
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const path = `applause-${Date.now()}.${ext}`;
    const { error } = await supabase().storage.from("assets").upload(path, file, { contentType: file.type || "audio/mpeg", cacheControl: "31536000" });
    if (error) return setMsg("อัปโหลดไฟล์เสียงไม่สำเร็จ: " + error.message);
    setS({ ...s, applause_url: supabase().storage.from("assets").getPublicUrl(path).data.publicUrl });
    setMsg(`อัปโหลดไฟล์เสียงแล้ว (${Math.round(file.size / 1024)} KB) — กด "บันทึกการตั้งค่า" เพื่อใช้งาน`);
  }

  function pickColor(c: string | null) {
    setS({ ...s!, primary_color: c });
    const root = document.documentElement;
    const vars = customColorVars(c);
    for (const k of ["--primary", "--accent", "--hero", "--icon-a", "--icon-b", "--mesh-1", "--mesh-2", "--mesh-3", "--surface-2", "--border"]) root.style.removeProperty(k);
    if (vars) for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  }

  function pickTheme(t: Theme) {
    setS({ ...s!, theme: t });
    document.documentElement.dataset.theme = t; // live preview
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase().from("settings").update({
      system_name: s!.system_name, school_name: s!.school_name, logo_url: s!.logo_url, semester: s!.semester,
      academic_year: s!.academic_year, open_semesters: s!.open_semesters, levels: s!.levels, rooms: s!.rooms, open_at: s!.open_at, close_at: s!.close_at,
      theme: s!.theme, primary_color: s!.primary_color,
      fx_confetti: s!.fx_confetti, fx_sound: s!.fx_sound, fx_spotlight: s!.fx_spotlight, fx_min_gpa: s!.fx_min_gpa, applause_url: s!.applause_url, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    await fetch("/api/revalidate", { method: "POST" });
    logTeacher("update settings", name, "admin");
    setBusy(false);
    setMsg(error ? "บันทึกไม่สำเร็จ: " + error.message : "บันทึกแล้ว ✓");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <ShareLink />
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">ข้อมูลระบบ</h2>
        <div className="flex items-center gap-3">
          {s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt="" className="size-16 rounded-xl bg-white object-contain" />
          ) : <div className="grid size-16 place-items-center rounded-xl bg-surface-2 text-primary"><CapIcon size={32} /></div>}
          <label className="btn btn-ghost cursor-pointer">เปลี่ยนโลโก้<input type="file" accept="image/*" className="hidden" onChange={uploadLogo} /></label>
        </div>
        {msg.includes("โลโก้") && <p className="text-sm text-muted">{msg}</p>}
        <div><label className="label">ชื่อระบบ</label><input className="input" {...field("system_name")} /></div>
        <div><label className="label">ชื่อโรงเรียน</label><input className="input" {...field("school_name")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">ภาคเรียนที่รับอัปโหลด</label>
            <select className="input" value={s.semester} onChange={(e) => setS({ ...s, semester: Number(e.target.value) })}>
              <option value={1}>ภาคเรียนที่ 1</option>
              <option value={2}>ภาคเรียนที่ 2</option>
            </select>
          </div>
          <div><label className="label">ปีการศึกษา</label><input className="input" inputMode="numeric" {...field("academic_year", true)} /></div>
        </div>
        <div>
          <label className="label">ชั้น (คั่นด้วย ,)</label>
          <input className="input" value={s.levels.join(", ")} onChange={(e) => setS({ ...s, levels: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </div>
        <div>
          <label className="label">ห้อง (คั่นด้วย ,)</label>
          <input className="input" value={s.rooms.join(", ")} onChange={(e) => setS({ ...s, rooms: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">เวลาเปิด-ปิดการตรวจสอบของนักเรียน</h2>
        <div>
          <label className="label">ภาคเรียนที่ประกาศผล (นักเรียนเห็น)</label>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((n) => {
              const on = s.open_semesters.includes(n);
              return (
                <button key={n} type="button" onClick={() => setS({ ...s, open_semesters: on ? s.open_semesters.filter((x) => x !== n) : [...s.open_semesters, n].sort() })}
                  className={`btn ${on ? "btn-primary" : "btn-ghost"}`}>
                  {on ? "✓ " : ""}ภาคเรียนที่ {n}
                </button>
              );
            })}
          </div>
          {s.open_semesters.length === 0 && <p className="mt-1 text-xs text-warn">ยังไม่ได้เลือกภาคเรียน นักเรียนจะตรวจสอบผลไม่ได้</p>}
        </div>
        <div><label className="label">เปิด</label><input type="datetime-local" className="input" value={toLocal(s.open_at)} onChange={(e) => setS({ ...s, open_at: fromLocal(e.target.value) })} /></div>
        <div><label className="label">ปิด</label><input type="datetime-local" className="input" value={toLocal(s.close_at)} onChange={(e) => setS({ ...s, close_at: fromLocal(e.target.value) })} /></div>
        <p className="text-xs text-muted">เว้นว่างไว้ = ไม่จำกัดเวลา · ถ้ายังไม่ถึงเวลาเปิด นักเรียนจะเห็นการนับถอยหลัง</p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">สไตล์หน้าตา</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => pickTheme(t.id)}
              className={`rounded-xl border-2 p-2 text-xs ${s.theme === t.id ? "border-[var(--accent)]" : "border-line"}`}>
              <div className="mb-1 flex h-10 overflow-hidden rounded-lg">{t.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
              {t.name}
            </button>
          ))}
        </div>
        <div className="space-y-2 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">สีประจำโรงเรียน</span>
            {s.primary_color && <button className="text-xs text-muted underline" onClick={() => pickColor(null)}>ใช้สีตามธีม</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["#C8102E", "#B91C1C", "#1E3A8A", "#15803D", "#7C3AED", "#EA580C", "#DB2777", "#0F766E"].map((c) => (
              <button key={c} aria-label={c} onClick={() => pickColor(c)}
                className={`size-9 rounded-full border-2 ${s.primary_color?.toUpperCase() === c ? "border-[var(--text)]" : "border-white"}`} style={{ background: c }} />
            ))}
            <label className="btn btn-ghost min-h-9 cursor-pointer gap-2 px-3 text-sm">
              <span className="size-4 rounded-full border" style={{ background: s.primary_color ?? "transparent" }} /> เลือกเอง
              <input type="color" className="sr-only" value={s.primary_color ?? "#b91c1c"} onChange={(e) => pickColor(e.target.value)} />
            </label>
          </div>
          <p className="text-xs text-muted">{s.primary_color ? `ใช้สี ${s.primary_color.toUpperCase()} แทนสีหลักของธีม` : "ยังไม่ได้เลือก — ใช้สีตามธีม"}</p>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">เอฟเฟกต์ตอนนักเรียนเปิดผล</h2>
        <Toggle label="สปอตไลต์ส่อง GPA" hint="หน้าจอมืด ไฟส่องวูบวาบขณะตัวเลขวิ่ง" on={s.fx_spotlight} set={(v) => setS({ ...s, fx_spotlight: v })} />
        <Toggle label="พลุกระดาษ" hint="สีประจำโรงเรียน" on={s.fx_confetti} set={(v) => setS({ ...s, fx_confetti: v })} />
        <Toggle label="เสียงปรบมือ" hint="นักเรียนปิดเสียงเองได้ด้วยปุ่ม 🔊" on={s.fx_sound} set={(v) => setS({ ...s, fx_sound: v })} />
        {s.fx_sound && (
          <div className="space-y-2 rounded-2xl bg-surface-2 p-3 text-sm">
            <div className="font-medium">ไฟล์เสียงปรบมือ</div>
            {s.applause_url ? (
              <audio controls src={s.applause_url} className="h-10 w-full" />
            ) : (
              <p className="text-xs text-warn">ยังไม่มีไฟล์เสียง — นักเรียนจะไม่ได้ยินเสียง</p>
            )}
            <div className="flex gap-2">
              <label className="btn btn-ghost min-h-9 flex-1 cursor-pointer px-3 text-sm">
                {s.applause_url ? "เปลี่ยนไฟล์" : "อัปโหลดไฟล์เสียง"}
                <input type="file" accept="audio/*" className="hidden" onChange={uploadSound} />
              </label>
              {s.applause_url && <button className="btn btn-danger min-h-9 px-3 text-sm" onClick={() => setS({ ...s, applause_url: null })}>เอาออก</button>}
            </div>
            <p className="text-xs text-muted">MP3 / M4A / WAV ไม่เกิน 2 MB แนะนำยาว 3–5 วินาที</p>
          </div>
        )}
        <div className={s.fx_confetti || s.fx_sound ? "" : "opacity-40"}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">GPA ขั้นต่ำที่จะมีพลุและเสียง</span>
            <b className="tabular-nums" style={{ color: "var(--primary)" }}>{Number(s.fx_min_gpa) === 0 ? "ทุกคน" : `${Number(s.fx_min_gpa).toFixed(2)} ขึ้นไป`}</b>
          </div>
          <input type="range" min={0} max={4} step={0.25} value={Number(s.fx_min_gpa)} disabled={!s.fx_confetti && !s.fx_sound}
            onChange={(e) => setS({ ...s, fx_min_gpa: Number(e.target.value) })} className="mt-2 w-full accent-[var(--primary)]" />
          <div className="flex justify-between text-xs text-muted"><span>0 (ทุกคน)</span><span>2.00</span><span>4.00</span></div>
        </div>
      </section>

      {msg && <p className="text-center text-sm lg:col-span-2">{msg}</p>}
      <button className="btn btn-primary w-full lg:col-span-2" onClick={save} disabled={busy}>{busy ? "กำลังบันทึก…" : "💾 บันทึกการตั้งค่า"}</button>
    </div>
  );
}

function TeachersTab({ me }: { me: string }) {
  const [list, setList] = useState<(Profile & { created_at: string })[] | null>(null);
  const load = () => supabase().from("profiles").select("*").order("created_at").then(({ data }) => setList((data as never) ?? []));
  useEffect(() => { load(); }, []);

  async function patch(id: string, v: Partial<Profile>) {
    await supabase().from("profiles").update(v).eq("id", id);
    load();
  }

  if (!list) return <div className="skeleton h-40" />;
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <p className="text-sm text-muted md:col-span-2">ครูทั้งหมด {list.length} คน · รออนุมัติ {list.filter((t) => !t.active).length} คน</p>
      {list.map((t) => (
        <div key={t.id} className="card flex min-w-0 items-center gap-3 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-[14px] text-white" style={{ background: t.role === "admin" ? "var(--icon-b)" : "var(--icon-a)" }}><UserIcon size={20} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{t.full_name || "-"}</div>
            <div className="truncate text-xs text-muted">{t.email} · {t.role === "admin" ? "แอดมิน" : "ครู"}</div>
            {!t.active && <span className="mt-1 inline-block rounded bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] px-1.5 text-xs text-warn">รออนุมัติ / ระงับ</span>}
          </div>
          {t.id !== me && (
            <div className="flex flex-col gap-1">
              <button className={`btn min-h-8 px-2 text-xs ${t.active ? "btn-danger" : "btn-primary"}`} onClick={() => patch(t.id, { active: !t.active })}>
                {t.active ? "ระงับ" : "อนุมัติ"}
              </button>
              <button className="btn btn-ghost min-h-8 px-2 text-xs" onClick={() => patch(t.id, { role: t.role === "admin" ? "teacher" : "admin" })}>
                {t.role === "admin" ? "ลดเป็นครู" : "ตั้งเป็นแอดมิน"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type Log = { id: number; role: string; actor: string; name: string | null; action: string; created_at: string };

function LogsTab() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    setLogs(null);
    const t = setTimeout(() => {
      let query = supabase().from("access_logs").select("*").order("created_at", { ascending: false }).limit(100);
      query = role === "student" ? query.eq("role", "student") : query.in("role", ["teacher", "admin"]);
      const term = q.trim().replace(/[%,()]/g, "");
      if (term) query = query.or(`name.ilike.%${term}%,actor.ilike.%${term}%`);
      query.then(({ data }) => setLogs((data as Log[]) ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [role, q]);

  return (
    <div className="space-y-3">
      <div className="card grid grid-cols-2 gap-1 p-1">
        {(["student", "teacher"] as const).map((r) => (
          <button key={r} onClick={() => setRole(r)} className={`rounded-xl py-2 text-sm ${r === role ? "bg-primary text-primary-fg" : "text-muted"}`}>
            {r === "student" ? "นักเรียน" : "ครู"}
          </button>
        ))}
      </div>
      {role === "student" && <ViewSummary />}
      <input className="input" placeholder={role === "student" ? "ค้นหาชื่อ หรือเลขประจำตัว" : "ค้นหาชื่อครู"} value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="text-xs text-muted">แสดงล่าสุด 100 รายการ · เก็บประวัติย้อนหลัง 90 วัน</p>
      {!logs ? <div className="skeleton h-40" /> : logs.length === 0 ? <p className="text-center text-sm text-muted">ไม่พบรายการ</p> : (
        <div className="card divide-y divide-[var(--border)]">
          {logs.map((l) => (
            <div key={l.id} className="flex gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{l.name || l.actor}</div>
                <div className="truncate text-xs text-muted">{role === "student" ? `เลขประจำตัว ${l.actor} · ` : ""}{l.action}</div>
              </div>
              <div className="shrink-0 text-xs text-muted">{thaiDateTime(l.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ResultRow = { student_code: string; full_name: string; no: number | null; report_sets: { level: string; room: string; semester: number; academic_year: number } };

/** Per class: how many students have opened their results (published semesters only). */
function ViewSummary() {
  const [rows, setRows] = useState<{ cls: string; total: ResultRow[]; seen: Set<string> }[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data: st } = await sb.from("settings").select("academic_year, open_semesters").eq("id", 1).single();
      const [{ data: res }, { data: logs }] = await Promise.all([
        sb.from("student_results").select("student_code, full_name, no, report_sets!inner(level, room, semester, academic_year)")
          .eq("report_sets.academic_year", st?.academic_year ?? 0).in("report_sets.semester", st?.open_semesters ?? []).limit(5000),
        sb.from("access_logs").select("actor").eq("role", "student").limit(20000),
      ]);
      const seen = new Set((logs ?? []).map((l) => l.actor));
      const byClass = new Map<string, Map<string, ResultRow>>();
      for (const r of (res as unknown as ResultRow[]) ?? []) {
        const k = `${r.report_sets.level}/${r.report_sets.room}`;
        if (!byClass.has(k)) byClass.set(k, new Map());
        byClass.get(k)!.set(r.student_code, r); // one entry per student even if 2 semesters are open
      }
      setRows([...byClass.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "th", { numeric: true }))
        .map(([cls, m]) => ({ cls, total: [...m.values()].sort((a, b) => (a.no ?? 0) - (b.no ?? 0)), seen })));
    })();
  }, []);

  if (!rows) return <div className="skeleton h-24" />;
  if (!rows.length) return null;
  const all = rows.reduce((a, r) => a + r.total.length, 0);
  const seenAll = rows.reduce((a, r) => a + r.total.filter((x) => r.seen.has(x.student_code)).length, 0);

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-end justify-between">
        <div className="font-semibold">นักเรียนที่เข้าดูผลแล้ว</div>
        <div className="text-sm"><b className="text-lg tabular-nums">{seenAll}</b> / {all} คน</div>
      </div>
      {rows.map((r) => {
        const seenN = r.total.filter((x) => r.seen.has(x.student_code)).length;
        const pct = r.total.length ? (seenN / r.total.length) * 100 : 0;
        const missing = r.total.filter((x) => !r.seen.has(x.student_code));
        return (
          <div key={r.cls}>
            <button className="w-full text-left" onClick={() => setOpen(open === r.cls ? null : r.cls)}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{r.cls}</span>
                <span className="tabular-nums text-muted">{seenN}/{r.total.length} · ยังไม่ดู {missing.length} {missing.length ? (open === r.cls ? "▲" : "▼") : ""}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-surface-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--primary)" }} />
              </div>
            </button>
            {open === r.cls && missing.length > 0 && (
              <ul className="mt-2 space-y-0.5 rounded-xl bg-surface-2 p-3 text-sm">
                {missing.map((m) => <li key={m.student_code}>{m.no ?? "-"}. {m.full_name} <span className="text-xs text-muted">({m.student_code})</span></li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Home page link + QR, for posting to students and teachers. */
function ShareLink() {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const u = window.location.origin + "/";
    setUrl(u);
    QRCode.toDataURL(u, { width: 512, margin: 1 }).then(setQr);
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-semibold">ลิงก์ระบบ</h2>
      <div className="flex gap-2">
        <input readOnly className="input text-sm" value={url} onFocus={(e) => e.target.select()} />
        <button className="btn btn-primary shrink-0" onClick={copy}>{copied ? "✓ คัดลอกแล้ว" : "คัดลอก"}</button>
      </div>
      {qr && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR หน้าแรก" className="size-28 rounded-lg bg-white p-1" />
          <a href={qr} download="qr-checkgrade.png" className="btn btn-ghost">⬇ ดาวน์โหลด QR</a>
        </div>
      )}
    </section>
  );
}

type AdminSet = {
  id: string; level: string; room: string; semester: number; academic_year: number; created_at: string;
  profiles: { full_name: string; email: string } | null;
  student_results: { gpa: number | null }[];
};

/** Every teacher's uploads, grouped by class (level/room). */
function ResultsTab() {
  const [sets, setSets] = useState<AdminSet[] | null>(null);
  const [year, setYear] = useState<number | "all">("all");

  const load = () =>
    supabase()
      .from("report_sets")
      .select("id, level, room, semester, academic_year, created_at, profiles(full_name, email), student_results(gpa)")
      .order("academic_year", { ascending: false })
      .then(({ data }) => setSets((data as unknown as AdminSet[]) ?? []));
  useEffect(() => { load(); }, []);

  async function remove(x: AdminSet) {
    if (!(await confirmDialog({
      title: "ลบผลการเรียนชุดนี้?",
      message: <>{x.level}/{x.room} ภาคเรียนที่ {x.semester}/{x.academic_year}<br />ของ {x.profiles?.full_name || "ครู"} · {x.student_results.length} คน<br /><b className="text-bad">ลบแล้วกู้คืนไม่ได้</b></>,
      confirmText: "ลบ", danger: true,
    }))) return;
    await supabase().from("report_sets").delete().eq("id", x.id);
    logTeacher(`delete ${x.level}/${x.room} ภาค ${x.semester}`, "admin", "admin");
    load();
  }

  if (!sets) return <div className="skeleton h-40" />;
  const years = [...new Set(sets.map((x) => x.academic_year))];
  const shown = sets.filter((x) => year === "all" || x.academic_year === year);
  const groups = new Map<string, AdminSet[]>();
  for (const x of shown) {
    const k = `${x.level}/${x.room}`;
    groups.set(k, [...(groups.get(k) ?? []), x]);
  }
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, "th", { numeric: true }));
  const total = shown.reduce((a, x) => a + x.student_results.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select className="input flex-1" value={year} onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}>
          <option value="all">ทุกปีการศึกษา</option>
          {years.map((y) => <option key={y} value={y}>ปีการศึกษา {y}</option>)}
        </select>
        <div className="shrink-0 text-right text-sm text-muted">{keys.length} ชั้นเรียน<br />{total} รายการ</div>
      </div>
      {keys.length === 0 && <div className="card p-6 text-center text-muted">ยังไม่มีครูอัปโหลดข้อมูล</div>}
      {keys.map((k) => (
        <section key={k} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
          <h3 className="px-1 font-semibold md:col-span-2">{k}</h3>
          {groups.get(k)!.sort((a, b) => b.academic_year - a.academic_year || a.semester - b.semester).map((x) => {
            const g = x.student_results.map((r) => Number(r.gpa)).filter((v) => v > 0);
            return (
              <div key={x.id} className="card flex min-w-0 items-center gap-2 p-3">
                <Link href={`/teacher/set/${x.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-sm font-bold">ภ.{x.semester}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">ภาคเรียนที่ {x.semester}/{x.academic_year} · {x.student_results.length} คน</div>
                    <div className="truncate text-xs text-muted">โดย {x.profiles?.full_name || x.profiles?.email || "-"} · GPA เฉลี่ย {g.length ? (g.reduce((a, b) => a + b, 0) / g.length).toFixed(2) : "-"}</div>
                  </div>
                </Link>
                <Link href={`/teacher/set/${x.id}`} aria-label="แก้ไข" className="btn btn-ghost size-10 min-h-0 shrink-0 p-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </Link>
                <button aria-label="ลบ" className="btn btn-danger size-10 min-h-0 shrink-0 p-0" onClick={() => remove(x)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className="flex w-full items-center gap-3 text-left">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors" style={{ background: on ? "var(--primary)" : "#d4d4d8" }}>
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
