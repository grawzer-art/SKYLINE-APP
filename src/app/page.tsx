import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { SignalCard } from "@/components/signal/SignalCard";
import { getFeaturedSignal } from "@/data/signals";
import { DemoFooter } from "@/components/layout/DemoFooter";
import { LegacyCleanup } from "@/components/screens/LegacyCleanup";

/** HOME — THE EXPERIENCE : une photographie, une accroche, une seule annonce exclusive (SKYLINE SIGNAL). */
export default function HomePage() {
  return (
    <>
      <LegacyCleanup />
      <HomeHero />
      <SignalCard signal={getFeaturedSignal()} />
      <nav aria-label="Accès rapides" className="grid grid-cols-2 gap-3 px-5 pt-3">
        {[["Mon pass", "My Flight", "/v3/flight"], ["Skyline Sound", "Explore", "/v3/explore/sound"]].map(([t, k, h]) => (
          <Link key={h} href={h} className="flex min-h-[4.5rem] flex-col justify-center rounded-[8px] border border-cloud/10 bg-surface-1 px-4 transition active:scale-[0.98]">
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-sky">{k}</span><span className="font-display mt-1.5 text-[1rem] leading-none">{t}</span>
          </Link>
        ))}
      </nav>
      <DemoFooter compact />
    </>
  );
}
