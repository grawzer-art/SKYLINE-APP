"use client";
import { useDemoStatus } from "@/components/staff/SpaceSwitcher";
import { useLocalMissions, MISSIONS_KEY } from "@/lib/missions/useLocalMissions";
import { useDbMissions } from "@/lib/missions/useDbMissions";
import { isUuid } from "@/lib/missions/service";
import type { MissionsApi } from "@/lib/missions/types";

export { MISSIONS_KEY };
/**
 * Point d'entrée UNIQUE des missions. Deux sources strictement séparées :
 *  - `local` (défaut) : démonstration sur l'appareil. En mode d'authentification Supabase : clé locale distincte PAR COMPTE, jamais mêlée à la démo.
 *  - `db` : base Supabase. Exige l'authentification Supabase ET `STAFF_DATA_SOURCE=db` (voir /api/staff/session). Aucun stockage local de missions.
 * Avant la lecture de la session : état « chargement », aucune écriture nulle part.
 */
export function useMissions(): MissionsApi {
  const st = useDemoStatus();
  const dbMode = st?.mode === "supabase" && st.dataSource === "db" && isUuid(st.session?.userId);
  const key = st === undefined || (st.mode === "supabase" && !st.session?.memberId) ? `${MISSIONS_KEY}:pending` : st.mode === "supabase" ? `${MISSIONS_KEY}:db:${st.session?.memberId}` : MISSIONS_KEY;
  const local = useLocalMissions(dbMode ? `${MISSIONS_KEY}:inactive` : key, st !== undefined && !dbMode);
  const db = useDbMissions(dbMode);
  if (st === undefined) return { ...local, status: "loading" };
  return dbMode ? db : local;
}
