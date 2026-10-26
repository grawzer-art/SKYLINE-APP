"use client";
import Link from "next/link";
import { useState } from "react";
import { ScreenTitle, Block, Switch, Initials } from "./ui";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { members } from "@/data/v3";
import { useProto } from "@/lib/useProto";
import { cn } from "@/lib/cn";

/** Profil & paramètres du compte (accessible depuis l'avatar). Confidentialité, blocages, notifications, données. */
export function V3Profile() {
  const { state, update, reset } = useProto();
  const [info, setInfo] = useState<null | "export" | "delete" | "help">(null);
  const s = state.settings;
  const setS = (patch: Partial<typeof s>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  const texts = {
    export: { t: "Exporter mes données", p: "En production : un fichier regroupant votre profil, vos conversations et vos préférences, envoyé à votre adresse e-mail sous 30 jours maximum." },
    delete: { t: "Supprimer mon compte", p: "En production : suppression du profil, des conversations et des préférences, après confirmation par e-mail. Les messages déjà reçus par d'autres membres ne sont pas supprimés de leur côté. Prototype : aucune suppression réelle." },
    help: { t: "Aide & contact", p: "Ici s'afficherait le moyen de contact officiel de l'équipe SKYLINE (à renseigner)." },
  } as const;

  return (
    <>
      <ScreenTitle eyebrow="Compte" title="Profil" />
      <Block>
        <div className="flex items-center gap-4"><Initials name={state.me.pseudo} size={64} /><div><p className="font-display text-[1.15rem]">{state.me.pseudo}</p><Link href="/v3/club/space" className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-sky">Modifier My Space →</Link></div></div>
      </Block>
      <Block label="Confidentialité">
        <Switch on={state.me.visible} onChange={(v) => update((p) => ({ ...p, me: { ...p.me, visible: v } }))} label="Visible dans l'annuaire" hint="Désactivé par défaut." />
        <fieldset className="border-b border-line py-3"><legend className="sr-only">Qui peut me contacter</legend>
          <p className="text-[0.95rem]">Qui peut me demander un contact</p>
          <div role="radiogroup" className="mt-3 grid grid-cols-2 gap-2">
            {([["members", "Membres visibles"], ["nobody", "Personne"]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={s.contact === v} onClick={() => setS({ contact: v })} className={cn("min-h-12 border px-3 text-[0.85rem] transition", s.contact === v ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{l}</button>
            ))}
          </div>
        </fieldset>
      </Block>
      <Block label="Membres bloqués">
        {state.blocked.length === 0 ? <p className="text-[0.88rem] text-dim">Aucun membre bloqué.</p> : (
          <ul className="divide-y divide-line border-y border-line">
            {state.blocked.map((id) => (
              <li key={id} className="flex min-h-14 items-center justify-between gap-4"><span>{members.find((m) => m.id === id)?.pseudo ?? "Membre"}</span><button type="button" onClick={() => update((p) => ({ ...p, blocked: p.blocked.filter((b) => b !== id) }))} className="min-h-11 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-sky">Débloquer</button></li>
            ))}
          </ul>
        )}
      </Block>
      <Block label="Notifications">
        <Switch on={s.notifMessages} onChange={(v) => setS({ notifMessages: v })} label="Messages et demandes de contact" />
        <Switch on={s.notifSignal} onChange={(v) => setS({ notifSignal: v })} label="SKYLINE SIGNAL" hint="Jamais de relance, jamais de compteur." />
      </Block>
      <Block label="Mes données">
        <ul className="divide-y divide-line border-y border-line">
          {(["export", "delete", "help"] as const).map((k) => <li key={k}><button type="button" onClick={() => setInfo(k)} aria-haspopup="dialog" className="flex min-h-14 w-full items-center justify-between text-left text-[0.95rem]">{texts[k].t}<span aria-hidden className="text-silver">→</span></button></li>)}
        </ul>
      </Block>
      <Block label="Prototype"><Button variant="ghost" onClick={reset} className="w-full">Réinitialiser le prototype</Button><p className="mt-2 text-[0.72rem] text-dim">Efface l&apos;état local de démonstration sur cet appareil.</p></Block>
      <div className="h-8" />
      <Sheet open={!!info} onClose={() => setInfo(null)} eyebrow="Prototype" title={info ? texts[info].t : ""}><p className="leading-relaxed text-cloud/80">{info ? texts[info].p : ""}</p><Button variant="ghost" onClick={() => setInfo(null)} className="mt-5 w-full">Fermer</Button></Sheet>
    </>
  );
}
