"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Backdrop } from "./visual";
import { DemoTag } from "./ui";
import { SoundCloudEmbed } from "./SoundCloudEmbed";
import { usePlayer } from "./PlayerProvider";
import { Photo } from "@/components/ui/Photo";
import { images } from "@/data/demo";
import { soundCollections } from "@/data/sound";
import { visuals } from "@/data/visuals";
import { parseSoundCloudUrl } from "@/domain/sound";
import { ease } from "@/design/motion";
import { cn } from "@/lib/cn";

const TEST = "test";

/** SKYLINE SOUND : quatre collections, un lecteur SoundCloud officiel affiché dans l'app à la sélection. */
export function V3Sound() {
  const reduce = useReducedMotion();
  const player = usePlayer();
  const [picked, setPicked] = useState<string | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);

  const anyUrl = soundCollections.some((c) => parseSoundCloudUrl(c.soundcloudUrl).ok);
  const col = soundCollections.find((c) => c.id === picked) ?? null;
  const source = picked === TEST ? testUrl : col?.soundcloudUrl ?? null;
  const parsed = parseSoundCloudUrl(source);
  const title = picked === TEST ? "URL de test" : col?.title ?? "";
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease, delay: d } } as const);

  const loadTest = (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseSoundCloudUrl(testInput);
    if (!r.ok) { setTestErr(r.reason === "host" ? "Seules les adresses soundcloud.com sont acceptées." : r.reason === "empty" ? "Collez une adresse SoundCloud." : "Adresse invalide : elle doit commencer par https://."); return; }
    setTestErr(null); setTestUrl(r.url); setPicked(TEST);
  };

  return (
    <>
      <section aria-labelledby="sound-title" className="relative isolate px-5 pt-[calc(var(--safe-top)+5.25rem)]">
        <Backdrop src={images.before} position="30% 62%" className="!bottom-auto !h-[20rem]" />
        <Link href="/v3/explore" className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/80"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden /> Explore</Link>
        <motion.p {...rise(0.05)} className="font-mono text-[0.75rem] uppercase tracking-[0.24em] text-sunset">Skyline Culture</motion.p>
        <motion.h1 id="sound-title" {...rise(0.12)} className="font-display mt-2 text-[clamp(2rem,10.5vw,3rem)] leading-[0.92]">Skyline Sound</motion.h1>
        <motion.p {...rise(0.2)} className="mt-3 max-w-[30ch] text-[1.02rem] leading-snug text-cloud/85">Quatre ambiances pour accompagner le voyage.</motion.p>
      </section>

      <section aria-labelledby="col-title" className="px-5 pt-8">
        <h2 id="col-title" className="sr-only">Collections</h2>
        <ul className="grid grid-cols-2 gap-3">
          {soundCollections.map((c) => {
            const has = parseSoundCloudUrl(c.soundcloudUrl).ok; const on = picked === c.id;
            return (
              <li key={c.id}>
                <button type="button" aria-pressed={on} onClick={() => setPicked(c.id)}
                  className={cn("group relative isolate block aspect-square w-full overflow-hidden rounded-[10px] border text-left transition active:scale-[0.98]", on ? "border-sky ring-1 ring-sky" : "border-cloud/15")}>
                  <Photo src={visuals[c.cover]} objectPosition={c.coverPosition} sizes="(max-width: 480px) 45vw, 220px" imgClassName="transition duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/45 to-jet/5" />
                  {!has && <span className="absolute right-2.5 top-2.5 rounded-full border border-cloud/30 bg-jet/55 px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-cloud/85 backdrop-blur">Bientôt</span>}
                  <span className="absolute inset-x-3 bottom-3 block">
                    <span className="font-display block text-[1.05rem] leading-[1.02]">{c.title}</span>
                    <span className="mt-1.5 block text-[0.8rem] leading-tight text-cloud/80">{c.genre}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-live="polite" aria-label="Lecteur" className="px-5 pt-7">
        {!picked ? (
          <p role="status" className="border-l border-sky pl-4 text-[1rem] font-light leading-snug text-cloud/85">{anyUrl ? "Choisissez une collection pour lancer le lecteur." : "Les playlists SKYLINE SOUND apparaîtront ici dès leur publication."}</p>
        ) : (
          <div key={picked}>
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-sky">{col?.genre ?? "Prototype"}</p>
            <h2 className="font-display mt-1.5 text-[1.5rem] leading-none">{title}</h2>
            {col && <p className="mt-2 text-[0.95rem] text-cloud/80">{col.tagline}</p>}
            <div className="mt-4">
              {parsed.ok ? (
                <SoundCloudEmbed key={parsed.url} url={parsed.url} kind={parsed.kind} title={title} onPlay={player.close} />
              ) : (
                <div role="status" className="rounded-[10px] border border-dashed border-cloud/25 px-5 py-8">
                  <p className="font-display text-[1.1rem]">Cette collection arrive bientôt.</p>
                  <p className="mt-2 max-w-[32ch] text-[0.92rem] leading-snug text-dim">La playlist officielle sera ajoutée ici dès sa publication sur SoundCloud.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="px-5 pt-9" aria-labelledby="test-title">
        <details className="rounded-[10px] border border-line bg-surface-1 px-4" open={!!testErr}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-[0.95rem]"><span id="test-title">Tester une URL SoundCloud</span><DemoTag>Prototype</DemoTag></summary>
          <form onSubmit={loadTest} className="pb-4">
            <label htmlFor="sc-url" className="text-[0.85rem] text-dim">Collez l&apos;adresse d&apos;un titre ou d&apos;une playlist dont l&apos;intégration est autorisée.</label>
            <input id="sc-url" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="https://soundcloud.com/…" aria-invalid={!!testErr} aria-describedby={testErr ? "sc-err" : undefined}
              className="mt-2 min-h-12 w-full rounded-[8px] border border-line bg-jet px-4 text-[1rem] outline-none focus:border-sky" />
            {testErr && <p id="sc-err" role="alert" className="mt-2 text-[0.88rem] text-sunset">{testErr}</p>}
            <button type="submit" className="mt-3 inline-flex min-h-12 items-center rounded-full bg-cloud px-6 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-jet">Charger le lecteur</button>
          </form>
        </details>
      </section>

      <p className="px-5 pb-6 pt-6 text-[0.8rem] leading-relaxed text-dim">Lecteur officiel SoundCloud, lecture sur demande uniquement. La lecture en arrière-plan dépend de votre appareil et n&apos;est pas garantie.</p>
      <p className="font-tagline pb-2 text-center text-[0.7rem] text-silver/70">The journey never ends.</p>
    </>
  );
}
