"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Wordmark } from "@/components/ui/Wordmark";
import { Icon } from "@/components/ui/Icon";
import { phaseLabels, type Phase } from "@/data/v3";
import { useCommunity } from "@/lib/useCommunity";
import { locales } from "@/i18n";
import { Initials } from "./ui";
import { cn } from "@/lib/cn";

const tabs = [
  { label: "Home", href: "/", icon: "home" },
  { label: "My Flight", href: "/v3/flight", icon: "plane" },
  { label: "Explore", href: "/v3/explore", icon: "compass" },
  { label: "Club", href: "/v3/club", icon: "idcard" },
];

/** Chrome du prototype : bandeau d'état, en-tête, sélecteur de phase, navigation à 4 onglets. */
export function V3Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, update, t } = useCommunity();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const on = () => setScrolled(window.scrollY > 24); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  const active = (href: string) => (href === "/" ? false : pathname.startsWith(href)); // « Home » ramène à l'accueil de l'application
  const bare = pathname.startsWith("/v3/wireframes") || pathname.startsWith("/v3/screens");

  if (bare) return <>{children}</>; // documents de conception : plein cadre, sans chrome d'application

  return (
    <>
      <header className={cn("fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[480px] border-b px-5 pt-[var(--safe-top)] transition-[background-color,backdrop-filter,border-color] duration-300", scrolled ? "border-line bg-jet/85 backdrop-blur-xl" : "border-transparent bg-gradient-to-b from-jet/80 to-transparent")}>
        <p className="pt-1.5 font-mono text-[0.48rem] uppercase tracking-[0.2em] text-sunset/80">Prototype V3 · données fictives · aucun envoi réel</p>
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

      <div className="min-h-dvh pb-[calc(var(--nav-h)+var(--safe-bottom)+2.5rem)]">{children}</div>

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
        <h3 className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-cloud/60">{t("sim.title")}</h3>
        <p className="mt-2 text-[0.78rem] text-dim">{t("sim.reservation")}</p>
        <div role="radiogroup" aria-label={t("sim.reservation")} className="mt-2 grid grid-cols-2 gap-2">
          {(["confirmed", "pending"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={state.sim.reservation === v} onClick={() => update((s) => ({ ...s, sim: { ...s.sim, reservation: v } }))}
              className={cn("min-h-11 rounded-[4px] border px-2 text-[0.78rem] transition", state.sim.reservation === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{t(`sim.reservation.${v}` as never)}</button>
          ))}
        </div>
        <p className="mt-4 text-[0.78rem] text-dim">{t("sim.media")}</p>
        <div role="radiogroup" aria-label={t("sim.media")} className="mt-2 grid grid-cols-2 gap-2">
          {([false, true] as const).map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={state.sim.tone === v} onClick={() => update((s) => ({ ...s, sim: { ...s.sim, tone: v } }))}
              className={cn("min-h-11 rounded-[4px] border px-2 text-[0.78rem] transition", state.sim.tone === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{v ? t("sim.media.tone") : t("sim.media.none")}</button>
          ))}
        </div>
        <p className="mt-4 text-[0.78rem] text-dim">{t("profile.language")}</p>
        <div role="radiogroup" aria-label={t("profile.language")} className="mt-2 grid grid-cols-2 gap-2">
          {locales.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={state.locale === l.id} onClick={() => update((s) => ({ ...s, locale: l.id }))}
              className={cn("min-h-11 rounded-[4px] border px-2 text-[0.78rem] transition", state.locale === l.id ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{l.label}</button>
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
