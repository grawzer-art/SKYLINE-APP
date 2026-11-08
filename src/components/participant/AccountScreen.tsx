"use client";
import Link from "next/link";
import { useState } from "react";
import { ScreenTitle, Block } from "@/components/v3/ui";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { saveParticipantProfile } from "@/lib/participant/profileService";
import { refreshParticipantIdentity, useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";
import type { ParticipantProfile } from "@/lib/participant/access";
import { PROFILE_LIMITS, suggestDisplayName, validateProfileInput, type ProfileErrors } from "@/domain/participant";
import { cn } from "@/lib/cn";

const field = "mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky disabled:opacity-50";
const label = "block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72";
const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] transition active:scale-[0.97] disabled:opacity-40";

/** MON COMPTE (page personnelle, protégée côté serveur par src/proxy.ts) : identité réelle du participant, modification de SON profil, déconnexion. */
export function AccountScreen() {
  const id = useParticipantIdentity();
  return (
    <>
      <ScreenTitle eyebrow="Compte" title="Mon compte" back={{ href: "/v3/profile", label: "Profil" }} />
      {id.status === "loading" && <Block><p role="status" aria-live="polite" className="font-mono text-[0.78rem] uppercase tracking-[0.14em] text-sky">Chargement…</p><div aria-hidden className="mt-4 space-y-3"><div className="h-14 animate-pulse rounded-[8px] bg-surface-1 motion-reduce:animate-none" /><div className="h-14 animate-pulse rounded-[8px] bg-surface-1 motion-reduce:animate-none" /></div></Block>}
      {(id.status === "error" || id.status === "misconfigured") && <Block><div role="alert" className="rounded-[10px] border border-sunset/60 p-4"><p className="font-display text-[1.2rem]">Compte indisponible</p><p className="mt-2 text-[0.95rem] text-cloud/80">{id.status === "misconfigured" ? id.configError : "Impossible de charger votre compte pour le moment."}</p><button type="button" onClick={() => void refreshParticipantIdentity()} className={cn(btn, "mt-4 bg-cloud text-jet")}>Réessayer</button></div></Block>}
      {(id.status === "anonymous" || id.status === "no_access" || id.status === "off") && <Block><div role="status" className="rounded-[10px] border border-line p-4"><p className="font-display text-[1.2rem]">{id.status === "no_access" ? "Accès non activé" : "Vous n'êtes pas connecté"}</p><p className="mt-2 text-[0.95rem] text-cloud/80">{id.status === "no_access" ? "Ce compte n'a pas accès à l'espace participants. Contactez l'organisation SKYLINE." : "Connectez-vous pour consulter votre compte."}</p>{id.status !== "off" && <Link href="/v3/login?next=/v3/account" className={cn(btn, "mt-4 bg-cloud text-jet")}>Se connecter</Link>}</div></Block>}
      {id.status === "ready" && <Ready email={id.email} profile={id.profile} available={id.profileAvailable} traveler={id.traveler ?? "unknown"} />}
    </>
  );
}

function Ready({ email, profile, available, traveler }: { email: string; profile: ParticipantProfile | null; available: boolean; traveler: "none" | "verified" | "unknown" }) {
  const [first, setFirst] = useState(profile?.firstName ?? ""); const [last, setLast] = useState(profile?.lastName ?? ""); const [display, setDisplay] = useState(profile?.displayName ?? "");
  const [touched, setTouched] = useState(!!profile); // le nom affiché suit le prénom tant que l'utilisateur ne l'a pas modifié
  const [errors, setErrors] = useState<ProfileErrors>({}); const [busy, setBusy] = useState(false); const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setRes(null);
    const v = validateProfileInput({ firstName: first, lastName: last, displayName: display }); if (!v.ok) { setErrors(v.errors); return; } setErrors({});
    setBusy(true); const r = await saveParticipantProfile(createBrowserSupabase(), v.value);
    if (r.ok) { await refreshParticipantIdentity(); setRes({ ok: true, message: "Profil enregistré." }); } else { if (r.fields) setErrors(r.fields); setRes({ ok: false, message: r.message }); }
    setBusy(false);
  };
  const err = (k: keyof ProfileErrors) => errors[k] && <p role="alert" className="mt-1.5 text-[0.88rem] text-sunset">{errors[k]}</p>;
  return (
    <>
      <Block label="Connexion"><dl className="divide-y divide-line border-y border-line text-[0.95rem]"><div className="flex justify-between gap-4 py-3.5"><dt className="text-dim">Adresse e-mail</dt><dd className="min-w-0 break-all text-right" data-testid="account-email">{email || "—"}</dd></div>{traveler !== "unknown" && <div className="flex justify-between gap-4 py-3.5"><dt className="text-dim">Statut</dt><dd className="min-w-0 text-right" data-testid="account-status">{traveler === "verified" ? "Voyageur · réservation vérifiée" : "Compte membre · réservation non vérifiée"}</dd></div>}</dl></Block>
      <Block label="Mon profil">
        {!available ? <p role="status" className="rounded-[10px] border border-line p-4 text-[0.95rem] leading-snug text-cloud/85">Le profil n&apos;est pas encore disponible pour le moment. Revenez bientôt.</p> : (
          <form onSubmit={submit} noValidate className="space-y-5" aria-busy={busy}>
            {!profile && <p role="note" className="text-[0.92rem] leading-snug text-cloud/80">Complétez votre profil : ces informations servent à vous identifier dans l&apos;application.</p>}
            <fieldset disabled={busy} className="space-y-5">
              <div><label htmlFor="p-first" className={label}>Prénom *</label><input id="p-first" value={first} autoComplete="given-name" maxLength={PROFILE_LIMITS.first + 10} onChange={(e) => { setFirst(e.target.value); if (!touched) setDisplay(suggestDisplayName(e.target.value)); }} aria-invalid={!!errors.firstName} className={field} />{err("firstName")}</div>
              <div><label htmlFor="p-last" className={label}>Nom *</label><input id="p-last" value={last} autoComplete="family-name" maxLength={PROFILE_LIMITS.last + 10} onChange={(e) => setLast(e.target.value)} aria-invalid={!!errors.lastName} className={field} />{err("lastName")}</div>
              <div><label htmlFor="p-display" className={label}>Nom affiché *</label><input id="p-display" value={display} maxLength={PROFILE_LIMITS.display + 10} onChange={(e) => { setDisplay(e.target.value); setTouched(true); }} aria-invalid={!!errors.displayName} aria-describedby="p-display-hint" className={field} /><p id="p-display-hint" className="mt-1.5 text-[0.8rem] text-dim">Le nom qui s&apos;affiche sur l&apos;accueil et sur votre pass.</p>{err("displayName")}</div>
            </fieldset>
            {res && <p role={res.ok ? "status" : "alert"} aria-live="polite" className={cn("text-[0.92rem]", res.ok ? "text-sky" : "text-sunset")}>{res.ok ? "✓ " : ""}{res.message}</p>}
            <button type="submit" disabled={busy} className={cn(btn, "bg-cloud text-jet")}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        )}
      </Block>
      <Block label="Confidentialité"><p className="text-[0.88rem] leading-snug text-cloud/72">Votre profil n&apos;est visible que de vous et de l&apos;équipe SKYLINE habilitée à gérer les comptes. Il n&apos;est pas partagé avec les autres participants.</p></Block>
      <Block label="Session"><form method="post" action="/auth/signout"><input type="hidden" name="to" value="/v3/login" /><button type="submit" className={cn(btn, "border border-silver/45")}>Se déconnecter</button></form></Block>
      <div className="h-6" />
    </>
  );
}
