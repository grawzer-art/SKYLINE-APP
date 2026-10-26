"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScreenTitle, Block, DemoTag } from "./ui";
import { Emblem } from "@/components/ui/Emblem";
import { useCommunity } from "@/lib/useCommunity";

/** CLUB : carte membre (noir / argent / blanc), accès communautaire, puis les espaces. */
export function V3Club() {
  const c = useCommunity();
  const { t, state } = c;
  const nReq = c.pendingRequests.length;
  const items = [
    { label: "My Space", href: "/v3/club/space", hint: t("space.persist"), badge: 0 },
    { label: "Members", href: "/v3/club/members", hint: c.eligible ? t("members.footer").split(".")[0] + "." : t("gate.locked.text"), badge: 0 },
    { label: "Messages", href: "/v3/club/messages", hint: !c.eligible ? t("gate.locked.text") : nReq ? `${t("messages.tab.requests.n", { n: nReq })}` : c.unreadTotal ? t("messages.unread", { count: c.unreadTotal }) : t("messages.tab.chats"), badge: c.eligible ? nReq + c.unreadTotal : 0 },
    { label: "Souvenirs", href: "/v3/club/memories", hint: "Archives officielles", badge: 0 },
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
        {c.eligible ? (
          <p className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-sky"><span aria-hidden className="size-1.5 rounded-full bg-sky" />{t("gate.done.title")}</p>
        ) : (
          <Link href="/v3/club/community" className="group block border border-sky/50 p-4">
            <span className="font-display block text-[1.02rem]">{t("gate.title")}</span>
            <span className="mt-1 block text-[0.82rem] text-cloud/75">{t("gate.intro").split(".")[0]}.</span>
            <span className="mt-3 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-sky">{t("gate.locked.cta")} <ArrowRight size={14} strokeWidth={1.5} aria-hidden className="transition group-hover:translate-x-1" /></span>
          </Link>
        )}
      </Block>

      <Block className="pt-2">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="group flex min-h-[4.25rem] items-center justify-between gap-4 py-3">
                <span className="min-w-0"><span className="font-display block text-[1.02rem]">{i.label}</span><span className="mt-0.5 block truncate text-[0.8rem] text-dim">{i.hint}</span></span>
                <span className="flex items-center gap-3">{!!i.badge && <span className="border border-sky/60 px-1.5 py-0.5 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-sky">{t("common.new")}</span>}<ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-silver transition group-hover:translate-x-1" /></span>
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
    </>
  );
}
