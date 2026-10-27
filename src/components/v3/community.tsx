"use client";
import Link from "next/link";
import { Check, Clock, Circle } from "lucide-react";
import type { ReactNode } from "react";
import { eligibilityOrder, type EligibilityKey } from "@/domain/community";
import { useCommunity } from "@/lib/useCommunity";
import { Block, ScreenTitle } from "./ui";
import { cn } from "@/lib/cn";

/** Conditions d'accès (lecture seule) : état de chacune, sans case à cocher ni progression. */
export function ConditionList() {
  const { eligibility, t, state } = useCommunity();
  const row = (k: EligibilityKey) => {
    const ok = eligibility[k];
    const waiting = k === "reservationConfirmed" && !ok;
    const hint = k === "reservationConfirmed" ? (ok ? t("gate.cond.reservationConfirmed.hint") : t("gate.cond.reservationPending.hint")) : t(`gate.cond.${k}.hint` as never);
    return (
      <li key={k} className="flex items-start gap-4 py-3.5">
        <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border", ok ? "border-sky bg-sky text-jet" : waiting ? "border-cloud/40 text-cloud/72" : "border-silver/40 text-silver/60")}>
          {ok ? <Check size={14} strokeWidth={2.5} /> : waiting ? <Clock size={13} strokeWidth={1.75} /> : <Circle size={9} strokeWidth={1.75} />}
        </span>
        <span className="min-w-0 flex-1"><span className="block text-[0.95rem]">{t(`gate.cond.${k}` as never)}</span><span className="block text-[0.78rem] text-dim">{hint}</span></span>
        <span className="shrink-0 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-cloud/68">{ok ? t("gate.ok") : waiting ? t("gate.waiting") : t("gate.todo")}</span>
      </li>
    );
  };
  void state;
  return <ul className="divide-y divide-line border-y border-line">{eligibilityOrder.map(row)}</ul>;
}

/**
 * Accès conditionnel : réservation confirmée + compte activé + 18+ + charte + consentement.
 * Si une condition manque, l'écran explique laquelle — jamais de contenu communautaire partiel.
 */
export function CommunityGate({ eyebrow, title, back, children }: { eyebrow: string; title: string; back?: { href: string; label: string }; children: ReactNode }) {
  const { eligible, t } = useCommunity();
  if (eligible) return <>{children}</>;
  return (
    <>
      <ScreenTitle eyebrow={eyebrow} title={title} back={back} />
      <Block>
        <div role="status" className="rounded-[8px] border border-silver/40 p-5">
          <p className="font-display text-[1.1rem]">{t("gate.locked.title")}</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-cloud/80">{t("gate.locked.text")}</p>
        </div>
      </Block>
      <Block className="pt-4"><ConditionList /></Block>
      <Block className="pt-4"><Link href="/v3/club/community" className="flex min-h-12 w-full items-center justify-center rounded-full bg-cloud px-6 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-jet">{t("gate.locked.cta")}</Link></Block>
    </>
  );
}
