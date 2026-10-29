"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEMO_ACCOUNTS, accessLabels } from "@/lib/auth/roles";
import { Wordmark } from "@/components/ui/Wordmark";
import { useDemoStatus } from "./SpaceSwitcher";
import { rememberSpace } from "@/lib/space";

/** Page d'accès DÉMONSTRATION : choisir un compte fictif. L'autorisation est vérifiée côté serveur (proxy), pas ici. */
export function AccessScreen() {
  const q = useSearchParams(); const st = useDemoStatus(); const s = st?.session ?? null; const disabled = st?.enabled === false;
  const denied = q.get("denied") === "1"; const error = q.get("error") === "1";
  const next = q.get("next") ?? "/staff";
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] px-5 pb-12 pt-[calc(var(--safe-top)+2rem)]">
      <Wordmark />
      <p className="mt-12 font-mono text-[0.75rem] uppercase tracking-[0.22em] text-sky">Accès organisation · démonstration</p>
      <h1 className="font-display mt-2 text-[clamp(2.1rem,10.5vw,3rem)] leading-[0.95]">Staff HQ</h1>
      <p className="mt-4 max-w-[34ch] text-[1.02rem] leading-snug text-cloud/85">Espace réservé à l&apos;organisation. Choisissez un compte fictif pour explorer.</p>

      {denied && <p role="alert" className="mt-6 rounded-[8px] border border-sunset/60 p-4 text-[0.95rem] leading-snug">Ce compte n&apos;a pas accès à STAFF HQ. Seuls les rôles « staff » et « admin » y entrent.</p>}
      {error && <p role="alert" className="mt-6 rounded-[8px] border border-sunset/60 p-4 text-[0.95rem]">Compte inconnu.</p>}
      {s && !denied && <p role="status" className="mt-6 text-[0.9rem] text-cloud/75">Session démo ouverte : {s.name} · {accessLabels(s.access).join(", ") || "MEMBERS"}</p>}

      {disabled && <p role="status" className="mt-8 border-l border-sky pl-4 text-[1rem] font-light leading-snug text-cloud/85">La démonstration d&apos;accès est désactivée sur cet environnement. STAFF HQ sera disponible avec l&apos;authentification officielle.</p>}
      {!disabled && <ul className="mt-8 divide-y divide-line border-y border-line">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.id}>
            <form method="post" action="/api/demo-session">
              <input type="hidden" name="account" value={a.id} /><input type="hidden" name="next" value={next} />
              <button type="submit" className="flex min-h-[4.5rem] w-full items-center justify-between gap-4 py-3 text-left">
                <span><span className="font-display block text-[1.1rem]">{a.label}</span><span className="mt-1 block text-[0.88rem] text-dim">{a.hint}</span></span>
                <span aria-hidden className="text-silver">→</span>
              </button>
            </form>
          </li>
        ))}
      </ul>}
      {!disabled && <form method="post" action="/api/demo-session" className="mt-4"><input type="hidden" name="account" value="logout" /><button type="submit" className="min-h-11 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-dim underline underline-offset-4">Fermer la session démo</button></form>}
      <Link href="/" onClick={() => rememberSpace("members")} className="mt-6 inline-flex min-h-11 items-center font-mono text-[0.78rem] uppercase tracking-[0.16em] text-sky">Retour à Members →</Link>
      <p className="mt-10 text-[0.82rem] leading-relaxed text-dim">Authentification de démonstration (cookie signé, vérifié côté serveur). Elle sera remplacée par une vraie authentification avant toute mise en production. Aucune donnée réelle.</p>
    </main>
  );
}
