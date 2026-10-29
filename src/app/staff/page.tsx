import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StaffTitle, StaffSection, DemoLine } from "@/components/staff/ui";
import { announcements, getStaffMember, schedule, scheduleStatusLabel } from "@/data/staff";

/** HQ : vue d'ensemble — la prochaine échéance, les priorités, les annonces internes. */
export default function Page() {
  const next = schedule.filter((s) => s.status !== "confirmed");
  const [first, ...rest] = next; const upcoming = rest.slice(0, 3);
  const priorities = announcements.filter((a) => a.tag === "Priorité");
  return (
    <>
      <StaffTitle eyebrow="Ibiza 2027 · Organisation" title="HQ" />

      {first && (
        <StaffSection>
          <Link href="/staff/schedule" className="group block border-y border-line py-6 transition active:bg-surface-1">
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-cloud/72">Prochaine échéance</p>
            <p className="font-display mt-3 text-[3.2rem] leading-none text-sky">{first.when}</p>
            <p className="mt-3 text-[1.25rem] leading-snug">{first.title}</p>
            <p className="mt-2 flex items-center justify-between text-[0.9rem] text-cloud/75"><span>{getStaffMember(first.ownerId)?.name} · {scheduleStatusLabel[first.status]}</span><ArrowRight size={18} strokeWidth={1.5} aria-hidden className="text-silver transition group-hover:translate-x-1" /></p>
          </Link>
        </StaffSection>
      )}

      {priorities.length > 0 && (
        <StaffSection title="Informations prioritaires">
          <ul className="space-y-4">
            {priorities.map((a) => (
              <li key={a.id} className="border-l-2 border-sky pl-4"><p className="text-[1.05rem] leading-snug">{a.title}</p><p className="mt-1.5 text-[0.9rem] leading-snug text-cloud/75">{a.text}</p></li>
            ))}
          </ul>
        </StaffSection>
      )}

      <StaffSection title="Prochaines échéances">
        <ul className="divide-y divide-line border-y border-line">
          {upcoming.map((s) => (
            <li key={s.id}><Link href="/staff/schedule" className="flex min-h-16 items-center gap-4 py-3"><span className="w-14 shrink-0 font-mono text-[0.95rem] text-sky">{s.when}</span><span className="min-w-0 flex-1"><span className="block text-[1rem] leading-snug">{s.title}</span><span className="mt-0.5 block text-[0.82rem] text-dim">{getStaffMember(s.ownerId)?.name}</span></span></Link></li>
          ))}
        </ul>
      </StaffSection>

      <StaffSection title="Annonces internes">
        <ul className="divide-y divide-line border-y border-line">
          {announcements.map((a) => (
            <li key={a.id}><Link href={`/staff/comms/${a.channel}`} className="block py-4"><span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">{a.tag}</span><span className="mt-1 block text-[1rem] leading-snug">{a.title}</span></Link></li>
          ))}
        </ul>
      </StaffSection>
      <DemoLine />
    </>
  );
}
