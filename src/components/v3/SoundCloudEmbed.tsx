"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { embedHeight, embedSrc, type EmbedKind } from "@/domain/sound";

type SCWidget = { bind: (e: string, cb: () => void) => void; unbind: (e: string) => void };
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
  const [status, setStatus] = useState<Status>("loading");
  const onPlayRef = useRef(onPlay); useEffect(() => { onPlayRef.current = onPlay; });

  useEffect(() => {
    let cancelled = false; let widget: SCWidget | null = null; let events: SCApi["Widget"]["Events"] | null = null;
    const timer = setTimeout(() => { if (!cancelled) setStatus((s) => (s === "loading" ? "error" : s)); }, 15000);
    loadApi().then((sc) => {
      if (cancelled || !frame.current) return;
      widget = sc.Widget(frame.current); events = sc.Widget.Events;
      widget.bind(events.READY, () => { clearTimeout(timer); if (!cancelled) setStatus((s) => (s === "loading" || s === "error" ? "ready" : s)); });
      widget.bind(events.PLAY, () => { if (!cancelled) { setStatus("playing"); onPlayRef.current?.(); } });
      widget.bind(events.PAUSE, () => { if (!cancelled) setStatus("paused"); });
      widget.bind(events.FINISH, () => { if (!cancelled) setStatus("finished"); });
      widget.bind(events.ERROR, () => { if (!cancelled) setStatus("error"); });
    }).catch(() => { clearTimeout(timer); if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; clearTimeout(timer); if (widget && events) for (const e of Object.values(events)) try { widget.unbind(e); } catch { /* iframe déjà détachée */ } };
  }, [url]);

  const h = embedHeight(kind);
  return (
    <div>
      <div className="relative overflow-hidden rounded-[10px] border border-cloud/15 bg-surface-1" style={{ minHeight: h }}>
        <iframe ref={frame} title={`Lecteur SoundCloud — ${title}`} src={embedSrc(url)} width="100%" height={h} loading="lazy" allow="encrypted-media" className="block w-full border-0" />
        {status === "loading" && <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center bg-surface-1/80 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/70 motion-safe:animate-pulse">Chargement…</div>}
        {status === "error" && (
          <div role="alert" className="absolute inset-0 flex flex-col items-start justify-center gap-3 bg-surface-1 p-5">
            <p className="font-display text-[1.05rem]">Le lecteur n&apos;a pas pu se charger.</p>
            <p className="text-[0.9rem] leading-snug text-cloud/75">Vérifiez votre connexion. Certaines playlists ne sont lisibles que sur SoundCloud.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cloud px-5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-jet">Écouter sur SoundCloud <ExternalLink size={14} strokeWidth={1.75} aria-hidden /></a>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-cloud/80"><span aria-hidden className={`size-1.5 rounded-full ${status === "playing" ? "bg-sky" : status === "error" ? "bg-sunset" : "bg-cloud/35"}`} />{label[status]}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-sky">SoundCloud <ExternalLink size={13} strokeWidth={1.5} aria-hidden /></a>
      </div>
    </div>
  );
}
