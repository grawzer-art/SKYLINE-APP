"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Wordmark } from "@/components/ui/Wordmark";
import { Icon } from "@/components/ui/Icon";
import { phaseLabels, type Phase } from "@/data/v3";
import { isTabActive, navItems } from "@/components/layout/nav-items";
import { useExperience } from "@/lib/experience/useExperience";
import { useCommunity } from "@/lib/useCommunity";
import { locales } from "@/i18n";
import { identityName, useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";
import { Initials } from "./ui";
import { headerBack, headerLabel, headerMode } from "./headerMode";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";


/** Chrome du prototype : bandeau d'état, en-tête, sélecteur de phase, navigation à 4 onglets. */
export function V3Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, update, t } = useCommunity();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const on = () => setScrolled(window.scrollY > 24); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  const active = (href: string) => isTabActive(href, pathname);   // HOME = accueil V3 exact ; les autres onglets = leur page et sous-pages
  const bare = pathname.startsWith("/v3/wireframes") || pathname.startsWith("/v3/screens") || pathname === "/v3/login"; // la connexion est plein cadre
  const identity = useParticipantIdentity(); const x = useExperience();
  const avatarName = x.surface === "review" ? state.me.pseudo : x.surface === "account" ? identityName(identity) ?? "" : "";   // jamais d'identité de démonstration hors revue

  const compact = headerMode(pathname, x.review) === "compact"; const back = headerBack(pathname);

  if (bare) return <>{children}</>; // documents de conception : plein cadre, sans chrome d'application

  return (
    <>
      {compact ? (
        <header data-testid="header-compact" className={cn("fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[480px] border-b px-5 pt-[var(--safe-top)] transition-[background-color,backdrop-filter,border-color] duration-300", scrolled ? "border-line bg-jet/85 backdrop-blur-xl" : "border-transparent bg-gradient-to-b from-jet/80 to-transparent")}>
          <div className="flex h-11 items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              {back && <Link href={back.href} aria-label={`Retour : ${back.label}`} className="-ml-[13px] grid size-11 shrink-0 place-items-center text-cloud/85"><ArrowLeft size={18} strokeWidth={1.5} aria-hidden /></Link>}
              <Link href="/v3" aria-label="SKYLINE — accueil" className="flex min-h-11 shrink-0 items-center"><Wordmark size="sm" /></Link>
              <span aria-hidden className="h-3.5 w-px shrink-0 bg-cloud/30" />
              <span data-testid="header-label" className="truncate font-mono text-[0.72rem] uppercase tracking-[0.16em] text-silver">{headerLabel(pathname)}</span>
            </div>
            <Link href="/v3/profile" aria-label="Profil et paramètres" className="-mr-[7px] grid size-11 shrink-0 place-items-center"><Initials name={avatarName || "·"} size={30} /></Link>
          </div>
        </header>
      ) : (
      <header className={cn("fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[480px] border-b px-5 pt-[var(--safe-top)] transition-[background-color,backdrop-filter,border-color] duration-300", scrolled ? "border-line bg-jet/85 backdrop-blur-xl" : "border-transparent bg-gradient-to-b from-jet/80 to-transparent")}>
        {pathname !== "/v3/account" && <p className="pt-1.5 whitespace-nowrap font-mono text-[0.72rem] uppercase tracking-[0.06em] text-sunset/85"data-testid="proto-banner">{x.review ? "Revue interne · données fictives" : x.surface === "loading" ? "\u00a0" : x.toConfirmDates ? "Programme à confirmer" : "\u00a0"}</p>}
        <div className="flex h-12 items-center justify-between">
          <Link href="/v3" aria-label="SKYLINE — accueil" className="flex min-h-11 items-center"><Wordmark /></Link>
          <div className="flex items-center gap-1.5">
            {x.showSimulation && (<button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-cloud/25 px-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] transition active:scale-95">
              <span aria-hidden className="size-1.5 rounded-full bg-sky" />{phaseLabels[state.phase]}
            </button>)}
            <Link href="/v3/profile" aria-label="Profil et paramètres" className="grid size-11 place-items-center"><Initials name={avatarName || "·"} size={30} /></Link>
          </div>
        </div>
      </header>
      )}

      <div className="min-h-dvh pb-[calc(var(--nav-h)+var(--safe-bottom)+2.5rem)]">{children}</div>

      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-cloud/10 bg-jet/85 pb-[var(--safe-bottom)] backdrop-blur-2xl">
        <ul className="grid h-[var(--nav-h)] grid-cols-4">
          {navItems.map((t) => (
            <li key={t.href} className="relative">
              <Link href={t.href} aria-current={active(t.href) ? "page" : undefined}
                className={cn("flex h-full min-h-11 flex-col items-center justify-center gap-1.5 transition-colors", active(t.href) ? "text-cloud" : "text-silver/60")}>
                <Icon name={t.icon} size={20} className={cn(t.icon === "plane" && "-rotate-45")} />
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em]">{t.label}</span>
              </Link>
              {active(t.href) && <span aria-hidden className="absolute inset-x-[30%] top-0 h-px bg-sky" />}
            </li>
          ))}
        </ul>
      </nav>

      {x.showSimulation && <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Revue interne" title="Simuler le parcours">
        <p className="text-sm text-dim">Choisissez la phase du voyage : HOME, MY FLIGHT et CLUB s&apos;adaptent.</p>
        <div role="radiogroup" aria-label="Phase du voyage" className="mt-4 grid grid-cols-3 gap-2">
          {(["before", "during", "after"] as Phase[]).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={state.phase === p} onClick={() => update((s) => ({ ...s, phase: p }))}
              className={cn("min-h-12 rounded-[8px] border px-2 text-[0.78rem] transition", state.phase === p ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>
              {phaseLabels[p]}
            </button>
          ))}
        </div>
        <h3 className="mt-6 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-cloud/72">{t("sim.title")}</h3>
        <p className="mt-2 text-[0.78rem] text-dim">{t("sim.reservation")}</p>
        <div role="radiogroup" aria-label={t("sim.reservation")} className="mt-2 grid grid-cols-2 gap-2">
          {(["confirmed", "pending"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={state.sim.reservation === v} onClick={() => update((s) => ({ ...s, sim: { ...s.sim, reservation: v } }))}
              className={cn("min-h-11 rounded-[8px] border px-2 text-[0.78rem] transition", state.sim.reservation === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{t(`sim.reservation.${v}` as never)}</button>
          ))}
        </div>
        <p className="mt-4 text-[0.78rem] text-dim">{t("sim.media")}</p>
        <div role="radiogroup" aria-label={t("sim.media")} className="mt-2 grid grid-cols-2 gap-2">
          {([false, true] as const).map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={state.sim.tone === v} onClick={() => update((s) => ({ ...s, sim: { ...s.sim, tone: v } }))}
              className={cn("min-h-11 rounded-[8px] border px-2 text-[0.78rem] transition", state.sim.tone === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{v ? t("sim.media.tone") : t("sim.media.none")}</button>
          ))}
        </div>
        <p className="mt-4 text-[0.78rem] text-dim">{t("sim.trip")}</p>
        <div role="radiogroup" aria-label={t("sim.trip")} className="mt-2 grid grid-cols-2 gap-2">
          {([false, true] as const).map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={state.sim.trip === v} onClick={() => update((s) => ({ ...s, sim: { ...s.sim, trip: v } }))}
              className={cn("min-h-11 rounded-[8px] border px-2 text-[0.78rem] transition", state.sim.trip === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{v ? t("sim.trip.demo") : t("sim.trip.none")}</button>
          ))}
        </div>
        <p className="mt-4 text-[0.78rem] text-dim">{t("profile.language")}</p>
        <div role="radiogroup" aria-label={t("profile.language")} className="mt-2 grid grid-cols-2 gap-2">
          {locales.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={state.locale === l.id} onClick={() => update((s) => ({ ...s, locale: l.id }))}
              className={cn("min-h-11 rounded-[8px] border px-2 text-[0.78rem] transition", state.locale === l.id ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{l.label}</button>
          ))}
        </div>
        <ul className="mt-6 divide-y divide-line border-y border-line font-mono text-[0.72rem] uppercase tracking-[0.14em]">
          <li><Link href="/v3/screens" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between">Plan des écrans <span aria-hidden>→</span></Link></li>
          <li><Link href="/v3/wireframes" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between">Wireframes <span aria-hidden>→</span></Link></li>
        </ul>
      </Sheet>}
    </>
  );
}
