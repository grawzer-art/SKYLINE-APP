"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar, DemoLine, StaffSection, StaffTitle } from "./ui";
import { activeMembers, getStaffMember, validatorIds } from "@/data/staff";
import {
  MISSION_PRIORITIES, MISSION_STATUSES, PRIORITY_LABEL, STATUS_LABEL, LIMITS, allowedStatusTransitions, canDelete, canEdit, canView, canViewAll, countByStatus, createMission,
  daysLate, filterMissions, isOverdue, sortMissions, validateMissionInput, type Actor, type Mission, type MissionErrors, type MissionInput, type MissionPriority, type MissionStatus,
} from "@/domain/missions";
import { useActor } from "@/lib/useActor";
import { useDemoStatus } from "./SpaceSwitcher";
import { useClock } from "@/lib/useClock";
import { useMissions } from "@/lib/useMissions";
import { cn } from "@/lib/cn";

const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (iso: string, n: number) => { const [y, m, d] = iso.split("-").map(Number); return localISO(new Date(y, m - 1, d + n)); };
const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d)); };
const fmtWhen = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const name = (id: string) => getStaffMember(id)?.name ?? "—";

const statusStyle: Record<MissionStatus, string> = { todo: "border-silver/50 text-cloud/85", in_progress: "border-sky text-sky", review: "border-sunset text-sunset", done: "border-cloud/20 bg-cloud/10 text-cloud/70" };
const StatusPill = ({ s }: { s: MissionStatus }) => <span className={cn("inline-flex min-h-7 items-center rounded-full border px-3 font-mono text-[0.72rem] uppercase tracking-[0.1em]", statusStyle[s])}>{STATUS_LABEL[s]}</span>;
const stripe: Record<MissionPriority, string> = { urgent: "bg-sunset", high: "bg-sky", normal: "bg-cloud/15" };
const field = "mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky";
const label = "block font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/72";
const btn = "inline-flex min-h-12 items-center justify-center rounded-full px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] transition active:scale-[0.97] disabled:opacity-40";

type View = null | { mode: "detail"; id: string } | { mode: "form"; id: string | null } | { mode: "delete"; id: string } | { mode: "clear" };

/** MISSIONS : suivi opérationnel de l'équipe active. Persistance LOCALE (cet appareil) — non synchronisée entre comptes. */
export function MissionsScreen() {
  const who = useActor(); const clock = useClock(); const M = useMissions(); const supa = useDemoStatus()?.mode === "supabase";
  const today = clock ? localISO(new Date(clock)) : null;
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [fStatus, setFStatus] = useState<MissionStatus | "">(""); const [fPrio, setFPrio] = useState<MissionPriority | "">(""); const [fMember, setFMember] = useState("");
  const [view, setView] = useState<View>(null);

  if (who.status !== "ok") return <><StaffTitle eyebrow="Opérationnel" title="Missions" />{who.status === "none" && <StaffSection><p role="status" className="max-w-[34ch] border-l border-sky pl-4 text-[1rem] font-light leading-snug">Ce compte n&apos;est pas rattaché à un membre de l&apos;équipe active (Tom, Graw, Qafard).</p></StaffSection>}</>;
  const actor = who.actor;
  const effScope = canViewAll(actor) ? scope : "mine";

  const visible = M.missions.filter((m) => !m.archivedAt && canView(actor, m));
  const pool = effScope === "all" ? visible : visible.filter((m) => m.assigneeId === actor.memberId);
  const counts = countByStatus(pool);
  const late = pool.filter((m) => isOverdue(m, today)).length;
  const list = sortMissions(filterMissions(pool, { status: fStatus || undefined, priority: fPrio || undefined, assigneeId: effScope === "all" && fMember ? fMember : undefined }), today);
  const filtered = !!(fStatus || fPrio || (effScope === "all" && fMember));
  const current = view && "id" in view && view.id ? M.missions.find((m) => m.id === view.id) ?? null : null;

  const loadExamples = () => {
    const t = today ?? localISO(new Date(0)); const tom: Actor = { memberId: "tom", coordinator: true }; const ids = activeMembers().map((m) => m.id); const out: Mission[] = [];
    const specs: [string, string, MissionInput["priority"], MissionStatus, number, string, string][] = [
      ["[Exemple] Valider la direction visuelle", "graw", "high", "in_progress", 5, "tom", "Mission d'exemple."],
      ["[Exemple] Repérage photo", "qafard", "normal", "todo", 12, "tom", "Mission d'exemple."],
      ["[Exemple] Préparer le brief équipe", "tom", "urgent", "todo", -2, "graw", "Mission d'exemple en retard."],
      ["[Exemple] Sélection des images", "qafard", "normal", "review", 3, "graw", "Mission d'exemple à valider."],
    ];
    specs.forEach(([title, assigneeId, priority, status, d, validatorId, description], i) => { const r = createMission({ title, description, assigneeId, validatorId, dueDate: addDays(t, d), priority, status }, tom, ids, new Date().toISOString(), `ex-${Date.now().toString(36)}-${i}`, validatorIds()); if (r.ok) out.push(r.value); });
    M.addMany(out);
  };

  return (
    <>
      <StaffTitle eyebrow="Opérationnel" title="Missions">
        <p role="note" className="mt-4 max-w-[36ch] border-l border-sky pl-4 text-[0.9rem] leading-snug text-cloud/80">{supa ? "Données locales de démonstration, enregistrées sur cet appareil pour votre compte uniquement. Elles ne sont ni partagées avec l'équipe ni enregistrées dans la base." : "Enregistré sur cet appareil uniquement : pas de synchronisation entre Tom, Graw et Qafard."}</p>
      </StaffTitle>

      <section aria-label="Compteurs" className="px-5 pt-7">
        <dl className="grid grid-cols-3 border-y border-line py-5">
          {([["À faire", counts.todo], ["En cours", counts.in_progress], ["Terminées", counts.done]] as const).map(([l, n], i) => (
            <div key={l} className={cn("px-1", i > 0 && "border-l border-line pl-4")}><dd className="font-display text-[2.6rem] leading-none">{n}</dd><dt className="mt-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-cloud/72">{l}</dt></div>
          ))}
        </dl>
        {(counts.review > 0 || late > 0) && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.78rem] uppercase tracking-[0.12em]">
            {counts.review > 0 && <span className="text-sunset">{counts.review} en validation</span>}{late > 0 && <span className="text-sunset">{late} en retard</span>}
          </p>
        )}
      </section>

      <section className="px-5 pt-6" aria-label="Affichage">
        <div>
          {canViewAll(actor) ? (
            <div role="group" aria-label="Périmètre" className="flex gap-1 rounded-full border border-silver/40 p-1">
              {([["mine", "Mes missions"], ["all", "Toutes"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={effScope === k} onClick={() => setScope(k)} className={cn("min-h-11 rounded-full px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] transition", effScope === k ? "bg-cloud text-jet" : "text-cloud/80")}>{l}</button>)}
            </div>
          ) : <h2 className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-cloud/80">Mes missions</h2>}
          <button type="button" onClick={() => setView({ mode: "form", id: null })} aria-haspopup="dialog" className={cn(btn, "mt-3 w-full gap-1.5 bg-sky text-jet")}><Plus size={16} strokeWidth={2} aria-hidden />Nouvelle mission</button>
        </div>
        <div className={cn("mt-4 grid gap-2", effScope === "all" ? "grid-cols-3" : "grid-cols-2")}>
          {effScope === "all" && <label className="block"><span className="sr-only">Filtrer par membre</span><select value={fMember} onChange={(e) => setFMember(e.target.value)} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-3 text-[0.9rem]"><option value="">Membre</option>{activeMembers().map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
          <label className="block"><span className="sr-only">Filtrer par statut</span><select value={fStatus} onChange={(e) => setFStatus(e.target.value as MissionStatus | "")} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-3 text-[0.9rem]"><option value="">Statut</option>{MISSION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
          <label className="block"><span className="sr-only">Filtrer par priorité</span><select value={fPrio} onChange={(e) => setFPrio(e.target.value as MissionPriority | "")} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-3 text-[0.9rem]"><option value="">Priorité</option>{MISSION_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
        </div>
        <p role="status" aria-live="polite" className="mt-4 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-cloud/72">{list.length} {list.length > 1 ? "missions" : "mission"}{filtered ? " · filtres actifs" : ""}</p>
      </section>

      <section className="px-5 pt-3" aria-label="Liste des missions">
        {list.length === 0 ? (
          <div role="status" className="py-8">
            <p className="font-display text-[1.25rem] leading-snug">{filtered ? "Aucune mission ne correspond aux filtres." : pool.length === 0 && M.missions.length === 0 ? "Aucune mission pour le moment." : "Aucune mission dans cette vue."}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {filtered ? <button type="button" onClick={() => { setFStatus(""); setFPrio(""); setFMember(""); }} className={cn(btn, "border border-silver/45")}>Effacer les filtres</button> : <button type="button" onClick={() => setView({ mode: "form", id: null })} className={cn(btn, "bg-cloud text-jet")}>Créer une mission</button>}
              {!supa && !filtered && M.missions.length === 0 && canViewAll(actor) && <button type="button" onClick={loadExamples} className="min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-sky underline underline-offset-4">Charger 4 missions d&apos;exemple</button>}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((m) => {
              const od = isOverdue(m, today);
              return (
                <li key={m.id}>
                  <button type="button" onClick={() => setView({ mode: "detail", id: m.id })} aria-haspopup="dialog" className="relative block w-full overflow-hidden rounded-[10px] border border-line bg-surface-1 p-4 pl-5 text-left transition active:scale-[0.99]">
                    <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", stripe[m.priority])} />
                    <span className="flex items-start justify-between gap-3"><span className="text-[1.05rem] leading-snug">{m.title}</span>{m.priority !== "normal" && <span className={cn("shrink-0 font-mono text-[0.72rem] uppercase tracking-[0.12em]", m.priority === "urgent" ? "text-sunset" : "text-sky")}>{PRIORITY_LABEL[m.priority]}</span>}</span>
                    <span className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                      <span className="flex items-center gap-2 text-[0.9rem] text-cloud/85"><Avatar name={name(m.assigneeId)} size={26} />{name(m.assigneeId)}</span>
                      <span className="flex items-center gap-3">
                        {m.dueDate && <span className={cn("font-mono text-[0.78rem] uppercase tracking-[0.1em]", od ? "text-sunset" : "text-cloud/72")}>{od && today ? `En retard · ${daysLate(m, today)} j` : fmtDate(m.dueDate)}</span>}
                        <StatusPill s={m.status} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {M.missions.length > 0 && <button type="button" onClick={() => setView({ mode: "clear" })} aria-haspopup="dialog" className="mt-8 min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">{supa ? "Effacer mes missions locales de cet appareil" : "Effacer toutes les missions de cet appareil"}</button>}
      </section>
      <DemoLine />

      <Sheet open={!!view} onClose={() => setView(null)} eyebrow={view?.mode === "form" ? (view.id ? "Modifier" : "Nouvelle") : view?.mode === "delete" || view?.mode === "clear" ? "Confirmation" : "Mission"} title={view?.mode === "form" ? (view.id ? "Modifier la mission" : "Nouvelle mission") : view?.mode === "delete" ? "Supprimer la mission ?" : view?.mode === "clear" ? "Tout effacer ?" : current?.title ?? ""}>
        {view?.mode === "detail" && current && <Detail m={current} actor={actor} today={today} M={M} onEdit={() => setView({ mode: "form", id: current.id })} onDelete={() => setView({ mode: "delete", id: current.id })} />}
        {view?.mode === "form" && <Form key={view.id ?? "new"} m={current} actor={actor} M={M} onDone={(id) => setView(id ? { mode: "detail", id } : null)} onCancel={() => setView(current ? { mode: "detail", id: current.id } : null)} />}
        {view?.mode === "delete" && current && (
          <div><p className="text-[1rem] leading-relaxed text-cloud/85">« {current.title} » sera supprimée de cet appareil. Cette action est définitive.</p>
            <div className="mt-6 grid gap-3"><button type="button" onClick={() => { M.remove(current.id, actor); setView(null); }} className={cn(btn, "bg-sunset text-jet")}>Supprimer</button><button type="button" onClick={() => setView({ mode: "detail", id: current.id })} className={cn(btn, "border border-silver/45")}>Annuler</button></div></div>
        )}
        {view?.mode === "clear" && (
          <div><p className="text-[1rem] leading-relaxed text-cloud/85">Toutes les missions enregistrées sur cet appareil seront supprimées, y compris celles des autres membres sur cet appareil. Cette action est définitive.</p>
            <div className="mt-6 grid gap-3"><button type="button" onClick={() => { M.clearAll(); setView(null); }} className={cn(btn, "bg-sunset text-jet")}>Tout effacer</button><button type="button" onClick={() => setView(null)} className={cn(btn, "border border-silver/45")}>Annuler</button></div></div>
        )}
      </Sheet>
    </>
  );
}

function Detail({ m, actor, today, M, onEdit, onDelete }: { m: Mission; actor: Actor; today: string | null; M: ReturnType<typeof useMissions>; onEdit: () => void; onDelete: () => void }) {
  const [note, setNote] = useState(""); const [err, setErr] = useState<string | null>(null);
  const next = allowedStatusTransitions(actor, m); const od = isOverdue(m, today);
  const canValidate = m.status === "review" && (m.validatorId === actor.memberId || actor.coordinator);
  const go = (to: MissionStatus) => { const r = M.setStatus(m.id, to, actor, note); if (!r.ok) setErr(r.reason); else { setErr(null); setNote(""); } };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3"><StatusPill s={m.status} /><span className={cn("font-mono text-[0.78rem] uppercase tracking-[0.12em]", m.priority === "urgent" ? "text-sunset" : m.priority === "high" ? "text-sky" : "text-cloud/72")}>Priorité {PRIORITY_LABEL[m.priority].toLowerCase()}</span></div>
      {m.description && <p className="mt-4 whitespace-pre-wrap text-[1rem] leading-relaxed text-cloud/85">{m.description}</p>}
      <dl className="mt-5 divide-y divide-line border-y border-line text-[0.95rem]">
        <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Responsable</dt><dd>{name(m.assigneeId)}</dd></div>
        <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Validation par</dt><dd>{name(m.validatorId)}</dd></div>
        <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Échéance</dt><dd className={od ? "text-sunset" : ""}>{m.dueDate ? `${fmtDate(m.dueDate)}${od && today ? ` · en retard de ${daysLate(m, today)} j` : ""}` : "Aucune"}</dd></div>
      </dl>

      {(next.length > 0) && (
        <div className="mt-6" role="group" aria-label="Changer le statut">
          <p className={label}>{canValidate ? "Validation" : "Statut"}</p>
          {(canValidate || next.some((s) => s === "done" || m.status === "review")) && <label className="mt-3 block"><span className="sr-only">Note (facultative)</span><input value={note} maxLength={LIMITS.note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultative)" className={cn(field, "mt-0")} /></label>}
          <div className="mt-3 flex flex-wrap gap-2">
            {canValidate && <button type="button" onClick={() => go("done")} className={cn(btn, "min-h-11 bg-sky px-5 text-jet")}>Valider · terminée</button>}
            {next.filter((s) => !(canValidate && s === "done")).map((s) => <button key={s} type="button" onClick={() => go(s)} className={cn(btn, "min-h-11 border border-silver/45 px-5")}>{canValidate && s === "in_progress" ? "Renvoyer en cours" : s === "review" ? "Envoyer en validation" : STATUS_LABEL[s]}</button>)}
          </div>
          {err && <p role="alert" className="mt-3 text-[0.9rem] text-sunset">{err}</p>}
        </div>
      )}

      <div className="mt-7"><p className={label}>Historique</p>
        <ol className="mt-3 space-y-3 border-l border-silver/30 pl-4">
          {[...m.history].reverse().map((h) => (
            <li key={h.id} className="text-[0.92rem] leading-snug"><span className="block font-mono text-[0.72rem] uppercase tracking-[0.1em] text-dim">{fmtWhen(h.at)}</span>
              {name(h.by)} {h.kind === "created" ? "a créé la mission" : h.kind === "edited" ? "a modifié la mission" : h.kind === "validated" ? "a validé la mission" : h.kind === "returned" ? "a renvoyé la mission en cours" : <>a changé le statut : {h.from ? STATUS_LABEL[h.from] : ""} → {h.to ? STATUS_LABEL[h.to] : ""}</>}
              {h.note && h.kind !== "edited" && <span className="block text-cloud/72">« {h.note} »</span>}</li>
          ))}
        </ol>
      </div>

      {(canEdit(actor, m) || canDelete(actor, m)) && (
        <div className="mt-7 flex flex-wrap gap-3">
          {canEdit(actor, m) && <button type="button" onClick={onEdit} className={cn(btn, "border border-silver/45")}>Modifier</button>}
          {canDelete(actor, m) && <button type="button" onClick={onDelete} className={cn(btn, "text-sunset underline underline-offset-4")}>Supprimer</button>}
        </div>
      )}
    </div>
  );
}

function Form({ m, actor, M, onDone, onCancel }: { m: Mission | null; actor: Actor; M: ReturnType<typeof useMissions>; onDone: (id: string | null) => void; onCancel: () => void }) {
  const members = activeMembers(); const ids = members.map((x) => x.id);
  const vids = validatorIds(); const validators = members.filter((x) => vids.includes(x.id));
  const firstOther = (assignee: string) => validators.find((x) => x.id !== assignee)?.id ?? "";
  const [v, setV] = useState<MissionInput>(m ? { title: m.title, description: m.description, assigneeId: m.assigneeId, validatorId: m.validatorId, dueDate: m.dueDate, priority: m.priority, status: m.status } : { title: "", description: "", assigneeId: actor.memberId, validatorId: firstOther(actor.memberId), dueDate: null, priority: "normal", status: "todo" });
  const [errors, setErrors] = useState<MissionErrors>({}); const [fail, setFail] = useState<string | null>(null);
  const set = <K extends keyof MissionInput>(k: K, x: MissionInput[K]) => setV((p) => ({ ...p, [k]: x }));
  const assignees = actor.coordinator ? members : members.filter((x) => x.id === actor.memberId);
  // Statuts proposés : l'actuel + ceux que l'utilisateur a le droit d'atteindre (création : jamais « Terminée » hors coordinateur).
  const statusChoices = m ? [m.status, ...allowedStatusTransitions(actor, m)] : MISSION_STATUSES.filter((s) => actor.coordinator || s !== "done");
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setFail(null);
    const chk = validateMissionInput(v, ids, vids); if (!chk.ok) { setErrors(chk.errors); return; } setErrors({});
    const r = m ? M.update(m.id, v, actor) : M.create(v, actor);
    if (!r.ok) { setFail(r.reason); return; } onDone(r.mission.id);
  };
  const err = (k: keyof MissionErrors) => errors[k] && <p id={`e-${k}`} role="alert" className="mt-1.5 text-[0.88rem] text-sunset">{errors[k]}</p>;
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div><label htmlFor="f-title" className={label}>Titre *</label><input id="f-title" value={v.title} maxLength={LIMITS.title + 20} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} aria-describedby={errors.title ? "e-title" : undefined} className={field} />{err("title")}</div>
      <div><label htmlFor="f-desc" className={label}>Description</label><textarea id="f-desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} aria-describedby={errors.description ? "e-description" : undefined} className={cn(field, "min-h-24 py-3")} />{err("description")}</div>
      <div><label htmlFor="f-assignee" className={label}>Responsable</label><select id="f-assignee" value={v.assigneeId} onChange={(e) => { const a = e.target.value; setV((p) => ({ ...p, assigneeId: a, validatorId: p.validatorId === a ? firstOther(a) : p.validatorId })); }} className={field}>{assignees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>{err("assigneeId")}</div>
      <div><label htmlFor="f-validator" className={label}>Validation par</label><select id="f-validator" value={v.validatorId} onChange={(e) => set("validatorId", e.target.value)} aria-describedby={errors.validatorId ? "e-validatorId" : undefined} className={field}>{validators.filter((x) => x.id !== v.assigneeId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>{err("validatorId")}</div>
      <div><label htmlFor="f-due" className={label}>Échéance</label><input id="f-due" type="date" value={v.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value || null)} className={field} />{err("dueDate")}</div>
      <fieldset><legend className={label}>Priorité</legend><div role="radiogroup" aria-label="Priorité" className="mt-2 grid grid-cols-3 gap-2">{MISSION_PRIORITIES.map((p) => <button key={p} type="button" role="radio" aria-checked={v.priority === p} onClick={() => set("priority", p)} className={cn("min-h-12 rounded-[8px] border px-2 text-[0.9rem] transition", v.priority === p ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{PRIORITY_LABEL[p]}</button>)}</div></fieldset>
      <div><label htmlFor="f-status" className={label}>Statut</label><select id="f-status" value={v.status} onChange={(e) => set("status", e.target.value as MissionStatus)} className={field}>{statusChoices.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>{err("status")}</div>
      {fail && <p role="alert" className="text-[0.92rem] text-sunset">{fail}</p>}
      <div className="grid gap-3 pt-1"><button type="submit" className={cn(btn, "bg-cloud text-jet")}>Enregistrer</button><button type="button" onClick={onCancel} className={cn(btn, "border border-silver/45")}>Annuler</button></div>
    </form>
  );
}
