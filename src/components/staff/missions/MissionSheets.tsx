"use client";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import type { Actor } from "@/domain/missions";
import type { MissionsApi } from "@/lib/missions/types";
import { ActionNotice, btn, useAction } from "./kit";
import { CreateForm, InfoForm, type CreatePresets } from "./MissionForms";
import { MissionDetail } from "./MissionDetail";

/** Fenêtres de mission COMMUNES (fiche, création, informations, archivage, suppression) : réutilisées par Missions, Agenda et Notifications. */
export type MissionView = null | { mode: "detail"; id: string } | { mode: "create"; presets?: CreatePresets } | { mode: "info"; id: string } | { mode: "archive"; id: string } | { mode: "delete"; id: string } | { mode: "clear" };

export function MissionSheets({ view, setView, M, actor, today }: { view: MissionView; setView: (v: MissionView) => void; M: MissionsApi; actor: Actor; today: string | null }) {
  const db = M.source === "db"; const close = () => setView(null);
  const current = view && "id" in view ? M.missions.find((m) => m.id === view.id) ?? null : null;
  const gone = !!view && "id" in view && !current; // la mission a disparu (supprimée ailleurs) : on referme proprement
  return (
      <Sheet open={!!view} onClose={close} eyebrow={view?.mode === "create" ? "Nouvelle" : view?.mode === "info" ? "Modifier" : view?.mode === "delete" || view?.mode === "clear" || view?.mode === "archive" ? "Confirmation" : "Mission"} title={view?.mode === "create" ? "Nouvelle mission" : view?.mode === "info" ? "Modifier la mission" : view?.mode === "delete" ? "Supprimer la mission ?" : view?.mode === "archive" ? "Archiver la mission ?" : view?.mode === "clear" ? "Tout effacer ?" : "Mission"}>
        {gone && <div role="status"><p className="text-[1rem] leading-relaxed text-cloud/85">Cette mission n&apos;existe plus ou n&apos;est plus accessible.</p><button type="button" onClick={close} className={cn(btn, "mt-5 border border-silver/45")}>Fermer</button></div>}
        {view?.mode === "detail" && current && <MissionDetail m={current} actor={actor} today={today} M={M} onEditInfo={() => setView({ mode: "info", id: current.id })} onArchive={() => setView({ mode: "archive", id: current.id })} onDelete={() => setView({ mode: "delete", id: current.id })} />}
        {view?.mode === "create" && <CreateForm actor={actor} M={M} presets={view.presets} onDone={(id) => setView({ mode: "detail", id })} onCancel={close} />}
        {view?.mode === "info" && current && <InfoForm key={`${current.id}`} m={current} actor={actor} M={M} onDone={() => setView({ mode: "detail", id: current.id })} onCancel={() => setView({ mode: "detail", id: current.id })} />}
        {view?.mode === "archive" && current && <Confirm M={M} text={`« ${current.title} » sera masquée des listes. Elle est conservée avec son historique.`} cta="Archiver" doing="Archivage…" run={() => M.archive(current.id, actor)} onDone={close} onCancel={() => setView({ mode: "detail", id: current.id })} />}
        {view?.mode === "delete" && current && <Confirm M={M} danger text={db ? `« ${current.title} » sera supprimée définitivement de la base, avec son historique et ses commentaires. Préférez l'archivage.` : `« ${current.title} » sera supprimée de cet appareil. Cette action est définitive.`} cta="Supprimer" doing="Suppression…" run={() => M.remove(current.id, actor)} onDone={close} onCancel={() => setView({ mode: "detail", id: current.id })} />}
        {view?.mode === "clear" && M.local && (
          <div><p className="text-[1rem] leading-relaxed text-cloud/85">Toutes les missions enregistrées sur cet appareil seront supprimées, y compris celles des autres membres sur cet appareil. Cette action est définitive.</p>
            <div className="mt-6 grid gap-3"><button type="button" onClick={() => { M.local?.clearAll(); close(); }} className={cn(btn, "bg-sunset text-jet")}>Tout effacer</button><button type="button" onClick={close} className={cn(btn, "border border-silver/45")}>Annuler</button></div></div>
        )}
      </Sheet>
  );
}

/** Confirmation d'une action sensible, avec son propre état (en cours / erreur) : la fenêtre ne se ferme qu'en cas de succès. */
function Confirm({ M, text, cta, doing, danger, run, onDone, onCancel }: { M: MissionsApi; text: string; cta: string; doing: string; danger?: boolean; run: () => ReturnType<MissionsApi["archive"]>; onDone: () => void; onCancel: () => void }) {
  const act = useAction(run);
  return (
    <div aria-busy={act.pending}><p className="text-[1rem] leading-relaxed text-cloud/85">{text}</p>
      <ActionNotice pending={act.pending} result={act.result} doing={doing} onReload={M.refresh} />
      <div className="mt-6 grid gap-3"><button type="button" disabled={act.pending} onClick={() => act.run().then((r) => { if (r?.ok) onDone(); })} className={cn(btn, danger ? "bg-sunset text-jet" : "bg-cloud text-jet")}>{act.pending ? doing : cta}</button><button type="button" disabled={act.pending} onClick={onCancel} className={cn(btn, "border border-silver/45")}>Annuler</button></div></div>
  );
}

