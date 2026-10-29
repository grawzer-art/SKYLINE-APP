import { notFound } from "next/navigation";
import { Avatar, StaffSection, StaffTitle, DemoLine } from "@/components/staff/ui";
import { activeMembers, getStaffMember } from "@/data/staff";
import { accessLabels } from "@/lib/auth/roles";

export function generateStaticParams() { return activeMembers().map((m) => ({ id: m.id })); }

/** Fiche staff : fonction(s) et responsabilités (métier) SÉPARÉES des rôles d'accès (sécurité). Coordonnées seulement si autorisées. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const m = getStaffMember(id); if (!m) notFound();
  return (
    <>
      <StaffTitle eyebrow={m.functions.join(" · ")} title={m.name} back={{ href: "/staff/team", label: "Team" }} />
      <div className="px-5 pt-6"><Avatar name={m.name} size={84} /></div>
      <StaffSection title="Responsabilités"><ul className="divide-y divide-line border-y border-line">{m.responsibilities.map((r) => <li key={r} className="py-3.5 text-[1rem]">{r}</li>)}</ul></StaffSection>
      <StaffSection title="Accès">
        <p className="flex flex-wrap gap-2">{accessLabels(m.access).map((r) => <span key={r} className="rounded-full border border-silver/45 px-3.5 py-1.5 font-mono text-[0.78rem] uppercase tracking-[0.14em]">{r}</span>)}</p>
        <p className="mt-3 max-w-[38ch] text-[0.88rem] leading-snug text-dim">Les rôles d&apos;accès décident des droits dans l&apos;application ; la fonction décrit seulement le métier.</p>
      </StaffSection>
      <StaffSection title="Coordonnées">
        {m.contact.allowed && m.contact.email ? <p className="text-[1rem]">{m.contact.email} <span className="ml-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-dim">fictif</span></p> : <p className="text-[1rem] font-light text-cloud/80">Coordonnées non partagées.</p>}
      </StaffSection>
      <DemoLine />
    </>
  );
}
