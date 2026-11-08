"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { LOGIN_NEXT_COOKIE } from "@/lib/staff/paths";
import { classifySendError, classifyVerifyError, type AuthErrLike } from "./otpErrors";

/**
 * Connexion par code e-mail (OTP) — UN SEUL mécanisme pour STAFF HQ et les participants (Supabase Auth).
 *  - Par défaut aucun compte n'est créé (`allowCreate = false`) : seuls les comptes invités par le super admin peuvent se connecter. Seul le parcours d'inscription
 *    publique (B4.2, `/v3/signup`) passe `allowCreate`. La connexion STAFF et la connexion participants ne le font JAMAIS.
 *  - Messages neutres : jamais de révélation de l'existence d'une adresse ; erreurs limitées / expirées distinguées ; renvoi du code avec délai.
 *  - Aucun mot de passe : même politique que STAFF (connexion uniquement par code e-mail ou lien magique).
 * La destination (`next`, déjà VALIDÉE par l'appelant) est mémorisée dans un cookie court : l'URL de retour reste EXACTE (`…/auth/callback`).
 */
export function useEmailCodeLogin({ next, onVerified, allowCreate = false, captchaToken }: { next: string; onVerified: () => void; /** Réservé au parcours d'INSCRIPTION (B4.2). Jamais passé par la connexion STAFF ni par la connexion participants. */ allowCreate?: boolean; captchaToken?: string | null }) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const [cool, setCool] = useState(0);
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool((c) => c - 1), 1000); return () => clearTimeout(t); }, [cool]);

  /** Retourne true seulement si Supabase n'a PAS retourné d'erreur, ou une erreur de la classe NEUTRE (compte inconnu : même message et même étape que le succès). */
  const send = async (e?: React.FormEvent): Promise<boolean> => {
    e?.preventDefault(); setErr(null); setMsg(null);
    const addr = email.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(addr)) { setErr("Saisissez une adresse e-mail valide."); return false; }
    setBusy(true);
    try {
      document.cookie = `${LOGIN_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=900; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      const { error } = await createBrowserSupabase().auth.signInWithOtp({ email: addr, options: { shouldCreateUser: allowCreate === true, emailRedirectTo: `${location.origin}/auth/callback`, ...(captchaToken ? { captchaToken } : {}) } });
      const r = classifySendError(error, allowCreate === true ? "signup" : "login");
      if (r.kind === "sent" || r.kind === "neutral") { setStep("code"); setMsg(r.message); setCool(60); setBusy(false); return true; }
      setErr(r.message); if (r.kind === "rate") setCool(60);   // jamais d'étape « code » ni de message d'envoi quand Supabase a retourné une erreur
      setBusy(false); return false;
    } catch (x) { setErr(classifySendError(x as AuthErrLike, allowCreate === true ? "signup" : "login").message); setBusy(false); return false; }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const token = code.replace(/\s/g, ""); if (!/^\d{6,10}$/.test(token)) { setErr("Saisissez le code reçu par e-mail."); return; }
    setBusy(true);
    try {
      const { error } = await createBrowserSupabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
      if (error) { setErr(classifyVerifyError(error).message); setBusy(false); return; }
      onVerified(); // navigation complète : le serveur relit la session fraîche
    } catch (x) { setErr(classifyVerifyError(x as AuthErrLike).message); setBusy(false); }
  };
  const changeEmail = () => { setStep("email"); setCode(""); setErr(null); setMsg(null); };
  return { email, setEmail, code, setCode, step, busy, msg, err, cool, send, verify, changeEmail };
}
