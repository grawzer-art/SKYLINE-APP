import type { Metadata } from "next";
import { ComingSoon } from "@/components/screens/ComingSoon";

export const metadata: Metadata = { title: "SKYLINE — Club" };

export default function Page() {
  return <ComingSoon id="club" />;
}
