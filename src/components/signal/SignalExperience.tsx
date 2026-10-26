"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, X } from "lucide-react";
import { formatSignalDate, signalTypeLabels, type Signal } from "@/data/signal-types";
import { Photo } from "@/components/ui/Photo";
import { Wordmark } from "@/components/ui/Wordmark";
import { AudioPlayer } from "./AudioPlayer";
import { ease } from "@/design/motion";
import { consumeOpen } from "@/lib/signalNav";
import { useHydrated } from "@/lib/useHydrated";
import { useSignals } from "@/lib/useSignals";
import { cn } from "@/lib/cn";

/** Titre : chaque mot monte depuis un masque, en cascade courte. Sans mouvement si réduction demandée. */
function RevealTitle({ text, reduce, id }: { text: string; reduce: boolean | null; id: string }) {
  const words = text.split(" ");
  return (
    <h1 id={id} aria-label={text}
      className="font-display mt-4 text-[clamp(1.75rem,8.4vw,2.5rem)]">
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span className="inline-block" initial={reduce ? false : { y: "108%" }} animate={{ y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.55 + i * 0.07 }}>{w}{i < words.length - 1 ? " " : ""}</motion.span>
        </span>
      ))}
    </h1>
  );
}

function Experience({ signal }: { signal: Signal }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { markSeen } = useSignals();
  const [{ origin, internal }] = useState(consumeOpen); // lecture unique (monté côté client uniquement)
  const [closing, setClosing] = useState(false);
  const titleId = `signal-title-${signal.id}`;
  const tone = signalTypeLabels[signal.type].tone === "sunset" ? "text-sunset" : "text-sky";
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => { markSeen(signal.id); region.current?.focus({ preventScroll: true }); }, [signal.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (closing) return;
    setClosing(true);
    const go = () => (internal ? router.back() : router.push("/explore"));
    window.setTimeout(go, reduce ? 0 : 220);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", on); return () => window.removeEventListener("keydown", on);
  });

  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const left = Math.max(0, (vw - Math.min(480, vw)) / 2);
  const at = origin ? `${Math.round(origin.x - left)}px ${Math.round(origin.y)}px` : "50% 90%";
  const radius = typeof window !== "undefined" ? Math.ceil(Math.hypot(window.innerWidth, window.innerHeight)) : 1800;
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease, delay: 0.5 + d } } as const);

  const meta = signal.type === "artist" ? signal.artistName : signal.type === "location" ? signal.locationName : [signal.mixTitle, signal.djName].filter(Boolean).join(" — ");
  const { label } = signalTypeLabels[signal.type];

  return (
    <motion.div
      ref={region} tabIndex={-1}
      className="fixed inset-0 z-[100] outline-none mx-auto w-full max-w-[480px] overflow-hidden bg-jet"
      initial={reduce ? { opacity: 0 } : { clipPath: `circle(0px at ${at})` }}
      animate={closing ? { opacity: 0, transition: { duration: reduce ? 0 : 0.2 } } : reduce ? { opacity: 1 } : { clipPath: `circle(${radius}px at ${at})` }}
      transition={reduce ? { duration: 0.2 } : { duration: 0.9, ease }}
      role="region" aria-labelledby={titleId}
    >
      {/* Photographie : apparition progressive (fondu + léger zoom arrière) */}
      <motion.div className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, ease, delay: 0.1 }}>
        <Photo src={signal.image.src} alt={signal.image.alt} objectPosition={signal.image.position} slotLabel={signal.image.slot} priority sizes="(max-width: 480px) 100vw, 480px" />
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/80 via-40% to-jet/20" />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-[max(0.75rem,var(--safe-top))]">
        <Wordmark className="opacity-90" />
        <button type="button" onClick={close} aria-label="Fermer la révélation"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-cloud/30 bg-jet/55 pl-4 pr-3.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] backdrop-blur transition active:scale-95">
          Fermer <X size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </header>

      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <article className="flex min-h-full flex-col justify-end px-5 pb-[max(2rem,calc(var(--safe-bottom)+1rem))] pt-[52dvh]">
          <motion.p {...rise(0)} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.62rem] uppercase tracking-[0.2em]", tone)}>
            <span>Skyline Signal · {label}</span>
            {signal.demo && <span className="border border-cloud/30 px-1.5 py-0.5 text-cloud/75">Démo</span>}
          </motion.p>
          <RevealTitle text={signal.title} reduce={reduce} id={titleId} />
          {meta && <motion.p {...rise(0.45)} className="mt-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-cloud">{meta}</motion.p>}
          <motion.p {...rise(0.55)} className="mt-3 text-[1.02rem] font-medium leading-snug text-cloud">{signal.hook}</motion.p>
          <motion.div {...rise(0.65)} className="mt-4 max-w-[40ch] space-y-3 text-[0.92rem] leading-relaxed text-cloud/80">
            {signal.description.map((p, i) => <p key={i}>{p}</p>)}
          </motion.div>

          {signal.media?.kind === "audio" && <motion.div {...rise(0.75)} className="mt-6"><AudioPlayer src={signal.media.src} title={signal.media.title} /></motion.div>}
          {signal.media?.kind === "video" && (
            <motion.div {...rise(0.75)} className="mt-6">
              {signal.media.src
                ? <video controls playsInline preload="none" poster={signal.media.poster} src={signal.media.src} aria-label={signal.media.title} className="aspect-video w-full bg-surface-1" />
                : <div role="status" className="border border-dashed border-cloud/25 px-4 py-3.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-cloud/65">Vidéo indisponible pour le moment</div>}
            </motion.div>
          )}

          {signal.facts && signal.facts.length > 0 && (
            <motion.dl {...rise(0.8)} className="mt-6 divide-y divide-cloud/15 border-y border-cloud/15">
              {signal.facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.14em]"><dt className="text-cloud/60">{f.label}</dt><dd>{f.value}</dd></div>
              ))}
            </motion.dl>
          )}

          {signal.link && (
            <motion.div {...rise(0.85)} className="mt-6">
              {signal.link.href.startsWith("/")
                ? <Link href={signal.link.href} className="inline-flex min-h-11 items-center gap-2 border-b border-sky/70 pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky">{signal.link.label} <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden /></Link>
                : <a href={signal.link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border-b border-sky/70 pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky">{signal.link.label} <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden /><span className="sr-only"> (nouvel onglet)</span></a>}
            </motion.div>
          )}

          <motion.p {...rise(0.9)} className="mt-8 font-mono text-[0.56rem] uppercase tracking-[0.2em] text-cloud/45">{formatSignalDate(signal.publishedAt)} · Reste consultable dans Explore</motion.p>
        </article>
      </div>
    </motion.div>
  );
}

/** Rendu côté client uniquement (origine de la transition et état local), pour éviter tout décalage d'hydratation. */
export function SignalExperience({ signal }: { signal: Signal }) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="fixed inset-0 bg-jet" aria-hidden />;
  return <Experience signal={signal} />;
}
