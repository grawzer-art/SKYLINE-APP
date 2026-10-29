"use client";
import { useMemo } from "react";
import { useDemoStatus } from "@/components/staff/SpaceSwitcher";
import { getStaffMember } from "@/data/staff";
import { hasRole } from "@/lib/auth/roles";
import type { Actor } from "@/domain/missions";

/**
 * Identité de l'utilisateur dans STAFF HQ, déduite de la session (informative côté client).
 * Les droits réels devront être revérifiés par le serveur à chaque écriture (voir docs/skyline-staff/MISSIONS.md).
 */
export function useActor(): { status: "loading" | "none"; actor: null; name: "" } | { status: "ok"; actor: Actor; name: string } {
  const st = useDemoStatus();
  return useMemo(() => {
    if (st === undefined) return { status: "loading" as const, actor: null, name: "" as const };
    const s = st.session; const m = s?.memberId ? getStaffMember(s.memberId) : undefined;
    if (!s || !m) return { status: "none" as const, actor: null, name: "" as const };
    return { status: "ok" as const, actor: { memberId: m.id, coordinator: hasRole(s.roles, "admin") }, name: m.name };
  }, [st]);
}
