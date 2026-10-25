import type { Metadata } from "next";
import { CrewScreen } from "@/components/screens/CrewScreen";

export const metadata: Metadata = { title: "SKYLINE — My Crew" };

export default function Page() {
  return <CrewScreen />;
}
