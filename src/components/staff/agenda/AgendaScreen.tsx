"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Avatar } from "../ui";
import { cn } from "@/lib/cn";
import { addDays, buildAgenda, dayCount, fmtTime, hasAnything, toISO, weekDays, EVENT_KIND_LABEL, type AgendaItem, type AgendaView, type SharedEntry } from "@/domain/agenda";
import { PRIORITY_LABEL, STATUS_LABEL, type Actor, type Mission } from "@/domain/missions";
import { useAgendaEvents } from "@/lib/agenda/useAgendaEvents";
import { useTeamAgenda } from "@/lib/agenda/useTeamAgenda";
import type { MissionsApi } from "@/lib/missions/types";
import { useClock } from "@/lib/useClock";
import { MissionsGate } from "../missions/Gate";
import { MissionSheets, type MissionView } from "../missions/MissionSheets";
import { SkeletonList, Spinner, StatusPill, btn } from "../missions/kit";
import { EventSheets, type EventView } from "./EventSheets";

const parse = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", o).format(parse(iso));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const weekLabel = (days: string[]) => { const a = parse(days[0]); const b = parse(days[6]); const same = a.getMonth() === b.getMonth(); return `${a.getDate()}${same ? "" : ` ${fmt(days[0], { month: "short" })}`} – ${b.getDate()} ${fmt(days[6], { month: "short" })}`; };

/** AGENDA STAFF : « Mon agenda » (par défaut) et « Équipe » — missions B2 + réunions / événements. Aucune donnée propre : tout vient des missions. */
export function AgendaScreen() {
  return <MissionsGate eyebrow="Opérationnel" title="Agenda">{({ actor, M }) => <AgendaBody actor={actor} M={M} />}</MissionsGate>;
}

function AgendaBody({ actor, M }: { actor: Actor; M: MissionsApi }) {
  const clock = useClock(); const ev = useAgendaEvents(); const today = clock ? toISO(new Date(clock)) : null;
  const [view, setView] = useState<AgendaView>("mine"); const [picked, setPicked] = useState<string | null>(null);
  const [mv, setMv] = useState<MissionView>(null); const [evv, setEvv] = useState<EventView>(null); const [adding, setAdding] = useState(false);
  const day = picked ?? today;
  const team = useTeamAgenda(M, view === "team", day);
  const agenda = useMemo(() => (today ? buildAgenda({ missions: M.missions, events: ev.events, me: actor.memberId, coordinator: actor.coordinator, view, today, shared: team.entries }) : null), [M.missions, ev.events, actor.memberId, actor.coordinator, view, today, team.entries]);
  if (!today || !day || !agenda) return <section className="px-5 pt-7" aria-busy="true"><SkeletonList /></section>;

  const days = weekDays(day); const items = agenda.byDay[day] ?? []; const isToday = day === today;
  const open = (it: AgendaItem) => { if (it.type === "mission") setMv({ mode: "detail", id: it.mission.id }); else if (it.type === "event") setEvv({ mode: "detail", id: it.event.id }); };
  const add = () => (ev.supported ? setAdding((v) => !v) : setMv({ mode: "create", presets: { dueDate: day } }));
  const name = M.directory.name; const db = M.source === "db";
  const empty = !hasAnything(agenda) && agenda.proposals.length === 0;

  return (
    <>
      <section aria-label="Choix de la vue" className="px-5 pt-5">
        <div role="group" aria-label="Vue de l'agenda" className="flex gap-1 rounded-full border border-silver/40 p-1">
          {([["mine", "Mon agenda"], ["team", "Équipe"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cn("min-h-11 flex-1 rounded-full px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] transition", view === k ? "bg-cloud text-jet" : "text-cloud/80")}>{l}</button>)}
        </div>
        {view === "team" && db && !actor.coordinator && !M.capabilities.teamAgenda && <p role="note" className="mt-3 text-[0.82rem] leading-snug text-cloud/72">Vous voyez les missions qui vous concernent. Les administrateurs voient toute l&apos;équipe.</p>}
        {view === "team" && team.enabled && <p role="note" className="mt-3 text-[0.82rem] leading-snug text-cloud/72">Planning de l&apos;équipe : le détail d&apos;une mission reste réservé aux personnes concernées.</p>}
        {view === "team" && team.status === "error" && <div role="alert" className="mt-3 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem] leading-snug"><p className="text-sunset">Planning de l&apos;équipe indisponible</p><p className="mt-1 text-cloud/85">{team.error}</p><button type="button" onClick={team.reload} className="mt-2 min-h-11 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-sky underline underline-offset-4">Réessayer</button></div>}
        {view === "team" && team.status === "loading" && <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-sky"><Spinner />Chargement du planning de l&apos;équipe…</p>}
      </section>

      <section aria-label="Semaine" className="pt-5">
        <div className="flex items-center justify-between px-3">
          <button type="button" onClick={() => setPicked(addDays(day, -7))} aria-label="Semaine précédente" className="grid size-11 place-items-center rounded-full text-cloud/85 transition active:scale-95"><ChevronLeft size={20} aria-hidden /></button>
          <p role="status" aria-live="polite" className="font-mono text-[0.78rem] uppercase tracking-[0.14em] text-cloud/85">{weekLabel(days)}</p>
          <button type="button" onClick={() => setPicked(addDays(day, 7))} aria-label="Semaine suivante" className="grid size-11 place-items-center rounded-full text-cloud/85 transition active:scale-95"><ChevronRight size={20} aria-hidden /></button>
        </div>
        <div role="group" aria-label="Jours de la semaine" className="mt-1 grid grid-cols-7 border-y border-line">
          {days.map((d) => {
            const sel = d === day; const n = dayCount(agenda, d); const t = d === today;
            return (
              <button key={d} type="button" onClick={() => setPicked(d)} aria-pressed={sel} aria-label={`${cap(fmt(d, { weekday: "long", day: "numeric", month: "long" }))}${n ? `, ${n} élément${n > 1 ? "s" : ""}` : ""}${t ? ", aujourd'hui" : ""}`} className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 transition active:scale-95", sel ? "bg-cloud text-jet" : "text-cloud")}>
                <span className={cn("font-mono text-[0.7rem] uppercase", sel ? "text-jet/70" : "text-cloud/65")}>{fmt(d, { weekday: "narrow" })}</span>
                <span className={cn("font-display text-[1.2rem] leading-none", t && !sel && "text-sky")}>{parse(d).getDate()}</span>
                <span aria-hidden className={cn("size-1.5 rounded-full", n ? (sel ? "bg-jet" : "bg-sky") : "bg-transparent")} />
              </button>
            );
          })}
        </div>
        {!isToday && <div className="px-5 pt-2"><button type="button" onClick={() => setPicked(null)} className="inline-flex min-h-11 items-center font-mono text-[0.75rem] uppercase tracking-[0.14em] text-sky underline underline-offset-4">Revenir à aujourd&apos;hui</button></div>}
      </section>

      <section aria-label="Jour sélectionné" className="px-5 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.35rem] leading-tight">{cap(fmt(day, { weekday: "long" }))}</h2>
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-cloud/72">{fmt(day, { day: "numeric", month: "long" })}{isToday ? " · aujourd'hui" : ""}</p>
          </div>
          <button type="button" onClick={add} aria-expanded={ev.supported ? adding : undefined} className={cn(btn, "min-h-11 gap-2 bg-sky px-5 text-jet")}><CalendarPlus size={16} aria-hidden />Ajouter</button>
        </div>
        {adding && (
          <div role="group" aria-label="Que voulez-vous ajouter ?" className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setAdding(false); setMv({ mode: "create", presets: { dueDate: day } }); }} aria-haspopup="dialog" className="min-h-16 rounded-[10px] border border-line bg-surface-1 p-3 text-left transition active:scale-[0.99]"><span className="block font-display text-[1.05rem]">Tâche</span><span className="mt-0.5 block text-[0.78rem] leading-tight text-cloud/70">Une mission, à vous ou proposée</span></button>
            <button type="button" onClick={() => { setAdding(false); setEvv({ mode: "new", date: day }); }} aria-haspopup="dialog" className="min-h-16 rounded-[10px] border border-line bg-surface-1 p-3 text-left transition active:scale-[0.99]"><span className="block font-display text-[1.05rem]">Réunion</span><span className="mt-0.5 block text-[0.78rem] leading-tight text-cloud/70">Réunion ou événement daté</span></button>
          </div>
        )}
        {db && (
          <p role="status" aria-live="polite" className="mt-3 flex items-center justify-end gap-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-cloud/72">
            <button type="button" onClick={() => void M.refresh()} disabled={M.refreshing} aria-label="Actualiser l'agenda" className="inline-flex min-h-11 items-center gap-2 text-sky disabled:opacity-60">{M.refreshing ? <><Spinner />Actualisation…</> : <><RefreshCw size={14} aria-hidden />Actualiser</>}</button>
          </p>
        )}
        {M.error && <div role="alert" className="mt-3 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem] leading-snug"><p className="text-sunset">Actualisation impossible</p><p className="mt-1 text-cloud/85">{M.error.message} Les données affichées peuvent être anciennes.</p></div>}

        {items.length === 0 ? (
          <div role="status" className="py-8">
            <p className="font-display text-[1.2rem] leading-snug">{empty ? "Votre agenda est vide." : "Rien de prévu ce jour-là."}</p>
            <p className="mt-2 max-w-[34ch] text-[0.92rem] leading-snug text-cloud/72">{empty ? "Ajoutez une tâche : elle apparaîtra aussi dans vos missions." : "Profitez-en, ou ajoutez une tâche pour cette date."}</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.key}>
                {it.type === "mission" ? <MissionRow m={it.mission} time={it.time} name={name} showOwner={view === "team"} onOpen={() => open(it)} /> : it.type === "shared" ? <SharedRow e={it.entry} time={it.time} name={name} /> : <EventRow it={it} onOpen={() => open(it)} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {agenda.proposals.length > 0 && <MiniList title="Propositions à traiter" tone="sky" list={agenda.proposals} name={name} onOpen={(m) => setMv({ mode: "detail", id: m.id })} extra={(m) => `→ ${name(m.proposedAssigneeId ?? "")}`} />}
      {agenda.overdue.length > 0 && <MiniList title="En retard" tone="sunset" list={agenda.overdue} name={name} onOpen={(m) => setMv({ mode: "detail", id: m.id })} extra={(m) => (m.dueDate ? fmt(m.dueDate, { day: "numeric", month: "short" }) : "")} />}
      <MiniList title="À planifier" tone="plain" list={agenda.unscheduled} name={name} onOpen={(m) => setMv({ mode: "detail", id: m.id })} empty="Toutes vos tâches ont une date." />

      {!db && <p className="px-5 pb-2 pt-8"><Link href="/staff/schedule/programme" className="inline-flex min-h-11 items-center font-mono text-[0.75rem] uppercase tracking-[0.14em] text-cloud/72 underline underline-offset-4">Programme de l&apos;événement (démo) →</Link></p>}

      <MissionSheets view={mv} setView={setMv} M={M} actor={actor} today={today} />
      <EventSheets view={evv} setView={setEvv} ev={ev} actor={actor} />
    </>
  );
}

const stripe = { urgent: "bg-sunset", high: "bg-sky", normal: "bg-cloud/15" } as const;
function MissionRow({ m, time, name, showOwner, onOpen }: { m: Mission; time: string | null; name: (id: string) => string; showOwner: boolean; onOpen: () => void }) {
  const done = m.status === "done";
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" className="relative flex w-full gap-4 overflow-hidden rounded-[10px] border border-line bg-surface-1 p-4 pl-5 text-left transition active:scale-[0.99]">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", stripe[m.priority])} />
      <span className="w-12 shrink-0 pt-0.5 font-mono text-[0.78rem] uppercase tracking-[0.08em] text-cloud/72">{time ? fmtTime(time) : "Jour"}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.02rem] leading-snug [overflow-wrap:anywhere]"><span className={cn(done && "text-cloud/55 line-through")}>{m.title}</span></span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {showOwner && <span className="flex items-center gap-1.5 text-[0.85rem] text-cloud/80"><Avatar name={name(m.assigneeId)} size={20} />{name(m.assigneeId)}</span>}
          <StatusPill s={m.status} />
          {m.priority !== "normal" && <span className={cn("font-mono text-[0.7rem] uppercase tracking-[0.1em]", m.priority === "urgent" ? "text-sunset" : "text-sky")}>{PRIORITY_LABEL[m.priority]}</span>}
        </span>
      </span>
    </button>
  );
}
/** Entrée du planning COLLECTIF : lecture seule (titre, responsable, statut, priorité). Aucun détail : la fiche est réservée aux personnes concernées. */
function SharedRow({ e, time, name }: { e: SharedEntry; time: string | null; name: (id: string) => string }) {
  return (
    <div data-testid="shared-row" className="relative flex w-full gap-4 overflow-hidden rounded-[10px] border border-line/70 p-4 pl-5">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", stripe[e.priority])} />
      <span className="w-12 shrink-0 pt-0.5 font-mono text-[0.78rem] uppercase tracking-[0.08em] text-cloud/72">{time ? fmtTime(time) : "Jour"}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.02rem] leading-snug [overflow-wrap:anywhere]"><span className={cn(e.status === "done" && "text-cloud/55 line-through")}>{e.title}</span></span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5"><span className="flex items-center gap-1.5 text-[0.85rem] text-cloud/80"><Avatar name={name(e.assigneeId)} size={20} />{name(e.assigneeId)}</span><StatusPill s={e.status} />{e.priority !== "normal" && <span className={cn("font-mono text-[0.7rem] uppercase tracking-[0.1em]", e.priority === "urgent" ? "text-sunset" : "text-sky")}>{PRIORITY_LABEL[e.priority]}</span>}</span>
      </span>
    </div>
  );
}
function EventRow({ it, onOpen }: { it: Extract<AgendaItem, { type: "event" }>; onOpen: () => void }) {
  const e = it.event;
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" className="relative flex w-full gap-4 overflow-hidden rounded-[10px] border border-sky/50 p-4 pl-5 text-left transition active:scale-[0.99]">
      <span className="w-12 shrink-0 pt-0.5 font-mono text-[0.78rem] uppercase tracking-[0.08em] text-sky">{e.startTime ? fmtTime(e.startTime) : "Jour"}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[0.7rem] uppercase tracking-[0.14em] text-sky">{EVENT_KIND_LABEL[e.kind]}{e.scope === "me" ? " · personnel" : ""}</span>
        <span className="mt-1 block text-[1.02rem] leading-snug [overflow-wrap:anywhere]">{e.title}</span>
        {(e.endTime || e.place) && <span className="mt-1 block text-[0.85rem] text-cloud/75">{e.endTime ? `jusqu'à ${fmtTime(e.endTime)}` : ""}{e.endTime && e.place ? " · " : ""}{e.place}</span>}
      </span>
    </button>
  );
}
function MiniList({ title, tone, list, name, onOpen, extra, empty }: { title: string; tone: "sky" | "sunset" | "plain"; list: Mission[]; name: (id: string) => string; onOpen: (m: Mission) => void; extra?: (m: Mission) => string; empty?: string }) {
  if (list.length === 0 && !empty) return null;
  return (
    <section aria-label={title} className="px-5 pt-8">
      <h2 className={cn("mb-2 font-mono text-[0.75rem] uppercase tracking-[0.2em]", tone === "sunset" ? "text-sunset" : tone === "sky" ? "text-sky" : "text-cloud/72")}>{title}{list.length ? ` · ${list.length}` : ""}</h2>
      {list.length === 0 ? <p className="text-[0.9rem] text-dim">{empty}</p> : (
        <ul className="divide-y divide-line border-y border-line">
          {list.map((m) => (
            <li key={m.id}><button type="button" onClick={() => onOpen(m)} aria-haspopup="dialog" className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left"><span className="min-w-0"><span className="block truncate text-[0.98rem]">{m.title}</span><span className="block text-[0.8rem] text-cloud/65">{name(m.assigneeId)} · {STATUS_LABEL[m.status]}</span></span>{extra && <span className="shrink-0 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-cloud/80">{extra(m)}</span>}</button></li>
          ))}
        </ul>
      )}
    </section>
  );
}
