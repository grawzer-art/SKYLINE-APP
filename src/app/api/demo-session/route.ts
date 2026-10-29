import { NextResponse, type NextRequest } from "next/server";
import { DEMO_ACCOUNTS } from "@/lib/auth/roles";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, demoAuthEnabled, signSession, verifySession } from "@/lib/auth/token";

/**
 * Session de DÉMONSTRATION (cookie signé httpOnly, vérifié côté serveur par le proxy). Désactivable : DEMO_AUTH=off.
 * GET : session courante (informative — l'autorisation réelle est faite par `src/proxy.ts`) · POST : ouvre une session démo / `logout`.
 */
const disabled = () => !demoAuthEnabled();
const noStore = { "Cache-Control": "no-store" };
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/staff");

export async function GET(req: NextRequest) {
  if (disabled()) return NextResponse.json({ enabled: false, session: null }, { headers: noStore });
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ enabled: true, session: s ? { name: s.name, roles: s.roles, demo: true } : null }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  if (disabled()) return new NextResponse(null, { status: 404 });
  const form = await req.formData().catch(() => null);
  const account = String(form?.get("account") ?? ""); const next = safeNext(String(form?.get("next") ?? "") || null);
  const back = (path: string) => NextResponse.redirect(new URL(path, req.url), { status: 303, headers: noStore });
  if (account === "logout") { const r = back("/staff/access"); r.cookies.delete(SESSION_COOKIE); return r; }
  const a = DEMO_ACCOUNTS.find((x) => x.id === account);
  if (!a) return back("/staff/access?error=1");
  const token = await signSession({ sub: `demo-${a.id}`, name: a.name, roles: a.roles });
  const r = back(next);
  r.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_SECONDS });
  return r;
}
