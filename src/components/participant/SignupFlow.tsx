"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { CaptchaWidget } from "./CaptchaWidget";
import { useEmailCodeLogin } from "@/lib/auth/useEmailCodeLogin";
import { suggestDisplayName, PROFILE_LIMITS } from "@/domain/participant";
import { validateSignupInput, type SignupErrors } from "@/domain/signup";
import { claimMemberAccount } from "@/lib/participant/signupService";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { rememberSpace } from "@/lib/space";
import type { CaptchaConfig } from "@/lib/participant/signupConfig";
import { cn } from "@/lib/cn";

export type SignupView = { termsVersion: string; termsUrl: string; charterUrl: string | null; minAge: number; captcha: CaptchaConfig };
export const field = "mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky";
export const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] transition active:scale-[0.97] disabled:opacity-40";
export const lab = "font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/72";
const COMPLETE = "/v3/signup/complete"; const HOME = "/v3/account";

/** Cases d'attestation : CGU (adresse configurée, jamais de texte juridique inventé) et âge minimum. */
export function Consents({ v, terms, adult, setTerms, setAdult, errs }: { v: SignupView; terms: boolean; adult: boolean; setTerms: (b: boolean) => void; setAdult: (b: boolean) => void; errs: SignupErrors }) {
  const box = "mt-0.5 size-6 shrink-0 accent-[#8fd3ff]";
  return (
    <div className="mt-6 space-y-4">
      <label className="flex min-h-11 items-start gap-3 text-[0.95rem] leading-snug"><input type="checkbox" data-testid="accept-terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} className={box} aria-invalid={!!errs.acceptTerms} />
        <span>J&apos;accepte les <a href={v.termsUrl} target="_blank" rel="noopener noreferrer" className="text-sky underline underline-offset-4">conditions d&apos;utilisation</a>{v.charterUrl && <> et la <a href={v.charterUrl} target="_blank" rel="noopener noreferrer" className="text-sky underline underline-offset-4">charte</a></>}.</span></label>
      {errs.acceptTerms && <p role="alert" className="-mt-2 text-[0.85rem] text-sunset">{errs.acceptTerms}</p>}
      <label className="flex min-h-11 items-start gap-3 text-[0.95rem] leading-snug"><input type="checkbox" data-testid="attest-adult" checked={adult} onChange={(e) => setAdult(e.target.checked)} className={box} aria-invalid={!!errs.adult} />
        <span>J&apos;atteste avoir au moins {v.minAge} ans.</span></label>
      {errs.adult && <p role="alert" className="-mt-2 text-[0.85rem] text-sunset">{errs.adult}</p>}
    </div>
  );
}

const E = ({ id, m }: { id: string; m?: string }) => (m ? <p id={id} role="alert" className="mt-1.5 text-[0.85rem] text-sunset">{m}</p> : null);
/** Champs identité (prénom, nom, nom affiché qui suit le prénom tant qu'il n'est pas modifié). */
export function NameFields({ f, setF, errs }: { f: { first: string; last: string; display: string }; setF: (v: { first: string; last: string; display: string }) => void; errs: SignupErrors }) {
  const [touched, setTouched] = useState(false);
  return (
    <div className="space-y-5">
      <div><label htmlFor="s-first" className={lab}>Prénom *</label><input id="s-first" autoComplete="given-name" maxLength={PROFILE_LIMITS.first + 10} value={f.first} onChange={(e) => setF({ ...f, first: e.target.value, display: touched ? f.display : suggestDisplayName(e.target.value) })} aria-invalid={!!errs.firstName} aria-describedby={errs.firstName ? "s-first-e" : undefined} className={field} /><E id="s-first-e" m={errs.firstName} /></div>
      <div><label htmlFor="s-last" className={lab}>Nom *</label><input id="s-last" autoComplete="family-name" maxLength={PROFILE_LIMITS.last + 10} value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} aria-invalid={!!errs.lastName} aria-describedby={errs.lastName ? "s-last-e" : undefined} className={field} /><E id="s-last-e" m={errs.lastName} /></div>
      <div><label htmlFor="s-display" className={lab}>Nom affiché *</label><input id="s-display" autoComplete="nickname" maxLength={PROFILE_LIMITS.display + 10} value={f.display} onChange={(e) => { setTouched(true); setF({ ...f, display: e.target.value }); }} aria-invalid={!!errs.displayName} aria-describedby="s-display-h" className={field} />
        <p id="s-display-h" role={errs.displayName ? "alert" : undefined} className={cn("mt-1.5 text-[0.85rem]", errs.displayName ? "text-sunset" : "text-dim")}>{errs.displayName ?? "Le nom qui s'affiche dans l'application. Votre nom légal reste privé."}</p></div>
    </div>
  );
}

/**
 * INSCRIPTION publique : identité → code reçu par e-mail → création du compte membre (fonction SQL `claim_member_account`).
 * La création d'utilisateur n'est autorisée QUE par ce parcours (`allowCreate`). Aucun rôle ni accès n'est jamais demandé par le navigateur.
 */
export function SignupFlow({ view }: { view: SignupView }) {
  const [f, setF] = useState({ first: "", last: "", display: "" }); const [terms, setTerms] = useState(false); const [adult, setAdult] = useState(false);
  const [errs, setErrs] = useState<SignupErrors>({}); const [token, setToken] = useState<string | null>(null); const [capReset, setCapReset] = useState(0);
  const [claimErr, setClaimErr] = useState<string | null>(null); const [claiming, setClaiming] = useState(false);
  const onToken = useCallback((t: string | null) => setToken(t), []);
  const claim = async () => {
    setClaiming(true); setClaimErr(null);
    const r = await claimMemberAccount(createBrowserSupabase(), { firstName: f.first, lastName: f.last, displayName: f.display }, view.termsVersion);
    if (r.ok || r.kind === "not_eligible") { rememberSpace("members"); window.location.assign(HOME); return; }   // compte existant : le serveur décide de l'accès (/v3/account)
    setClaiming(false); setClaimErr(r.message);
  };
  const login = useEmailCodeLogin({ next: COMPLETE, allowCreate: true, captchaToken: token, onVerified: () => { void claim(); } });
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); const v = validateSignupInput({ firstName: f.first, lastName: f.last, displayName: f.display, email: login.email, acceptTerms: terms, adult }, { minAge: view.minAge });
    if (!v.ok) { setErrs(v.errors); return; } setErrs({});
    if (view.captcha && !token) { setErrs({ email: "Validez d'abord le contrôle anti-robot." }); return; }
    void login.send().finally(() => { setCapReset((n) => n + 1); });   // le jeton CAPTCHA est à usage unique : toujours renouvelé
  };
  const busy = login.busy || claiming;
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pb-[calc(var(--safe-bottom)+3rem)] pt-[calc(var(--safe-top)+2rem)]">
      <Wordmark />
      <p className="mt-12 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Mon espace</p>
      <h1 className="font-display mt-2 text-[clamp(2.1rem,10.5vw,3rem)] leading-[0.95]">Créer mon compte</h1>
      <p className="mt-4 max-w-[34ch] text-[1.02rem] leading-snug text-cloud/85">Un compte membre gratuit : sans mot de passe, un code vous est envoyé par e-mail. Il ne vaut pas réservation : le pass et la communauté s&apos;ouvrent avec une réservation confirmée par l&apos;équipe.</p>

      {login.step === "email" ? (
        <form onSubmit={submit} noValidate className="mt-8" data-testid="signup-form">
          <NameFields f={f} setF={setF} errs={errs} />
          <div className="mt-5"><label htmlFor="s-email" className={lab}>Adresse e-mail *</label>
            <input id="s-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={login.email} onChange={(e) => login.setEmail(e.target.value)} aria-invalid={!!(errs.email || login.err)} aria-describedby="s-email-e" className={field} />
            {(errs.email || login.err) && <p id="s-email-e" role="alert" className="mt-1.5 text-[0.85rem] text-sunset">{errs.email ?? login.err}</p>}</div>
          <Consents v={view} terms={terms} adult={adult} setTerms={setTerms} setAdult={setAdult} errs={errs} />
          <CaptchaWidget captcha={view.captcha} onToken={onToken} resetKey={capReset} />
          <button type="submit" disabled={busy} className={cn(btn, "mt-6 bg-cloud text-jet")}>{busy ? "Envoi…" : "Recevoir un code"}</button>
        </form>
      ) : (
        <form onSubmit={login.verify} noValidate className="mt-8" data-testid="signup-code-form">
          {login.msg && <p role="status" className="mb-4 text-[0.95rem] leading-snug text-cloud/85">{login.msg}</p>}
          <label htmlFor="login-code" className={lab}>Code reçu</label>
          <input id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={10} value={login.code} onChange={(e) => login.setCode(e.target.value)} aria-invalid={!!(login.err || claimErr)} className={cn(field, "tracking-[0.3em]")} />
          {(login.err || claimErr) && <p role="alert" data-testid="signup-error" className="mt-2 text-[0.9rem] text-sunset">{claimErr ?? login.err}</p>}
          <button type="submit" disabled={busy} className={cn(btn, "mt-5 bg-cloud text-jet")}>{claiming ? "Création du compte…" : login.busy ? "Vérification…" : "Créer mon compte"}</button>
          {claimErr && <button type="button" onClick={() => void claim()} disabled={claiming} className={cn(btn, "mt-3 border border-cloud/40")}>Réessayer la création</button>}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={login.changeEmail} className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">Modifier mes informations</button>
          </div>
          <p className="mt-3 text-[0.82rem] leading-snug text-dim">Pour recevoir un nouveau code, revenez à l&apos;étape précédente. Vous pouvez aussi ouvrir le lien reçu par e-mail : vous reviendrez ici pour finaliser votre compte.</p>
        </form>
      )}
      <Link href="/v3/login" className="mt-6 inline-flex min-h-11 items-center font-mono text-[0.78rem] uppercase tracking-[0.16em] text-sky">J&apos;ai déjà un compte →</Link>
    </main>
  );
}
