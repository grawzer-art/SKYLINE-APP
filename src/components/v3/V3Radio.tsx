"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Backdrop, Face } from "./visual";
import { PlayButton, RadioRow, useRadioLabels } from "./radio";
import { usePlayer } from "./PlayerProvider";
import { Photo } from "@/components/ui/Photo";
import { images } from "@/data/demo";
import { visuals } from "@/data/visuals";
import { radio } from "@/data/v3";
import { ease } from "@/design/motion";
import { useCommunity } from "@/lib/useCommunity";

const fmt = (t: number) => (Number.isFinite(t) && t >= 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

/** SKYLINE RADIO : une mise en avant plein cadre, des playlists en pochettes, les DJ, les mixes. Donne envie d'écouter. */
export function V3Radio() {
  const { t } = useCommunity();
  const L = useRadioLabels();
  const p = usePlayer();
  const reduce = useReducedMotion();
  const f = radio.featured;
  const fTitle = L.selection(f.id);
  const live = p.current?.id === f.id;
  const pct = live && p.duration ? Math.min(100, (p.time / p.duration) * 100) : 0;
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease, delay: d } } as const);

  return (
    <>
      <section aria-labelledby="radio-title" className="relative isolate flex min-h-[min(74svh,640px)] flex-col justify-end px-5 pb-8 pt-[calc(var(--safe-top)+5.5rem)]">
        <Backdrop src={images.before} position="30% 62%" strength="deep" />
        <Link href="/v3/explore" className="absolute left-4 top-[calc(var(--safe-top)+4.6rem)] inline-flex min-h-11 items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/80"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden />{t("radio.eyebrow")}</Link>
        <motion.p {...rise(0.05)} className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-sunset">{t("radio.featured.label")}</motion.p>
        <motion.h1 id="radio-title" {...rise(0.12)} className="font-display mt-2 text-[clamp(1.6rem,7.6vw,2.3rem)] leading-[0.95] [text-shadow:0_2px_24px_rgb(0_0_0/0.6)]">{fTitle}</motion.h1>
        <motion.p {...rise(0.2)} className="font-tagline mt-3 text-[0.72rem] text-cloud/85">{t("radio.by", { name: "SKYLINE" })}</motion.p>
        <motion.div {...rise(0.3)} className="mt-6 flex items-center gap-5">
          <PlayButton big item={{ id: f.id, title: fTitle, by: "SKYLINE", href: `/v3/explore/radio/sel/${f.id}` }} />
          <div className="min-w-0 flex-1">
            <div role="progressbar" aria-label={t("radio.position")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className="h-[3px] overflow-hidden rounded-full bg-cloud/25"><div className="h-full rounded-full bg-sky transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 flex justify-between font-mono text-[0.7rem] tabular-nums text-cloud/70"><span>{live ? fmt(p.time) : "0:00"}</span><span>{live && p.duration ? `-${fmt(p.duration - p.time)}` : t("radio.time.empty")}</span></p>
          </div>
        </motion.div>
        {live && p.unavailable && <p role="status" className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-cloud/70">{t("radio.unavailable")}</p>}
      </section>

      <section aria-labelledby="pl-title" className="pt-9">
        <div className="flex items-baseline justify-between px-5"><h2 id="pl-title" className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-cloud/72">{t("radio.selections")}</h2></div>
        <ul className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
          {radio.selections.map((s) => (
            <li key={s.id} className="w-[9.4rem] shrink-0 snap-start">
              <div className="relative aspect-square overflow-hidden rounded-[6px] border border-cloud/10">
                <Link href={`/v3/explore/radio/sel/${s.id}`} aria-label={L.selection(s.id)} className="absolute inset-0 z-10"><span className="sr-only">{L.selection(s.id)}</span></Link>
                <Photo src={visuals[s.cover]} sizes="152px" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jet/90 via-jet/20 to-transparent" />
                <span className="absolute inset-x-3 bottom-3 z-0 block font-display text-[0.86rem] leading-[1.05]">{L.selection(s.id)}</span>
                <span className="absolute right-2 top-2 z-20"><PlayButton onDark item={{ id: s.id, title: L.selection(s.id), by: "SKYLINE", href: `/v3/explore/radio/sel/${s.id}` }} /></span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dj-title" className="px-5 pt-10">
        <h2 id="dj-title" className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-cloud/72">{t("radio.djs")}</h2>
        <ul className="mt-4 flex gap-5">
          {radio.djs.map((d) => (
            <li key={d.id} className="w-[5.2rem] text-center">
              <Link href={`/v3/explore/radio/dj/${d.id}`} className="group block">
                <span className="relative mx-auto grid size-[4.6rem] place-items-center rounded-full border border-dashed border-silver/50 transition group-active:scale-95"><Face name="DJ" size={64} tone="none" /></span>
                <span className="mt-2 block text-[0.8rem] leading-tight">{L.dj(d.id)}</span>
                <span className="mt-0.5 block font-mono text-[0.7rem] uppercase tracking-[0.12em] text-dim">{t("radio.djs.sub")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mix-title" className="px-5 pt-10">
        <h2 id="mix-title" className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-cloud/72">{t("radio.mixes")}</h2>
        <ul className="mt-2 divide-y divide-line">
          {radio.mixes.map((x) => <RadioRow key={x.id} id={x.id} title={L.mix(x.id)} by={L.dj(x.dj)} slot={x.slot} cover={x.cover} />)}
        </ul>
      </section>
      <p className="px-5 pb-4 pt-6 text-[0.75rem] leading-relaxed text-dim">{t("radio.rights")} {t("radio.cover.note")}</p>
      <p className="font-tagline pb-2 text-center text-[0.7rem] text-silver/70">{t("club.signature")}</p>
    </>
  );
}
