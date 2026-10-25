"use client";
import Link from "next/link";
import { crew } from "@/data/demo";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";

export function CrewPreview() {
  const shown = crew.members.slice(0, 4);
  return (
    <Section id="crew" eyebrow="My Crew" title={crew.name}>
      <div className="rounded-[24px] border border-line bg-surface-1 p-5">
        <div className="flex items-center justify-between">
          <Link href="/crew" aria-label={`Voir les ${crew.members.length} membres du crew`} className="flex items-center rounded-full">
            <span className="flex -space-x-3">
              {shown.map((m) => <Avatar key={m.id} name={m.name} hue={m.hue} size={46} className="ring-2 ring-surface-1" />)}
            </span>
            {crew.members.length > shown.length && (
              <span className="ml-3 font-mono text-sm text-dim">+{crew.members.length - shown.length}</span>
            )}
          </Link>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-dim">{crew.members.length} membres</p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-dim">Ton groupe de voyage fictif. Les messages et invitations arriveront dans une prochaine phase.</p>
        <ButtonLink href="/crew" variant="ghost" className="mt-5 w-full">Voir mon crew <Icon name="arrow" size={16} /></ButtonLink>
      </div>
    </Section>
  );
}
