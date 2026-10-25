import type { Metadata } from "next";
import { UpdatesFeed } from "@/components/explore/UpdatesFeed";
import { DemoFooter } from "@/components/layout/DemoFooter";

export const metadata: Metadata = { title: "SKYLINE — Explore" };

/** Écran temporaire : le fil d'annonces existant en attendant la direction éditoriale d'EXPLORE. */
export default function Page() {
  return (
    <div className="pt-24">
      <div className="px-5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-sky">Skyline Culture</p>
        <h1 className="font-display mt-3 text-[clamp(2.2rem,11.6vw,3.4rem)]">Explore</h1>
        <p className="mt-4 max-w-[32ch] text-[0.95rem] text-cloud/75">Artistes, programmation et Ibiza — l&apos;édition éditoriale arrive après validation de HOME.</p>
      </div>
      <UpdatesFeed />
      <DemoFooter />
    </div>
  );
}
