"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScreenTitle, Block, Toggle, Switch, Initials, DemoTag } from "./ui";
import { Button } from "@/components/ui/Button";
import { cities, genres } from "@/data/v3";
import { LIMITS } from "@/domain/community";
import { useCommunity } from "@/lib/useCommunity";
import { cn } from "@/lib/cn";

const MAX_PHOTO = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** MY SPACE : l'espace personnel du membre, qui persiste d'une édition à l'autre. */
export function V3Space() {
  const c = useCommunity();
  const { t, state } = c;
  const me = state.me;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);   // aperçu LOCAL uniquement (jamais envoyé)
  const [photoError, setPhotoError] = useState(false);
  const pseudo = c.pseudoCheck(me.pseudo);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!TYPES.includes(f.type) || f.size > MAX_PHOTO) { setPhotoError(true); return; }
    setPhotoError(false); setPhoto(URL.createObjectURL(f));
  };
  const contactIds = c.conversations;
  const avatar = (size: number) => photo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={photo} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full border border-silver/40 object-cover" />
    : <Initials name={me.pseudo || "?"} size={size} />;

  return (
    <>
      <ScreenTitle eyebrow={t("space.eyebrow")} title={t("space.title")} back={{ href: "/v3/club", label: t("common.club") }}>
        <p className="mt-3 text-[0.85rem] text-cloud/70">{t("space.persist")}</p>
      </ScreenTitle>

      <Block>
        <div className="flex items-center gap-4">
          {avatar(80)}
          <div className="min-w-0">
            <input ref={fileRef} type="file" accept={TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => fileRef.current?.click()} className="min-h-11 px-4 text-[0.64rem]">{photo ? t("space.photo.change") : t("space.photo.add")}</Button>
              {photo && <button type="button" onClick={() => setPhoto(null)} className="min-h-11 px-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim hover:text-cloud">{t("space.photo.remove")}</button>}
            </div>
            <p className="mt-2 text-[0.75rem] text-dim">{photo ? t("space.photo.pending") : t("space.photo.hint")}</p>
            {photoError && <p role="alert" className="mt-1.5 text-[0.75rem] text-sunset">{t("space.photo.invalid")}</p>}
          </div>
        </div>
        <p className="mt-3 text-[0.7rem] text-dim">{t("space.photo.note")}</p>
      </Block>

      <Block label={t("space.profile")}>
        <div className="space-y-5">
          <div>
            <label htmlFor="pseudo" className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cloud/60">{t("space.pseudo")}</label>
            <input id="pseudo" value={me.pseudo} maxLength={LIMITS.pseudoMax + 6} onChange={(e) => c.setMe({ pseudo: e.target.value })} aria-invalid={!pseudo.ok} aria-describedby="pseudo-hint"
              className="mt-2 min-h-12 w-full border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky" />
            <p id="pseudo-hint" role={pseudo.ok ? undefined : "alert"} className={cn("mt-1.5 text-[0.72rem]", pseudo.ok ? "text-dim" : "text-sunset")}>
              {pseudo.ok ? t("space.pseudo.hint") : t(`space.pseudo.${pseudo.reason}` as never)}
            </p>
          </div>
          <div>
            <label htmlFor="city" className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cloud/60">{t("space.city")}</label>
            <select id="city" value={me.city} onChange={(e) => c.setMe({ city: e.target.value })} className="mt-2 min-h-12 w-full border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky">
              {cities.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <p className="mt-1.5 text-[0.72rem] text-dim">{t("space.city.hint")}</p>
          </div>
          <div>
            <label htmlFor="bio" className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cloud/60">{t("space.bio")}</label>
            <textarea id="bio" value={me.bio} maxLength={LIMITS.bioMax} rows={3} placeholder={t("space.bio.placeholder")} onChange={(e) => c.setMe({ bio: e.target.value })}
              className="mt-2 w-full resize-none border border-line bg-surface-1 px-4 py-3 text-[1rem] outline-none focus:border-sky" />
            <p className="mt-1.5 text-right font-mono text-[0.62rem] tabular-nums text-dim">{me.bio.length}/{LIMITS.bioMax}</p>
          </div>
        </div>
      </Block>

      <Block label={`${t("space.genres")} · ${me.genres.length}/${LIMITS.genresMax}`}>
        <div role="group" aria-label={t("space.genres")} className="flex flex-wrap gap-2">{genres.map((g) => <Toggle key={g} on={me.genres.includes(g)} onClick={() => c.toggleGenre(g)}>{g}</Toggle>)}</div>
      </Block>

      <Block label={t("space.visibility")}>
        <Switch on={me.visible} onChange={c.setVisible} label={t("space.visible.label")} hint={t("space.visible.hint")} />
        {!c.eligible && <Link href="/v3/club/community" className="mt-2 inline-flex min-h-11 items-center font-mono text-[0.64rem] uppercase tracking-[0.16em] text-sky">{t("gate.locked.cta")} →</Link>}
        <fieldset className="border-b border-line py-3"><legend className="sr-only">{t("space.who")}</legend>
          <p className="text-[0.95rem]">{t("space.who")}</p>
          <div role="radiogroup" aria-label={t("space.who")} className="mt-3 grid grid-cols-2 gap-2">
            {([["members", t("space.who.members")], ["nobody", t("space.who.nobody")]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={state.settings.contact === v} onClick={() => c.update((s) => ({ ...s, settings: { ...s.settings, contact: v } }))}
                className={cn("min-h-12 border px-3 text-[0.85rem] transition", state.settings.contact === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{l}</button>
            ))}
          </div>
        </fieldset>
        <p className="mt-3 text-[0.75rem] text-dim">{t("space.saved")}</p>
      </Block>

      <Block label={t("space.preview")}>
        {me.visible && c.eligible ? (
          <div className="flex items-start gap-4 border border-line p-4">{avatar(48)}<div className="min-w-0"><p className="text-[1rem]">{me.pseudo || "—"}</p><p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim">{me.city} · {me.genres.join(" · ") || "—"}</p>{me.bio && <p className="mt-2 text-[0.85rem] text-cloud/80">{me.bio}</p>}</div></div>
        ) : <p role="status" className="border border-dashed border-cloud/20 p-4 text-[0.85rem] text-dim">{t("space.preview.hidden")}</p>}
      </Block>

      <Block label={t("space.editions")}>
        <div className="flex items-center justify-between gap-4 border-y border-line py-3.5"><span><span className="block text-[0.95rem]">{t("space.editions.current")}</span><span className="block font-mono text-[0.56rem] uppercase tracking-[0.14em] text-dim">{t("space.editions.status")}</span></span><DemoTag /></div>
        <p className="mt-3 text-[0.8rem] text-dim">{t("space.editions.next")}</p>
      </Block>

      <Block label={`${t("space.contacts")} · ${t("space.contacts.count", { count: contactIds.length })}`}>
        {contactIds.length === 0 ? <p className="text-[0.88rem] text-dim">{t("space.contacts.none")}</p> : (
          <ul className="divide-y divide-line border-y border-line">
            {contactIds.map((id) => (
              <li key={id}><Link href={`/v3/club/messages/${id}`} aria-label={`${t("space.contacts.open")} : ${c.member(id)?.pseudo}`} className="flex min-h-14 items-center gap-4 py-2"><Initials name={c.member(id)?.pseudo ?? "?"} size={36} /><span className="flex-1 text-[0.95rem]">{c.member(id)?.pseudo}</span><span aria-hidden className="text-silver">→</span></Link></li>
            ))}
          </ul>
        )}
      </Block>
      <div className="h-6" />
    </>
  );
}
