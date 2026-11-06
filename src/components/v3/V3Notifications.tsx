"use client";
import { useMemo, useState } from "react";
import { Bell, Settings2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { PushCard, type PushLabels } from "@/components/notifications/PushCard";
import { ScreenTitle, Block, Switch } from "./ui";
import { PARTICIPANT_CATEGORIES, defaultParticipantPrefs, isParticipantVisible, normalizeParticipantPrefs, participantSamples, participantUnread, type ParticipantNotification } from "@/domain/participant-notifications";
import { useCommunity } from "@/lib/useCommunity";
import { useClock } from "@/lib/useClock";
import { useFlag, usePrefs, useReadSet } from "@/lib/notifications/storage";
import { cn } from "@/lib/cn";
import type { TKey } from "@/i18n";

const defaults = defaultParticipantPrefs();
/** Source des notifications PARTICIPANTS : communications officielles (base, phase suivante). Phase 1 : aucune source réelle → boîte vide, exemples à la demande. */
function useParticipantNotifications() {
  const { state } = useCommunity(); const clock = useClock();
  const read = useReadSet("skyline.participant.notifs.read.v1"); const prefs = usePrefs("skyline.participant.notifs.prefs.v1", normalizeParticipantPrefs, defaults);
  const [samplesOn, setSamples] = useFlag("skyline.participant.notifs.samples.v1");
  const items = useMemo<ParticipantNotification[]>(() => (clock && samplesOn ? participantSamples(clock, state.locale as "fr" | "en") : []).filter((n) => isParticipantVisible(n, prefs.prefs)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), [clock, samplesOn, state.locale, prefs.prefs]);
  return { items, read: read.read, markRead: read.markRead, unread: participantUnread(items, read.read), prefs: prefs.prefs, updatePrefs: prefs.update, samplesOn, setSamples };
}

function ago(iso: string, now: number, locale: string) {
  const m = Math.floor((now - Date.parse(iso)) / 60_000); if (!Number.isFinite(m)) return "";
  const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { numeric: "auto" });
  if (m < 60) return rtf.format(-Math.max(m, 1), "minute"); const h = Math.floor(m / 60); if (h < 24) return rtf.format(-h, "hour"); return rtf.format(-Math.floor(h / 24), "day");
}

/** NOTIFICATIONS PARTICIPANTS : lecture + préférences. Expérience distincte de STAFF (aucune donnée, catégorie ni clé de stockage en commun). */
export function V3Notifications() {
  const { t, state } = useCommunity(); const N = useParticipantNotifications(); const clock = useClock();
  const [only, setOnly] = useState<"all" | "unread">("all"); const [prefs, setPrefs] = useState(false);
  const shown = only === "unread" ? N.items.filter((n) => !N.read.has(n.id)) : N.items;
  const cat = (id: string) => t(`notif.cat.${id}` as TKey);
  const labels: PushLabels = { region: t("notif.push.region"), title: t("notif.push.title"), context: t("notif.push.context"), checking: t("notif.push.checking"), button: t("notif.push.button"), foot: t("notif.push.foot"),
    states: { unsupported: t("notif.push.unsupported"), needs_install: t("notif.push.needs_install"), blocked: t("notif.push.blocked"), coming_soon: t("notif.push.coming_soon"), ready: t("notif.push.ready") } };
  return (
    <>
      <ScreenTitle eyebrow={t("notif.eyebrow")} title={t("notif.title")} back={{ href: "/v3/profile", label: t("notif.back") }} />
      <Block>
        <div className="flex items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="font-mono text-[0.78rem] uppercase tracking-[0.14em] text-cloud/85">{N.unread > 0 ? t("notif.unread" as TKey, { count: N.unread }) : t("notif.allRead")}</p>
          <div className="flex items-center gap-1">
            {N.unread > 0 && <button type="button" onClick={() => N.markRead(N.items.map((n) => n.id))} className="inline-flex min-h-11 items-center px-3 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">{t("notif.markAll")}</button>}
            <button type="button" onClick={() => setPrefs(true)} aria-haspopup="dialog" aria-label={t("notif.prefs")} className="grid size-11 place-items-center rounded-full border border-line transition active:scale-95"><Settings2 size={18} strokeWidth={1.5} aria-hidden /></button>
          </div>
        </div>
        <div role="group" aria-label={t("notif.filter")} className="mt-3 flex gap-1 rounded-full border border-silver/40 p-1">
          {([["all", "notif.filter.all"], ["unread", "notif.filter.unread"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={only === k} onClick={() => setOnly(k)} className={cn("min-h-11 flex-1 rounded-full px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] transition", only === k ? "bg-cloud text-jet" : "text-cloud/80")}>{t(l)}</button>)}
        </div>
      </Block>
      <Block className="pt-4">
        {shown.length === 0 ? (
          <div role="status" className="py-8">
            <Bell size={28} strokeWidth={1.25} aria-hidden className="text-sky" />
            <p className="mt-4 font-display text-[1.25rem] leading-snug">{only === "unread" && N.items.length > 0 ? t("notif.allRead") : t("notif.empty.title")}</p>
            <p className="mt-2 max-w-[36ch] text-[0.92rem] leading-snug text-cloud/72">{only === "unread" && N.items.length > 0 ? t("notif.upToDate") : t("notif.empty.text")}</p>
            {!N.samplesOn && N.items.length === 0 && <button type="button" onClick={() => N.setSamples(true)} className="mt-4 min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-sky underline underline-offset-4">{t("notif.samples")}</button>}
          </div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {shown.map((n) => { const unread = !N.read.has(n.id); return (
              <li key={n.id}>
                <button type="button" onClick={() => N.markRead([n.id])} className="flex min-h-16 w-full gap-3 py-4 text-left">
                  <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-sky" : "bg-transparent ring-1 ring-silver/30")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-cloud/65"><span>{cat(n.category)}</span>{n.urgent && <span className="text-sunset">{t("notif.urgent")}</span>}{n.sample && <span className="rounded-[6px] border border-cloud/30 px-1.5 py-0.5 text-cloud/72">{t("notif.sample")}</span>}<span className="ml-auto">{clock ? ago(n.at, clock, state.locale) : ""}</span></span>
                    <span className={cn("mt-1 block text-[1rem] leading-snug", unread ? "font-medium text-cloud" : "text-cloud/80")}>{n.title}</span>
                    <span className="mt-0.5 block text-[0.9rem] leading-snug text-cloud/70 [overflow-wrap:anywhere]">{n.body}</span>
                  </span>
                </button>
              </li>
            ); })}
          </ul>
        )}
        {N.samplesOn && <button type="button" onClick={() => N.setSamples(false)} className="mt-4 min-h-11 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">{t("notif.samples.hide")}</button>}
      </Block>

      <Sheet open={prefs} onClose={() => setPrefs(false)} eyebrow={t("notif.title")} title={t("notif.prefs")}>
        <p className="text-[0.88rem] leading-snug text-cloud/72">{t("notif.prefs.hint")}</p>
        <div className="mt-3">{PARTICIPANT_CATEGORIES.map((c) => <Switch key={c.id} on={N.prefs.categories[c.id]} onChange={(v) => N.updatePrefs((x) => ({ ...x, categories: { ...x.categories, [c.id]: v } }))} label={cat(c.id)} hint={t(`notif.cat.${c.id}.hint` as TKey)} />)}</div>
        <div className="mt-6"><PushCard context="" labels={labels} /></div>
      </Sheet>
    </>
  );
}
