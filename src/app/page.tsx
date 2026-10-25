import { HomeHero } from "@/components/home/HomeHero";
import { PriorityFeature } from "@/components/home/PriorityFeature";
import { DemoFooter } from "@/components/layout/DemoFooter";
import { LegacyCleanup } from "@/components/screens/LegacyCleanup";

/** HOME — THE EXPERIENCE : un hero éditorial, un seul contenu prioritaire. */
export default function HomePage() {
  return (
    <>
      <LegacyCleanup />
      <HomeHero />
      <PriorityFeature />
      <DemoFooter />
    </>
  );
}
