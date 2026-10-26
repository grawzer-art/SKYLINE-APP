"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScreenTitle, Block, DemoTag } from "./ui";
import { Emblem } from "@/components/ui/Emblem";
import { useProto } from "@/lib/useProto";

/** CLUB : carte membre (noir / argent / blanc) puis les quatre espaces. */
export function V3Club() {
  const { state } = useProto();
  const pendingIn = Object.values(state.incoming).filter((v) => v === "pending").length;
  const items = [
    { label: "My Space", href: "/v3/club/space", hint: "Votre profil de membre" },
    { label: "Members", href: "/v3/club/members", hint: "Découvrir les membres visibles" },
    { label: "Messages", href: "/v3/club/messages", hint: pendingIn ? `${pendingIn} demande${pendingIn > 1 ? "s" : ""} de contact` : "Conversations privées", badge: pendingIn },
    { label: "Souvenirs", href: "/v3/club/memories", hint: "Archives officielles" },
  ];
  return (
    <>
      <ScreenTitle eyebrow="The membership" title="Club" />
      <Block>
        <article aria-label="Carte membre" className="border border-silver/50 bg-jet p-5">
          <div className="flex items-start justify-between"><Emblem size={72} /><DemoTag /></div>
          <p className="mt-6 font-mono text-[0.56rem] uppercase tracking-[0.24em] text-silver">Member</p>
          <p className="font-display mt-1.5 text-[1.4rem]">{state.me.pseudo}</p>
          <dl className="mt-5 flex justify-between border-t border-silver/30 pt-3 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
            <div><dt className="text-cloud/45">Depuis</dt><dd className="mt-1">{state.phase === "before" ? "Inscrit · Ibiza 2027" : "Ibiza 2027"}</dd></div>
            <div className="text-right"><dt className="text-cloud/45">N°</dt><dd className="mt-1">[Attribué]</dd></div>
          </dl>
        </article>
      </Block>
      <Block>
        <ul className="divide-y divide-line border-y border-line">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="group flex min-h-[4.25rem] items-center justify-between gap-4 py-3">
                <span><span className="font-display block text-[1.02rem]">{i.label}</span><span className="mt-0.5 block text-[0.8rem] text-dim">{i.hint}</span></span>
                <span className="flex items-center gap-3">{!!i.badge && <span className="border border-sky/60 px-1.5 py-0.5 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-sky">New</span>}<ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-silver transition group-hover:translate-x-1" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </Block>
      <Block label="Historique de participation">
        {state.phase === "before"
          ? <p className="text-[0.88rem] text-dim">Aucune édition pour l&apos;instant. Votre participation à Ibiza 2027 apparaîtra ici.</p>
          : <p className="border-b border-line py-3 text-[0.92rem]">Ibiza 2027 <span className="ml-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">[Dates officielles]</span></p>}
      </Block>
      <Block label="À venir"><p className="text-[0.88rem] text-dim">Les prochaines éditions et accès anticipés apparaîtront ici lorsqu&apos;ils seront réellement proposés.</p></Block>
      <div className="h-8" />
    </>
  );
}
