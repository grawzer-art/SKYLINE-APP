"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { useEmailCodeLogin } from "@/lib/auth/useEmailCodeLogin";
import { safeParticipantNext } from "@/lib/participant/paths";
import { rememberSpace } from "@/lib/space";
import { cn } from "@/lib/cn";

const field = "mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky";
const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] transition active:scale-[0.97] disabled:opacity-40";
const label = "font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/72";

/**
 * Connexion PARTICIPANTS : même mécanisme que STAFF HQ (code à 6 chiffres reçu par e-mail ; lien magique aussi accepté). Aucun mot de passe.
 * Aucun compte n'est créé ici : seuls les comptes préparés par l'organisation peuvent se connecter. Messages neutres (jamais d'indice sur l'existence d'une adresse).
 */
export function ParticipantLogin() {
  const q = useSearchParams(); const next = safeParticipantNext(q.get("next"));
  const denied = q.get("denied") === "1"; const failed = q.get("error") === "1";
  const { email, setEmail, code, setCode, step, busy, msg, err, cool, send, verify, changeEmail } = useEmailCodeLogin({ next, onVerified: () => { rememberSpace("members"); window.location.assign(next); } });
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pb-12 pt-[calc(var(--safe-top)+2rem)]">
      <Wordmark />
      <p className="mt-12 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Mon espace</p>
      <h1 className="font-display mt-2 text-[clamp(2.1rem,10.5vw,3rem)] leading-[0.95]">Connexion</h1>
      <p className="mt-4 max-w-[34ch] text-[1.02rem] leading-snug text-cloud/85">Connectez-vous avec l&apos;adresse e-mail de votre invitation SKYLINE. Aucun mot de passe : un code vous est envoyé.</p>

      {denied && <p role="alert" className="mt-6 rounded-[8px] border border-sunset/60 p-4 text-[0.95rem] leading-snug">Ce compte n&apos;a pas accès à l&apos;espace participants (accès non activé ou compte désactivé). Contactez l&apos;organisation SKYLINE.</p>}
      {failed && <p role="alert" className="mt-6 rounded-[8px] border border-sunset/60 p-4 text-[0.95rem] leading-snug">Le lien de connexion est invalide ou expiré. Demandez un nouveau code.</p>}

      {step === "email" ? (
        <form onSubmit={send} noValidate className="mt-8">
          <label htmlFor="login-email" className={label}>Adresse e-mail</label>
          <input id="login-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} aria-describedby={err ? "login-err" : undefined} className={field} />
          {err && <p id="login-err" role="alert" className="mt-2 text-[0.9rem] text-sunset">{err}</p>}
          <button type="submit" disabled={busy} className={cn(btn, "mt-5 bg-cloud text-jet")}>{busy ? "Envoi…" : "Recevoir un code"}</button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate className="mt-8">
          {msg && <p role="status" className="mb-4 text-[0.95rem] leading-snug text-cloud/85">{msg}</p>}
          <label htmlFor="login-code" className={label}>Code reçu</label>
          <input id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={10} value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!err} aria-describedby={err ? "login-err" : undefined} className={cn(field, "tracking-[0.3em]")} />
          {err && <p id="login-err" role="alert" className="mt-2 text-[0.9rem] text-sunset">{err}</p>}
          <button type="submit" disabled={busy} className={cn(btn, "mt-5 bg-cloud text-jet")}>{busy ? "Vérification…" : "Se connecter"}</button>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => send()} disabled={busy || cool > 0} className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-sky underline underline-offset-4 disabled:opacity-40 disabled:no-underline">{cool > 0 ? `Renvoyer le code (${cool} s)` : "Renvoyer le code"}</button>
            <button type="button" onClick={changeEmail} className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">Changer d&apos;adresse</button>
          </div>
          <p className="mt-3 text-[0.82rem] leading-snug text-dim">Code perdu ou expiré ? Demandez-en un nouveau : c&apos;est ainsi que l&apos;accès se récupère. Vous pouvez aussi ouvrir le lien reçu par e-mail. Dans l&apos;application installée sur l&apos;écran d&apos;accueil, saisissez le code.</p>
        </form>
      )}

      {denied && <form method="post" action="/auth/signout" className="mt-6"><input type="hidden" name="to" value="/v3/login" /><button type="submit" className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">Se déconnecter</button></form>}
      <Link href="/v3" className="mt-6 inline-flex min-h-11 items-center font-mono text-[0.78rem] uppercase tracking-[0.16em] text-sky">Retour à l&apos;application →</Link>
    </main>
  );
}
