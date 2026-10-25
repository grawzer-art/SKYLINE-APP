"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { news, newsFilters, type NewsCategory, type NewsItem } from "@/data/demo";
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
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition active:scale-95",
              filter === f.id ? "border-cloud bg-cloud text-jet" : "border-line bg-cloud/5 text-cloud hover:bg-cloud/10")}>
            {f.label}
            <span className={cn("font-mono text-[0.68rem]", filter === f.id ? "text-jet/60" : "text-dim")}>{count(f.id)}</span>
          </button>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">{items.length} actualité{items.length > 1 ? "s" : ""} affichée{items.length > 1 ? "s" : ""}</p>

      <ul className="mt-5 space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((n) => (
            <motion.li key={n.id} layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }} transition={transitions.quick}>
              <button type="button" onClick={() => setSelected(n)} aria-haspopup="dialog"
                className="group flex w-full items-stretch gap-4 rounded-2xl border border-line bg-surface-1 p-3 text-left transition hover:bg-surface-2 active:scale-[0.99]">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl">
                  <Photo src={n.image} sizes="96px" imgClassName="transition duration-700 group-hover:scale-105" />
                </div>
                <div className="flex min-w-0 flex-col justify-center py-1">
                  <p className="flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.2em]">
                    <span className={n.category === "artists" ? "text-sunset" : "text-sky"}>{n.tag}</span>
                    <span className="text-dim">· {n.date}</span>
                  </p>
                  <h3 className="mt-1.5 text-[1.02rem] font-medium leading-snug">{n.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-dim">{n.excerpt}</p>
                </div>
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
