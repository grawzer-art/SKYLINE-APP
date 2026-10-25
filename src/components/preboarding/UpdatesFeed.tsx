"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { news, newsFilters, type NewsCategory, type NewsItem } from "@/data/demo";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { Section } from "@/components/ui/Section";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { transitions } from "@/design/motion";

type Filter = "all" | NewsCategory;

export function UpdatesFeed() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const reduce = useReducedMotion();
  const items = news.filter((n) => filter === "all" || n.category === filter);
  const count = (f: Filter) => (f === "all" ? news.length : news.filter((n) => n.category === f).length);

  return (
    <Section id="updates" eyebrow="Latest Updates" title="Actualités">
      <div role="group" aria-label="Filtrer les actualités" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {newsFilters.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-[0.82rem] font-medium transition active:scale-95",
              filter === f.id ? "border-sky bg-sky text-jet" : "border-line bg-surface-1 text-cloud")}>
            {f.label}
            <span className={cn("font-mono text-[0.68rem]", filter === f.id ? "text-jet/70" : "text-dim")}>{count(f.id)}</span>
          </button>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">{items.length} actualité{items.length > 1 ? "s" : ""} affichée{items.length > 1 ? "s" : ""}</p>

      <ul className="mt-4 space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((n) => (
            <motion.li key={n.id} layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }} transition={transitions.quick}>
              <button type="button" onClick={() => setSelected(n)} aria-haspopup="dialog"
                className="group relative isolate flex h-[8.5rem] w-full items-end justify-between gap-4 overflow-hidden rounded-2xl border border-line p-4 text-left transition active:scale-[0.99]">
                <Photo src={n.image} sizes="(max-width: 480px) 100vw, 480px" imgClassName="transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-jet via-jet/60 via-50% to-jet/10" />
                <div className="relative min-w-0">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sky">{n.tag} <span className="text-dim">· {n.date}</span></p>
                  <h3 className="font-display mt-1.5 text-[1.02rem] leading-[1.05]">{n.title}</h3>
                  <p className="mt-1 truncate text-[0.8rem] text-cloud/75">{n.excerpt}</p>
                </div>
                <ArrowRight size={18} strokeWidth={1.5} className="relative shrink-0 text-cloud" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {items.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-display text-xl">À venir</p>
          <p className="mt-2 text-sm text-dim">Rien dans cette rubrique pour l&apos;instant. Le programme sera dévoilé progressivement.</p>
          <Button variant="ghost" onClick={() => setFilter("all")} className="mt-5">Tout afficher</Button>
        </div>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} eyebrow={selected ? `${selected.tag} · ${selected.date}` : undefined} title={selected?.title ?? ""}>
        {selected && (
          <>
            {selected.image && (
              <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-2xl"><Photo src={selected.image} /></div>
            )}
            {selected.body.map((p, i) => <p key={i} className="mb-3 leading-relaxed text-cloud/85">{p}</p>)}
            <p className="mt-4 text-xs text-dim">Contenu de démonstration.</p>
          </>
        )}
      </Sheet>
    </Section>
  );
}
