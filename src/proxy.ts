import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSignalBySlug } from "@/data/signals";

/**
 * Un brouillon ou un slug inconnu doit répondre par un VRAI 404 dès la première requête
 * (sinon, le rendu en flux peut renvoyer 200 avec une page « introuvable »).
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if (!getSignalBySlug(decodeURIComponent(slug))) {
    return NextResponse.rewrite(new URL("/signal-introuvable", request.url)); // route inexistante → 404 + not-found.tsx
  }
  return NextResponse.next();
}

export const config = { matcher: "/signal/:slug" };
