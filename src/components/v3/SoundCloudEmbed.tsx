"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { embedHeight, embedSrc, type EmbedKind } from "@/domain/sound";

type SCWidget = {
  bind: (e: string, cb: () => void) => void; unbind: (e: string) => void;
  play: () => void; pause: () => void; next: () => void; prev: () => void;
  getSounds: (cb: (sounds: unknown[]) => void) => void; getCurrentSoundIndex: (cb: (i: number) => void) => void;
};
type SCApi = { Widget: ((el: HTMLIFrameElement) => SCWidget) & { Events: Record<"READY" | "PLAY" | "PAUSE" | "FINISH" | "ERROR", string> } };
declare global { interface Window { SC?: SCApi } }

const API = "https://w.soundcloud.com/player/api.js";
let apiPromise: Promise<SCApi> | null = null;
/** Charge l'API officielle du widget (une seule fois). Elle sert uniquement à connaître l'état du lecteur : aucun contrôle audio de notre côté. */
const loadApi = () => (apiPromise ??= new Promise<SCApi>((resolve, reject) => {
  if (window.SC?.Widget) return resolve(window.SC);
  const s = document.createElement("script"); s.src = API; s.async = true;
  s.onload = () => (window.SC?.Widget ? resolve(window.SC) : reject(new Error("api")));
  s.onerror = () => { apiPromise = null; s.remove(); reject(new Error("api")); };
  document.head.appendChild(s);
}));

type Status = "loading" | "ready" | "playing" | "paused" | "finished" | "error";
const label: Record<Status, string> = { loading: "Chargement du lecteur SoundCloud…", ready: "Lecteur prêt", playing: "Lecture en cours", paused: "En pause", finished: "Terminé", error: "Lecteur indisponible" };

/**
 * Lecteur SoundCloud OFFICIEL (iframe w.soundcloud.com) : aucun fichier audio téléchargé ni réhébergé,
 * aucun élément du widget masqué ni recouvert une fois prêt. Pas de lecture automatique.
 * À monter avec `key={url}` : un changement d'URL réinitialise l'état.
 */
export function SoundCloudEmbed({ url, kind, title, onPlay }: { url: string; kind: EmbedKind; title: string; onPlay?: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ctl, setCtl] = useState<SCWidget | null>(null); // un seul widget, piloté par les méthodes officielles
  const [status, setStatus] = useState<Status>("loading");
  const [tracks, setTracks] = useState<number | null>(null); // null = pas encore connu
  const [index, setIndex] = useState(0);
  const onPlayRef = useRef(onPlay); useEffect(() => { onPlayRef.current = onPlay; });

  useEffect(() => {
    let cancelled = false; let widget: SCWidget | null = null; let events: SCApi["Widget"]["Events"] | null = null;
    const timer = setTimeout(() => { if (!cancelled) setStatus((s) => (s === "loading" ? "error" : s)); }, 15000);
    loadApi().then((sc) => {
      if (cancelled || !frame.current) return;
      const w = widget = sc.Widget(frame.current); setCtl(w); events = sc.Widget.Events;
      const sync = () => { w.getCurrentSoundIndex((i) => { if (!cancelled && Number.isFinite(i)) setIndex(i); }); };
      w.bind(events.READY, () => {
        clearTimeout(timer); if (cancelled) return;
        setStatus((s) => (s === "loading" || s === "error" ? "ready" : s));
        w.getSounds((list) => { if (!cancelled) setTracks(Array.isArray(list) ? list.length : 0); }); sync();
      });
      w.bind(events.PLAY, () => { if (!cancelled) { setStatus("playing"); onPlayRef.current?.(); sync(); } });
      w.bind(events.PAUSE, () => { if (!cancelled) setStatus("paused"); });
      w.bind(events.FINISH, () => { if (!cancelled) setStatus("finished"); });
      w.bind(events.ERROR, () => { if (!cancelled) setStatus("error"); });
    }).catch(() => { clearTimeout(timer); if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; clearTimeout(timer); if (widget && events) for (const e of Object.values(events)) try { widget.unbind(e); } catch { /* iframe déjà détachée */ } };
  }, [url]);

  const h = embedHeight(kind);
  const usable = (status === "ready" || status === "playing" || status === "paused" || status === "finished") && (tracks ?? 0) > 0;
  const multi = usable && (tracks ?? 0) > 1;
  const playing = status === "playing";
  const round = "grid shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-35 disabled:active:scale-100";
  return (
    <div className="rounded-[12px] border border-line bg-surface-1 p-3">
      <div className="relative" style={{ minHeight: h }}>
        <iframe ref={frame} title={`Lecteur SoundCloud — ${title}`} src={embedSrc(url)} width="100%" height={h} loading="lazy" allow="encrypted-media" className="block w-full border-0" />
        {status === "loading" && <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center bg-surface-1 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/70 motion-safe:animate-pulse">Chargement…</div>}
        {status === "error" && (
          <div role="alert" className="absolute inset-0 flex flex-col items-start justify-center gap-3 bg-surface-1 p-2">
            <p className="font-display text-[1.05rem]">Le lecteur n&apos;a pas pu se charger.</p>
            <p className="text-[0.9rem] leading-snug text-cloud/75">Vérifiez votre connexion. Certaines playlists ne sont lisibles que sur SoundCloud.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cloud px-5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-jet">Écouter sur SoundCloud <ExternalLink size={14} strokeWidth={1.75} aria-hidden /></a>
          </div>
        )}
      </div>
      <div role="group" aria-label="Commandes de lecture" className="mt-4 flex items-center justify-center gap-5">
        <button type="button" onClick={() => ctl?.prev()} disabled={!multi} aria-label="Titre précédent" className={`${round} size-12 bg-cloud text-jet`}><SkipBack size={20} strokeWidth={1.75} aria-hidden fill="currentColor" /></button>
        <button type="button" onClick={() => (playing ? ctl?.pause() : ctl?.play())} disabled={!usable} aria-label={playing ? "Pause" : "Lecture"} className={`${round} size-16 bg-[#8FB8FF] text-jet`}>
          {playing ? <Pause size={26} strokeWidth={1.75} aria-hidden fill="currentColor" /> : <Play size={26} strokeWidth={1.75} aria-hidden fill="currentColor" className="translate-x-0.5" />}
        </button>
        <button type="button" onClick={() => ctl?.next()} disabled={!multi} aria-label="Titre suivant" className={`${round} size-12 bg-cloud text-jet`}><SkipForward size={20} strokeWidth={1.75} aria-hidden fill="currentColor" /></button>
      </div>
      <p className="mt-3 text-center font-mono text-[0.75rem] tabular-nums tracking-[0.14em] text-cloud/70" aria-live="off">{multi ? `${index + 1} / ${tracks}` : "\u00A0"}</p>
      <div className="mt-1 flex items-center justify-between gap-3 px-1">
        <p role="status" aria-live="polite" className="flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-cloud/80"><span aria-hidden className={`size-1.5 rounded-full ${status === "playing" ? "bg-sky" : status === "error" ? "bg-sunset" : "bg-cloud/35"}`} />{label[status]}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-sky">SoundCloud <ExternalLink size={13} strokeWidth={1.5} aria-hidden /></a>
      </div>
    </div>
  );
}
