"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { Avatar, DemoLine, StaffSection, StaffTitle } from "./ui";
import { activeMembers, validatorIds } from "@/data/staff";
import {
  MISSION_PRIORITIES, MISSION_STATUSES, PRIORITY_LABEL, STATUS_LABEL, canView, canViewAll, countByStatus, createMission,
  daysLate, filterMissions, isOverdue, sortMissions, type Actor, type Mission, type MissionInput, type MissionPriority, type MissionStatus,
} from "@/domain/missions";
import { useActor } from "@/lib/useActor";
import { useClock } from "@/lib/useClock";
import { useMissions } from "@/lib/useMissions";
import { useDemoStatus } from "./SpaceSwitcher";
import { cn } from "@/lib/cn";
import { SkeletonList, Spinner, StatusPill, addDays, btn, fmtDate, localISO } from "./missions/kit";
import { MissionSheets, type MissionView } from "./missions/MissionSheets";
import Link from "next/link";

const stripe: Record<MissionPriority, string> = { urgent: "bg-sunset", high: "bg-sky", normal: "bg-cloud/15" };
type View = MissionView;

/** MISSIONS : suivi opérationnel. Source `local` (démonstration sur l'appareil) ou `db` (base partagée, droits vérifiés par le serveur). */
export function MissionsScreen() {
  const who = useActor(); const clock = useClock(); const M = useMissions(); const db = M.source === "db"; const supa = useDemoStatus()?.mode === "supabase";
  const today = clock ? localISO(new Date(clock)) : null;
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [fStatus, setFStatus] = useState<MissionStatus | "">(""); const [fPrio, setFPrio] = useState<MissionPriority | "">(""); const [fMember, setFMember] = useState("");
  // Lien profond (?mission=<id>) : depuis une notification ou l'agenda, la fiche s'ouvre directement.
  const deep = useSearchParams().get("mission");
  const [view, setView] = useState<View>(deep ? { mode: "detail", id: deep } : null);

  const intro = (
    <StaffTitle eyebrow="Opérationnel" title="Missions">
      <p role="note" className="mt-4 max-w-[36ch] border-l border-sky pl-4 text-[0.9rem] leading-snug text-cloud/80">{db ? "Missions partagées avec l'équipe, enregistrées dans la base. Les droits sont vérifiés par le serveur." : supa ? "Données locales de démonstration, enregistrées sur cet appareil pour votre compte uniquement. Elles ne sont ni partagées avec l'équipe ni enregistrées dans la base." : "Enregistré sur cet appareil uniquement : pas de synchronisation entre Tom, Graw et Qafard."}</p>
    </StaffTitle>
  );

  if (M.status === "misconfigured") return <>{intro}<StaffSection><div role="alert" data-testid="config-error" className="max-w-[40ch] rounded-[10px] border border-sunset/60 p-4"><p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-sunset">Configuration invalide</p><p className="mt-2 font-display text-[1.25rem] leading-snug">Les missions sont suspendues</p><p className="mt-2 text-[0.95rem] text-cloud/80">{M.error?.message}</p><p className="mt-3 text-[0.9rem] text-cloud/72">STAFF HQ ne bascule pas vers des données locales : l&apos;équipe pourrait croire que ses missions sont synchronisées.</p></div></StaffSection></>;
  if (who.status === "loading" || M.status === "loading") return <>{intro}<section className="px-5 pt-7" aria-busy="true" aria-label="Chargement des missions"><p role="status" aria-live="polite" className="mb-4 flex items-center gap-2 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky"><Spinner />Chargement des missions…</p><SkeletonList /></section></>;
  if (who.status === "none") return <>{intro}<StaffSection><p role="status" className="max-w-[34ch] border-l border-sky pl-4 text-[1rem] font-light leading-snug">{db ? "Ce compte n'a pas accès aux missions de STAFF HQ." : "Ce compte n'est pas rattaché à un membre de l'équipe active (Tom, Graw, Qafard)."}</p></StaffSection></>;
  if (M.status === "forbidden") return <>{intro}<StaffSection><div role="alert" className="max-w-[36ch] border-l border-sunset pl-4"><p className="font-display text-[1.25rem] leading-snug">Accès refusé</p><p className="mt-2 text-[0.95rem] text-cloud/80">{M.error?.message ?? "Ce compte n'a pas accès aux données de STAFF HQ."}</p></div></StaffSection></>;
  if (M.status === "error") return <>{intro}<StaffSection><div role="alert" className="max-w-[40ch] rounded-[10px] border border-sunset/60 p-4"><p className="font-display text-[1.25rem] leading-snug">Impossible de charger les missions</p><p className="mt-2 text-[0.95rem] text-cloud/80">{M.error?.message}</p><div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" onClick={() => void M.refresh()} className={cn(btn, "bg-cloud text-jet")}>Réessayer</button>{M.error?.kind === "auth" && <Link href="/staff/login" className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Se reconnecter</Link>}</div></div></StaffSection></>;

  if (who.status !== "ok") return intro;
  const actor = who.actor; const name = M.directory.name;
  const effScope = canViewAll(actor) ? scope : "mine";
  const visible = M.missions.filter((m) => !m.archivedAt && canView(actor, m));
  const pool = effScope === "all" ? visible : visible.filter((m) => m.assigneeId === actor.memberId);
  const counts = countByStatus(pool);
  const late = pool.filter((m) => isOverdue(m, today)).length;
  const list = sortMissions(filterMissions(pool, { status: fStatus || undefined, priority: fPrio || undefined, assigneeId: effScope === "all" && fMember ? fMember : undefined }), today);
  const filtered = !!(fStatus || fPrio || (effScope === "all" && fMember));
  const pending = M.missions.filter((m) => !m.archivedAt && m.proposedAssigneeId && actor.coordinator).length;

  const loadExamples = () => {
    const t = today ?? localISO(new Date(0)); const tom: Actor = { memberId: "tom", coordinator: true }; const ids = activeMembers().map((m) => m.id); const out: Mission[] = [];
    const specs: [string, string, MissionInput["priority"], MissionStatus, number, string, string][] = [
      ["[Exemple] Valider la direction visuelle", "graw", "high", "in_progress", 5, "tom", "Mission d'exemple."],
      ["[Exemple] Repérage photo", "qafard", "normal", "todo", 12, "tom", "Mission d'exemple."],
      ["[Exemple] Préparer le brief équipe", "tom", "urgent", "todo", -2, "graw", "Mission d'exemple en retard."],
      ["[Exemple] Sélection des images", "qafard", "normal", "review", 3, "graw", "Mission d'exemple à valider."],
    ];
    specs.forEach(([title, assigneeId, priority, status, d, validatorId, description], i) => { const r = createMission({ title, description, assigneeId, validatorId, dueDate: addDays(t, d), priority, status }, tom, ids, new Date().toISOString(), `ex-${Date.now().toString(36)}-${i}`, validatorIds()); if (r.ok) out.push(r.value); });
    M.local?.addMany(out);
  };

  return (
    <>
      {intro}
      <section aria-label="Compteurs" className="px-5 pt-7">
        <dl className="grid grid-cols-3 border-y border-line py-5">
          {([["À faire", counts.todo], ["En cours", counts.in_progress], ["Terminées", counts.done]] as const).map(([l, n], i) => (
            <div key={l} className={cn("px-1", i > 0 && "border-l border-line pl-4")}><dd className="font-display text-[2.6rem] leading-none">{n}</dd><dt className="mt-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-cloud/72">{l}</dt></div>
          ))}
        </dl>
        {(counts.review > 0 || late > 0 || pending > 0) && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.78rem] uppercase tracking-[0.12em]">
            {counts.review > 0 && <span className="text-sunset">{counts.review} en validation</span>}{late > 0 && <span className="text-sunset">{late} en retard</span>}{pending > 0 && <span className="text-sky">{pending} proposition{pending > 1 ? "s" : ""} à traiter</span>}
          </p>
        )}
      </section>

      <section className="px-5 pt-6" aria-label="Affichage">
        {M.error && <div role="alert" className="mb-4 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem] leading-snug"><p className="text-sunset">Actualisation impossible</p><p className="mt-1 text-cloud/85">{M.error.message} Les données affichées peuvent être anciennes.</p><button type="button" onClick={() => void M.refresh()} className="mt-2 min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Réessayer</button></div>}
        <div>
          {canViewAll(actor) ? (
            <div role="group" aria-label="Périmètre" className="flex gap-1 rounded-full border border-silver/40 p-1">
              {([["mine", "Mes missions"], ["all", "Toutes"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={effScope === k} onClick={() => setScope(k)} className={cn("min-h-11 rounded-full px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] transition", effScope === k ? "bg-cloud text-jet" : "text-cloud/80")}>{l}</button>)}
            </div>
          ) : <h2 className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-cloud/80">Mes missions</h2>}
          <button type="button" onClick={() => setView({ mode: "create" })} aria-haspopup="dialog" className={cn(btn, "mt-3 w-full gap-1.5 bg-sky text-jet")}><Plus size={16} strokeWidth={2} aria-hidden />Nouvelle mission</button>
        </div>
        <div className={cn("mt-4 grid gap-2", effScope === "all" ? "grid-cols-3" : "grid-cols-2")}>
          {effScope === "all" && <label className="block"><span className="sr-only">Filtrer par membre</span><select value={fMember} onChange={(e) => setFMember(e.target.value)} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-3 text-[1rem]"><option value="">Membre</option>{M.directory.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
          <label className="block"><span className="sr-only">Filtrer par statut</span><select value={fStatus} onChange={(e) => setFStatus(e.target.value as MissionStatus | "")} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-3 text-[1rem]"><option value="">Statut</option>{MISSION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
          <label className="block"><span className="sr-only">Filtrer par priorité</span><select value={fPrio} onChange={(e) => setFPrio(e.target.value as MissionPriority | "")} className="min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-3 text-[1rem]"><option value="">Priorité</option>{MISSION_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
        </div>
        <p role="status" aria-live="polite" className="mt-4 flex items-center justify-between gap-3 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-cloud/72">
          <span>{list.length} {list.length > 1 ? "missions" : "mission"}{filtered ? " · filtres actifs" : ""}</span>
          {db && <button type="button" onClick={() => void M.refresh()} disabled={M.refreshing} aria-label="Actualiser les missions" className="inline-flex min-h-11 items-center gap-2 text-sky disabled:opacity-60">{M.refreshing ? <><Spinner />Actualisation…</> : <><RefreshCw size={14} aria-hidden />Actualiser</>}</button>}
        </p>
      </section>

      <section className="px-5 pt-3" aria-label="Liste des missions">
        {list.length === 0 ? (
          <div role="status" className="py-8">
            <p className="font-display text-[1.25rem] leading-snug">{filtered ? "Aucune mission ne correspond aux filtres." : pool.length === 0 && M.missions.length === 0 ? "Aucune mission pour le moment." : "Aucune mission dans cette vue."}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {filtered ? <button type="button" onClick={() => { setFStatus(""); setFPrio(""); setFMember(""); }} className={cn(btn, "border border-silver/45")}>Effacer les filtres</button> : <button type="button" onClick={() => setView({ mode: "create" })} className={cn(btn, "bg-cloud text-jet")}>Créer une mission</button>}
              {M.local && !supa && !filtered && M.missions.length === 0 && canViewAll(actor) && <button type="button" onClick={loadExamples} className="min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-sky underline underline-offset-4">Charger 4 missions d&apos;exemple</button>}
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
                      <span className="flex items-center gap-2 text-[0.9rem] text-cloud/85"><Avatar name={name(m.assigneeId)} size={26} />{name(m.assigneeId)}{m.proposedAssigneeId && <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-sky">→ {name(m.proposedAssigneeId)} ?</span>}</span>
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
        {M.local && M.missions.length > 0 && <button type="button" onClick={() => setView({ mode: "clear" })} aria-haspopup="dialog" className="mt-8 min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">{supa ? "Effacer mes missions locales de cet appareil" : "Effacer toutes les missions de cet appareil"}</button>}
      </section>
      {!db && <DemoLine />}

      <MissionSheets view={view} setView={setView} M={M} actor={actor} today={today} />
    </>
  );
}
