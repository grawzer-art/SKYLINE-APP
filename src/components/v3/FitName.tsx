import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Nom affiché sur le pass MY FLIGHT et sur la carte CLUB : même police et même rendu métal qu'avant, mais jamais tronqué.
 * La taille est calculée sur le mot le PLUS LONG (plafonnée à `max`, plancher `min`) pour que chaque mot tienne dans la largeur disponible ;
 * le nom passe à la ligne entre les mots (ou après un tiret) au lieu de finir en « … ». Au plancher, un mot démesuré est coupé plutôt que débordant.
 * `gutter` = marges horizontales cumulées de la page et de l'objet (en rem). La colonne de l'application est plafonnée à 480 px.
 */
const COLUMN = "480px";
const WIDTH_PER_CHAR = 1; // largeur moyenne d'une lettre capitale de la police d'affichage, en « em » (mesurée ≈ 0,8 à 1,0)
export function fitFontSize(name: string, { max, min, gutter }: { max: string; min: string; gutter: string }): string {
  const longest = Math.max(1, ...name.split(/[\s\-–—]+/).map((w) => [...w].length));
  return `clamp(${min}, calc((min(100vw, ${COLUMN}) - ${gutter}) / ${(longest * WIDTH_PER_CHAR).toFixed(2)}), ${max})`;
}
export function FitName({ name, max, min, gutter, className, style, children }: { name: string; max: string; min: string; gutter: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <p className={cn("break-words [hyphens:manual]", className)} style={{ ...style, fontSize: fitFontSize(name, { max, min, gutter }) }}>{children ?? name}</p>
  );
}
