import type { Metadata } from "next";
import { V3Members } from "@/components/v3/V3Members";

export const metadata: Metadata = { title: "Members" };
export default function Page() { return <V3Members />; }
