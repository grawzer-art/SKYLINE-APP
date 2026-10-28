"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Backdrop } from "./visual";
import { DemoTag } from "./ui";
import { FlightPass, type PassStatus } from "./FlightPass";
import { TiltToggle, useMetal } from "./metal";
import { Sheet } from "@/components/ui/Sheet";
import { images } from "@/data/demo";
import { demoTrip, noTrip, phaseLabels, type Trip } from "@/data/v3";
import { ease } from "@/design/motion";
import { useProto } from "@/lib/useProto";
import { cn } from "@/lib/cn";

type Tab = "flight" | "stay" | "live";
const tabs: { id: Tab; label: string }[] = [{ id: "flight", label: "Flight details" }, { id: "stay", label: "Your stay" }, { id: "live", label: "Live updates" }];

const docs = [
  { id: "d1", title: "Conditions de participation", text: "Ici s'afficherait le document officiel fourni par SKYLINE." },
  { id: "d2", title: "Informations d'assurance", text: "Ici s'afficheraient les informations d'assurance, si l'organisation en fournit." },
  { id: "d3", title: "Contact de l'équipe", text: "Ici s'afficherait le moyen de contact officiel de l'équipe pendant le séjour." },
];

/** Message unique et sobre quand une information n'est pas encore publiée. */
const Pending = ({ children }: { children: string }) => (
  <div className="py-9"><span aria-hidden className="block h-px w-8 bg-sky" /><p role="status" className="mt-4 max-w-[28ch] text-[1.2rem] font-light leading-snug text-cloud/90">{children}</p></div>
);
const Line = ({ time, label, place }: { time: string; label: string; place: string }) => (
  <li className="flex gap-4 py-3.5"><span className="w-12 shrink-0 pt-0.5 font-mono text-[0.72rem] text-sky">{time}</span><span className="min-w-0"><span className="block text-[0.98rem] leading-snug">{label}</span><span className="mt-0.5 block text-[0.8rem] text-dim">{place}</span></span></li>
);
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="pt-6 first:pt-1"><h3 className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cloud/68">{title}</h3><div className="mt-1 divide-y divide-line border-b border-line">{children}</div></section>
);

function Panel({ tab, trip }: { tab: Tab; trip: Trip }) {
  if (tab === "flight") {
    const d = trip.departure;
    if (!d) return <Pending>Les détails de votre voyage apparaîtront ici dès leur confirmation.</Pending>;
    return (
      <dl className="divide-y divide-line border-b border-line">
        {([["Aéroport de départ", d.airport], ["Date et heure", d.when], ...(d.meeting ? [["Rendez-vous", d.meeting]] : [])] as [string, string][]).map(([k, v]) => (
          <div key={k} className="py-3.5"><dt className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-cloud/64">{k}</dt><dd className="mt-1.5 text-[1.05rem] leading-snug">{v}</dd></div>
        ))}
      </dl>
    );
  }
  if (tab === "stay") {
    const s = trip.stay;
    if (!s) return <Pending>Hébergement, transferts et programme apparaîtront ici dès leur publication par l&apos;équipe.</Pending>;
    return (
      <>
        {s.lodging && <Group title="Hébergement"><p className="py-3.5 text-[1.02rem]">{s.lodging}</p></Group>}
        {s.transfers.length > 0 && <Group title="Transferts"><ul className="divide-y divide-line">{s.transfers.map((x) => <Line key={x.id} {...x} />)}</ul></Group>}
        {s.program.length > 0 && <Group title="Programme"><ul className="divide-y divide-line">{s.program.map((x) => <Line key={x.id} {...x} />)}</ul></Group>}
      </>
    );
  }
  if (trip.updates.length === 0) return <Pending>Les annonces officielles de l&apos;organisation apparaîtront ici pendant Ibiza.</Pending>;
  return (
    <ul className="divide-y divide-line border-b border-line">
      {trip.updates.map((u) => (
        <li key={u.id} className="py-4"><p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-sky">{u.time}</p><p className="font-display mt-1.5 text-[1.05rem]">{u.title}</p><p className="mt-1 text-[0.88rem] leading-relaxed text-cloud/75">{u.text}</p></li>
      ))}
    </ul>
  );
}

/** MY FLIGHT : le voyage du membre. Pass personnel en premier écran, puis trois univers simples, selon la phase. */
export function V3Flight() {
  const { state } = useProto();
  const reduce = useReducedMotion();
  const metal = useMetal(1.7);
  const phase = state.phase;
  const demo = state.sim.trip;
  const trip = demo ? demoTrip : noTrip;
  const initial: Tab = phase === "during" ? "live" : "flight";
  const [pick, setPick] = useState<{ phase: string; tab: Tab } | null>(null);
  const tab = pick && pick.phase === phase ? pick.tab : initial;
  const [info, setInfo] = useState<null | "root" | (typeof docs)[number]>(null);
  const status: PassStatus = phase === "after" ? "ended" : state.sim.reservation === "confirmed" ? "confirmed" : "pending";
  const doc = info && info !== "root" ? info : null;

  return (
    <>
      <section aria-labelledby="flight-title" className="relative isolate px-5 pt-[calc(var(--safe-top)+5.25rem)]">
        <Backdrop src={images.before} position="30% 62%" className="!bottom-auto !h-[21rem]" />
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.24em] text-sky">Ibiza 2027 · {phaseLabels[phase]}</p>
        <h1 id="flight-title" className="font-display mt-2 text-[clamp(2.2rem,11.5vw,3.1rem)] leading-[0.92]">My Flight</h1>
        <div className="mt-4"><FlightPass name={state.me.pseudo} status={status} metal={metal} demo /></div>
        <TiltToggle metal={metal} label="Activer le reflet au mouvement" labelOn="Reflet au mouvement actif" />
      </section>

      {phase === "after" ? (
        <section className="px-5 pt-8" aria-labelledby="after-title">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-silver">Historique</p>
          <h2 id="after-title" className="font-display mt-2 text-[1.5rem] leading-tight">Ibiza 2027 fait désormais partie de votre histoire.</h2>
          <p className="mt-3 text-[0.92rem] leading-relaxed text-cloud/75">Retrouvez votre édition et vos souvenirs dans votre Club.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/v3/club/memories" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cloud px-5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-jet">Mes souvenirs <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></Link>
            <Link href="/v3/club" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-silver/45 px-5 font-mono text-[0.72rem] uppercase tracking-[0.16em]">Mon Club</Link>
          </div>
        </section>
      ) : (
        <section className="px-5 pt-7" aria-label="Informations du voyage">
          <LayoutGroup>
            <div role="tablist" aria-label="Informations du voyage" className="grid grid-cols-3 border-b border-line">
              {tabs.map((x) => (
                <button key={x.id} type="button" role="tab" id={`ft-${x.id}`} aria-controls="ft-panel" aria-selected={tab === x.id} onClick={() => setPick({ phase, tab: x.id })}
                  className={cn("relative flex min-h-16 flex-col items-start justify-start pr-2 pb-2.5 pt-2 text-left font-mono text-[0.7rem] uppercase leading-tight tracking-[0.14em] transition", tab === x.id ? "text-cloud" : "text-cloud/64")}>
                  <span aria-hidden className="mb-1 text-[0.7rem] text-sky">0{tabs.indexOf(x) + 1}</span>
                  <span>{x.label}</span>
                  {tab === x.id && <motion.span layoutId="ft-ink" aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-sky" transition={reduce ? { duration: 0 } : { duration: 0.35, ease }} />}
                </button>
              ))}
            </div>
          </LayoutGroup>
          <div role="tabpanel" id="ft-panel" aria-labelledby={`ft-${tab}`} className="min-h-[13rem] pt-4">
            {demo && <p className="mb-3 flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-cloud/68"><DemoTag>Démo</DemoTag>Aperçu fictif de la mise en page</p>}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.3, ease }}>
                <Panel tab={tab} trip={trip} />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      )}

      <section className="px-5 pb-10 pt-6">
        <button type="button" onClick={() => setInfo("root")} aria-haspopup="dialog" className="flex min-h-14 w-full items-center justify-between border-y border-line text-left text-[0.95rem]">Informations importantes<ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-silver" /></button>
      </section>

      <Sheet open={!!info} onClose={() => setInfo(null)} eyebrow={doc ? "Démo" : "SKYLINE"} title={doc ? doc.title : "Informations importantes"}>
        {doc ? (
          <>
            <button type="button" onClick={() => setInfo("root")} className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-dim"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden /> Retour</button>
            <p className="leading-relaxed text-cloud/80">{doc.text}</p><p className="mt-3 text-xs text-dim">Contenu de démonstration.</p>
          </>
        ) : (
          <>
            <p className="text-[0.92rem] leading-relaxed text-cloud/80">Le pass SKYLINE donne accès à l&apos;événement. Ce n&apos;est <strong className="font-medium text-cloud">pas un titre de transport</strong> et il ne remplace pas la carte d&apos;embarquement de la compagnie aérienne. Les détails de vol officiels sont ceux de la compagnie.</p>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-cloud/80">Seules les informations confirmées par SKYLINE s&apos;affichent dans MY FLIGHT.</p>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {docs.map((d) => <li key={d.id}><button type="button" onClick={() => setInfo(d)} className="flex min-h-14 w-full items-center justify-between text-left text-[0.95rem]">{d.title}<ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-silver" /></button></li>)}
            </ul>
          </>
        )}
      </Sheet>
    </>
  );
}
