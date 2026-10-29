import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StaffTitle, StaffSection, DemoLine } from "@/components/staff/ui";
import { announcements, channels } from "@/data/staff";

/** COMMS : annonces et canaux par équipe. L'architecture de messagerie est préparée ; aucune messagerie n'est connectée. */
export default function Page() {
  return (
    <>
      <StaffTitle eyebrow="Communication interne" title="Comms">
        <p role="status" className="mt-4 max-w-[34ch] border-l border-sky pl-4 text-[1rem] font-light leading-snug text-cloud/85">Messagerie interne non connectée : canaux et annonces en lecture, en démonstration.</p>
      </StaffTitle>
      <StaffSection title="Canaux">
        <ul className="divide-y divide-line border-y border-line">
          {channels.map((c) => (
            <li key={c.id}><Link href={`/staff/comms/${c.id}`} className="flex min-h-[4.5rem] items-center justify-between gap-4 py-3"><span><span className="font-display block text-[1.1rem]">{c.title}</span><span className="mt-1 block text-[0.88rem] text-dim">{c.description}</span></span><ArrowRight size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-silver" /></Link></li>
          ))}
        </ul>
      </StaffSection>
      <StaffSection title="Dernières annonces">
        <ul className="divide-y divide-line border-y border-line">
          {announcements.map((a) => (
            <li key={a.id} className="py-4"><span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">{a.tag}</span><p className="mt-1 text-[1rem] leading-snug">{a.title}</p><p className="mt-1 text-[0.88rem] leading-snug text-cloud/72">{a.text}</p></li>
          ))}
        </ul>
      </StaffSection>
      <DemoLine />
    </>
  );
}
