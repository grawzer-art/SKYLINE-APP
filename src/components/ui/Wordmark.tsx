import Image from "next/image";
import { brand } from "@/data/demo";
import { cn } from "@/lib/cn";

/**
 * Wordmark SKYLINE. — substitut typographique tant que le fichier officiel n'est pas fourni
 * (renseigner `brand.wordmarkSrc` dans src/data/demo.ts). Jamais de pictogramme d'avion.
 */
export function Wordmark({ className }: { className?: string }) {
  if (brand.wordmarkSrc) {
    return <Image src={brand.wordmarkSrc} alt="SKYLINE" width={120} height={24} className={cn("h-5 w-auto", className)} priority />;
  }
  return (
    <span className={cn("font-display text-[1.3rem] font-black leading-none tracking-[-0.01em]", className)} aria-label="SKYLINE">
      SKYLINE.
    </span>
  );
}
