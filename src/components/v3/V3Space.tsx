"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, BadgeCheck, MapPin, Pencil } from "lucide-react";
import { Backdrop, Face, Vibe } from "./visual";
import { Switch, Toggle } from "./ui";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cities, genres } from "@/data/v3";
import { images } from "@/data/demo";
import { LIMITS } from "@/domain/community";
import { ease } from "@/design/motion";
import { useCommunity } from "@/lib/useCommunity";
import { cn } from "@/lib/cn";

const MAX_PHOTO = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * MY SPACE : d'abord le profil, tel que les autres le voient. La modification existe, mais dans un panneau secondaire.
 * Persistant d'une édition à l'autre.
 */
export function V3Space() {
  const c = useCommunity();
  const { t, state } = c;
  const me = state.me;
  const reduce = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);   // aperçu LOCAL uniquement (jamais envoyé)
  const [photoError, setPhotoError] = useState(false);
  const pseudo = c.pseudoCheck(me.pseudo);
  const visible = me.visible && c.eligible;
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.75, ease, delay: d } } as const);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  const pick = (f?: File) => {
    if (!f) return;
    if (!TYPES.includes(f.type) || f.size > MAX_PHOTO) { setPhotoError(true); return; }
    setPhotoError(false); setPhoto(URL.createObjectURL(f));
  };

  return (
    <>
      <section aria-labelledby="space-title" className="relative isolate px-5 pb-8 pt-[calc(var(--safe-top)+5.75rem)] text-center">
        <Backdrop src={images.before} position="30% 80%" strength="deep" />
        <div className="absolute inset-x-5 top-[calc(var(--safe-top)+4.5rem)] flex items-center justify-between">
          <Link href="/v3/club" className="-ml-1 inline-flex min-h-11 items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/80"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden />{t("common.club")}</Link>
          <button type="button" onClick={() => setEditing(true)} aria-haspopup="dialog" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cloud/35 bg-jet/40 px-4 font-mono text-[0.72rem] uppercase tracking-[0.16em] backdrop-blur transition active:scale-95"><Pencil size={13} strokeWidth={1.75} aria-hidden />{t("space.edit")}</button>
        </div>

        <motion.div {...rise(0.05)} className="relative mx-auto mt-12 w-fit">
          <Face name={me.pseudo || "?"} size={132} tone="sky" src={photo} className="shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]" />
          {c.eligible && <span className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-sky text-jet ring-4 ring-jet" title={t("space.verified")}><BadgeCheck size={20} strokeWidth={1.75} aria-hidden /><span className="sr-only">{t("space.verified")}</span></span>}
        </motion.div>
        <motion.h1 id="space-title" {...rise(0.15)} className="font-display mt-5 text-[clamp(1.9rem,10vw,2.8rem)] leading-none">{me.pseudo || "—"}</motion.h1>
        <motion.p {...rise(0.2)} className="mt-2 inline-flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-cloud/80"><MapPin size={13} strokeWidth={1.5} aria-hidden />{me.city}</motion.p>
        <motion.div {...rise(0.27)} className="mx-auto mt-5 max-w-[30ch]">
          {me.bio ? <p className="text-[1.02rem] italic leading-snug text-cloud/90">« {me.bio} »</p>
            : <button type="button" onClick={() => setEditing(true)} className="min-h-11 text-[0.92rem] italic text-cloud/72 underline-offset-4 hover:underline">{t("space.bio.empty")}</button>}
        </motion.div>

        <motion.dl {...rise(0.35)} className="mx-auto mt-8 grid max-w-[22rem] grid-cols-3 divide-x divide-cloud/20 border-y border-cloud/20 py-3.5 font-mono text-[0.7rem] uppercase tracking-[0.16em]">
          {[[t("space.stat.since"), "2027"], [t("space.stat.home"), me.city], [t("space.stat.edition"), "IBIZA"]].map(([k, v]) => (
            <div key={k} className="px-2"><dt className="text-cloud/68">{k}</dt><dd className="font-display mt-1.5 truncate text-[0.95rem] tracking-normal">{v}</dd></div>
          ))}
        </motion.dl>
      </section>

      <section aria-labelledby="vibes-title" className="px-5 pt-2">
        <h2 id="vibes-title" className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/68">{t("space.vibes")}</h2>
        {me.genres.length === 0 ? <p className="mt-3 text-[0.86rem] text-cloud/72">{t("space.vibes.empty")}</p> : <ul className="mt-3 flex flex-wrap gap-2">{me.genres.map((g) => <li key={g}><Vibe>{g}</Vibe></li>)}</ul>}
      </section>

      <section aria-labelledby="vis-title" className="px-5 pt-9">
        <h2 id="vis-title" className="sr-only">{t("space.visibility")}</h2>
        <div className={cn("rounded-[6px] border p-4", visible ? "border-sky/50" : "border-cloud/15")}>
          <Switch on={me.visible} onChange={c.setVisible} label={visible ? t("space.visibility.on") : t("space.visibility.off")} hint={visible ? t("space.visibility.on.text") : t("space.visibility.off.text")} />
          {!c.eligible && <Link href="/v3/club/community" className="mt-3 inline-flex min-h-11 items-center font-mono text-[0.72rem] uppercase tracking-[0.16em] text-sky">{t("gate.locked.cta")} →</Link>}
        </div>
      </section>

      <section aria-labelledby="contacts-title" className="px-5 pt-9">
        <h2 id="contacts-title" className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/68">{t("space.contacts")} · {t("space.contacts.count", { count: c.conversations.length })}</h2>
        {c.conversations.length === 0 ? <p className="mt-3 text-[0.88rem] text-cloud/72">{t("space.contacts.none")}</p> : (
          <Link href="/v3/club/messages" className="group mt-3 flex min-h-16 items-center justify-between border-y border-line py-3">
            <span className="flex -space-x-2.5">{c.conversations.slice(0, 5).map((id) => <Face key={id} name={c.member(id)?.pseudo ?? "?"} size={40} className="ring-2 ring-jet" tone="none" />)}</span>
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-sky">{t("space.contacts.see")} →</span>
          </Link>
        )}
      </section>

      <section aria-labelledby="ed-title" className="px-5 pt-9">
        <h2 id="ed-title" className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/68">{t("space.editions")}</h2>
        <div className="mt-3 flex items-center justify-between border-y border-line py-3.5"><span><span className="font-display block text-[1rem]">{t("space.editions.current")}</span><span className="block font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim">{t("space.editions.status")}</span></span></div>
        <p className="mt-3 text-[0.8rem] text-cloud/68">{t("space.persist")} {t("space.editions.next")}</p>
      </section>
      <p className="px-5 pb-2 pt-8 text-center font-mono text-[0.7rem] uppercase tracking-[0.16em] text-dim">{t("space.saved")}</p>

      <Sheet open={editing} onClose={() => setEditing(false)} eyebrow={t("space.title")} title={t("space.edit.title")}>
        <div className="flex items-center gap-4 pb-2">
          <Face name={me.pseudo || "?"} size={72} tone="silver" src={photo} />
          <div className="min-w-0">
            <input ref={fileRef} type="file" accept={TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => fileRef.current?.click()} className="min-h-11 px-4 text-[0.72rem]">{photo ? t("space.photo.change") : t("space.photo.add")}</Button>
              {photo && <button type="button" onClick={() => setPhoto(null)} className="min-h-11 px-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-dim hover:text-cloud">{t("space.photo.remove")}</button>}
            </div>
            <p className="mt-1.5 text-[0.74rem] text-dim">{photo ? t("space.photo.pending") : t("space.photo.hint")}</p>
            {photoError && <p role="alert" className="mt-1 text-[0.74rem] text-sunset">{t("space.photo.invalid")}</p>}
          </div>
        </div>
        <p className="text-[0.75rem] text-dim">{t("space.photo.note")}</p>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="pseudo" className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72">{t("space.pseudo")}</label>
            <input id="pseudo" value={me.pseudo} maxLength={LIMITS.pseudoMax + 6} onChange={(e) => c.setMe({ pseudo: e.target.value })} aria-invalid={!pseudo.ok} aria-describedby="pseudo-hint" className="mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-2 px-4 text-[1rem] outline-none focus:border-sky" />
            <p id="pseudo-hint" role={pseudo.ok ? undefined : "alert"} className={cn("mt-1.5 text-[0.72rem]", pseudo.ok ? "text-dim" : "text-sunset")}>{pseudo.ok ? t("space.pseudo.hint") : t(`space.pseudo.${pseudo.reason}` as never)}</p>
          </div>
          <div>
            <label htmlFor="city" className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72">{t("space.city")}</label>
            <select id="city" value={me.city} onChange={(e) => c.setMe({ city: e.target.value })} className="mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-2 px-4 text-[1rem] outline-none focus:border-sky">{cities.map((x) => <option key={x} value={x}>{x}</option>)}</select>
            <p className="mt-1.5 text-[0.72rem] text-dim">{t("space.city.hint")}</p>
          </div>
          <div>
            <label htmlFor="bio" className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72">{t("space.bio")}</label>
            <textarea id="bio" value={me.bio} maxLength={LIMITS.bioMax} rows={3} placeholder={t("space.bio.placeholder")} onChange={(e) => c.setMe({ bio: e.target.value })} className="mt-2 w-full resize-none border border-line bg-surface-2 px-4 py-3 text-[1rem] outline-none focus:border-sky" />
            <p className="mt-1.5 text-right font-mono text-[0.72rem] tabular-nums text-dim">{me.bio.length}/{LIMITS.bioMax}</p>
          </div>
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72">{t("space.genres")} · {me.genres.length}/{LIMITS.genresMax}</p>
            <div role="group" aria-label={t("space.genres")} className="mt-3 flex flex-wrap gap-2">{genres.map((g) => <Toggle key={g} on={me.genres.includes(g)} onClick={() => c.toggleGenre(g)}>{g}</Toggle>)}</div>
          </div>
          <fieldset><legend className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72">{t("space.who")}</legend>
            <div role="radiogroup" aria-label={t("space.who")} className="mt-3 grid grid-cols-2 gap-2">
              {([["members", t("space.who.members")], ["nobody", t("space.who.nobody")]] as const).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={state.settings.contact === v} onClick={() => c.update((s) => ({ ...s, settings: { ...s.settings, contact: v } }))}
                  className={cn("min-h-12 border px-3 text-[0.85rem] transition", state.settings.contact === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-2")}>{l}</button>
              ))}
            </div>
          </fieldset>
        </div>
        <Button onClick={() => setEditing(false)} className="mt-7 w-full">{t("space.done")}</Button>
      </Sheet>
    </>
  );
}
