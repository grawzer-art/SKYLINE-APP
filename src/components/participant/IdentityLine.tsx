"use client";
import Link from "next/link";
import { user } from "@/data/demo";
import { identityName, useParticipantIdentity } from "@/lib/participant/useParticipantIdentity";

/**
 * Ligne d'identité de l'accueil. AUCUNE identité inventée quand l'authentification participants est active :
 *  chargement → réservé, vide · connecté avec profil → nom affiché réel · connecté sans profil → invitation à le compléter · non connecté → invitation à se connecter.
 * Authentification inactive (par défaut) : l'accueil de démonstration est inchangé (page déjà étiquetée « données de démonstration »).
 */
export function IdentityLine({ variant }: { variant: "legacy" | "v3" }) {
  const id = useParticipantIdentity(); const name = identityName(id);
  const wrap = variant === "legacy" ? "font-display text-[1.1rem] leading-tight" : "font-mono text-[0.72rem] uppercase leading-relaxed tracking-[0.22em] text-cloud/80";
  const sub = variant === "legacy" ? "mt-0.5 block font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cloud/72" : "text-cloud/68";
  const link = "inline-flex min-h-11 items-center underline decoration-cloud/40 underline-offset-4 transition hover:decoration-sky";
  if (id.status === "off") return variant === "legacy" ? <p className={wrap}>{user.fullName}</p> : <p className={wrap}>{user.fullName}<br /><span className={sub}>{user.memberLine}</span></p>;
  if (id.status === "loading") return <p className={wrap} aria-hidden>&nbsp;</p>;
  if (id.status === "misconfigured" || id.status === "error") return <p className={wrap} aria-hidden>&nbsp;</p>;
  if (id.status === "anonymous") return <p className={wrap} data-testid="identity-anonymous">Bienvenue à bord{variant === "legacy" ? " " : <br />}<Link href="/v3/login?next=/v3/account" className={link}>Se connecter</Link></p>;
  if (id.status === "no_access") return <p className={wrap} data-testid="identity-no-access">Compte sans accès participants{variant === "legacy" ? "" : <br />}<span className={sub}>{variant === "legacy" ? " " : ""}Accès non activé</span></p>;
  if (name) return <p className={wrap} data-testid="identity-name">{name}{variant === "legacy" ? <span className={sub}>Participant · SKYLINE 2027</span> : <><br /><span className={sub}>Participant · SKYLINE 2027</span></>}</p>;
  return <p className={wrap} data-testid="identity-incomplete">Bienvenue à bord{variant === "legacy" ? " " : <br />}<Link href="/v3/account" className={link}>Compléter mon profil</Link></p>;
}
