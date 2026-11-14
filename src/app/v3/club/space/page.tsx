import type { Metadata } from "next";
import { V3Space } from "@/components/v3/V3Space";

export const metadata: Metadata = { title: "My Space" };
export default function Page() { return <V3Space />; }
