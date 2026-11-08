"use client";
import { useEffect, useRef } from "react";
import type { CaptchaConfig } from "@/lib/participant/signupConfig";

const SRC = { turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit" } as const;
type Api = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove?: (id?: string) => void };

/** CAPTCHA (Cloudflare Turnstile ou hCaptcha) : fournit un jeton à Supabase Auth, qui le VÉRIFIE côté serveur (réglage « CAPTCHA protection » du projet). Rien si non configuré. */
export function CaptchaWidget({ captcha, onToken, resetKey }: { captcha: CaptchaConfig; onToken: (t: string | null) => void; resetKey: number }) {
  const box = useRef<HTMLDivElement>(null); const id = useRef<string | null>(null);
  useEffect(() => {
    if (!captcha || !box.current) return; let dead = false; const el = box.current;
    const api = () => (window as unknown as Record<string, Api | undefined>)[captcha.provider];
    const mount = () => { const a = api(); if (dead || !a || id.current) return; id.current = a.render(el, { sitekey: captcha.siteKey, theme: "dark", callback: (t: string) => onToken(t), "expired-callback": () => onToken(null), "error-callback": () => onToken(null) }); };
    if (api()) mount(); else {
      let s = document.querySelector<HTMLScriptElement>(`script[data-captcha="${captcha.provider}"]`);
      if (!s) { s = document.createElement("script"); s.src = SRC[captcha.provider]; s.async = true; s.defer = true; s.dataset.captcha = captcha.provider; document.head.appendChild(s); }
      s.addEventListener("load", mount);
    }
    return () => { dead = true; try { if (id.current) api()?.remove?.(id.current); } catch { /* ignoré */ } id.current = null; };
  }, [captcha, onToken]);
  useEffect(() => { if (resetKey > 0 && captcha && id.current) { try { (window as unknown as Record<string, Api | undefined>)[captcha.provider]?.reset(id.current); } catch { /* ignoré */ } onToken(null); } }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!captcha) return null;
  return <div ref={box} data-testid="captcha" className="mt-5 min-h-[65px]" />;
}
