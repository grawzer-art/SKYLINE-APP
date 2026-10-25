"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PLACEHOLDER_PHOTOS, experience } from "@/data/demo";
import { Photo } from "@/components/ui/Photo";
import { ExperienceSheet } from "./ExperienceSheet";

/** Un seul contenu prioritaire, en composition asymétrique : image décalée, texte qui la chevauche. */
export function PriorityFeature() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="priority-title" className="px-5 pb-6 pt-16">
      <p className="mb-5 flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-cloud/60">
        <span>01</span><span aria-hidden className="h-px flex-1 bg-cloud/15" /><span>À la une</span>
      </p>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="group block w-full text-left">
        <span className="relative ml-[12%] block aspect-[4/5] overflow-hidden rounded-[4px]">
          <Photo src={experience.image} provisional={PLACEHOLDER_PHOTOS} alt="" sizes="(max-width: 480px) 80vw, 400px" imgClassName="transition duration-1000 group-hover:scale-[1.04] motion-reduce:transition-none" />
        </span>
        <span className="relative -mt-16 mr-[10%] block bg-jet px-5 pb-1 pt-5">
          <span className="block font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sky">{experience.eyebrow}</span>
          <span id="priority-title" className="font-display mt-2.5 block text-[1.55rem]">{experience.title}</span>
          <span className="mt-3 block max-w-[30ch] text-[0.9rem] leading-snug text-cloud/70">{experience.teaser}</span>
          <span className="mt-4 inline-flex min-h-11 items-center gap-2 border-b border-sky/70 pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky">
            {experience.cta} <ArrowRight size={15} strokeWidth={1.5} aria-hidden />
          </span>
        </span>
      </button>
      <ExperienceSheet open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
