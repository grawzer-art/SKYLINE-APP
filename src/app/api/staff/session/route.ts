import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, demoAuthEnabled, verifySession } from "@/lib/auth/token";
import { staffAuthMode } from "@/lib/staff/mode";
import { loadStaffIdentity } from "@/lib/staff/session";
import { createServerSupabase } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

/** Session STAFF courante (informative pour l'interface). L'autorisation réelle est faite par le proxy, la base (RLS) et le code serveur. */
export async function GET(req: NextRequest) {
  if (staffAuthMode() === "supabase") {
    try {
      const supabase = await createServerSupabase(); const { data } = await supabase.auth.getUser();
      const id = data.user ? await loadStaffIdentity(supabase, data.user.id, data.user.email ?? "") : null;
      return NextResponse.json({ mode: "supabase", enabled: true, session: id ? { name: id.name, roles: id.roles, memberId: id.slug, demo: false } : null }, { headers: noStore });
    } catch { return NextResponse.json({ mode: "supabase", enabled: true, session: null }, { headers: noStore }); }
  }
  if (!demoAuthEnabled()) return NextResponse.json({ mode: "demo", enabled: false, session: null }, { headers: noStore });
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ mode: "demo", enabled: true, session: s ? { name: s.name, roles: s.roles, memberId: s.memberId, demo: true } : null }, { headers: noStore });
}
