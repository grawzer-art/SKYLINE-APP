"use client";
import Link from "next/link";
import { useState } from "react";
import { ScreenTitle, Block, Initials, Empty } from "./ui";
import { Button } from "@/components/ui/Button";
import { members } from "@/data/v3";
import { useProto } from "@/lib/useProto";
import { cn } from "@/lib/cn";

/** MESSAGES : conversations avec les contacts acceptés + demandes de contact reçues. Aucun message réel. */
export function V3Messages() {
  const { state, update } = useProto();
  const [tab, setTab] = useState<"chats" | "requests">("chats");
  const name = (id: string) => members.find((m) => m.id === id)?.pseudo ?? "Membre";

  const contactIds = Array.from(new Set([
    ...Object.entries(state.outgoing).filter(([, v]) => v === "accepted").map(([k]) => k),
    ...Object.entries(state.incoming).filter(([, v]) => v === "accepted").map(([k]) => k),
  ])).filter((id) => !state.blocked.includes(id));
  const requests = Object.entries(state.incoming).filter(([id, v]) => v === "pending" && !state.blocked.includes(id)).map(([id]) => id);
  const contactable = state.settings.contact === "members";

  return (
    <>
      <ScreenTitle eyebrow="Club" title="Messages" back={{ href: "/v3/club", label: "Club" }} />
      <Block>
        <div role="tablist" aria-label="Messages" className="grid grid-cols-2 border border-line">
          {([["chats", "Conversations"], ["requests", `Demandes${requests.length ? ` (${requests.length})` : ""}`]] as const).map(([k, l]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("min-h-12 font-mono text-[0.64rem] uppercase tracking-[0.16em] transition", tab === k ? "bg-cloud text-jet" : "text-cloud/70")}>{l}</button>
          ))}
        </div>
      </Block>
      <Block className="pt-4">
        {tab === "chats" ? (
          contactIds.length === 0 ? <Empty title="Aucune conversation" text="Demandez un contact depuis l'annuaire : la conversation s'ouvre une fois la demande acceptée." /> : (
            <ul className="divide-y divide-line border-y border-line">
              {contactIds.map((id) => {
                const msgs = state.messages[id] ?? []; const last = msgs[msgs.length - 1];
                return (
                  <li key={id}><Link href={`/v3/club/messages/${id}`} className="flex min-h-[4.5rem] items-center gap-4 py-3">
                    <Initials name={name(id)} size={44} />
                    <span className="min-w-0 flex-1"><span className="block text-[0.98rem]">{name(id)}</span><span className="block truncate text-[0.82rem] text-dim">{last ? `${last.from === "me" ? "Vous : " : ""}${last.text}` : "Nouvelle conversation"}</span></span>
                    {last && <span className="shrink-0 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-dim">{last.t}</span>}
                  </Link></li>
                );
              })}
            </ul>
          )
        ) : requests.length === 0 ? <Empty title="Aucune demande" text="Les demandes de contact des membres apparaîtront ici. Vous pouvez les accepter ou les refuser sans explication." /> : (
          <ul className="divide-y divide-line border-y border-line">
            {requests.map((id) => (
              <li key={id} className="py-4">
                <div className="flex items-center gap-4"><Initials name={name(id)} size={44} /><div><p className="text-[0.98rem]">{name(id)}</p><p className="text-[0.8rem] text-dim">souhaite entrer en contact</p></div></div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Button onClick={() => update((s) => ({ ...s, incoming: { ...s.incoming, [id]: "accepted" } }))} className="min-h-11 px-3 text-[0.64rem]">Accepter</Button>
                  <Button variant="ghost" onClick={() => update((s) => ({ ...s, incoming: { ...s.incoming, [id]: "declined" } }))} className="min-h-11 px-3 text-[0.64rem]">Refuser</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!contactable && <p className="mt-4 border-l border-sky pl-4 text-[0.78rem] text-dim">Vous avez choisi de ne recevoir aucune nouvelle demande (Profil › Confidentialité).</p>}
      </Block>
      <p className="px-5 pb-8 pt-4 text-[0.72rem] text-dim">Prototype : aucun message n&apos;est envoyé ni stocké en dehors de cet appareil.</p>
    </>
  );
}
