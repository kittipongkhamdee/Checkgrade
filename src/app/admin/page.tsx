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

const TABS = ["ตั้งค่า", "ครู", "ประวัติ", "แชร์ลิงก์"] as const;

export default function AdminPage() {
  return <Guard adminOnly>{(p) => <Admin p={p} />}</Guard>;
}

function Admin({ p }: { p: Profile }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("ตั้งค่า");
  return (
    <main className="pb-10">
      <TopBar title="ผู้ดูแลระบบ" right={<Link href="/teacher" className="btn btn-ghost min-h-9 px-3 text-sm">หน้าครู</Link>} />
      <div className="sticky top-[57px] z-10 grid grid-cols-4 gap-1 bg-[var(--surface)] p-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2 text-sm font-medium ${t === tab ? "bg-primary text-primary-fg" : "text-muted"}`}>{t}</button>
        ))}
      </div>
      <div className="p-4">
        {tab === "ตั้งค่า" && <SettingsTab name={p.full_name} />}
        {tab === "ครู" && <TeachersTab me={p.id} />}
        {tab === "ประวัติ" && <LogsTab />}
        {tab === "แชร์ลิงก์" && <ShareTab />}
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
    if (!file || !s) return;
    const path = `logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase().storage.from("assets").upload(path, file, { upsert: true });
    if (error) return setMsg("อัปโหลดโลโก้ไม่สำเร็จ: " + error.message);
    setS({ ...s, logo_url: supabase().storage.from("assets").getPublicUrl(path).data.publicUrl });
  }

  function pickTheme(t: Theme) {
    setS({ ...s!, theme: t });
    document.documentElement.dataset.theme = t; // live preview
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase().from("settings").update({
      system_name: s!.system_name, school_name: s!.school_name, logo_url: s!.logo_url, semester: s!.semester,
      academic_year: s!.academic_year, levels: s!.levels, rooms: s!.rooms, open_at: s!.open_at, close_at: s!.close_at,
      theme: s!.theme, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    await fetch("/api/revalidate", { method: "POST" });
    logTeacher("update settings", name, "admin");
    setBusy(false);
    setMsg(error ? "บันทึกไม่สำเร็จ: " + error.message : "บันทึกแล้ว ✓");
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">ข้อมูลระบบ</h2>
        <div className="flex items-center gap-3">
          {s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt="" className="size-16 rounded-xl bg-white object-contain" />
          ) : <div className="grid size-16 place-items-center rounded-xl bg-surface-2 text-2xl">🎓</div>}
          <label className="btn btn-ghost cursor-pointer">เปลี่ยนโลโก้<input type="file" accept="image/*" className="hidden" onChange={uploadLogo} /></label>
        </div>
        <div><label className="label">ชื่อระบบ</label><input className="input" {...field("system_name")} /></div>
        <div><label className="label">ชื่อโรงเรียน</label><input className="input" {...field("school_name")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">ภาคเรียน</label><input className="input" inputMode="numeric" {...field("semester", true)} /></div>
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
        <div><label className="label">เปิด</label><input type="datetime-local" className="input" value={toLocal(s.open_at)} onChange={(e) => setS({ ...s, open_at: fromLocal(e.target.value) })} /></div>
        <div><label className="label">ปิด</label><input type="datetime-local" className="input" value={toLocal(s.close_at)} onChange={(e) => setS({ ...s, close_at: fromLocal(e.target.value) })} /></div>
        <p className="text-xs text-muted">เว้นว่างไว้ = ไม่จำกัดเวลา · ถ้ายังไม่ถึงเวลาเปิด นักเรียนจะเห็นการนับถอยหลัง</p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">สไตล์หน้าตา</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => pickTheme(t.id)}
              className={`rounded-xl border-2 p-2 text-xs ${s.theme === t.id ? "border-[var(--accent)]" : "border-line"}`}>
              <div className="mb-1 flex h-10 overflow-hidden rounded-lg">{t.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
              {t.name}
            </button>
          ))}
        </div>
      </section>

      {msg && <p className="text-center text-sm">{msg}</p>}
      <button className="btn btn-primary w-full" onClick={save} disabled={busy}>{busy ? "กำลังบันทึก…" : "💾 บันทึกการตั้งค่า"}</button>
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
    <div className="space-y-2">
      <p className="text-sm text-muted">ครูทั้งหมด {list.length} คน</p>
      {list.map((t) => (
        <div key={t.id} className="card flex items-center gap-3 p-3">
          <div className="grid size-10 place-items-center rounded-full bg-surface-2">{t.role === "admin" ? "⭐" : "👩‍🏫"}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{t.full_name || "-"}</div>
            <div className="truncate text-xs text-muted">{t.email} · {t.role === "admin" ? "แอดมิน" : "ครู"}</div>
          </div>
          {t.id !== me && (
            <div className="flex flex-col gap-1">
              <button className={`btn min-h-8 px-2 text-xs ${t.active ? "btn-ghost" : "btn-danger"}`} onClick={() => patch(t.id, { active: !t.active })}>
                {t.active ? "ใช้งาน" : "ระงับ"}
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
  const [logs, setLogs] = useState<Log[] | null>(null);
  useEffect(() => {
    setLogs(null);
    const q = supabase().from("access_logs").select("*").order("created_at", { ascending: false }).limit(300);
    (role === "student" ? q.eq("role", "student") : q.in("role", ["teacher", "admin"])).then(({ data }) => setLogs((data as Log[]) ?? []));
  }, [role]);
  return (
    <div className="space-y-3">
      <div className="card grid grid-cols-2 gap-1 p-1">
        {(["student", "teacher"] as const).map((r) => (
          <button key={r} onClick={() => setRole(r)} className={`rounded-xl py-2 text-sm ${r === role ? "bg-primary text-primary-fg" : "text-muted"}`}>
            {r === "student" ? "นักเรียน" : "ครู"}
          </button>
        ))}
      </div>
      {!logs ? <div className="skeleton h-40" /> : logs.length === 0 ? <p className="text-center text-sm text-muted">ยังไม่มีประวัติ</p> : (
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

function ShareTab() {
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const links = [
    { key: "student", label: "ลิงก์สำหรับนักเรียน", path: "/student" },
    { key: "home", label: "หน้าแรก", path: "/" },
    { key: "teacher", label: "ลิงก์สำหรับครู", path: "/teacher" },
  ];
  useEffect(() => {
    const o = window.location.origin;
    setOrigin(o);
    Promise.all(links.map(async (l) => [l.key, await QRCode.toDataURL(o + l.path, { width: 512, margin: 1 })] as const)).then((r) => setQr(Object.fromEntries(r)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="space-y-4">
      {links.map((l) => {
        const url = origin + l.path;
        return (
          <div key={l.key} className="card space-y-3 p-4">
            <div className="font-semibold">{l.label}</div>
            <div className="flex gap-2">
              <input readOnly className="input text-sm" value={url} onFocus={(e) => e.target.select()} />
              <button className="btn btn-primary shrink-0" onClick={() => copy(url, l.key)}>{copied === l.key ? "✓" : "คัดลอก"}</button>
            </div>
            {qr[l.key] && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr[l.key]} alt={`QR ${l.label}`} className="size-28 rounded-lg bg-white p-1" />
                <a href={qr[l.key]} download={`qr-${l.key}.png`} className="btn btn-ghost">⬇ ดาวน์โหลด QR</a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
