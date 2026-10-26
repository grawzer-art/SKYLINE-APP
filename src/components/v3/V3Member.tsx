"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenTitle, Block, Initials, Empty, DemoTag } from "./ui";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { members } from "@/data/v3";
import { closeThenGo } from "@/lib/sheetNav";
import { useProto } from "@/lib/useProto";

const reasons = ["Comportement inapproprié", "Faux profil / usurpation", "Spam ou sollicitation", "Autre"];

/** Fiche membre : demande de contact, blocage, signalement. */
export function V3Member({ id }: { id: string }) {
  const router = useRouter();
  const { state, update } = useProto();
  const [menu, setMenu] = useState<"none" | "block" | "report" | "done">("none");
  const [reason, setReason] = useState(reasons[0]);
  const m = members.find((x) => x.id === id && x.visible);

  if (!m || !state.me.visible) return (<><ScreenTitle eyebrow="Club" title="Profil" back={{ href: "/v3/club/members", label: "Members" }} /><Block><Empty title="Profil indisponible" text="Ce membre n'est pas visible, ou votre propre profil est masqué." /></Block></>);

  const out = state.outgoing[m.id];
  const blocked = state.blocked.includes(m.id);
  const reported = state.reported.includes(m.id);
  const act = (fn: (s: typeof state) => typeof state) => update(fn);

  return (
    <>
      <ScreenTitle eyebrow="Membre" title={m.pseudo} back={{ href: "/v3/club/members", label: "Members" }} />
      <Block>
        <div className="flex items-center gap-4"><Initials name={m.pseudo} size={72} /><div><p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-cloud/80">{m.city}</p><p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-dim">{m.genres.join(" · ")}</p><div className="mt-2"><DemoTag>Profil fictif</DemoTag></div></div></div>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-cloud/85">{m.bio}</p>
      </Block>
      <Block>
        {blocked ? (
          <div role="status" className="border border-dashed border-cloud/25 p-4"><p className="text-[0.9rem]">Vous avez bloqué ce membre.</p><Button variant="ghost" className="mt-3 w-full" onClick={() => act((s) => ({ ...s, blocked: s.blocked.filter((b) => b !== m.id) }))}>Débloquer</Button></div>
        ) : out === "accepted" ? (
          <Link href={`/v3/club/messages/${m.id}`} className="flex min-h-12 w-full items-center justify-center rounded-full bg-cloud px-6 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-jet">Envoyer un message</Link>
        ) : out === "sent" ? (
          <div role="status" className="border border-line p-4 text-[0.9rem]">Demande envoyée. {m.pseudo} peut l&apos;accepter ou l&apos;ignorer ; vous ne serez pas notifié d&apos;un refus.
            <Button variant="ghost" className="mt-3 w-full" onClick={() => act((s) => { const o = { ...s.outgoing }; delete o[m.id]; return { ...s, outgoing: o }; })}>Annuler la demande</Button></div>
        ) : (
          <Button onClick={() => act((s) => ({ ...s, outgoing: { ...s.outgoing, [m.id]: "sent" } }))} className="w-full">Demander un contact</Button>
        )}
        {!blocked && (
          <div className="mt-4 flex gap-6 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">
            <button type="button" onClick={() => setMenu("block")} className="min-h-11 underline-offset-4 hover:text-cloud hover:underline">Bloquer</button>
            <button type="button" onClick={() => setMenu("report")} disabled={reported} className="min-h-11 underline-offset-4 hover:text-cloud hover:underline disabled:no-underline disabled:opacity-60">{reported ? "Signalé" : "Signaler"}</button>
          </div>
        )}
      </Block>
      <div className="h-8" />

      <Sheet open={menu !== "none"} onClose={() => setMenu("none")}
        eyebrow={menu === "block" ? "Confidentialité" : "Modération"}
        title={menu === "block" ? `Bloquer ${m.pseudo} ?` : menu === "done" ? "Signalement enregistré" : `Signaler ${m.pseudo}`}>
        {menu === "block" && (<>
          <p className="leading-relaxed text-cloud/80">Cette personne ne pourra plus vous trouver ni vous écrire, et vous ne la verrez plus. Elle n&apos;est pas prévenue. Vous pouvez débloquer à tout moment depuis votre profil.</p>
          <div className="mt-5 grid gap-3"><Button onClick={() => { act((s) => ({ ...s, blocked: [...s.blocked, m.id] })); closeThenGo(() => setMenu("none"), () => router.push("/v3/club/members")); }}>Bloquer</Button><Button variant="ghost" onClick={() => setMenu("none")}>Annuler</Button></div>
        </>)}
        {menu === "report" && (<>
          <fieldset><legend className="text-sm text-dim">Motif</legend>
            <div className="mt-3 space-y-2">{reasons.map((r) => (
              <label key={r} className="flex min-h-12 cursor-pointer items-center gap-3 border border-line px-4 text-[0.92rem]"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[#8FB8FF]" />{r}</label>
            ))}</div>
          </fieldset>
          <p className="mt-4 text-[0.78rem] text-dim">Le signalement est transmis à l&apos;équipe de modération SKYLINE (prototype : rien n&apos;est envoyé). Le membre n&apos;est pas prévenu.</p>
          <div className="mt-5 grid gap-3"><Button onClick={() => { act((s) => ({ ...s, reported: [...s.reported, m.id] })); setMenu("done"); }}>Envoyer le signalement</Button><Button variant="ghost" onClick={() => setMenu("none")}>Annuler</Button></div>
        </>)}
        {menu === "done" && (<>
          <p className="leading-relaxed text-cloud/80">Merci. Vous pouvez aussi bloquer ce membre si vous le souhaitez.</p>
          <Button variant="ghost" onClick={() => setMenu("none")} className="mt-5 w-full">Fermer</Button>
        </>)}
      </Sheet>
    </>
  );
}
