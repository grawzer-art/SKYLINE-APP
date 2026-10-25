"use client";
import { motion, useReducedMotion } from "motion/react";
import { PLACEHOLDER_PHOTOS, images } from "@/data/demo";
import { Photo } from "@/components/ui/Photo";
import { ease } from "@/design/motion";

/** Hero photographique compact : dégradé local en bas uniquement, la photo reste lisible. */
export function Hero() {
  const reduce = useReducedMotion();
  const item = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease, delay },
  } as const);

  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[min(52dvh,460px)] flex-col justify-end overflow-hidden px-5 pb-24 pt-[calc(var(--safe-top)+4.5rem)]">
      <div className="absolute inset-0 -z-10">
        <Photo src={images.hero} priority provisional={PLACEHOLDER_PHOTOS} alt="" tagClassName="top-[calc(var(--safe-top)+3.75rem)]"
          imgClassName={reduce ? "object-[50%_78%]" : "object-[50%_78%] animate-[kenburns_30s_ease-in-out_infinite_alternate]"} />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-jet/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-jet via-jet/60 via-40% to-transparent" />
      </div>

      <motion.p {...item(0.05)} className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-sky">
        Pre-boarding / 2027
      </motion.p>
      <motion.h1 id="hero-title" {...item(0.15)} className="font-display mt-3 text-[clamp(1.95rem,10.2vw,2.9rem)] text-cloud">
        Votre voyage<br />approche<span className="text-sky">.</span>
      </motion.h1>
      <motion.p {...item(0.3)} className="mt-4 max-w-[32ch] text-[0.95rem] leading-snug text-cloud/85">
        Retrouvez ici toutes les informations de votre voyage, les dernières annonces et préparez-vous à vivre SKYLINE.
      </motion.p>
      <style>{`@keyframes kenburns{from{transform:scale(1.02)}to{transform:scale(1.1) translate3d(-1%,-1%,0)}}`}</style>
    </section>
  );
}
