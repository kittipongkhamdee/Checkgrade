import { getSettings } from "@/lib/settings";
import { thaiDateTime, windowState } from "@/lib/format";
import { CapIcon, ClockIcon } from "@/components/Icons";
import { HomeTabs } from "@/components/HomeTabs";

export default async function Home() {
  const s = await getSettings();
  const state = windowState(s.open_at, s.close_at);
  const term = s.open_semesters.length ? `ภาคเรียนที่ ${s.open_semesters.join(" และ ")} / ${s.academic_year}` : `ปีการศึกษา ${s.academic_year}`;
  const stateText = state === "open" ? "เปิดแล้ว" : state === "before" ? "ยังไม่เปิด" : "ปิดแล้ว";
  const stateColor = state === "open" ? "#34c759" : "#ff9f0a";

  return (
    <main className="relative flex min-h-dvh flex-col">
      <section className="flex flex-col items-center px-6 pb-6 pt-12 text-center md:pt-20">
        <div className="glass pop grid size-24 place-items-center rounded-[28px]">
          {s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt="โลโก้โรงเรียน" width={72} height={72} className="size-[72px] object-contain" />
          ) : (
            <CapIcon size={44} className="text-primary" />
          )}
        </div>
        <h1 style={{ animationDelay: "120ms" }} className="rise mt-6 text-[26px] font-bold leading-tight tracking-tight md:text-4xl">{s.system_name}</h1>
        <p style={{ animationDelay: "200ms" }} className="rise mt-1 text-muted md:text-lg">{s.school_name}</p>
        <span style={{ animationDelay: "280ms" }} className="glass rise mt-4 rounded-full px-4 py-1.5 text-sm font-semibold">{term}</span>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-5">
        <HomeTabs openAt={s.open_at} closeAt={s.close_at} />
        <div style={{ animationDelay: "460ms" }} className="glass rise flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-muted">
            <ClockIcon className="shrink-0" />
            <span className="truncate">{s.open_at || s.close_at ? `เปิด ${thaiDateTime(s.open_at)} · ปิด ${thaiDateTime(s.close_at)}` : "ช่วงเวลาตรวจสอบผล · ไม่จำกัดเวลา"}</span>
          </span>
          <b className="flex shrink-0 items-center gap-1.5" style={{ color: stateColor }}>
            <span className="size-2 rounded-full" style={{ background: stateColor }} /> {stateText}
          </b>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-muted">© {s.school_name}</footer>
    </main>
  );
}
