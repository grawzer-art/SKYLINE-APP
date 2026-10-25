"use client";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { event, images, user } from "@/data/demo";
import { Photo } from "@/components/ui/Photo";
import { ease } from "@/design/motion";

export function Hero() {
  const reduce = useReducedMotion();
  const item = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease, delay },
  } as const);

  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[calc(100dvh-var(--nav-h)-var(--safe-bottom)-6.5rem)] flex-col justify-end overflow-hidden px-5 pb-10 pt-32">
      <div className="absolute inset-0 -z-10">
        <Photo src={images.hero} priority alt="" imgClassName={reduce ? undefined : "animate-[kenburns_28s_ease-in-out_infinite_alternate]"} />
        {/* Dégradés : lisibilité du titre en bas, fondu vers le fond noir */}
        <div className="absolute inset-0 bg-gradient-to-t from-jet via-jet/45 via-30% to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-jet/70 to-transparent" />
      </div>

      <motion.p {...item(0.1)} className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-sky">
        Bonjour {user.firstName} · {event.name} {event.year}
      </motion.p>
      <motion.h1 id="hero-title" {...item(0.2)} className="font-display mt-4 text-[clamp(2.7rem,14vw,4.4rem)] leading-[0.88] text-cloud">
        Votre voyage <span className="text-sunset">approche.</span>
      </motion.h1>
      <motion.p {...item(0.35)} className="mt-5 max-w-[34ch] text-[1.02rem] leading-relaxed text-cloud/85">
        Ton départ se prépare. Retrouve ici le compte à rebours, les annonces et tout ce qu&apos;il faut pour décoller sereinement.
      </motion.p>
      <motion.a {...item(0.5)} href="#countdown"
        className="mt-8 inline-flex w-fit min-h-11 items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-cloud/80 transition hover:text-cloud">
        <ArrowDown size={16} strokeWidth={1.5} aria-hidden className="motion-safe:animate-bounce" /> Voir le décollage
      </motion.a>
      <style>{`@keyframes kenburns{from{transform:scale(1.02)}to{transform:scale(1.12) translate3d(-1.5%,-1%,0)}}`}</style>
    </section>
  );
}
