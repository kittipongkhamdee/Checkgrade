"use client";
import Link from "next/link";

export function TopBar({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="glass sticky top-1.5 z-20 flex items-center gap-2 !rounded-none !border-x-0 !border-t-0 px-4 py-3 md:top-3 md:mt-3 md:!rounded-2xl md:!border">
      {back && <Link href={back} className="grid size-9 place-items-center rounded-full bg-surface-2" aria-label="ย้อนกลับ">‹</Link>}
      <h1 className="flex-1 truncate font-semibold">{title}</h1>
      {right}
    </header>
  );
}
