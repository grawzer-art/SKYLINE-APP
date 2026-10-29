import { notFound } from "next/navigation";
import { StaffTitle, StaffSection, DemoLine } from "@/components/staff/ui";
import { announcements, channels, getChannel } from "@/data/staff";

export function generateStaticParams() { return channels.map((c) => ({ channel: c.id })); }

/** Canal d'équipe : annonces en lecture. Le fil de discussion et le champ de saisie sont volontairement inactifs (messagerie non connectée). */
export default async function Page({ params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params; const c = getChannel(channel); if (!c) notFound();
  const list = announcements.filter((a) => a.channel === c.id);
  return (
    <>
      <StaffTitle eyebrow={c.description} title={c.title} back={{ href: "/staff/comms", label: "Comms" }} />
      <StaffSection title="Annonces">
        {list.length === 0 ? <p role="status" className="text-[1rem] font-light text-cloud/80">Aucune annonce dans ce canal.</p> : (
          <ul className="divide-y divide-line border-y border-line">{list.map((a) => <li key={a.id} className="py-4"><span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">{a.tag}</span><p className="mt-1 text-[1.02rem] leading-snug">{a.title}</p><p className="mt-1 text-[0.88rem] text-cloud/72">{a.text}</p></li>)}</ul>
        )}
      </StaffSection>
      <StaffSection title="Échanges">
        <p role="status" className="max-w-[34ch] text-[1rem] font-light leading-snug text-cloud/80">Les échanges de l&apos;équipe apparaîtront ici lorsque la messagerie interne sera connectée.</p>
        <form onSubmit={undefined} className="mt-5 flex gap-2" aria-label="Composer un message (inactif)">
          <label htmlFor="msg" className="sr-only">Message</label>
          <input id="msg" disabled placeholder="Messagerie non connectée (démo)" className="min-h-12 flex-1 rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] opacity-60" />
          <button type="button" disabled className="min-h-12 rounded-full bg-cloud px-5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-jet opacity-40">Envoyer</button>
        </form>
      </StaffSection>
      <DemoLine />
    </>
  );
}
