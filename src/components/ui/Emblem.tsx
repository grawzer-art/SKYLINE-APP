import Image from "next/image";
import { brand } from "@/data/demo";
import { cn } from "@/lib/cn";

/** Emblème circulaire officiel (usages secondaires : espace membre, supports spéciaux). Proportions préservées. */
export function Emblem({ size = 56, className }: { size?: number; className?: string }) {
  if (!brand.emblemSrc) return null;
  return <Image src={brand.emblemSrc} alt="SKYLINE Event" width={Math.round(size * brand.emblemRatio)} height={size} style={{ height: size, width: "auto" }} className={cn("shrink-0", className)} />;
}
