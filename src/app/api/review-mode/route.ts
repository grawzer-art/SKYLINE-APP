import { NextResponse, connection, type NextRequest } from "next/server";
import { reviewModeFromProcess } from "@/lib/experience/reviewMode";

/** Indique à l'interface si le mode revue LOCAL est autorisé (évalué à chaque requête, côté serveur). Ne renvoie qu'un booléen. */
export async function GET(req: NextRequest) {
  await connection();
  const review = reviewModeFromProcess({ host: req.headers.get("host"), forwardedHost: req.headers.get("x-forwarded-host") });
  return NextResponse.json({ review }, { headers: { "Cache-Control": "no-store" } });
}
