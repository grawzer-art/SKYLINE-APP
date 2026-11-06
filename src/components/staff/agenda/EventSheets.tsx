"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { EVENT_KIND_LABEL, canManageEvent, fmtTime, validateEventInput, type AgendaEvent, type EventErrors, type EventInput, type EventKind, type EventScope } from "@/domain/agenda";
import type { Actor } from "@/domain/missions";
import type { useAgendaEvents } from "@/lib/agenda/useAgendaEvents";
import { btn, field, fmtDate, label } from "../missions/kit";

export type EventView = null | { mode: "new"; date: string } | { mode: "detail"; id: string } | { mode: "edit"; id: string } | { mode: "delete"; id: string };
type Api = ReturnType<typeof useAgendaEvents>;

/** Réunions et événements : fiche, création / modification, suppression. Type DISTINCT des missions (aucune mission n'est créée ici). */
export function EventSheets({ view, setView, ev, actor }: { view: EventView; setView: (v: EventView) => void; ev: Api; actor: Actor }) {
  const current = view && "id" in view ? ev.events.find((e) => e.id === view.id) ?? null : null; const close = () => setView(null);
  const title = view?.mode === "new" ? "Nouvel événement" : view?.mode === "edit" ? "Modifier l'événement" : view?.mode === "delete" ? "Supprimer l'événement ?" : current ? EVENT_KIND_LABEL[current.kind] : "Événement";
  return (
    <Sheet open={!!view} onClose={close} eyebrow={view?.mode === "new" || view?.mode === "edit" ? "Agenda" : view?.mode === "delete" ? "Confirmation" : "Agenda"} title={title}>
      {view && "id" in view && !current && <div role="status"><p className="text-[1rem] leading-relaxed text-cloud/85">Cet événement n&apos;existe plus.</p><button type="button" onClick={close} className={cn(btn, "mt-5 border border-silver/45")}>Fermer</button></div>}
      {view?.mode === "new" && <EventForm initial={null} date={view.date} actor={actor} ev={ev} onDone={close} onCancel={close} />}
      {view?.mode === "edit" && current && <EventForm initial={current} date={current.date} actor={actor} ev={ev} onDone={() => setView({ mode: "detail", id: current.id })} onCancel={() => setView({ mode: "detail", id: current.id })} />}
      {view?.mode === "detail" && current && <EventDetail e={current} actor={actor} onEdit={() => setView({ mode: "edit", id: current.id })} onDelete={() => setView({ mode: "delete", id: current.id })} />}
      {view?.mode === "delete" && current && (
        <div><p className="text-[1rem] leading-relaxed text-cloud/85">« {current.title} » sera supprimé de cet appareil. Cette action est définitive.</p>
          <div className="mt-6 grid gap-3"><button type="button" onClick={() => { ev.remove(current.id, actor.memberId, actor.coordinator); close(); }} className={cn(btn, "bg-sunset text-jet")}>Supprimer</button><button type="button" onClick={() => setView({ mode: "detail", id: current.id })} className={cn(btn, "border border-silver/45")}>Annuler</button></div></div>
      )}
    </Sheet>
  );
}

function EventDetail({ e, actor, onEdit, onDelete }: { e: AgendaEvent; actor: Actor; onEdit: () => void; onDelete: () => void }) {
  return (
    <div>
      <h3 className="font-display text-[1.5rem] leading-tight [overflow-wrap:anywhere]">{e.title}</h3>
      <dl className="mt-4 divide-y divide-line border-y border-line text-[0.95rem]">
        <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Date</dt><dd>{fmtDate(e.date)}</dd></div>
        <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Horaire</dt><dd>{e.startTime ? `${fmtTime(e.startTime)}${e.endTime ? ` – ${fmtTime(e.endTime)}` : ""}` : "Toute la journée"}</dd></div>
        {e.place && <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Lieu</dt><dd className="text-right">{e.place}</dd></div>}
        <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Visible par</dt><dd>{e.scope === "team" ? "Toute l'équipe" : "Moi seulement"}</dd></div>
      </dl>
      <p className="mt-3 text-[0.82rem] text-dim">Enregistré sur cet appareil uniquement (aperçu) : non partagé avec l&apos;équipe.</p>
      {canManageEvent(e, actor.memberId, actor.coordinator) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          {e.creatorId === actor.memberId && <button type="button" onClick={onEdit} className={cn(btn, "min-h-11 border border-silver/45 px-5")}>Modifier</button>}
          <button type="button" onClick={onDelete} className={cn(btn, "min-h-11 px-0 text-sunset underline underline-offset-4")}>Supprimer</button>
        </div>
      )}
    </div>
  );
}

function EventForm({ initial, date, actor, ev, onDone, onCancel }: { initial: AgendaEvent | null; date: string; actor: Actor; ev: Api; onDone: () => void; onCancel: () => void }) {
  const [v, setV] = useState<EventInput>(initial ? { title: initial.title, kind: initial.kind, date: initial.date, startTime: initial.startTime, endTime: initial.endTime, place: initial.place, scope: initial.scope } : { title: "", kind: "meeting", date, startTime: null, endTime: null, place: "", scope: "team" });
  const [errors, setErrors] = useState<EventErrors>({}); const [fail, setFail] = useState<string | null>(null);
  const set = <K extends keyof EventInput>(k: K, x: EventInput[K]) => setV((p) => ({ ...p, [k]: x }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setFail(null); const chk = validateEventInput(v); if (!chk.ok) { setErrors(chk.errors); return; } setErrors({});
    const r = initial ? ev.update(initial.id, v, actor.memberId, actor.coordinator) : ev.create(v, actor.memberId);
    if (!r.ok) { setFail(r.reason); return; } onDone();
  };
  const err = (k: keyof EventErrors) => errors[k] && <p role="alert" className="mt-1.5 text-[0.88rem] text-sunset">{errors[k]}</p>;
  const seg = <T extends string>(name: string, value: T, options: readonly [T, string][], onChange: (x: T) => void) => (
    <div role="radiogroup" aria-label={name} className="mt-2 grid grid-cols-2 gap-2">{options.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)} className={cn("min-h-12 rounded-[8px] border px-2 text-[0.9rem] transition", value === k ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{l}</button>)}</div>
  );
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div><label htmlFor="ev-title" className={label}>Titre *</label><input id="ev-title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={100} aria-invalid={!!errors.title} className={field} />{err("title")}</div>
      <fieldset><legend className={label}>Type</legend>{seg<EventKind>("Type", v.kind, [["meeting", "Réunion"], ["event", "Événement"]], (k) => set("kind", k))}</fieldset>
      <div><label htmlFor="ev-date" className={label}>Date</label><input id="ev-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} className={field} />{err("date")}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="ev-start" className={label}>Début</label><input id="ev-start" type="time" value={v.startTime ?? ""} onChange={(e) => set("startTime", e.target.value || null)} className={field} />{err("startTime")}</div>
        <div><label htmlFor="ev-end" className={label}>Fin</label><input id="ev-end" type="time" value={v.endTime ?? ""} disabled={!v.startTime} onChange={(e) => set("endTime", e.target.value || null)} className={field} />{err("endTime")}</div>
      </div>
      <div><label htmlFor="ev-place" className={label}>Lieu</label><input id="ev-place" value={v.place} onChange={(e) => set("place", e.target.value)} maxLength={100} className={field} />{err("place")}</div>
      <fieldset><legend className={label}>Visible par</legend>{seg<EventScope>("Visible par", v.scope, [["team", "Toute l'équipe"], ["me", "Moi seulement"]], (k) => set("scope", k))}</fieldset>
      {fail && <p role="alert" className="text-[0.92rem] text-sunset">{fail}</p>}
      <div className="grid gap-3 pt-1"><button type="submit" className={cn(btn, "bg-cloud text-jet")}>{initial ? "Enregistrer" : "Créer l'événement"}</button><button type="button" onClick={onCancel} className={cn(btn, "border border-silver/45")}>Annuler</button></div>
    </form>
  );
}
