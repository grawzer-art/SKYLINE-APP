"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";

const fmt = (t: number) => (Number.isFinite(t) && t >= 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

/**
 * Lecteur audio : lecture déclenchée VOLONTAIREMENT (jamais d'autoplay), arrêt à la fermeture de l'écran.
 * Sans source autorisée, ou si le fichier est inaccessible, un état « indisponible » clair remplace le lecteur.
 */
export function AudioPlayer({ src, title, className }: { src?: string; title: string; className?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const id = useId();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => { const a = ref.current; return () => { a?.pause(); }; }, []);

  if (!src || failed) {
    return (
      <div role="status" className={cn("border border-dashed border-cloud/25 px-4 py-3.5 font-mono text-[0.62rem] uppercase leading-relaxed tracking-[0.16em] text-cloud/65", className)}>
        Extrait audio indisponible pour le moment
      </div>
    );
  }

  const toggle = async () => {
    const a = ref.current; if (!a) return;
    if (a.paused) { try { await a.play(); } catch { setFailed(true); } } else a.pause();
  };

  return (
    <div className={cn("flex items-center gap-4 border-y border-cloud/15 py-3", className)}>
      <audio ref={ref} src={src} preload="none"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setFailed(true)} />
      <button type="button" onClick={toggle} aria-label={`${playing ? "Mettre en pause" : "Écouter"} : ${title}`}
        className="grid size-12 shrink-0 place-items-center rounded-full bg-cloud text-jet transition active:scale-95">
        {playing ? <Pause size={20} strokeWidth={1.75} aria-hidden /> : <Play size={20} strokeWidth={1.75} aria-hidden className="translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="sr-only">Position de lecture</label>
        <input id={id} type="range" min={0} max={duration || 0} step={0.1} value={Math.min(time, duration || 0)} disabled={!duration}
          onChange={(e) => { const a = ref.current; if (a) a.currentTime = Number(e.target.value); }}
          className="h-6 w-full cursor-pointer accent-[#8FB8FF] disabled:cursor-default disabled:opacity-50" />
        <p className="mt-0.5 flex justify-between font-mono text-[0.62rem] tabular-nums text-cloud/65"><span>{fmt(time)}</span><span>{duration ? fmt(duration) : "—:——"}</span></p>
      </div>
    </div>
  );
}
