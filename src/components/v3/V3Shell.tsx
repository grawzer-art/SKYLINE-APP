"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Wordmark } from "@/components/ui/Wordmark";
import { Icon } from "@/components/ui/Icon";
import { phaseLabels, type Phase } from "@/data/v3";
import { useProto } from "@/lib/useProto";
import { Initials } from "./ui";
import { cn } from "@/lib/cn";

const tabs = [
  { label: "Home", href: "/v3", icon: "home" },
  { label: "My Flight", href: "/v3/flight", icon: "plane" },
  { label: "Explore", href: "/v3/explore", icon: "compass" },
  { label: "Club", href: "/v3/club", icon: "idcard" },
];

/** Chrome du prototype : bandeau d'état, en-tête, sélecteur de phase, navigation à 4 onglets. */
export function V3Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, update } = useProto();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/v3" ? pathname === "/v3" : pathname.startsWith(href));
  const bare = pathname.startsWith("/v3/wireframes") || pathname.startsWith("/v3/screens");

  if (bare) return <>{children}</>; // documents de conception : plein cadre, sans chrome d'application

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[480px] border-b border-line bg-jet/85 px-5 pt-[var(--safe-top)] backdrop-blur-xl">
        <p className="pt-1.5 font-mono text-[0.5rem] uppercase tracking-[0.2em] text-sunset">Prototype V3 · données fictives · aucun envoi réel</p>
        <div className="flex h-12 items-center justify-between">
          <Link href="/v3" aria-label="SKYLINE — accueil du prototype" className="flex min-h-11 items-center"><Wordmark /></Link>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cloud/25 px-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition active:scale-95">
              <span aria-hidden className="size-1.5 rounded-full bg-sky" />{phaseLabels[state.phase]}
            </button>
            <Link href="/v3/profile" aria-label="Profil et paramètres" className="grid size-11 place-items-center"><Initials name={state.me.pseudo} size={30} /></Link>
          </div>
        </div>
      </header>

      <div className="min-h-dvh">{children}</div>

      <nav aria-label="Navigation du prototype" className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-cloud/10 bg-jet/85 pb-[var(--safe-bottom)] backdrop-blur-2xl">
        <ul className="grid h-[var(--nav-h)] grid-cols-4">
          {tabs.map((t) => (
            <li key={t.href} className="relative">
              <Link href={t.href} aria-current={active(t.href) ? "page" : undefined}
                className={cn("flex h-full min-h-11 flex-col items-center justify-center gap-1.5 transition-colors", active(t.href) ? "text-cloud" : "text-silver/60")}>
                <Icon name={t.icon} size={20} className={cn(t.icon === "plane" && "-rotate-45")} />
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em]">{t.label}</span>
              </Link>
              {active(t.href) && <span aria-hidden className="absolute inset-x-[30%] top-0 h-px bg-sky" />}
            </li>
          ))}
        </ul>
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Prototype" title="Simuler le parcours">
        <p className="text-sm text-dim">Choisissez la phase du voyage : HOME, MY FLIGHT et CLUB s&apos;adaptent.</p>
        <div role="radiogroup" aria-label="Phase du voyage" className="mt-4 grid grid-cols-3 gap-2">
          {(["before", "during", "after"] as Phase[]).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={state.phase === p} onClick={() => update((s) => ({ ...s, phase: p }))}
              className={cn("min-h-12 rounded-[4px] border px-2 text-[0.78rem] transition", state.phase === p ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>
              {phaseLabels[p]}
            </button>
          ))}
        </div>
        <ul className="mt-6 divide-y divide-line border-y border-line font-mono text-[0.66rem] uppercase tracking-[0.14em]">
          <li><Link href="/v3/screens" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between">Plan des écrans <span aria-hidden>→</span></Link></li>
          <li><Link href="/v3/wireframes" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between">Wireframes <span aria-hidden>→</span></Link></li>
          <li><Link href="/" className="flex min-h-12 items-center justify-between">Quitter le prototype <span aria-hidden>→</span></Link></li>
        </ul>
      </Sheet>
    </>
  );
}
