"use client";
import { useMemo } from "react";
import { useDemoStatus } from "@/components/staff/SpaceSwitcher";
import { getStaffMember } from "@/data/staff";
import { isCoordinator } from "@/lib/auth/roles";
import { isUuid } from "@/lib/missions/service";
import type { Actor } from "@/domain/missions";

/**
 * Identité de l'utilisateur dans STAFF HQ, déduite de la session (informative côté client).
 * Les droits réels devront être revérifiés par le serveur à chaque écriture (voir docs/skyline-staff/MISSIONS.md).
 */
export function useActor(): { status: "loading" | "none"; actor: null; name: "" } | { status: "ok"; actor: Actor; name: string } {
  const st = useDemoStatus();
  return useMemo(() => {
    if (st === undefined) return { status: "loading" as const, actor: null, name: "" as const };
    const s = st.session;
    // Source « base de données » : l'identité d'action est l'UUID du compte (jamais un identifiant local fictif).
    if (st.mode === "supabase" && st.dataSource === "db") {
      if (!s || !isUuid(s.userId)) return { status: "none" as const, actor: null, name: "" as const };
      return { status: "ok" as const, actor: { memberId: s.userId, coordinator: isCoordinator(s.access) }, name: s.name };
    }
    const m = s?.memberId ? getStaffMember(s.memberId) : undefined;
    if (!s || !m) return { status: "none" as const, actor: null, name: "" as const };
    return { status: "ok" as const, actor: { memberId: m.id, coordinator: isCoordinator(s.access) }, name: m.name };
  }, [st]);
}
