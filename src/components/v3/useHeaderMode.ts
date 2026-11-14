"use client";
import { usePathname } from "next/navigation";
import { useExperience } from "@/lib/experience/useExperience";
import { headerMode } from "./headerMode";

/** Vrai quand l'en-tête compact V3.2 est affiché (jamais en revue locale). */
export function useCompactHeader(): boolean {
  const pathname = usePathname(); const x = useExperience();
  return headerMode(pathname, x.review) === "compact";
}
