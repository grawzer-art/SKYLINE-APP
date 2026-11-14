import type { Metadata } from "next";
import { V3Messages } from "@/components/v3/V3Messages";

export const metadata: Metadata = { title: "Messages" };
export default function Page() { return <V3Messages />; }
