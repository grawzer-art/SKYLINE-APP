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
      <DemoFooter compact />
    </>
  );
}
