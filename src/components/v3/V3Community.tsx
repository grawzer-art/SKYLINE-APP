"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Block, Switch } from "./ui";
import { Backdrop } from "./visual";
import { images } from "@/data/demo";
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

  const promises = [["gate.p1.t", "gate.p1.d"], ["gate.p2.t", "gate.p2.d"], ["gate.p3.t", "gate.p3.d"]] as const;
  return (
    <>
      <section aria-labelledby="gate-title" className="relative isolate px-5 pt-[calc(var(--safe-top)+5.5rem)]">
        <Backdrop src={images.before} position="30% 55%" className="!bottom-auto !h-[19rem]" />
        <Link href="/v3/club" className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/80"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden /> {t("common.club")}</Link>
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-sky">{t("gate.eyebrow")}</p>
        <h1 id="gate-title" className="font-display mt-2 text-[clamp(1.6rem,8.2vw,2.5rem)] leading-[0.98]">{t("gate.title")}</h1>
        <p className="mt-4 max-w-[34ch] text-[1.02rem] leading-relaxed text-cloud/85">{t("gate.intro")}</p>
      </section>

      <section className="px-5 pt-7" aria-label={t("gate.title")}>
        <ul className="divide-y divide-line border-y border-line">
          {promises.map(([h, d]) => (
            <li key={h} className="flex gap-4 py-4"><Check size={18} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-sky" /><div><p className="text-[1.02rem]">{t(h)}</p><p className="mt-1 text-[0.9rem] leading-snug text-dim">{t(d)}</p></div></li>
          ))}
        </ul>
      </section>

      {c.eligible ? (
        <Block className="pt-6">
          <div role="status" className="rounded-[8px] border border-sky/60 p-5">
            <p className="font-display text-[1.1rem]">{t("gate.done.title")}</p>
            <p className="mt-2 text-[0.92rem] text-cloud/80">{t("gate.done.text")}</p>
            <Link href="/v3/club/space" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-cloud px-5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-jet">{t("gate.prefs")} <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
          </div>
          <button type="button" onClick={() => setSheet("leave")} aria-haspopup="dialog" className="mt-4 min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4 hover:text-cloud">{t("gate.leave")}</button>
        </Block>
      ) : (
        <Block className="pt-6">
          <p role="status" className="mb-4 flex items-center gap-2 text-[0.9rem] text-cloud/85"><span aria-hidden className={`size-2 rounded-full ${confirmed ? "bg-sky" : "bg-cloud/35"}`} />{confirmed ? t("gate.cond.reservationConfirmed") : t("gate.cond.reservationPending.hint")}</p>
          <div className="rounded-[8px] border border-line bg-surface-1 px-4">
            <Switch on={draft.adult} onChange={(v) => setDraft((d) => ({ ...d, adult: v }))} label={t("gate.adult.label")} />
            <Switch on={draft.charter} onChange={(v) => setDraft((d) => ({ ...d, charter: v }))} label={t("gate.charter.label")} />
            <Switch on={draft.consent} onChange={(v) => setDraft((d) => ({ ...d, consent: v }))} label={t("gate.consent.label")} />
          </div>
          <button type="button" onClick={() => setSheet("charter")} aria-haspopup="dialog" className="mt-1 min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-sky">{t("gate.charter.read")} →</button>
          <Button onClick={() => { c.setCommunity(draft); }} disabled={!ready} className="mt-3 w-full disabled:opacity-40">{confirmed ? t("gate.cta") : t("gate.cta.waiting")}</Button>
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
