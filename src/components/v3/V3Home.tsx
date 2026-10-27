"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { event, images, user } from "@/data/demo";
import type { Signal } from "@/data/signal-types";
import { SignalCard } from "@/components/signal/SignalCard";
import { Photo } from "@/components/ui/Photo";
import { useCountdown } from "@/lib/useCountdown";
import { useProto } from "@/lib/useProto";
import { DemoTag } from "./ui";
import { cn } from "@/lib/cn";

const pad = (n: number) => String(n).padStart(2, "0");

const cfg = {
  before: { eyebrow: "Pre-boarding / 2027", lines: ["La fête", "commence", "à 10 000", "mètres."], accent: 2, tone: "text-sky", image: images.before, pos: "30% 100%", cta: { label: "My Flight", href: "/v3/flight" } },
  during: { eyebrow: "Ibiza / 2027 — en cours", lines: ["Bienvenue", "à Ibiza."], accent: 1, tone: "text-sunset", image: images.during, pos: "50% 40%", cta: { label: "My Flight", href: "/v3/flight" } },
  after: { eyebrow: "SKYLINE Club", lines: ["The journey", "never ends."], accent: 1, tone: "text-silver", image: images.after, pos: "50% 30%", cta: { label: "Mon Club", href: "/v3/club" } },
} as const;

function Countdown() {
  const s = useCountdown(event.departureISO);
  if (s.status !== "running") return null;
  return (
    <div role="timer" aria-label={`Départ dans ${s.days} jours`}>
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/72">Départ dans</p>
      <p className="mt-1.5 font-mono text-[1.05rem] tabular-nums">{s.days}<span className="ml-0.5 mr-2 text-[0.72rem] text-cloud/68">J</span>{pad(s.hours)}<span className="ml-0.5 mr-2 text-[0.72rem] text-cloud/68">H</span>{pad(s.minutes)}<span className="ml-0.5 text-[0.72rem] text-cloud/68">M</span></p>
    </div>
  );
}

/** SKYLINE NOW : uniquement des informations CONFIRMÉES par l'équipe. Ici, des emplacements. */
function Now() {
  return (
    <section aria-labelledby="now-title" className="px-5 pt-3">
      <div className="rounded-[8px] border border-cloud/15 bg-jet">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 id="now-title" className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-sunset">Skyline Now</h2><DemoTag />
        </div>
        <Link href="/v3/flight#programme" className="group block px-4 pb-4 pt-3">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-cloud/68">Prochaine activité confirmée</p>
          <p className="font-display mt-1.5 text-[1.05rem]">[Titre officiel de l&apos;activité]</p>
          <p className="mt-1 font-mono text-[0.75rem] text-cloud/80">--:-- · [Lieu officiel]</p>
          <span className="mt-3 inline-flex min-h-11 items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud">Voir le programme <ArrowRight size={14} strokeWidth={1.5} aria-hidden className="transition group-hover:translate-x-1" /></span>
        </Link>
        <dl className="divide-y divide-cloud/10 border-t border-cloud/10 text-[0.82rem]">
          <div className="flex justify-between gap-4 px-4 py-2.5"><dt className="text-cloud/68">Transfert</dt><dd className="text-right">[Information officielle]</dd></div>
          <div className="flex justify-between gap-4 px-4 py-2.5"><dt className="text-cloud/68">Annonce de l&apos;équipe</dt><dd className="text-right">[Message officiel]</dd></div>
        </dl>
      </div>
      <p className="mt-2 text-[0.75rem] text-dim">Rien n&apos;est affiché tant que l&apos;équipe ne l&apos;a pas confirmé.</p>
    </section>
  );
}

function Memories() {
  return (
    <div className="px-5 pt-3">
      <Link href="/v3/club/memories" className="group relative isolate flex h-[8.75rem] items-end overflow-hidden rounded-[8px] border border-cloud/15 p-4">
        <Photo src={images.dj} alt="" objectPosition="50% 40%" sizes="(max-width: 480px) 100vw, 480px" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet via-jet/55 to-jet/10" />
        <span className="relative flex w-full items-end justify-between">
          <span><span className="block font-mono text-[0.7rem] uppercase tracking-[0.18em] text-cloud/80">Club · Souvenirs</span><span className="font-display mt-1.5 block text-[1.02rem]">Revivre l&apos;édition</span></span>
          <span className="flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.18em]">Ouvrir <ArrowRight size={15} strokeWidth={1.5} aria-hidden /></span>
        </span>
      </Link>
    </div>
  );
}

export function V3Home({ signal }: { signal?: Signal }) {
  const { state } = useProto();
  const c = cfg[state.phase];
  return (
    <>
      <section aria-labelledby="v3-home-title" className={cn("relative isolate flex flex-col justify-between overflow-hidden pb-5 pt-[calc(var(--safe-top)+5.25rem)]",
        state.phase === "during" ? "min-h-[calc(100svh-var(--nav-h)-var(--safe-bottom)-17.5rem)]" : "min-h-[calc(100svh-var(--nav-h)-var(--safe-bottom)-15rem)]")}>
        <div className="absolute inset-0 -z-10">
          <Photo src={c.image} priority alt="" objectPosition={c.pos} />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-jet/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-jet/95 via-jet/45 via-55% to-transparent" />
        </div>
        <p className="px-5 font-mono text-[0.72rem] uppercase leading-relaxed tracking-[0.22em] text-cloud/80">{user.fullName}<br /><span className="text-cloud/68">{user.memberLine}</span></p>
        <div className="px-5 [text-shadow:0_1px_16px_rgb(0_0_0/0.7)]">
          <p className={cn("font-mono text-[0.72rem] uppercase tracking-[0.22em]", state.phase === "before" ? "text-cloud/90" : c.tone)}>{c.eyebrow}</p>
          <h1 id="v3-home-title" className="font-display mt-4 text-[clamp(1.7rem,8.4vw,2.5rem)]">
            {c.lines.map((l, i) => <span key={l} className={cn("block", i === c.accent && c.tone)}>{l}</span>)}
          </h1>
          <div className="mt-6 flex items-end justify-between gap-4 border-t border-cloud/20 pt-3.5">
            {state.phase === "before" ? <Countdown /> : <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/72">Édition {event.year}</p>}
            <Link href={c.cta.href} className="group inline-flex min-h-11 items-center gap-2.5 border-b border-cloud/70 pb-0.5 font-mono text-[0.75rem] uppercase tracking-[0.2em] transition hover:border-sky hover:text-sky">
              {c.cta.label} <ArrowRight size={15} strokeWidth={1.5} aria-hidden className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
      {state.phase === "before" && <SignalCard signal={signal} />}
      {state.phase === "during" && <Now />}
      {state.phase === "after" && <Memories />}
      <p className="px-5 pb-2 pt-3 text-center font-mono text-[0.7rem] uppercase tracking-[0.16em] text-dim">Prototype — données de démonstration</p>
    </>
  );
}
