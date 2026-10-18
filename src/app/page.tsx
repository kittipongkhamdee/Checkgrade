import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/Brand";
import { thaiDateTime, windowState } from "@/lib/format";

export default async function Home() {
  const s = await getSettings();
  const state = windowState(s.open_at, s.close_at);
  return (
    <main className="flex min-h-dvh flex-col">
      <section className="hero rounded-b-[32px] px-6 pb-12 pt-14 text-center">
        <div className="mx-auto mb-5 w-fit"><Logo s={s} size={88} /></div>
        <h1 className="text-2xl font-bold leading-tight">{s.system_name}</h1>
        <p className="mt-1 opacity-85">{s.school_name}</p>
        <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-sm">
          ภาคเรียนที่ {s.semester} / {s.academic_year}
        </p>
      </section>

      <section className="-mt-6 flex flex-1 flex-col gap-4 px-5">
        <Link href="/student" className="card flex items-center gap-4 p-5 active:scale-[.99]">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-2xl text-primary-fg">🧑‍🎓</div>
          <div className="flex-1">
            <div className="text-lg font-semibold">นักเรียน</div>
            <div className="text-sm text-muted">ตรวจสอบผลการเรียนด้วยเลขประจำตัว</div>
          </div>
          <span className="text-muted">›</span>
        </Link>
        <Link href="/teacher" className="card flex items-center gap-4 p-5 active:scale-[.99]">
          <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-2xl">👩‍🏫</div>
          <div className="flex-1">
            <div className="text-lg font-semibold">ครู</div>
            <div className="text-sm text-muted">เข้าสู่ระบบเพื่อจัดการผลการเรียน</div>
          </div>
          <span className="text-muted">›</span>
        </Link>

        <div className="card p-4 text-sm">
          <div className="mb-1 font-semibold">ช่วงเวลาตรวจสอบผล</div>
          <div className="text-muted">เปิด: {thaiDateTime(s.open_at)}</div>
          <div className="text-muted">ปิด: {thaiDateTime(s.close_at)}</div>
          <div className="mt-2 font-medium" style={{ color: state === "open" ? "var(--ok)" : "var(--warn)" }}>
            {state === "open" ? "● เปิดให้ตรวจสอบแล้ว" : state === "before" ? "● ยังไม่เปิดให้ตรวจสอบ" : "● ปิดการตรวจสอบแล้ว"}
          </div>
        </div>
      </section>
      <footer className="py-6 text-center text-xs text-muted">© {s.school_name}</footer>
    </main>
  );
}
