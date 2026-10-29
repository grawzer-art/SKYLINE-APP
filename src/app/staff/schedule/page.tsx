import Link from "next/link";
import { StaffTitle, StaffSection, DemoLine } from "@/components/staff/ui";
import { getStaffMember, schedule, scheduleStatusLabel } from "@/data/staff";

const phases = ["Préparation", "Veille", "Sur place"] as const;

/** SCHEDULE : planning opérationnel en ordre chronologique, par phase. Échéances relatives : aucun horaire réel confirmé. */
export default function Page() {
  return (
    <>
      <StaffTitle eyebrow="Planning opérationnel" title="Schedule" />
      {phases.map((ph) => (
        <StaffSection key={ph} title={ph}>
          <ol className="relative ml-1 border-l border-silver/30">
            {schedule.filter((s) => s.phase === ph).map((s) => {
              const o = getStaffMember(s.ownerId);
              return (
                <li key={s.id} className="relative pb-7 pl-6 last:pb-0">
                  <span aria-hidden className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ${s.status === "confirmed" ? "bg-sky" : s.status === "preparing" ? "bg-cloud" : "bg-jet ring-1 ring-silver/60"}`} />
                  <p className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-sky">{s.when} <span className="text-cloud/64">· {s.time}</span></p>
                  <p className="mt-1.5 text-[1.1rem] leading-snug">{s.title}</p>
                  <p className="mt-1 flex flex-wrap items-center text-[0.88rem] text-cloud/75">{o ? <Link href={`/staff/team/${o.id}`} className="inline-flex min-h-11 items-center underline decoration-silver/40 underline-offset-4">{o.name}</Link> : null}<span>&nbsp;· {o?.functions.join(", ")}</span></p>
                  <p className="mt-1 text-[0.85rem] text-dim">{scheduleStatusLabel[s.status]} · {s.place}</p>
                </li>
              );
            })}
          </ol>
        </StaffSection>
      ))}
      <DemoLine />
    </>
  );
}
