import type { Metadata } from "next";
import { StaffShell } from "@/components/staff/StaffShell";

export const metadata: Metadata = { title: "SKYLINE — STAFF HQ", robots: { index: false, follow: false } };

/** STAFF HQ : espace organisation. L'accès est contrôlé par `src/proxy.ts` (serveur), jamais par ce layout. */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
