"use client";
import { experience } from "@/data/demo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";

/** Panneau de présentation du concept (fonction conservée de la V1). */
export function ExperienceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { concept } = experience;
  return (
    <Sheet open={open} onClose={onClose} eyebrow={experience.eyebrow} title="Le concept SKYLINE">
      <p className="leading-relaxed text-cloud/85">{experience.teaser}</p>
      <p className="mt-3 leading-relaxed text-cloud/85">{concept.intro}</p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {concept.pillars.map((p) => (
          <li key={p.id} className="flex gap-4 py-4">
            <span className="mt-0.5 text-sky"><Icon name={p.icon} size={22} /></span>
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-dim">{p.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-dim">{concept.footnote}</p>
      <Button variant="ghost" onClick={onClose} className="mt-5 w-full">Fermer</Button>
    </Sheet>
  );
}
