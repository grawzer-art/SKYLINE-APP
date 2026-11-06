"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { LIMITS, MISSION_PRIORITIES, MISSION_STATUSES, PRIORITY_LABEL, STATUS_LABEL, validateMissionInput, type Actor, type Mission, type MissionErrors, type MissionInfoInput, type MissionInput, type MissionPriority, type MissionStatus } from "@/domain/missions";
import type { MissionsApi } from "@/lib/missions/types";
import { ActionNotice, btn, field, label, useAction } from "./kit";

type Props = { actor: Actor; M: MissionsApi };
/** Valeurs proposées à l'ouverture (ex. depuis l'agenda : la date du jour sélectionné). */
export type CreatePresets = { dueDate?: string | null; dueTime?: string | null };

const FieldError = ({ id, text }: { id: string; text?: string }) => (text ? <p id={`e-${id}`} role="alert" className="mt-1.5 text-[0.88rem] text-sunset">{text}</p> : null);

/** CRÉATION : une seule action (create_mission). Un membre qui choisit une autre personne fait une PROPOSITION. */
export function CreateForm({ actor, M, presets, onDone, onCancel }: Props & { presets?: CreatePresets; onDone: (id: string) => void; onCancel: () => void }) {
  const { members, validatorIds, name } = M.directory; const ids = members.map((x) => x.id);
  const validators = members.filter((x) => validatorIds.includes(x.id));
  const firstOther = (avoid: string[]) => validators.find((x) => !avoid.includes(x.id))?.id ?? "";
  const [v, setV] = useState<MissionInput>({ title: "", description: "", assigneeId: actor.memberId, validatorId: firstOther([actor.memberId]), dueDate: presets?.dueDate ?? null, dueTime: presets?.dueTime ?? null, priority: "normal", status: "todo" });
  const [errors, setErrors] = useState<MissionErrors>({});
  const act = useAction((i: MissionInput) => M.create(i, actor));
  const set = <K extends keyof MissionInput>(k: K, x: MissionInput[K]) => setV((p) => ({ ...p, [k]: x }));
  const proposal = !actor.coordinator && v.assigneeId !== actor.memberId;
  const avoid = proposal ? [v.assigneeId, actor.memberId] : [v.assigneeId];
  const statusChoices = MISSION_STATUSES.filter((s) => actor.coordinator || s !== "done");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const chk = validateMissionInput(v, ids, validatorIds); if (!chk.ok) { setErrors(chk.errors); return; } setErrors({});
    const r = await act.run(chk.value); if (r?.ok && r.mission) onDone(r.mission.id);
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={act.pending}>
      <fieldset disabled={act.pending} className="space-y-5">
        <div><label htmlFor="f-title" className={label}>Titre *</label><input id="f-title" value={v.title} maxLength={LIMITS.title + 20} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} aria-describedby={errors.title ? "e-title" : undefined} className={field} /><FieldError id="title" text={errors.title} /></div>
        <div><label htmlFor="f-desc" className={label}>Description</label><textarea id="f-desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} className={cn(field, "min-h-24 py-3")} /><FieldError id="description" text={errors.description} /></div>
        <div><label htmlFor="f-assignee" className={label}>Responsable</label>
          <select id="f-assignee" value={v.assigneeId} onChange={(e) => { const a = e.target.value; setV((p) => ({ ...p, assigneeId: a, validatorId: p.validatorId === a ? firstOther([a]) : p.validatorId })); }} className={field}>{members.map((x) => <option key={x.id} value={x.id}>{x.name}{x.id === actor.memberId ? " (moi)" : ""}</option>)}</select>
          {proposal && <p role="note" className="mt-2 text-[0.88rem] leading-snug text-sky">Proposition : vous restez responsable jusqu&apos;à l&apos;approbation de {name(v.assigneeId)} par un administrateur.</p>}<FieldError id="assigneeId" text={errors.assigneeId} /></div>
        <div><label htmlFor="f-validator" className={label}>Validation par</label><select id="f-validator" value={v.validatorId} onChange={(e) => set("validatorId", e.target.value)} className={field}>{validators.filter((x) => !avoid.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><FieldError id="validatorId" text={errors.validatorId} /></div>
        <DueFields date={v.dueDate} time={v.dueTime ?? null} timeSupported={M.capabilities.dueTime} onDate={(d) => { set("dueDate", d); if (!d) set("dueTime", null); }} onTime={(t) => set("dueTime", t)} errors={errors} />
        <PriorityPicker value={v.priority} onChange={(p) => set("priority", p)} />
        <div><label htmlFor="f-status" className={label}>Statut initial</label><select id="f-status" value={v.status} onChange={(e) => set("status", e.target.value as MissionStatus)} className={field}>{statusChoices.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select><FieldError id="status" text={errors.status} /></div>
      </fieldset>
      <ActionNotice pending={act.pending} result={act.result} doing="Création en cours…" onReload={M.refresh} />
      <div className="grid gap-3 pt-1"><button type="submit" disabled={act.pending} className={cn(btn, "bg-cloud text-jet")}>{act.pending ? "Création…" : "Créer la mission"}</button><button type="button" onClick={onCancel} disabled={act.pending} className={cn(btn, "border border-silver/45")}>Annuler</button></div>
    </form>
  );
}

/** Échéance : date, et heure facultative quand la source de données sait l'enregistrer (mode local ; base : migration B3 proposée). */
function DueFields({ date, time, timeSupported, onDate, onTime, errors }: { date: string | null; time: string | null; timeSupported: boolean; onDate: (d: string | null) => void; onTime: (t: string | null) => void; errors: MissionErrors }) {
  return (
    <div>
      <div className={timeSupported ? "grid grid-cols-[1fr_8.5rem] gap-3" : ""}>
        <div><label htmlFor="f-due" className={label}>Échéance</label><input id="f-due" type="date" value={date ?? ""} onChange={(e) => onDate(e.target.value || null)} className={field} /></div>
        {timeSupported && <div><label htmlFor="f-time" className={label}>Heure</label><input id="f-time" type="time" value={time ?? ""} disabled={!date} onChange={(e) => onTime(e.target.value || null)} className={field} /></div>}
      </div>
      <FieldError id="dueDate" text={errors.dueDate} /><FieldError id="dueTime" text={errors.dueTime} />
    </div>
  );
}

function PriorityPicker({ value, onChange }: { value: MissionPriority; onChange: (p: MissionPriority) => void }) {
  return (
    <fieldset><legend className={label}>Priorité</legend>
      <div role="radiogroup" aria-label="Priorité" className="mt-2 grid grid-cols-3 gap-2">{MISSION_PRIORITIES.map((p) => <button key={p} type="button" role="radio" aria-checked={value === p} onClick={() => onChange(p)} className={cn("min-h-12 rounded-[8px] border px-2 text-[0.9rem] transition", value === p ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{PRIORITY_LABEL[p]}</button>)}</div>
    </fieldset>
  );
}

/** MODIFICATION DES INFORMATIONS uniquement (titre, description, validateur, échéance, priorité). Responsable et statut : sections séparées. */
export function InfoForm({ m, actor, M, onDone, onCancel }: Props & { m: Mission; onDone: () => void; onCancel: () => void }) {
  const { members, validatorIds, name } = M.directory; const ids = members.map((x) => x.id);
  const validators = members.filter((x) => validatorIds.includes(x.id));
  const pick = (x: Mission): MissionInfoInput => ({ title: x.title, description: x.description, validatorId: x.validatorId, dueDate: x.dueDate, dueTime: x.dueTime ?? null, priority: x.priority });
  const [openedVersion] = useState(m.version); const [v, setV] = useState<MissionInfoInput>(pick(m));
  const [errors, setErrors] = useState<MissionErrors>({});
  const act = useAction((i: MissionInfoInput) => M.editInfo(m.id, i, actor));
  const set = <K extends keyof MissionInfoInput>(k: K, x: MissionInfoInput[K]) => setV((p) => ({ ...p, [k]: x }));
  const changedMeanwhile = m.version !== undefined && openedVersion !== undefined && m.version !== openedVersion;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const chk = validateMissionInput({ ...v, assigneeId: m.assigneeId, status: m.status }, ids, validatorIds); if (!chk.ok) { setErrors(chk.errors); return; } setErrors({});
    const r = await act.run({ title: chk.value.title, description: chk.value.description, validatorId: chk.value.validatorId, dueDate: chk.value.dueDate, dueTime: chk.value.dueTime ?? null, priority: chk.value.priority }); if (r?.ok) onDone();
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={act.pending}>
      <p role="note" className="text-[0.88rem] leading-snug text-cloud/72">Ce formulaire ne modifie que les informations. Le responsable ({name(m.assigneeId)}) et le statut se changent séparément, depuis la fiche de la mission.</p>
      {changedMeanwhile && (
        <div role="alert" className="rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem] leading-snug">
          <p className="text-sunset">La mission a changé depuis l&apos;ouverture du formulaire.</p>
          <p className="mt-1 text-cloud/85">Vérifiez vos valeurs avant d&apos;enregistrer : elles remplaceront celles de la base.</p>
          <button type="button" onClick={() => setV(pick(m))} className="mt-2 min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Reprendre les valeurs actuelles</button>
        </div>
      )}
      <fieldset disabled={act.pending} className="space-y-5">
        <div><label htmlFor="f-title" className={label}>Titre *</label><input id="f-title" value={v.title} maxLength={LIMITS.title + 20} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} aria-describedby={errors.title ? "e-title" : undefined} className={field} /><FieldError id="title" text={errors.title} /></div>
        <div><label htmlFor="f-desc" className={label}>Description</label><textarea id="f-desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} className={cn(field, "min-h-24 py-3")} /><FieldError id="description" text={errors.description} /></div>
        <div><label htmlFor="f-validator" className={label}>Validation par</label><select id="f-validator" value={v.validatorId} onChange={(e) => set("validatorId", e.target.value)} className={field}>{validators.filter((x) => x.id !== m.assigneeId && x.id !== m.proposedAssigneeId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><FieldError id="validatorId" text={errors.validatorId} /></div>
        <DueFields date={v.dueDate} time={v.dueTime ?? null} timeSupported={M.capabilities.dueTime} onDate={(d) => { set("dueDate", d); if (!d) set("dueTime", null); }} onTime={(t) => set("dueTime", t)} errors={errors} />
        <PriorityPicker value={v.priority} onChange={(p) => set("priority", p)} />
      </fieldset>
      <ActionNotice pending={act.pending} result={act.result} doing="Enregistrement des informations…" onReload={M.refresh} />
      <div className="grid gap-3 pt-1"><button type="submit" disabled={act.pending} className={cn(btn, "bg-cloud text-jet")}>{act.pending ? "Enregistrement…" : "Enregistrer les informations"}</button><button type="button" onClick={onCancel} disabled={act.pending} className={cn(btn, "border border-silver/45")}>Annuler</button></div>
    </form>
  );
}
