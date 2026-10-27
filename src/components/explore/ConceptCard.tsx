"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { experience } from "@/data/demo";
import { ExperienceSheet } from "@/components/home/ExperienceSheet";
import { Photo } from "@/components/ui/Photo";

/** Présentation du concept « DJ set dans l'avion » (fonction conservée, inchangée). */
export function ConceptCard() {
  const [concept, setConcept] = useState(false);
  return (
    <div className="px-5 pt-6">
      <button type="button" onClick={() => setConcept(true)} aria-haspopup="dialog"
        className="group relative isolate block aspect-[1/1] w-full overflow-hidden rounded-[10px] text-left">
        <Photo src={experience.image} alt="" objectPosition="50% 40%" imgClassName="transition duration-1000 group-hover:scale-[1.03] motion-reduce:transition-none" />
        <span className="absolute inset-0 bg-gradient-to-t from-jet via-jet/40 via-40% to-transparent" />
        <span className="absolute inset-x-0 bottom-0 block p-5">
          <span className="block font-mono text-[0.72rem] uppercase tracking-[0.22em] text-cloud/80">{experience.eyebrow}</span>
          <span className="font-display mt-2 block text-[1.5rem]">{experience.title}</span>
          <span className="mt-3 inline-flex min-h-11 items-center gap-2 border-b border-sky/70 pb-0.5 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-sky">
            {experience.cta} <ArrowRight size={15} strokeWidth={1.5} aria-hidden />
          </span>
        </span>
      </button>
      <ExperienceSheet open={concept} onClose={() => setConcept(false)} />
    </div>
  );
}
