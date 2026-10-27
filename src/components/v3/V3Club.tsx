"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Backdrop, MembershipCard, NavTile } from "./visual";
import { TiltToggle, useMetal } from "./metal";
import { images } from "@/data/demo";
import { visuals } from "@/data/visuals";
import { ease } from "@/design/motion";
import { useCommunity } from "@/lib/useCommunity";

/** CLUB : l'entrée du membership. Un héros photographique, la carte membre comme objet, puis les quatre espaces. */
export function V3Club() {
  const c = useCommunity();
  const { t, state } = c;
  const reduce = useReducedMotion();
  const metal = useMetal();
  const nReq = c.pendingRequests.length;
  const msgBadge = c.eligible && nReq + c.unreadTotal > 0 ? t("common.new") : undefined;
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease, delay: d } } as const);
  const locked = !c.eligible;

  return (
    <>
      <section aria-labelledby="club-title" className="relative isolate px-5 pb-0 pt-[calc(var(--safe-top)+6.5rem)]">
        <Backdrop src={images.before} position="30% 55%" strength="deep" className="!bottom-[-3rem]" />
        <motion.p {...rise(0.05)} className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-sky">{t("club.eyebrow")}</motion.p>
        <motion.h1 id="club-title" {...rise(0.12)} className="font-display mt-2 text-[clamp(2.4rem,13vw,3.6rem)] leading-[0.9]">{t("club.title")}</motion.h1>
        <motion.p {...rise(0.2)} className="font-tagline mt-3 text-[0.75rem] text-cloud/85">{t("club.tagline")}</motion.p>
        <div className="mt-9"><MembershipCard name={state.me.pseudo} since={t("club.card.since.value")} number={t("club.card.pending")} member={t("club.card.member")} sinceLabel={t("club.card.since")} numberLabel={t("club.card.number")} demo metal={metal} /><TiltToggle metal={metal} label={t("club.card.tilt")} labelOn={t("club.card.tilt.on")} /></div>
      </section>

      <section className="px-5 pt-7">
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

      <nav aria-label={t("club.title")} className="space-y-2.5 px-5 pt-5">
        <NavTile href="/v3/club/space" title="My Space" sub={t("club.tile.space")} visual={visuals.ceiling} />
        <NavTile href="/v3/club/members" title="Members" sub={locked ? t("club.tile.locked") : t("club.tile.members")} visual={visuals.airport} locked={locked} />
        <NavTile href="/v3/club/messages" title="Messages" sub={locked ? t("club.tile.locked") : nReq ? t("messages.tab.requests.n", { n: nReq }) : c.unreadTotal ? t("messages.unread", { count: c.unreadTotal }) : t("club.tile.messages")} visual={visuals.sunset} badge={msgBadge} locked={locked} />
        <NavTile href="/v3/club/memories" title="Souvenirs" sub={t("club.tile.souvenirs")} visual={visuals.warm} />
      </nav>

      <section className="px-5 pt-10">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/68">{t("club.history")}</h2>
        <p className="mt-3 flex items-baseline justify-between border-b border-line pb-3 text-[0.95rem]">
          {state.phase === "before" ? <span className="text-cloud/75">{t("club.history.empty")}</span> : <><span>Ibiza 2027</span><span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim">{t("club.history.dates")}</span></>}
        </p>
        <h2 className="mt-7 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/68">{t("club.next")}</h2>
        <p className="mt-3 text-[0.85rem] text-cloud/75">{t("club.next.text")}</p>
      </section>

      <p className="font-tagline px-5 pb-2 pt-10 text-center text-[0.7rem] text-silver/70">{t("club.signature")}</p>
    </>
  );
}
