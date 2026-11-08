"use client";
import Link from "next/link";
import { useState } from "react";
import { ScreenTitle, Block, Switch, Initials } from "./ui";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ChangeSpaceLink, SpaceSwitcher } from "@/components/staff/SpaceSwitcher";
import { locales } from "@/i18n";
import { useCommunity } from "@/lib/useCommunity";
import { authActive, identityName, useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";
import { cn } from "@/lib/cn";

/** Profil & paramètres du compte (via l'avatar) : langue, notifications, blocages, données. La visibilité et le contact se règlent dans My Space. */
export function V3Profile() {
  const c = useCommunity();
  const { t, state, update, reset } = c;
  const [info, setInfo] = useState<null | "export" | "delete" | "help">(null);
  const identity = useParticipantIdentity(); const real = authActive(identity); const loading = identity.status === "loading"; const shownName = loading ? "" : real ? identityName(identity) ?? "" : state.me.pseudo;   // jamais d'identité de démonstration pendant le chargement
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
      <AccountBlock />
      <Block>
        <div className="flex items-center gap-4"><Initials name={shownName || "?"} size={64} /><div><p className="font-display text-[1.15rem]" data-testid="profile-name">{shownName || (real ? "—" : "")}</p><Link href="/v3/club/space" className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">{t("space.title")} →</Link></div></div>
      </Block>
      <Block label={t("profile.language")}>
        <div role="radiogroup" aria-label={t("profile.language")} className="grid grid-cols-2 gap-2">
          {locales.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={state.locale === l.id} onClick={() => update((p) => ({ ...p, locale: l.id }))}
              className={cn("min-h-12 border px-3 text-[0.9rem] transition", state.locale === l.id ? "border-sky bg-sky text-jet" : "border-line bg-surface-1")}>{l.label}</button>
          ))}
        </div>
      </Block>
      {!real && !loading && <Block label="Communauté">
        <Link href="/v3/club/community" className="flex min-h-14 items-center justify-between border-y border-line text-[0.95rem]">{c.eligible ? t("gate.done.title") : t("gate.title")}<span aria-hidden className="text-silver">→</span></Link>
      </Block>}
      <Block label="Membres bloqués">
        {state.blocked.length === 0 ? <p className="text-[0.88rem] text-dim">Aucun membre bloqué.</p> : (
          <ul className="divide-y divide-line border-y border-line">
            {state.blocked.map((id) => (
              <li key={id} className="flex min-h-14 items-center justify-between gap-4"><span>{c.member(id)?.pseudo ?? "Membre"}</span><button type="button" onClick={() => c.unblock(id)} className="min-h-11 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-sky">{t("member.unblock")}</button></li>
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
      <Block label="Espace"><SpaceSwitcher /><ChangeSpaceLink className="mt-3" /></Block>
      <Block label="Prototype"><Button variant="ghost" onClick={reset} className="w-full">Réinitialiser le prototype</Button><p className="mt-2 text-[0.72rem] text-dim">Efface l&apos;état local de démonstration sur cet appareil.</p></Block>
      <Sheet open={!!info} onClose={() => setInfo(null)} eyebrow="Prototype" title={info ? texts[info].t : ""}><p className="leading-relaxed text-cloud/80">{info ? texts[info].p : ""}</p><Button variant="ghost" onClick={() => setInfo(null)} className="mt-5 w-full">{t("common.close")}</Button></Sheet>
    </>
  );
}

/** Compte SKYLINE réel (authentification participants active) : identité du participant connecté, ou invitation à se connecter. Absent en mode démonstration (par défaut). */
function AccountBlock() {
  const id = useParticipantIdentity(); const name = identityName(id);
  if (id.status === "off" || id.status === "loading" || id.status === "misconfigured") return null;
  const link = "flex min-h-14 items-center justify-between border-y border-line text-[0.95rem]";
  return (
    <Block label="Mon compte SKYLINE">
      {id.status === "ready" ? <Link href="/v3/account" className={link} data-testid="account-link"><span><span className="block">{name ?? "Compléter mon profil"}</span><span className="block text-[0.78rem] text-dim">{id.email}</span></span><span aria-hidden className="text-silver">→</span></Link>
        : id.status === "no_access" ? <p role="status" className="rounded-[10px] border border-line p-4 text-[0.92rem] leading-snug text-cloud/85">Ce compte n&apos;a pas accès à l&apos;espace participants. Contactez l&apos;organisation SKYLINE.</p>
        : id.status === "error" ? <p role="status" className="text-[0.9rem] text-dim">Compte momentanément indisponible.</p>
        : <Link href="/v3/login?next=/v3/account" className={link} data-testid="login-link">Se connecter<span aria-hidden className="text-silver">→</span></Link>}
    </Block>
  );
}
