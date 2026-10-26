"use client";
import Link from "next/link";
import { useState } from "react";
import { ScreenTitle, Block, DemoTag } from "./ui";
import { Emblem } from "@/components/ui/Emblem";
import { Sheet } from "@/components/ui/Sheet";
import { useProto } from "@/lib/useProto";
import { cn } from "@/lib/cn";

const Row = ({ k, v, status }: { k: string; v: string; status?: "pending" | "ok" }) => (
  <div className="flex items-center justify-between gap-4 border-b border-line py-3 text-[0.9rem]">
    <dt className="text-dim">{k}</dt>
    <dd className="flex items-center gap-2 text-right">{v}{status && <span className={cn("border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em]", status === "ok" ? "border-sky/60 text-sky" : "border-cloud/25 text-cloud/55")}>{status === "ok" ? "Confirmé" : "À confirmer"}</span>}</dd>
  </div>
);

const docs = [
  { id: "d1", title: "Conditions de participation", text: "Ici s'afficherait le document officiel fourni par SKYLINE." },
  { id: "d2", title: "Informations d'assurance", text: "Ici s'afficheraient les informations d'assurance, si l'organisation en fournit." },
  { id: "d3", title: "Contact de l'équipe", text: "Ici s'afficherait le moyen de contact officiel de l'équipe pendant le séjour." },
];

export function V3Flight() {
  const { state } = useProto();
  const [doc, setDoc] = useState<(typeof docs)[number] | null>(null);
  const after = state.phase === "after";
  return (
    <>
      <ScreenTitle eyebrow="Your access" title="My Flight" />

      <Block>
        <article aria-label="Pass événementiel SKYLINE" className="border border-silver/40 bg-jet p-5">
          <div className="flex items-start justify-between gap-4">
            <Emblem size={64} />
            <DemoTag />
          </div>
          <p className="mt-5 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-cloud/55">Pass événementiel SKYLINE</p>
          <p className="font-display mt-1.5 text-[1.3rem]">{state.me.pseudo}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[0.62rem] uppercase tracking-[0.14em]">
            <div><dt className="text-cloud/50">Édition</dt><dd className="mt-1">Ibiza 2027</dd></div>
            <div><dt className="text-cloud/50">Statut</dt><dd className="mt-1">{after ? "Édition terminée" : "[Statut officiel]"}</dd></div>
            <div><dt className="text-cloud/50">N° de pass</dt><dd className="mt-1">[Attribué par l&apos;équipe]</dd></div>
            <div><dt className="text-cloud/50">Trajet</dt><dd className="mt-1">France → Ibiza</dd></div>
          </dl>
        </article>
        <p className="mt-3 border-l border-sky pl-4 text-[0.82rem] leading-relaxed text-cloud/80">Le pass SKYLINE donne accès à l&apos;événement. Ce n&apos;est <strong className="font-medium text-cloud">pas un titre de transport</strong> et il ne remplace pas la carte d&apos;embarquement de la compagnie aérienne.</p>
      </Block>

      <Block label="Réservation">
        <dl className="border-t border-line"><Row k="Statut" v="[Statut officiel]" status="pending" /><Row k="Référence" v="[Référence officielle]" status="pending" /></dl>
      </Block>

      <Block label="Départ vérifié">
        <dl className="border-t border-line"><Row k="Aéroport" v="[À confirmer]" status="pending" /><Row k="Date et heure" v="[À confirmer]" status="pending" /><Row k="Compagnie / vol" v="[Information officielle]" status="pending" /></dl>
        <p className="mt-3 text-[0.78rem] text-dim">Seules les informations vérifiées par SKYLINE s&apos;affichent ici. Les détails de vol officiels sont ceux de la compagnie aérienne.</p>
      </Block>

      <Block label="Programme pratique" className="scroll-mt-24">
        <div id="programme" className="scroll-mt-28" />
        {state.phase === "before" ? (
          <div role="status" className="border border-dashed border-cloud/20 px-5 py-7 text-center"><p className="font-display text-[1.02rem]">Programme à venir</p><p className="mx-auto mt-2 max-w-[32ch] text-[0.85rem] text-dim">Il sera publié ici par l&apos;équipe, uniquement lorsqu&apos;il sera confirmé.</p></div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {["Activité 1", "Activité 2", "Activité 3"].map((a) => (
              <li key={a} className="flex items-center gap-4 py-3.5"><span className="w-12 font-mono text-[0.7rem] text-cloud/60">--:--</span><span className="flex-1 text-[0.92rem]">[Titre et lieu officiels]</span><DemoTag /></li>
            ))}
          </ul>
        )}
      </Block>

      <Block label="Documents essentiels">
        <ul className="divide-y divide-line border-y border-line">
          {docs.map((d) => (
            <li key={d.id}><button type="button" onClick={() => setDoc(d)} aria-haspopup="dialog" className="flex min-h-14 w-full items-center justify-between text-left text-[0.95rem]">{d.title}<span aria-hidden className="text-silver">→</span></button></li>
          ))}
        </ul>
      </Block>

      {after && <Block><Link href="/v3/club" className="inline-flex min-h-11 items-center border-b border-sky/70 pb-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-sky">Retrouver mon Club →</Link></Block>}
      <div className="h-8" />
      <Sheet open={!!doc} onClose={() => setDoc(null)} eyebrow="Démo" title={doc?.title ?? ""}><p className="leading-relaxed text-cloud/80">{doc?.text}</p><p className="mt-3 text-xs text-dim">Contenu de démonstration.</p></Sheet>
    </>
  );
}
