import type { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { getPublishedSignals } from "@/data/signals";

/** Colonne « téléphone » centrée, pleine largeur sur mobile. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-jet md:border-x md:border-line">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-cloud focus:px-4 focus:py-2 focus:text-jet">
        Aller au contenu
      </a>
      <Header />
      <main id="main" className="overflow-x-clip pb-[calc(var(--nav-h)+var(--safe-bottom)+1.5rem)]">{children}</main>
      <BottomNav signalIds={getPublishedSignals().map((x) => x.id)} />
    </div>
  );
}
