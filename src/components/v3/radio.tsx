"use client";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { usePlayer } from "./PlayerProvider";
import { useCommunity } from "@/lib/useCommunity";
import { cn } from "@/lib/cn";

/** Libellés d'emplacement (aucun titre, artiste ou mix réel : tout est « à confirmer » jusqu'à réception de contenus autorisés). */
export function useRadioLabels() {
  const { t } = useCommunity();
  const idx = (id: string) => id.replace(/\D/g, "");
  return {
    selection: (id: string) => `${t("radio.sel.placeholder")} · ${idx(id)}`,
    dj: (id: string) => `${t("radio.dj.placeholder")} · ${idx(id)}`,
    mix: (id: string) => `${t("radio.mix.placeholder")} · ${idx(id)}`,
    track: (n: number) => `${t("radio.track.placeholder")} · ${n}`,
  };
}

export function Cover({ slot, className }: { slot: string; className?: string }) {
  return <span aria-hidden className={cn("grid shrink-0 place-items-center border border-dashed border-cloud/20 p-1 text-center font-mono text-[0.44rem] uppercase leading-tight tracking-[0.1em] text-cloud/40", className)}>{slot}</span>;
}

/** Bouton lecture/pause lié au lecteur global. */
export function PlayButton({ item, big }: { item: { id: string; title: string; by: string; href?: string }; big?: boolean }) {
  const { t } = useCommunity();
  const p = usePlayer();
  const active = p.current?.id === item.id;
  const playing = active && p.playing;
  return (
    <button type="button" onClick={() => (active ? p.toggle() : p.play(item))} aria-label={`${playing ? t("radio.pause") : t("radio.play")} : ${item.title}`} aria-pressed={playing}
      className={cn("grid shrink-0 place-items-center rounded-full border transition active:scale-95", big ? "size-14 bg-cloud text-jet" : "size-11", !big && (active ? "border-sky text-sky" : "border-cloud/30"))}>
      {playing ? <Pause size={big ? 22 : 16} strokeWidth={1.75} aria-hidden /> : <Play size={big ? 22 : 16} strokeWidth={1.75} aria-hidden className="translate-x-px" />}
    </button>
  );
}

export function RadioRow({ id, title, by, slot, href }: { id: string; title: string; by: string; slot: string; href?: string }) {
  return (
    <li className="py-3">
      <div className="flex items-center gap-4">
        <Cover slot={slot} className="size-14" />
        <span className="min-w-0 flex-1">
          {href ? <Link href={href} className="block truncate text-[0.95rem]">{title}</Link> : <span className="block truncate text-[0.95rem]">{title}</span>}
          <span className="block truncate font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{by}</span>
        </span>
        <PlayButton item={{ id, title, by, href }} />
      </div>
    </li>
  );
}
