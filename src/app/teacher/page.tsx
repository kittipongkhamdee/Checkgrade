"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Guard } from "@/components/Guard";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/useAuth";

type SetRow = { id: string; level: string; room: string; semester: number; academic_year: number; student_results: { gpa: number | null; scores: { grade: unknown }[] }[] };

export default function TeacherPage() {
  return <Guard>{(p) => <Dashboard p={p} />}</Guard>;
}

function Dashboard({ p }: { p: Profile }) {
  const [sets, setSets] = useState<SetRow[] | null>(null);

  useEffect(() => {
    supabase()
      .from("report_sets")
      .select("id, level, room, semester, academic_year, student_results(gpa, scores)")
      .eq("teacher_id", p.id)
      .order("academic_year", { ascending: false })
      .order("semester", { ascending: false })
      .then(({ data }) => setSets((data as SetRow[]) ?? []));
  }, [p.id]);

  const stats = useMemo(() => {
    const all = (sets ?? []).flatMap((s) => s.student_results);
    const gpas = all.map((r) => Number(r.gpa)).filter((g) => Number.isFinite(g) && g > 0);
    const dist: Record<string, number> = {};
    let incomplete = 0;
    for (const r of all)
      for (const sc of r.scores) {
        const k = sc.grade == null ? "ร/มส" : String(sc.grade);
        dist[k] = (dist[k] ?? 0) + 1;
        if (sc.grade == null || sc.grade === 0) incomplete++;
      }
    return { students: all.length, avg: gpas.length ? gpas.reduce((a, b) => a + b, 0) / gpas.length : 0, dist, incomplete };
  }, [sets]);

  const order = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0", "ร/มส"];
  const max = Math.max(1, ...Object.values(stats.dist));

  return (
    <main className="pb-24">
      <TopBar
        title={`สวัสดี ${p.full_name || "คุณครู"}`}
        right={
          <div className="flex gap-2">
            {p.role === "admin" && <Link href="/admin" className="btn btn-ghost min-h-9 px-3 text-sm">แอดมิน</Link>}
            <button className="btn btn-ghost min-h-9 px-3 text-sm" onClick={() => supabase().auth.signOut()}>ออก</button>
          </div>
        }
      />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="นักเรียน" v={stats.students} />
          <Kpi label="GPA เฉลี่ย" v={stats.avg ? stats.avg.toFixed(2) : "-"} />
          <Kpi label="0 / ร / มส" v={stats.incomplete} tone="var(--bad)" />
        </div>

        <div className="card p-4">
          <div className="mb-3 font-semibold">การกระจายเกรด (ทุกวิชา)</div>
          {sets == null ? <div className="skeleton h-32" /> : (
            <div className="space-y-1.5">
              {order.filter((k) => stats.dist[k]).map((k) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span className="w-10 text-right font-medium tabular-nums">{k}</span>
                  <div className="h-5 flex-1 rounded bg-surface-2">
                    <div className="h-5 rounded" style={{ width: `${(stats.dist[k] / max) * 100}%`, background: k === "0" || k === "ร/มส" ? "var(--bad)" : "var(--primary)" }} />
                  </div>
                  <span className="w-8 text-right tabular-nums text-muted">{stats.dist[k]}</span>
                </div>
              ))}
              {!Object.keys(stats.dist).length && <p className="text-sm text-muted">ยังไม่มีข้อมูล</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold">ชุดข้อมูลของฉัน</h2>
        </div>
        {sets == null ? <div className="skeleton h-20" /> : sets.length === 0 ? (
          <div className="card p-6 text-center text-muted">ยังไม่มีข้อมูล เริ่มจากอัปโหลดไฟล์ Excel</div>
        ) : (
          sets.map((s) => {
            const g = s.student_results.map((r) => Number(r.gpa)).filter((x) => x > 0);
            return (
              <Link key={s.id} href={`/teacher/set/${s.id}`} className="card flex items-center gap-3 p-4">
                <div className="grid size-12 place-items-center rounded-xl bg-surface-2 font-bold">{s.semester}</div>
                <div className="flex-1">
                  <div className="font-medium">{s.level}/{s.room}</div>
                  <div className="text-sm text-muted">ภาคเรียนที่ {s.semester}/{s.academic_year} · {s.student_results.length} คน</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted">GPA เฉลี่ย</div>
                  <div className="font-semibold">{g.length ? (g.reduce((a, b) => a + b, 0) / g.length).toFixed(2) : "-"}</div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
        <Link href="/teacher/upload" className="btn btn-primary w-full shadow-lg">⬆ อัปโหลดไฟล์ Excel</Link>
      </div>
    </main>
  );
}

function Kpi({ label, v, tone }: { label: string; v: React.ReactNode; tone?: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-2xl font-bold tabular-nums" style={{ color: tone }}>{v}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
