"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Pause, Play, X } from "lucide-react";
import { useCommunity } from "@/lib/useCommunity";
import { testToneUrl } from "@/lib/testTone";
import { announceAudio, onOtherAudio } from "@/lib/audioBus";

export type PlayerItem = { id: string; title: string; by: string; href?: string };
type Ctx = {
  current: PlayerItem | null; playing: boolean; time: number; duration: number; unavailable: boolean;
  play: (item: PlayerItem) => void; toggle: () => void; seek: (t: number) => void; close: () => void;
};
const PlayerCtx = createContext<Ctx | null>(null);
export const usePlayer = () => { const c = useContext(PlayerCtx); if (!c) throw new Error("usePlayer hors PlayerProvider"); return c; };

const fmt = (t: number) => (Number.isFinite(t) && t >= 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

/**
 * Un seul lecteur pour tout SKYLINE RADIO : lecture UNIQUEMENT sur geste de l'utilisateur (jamais d'autoplay),
 * persistant pendant la navigation, « indisponible » sans source autorisée.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { state, t } = useCommunity();
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<PlayerItem | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const pathname = usePathname();
  const hasSource = state.sim.tone; // aucune autre source autorisée n'existe pour l'instant
  const unavailable = !hasSource || failed;

  useEffect(() => { const a = audio.current; return () => a?.pause(); }, []);
  // Un seul son à la fois : si SKYLINE SOUND (SoundCloud) démarre, ce lecteur de démonstration s'arrête.
  useEffect(() => onOtherAudio("legacy", () => { audio.current?.pause(); }), []);

  const play = useCallback((item: PlayerItem) => {
    setCurrent(item); setFailed(false); setTime(0);
    const a = audio.current; if (!a) return;
    if (!hasSource) { a.pause(); a.removeAttribute("src"); a.load(); setPlaying(false); return; }
    a.src = testToneUrl(); a.currentTime = 0;
    a.play().catch(() => setFailed(true)); // déclenché par un clic : autorisé par le navigateur
  }, [hasSource]);
  const toggle = useCallback(() => { const a = audio.current; if (!a || unavailable) return; if (a.paused) a.play().catch(() => setFailed(true)); else a.pause(); }, [unavailable]);
  const seek = useCallback((v: number) => { const a = audio.current; if (a && !unavailable) a.currentTime = v; }, [unavailable]);
  const close = useCallback(() => { const a = audio.current; a?.pause(); a?.removeAttribute("src"); setCurrent(null); setPlaying(false); setTime(0); }, []);

  const value = useMemo<Ctx>(() => ({ current, playing, time, duration, unavailable, play, toggle, seek, close }), [current, playing, time, duration, unavailable, play, toggle, seek, close]);
  const hideBar = pathname.includes("/club/messages/") || pathname.startsWith("/v3/wireframes") || pathname.startsWith("/v3/screens");

  return (
    <PlayerCtx.Provider value={value}>
      <audio ref={audio} preload="none" onPlay={() => { setPlaying(true); announceAudio("legacy"); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onError={() => setFailed(true)} />
      {children}
      {current && !hideBar && (
        <div role="region" aria-label={t("radio.player.label")} className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-bottom))] z-40 mx-auto w-full max-w-[480px] border-t border-cloud/15 bg-jet/95 px-4 py-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggle} disabled={unavailable} aria-label={`${playing ? t("radio.pause") : t("radio.play")} : ${current.title}`}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-cloud text-jet transition active:scale-95 disabled:opacity-40">
              {playing ? <Pause size={18} strokeWidth={1.75} aria-hidden /> : <Play size={18} strokeWidth={1.75} aria-hidden className="translate-x-px" />}
            </button>
            <div className="min-w-0 flex-1">
              {current.href ? <Link href={current.href} className="block truncate text-[0.88rem]">{current.title}</Link> : <p className="truncate text-[0.88rem]">{current.title}</p>}
              {unavailable
                ? <p role="status" className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-cloud/72">{t("radio.unavailable")}</p>
                : <div className="flex items-center gap-2">
                    <label htmlFor="mini-pos" className="sr-only">{t("radio.position")}</label>
                    <input id="mini-pos" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(time, duration || 0)} onChange={(e) => seek(Number(e.target.value))} className="h-5 flex-1 accent-[#8FB8FF]" />
                    <span className="font-mono text-[0.7rem] tabular-nums text-cloud/75">{fmt(time)}/{duration ? fmt(duration) : "—"}</span>
                  </div>}
            </div>
            <button type="button" onClick={close} aria-label={t("radio.player.close")} className="grid size-11 shrink-0 place-items-center text-silver"><X size={18} strokeWidth={1.5} aria-hidden /></button>
          </div>
        </div>
      )}
    </PlayerCtx.Provider>
  );
}
