"use client";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ease } from "@/design/motion";

/** Transition discrète entre sections (fondu + léger glissement), désactivée si reduced-motion. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  if (pathname.startsWith("/signal/") || pathname.startsWith("/v3")) return <>{children}</>; // une transformation parente casserait le plein écran (position: fixed)
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}>
      {children}
    </motion.div>
  );
}
