"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import { ScreenTitle, Block, DemoTag } from "./ui";
import { AudioPlayer } from "@/components/signal/AudioPlayer";
import { radio } from "@/data/v3";
import { cn } from "@/lib/cn";

/** Ligne écoutable : le lecteur est le même composant que SKYLINE SIGNAL (lecture volontaire, jamais d'autoplay). */
function Track({ id, title, by, slot, open, onOpen }: { id: string; title: string; by: string; slot: string; open: boolean; onOpen: (id: string) => void }) {
  return (
    <li className="py-3">
      <div className="flex items-center gap-4">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center border border-dashed border-cloud/20 p-1 text-center font-mono text-[0.44rem] uppercase leading-tight tracking-[0.1em] text-cloud/40">{slot}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[0.95rem]">{title}</span><span className="block font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim">{by}</span></span>
        <button type="button" onClick={() => onOpen(id)} aria-expanded={open} aria-label={`${open ? "Masquer le lecteur" : "Ouvrir le lecteur"} : ${title}`}
          className={cn("grid size-11 shrink-0 place-items-center rounded-full border transition active:scale-95", open ? "border-sky text-sky" : "border-cloud/30")}>
          <Play size={16} strokeWidth={1.75} aria-hidden className="translate-x-px" />
        </button>
      </div>
      {open && <AudioPlayer title={title} className="mt-3" />}
    </li>
  );
}

export function V3Radio() {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));
  return (
    <>
      <ScreenTitle eyebrow="Explore" title="Skyline Radio" back={{ href: "/v3/explore", label: "Explore" }}>
        <p className="mt-3 flex items-center gap-2 text-[0.85rem] text-cloud/70">Sélections officielles, DJ et mixes. Lecture toujours volontaire. <DemoTag /></p>
      </ScreenTitle>
      <Block label="Sélections officielles"><ul className="divide-y divide-line border-y border-line">{radio.selections.map((t) => <Track key={t.id} {...t} open={open === t.id} onOpen={toggle} />)}</ul></Block>
      <Block label="DJ">
        <ul className="grid grid-cols-2 gap-3">
          {radio.djs.map((d) => (
            <li key={d.id}><div aria-hidden className="grid aspect-[4/5] place-items-center border border-dashed border-cloud/20 p-3 text-center font-mono text-[0.5rem] uppercase leading-relaxed tracking-[0.14em] text-cloud/40">Photo à fournir<br />{d.slot}</div><p className="mt-2 text-[0.9rem]">{d.name}</p><p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{d.note}</p></li>
          ))}
        </ul>
      </Block>
      <Block label="Mixes exclusifs"><ul className="divide-y divide-line border-y border-line">{radio.mixes.map((t) => <Track key={t.id} id={t.id} title={t.title} by={t.by} slot={t.slot} open={open === t.id} onOpen={toggle} />)}</ul></Block>
      <p className="px-5 pb-8 pt-4 text-[0.72rem] text-dim">Aucun média n&apos;est diffusé sans autorisation de diffusion. Les lecteurs affichent « indisponible » tant qu&apos;aucune source autorisée n&apos;est fournie.</p>
    </>
  );
}
