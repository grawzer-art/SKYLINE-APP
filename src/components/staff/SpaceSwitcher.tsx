"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { canEnterStaff, type Role } from "@/lib/auth/roles";
import { rememberSpace } from "@/lib/space";
import { cn } from "@/lib/cn";

export type SessionInfo = { name: string; roles: Role[]; memberId?: string; demo: true } | null;
/** État de la démonstration + session (informative : l'autorisation réelle est faite côté serveur par le proxy). `undefined` = lecture en cours. */
export function useDemoStatus() {
  const [st, setSt] = useState<{ enabled: boolean; session: SessionInfo } | undefined>(undefined);
  useEffect(() => { let off = false; fetch("/api/demo-session", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { enabled: false, session: null })).then((j) => { if (!off) setSt({ enabled: j.enabled !== false, session: j.session ?? null }); }).catch(() => { if (!off) setSt({ enabled: false, session: null }); }); return () => { off = true; }; }, []);
  return st;
}
export const useSessionInfo = () => { const st = useDemoStatus(); return st === undefined ? undefined : st.session; };

/**
 * Sélecteur d'espace : visible uniquement pour un compte autorisé sur STAFF HQ. La session (cookie) est conservée : on ne fait que naviguer.
 * Masquer le sélecteur n'est PAS une protection : l'accès à /staff est refusé par le serveur.
 */
export function ChangeSpaceLink({ className }: { className?: string }) {
  return <Link href="/start" className={cn("inline-flex min-h-11 items-center font-mono text-[0.78rem] uppercase tracking-[0.14em] text-sky", className)}>Changer d&apos;espace →</Link>;
}

export function SpaceSwitcher({ className }: { className?: string }) {
  const s = useSessionInfo(); const pathname = usePathname();
  if (!s || !canEnterStaff(s.roles)) return null;
  const inStaff = pathname.startsWith("/staff");
  const item = (href: string, label: string, on: boolean) => (
    <Link href={href} onClick={() => rememberSpace(href === "/" ? "members" : "staff")} aria-current={on ? "true" : undefined} className={cn("flex min-h-12 flex-1 items-center justify-center rounded-full font-mono text-[0.8rem] uppercase tracking-[0.16em] transition", on ? "bg-cloud text-jet" : "text-cloud/80")}>{label}</Link>
  );
  return (
    <div role="group" aria-label="Espace" className={cn("flex gap-1 rounded-full border border-silver/40 p-1", className)}>
      {item("/", "Members", !inStaff)}{item("/staff", "Staff HQ", inStaff)}
    </div>
  );
}
