"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenTitle, Block, Initials, Empty } from "./ui";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { members } from "@/data/v3";
import { closeThenGo } from "@/lib/sheetNav";
import { useProto } from "@/lib/useProto";
import { cn } from "@/lib/cn";

const reasons = ["Comportement inapproprié", "Faux profil / usurpation", "Spam ou sollicitation", "Autre"];
const MAX = 500;

/** Conversation privée : composeur local, blocage et signalement accessibles à tout moment. */
export function V3Chat({ id }: { id: string }) {
  const router = useRouter();
  const { state, update } = useProto();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<"none" | "block" | "report" | "done">("none");
  const [reason, setReason] = useState(reasons[0]);
  const end = useRef<HTMLDivElement>(null);
  const m = members.find((x) => x.id === id);
  const allowed = !!m && !state.blocked.includes(id) && (state.outgoing[id] === "accepted" || state.incoming[id] === "accepted");
  const msgs = state.messages[id] ?? [];
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  if (!m || !allowed) return (<><ScreenTitle eyebrow="Messages" title="Conversation" back={{ href: "/v3/club/messages", label: "Messages" }} /><Block><Empty title="Conversation indisponible" text="Elle n'existe pas, ou le contact a été bloqué." /></Block></>);

  const send = () => {
    const t = text.trim(); if (!t) return;
    update((s) => ({ ...s, messages: { ...s.messages, [id]: [...(s.messages[id] ?? []), { from: "me", text: t.slice(0, MAX), t: "À l'instant" }] } }));
    setText("");
  };

  return (
    <>
      <ScreenTitle eyebrow="Message privé" title={m.pseudo} back={{ href: "/v3/club/messages", label: "Messages" }}>
        <div className="mt-3 flex gap-6 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">
          <button type="button" onClick={() => setMenu("block")} className="min-h-11 underline-offset-4 hover:text-cloud hover:underline">Bloquer</button>
          <button type="button" onClick={() => setMenu("report")} className="min-h-11 underline-offset-4 hover:text-cloud hover:underline">Signaler</button>
        </div>
      </ScreenTitle>
      <Block className="pb-40 pt-4">
        <ul aria-label={`Conversation avec ${m.pseudo}`} className="space-y-3">
          {msgs.map((x, i) => (
            <li key={i} className={cn("flex", x.from === "me" ? "justify-end" : "justify-start gap-3")}>
              {x.from === "them" && <Initials name={m.pseudo} size={28} className="mt-1" />}
              <p className={cn("max-w-[78%] px-4 py-2.5 text-[0.92rem] leading-snug", x.from === "me" ? "bg-cloud text-jet" : "border border-line bg-surface-1")}>{x.text}<span className={cn("mt-1 block font-mono text-[0.5rem] uppercase tracking-[0.12em]", x.from === "me" ? "text-jet/55" : "text-dim")}>{x.t}</span></p>
            </li>
          ))}
        </ul>
        <div ref={end} />
      </Block>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-bottom))] z-40 mx-auto flex w-full max-w-[480px] items-end gap-2 border-t border-line bg-jet/95 px-4 py-3 backdrop-blur-xl">
        <label htmlFor="msg" className="sr-only">Votre message</label>
        <textarea id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX} rows={1} placeholder="Écrire un message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="max-h-28 min-h-12 flex-1 resize-none border border-line bg-surface-1 px-4 py-3 text-[1rem] outline-none focus:border-sky" />
        <Button type="submit" disabled={!text.trim()} className="min-h-12 px-5 text-[0.66rem] disabled:opacity-40">Envoyer</Button>
      </form>

      <Sheet open={menu !== "none"} onClose={() => setMenu("none")}
        eyebrow={menu === "block" ? "Confidentialité" : "Modération"}
        title={menu === "block" ? `Bloquer ${m.pseudo} ?` : menu === "done" ? "Signalement enregistré" : `Signaler ${m.pseudo}`}>
        {menu === "block" && (<>
          <p className="leading-relaxed text-cloud/80">La conversation disparaît de votre liste et cette personne ne peut plus vous écrire. Elle n&apos;est pas prévenue. Débloquer : Profil › Confidentialité.</p>
          <div className="mt-5 grid gap-3"><Button onClick={() => { update((s) => ({ ...s, blocked: [...s.blocked, id] })); closeThenGo(() => setMenu("none"), () => router.push("/v3/club/messages")); }}>Bloquer</Button><Button variant="ghost" onClick={() => setMenu("none")}>Annuler</Button></div>
        </>)}
        {menu === "report" && (<>
          <fieldset><legend className="text-sm text-dim">Motif</legend>
            <div className="mt-3 space-y-2">{reasons.map((r) => (
              <label key={r} className="flex min-h-12 cursor-pointer items-center gap-3 border border-line px-4 text-[0.92rem]"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[#8FB8FF]" />{r}</label>
            ))}</div>
          </fieldset>
          <p className="mt-4 text-[0.78rem] text-dim">En production, les derniers messages de la conversation signalée sont joints au signalement pour examen par la modération (prototype : rien n&apos;est envoyé).</p>
          <div className="mt-5 grid gap-3"><Button onClick={() => { update((s) => ({ ...s, reported: [...s.reported, id] })); setMenu("done"); }}>Envoyer le signalement</Button><Button variant="ghost" onClick={() => setMenu("none")}>Annuler</Button></div>
        </>)}
        {menu === "done" && (<>
          <p className="leading-relaxed text-cloud/80">Merci. Vous pouvez aussi bloquer ce membre si vous le souhaitez.</p>
          <Button variant="ghost" onClick={() => setMenu("none")} className="mt-5 w-full">Fermer</Button>
        </>)}
      </Sheet>
    </>
  );
}
