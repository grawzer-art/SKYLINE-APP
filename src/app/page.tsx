import { Hero } from "@/components/preboarding/Hero";
import { Countdown } from "@/components/preboarding/Countdown";
import { ExperienceCard } from "@/components/preboarding/ExperienceCard";
import { UpdatesFeed } from "@/components/preboarding/UpdatesFeed";
import { Checklist } from "@/components/preboarding/Checklist";
import { CrewPreview } from "@/components/preboarding/CrewPreview";
import { DemoFooter } from "@/components/preboarding/DemoFooter";

export default function PreBoardingPage() {
  return (
    <>
      <Hero />
      <Countdown />
      <ExperienceCard />
      <UpdatesFeed />
      <Checklist />
      <CrewPreview />
      <DemoFooter />
    </>
  );
}
