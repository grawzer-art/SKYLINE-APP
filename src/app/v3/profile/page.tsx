import type { Metadata } from "next";
import { V3Profile } from "@/components/v3/V3Profile";

export const metadata: Metadata = { title: "Profil" };
export default function Page() { return <V3Profile />; }
