"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { experience } from "@/data/demo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { Section } from "@/components/ui/Section";
import { Sheet } from "@/components/ui/Sheet";
import { fadeUp } from "@/design/motion";

export function ExperienceCard() {
  const [open, setOpen] = useState(false);
  const { concept } = experience;

  return (
    <Section id="experience" eyebrow={experience.eyebrow} title="Le concept">
      <motion.article
        variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
        className="relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[28px] border border-line p-6"
      >
        <Photo src={experience.image} alt="Cabine d'avion transformée en club, DJ derrière ses platines (illustration)" />
        <div className="absolute inset-0 bg-gradient-to-t from-jet via-jet/50 via-40% to-transparent" />
        <h3 className="font-display relative text-[2rem]">{experience.title}</h3>
        <p className="relative mt-3 max-w-[30ch] text-[0.98rem] leading-relaxed text-cloud/85">{experience.teaser}</p>
        <Button variant="accent" onClick={() => setOpen(true)} className="relative mt-6 w-fit" aria-haspopup="dialog">
          {experience.cta} <Icon name="arrow" size={16} />
        </Button>
      </motion.article>

      <Sheet open={open} onClose={() => setOpen(false)} eyebrow={experience.eyebrow} title="Le concept SKYLINE">
        <p className="text-[1rem] leading-relaxed text-cloud/85">{concept.intro}</p>
        <ul className="mt-6 space-y-3">
          {concept.pillars.map((p) => (
            <li key={p.id} className="flex gap-4 rounded-2xl border border-line bg-surface-2 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sunset/15 text-sunset"><Icon name={p.icon} size={22} /></span>
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-dim">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-dim">{concept.footnote}</p>
        <Button variant="ghost" onClick={() => setOpen(false)} className="mt-5 w-full">Fermer</Button>
      </Sheet>
    </Section>
  );
}
