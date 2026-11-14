import type { Metadata } from "next";
import { V3Memories } from "@/components/v3/V3Memories";

export const metadata: Metadata = { title: "Souvenirs" };
export default function Page() { return <V3Memories />; }
