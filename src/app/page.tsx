import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { thaiDateTime, windowState } from "@/lib/format";
import { BoardIcon, CapIcon, ChevronIcon, ClockIcon } from "@/components/Icons";

export default async function Home() {
  const s = await getSettings();
  const state = windowState(s.open_at, s.close_at);
  const term = s.open_semesters.length ? `ภาคเรียนที่ ${s.open_semesters.join(" และ ")} / ${s.academic_year}` : `ปีการศึกษา ${s.academic_year}`;
  const stateText = state === "open" ? "เปิดให้ตรวจสอบแล้ว" : state === "before" ? "ยังไม่เปิดให้ตรวจสอบ" : "ปิดการตรวจสอบแล้ว";
  const stateColor = state === "open" ? "#34c759" : "#ff9f0a";

  return (
    <main className="relative flex min-h-dvh flex-col">
      <div className="mesh fixed inset-0 -z-10" aria-hidden />

      <section className="flex flex-col items-center px-6 pb-8 pt-16 text-center md:pt-24">
        <div className="glass grid size-24 place-items-center rounded-[28px]">
          {s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt="โลโก้โรงเรียน" width={72} height={72} className="size-[72px] object-contain" />
          ) : (
            <CapIcon size={44} className="text-primary" />
          )}
        </div>
        <h1 className="mt-6 text-[26px] font-bold leading-tight tracking-tight md:text-4xl">{s.system_name}</h1>
        <p className="mt-1 text-muted md:text-lg">{s.school_name}</p>
        <span className="glass mt-4 rounded-full px-4 py-1.5 text-sm font-semibold">{term}</span>
      </section>

      <section className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 px-5 md:grid-cols-2">
        <Link href="/student" className="glass group flex items-center gap-4 rounded-[24px] p-4 transition active:scale-[.98]">
          <div className="grid size-14 shrink-0 place-items-center rounded-[18px] text-white shadow-md" style={{ background: "var(--icon-a)" }}>
            <CapIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">นักเรียน</div>
            <div className="text-sm text-muted">ดูผลการเรียนด้วยเลขประจำตัว</div>
          </div>
          <ChevronIcon className="shrink-0 text-muted transition group-hover:translate-x-0.5" />
        </Link>

        <Link href="/teacher" className="glass group flex items-center gap-4 rounded-[24px] p-4 transition active:scale-[.98]">
          <div className="grid size-14 shrink-0 place-items-center rounded-[18px] text-white shadow-md" style={{ background: "var(--icon-b)" }}>
            <BoardIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">ครู</div>
            <div className="text-sm text-muted">เข้าสู่ระบบเพื่อจัดการผลการเรียน</div>
          </div>
          <ChevronIcon className="shrink-0 text-muted transition group-hover:translate-x-0.5" />
        </Link>

        <div className="glass rounded-[22px] p-4 text-sm md:col-span-2">
          <div className="flex items-center gap-2 font-bold"><ClockIcon className="text-muted" /> ช่วงเวลาตรวจสอบผล</div>
          <div className="mt-1.5 text-muted">
            {s.open_at || s.close_at ? `เปิด ${thaiDateTime(s.open_at)} · ปิด ${thaiDateTime(s.close_at)}` : "ไม่จำกัดเวลา"}
          </div>
          <div className="mt-2 flex items-center gap-2 font-bold" style={{ color: stateColor }}>
            <span className="size-2 rounded-full" style={{ background: stateColor }} /> {stateText}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-muted">© {s.school_name}</footer>
    </main>
  );
}
