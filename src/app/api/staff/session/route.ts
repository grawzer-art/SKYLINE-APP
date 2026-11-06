import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, demoAuthEnabled, verifySession } from "@/lib/auth/token";
import { staffAuthMode } from "@/lib/staff/mode";
import { staffConfig } from "@/lib/staff/data-source";
import { loadStaffIdentity } from "@/lib/staff/session";
import { createServerSupabase } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

/** Session STAFF courante (informative pour l'interface). L'autorisation réelle est faite par le proxy, la base (RLS) et le code serveur. */
export async function GET(req: NextRequest) {
  // Configuration demandée mais incorrecte : erreur explicite, aucune session ni donnée (jamais de repli silencieux vers le local).
  const cfg = staffConfig();
  if (cfg.issue) return NextResponse.json({ mode: cfg.auth, dataSource: "misconfigured", configError: cfg.issue, enabled: false, session: null }, { headers: noStore });
  if (staffAuthMode() === "supabase") {
    try {
      const supabase = await createServerSupabase(); const { data } = await supabase.auth.getUser();
      const id = data.user ? await loadStaffIdentity(supabase, data.user.id, data.user.email ?? "") : null;
      return NextResponse.json({ mode: "supabase", dataSource: cfg.data, dbSchema: cfg.dbSchema, enabled: true, session: id ? { name: id.name, access: id.access, memberId: id.slug, userId: id.userId, demo: false } : null }, { headers: noStore });
    } catch { return NextResponse.json({ mode: "supabase", dataSource: "local", enabled: true, session: null }, { headers: noStore }); }
  }
  if (!demoAuthEnabled()) return NextResponse.json({ mode: "demo", dataSource: "local", enabled: false, session: null }, { headers: noStore });
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ mode: "demo", dataSource: "local", enabled: true, session: s ? { name: s.name, access: s.access, memberId: s.memberId, demo: true } : null }, { headers: noStore });
}
