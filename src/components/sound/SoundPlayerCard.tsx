"use client";
import { ExternalLink, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { COMPACT_HEIGHT } from "@/domain/sound";
import { useSound, type SoundStatus } from "./SoundProvider";

const label: Record<SoundStatus, string> = { idle: "", loading: "Chargement du lecteur SoundCloud…", ready: "Lecteur prêt", playing: "Lecture en cours", paused: "En pause", finished: "Terminé", error: "Lecteur indisponible" };
const round = "grid shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-35 disabled:active:scale-100";

/**
 * Carte du lecteur sur SKYLINE SOUND. Elle ne contient PAS l'iframe : elle réserve l'emplacement (`slot`) sur lequel le
 * gestionnaire global place l'unique widget officiel, puis affiche les commandes SKYLINE branchées sur ce même widget.
 */
export function SoundPlayerCard() {
  const { collection: c, status, tracks, index, usable, multi, prev, next, play, pause, attachSlot } = useSound();
  if (!c) return null;
  const playing = status === "playing";
  return (
    <div className="rounded-[12px] border border-line bg-surface-1 p-3">
      <div ref={attachSlot} data-testid="sound-slot" style={{ height: COMPACT_HEIGHT }} />
      <div role="group" aria-label="Commandes de lecture" className="mt-4 flex items-center justify-center gap-5">
        <button type="button" onClick={prev} disabled={!multi} aria-label="Titre précédent" className={`${round} size-12 bg-cloud text-jet`}><SkipBack size={20} strokeWidth={1.75} aria-hidden fill="currentColor" /></button>
        <button type="button" onClick={playing ? pause : play} disabled={!usable} aria-label={playing ? "Pause" : "Lecture"} className={`${round} size-16 bg-[#8FB8FF] text-jet`}>
          {playing ? <Pause size={26} strokeWidth={1.75} aria-hidden fill="currentColor" /> : <Play size={26} strokeWidth={1.75} aria-hidden fill="currentColor" className="translate-x-0.5" />}
        </button>
        <button type="button" onClick={next} disabled={!multi} aria-label="Titre suivant" className={`${round} size-12 bg-cloud text-jet`}><SkipForward size={20} strokeWidth={1.75} aria-hidden fill="currentColor" /></button>
      </div>
      <p className="mt-3 text-center font-mono text-[0.75rem] tabular-nums tracking-[0.14em] text-cloud/70" aria-live="off">{multi ? `${index + 1} / ${tracks}` : " "}</p>
      <div className="mt-1 flex items-center justify-between gap-3 px-1">
        <p role="status" aria-live="polite" className="flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-cloud/80"><span aria-hidden className={`size-1.5 rounded-full ${playing ? "bg-sky" : status === "error" ? "bg-sunset" : "bg-cloud/35"}`} />{label[status]}</p>
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-sky">SoundCloud <ExternalLink size={13} strokeWidth={1.5} aria-hidden /></a>
      </div>
    </div>
  );
}
