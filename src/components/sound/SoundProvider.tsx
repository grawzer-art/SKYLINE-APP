"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { COMPACT_HEIGHT, embedLoadOptions, embedSrc, type EmbedKind } from "@/domain/sound";
import { announceAudio, onOtherAudio } from "@/lib/audioBus";

/* ---------- API officielle du widget SoundCloud ---------- */
type SCSound = { title?: string; user?: { username?: string }; permalink_url?: string } | null;
type SCWidget = {
  bind: (e: string, cb: () => void) => void; unbind: (e: string) => void;
  load: (url: string, options?: Record<string, unknown>) => void;
  play: () => void; pause: () => void; next: () => void; prev: () => void;
  getSounds: (cb: (s: unknown[]) => void) => void; getCurrentSound: (cb: (s: SCSound) => void) => void; getCurrentSoundIndex: (cb: (i: number) => void) => void;
};
type SCEvents = Record<"READY" | "PLAY" | "PAUSE" | "FINISH" | "ERROR", string>;
type SCApi = { Widget: ((el: HTMLIFrameElement) => SCWidget) & { Events: SCEvents } };
declare global { interface Window { SC?: SCApi } }

let apiPromise: Promise<SCApi> | null = null;
const loadApi = () => (apiPromise ??= new Promise<SCApi>((resolve, reject) => {
  if (window.SC?.Widget) return resolve(window.SC);
  const s = document.createElement("script"); s.src = "https://w.soundcloud.com/player/api.js"; s.async = true;
  s.onload = () => (window.SC?.Widget ? resolve(window.SC) : reject(new Error("api")));
  s.onerror = () => { apiPromise = null; s.remove(); reject(new Error("api")); };
  document.head.appendChild(s);
}));

/* ---------- Contexte ---------- */
export type SoundStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "finished" | "error";
export type SoundCollectionRef = { id: string; title: string; url: string; kind: EmbedKind };
export type SoundTrack = { title: string; artist: string; href: string } | null;
type Ctx = {
  collection: SoundCollectionRef | null; status: SoundStatus; tracks: number | null; index: number; track: SoundTrack; started: boolean;
  usable: boolean; multi: boolean;
  select: (c: SoundCollectionRef) => void; play: () => void; pause: () => void; next: () => void; prev: () => void; stop: () => void;
  attachSlot: (el: HTMLElement | null) => void;
};
const SoundCtx = createContext<Ctx | null>(null);
export const useSound = () => { const c = useContext(SoundCtx); if (!c) throw new Error("useSound hors SoundProvider"); return c; };

const SOUND_PATH = "/v3/explore/sound";
const HIDE_MINI = ["/v3/explore/sound", "/v3/club/messages/", "/v3/wireframes", "/v3/screens", "/signal/"];

/**
 * Gestionnaire SoundCloud GLOBAL (monté dans le layout racine, donc commun à `/` et `/v3/**`).
 * UNE seule iframe officielle, créée à la première sélection et JAMAIS recréée ni déplacée dans le DOM :
 *  - sur SKYLINE SOUND, elle est positionnée exactement sur l'emplacement du lecteur (aucun recadrage) ;
 *  - ailleurs, elle reste montée hors de l'écran (la lecture continue) et le mini-lecteur SKYLINE pilote le widget via l'API officielle.
 * Changer de playlist = `widget.load()` sur le même widget.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [boot, setBoot] = useState<string | null>(null); // URL de la première iframe
  const [collection, setCollection] = useState<SoundCollectionRef | null>(null);
  const [status, setStatus] = useState<SoundStatus>("idle");
  const [tracks, setTracks] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [track, setTrack] = useState<SoundTrack>(null);
  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<SCWidget | null>(null);
  const events = useRef<SCEvents | null>(null);
  const wantUrl = useRef<string | null>(null);   // dernière URL demandée
  const loadedUrl = useRef<string | null>(null); // URL actuellement chargée dans le widget
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const armTimeout = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus((s) => (s === "loading" ? "error" : s)), 15000);
  }, []);

  const sync = useCallback(() => {
    const w = widget.current; if (!w) return;
    w.getCurrentSoundIndex((i) => { if (Number.isFinite(i)) setIndex(i); });
    w.getCurrentSound((s) => setTrack(s ? { title: s.title ?? "", artist: s.user?.username ?? "", href: s.permalink_url ?? "" } : null));
  }, []);

  const bindAll = useCallback((w: SCWidget) => {
    const E = events.current; if (!E) return;
    const on = (e: string, cb: () => void) => { try { w.unbind(e); } catch { /* rien à retirer */ } w.bind(e, cb); };
    on(E.READY, () => {
      if (timer.current) clearTimeout(timer.current);
      setStatus((s) => (s === "loading" || s === "error" || s === "idle" ? "ready" : s));
      w.getSounds((list) => setTracks(Array.isArray(list) ? list.length : 0)); sync();
    });
    on(E.PLAY, () => { setStatus("playing"); setStarted(true); setDismissed(false); announceAudio("soundcloud"); sync(); });
    on(E.PAUSE, () => setStatus("paused"));
    on(E.FINISH, () => setStatus("finished"));
    on(E.ERROR, () => setStatus("error"));
  }, [sync]);

  const loadIntoWidget = useCallback((url: string) => {
    const w = widget.current; if (!w) return; // pas encore prêt : appliqué après la liaison de l'API
    loadedUrl.current = url;
    w.load(url, { ...embedLoadOptions(), callback: () => bindAll(w) });
    bindAll(w); armTimeout();
  }, [bindAll, armTimeout]);

  // Liaison de l'API officielle à l'unique iframe, dès qu'elle existe.
  useEffect(() => {
    if (!boot) return;
    let cancelled = false; armTimeout();
    loadApi().then((sc) => {
      if (cancelled || !frame.current) return;
      events.current = sc.Widget.Events; widget.current = sc.Widget(frame.current); loadedUrl.current = boot; bindAll(widget.current);
      if (wantUrl.current && wantUrl.current !== boot) loadIntoWidget(wantUrl.current);
    }).catch(() => { if (timer.current) clearTimeout(timer.current); if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [boot, armTimeout, bindAll, loadIntoWidget]);

  // Un seul son à la fois.
  useEffect(() => onOtherAudio("soundcloud", () => widget.current?.pause()), []);

  // Position de l'iframe : sur l'emplacement du lecteur (page SKYLINE SOUND) ou hors écran (lecture continue ailleurs).
  useEffect(() => {
    const h = host.current; if (!h) return;
    if (!slot) { h.dataset.mode = "off"; h.inert = true; Object.assign(h.style, { top: "0px", left: "-200vw", width: "320px", height: `${COMPACT_HEIGHT}px` }); return; }
    h.dataset.mode = "slot"; h.inert = false;
    let raf = 0; let last = "";
    const place = () => {
      const r = slot.getBoundingClientRect(); const top = r.top + window.scrollY; const left = r.left + window.scrollX;
      const key = `${Math.round(top)}|${Math.round(left)}|${Math.round(r.width)}`;
      if (key !== last) { last = key; Object.assign(h.style, { top: `${top}px`, left: `${left}px`, width: `${r.width}px`, height: `${COMPACT_HEIGHT}px` }); }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [slot, boot]);

  const select = useCallback((c: SoundCollectionRef) => {
    setCollection(c); setDismissed(false);
    if (wantUrl.current === c.url && widget.current) { setStatus((s) => (s === "error" ? "loading" : s)); if (loadedUrl.current !== c.url || true) { /* même playlist : rien à recharger */ } return; }
    wantUrl.current = c.url;
    setStatus("loading"); setTracks(null); setIndex(0); setTrack(null); setStarted(false);
    if (!boot) setBoot(c.url); else loadIntoWidget(c.url);
  }, [boot, loadIntoWidget]);

  const play = useCallback(() => widget.current?.play(), []);
  const pause = useCallback(() => widget.current?.pause(), []);
  const next = useCallback(() => widget.current?.next(), []);
  const prev = useCallback(() => widget.current?.prev(), []);
  const stop = useCallback(() => { widget.current?.pause(); setDismissed(true); }, []);
  const attachSlot = useCallback((el: HTMLElement | null) => setSlot(el), []);

  const usable = (status === "ready" || status === "playing" || status === "paused" || status === "finished") && (tracks ?? 0) > 0;
  const multi = usable && (tracks ?? 0) > 1;
  const value = useMemo<Ctx>(() => ({ collection, status, tracks, index, track, started, usable, multi, select, play, pause, next, prev, stop, attachSlot }),
    [collection, status, tracks, index, track, started, usable, multi, select, play, pause, next, prev, stop, attachSlot]);

  const showMini = !!collection && started && !dismissed && status !== "error" && !HIDE_MINI.some((p) => pathname.startsWith(p));
  const playing = status === "playing";
  const round = "grid shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-35 disabled:active:scale-100";

  return (
    <SoundCtx.Provider value={value}>
      {boot && (
        <div ref={host} data-testid="sound-host" className="absolute z-30" style={{ top: 0, left: "-200vw", width: 320, height: COMPACT_HEIGHT }}>
          <iframe ref={frame} title={`Lecteur SoundCloud — ${collection?.title ?? "SKYLINE SOUND"}`} src={embedSrc(boot)} width="100%" height={COMPACT_HEIGHT} allow="encrypted-media" className="block h-full w-full border-0" />
          {status === "loading" && <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center bg-surface-1 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/70 motion-safe:animate-pulse">Chargement…</div>}
          {status === "error" && collection && (
            <div role="alert" className="absolute inset-0 flex flex-col items-start justify-center gap-3 bg-surface-1 p-2">
              <p className="font-display text-[1.05rem]">Le lecteur n&apos;a pas pu se charger.</p>
              <p className="text-[0.9rem] leading-snug text-cloud/75">Vérifiez votre connexion. Certaines playlists ne sont lisibles que sur SoundCloud.</p>
              <a href={collection.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cloud px-5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-jet">Écouter sur SoundCloud <ExternalLink size={14} strokeWidth={1.75} aria-hidden /></a>
            </div>
          )}
        </div>
      )}
      {children}
      {showMini && (
        <div role="region" aria-label="Mini-lecteur SKYLINE SOUND" className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-bottom))] z-40 mx-auto w-full max-w-[480px] border-t border-cloud/15 bg-jet/90 px-3 py-2 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <Link href={SOUND_PATH} aria-label="Ouvrir SKYLINE SOUND" className="flex min-h-11 min-w-0 flex-1 flex-col justify-center pl-2">
              <span className="truncate text-[0.92rem] leading-tight">{track?.title || collection.title}</span>
              <span className="truncate font-mono text-[0.72rem] uppercase tracking-[0.1em] text-cloud/70">{["SoundCloud", track?.artist].filter(Boolean).join(" · ")}</span>
            </Link>
            <button type="button" onClick={prev} disabled={!multi} aria-label="Titre précédent" className={`${round} size-11 bg-cloud text-jet`}><SkipBack size={17} strokeWidth={1.75} aria-hidden fill="currentColor" /></button>
            <button type="button" onClick={playing ? pause : play} disabled={!usable} aria-label={playing ? "Pause" : "Lecture"} className={`${round} size-12 bg-[#8FB8FF] text-jet`}>
              {playing ? <Pause size={20} strokeWidth={1.75} aria-hidden fill="currentColor" /> : <Play size={20} strokeWidth={1.75} aria-hidden fill="currentColor" className="translate-x-px" />}
            </button>
            <button type="button" onClick={next} disabled={!multi} aria-label="Titre suivant" className={`${round} size-11 bg-cloud text-jet`}><SkipForward size={17} strokeWidth={1.75} aria-hidden fill="currentColor" /></button>
            <button type="button" onClick={stop} aria-label="Fermer le mini-lecteur" className="grid size-11 shrink-0 place-items-center text-silver"><X size={18} strokeWidth={1.5} aria-hidden /></button>
          </div>
        </div>
      )}
    </SoundCtx.Provider>
  );
}
