"use client";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "./ui";
import { activeMembers, staffFunctions, type StaffFunction } from "@/data/staff";
import { cn } from "@/lib/cn";

/** Annuaire du staff : filtre par fonction (métier). Les coordonnées ne figurent jamais dans la liste. */
export function TeamDirectory() {
  const [f, setF] = useState<StaffFunction | null>(null);
  const list = activeMembers().filter((m) => !f || m.functions.includes(f)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return (
    <>
      <div role="group" aria-label="Filtrer par fonction" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {staffFunctions.map((x) => (
          <button key={x} type="button" aria-pressed={f === x} onClick={() => setF(f === x ? null : x)} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-[0.88rem] transition", f === x ? "border-sky bg-sky text-jet" : "border-line bg-surface-1 text-cloud")}>{x}</button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="mt-4 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/72">{list.length} {list.length > 1 ? "personnes" : "personne"}</p>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {list.map((m) => (
          <li key={m.id}><Link href={`/staff/team/${m.id}`} className="flex min-h-[4.75rem] items-center gap-4 py-3"><Avatar name={m.name} /><span className="min-w-0"><span className="block text-[1.05rem]">{m.name}</span><span className="mt-0.5 block text-[0.85rem] text-dim">{m.functions.join(" · ")}</span></span></Link></li>
        ))}
      </ul>
    </>
  );
}
