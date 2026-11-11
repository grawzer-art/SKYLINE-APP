import type { ReactNode } from "react";

/**
 * Colonne « téléphone » centrée, pleine largeur sur mobile. La navigation de l'application participants (4 onglets) et son en-tête vivent dans
 * `components/v3/V3Shell` (layout `/v3`) ; STAFF HQ, SIGNAL et le choix de l'espace ont leur propre cadre. Aucun cadre hérité (V1/V2) ne subsiste ici.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-jet md:border-x md:border-line">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-cloud focus:px-4 focus:py-2 focus:text-jet">
        Aller au contenu
      </a>
      <main id="main" className="overflow-x-clip pb-[calc(var(--nav-h)+var(--safe-bottom)+1.5rem)]">{children}</main>
    </div>
  );
}
