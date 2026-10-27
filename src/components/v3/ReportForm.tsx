"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCommunity } from "@/lib/useCommunity";

/** Formulaire de signalement partagé (fiche membre, conversation, message). `quote` = message signalé. */
export function ReportForm({ name, quote, chat, onSend, onCancel }: { name: string; quote?: string; chat?: boolean; onSend: (reason: string) => void; onCancel: () => void }) {
  const { t } = useCommunity();
  const reasons = ["report.r1", "report.r2", "report.r3", "report.r4"] as const;
  const [reason, setReason] = useState<(typeof reasons)[number]>(reasons[0]);
  return (
    <>
      {quote && <blockquote className="mb-4 border-l border-sunset pl-4 text-[0.88rem] text-cloud/80"><span className="mb-1 block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-dim">{t("report.message")} · {name}</span>{quote}</blockquote>}
      <fieldset><legend className="text-sm text-dim">{t("report.reason")}</legend>
        <div className="mt-3 space-y-2">{reasons.map((r) => (
          <label key={r} className="flex min-h-12 cursor-pointer items-center gap-3 border border-line px-4 text-[0.92rem]"><input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[#8FB8FF]" />{t(r)}</label>
        ))}</div>
      </fieldset>
      <p className="mt-4 text-[0.78rem] text-dim">{chat ? t("report.note.chat") : t("report.note")}</p>
      <p className="mt-2 text-[0.72rem] text-dim">{t("report.urgent")}</p>
      <div className="mt-5 grid gap-3"><Button onClick={() => onSend(reason)}>{t("report.send")}</Button><Button variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button></div>
    </>
  );
}
