import type { Metadata } from "next";
import { PlayerProvider } from "@/components/v3/PlayerProvider";
import { V3Shell } from "@/components/v3/V3Shell";

export const metadata: Metadata = {
  title: "SKYLINE — Prototype V3",
  robots: { index: false, follow: false }, // prototype de conception : jamais indexé
};

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return <PlayerProvider><V3Shell>{children}</V3Shell></PlayerProvider>;
}
