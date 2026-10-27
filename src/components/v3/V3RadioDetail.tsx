"use client";
import { ScreenTitle, Block, DemoTag } from "./ui";
import { Cover, PlayButton, RadioRow, useRadioLabels } from "./radio";
import { radio } from "@/data/v3";
import { useCommunity } from "@/lib/useCommunity";

/** Playlist officielle : titres « à confirmer » (aucun contenu inventé) et lecture globale. */
export function V3Selection({ id }: { id: string }) {
  const { t } = useCommunity();
  const L = useRadioLabels();
  const s = radio.selections.find((x) => x.id === id);
  const title = L.selection(id);
  return (
    <>
      <ScreenTitle eyebrow={t("radio.selections")} title={title} back={{ href: "/v3/explore/radio", label: t("radio.back.radio") }} />
      <Block>
        <div className="flex items-center gap-5"><Cover cover={s?.cover} slot={s?.slot ?? "—"} className="size-28" /><div className="flex-1"><DemoTag /><p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-dim">SKYLINE · {s?.tracks ?? 0} {t("radio.tracks")}</p></div><PlayButton big item={{ id, title, by: "SKYLINE" }} /></div>
      </Block>
      <Block label={t("radio.tracks")}>
        <ol className="divide-y divide-line border-y border-line">
          {Array.from({ length: s?.tracks ?? 0 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4 py-3"><span className="w-6 font-mono text-[0.66rem] text-dim">{i + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[0.92rem]">{L.track(i + 1)}</span><span className="block font-mono text-[0.56rem] uppercase tracking-[0.14em] text-dim">{t("radio.artist.placeholder")}</span></span></li>
          ))}
        </ol>
      </Block>
      <p className="px-5 pb-8 pt-4 text-[0.72rem] text-dim">{t("radio.rights")}</p>
    </>
  );
}

/** Profil DJ officiel (portrait et biographie à fournir) + ses mixes. */
export function V3Dj({ id }: { id: string }) {
  const { t } = useCommunity();
  const L = useRadioLabels();
  const d = radio.djs.find((x) => x.id === id);
  return (
    <>
      <ScreenTitle eyebrow={t("radio.djs")} title={L.dj(id)} back={{ href: "/v3/explore/radio", label: t("radio.back.radio") }} />
      <Block>
        <div aria-hidden className="grid aspect-[4/5] max-h-[22rem] w-full place-items-center border border-dashed border-cloud/20 p-4 text-center font-mono text-[0.56rem] uppercase leading-relaxed tracking-[0.14em] text-cloud/40">{t("radio.photo.slot")}<br />{d?.slot}</div>
        <p className="mt-3 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{t("radio.dj.note")} <DemoTag /></p>
      </Block>
      <Block label={t("radio.mixes.by")}>
        <ul className="divide-y divide-line border-y border-line">
          {radio.mixes.filter((x) => x.dj === id).map((x) => <RadioRow key={x.id} id={x.id} title={L.mix(x.id)} by={L.dj(id)} slot={x.slot} cover={x.cover} />)}
        </ul>
      </Block>
      <p className="px-5 pb-8 pt-4 text-[0.72rem] text-dim">{t("radio.rights")}</p>
    </>
  );
}
