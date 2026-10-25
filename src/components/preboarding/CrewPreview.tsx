"use client";
import Link from "next/link";
import { crew } from "@/data/demo";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";

export function CrewPreview() {
  const shown = crew.members.slice(0, 4);
  return (
    <Section id="crew" eyebrow="My Crew" title={crew.name}>
      <Link href="/crew" aria-label={`Voir mon crew : ${crew.members.length} membres`}
        className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-1 p-4 transition active:scale-[0.99]">
        <span className="flex items-center">
          <span className="flex -space-x-2.5">
            {shown.map((m) => <Avatar key={m.id} name={m.name} hue={m.hue} size={40} className="ring-2 ring-surface-1" />)}
          </span>
          {crew.members.length > shown.length && <span className="ml-3 font-mono text-sm text-dim">+{crew.members.length - shown.length}</span>}
        </span>
        <span className="flex items-center gap-2 text-[0.85rem] font-medium text-sky">Voir mon crew <Icon name="arrow" size={16} /></span>
      </Link>
      <p className="mt-3 text-[0.7rem] text-dim">Profils fictifs — aperçu de démonstration.</p>
    </Section>
  );
}
