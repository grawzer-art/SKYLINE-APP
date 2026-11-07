import { AccountScreen } from "@/components/participant/AccountScreen";

/** Page personnelle : protégée CÔTÉ SERVEUR par src/proxy.ts (session vérifiée + compte actif + accès « members »). */
export default function Page() { return <AccountScreen />; }
