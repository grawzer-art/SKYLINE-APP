import type { Metadata } from "next";
import { AccountScreen } from "@/components/participant/AccountScreen";

export const metadata: Metadata = { title: "Mon compte" };

/** Page personnelle : protégée CÔTÉ SERVEUR par src/proxy.ts (session vérifiée + compte actif + accès « members »). */
export default function Page() { return <AccountScreen />; }
