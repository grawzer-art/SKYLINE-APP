"use client";
import Link from "next/link";
import { ScreenTitle, Block, DemoTag } from "./ui";
import { Cover, PlayButton, RadioRow, useRadioLabels } from "./radio";
import { radio } from "@/data/v3";
import { useCommunity } from "@/lib/useCommunity";

/** SKYLINE RADIO : à la une, playlists officielles, DJ, mixes exclusifs. Aucun média sans autorisation de diffusion. */
export function V3Radio() {
  const { t } = useCommunity();
  const L = useRadioLabels();
  const f = radio.featured;
  return (
    <>
      <ScreenTitle eyebrow={t("radio.eyebrow")} title={t("radio.title")} back={{ href: "/v3/explore", label: t("radio.eyebrow") }}>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.85rem] text-cloud/70">{t("radio.intro")} <DemoTag /></p>
      </ScreenTitle>

      <Block label={t("radio.featured")}>
        <div className="border border-cloud/15 p-4">
          <div className="flex items-center gap-4">
            <Cover slot={f.slot} className="size-20" />
            <div className="min-w-0 flex-1">
              <Link href={`/v3/explore/radio/sel/${f.id}`} className="font-display block text-[0.95rem] leading-tight">{L.selection(f.id)}</Link>
              <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-dim">SKYLINE</p>
            </div>
            <PlayButton big item={{ id: f.id, title: L.selection(f.id), by: "SKYLINE", href: `/v3/explore/radio/sel/${f.id}` }} />
          </div>
        </div>
      </Block>

      <Block label={t("radio.selections")}>
        <ul className="divide-y divide-line border-y border-line">
          {radio.selections.map((s) => <RadioRow key={s.id} id={s.id} title={L.selection(s.id)} by="SKYLINE" slot={s.slot} href={`/v3/explore/radio/sel/${s.id}`} />)}
        </ul>
      </Block>

      <Block label={t("radio.djs")}>
        <ul className="grid grid-cols-2 gap-3">
          {radio.djs.map((d) => (
            <li key={d.id}>
              <Link href={`/v3/explore/radio/dj/${d.id}`} className="block">
                <span aria-hidden className="grid aspect-[4/5] place-items-center border border-dashed border-cloud/20 p-3 text-center font-mono text-[0.5rem] uppercase leading-relaxed tracking-[0.14em] text-cloud/40">{t("radio.photo.slot")}<br />{d.slot}</span>
                <span className="mt-2 block text-[0.9rem]">{L.dj(d.id)}</span><span className="block font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{t("radio.dj.note")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Block>

      <Block label={t("radio.mixes")}>
        <ul className="divide-y divide-line border-y border-line">
          {radio.mixes.map((x) => <RadioRow key={x.id} id={x.id} title={L.mix(x.id)} by={L.dj(x.dj)} slot={x.slot} />)}
        </ul>
      </Block>
      <p className="px-5 pb-8 pt-4 text-[0.72rem] text-dim">{t("radio.rights")}</p>
    </>
  );
}
