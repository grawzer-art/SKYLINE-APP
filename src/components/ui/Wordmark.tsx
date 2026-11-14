import Image from "next/image";
import { brand } from "@/data/demo";
import { cn } from "@/lib/cn";

/**
 * Wordmark SKYLINE OFFICIEL uniquement (fichier fourni, variante blanche sur fond sombre). Aucune recréation
 * typographique : sans fichier dans `brand.wordmarkSrc`, un emplacement clairement identifié s'affiche.
 */
export function Wordmark({ className, size = "md" }: { className?: string; /** `sm` : en-tête compact V3.2 (14 px de haut au lieu de 20) ; `lg` : HOME V3.2 (26 px). */ size?: "md" | "sm" | "lg" }) {
  if (brand.wordmarkSrc) {
    return <Image src={brand.wordmarkSrc} alt="SKYLINE" width={Math.round(20 * brand.wordmarkRatio * 2)} height={40} priority className={cn(size === "sm" ? "h-3.5 w-auto" : size === "lg" ? "h-[26px] w-auto" : "h-5 w-auto", className)} />;
  }
  return (
    <span role="img" aria-label="SKYLINE (emplacement du wordmark officiel)"
      className={cn("inline-flex h-7 items-center border border-dashed border-cloud/35 px-2.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-cloud/72", className)}>
      Wordmark officiel · à fournir
    </span>
  );
}
