import type { Metadata } from "next";
import { V3Flight } from "@/components/v3/V3Flight";

export const metadata: Metadata = { title: "My Flight" };
export default function Page() { return <V3Flight />; }
