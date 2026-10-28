import type { Metadata } from "next";
import { V3Sound } from "@/components/v3/V3Sound";

export const metadata: Metadata = { title: "SKYLINE — Sound" };
export default function Page() { return <V3Sound />; }
