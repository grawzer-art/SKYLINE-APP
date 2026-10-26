"use client";
import Link from "next/link";
import { useState } from "react";
import { ScreenTitle, Block, Switch } from "./ui";
import { ConditionList } from "./community";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useCommunity } from "@/lib/useCommunity";

/** Activation volontaire des fonctions communautaires (messagerie incluse) — pas une liste de tâches : trois attestations et un bouton. */
export function V3Community() {
  const c = useCommunity();
  const { t, state } = c;
  const [sheet, setSheet] = useState<null | "charter" | "leave">(null);
  // Brouillon : rien n'est enregistré tant que la personne n'a pas confirmé explicitement.
  const [draft, setDraft] = useState({ adult: false, charter: false, consent: false });
  const confirmed = state.sim.reservation === "confirmed";
  const ready = confirmed && draft.adult && draft.charter && draft.consent;

  return (
    <>
      <ScreenTitle eyebrow={t("gate.eyebrow")} title={t("gate.title")} back={{ href: "/v3/club", label: t("common.club") }} />
      <Block><p className="text-[0.92rem] leading-relaxed text-cloud/80">{t("gate.intro")}</p></Block>
      <Block className="pt-4"><ConditionList /></Block>

      {c.eligible ? (
        <Block>
          <div role="status" className="border border-sky/60 p-5">
            <p className="font-display text-[1.1rem]">{t("gate.done.title")}</p>
            <p className="mt-2 text-[0.88rem] text-cloud/80">{t("gate.done.text")}</p>
            <Link href="/v3/club/space" className="mt-4 inline-flex min-h-11 items-center font-mono text-[0.66rem] uppercase tracking-[0.18em] text-sky">{t("gate.done.space")} →</Link>
          </div>
          <button type="button" onClick={() => setSheet("leave")} aria-haspopup="dialog" className="mt-4 min-h-11 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim underline-offset-4 hover:text-cloud hover:underline">{t("gate.leave")}</button>
        </Block>
      ) : (
        <Block>
          <Switch on={draft.adult} onChange={(v) => setDraft((d) => ({ ...d, adult: v }))} label={t("gate.adult.label")} />
          <Switch on={draft.charter} onChange={(v) => setDraft((d) => ({ ...d, charter: v }))} label={t("gate.charter.label")} />
          <button type="button" onClick={() => setSheet("charter")} aria-haspopup="dialog" className="mt-2 min-h-11 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-sky">{t("gate.charter.read")} →</button>
          <Switch on={draft.consent} onChange={(v) => setDraft((d) => ({ ...d, consent: v }))} label={t("gate.consent.label")} />
          <Button onClick={() => { c.setCommunity(draft); }} disabled={!ready} className="mt-5 w-full disabled:opacity-40">{confirmed ? t("gate.cta") : t("gate.cta.waiting")}</Button>
        </Block>
      )}

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} eyebrow={t("gate.eyebrow")} title={sheet === "leave" ? t("gate.leave.title") : t("gate.charter.title")}>
        {sheet === "charter" && (<>
          {(["p1", "p2", "p3", "p4"] as const).map((k) => <p key={k} className="mb-3 leading-relaxed text-cloud/85">{t(`gate.charter.${k}` as never)}</p>)}
          <Button variant="ghost" onClick={() => setSheet(null)} className="mt-3 w-full">{t("common.understood")}</Button>
        </>)}
        {sheet === "leave" && (<>
          <p className="leading-relaxed text-cloud/80">{t("gate.leave.text")}</p>
          <div className="mt-5 grid gap-3"><Button onClick={() => { c.leave(); setSheet(null); }}>{t("gate.leave")}</Button><Button variant="ghost" onClick={() => setSheet(null)}>{t("common.cancel")}</Button></div>
        </>)}
      </Sheet>
    </>
  );
}
