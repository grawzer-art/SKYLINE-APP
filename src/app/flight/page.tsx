import type { Metadata } from "next";
import { ComingSoon } from "@/components/screens/ComingSoon";

export const metadata: Metadata = { title: "SKYLINE — My Flight" };

export default function Page() {
  return <ComingSoon id="flight" />;
}
