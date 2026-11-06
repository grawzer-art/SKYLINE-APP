"use client";
import Link from "next/link";
import { useState } from "react";
import { Bell, Settings2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/v3/ui";
import { PushCard } from "@/components/notifications/PushCard";
import { StaffSection } from "../ui";
import { MissionsGate } from "../missions/Gate";
import { btn, field, label } from "../missions/kit";
import { cn } from "@/lib/cn";
import { ANNOUNCEMENT_LIMITS, AUDIENCE_LABEL, REMINDER_LEAD_LABEL, STAFF_CATEGORIES, canSendAnnouncement, confirmationLabel, validateAnnouncement, type Audience, type NotificationItem, type ReminderLead } from "@/domain/notifications";
import type { Actor } from "@/domain/missions";
import { useStaffNotifications } from "@/lib/notifications/useStaffNotifications";
import { useClock } from "@/lib/useClock";

const catLabel = Object.fromEntries(STAFF_CATEGORIES.map((c) => [c.id, c.label])) as Record<string, string>;
export function ago(iso: string, now: number) {
  const d = now - Date.parse(iso); const m = Math.floor(d / 60_000);
  if (!Number.isFinite(d)) return ""; if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`; const j = Math.floor(h / 24); if (j === 1) return "hier"; if (j < 7) return `il y a ${j} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

/** BOÎTE DE NOTIFICATIONS STAFF : non lu / lu, liens vers l'élément concerné, préférences, annonce (administrateurs, aperçu sans envoi). */
export function NotificationsScreen() {
  return <MissionsGate eyebrow="Organisation" title="Notifications">{({ actor }) => <Body actor={actor} />}</MissionsGate>;
}

function Body({ actor }: { actor: Actor }) {
  const N = useStaffNotifications(); const clock = useClock();
  const [only, setOnly] = useState<"all" | "unread">("all"); const [prefs, setPrefs] = useState(false); const [compose, setCompose] = useState(false);
  const shown = only === "unread" ? N.items.filter((n) => !N.read.has(n.id)) : N.items;
  return (
    <>
      <section aria-label="Actions" className="px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="font-mono text-[0.78rem] uppercase tracking-[0.14em] text-cloud/85">{N.unread > 0 ? `${N.unread} non lue${N.unread > 1 ? "s" : ""}` : "Tout est lu"}</p>
          <div className="flex items-center gap-1">
            {N.unread > 0 && <button type="button" onClick={N.markAllRead} className="inline-flex min-h-11 items-center px-3 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Tout lire</button>}
            <button type="button" onClick={() => setPrefs(true)} aria-haspopup="dialog" aria-label="Préférences de notifications" className="grid size-11 place-items-center rounded-full border border-line transition active:scale-95"><Settings2 size={18} strokeWidth={1.5} aria-hidden /></button>
          </div>
        </div>
        <div role="group" aria-label="Filtre" className="mt-3 flex gap-1 rounded-full border border-silver/40 p-1">
          {([["all", "Toutes"], ["unread", "Non lues"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={only === k} onClick={() => setOnly(k)} className={cn("min-h-11 flex-1 rounded-full px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] transition", only === k ? "bg-cloud text-jet" : "text-cloud/80")}>{l}</button>)}
        </div>
      </section>

      <section aria-label="Notifications" className="px-5 pt-4">
        {shown.length === 0 ? <Empty only={only} N={N} /> : (
          <ul className="divide-y divide-line border-y border-line">
            {shown.map((n) => <li key={n.id}><Row n={n} unread={!N.read.has(n.id)} now={clock} onRead={() => N.markRead([n.id])} /></li>)}
          </ul>
        )}
        {N.samples.allowed && N.samples.on && <button type="button" onClick={() => N.samples.set(false)} className="mt-4 min-h-11 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">Masquer les exemples</button>}
      </section>

      {canSendAnnouncement(actor, "staff") && (
        <StaffSection title="Administrateurs">
          <button type="button" onClick={() => setCompose(true)} aria-haspopup="dialog" className="flex min-h-14 w-full items-center justify-between border-y border-line text-left text-[0.98rem]">Écrire une annonce<span aria-hidden className="text-silver">→</span></button>
        </StaffSection>
      )}

      <PrefsSheet open={prefs} onClose={() => setPrefs(false)} N={N} />
      <ComposeSheet open={compose} onClose={() => setCompose(false)} actor={actor} />
    </>
  );
}

function Row({ n, unread, now, onRead }: { n: NotificationItem; unread: boolean; now: number; onRead: () => void }) {
  const inner = (
    <span className="flex gap-3">
      <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-sky" : "bg-transparent ring-1 ring-silver/30")} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-cloud/65">
          <span>{catLabel[n.category]}</span>{n.urgent && <span className="text-sunset">Urgent</span>}{n.sample && <span className="rounded-[6px] border border-cloud/30 px-1.5 py-0.5 text-cloud/72">Exemple</span>}<span className="ml-auto">{now ? ago(n.at, now) : ""}</span>
        </span>
        <span className={cn("mt-1 block text-[1rem] leading-snug", unread ? "font-medium text-cloud" : "text-cloud/80")}>{n.title}</span>
        <span className="mt-0.5 block text-[0.9rem] leading-snug text-cloud/70 [overflow-wrap:anywhere]">{n.body}</span>
      </span>
    </span>
  );
  const cls = "block min-h-16 w-full py-4 text-left";
  return n.href ? <Link href={n.href} onClick={onRead} className={cls}>{inner}</Link> : <button type="button" onClick={onRead} className={cls}>{inner}</button>;
}

function Empty({ only, N }: { only: "all" | "unread"; N: ReturnType<typeof useStaffNotifications> }) {
  return (
    <div role="status" className="py-10">
      <Bell size={28} strokeWidth={1.25} aria-hidden className="text-sky" />
      <p className="mt-4 font-display text-[1.25rem] leading-snug">{only === "unread" && N.items.length > 0 ? "Tout est lu." : "Rien de nouveau."}</p>
      <p className="mt-2 max-w-[36ch] text-[0.92rem] leading-snug text-cloud/72">{only === "unread" && N.items.length > 0 ? "Vous êtes à jour." : "Vous serez prévenu ici des nouvelles missions et propositions, des validations, des commentaires, des échéances et des annonces."}</p>
      {N.samples.allowed && !N.samples.on && N.items.length === 0 && <button type="button" onClick={() => N.samples.set(true)} className="mt-4 min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-sky underline underline-offset-4">Voir des exemples (démonstration)</button>}
    </div>
  );
}

function PrefsSheet({ open, onClose, N }: { open: boolean; onClose: () => void; N: ReturnType<typeof useStaffNotifications> }) {
  const p = N.prefs;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="Notifications" title="Préférences">
      <p className="text-[0.88rem] leading-snug text-cloud/72">Choisissez ce qui s&apos;affiche dans votre boîte. Enregistré sur cet appareil. Les annonces urgentes s&apos;affichent toujours.</p>
      <div className="mt-3">{STAFF_CATEGORIES.map((c) => <Switch key={c.id} on={p.categories[c.id]} onChange={(v) => N.updatePrefs((x) => ({ ...x, categories: { ...x.categories, [c.id]: v } }))} label={c.label} hint={c.hint} />)}</div>
      <fieldset className="mt-6"><legend className={label}>Rappel d&apos;échéance</legend>
        <div role="radiogroup" aria-label="Rappel d'échéance" className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(REMINDER_LEAD_LABEL) as ReminderLead[]).map((k) => <button key={k} type="button" role="radio" aria-checked={p.reminderLead === k} onClick={() => N.updatePrefs((x) => ({ ...x, reminderLead: k }))} className={cn("min-h-12 rounded-[8px] border px-1.5 text-[0.82rem] leading-tight transition", p.reminderLead === k ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{REMINDER_LEAD_LABEL[k]}</button>)}
        </div>
      </fieldset>
      <div className="mt-6"><PushCard context="Recevez les notifications STAFF sur l'écran verrouillé de cet iPhone, en plus de cette boîte." /></div>
    </Sheet>
  );
}

/** Annonce (ADMINISTRATEURS) : rédaction → confirmation explicite → APERÇU. Phase 1 : aucun envoi réel, aucune écriture. */
function ComposeSheet({ open, onClose, actor }: { open: boolean; onClose: () => void; actor: Actor }) {
  const [audience, setAudience] = useState<Audience>("staff"); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [urgent, setUrgent] = useState(false);
  const [step, setStep] = useState<"edit" | "confirm" | "done">("edit"); const [ok, setOk] = useState(false); const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const reset = () => { setStep("edit"); setOk(false); setErrors({}); }; const close = () => { reset(); onClose(); };
  if (!canSendAnnouncement(actor, audience)) return null;
  const review = (e: React.FormEvent) => { e.preventDefault(); const v = validateAnnouncement({ audience, title, body, urgent }); if (!v.ok) { setErrors(v.errors); return; } setErrors({}); setStep("confirm"); };
  return (
    <Sheet open={open} onClose={close} eyebrow={step === "edit" ? "Administrateurs" : "Confirmation"} title={step === "done" ? "Aperçu terminé" : "Nouvelle annonce"}>
      <p role="note" className="mb-4 rounded-[8px] border border-sky/50 px-3 py-2.5 text-[0.85rem] leading-snug text-cloud/85">Aperçu : dans cette phase, <strong>aucun message n&apos;est envoyé</strong>.</p>
      {step === "edit" && (
        <form onSubmit={review} noValidate className="space-y-5">
          <fieldset><legend className={label}>Destinataires</legend>
            <div role="radiogroup" aria-label="Destinataires" className="mt-2 grid grid-cols-2 gap-2">{(["staff", "participants"] as Audience[]).map((a) => <button key={a} type="button" role="radio" aria-checked={audience === a} onClick={() => setAudience(a)} className={cn("min-h-12 rounded-[8px] border px-2 text-[0.85rem] leading-tight transition", audience === a ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{AUDIENCE_LABEL[a]}</button>)}</div>
          </fieldset>
          <div><label htmlFor="an-title" className={label}>Titre *</label><input id="an-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={ANNOUNCEMENT_LIMITS.title + 20} className={field} />{errors.title && <p role="alert" className="mt-1.5 text-[0.88rem] text-sunset">{errors.title}</p>}</div>
          <div><label htmlFor="an-body" className={label}>Message *</label><textarea id="an-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={cn(field, "min-h-28 py-3")} /><p className="mt-1 text-right font-mono text-[0.7rem] text-dim">{body.length}/{ANNOUNCEMENT_LIMITS.body}</p>{errors.body && <p role="alert" className="mt-1 text-[0.88rem] text-sunset">{errors.body}</p>}</div>
          <Switch on={urgent} onChange={setUrgent} label="Urgent" hint="S'affiche toujours, même si la catégorie est désactivée." />
          <div className="grid gap-3"><button type="submit" className={cn(btn, "bg-cloud text-jet")}>Vérifier</button><button type="button" onClick={close} className={cn(btn, "border border-silver/45")}>Annuler</button></div>
        </form>
      )}
      {step === "confirm" && (
        <div>
          <dl className="divide-y divide-line border-y border-line text-[0.95rem]">
            <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Destinataires</dt><dd className="text-right">{AUDIENCE_LABEL[audience]}</dd></div>
            <div className="py-3"><dt className="text-dim">Titre{urgent ? " · urgent" : ""}</dt><dd className="mt-1 [overflow-wrap:anywhere]">{title.trim()}</dd></div>
            <div className="py-3"><dt className="text-dim">Message</dt><dd className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{body.trim()}</dd></div>
          </dl>
          {audience === "participants" && <p role="alert" className="mt-4 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.88rem] leading-snug"><span className="text-sunset">Envoi global.</span> Ce message serait adressé à tous les participants.</p>}
          <label className="mt-5 flex min-h-12 cursor-pointer items-start gap-3 text-[0.95rem] leading-snug"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[#7cc4ff]" /><span>{confirmationLabel(audience)}</span></label>
          <div className="mt-5 grid gap-3"><button type="button" disabled={!ok} onClick={() => setStep("done")} className={cn(btn, "bg-sky text-jet")}>Confirmer (aperçu)</button><button type="button" onClick={() => setStep("edit")} className={cn(btn, "border border-silver/45")}>Modifier</button></div>
        </div>
      )}
      {step === "done" && (
        <div role="status"><p className="text-[1rem] leading-relaxed text-cloud/90">Le message a été vérifié et confirmé. <strong>Rien n&apos;a été envoyé</strong> : l&apos;envoi réel (administrateurs uniquement, avec cette confirmation) sera activé après validation.</p>
          <button type="button" onClick={() => { setTitle(""); setBody(""); setUrgent(false); close(); }} className={cn(btn, "mt-6 w-full border border-silver/45")}>Fermer</button></div>
      )}
    </Sheet>
  );
}
