import type { Metadata } from "next";
import { V3Club } from "@/components/v3/V3Club";

export const metadata: Metadata = { title: "Club" };
export default function Page() { return <V3Club />; }
