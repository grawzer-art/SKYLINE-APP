import Image from "next/image";
import { brand } from "@/data/demo";
import { cn } from "@/lib/cn";

/**
 * Wordmark SKYLINE OFFICIEL uniquement (fichier fourni, variante blanche sur fond sombre). Aucune recréation
 * typographique : sans fichier dans `brand.wordmarkSrc`, un emplacement clairement identifié s'affiche.
 */
export function Wordmark({ className }: { className?: string }) {
  if (brand.wordmarkSrc) {
    return <Image src={brand.wordmarkSrc} alt="SKYLINE" width={Math.round(20 * brand.wordmarkRatio * 2)} height={40} priority className={cn("h-5 w-auto", className)} />;
  }
  return (
    <span role="img" aria-label="SKYLINE (emplacement du wordmark officiel)"
      className={cn("inline-flex h-7 items-center border border-dashed border-cloud/35 px-2.5 font-mono text-[0.54rem] uppercase tracking-[0.16em] text-cloud/60", className)}>
      Wordmark officiel · à fournir
    </span>
  );
}
