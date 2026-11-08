"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Consents, NameFields, btn, lab, type SignupView } from "./SignupFlow";
import { validateSignupInput, type SignupErrors } from "@/domain/signup";
import { claimMemberAccount } from "@/lib/participant/signupService";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { rememberSpace } from "@/lib/space";
import { cn } from "@/lib/cn";

/** FINALISATION après lien magique : l'adresse est déjà confirmée (session ouverte) ; il reste l'identité et les attestations. Protégée par src/proxy.ts (session requise). */
export function SignupComplete({ view }: { view: SignupView }) {
  const [email, setEmail] = useState<string | null>(null); const [f, setF] = useState({ first: "", last: "", display: "" });
  const [terms, setTerms] = useState(false); const [adult, setAdult] = useState(false); const [errs, setErrs] = useState<SignupErrors>({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let dead = false; createBrowserSupabase().auth.getUser().then(({ data }) => { if (!dead) setEmail(data.user?.email ?? ""); }).catch(() => { if (!dead) setEmail(""); }); return () => { dead = true; }; }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const v = validateSignupInput({ firstName: f.first, lastName: f.last, displayName: f.display, email: "", acceptTerms: terms, adult }, { needEmail: false, minAge: view.minAge });
    if (!v.ok) { setErrs(v.errors); return; } setErrs({}); setErr(null); setBusy(true);
    const r = await claimMemberAccount(createBrowserSupabase(), { firstName: f.first, lastName: f.last, displayName: f.display }, view.termsVersion);
    if (r.ok || r.kind === "not_eligible") { rememberSpace("members"); window.location.assign("/v3/account"); return; }
    setBusy(false); setErr(r.message);
  };
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pb-[calc(var(--safe-bottom)+3rem)] pt-[calc(var(--safe-top)+2rem)]">
      <Wordmark />
      <p className="mt-12 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Mon espace</p>
      <h1 className="font-display mt-2 text-[clamp(2.1rem,10.5vw,3rem)] leading-[0.95]">Finaliser mon compte</h1>
      <p className="mt-4 max-w-[34ch] text-[1.02rem] leading-snug text-cloud/85">Votre adresse e-mail est confirmée. Complétez votre identité pour créer votre compte membre gratuit.</p>
      {email && <p className="mt-4 text-[0.9rem] text-cloud/75"><span className={lab}>Adresse confirmée</span><br /><span data-testid="complete-email">{email}</span></p>}
      <form onSubmit={submit} noValidate className="mt-8" data-testid="complete-form">
        <NameFields f={f} setF={setF} errs={errs} />
        <Consents v={view} terms={terms} adult={adult} setTerms={setTerms} setAdult={setAdult} errs={errs} />
        {err && <p role="alert" data-testid="signup-error" className="mt-5 rounded-[8px] border border-sunset/60 px-3 py-2.5 text-[0.9rem] text-sunset">{err}</p>}
        <button type="submit" disabled={busy || email === null} className={cn(btn, "mt-6 bg-cloud text-jet")}>{busy ? "Création du compte…" : "Créer mon compte"}</button>
      </form>
      <form method="post" action="/auth/signout" className="mt-6"><input type="hidden" name="to" value="/v3/login" /><button type="submit" className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-dim underline underline-offset-4">Se déconnecter</button></form>
      <Link href="/v3" className="mt-2 inline-flex min-h-11 items-center font-mono text-[0.78rem] uppercase tracking-[0.16em] text-sky">Retour à l&apos;application →</Link>
    </main>
  );
}
