"use client";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { LIMITS, PRIORITY_LABEL, STATUS_LABEL, allowedStatusTransitions, canArchive, canAssign, canDelete, canEdit, canResolveAssignment, daysLate, isOverdue, type Actor, type HistoryEntry, type Mission, type MissionStatus } from "@/domain/missions";
import type { MissionComment } from "@/lib/missions/service";
import type { ActionResult, MissionsApi } from "@/lib/missions/types";
import { ActionNotice, SkeletonList, StatusPill, btn, field, fmtDate, fmtWhen, label, useAction } from "./kit";

const Section = ({ title, children, id }: { title: string; children: React.ReactNode; id: string }) => (
  <section aria-labelledby={`s-${id}`} className="mt-7 border-t border-line pt-5"><h3 id={`s-${id}`} className={label}>{title}</h3>{children}</section>
);
const FIELD_FR: Record<string, string> = { title: "titre", description: "description", validatorId: "validateur", dueDate: "échéance", priority: "priorité", project: "projet" };

type Props = { m: Mission; actor: Actor; today: string | null; M: MissionsApi; onEditInfo: () => void; onArchive: () => void; onDelete: () => void };

/** FICHE MISSION : informations · attribution · statut · commentaires · historique. Chaque section a ses propres états (chargement / résultat / erreur). */
export function MissionDetail({ m, actor, today, M, onEditInfo, onArchive, onDelete }: Props) {
  const { name } = M.directory; const od = isOverdue(m, today);
  const who = (id: string) => name(id);
  // Base de données : la suppression est réservée aux administrateurs (fonction delete_mission). Local : le créateur peut aussi supprimer.
  const mayDelete = M.source === "db" ? actor.coordinator : canDelete(actor, m);
  const person = (note?: string) => (note && M.directory.members.some((x) => x.id === note) ? name(note) : note ?? "");
  return (
    <div>
      {/* Titre de la mission dans le contenu (et non dans l'en-tête de la fenêtre) : un mot très long ne peut pas faire déborder l'écran. */}
      <h3 className="font-display text-[1.5rem] leading-tight [overflow-wrap:anywhere]">{m.title}</h3>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusPill s={m.status} />
        <span className={cn("font-mono text-[0.78rem] uppercase tracking-[0.12em]", m.priority === "urgent" ? "text-sunset" : m.priority === "high" ? "text-sky" : "text-cloud/72")}>Priorité {PRIORITY_LABEL[m.priority].toLowerCase()}</span>
        {m.archivedAt && <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-dim">Archivée</span>}
      </div>

      <Section id="info" title="Informations">
        {m.description ? <p className="mt-3 whitespace-pre-wrap text-[1rem] leading-relaxed text-cloud/85">{m.description}</p> : <p className="mt-3 text-[0.95rem] text-dim">Aucune description.</p>}
        <dl className="mt-4 divide-y divide-line border-y border-line text-[0.95rem]">
          <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Validation par</dt><dd>{who(m.validatorId)}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Créée par</dt><dd>{who(m.creatorId)}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Échéance</dt><dd className={od ? "text-sunset" : ""}>{m.dueDate ? `${fmtDate(m.dueDate)}${od && today ? ` · en retard de ${daysLate(m, today)} j` : ""}` : "Aucune"}</dd></div>
        </dl>
        {canEdit(actor, m) && !m.archivedAt && <button type="button" onClick={onEditInfo} className={cn(btn, "mt-4 min-h-11 border border-silver/45 px-5")}>Modifier les informations</button>}
      </Section>

      <Assignment m={m} actor={actor} M={M} />
      <StatusSection m={m} actor={actor} M={M} />
      {M.comments.supported && <Comments m={m} M={M} actor={actor} />}

      <Section id="history" title="Historique">
        <ol className="mt-3 space-y-3 border-l border-silver/30 pl-4">
          {[...m.history].reverse().map((h) => (
            <li key={h.id} className="text-[0.92rem] leading-snug"><span className="block font-mono text-[0.72rem] uppercase tracking-[0.1em] text-dim">{fmtWhen(h.at)}</span>
              {who(h.by)} {historyText(h, person)}
              {h.note && !["edited", "assignment_proposed", "reassigned"].includes(h.kind) && !M.directory.members.some((x) => x.id === h.note) && <span className="block text-cloud/72">« {h.note} »</span>}</li>
          ))}
        </ol>
      </Section>

      {(canArchive(actor, m) || mayDelete) && (
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
          {canArchive(actor, m) && <button type="button" onClick={onArchive} className={cn(btn, "min-h-11 border border-silver/45 px-5")}>Archiver</button>}
          {mayDelete && <button type="button" onClick={onDelete} className={cn(btn, "min-h-11 px-0 text-sunset underline underline-offset-4")}>Supprimer</button>}
        </div>
      )}
    </div>
  );
}

function historyText(h: HistoryEntry, person: (n?: string) => string) {
  switch (h.kind) {
    case "created": return "a créé la mission";
    case "edited": return `a modifié les informations${h.note ? ` (${h.note.split(", ").map((k) => FIELD_FR[k] ?? k).join(", ")})` : ""}`;
    case "validated": return "a validé la mission";
    case "returned": return "a renvoyé la mission en cours";
    case "assignment_proposed": return `a proposé une attribution à ${person(h.note)}`;
    case "assignment_approved": return "a approuvé la proposition d'attribution";
    case "assignment_rejected": return "a refusé la proposition d'attribution";
    case "reassigned": return `a attribué la mission à ${person(h.note)}`;
    case "archived": return "a archivé la mission";
    default: return `a changé le statut : ${h.from ? STATUS_LABEL[h.from] : ""} → ${h.to ? STATUS_LABEL[h.to] : ""}`;
  }
}

/** ATTRIBUTION : responsable actuel, proposition en attente (approuver / refuser), réattribution ou proposition. */
function Assignment({ m, actor, M }: { m: Mission; actor: Actor; M: MissionsApi }) {
  const { members, name } = M.directory; const [target, setTarget] = useState(""); const [note, setNote] = useState("");
  const assign = useAction((to: string) => M.assign(m.id, to, actor));
  const resolve = useAction((approve: boolean) => M.resolve(m.id, approve, actor, note));
  const options = members.filter((x) => x.id !== m.assigneeId && x.id !== m.validatorId);
  const direct = actor.coordinator;
  return (
    <Section id="assign" title="Attribution">
      <dl className="mt-3 divide-y divide-line border-y border-line text-[0.95rem]">
        <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Responsable</dt><dd>{name(m.assigneeId)}</dd></div>
        {m.proposedAssigneeId && <div className="flex justify-between gap-4 py-3"><dt className="text-dim">Proposition en attente</dt><dd className="text-sky">{name(m.proposedAssigneeId)}</dd></div>}
      </dl>

      {canResolveAssignment(actor, m) && (
        <div className="mt-4" role="group" aria-label="Décision sur la proposition">
          <label className="block"><span className="sr-only">Note (facultative)</span><input value={note} maxLength={LIMITS.note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultative)" disabled={resolve.pending} className={cn(field, "mt-0")} /></label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={resolve.pending} onClick={() => resolve.run(true).then((r) => { if (r?.ok) setNote(""); })} className={cn(btn, "min-h-11 bg-sky px-5 text-jet")}>Approuver</button>
            <button type="button" disabled={resolve.pending} onClick={() => resolve.run(false).then((r) => { if (r?.ok) setNote(""); })} className={cn(btn, "min-h-11 border border-silver/45 px-5")}>Refuser</button>
          </div>
        </div>
      )}
      {/* Hors du bloc conditionnel : le résultat reste visible même quand la proposition vient d'être traitée (le bloc disparaît). */}
      <ActionNotice pending={resolve.pending} result={resolve.result} doing="Décision en cours…" done="Décision enregistrée." onReload={M.refresh} />

      {canAssign(actor, m) && options.length > 0 && (
        <div className="mt-5">
          <label htmlFor={`as-${m.id}`} className={label}>{direct ? "Attribuer à" : "Proposer une attribution à"}</label>
          <select id={`as-${m.id}`} value={target} onChange={(e) => setTarget(e.target.value)} disabled={assign.pending} className={field}><option value="">Choisir une personne</option>{options.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          {!direct && <p className="mt-2 text-[0.85rem] leading-snug text-cloud/72">Une proposition ne change rien tant qu&apos;un administrateur ne l&apos;a pas approuvée.</p>}
          <button type="button" disabled={!target || assign.pending} onClick={() => assign.run(target).then((r) => { if (r?.ok) setTarget(""); })} className={cn(btn, "mt-3 min-h-11 border border-silver/45 px-5")}>{direct ? "Attribuer" : "Proposer"}</button>
        </div>
      )}
      <ActionNotice pending={assign.pending} result={assign.result} doing={direct ? "Attribution en cours…" : "Envoi de la proposition…"} done={direct ? "Mission attribuée." : "Proposition envoyée."} onReload={M.refresh} />
    </Section>
  );
}

/** STATUT : transitions autorisées (indication) ; la base décide et refuse tout changement non permis. */
function StatusSection({ m, actor, M }: { m: Mission; actor: Actor; M: MissionsApi }) {
  const [note, setNote] = useState(""); const next = allowedStatusTransitions(actor, m);
  const act = useAction((to: MissionStatus) => M.setStatus(m.id, to, actor, note));
  const canValidate = m.status === "review" && (m.validatorId === actor.memberId || actor.coordinator);
  const go = (to: MissionStatus) => act.run(to).then((r) => { if (r?.ok) setNote(""); });
  return (
    <Section id="status" title={canValidate ? "Validation" : "Statut"}>
      {next.length === 0 ? <p className="mt-3 text-[0.95rem] text-dim">{m.archivedAt ? "Mission archivée." : "Aucun changement de statut possible pour vous."}</p> : (
        <div className="mt-3" role="group" aria-label="Changer le statut">
          {(canValidate || next.some((s) => s === "done" || m.status === "review")) && <label className="block"><span className="sr-only">Note (facultative)</span><input value={note} maxLength={LIMITS.note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultative)" disabled={act.pending} className={cn(field, "mt-0")} /></label>}
          <div className="mt-3 flex flex-wrap gap-2">
            {canValidate && <button type="button" disabled={act.pending} onClick={() => go("done")} className={cn(btn, "min-h-11 bg-sky px-5 text-jet")}>Valider · terminée</button>}
            {next.filter((s) => !(canValidate && s === "done")).map((s) => <button key={s} type="button" disabled={act.pending} onClick={() => go(s)} className={cn(btn, "min-h-11 border border-silver/45 px-5")}>{canValidate && s === "in_progress" ? "Renvoyer en cours" : s === "review" ? "Envoyer en validation" : STATUS_LABEL[s]}</button>)}
          </div>
        </div>
      )}
      <ActionNotice pending={act.pending} result={act.result} doing="Changement de statut…" done="Statut mis à jour." onReload={M.refresh} />
    </Section>
  );
}

/** COMMENTAIRES (base de données) : chargement, liste, erreur avec nouvel essai, ajout avec son propre état. */
function Comments({ m, M, actor }: { m: Mission; M: MissionsApi; actor: Actor }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; list: MissionComment[]; message: string }>({ status: "loading", list: [], message: "" });
  const [body, setBody] = useState("");
  const { load, add } = M.comments;
  const fetchList = useCallback(async () => {
    const r = await load(m.id);
    setState(r.ok ? { status: "ready", list: r.value, message: "" } : (p) => ({ status: "error", list: p.list, message: r.error.message }));
  }, [load, m.id]);
  useEffect(() => { let off = false; load(m.id).then((r) => { if (!off) setState(r.ok ? { status: "ready", list: r.value, message: "" } : { status: "error", list: [], message: r.error.message }); }); return () => { off = true; }; }, [load, m.id]);
  const post = useAction(async (text: string): Promise<ActionResult> => {
    const r = await add(m.id, text);
    if (!r.ok) return { ok: false, kind: r.error.kind, message: r.error.message };
    setState((p) => ({ status: "ready", list: [...p.list, r.value], message: "" })); return { ok: true, mission: null };
  });
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!body.trim()) return; const r = await post.run(body); if (r?.ok) setBody(""); };
  return (
    <Section id="comments" title={`Commentaires${state.status === "ready" ? ` (${state.list.length})` : ""}`}>
      {state.status === "loading" && <div className="mt-3" role="status" aria-live="polite"><span className="sr-only">Chargement des commentaires…</span><SkeletonList /></div>}
      {state.status === "error" && <div role="alert" className="mt-3 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem]"><p className="text-sunset">Commentaires indisponibles</p><p className="mt-1">{state.message}</p><button type="button" onClick={fetchList} className="mt-2 min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Réessayer</button></div>}
      {state.status === "ready" && (state.list.length === 0 ? <p className="mt-3 text-[0.95rem] text-dim">Aucun commentaire pour le moment.</p> : (
        <ul className="mt-3 space-y-3">{state.list.map((c) => (
          <li key={c.id} className={cn("rounded-[10px] border border-line bg-surface-1 p-3 text-[0.95rem] leading-snug", c.authorId === actor.memberId && "border-sky/40")}>
            <span className="flex items-baseline justify-between gap-3 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-dim"><span>{M.directory.name(c.authorId)}</span><span>{fmtWhen(c.createdAt)}</span></span>
            <span className="mt-1.5 block whitespace-pre-wrap text-cloud/90">{c.body}</span></li>))}</ul>
      ))}
      {!m.archivedAt && (
        <form onSubmit={submit} className="mt-4">
          <label htmlFor={`c-${m.id}`} className="sr-only">Ajouter un commentaire</label>
          <textarea id={`c-${m.id}`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={2} placeholder="Ajouter un commentaire" disabled={post.pending} className={cn(field, "mt-0 min-h-20 py-3")} />
          <button type="submit" disabled={post.pending || !body.trim()} className={cn(btn, "mt-3 min-h-11 border border-silver/45 px-5")}>{post.pending ? "Envoi…" : "Publier"}</button>
          <ActionNotice pending={post.pending} result={post.result} doing="Envoi du commentaire…" done="Commentaire publié." onReload={M.refresh} />
        </form>
      )}
    </Section>
  );
}
