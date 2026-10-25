"use client";
import { useState } from "react";
import { PLACEHOLDER_PHOTOS, experience } from "@/data/demo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { Sheet } from "@/components/ui/Sheet";

export function ExperienceCard() {
  const [open, setOpen] = useState(false);
  const { concept } = experience;

  return (
    <section id="experience" aria-labelledby="experience-title" className="scroll-mt-20 px-5 pt-5">
      <button
        type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="group relative isolate flex aspect-[16/9] w-full flex-col justify-end overflow-hidden rounded-2xl border border-line p-5 text-left transition active:scale-[0.99]"
      >
        <Photo src={experience.image} provisional={PLACEHOLDER_PHOTOS} alt="" imgClassName="transition duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-jet via-jet/55 via-45% to-jet/5" />
        <p className="relative font-mono text-[0.62rem] uppercase tracking-[0.2em] text-cloud/80">{experience.eyebrow}</p>
        <h2 id="experience-title" className="font-display relative mt-1.5 text-[1.35rem]">{experience.title}</h2>
        <span className="relative mt-3 inline-flex items-center gap-2 text-[0.9rem] font-medium text-sky">
          {experience.cta} <Icon name="arrow" size={16} />
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} eyebrow={experience.eyebrow} title="Le concept SKYLINE">
        <p className="leading-relaxed text-cloud/85">{experience.teaser}</p>
        <p className="mt-3 leading-relaxed text-cloud/85">{concept.intro}</p>
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface-2">
          {concept.pillars.map((p) => (
            <li key={p.id} className="flex gap-4 p-4">
              <span className="mt-0.5 text-sky"><Icon name={p.icon} size={22} /></span>
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-dim">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-dim">{concept.footnote}</p>
        <Button variant="ghost" onClick={() => setOpen(false)} className="mt-5 w-full">Fermer</Button>
      </Sheet>
    </section>
  );
}
