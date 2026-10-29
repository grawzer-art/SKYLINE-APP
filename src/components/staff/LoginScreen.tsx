"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { safeStaffNext } from "@/lib/staff/paths";
import { rememberSpace } from "@/lib/space";
import { cn } from "@/lib/cn";

const field = "mt-2 min-h-12 w-full rounded-[8px] border border-line bg-surface-1 px-4 text-[1rem] outline-none focus:border-sky";
const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 font-mono text-[0.78rem] uppercase tracking-[0.14em] transition active:scale-[0.97] disabled:opacity-40";

/**
 * Connexion STAFF HQ par e-mail : code à 6 chiffres (recommandé, fonctionne aussi dans la PWA iPhone) ou lien magique.
 * Aucun compte n'est créé ici (`shouldCreateUser: false`) : seuls les comptes invités par le super admin peuvent se connecter.
 * Les messages ne révèlent jamais si une adresse existe.
 */
export function LoginScreen() {
  const q = useSearchParams(); const next = safeStaffNext(q.get("next"));
  const denied = q.get("denied") === "1"; const failed = q.get("error") === "1";
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const [cool, setCool] = useState(0);
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool((c) => c - 1), 1000); return () => clearTimeout(t); }, [cool]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault(); setErr(null); setMsg(null);
    const addr = email.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(addr)) { setErr("Saisissez une adresse e-mail valide."); return; }
    setBusy(true);
    try {
      const { error } = await createBrowserSupabase().auth.signInWithOtp({ email: addr, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
      if (error && (error.status === 429 || /rate|too many|seconds/i.test(error.message))) { setErr("Trop de tentatives. Réessayez dans quelques minutes."); }
      else { setStep("code"); setMsg("Si ce compte existe, un code vient d'être envoyé par e-mail."); setCool(60); }
    } catch { setErr("Connexion impossible pour le moment. Réessayez."); }
    setBusy(false);
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const token = code.replace(/\s/g, ""); if (!/^\d{6,10}$/.test(token)) { setErr("Saisissez le code reçu par e-mail."); return; }
    setBusy(true);
    try {
      const { error } = await createBrowserSupabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
      if (error) { setErr("Code invalide ou expiré."); setBusy(false); return; }
      rememberSpace("staff"); window.location.assign(next); // navigation complète : le proxy relit la session fraîche
    } catch { setErr("Vérification impossible pour le moment. Réessayez."); setBusy(false); }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pb-12 pt-[calc(var(--safe-top)+2rem)]">
      <Wordmark />
      <p className="mt-12 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Accès organisation</p>
      <h1 className="font-display mt-2 text-[clamp(2.1rem,10.5vw,3rem)] leading-[0.95]">Staff HQ</h1>
      <p className="mt-4 max-w-[34ch] text-[1.02rem] leading-snug text-cloud/85">Espace privé. Connectez-vous avec l&apos;adresse e-mail de votre invitation.</p>

      {denied && <p role="alert" className="mt-6 rounded-[8px] border border-sunset/60 p-4 text-[0.95rem] leading-snug">Ce compte n&apos;est pas autorisé à accéder à STAFF HQ (accès non activé ou compte désactivé). Contactez GRAW.</p>}
      {failed && <p role="alert" className="mt-6 rounded-[8px] border border-sunset/60 p-4 text-[0.95rem] leading-snug">Le lien de connexion est invalide ou expiré. Demandez un nouveau code.</p>}

      {step === "email" ? (
        <form onSubmit={send} noValidate className="mt-8">
          <label htmlFor="login-email" className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/72">Adresse e-mail</label>
          <input id="login-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} aria-describedby={err ? "login-err" : undefined} className={field} />
          {err && <p id="login-err" role="alert" className="mt-2 text-[0.9rem] text-sunset">{err}</p>}
          <button type="submit" disabled={busy} className={cn(btn, "mt-5 bg-cloud text-jet")}>{busy ? "Envoi…" : "Recevoir un code"}</button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate className="mt-8">
          {msg && <p role="status" className="mb-4 text-[0.95rem] leading-snug text-cloud/85">{msg}</p>}
          <label htmlFor="login-code" className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-cloud/72">Code reçu</label>
          <input id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={10} value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!err} aria-describedby={err ? "login-err" : undefined} className={cn(field, "text-center font-mono text-[1.4rem] tracking-[0.3em]")} />
          {err && <p id="login-err" role="alert" className="mt-2 text-[0.9rem] text-sunset">{err}</p>}
          <button type="submit" disabled={busy} className={cn(btn, "mt-5 bg-cloud text-jet")}>{busy ? "Vérification…" : "Se connecter"}</button>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => send()} disabled={busy || cool > 0} className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-sky underline underline-offset-4 disabled:opacity-40 disabled:no-underline">{cool > 0 ? `Renvoyer le code (${cool} s)` : "Renvoyer le code"}</button>
            <button type="button" onClick={() => { setStep("email"); setCode(""); setErr(null); setMsg(null); }} className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">Changer d&apos;adresse</button>
          </div>
          <p className="mt-3 text-[0.82rem] leading-snug text-dim">Vous pouvez aussi ouvrir le lien reçu par e-mail. Dans l&apos;application installée sur l&apos;écran d&apos;accueil, saisissez le code.</p>
        </form>
      )}

      {denied && <form method="post" action="/auth/signout" className="mt-6"><button type="submit" className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">Se déconnecter</button></form>}
      <Link href="/" onClick={() => rememberSpace("members")} className="mt-6 inline-flex min-h-11 items-center font-mono text-[0.78rem] uppercase tracking-[0.16em] text-sky">Retour à Members →</Link>
    </main>
  );
}
