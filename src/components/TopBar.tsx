"use client";
import Link from "next/link";

export function TopBar({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-[var(--surface)] px-4 py-3 backdrop-blur">
      {back && <Link href={back} className="grid size-9 place-items-center rounded-full bg-surface-2" aria-label="ย้อนกลับ">‹</Link>}
      <h1 className="flex-1 truncate font-semibold">{title}</h1>
      {right}
    </header>
  );
}
