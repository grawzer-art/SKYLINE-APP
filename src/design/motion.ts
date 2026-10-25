import type { Transition, Variants } from "motion/react";

/** Courbe maison : sortie douce, sans rebond. */
export const ease = [0.22, 1, 0.36, 1] as const;

export const transitions = {
  base: { duration: 0.5, ease } satisfies Transition,
  quick: { duration: 0.25, ease } satisfies Transition,
  sheet: { type: "spring", damping: 34, stiffness: 340, mass: 0.9 } satisfies Transition,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: transitions.base },
};

export const stagger = (delay = 0.06): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
});

/** Variante « sans mouvement » utilisée si prefers-reduced-motion. */
export const still: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};
