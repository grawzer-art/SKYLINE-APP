"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Backdrop, NavTile } from "./visual";
import { images } from "@/data/demo";
import { visuals } from "@/data/visuals";
import { ease } from "@/design/motion";
import { useCommunity } from "@/lib/useCommunity";
import { useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";
import { useExperience } from "@/lib/experience/useExperience";
import { useCompactHeader } from "./useHeaderMode";

/**
 * CLUB (V3.2) : trois accès compacts — Mon profil CLUB, Membres, Souvenirs — sous un bandeau photographique. Plus de carte membre : le pass MY FLIGHT est l'objet d'identité.
 * « Messages » n'est pas affiché tant que la fonction n'est pas disponible (la route et le code existent, hors revue locale rien n'y mène).
 * Les Souvenirs restent ouverts aux visiteurs ; l'annuaire garde ses restrictions (voyageur vérifié) et les parcours de connexion sont inchangés.
 */
export function V3Club() {
  const c = useCommunity();
  const identity = useParticipantIdentity(); const x = useExperience(); const compact = useCompactHeader();
  const { t } = c;
  const reduce = useReducedMotion();
  const nReq = c.pendingRequests.length;
  const msgBadge = !x.review ? undefined : c.eligible && nReq + c.unreadTotal > 0 ? t("common.new") : undefined;
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease, delay: d } } as const);
  const real = !x.review; const locked = real ? false : !c.eligible;
  const anonymous = identity.status === "anonymous";
  const spaceSub = x.surface === "open" ? "Bientôt" : anonymous ? "Connectez-vous pour gérer votre profil CLUB." : t("club.tile.space");
  const membersSub = x.surface === "open" ? "Bientôt" : locked ? t("club.tile.locked") : real && !x.reservationConfirmed ? "Réservé aux voyageurs vérifiés" : t("club.tile.members");

  return (
    <>
      <section aria-labelledby="club-title" className={compact ? "relative isolate px-5 pt-[calc(var(--safe-top)+44px+1.25rem)]" : "relative isolate px-5 pt-[calc(var(--safe-top)+6.5rem)]"}>
        <Backdrop src={images.before} position="30% 55%" strength="deep" className="!bottom-auto !h-[15rem]" />
        <h1 id="club-title" className="sr-only">{t("club.title")}</h1>
        <motion.p {...rise(0.1)} className="font-tagline text-[0.75rem] text-cloud/85">{t("club.tagline")}</motion.p>
      </section>

      {!real && (
        <section className="relative px-5 pt-7">
          {locked ? (
            <Link href="/v3/club/community" className="group block rounded-[6px] border border-sky/50 bg-jet/60 p-5 backdrop-blur-sm transition active:scale-[0.99]">
              <span className="font-display block text-[1.1rem]">{t("club.join")}</span>
              <span className="mt-1.5 block text-[0.86rem] leading-snug text-cloud/75">{t("club.join.text")}</span>
              <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-cloud px-5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-jet">{t("club.join.cta")} <ArrowRight size={14} strokeWidth={1.75} aria-hidden className="transition group-hover:translate-x-1" /></span>
            </Link>
          ) : (
            <p className="flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-sky"><span aria-hidden className="size-1.5 rounded-full bg-sky" />{t("club.active")}</p>
          )}
        </section>
      )}

      <nav aria-label={t("club.title")} className="relative space-y-2 px-5 pt-8">
        <NavTile href="/v3/club/space" title={real ? "Mon profil CLUB" : "My Space"} sub={spaceSub} visual={visuals.ceiling} />
        <NavTile href="/v3/club/members" title={real ? "Membres" : "Members"} sub={membersSub} visual={visuals.airport} locked={locked} />
        {x.review && <NavTile href="/v3/club/messages" title="Messages" sub={locked ? t("club.tile.locked") : nReq ? t("messages.tab.requests.n", { n: nReq }) : c.unreadTotal ? t("messages.unread", { count: c.unreadTotal }) : t("club.tile.messages")} visual={visuals.sunset} badge={msgBadge} locked={locked} />}
        <NavTile href="/v3/club/memories" title="Souvenirs" sub={t("club.tile.souvenirs")} visual={visuals.warm} />
      </nav>

      {x.phase !== "before" && (
        <section className="px-5 pt-10">
          <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-cloud/72">{t("club.history")}</h2>
          <p className="mt-3 flex items-baseline justify-between border-b border-line pb-3 text-[0.95rem]"><span>Ibiza 2027</span><span className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-dim">{t("club.history.dates")}</span></p>
        </section>
      )}
    </>
  );
}
