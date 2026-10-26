import { HomeHero } from "@/components/home/HomeHero";
import { SignalBand } from "@/components/signal/SignalBand";
import { DemoFooter } from "@/components/layout/DemoFooter";
import { LegacyCleanup } from "@/components/screens/LegacyCleanup";

/** HOME — THE EXPERIENCE : une photographie, une accroche, une seule annonce exclusive (SKYLINE SIGNAL). */
export default function HomePage() {
  return (
    <>
      <LegacyCleanup />
      <HomeHero />
      <SignalBand />
      <DemoFooter compact />
    </>
  );
}
