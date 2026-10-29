import type { Metadata } from "next";
import { SpaceChooser } from "@/components/staff/SpaceChooser";

export const metadata: Metadata = { title: "SKYLINE — Choisir mon espace", robots: { index: false, follow: false } };
export default function Page() { return <SpaceChooser />; }
