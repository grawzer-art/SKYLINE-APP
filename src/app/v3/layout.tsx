import type { Metadata } from "next";
import { V3Shell } from "@/components/v3/V3Shell";

export const metadata: Metadata = {
  title: { default: "SKYLINE", template: "%s — SKYLINE" },
  robots: { index: false, follow: false }, // application participants : jamais indexée (en plus de l'en-tête X-Robots-Tag hors production)
};

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return <V3Shell>{children}</V3Shell>;
}
