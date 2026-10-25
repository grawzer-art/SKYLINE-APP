import {
  Plane, Music2, Sun, Users, Ticket, Compass, Crown, Ellipsis, Bell, House,
  Check, X, ArrowRight, ArrowLeft, Luggage, Headphones, type LucideProps,
} from "lucide-react";

/** Registre d'icônes : un seul endroit pour garder un trait cohérent (fin, aviation). */
export const icons = {
  plane: Plane, music: Music2, sun: Sun, users: Users, ticket: Ticket, compass: Compass,
  club: Crown, more: Ellipsis, bell: Bell, home: House, check: Check, close: X,
  arrow: ArrowRight, back: ArrowLeft, luggage: Luggage, headphones: Headphones,
} as const;
export type IconName = keyof typeof icons;

export function Icon({ name, ...p }: { name: string } & LucideProps) {
  const C = icons[name as IconName] ?? Plane; // contenu manquant → icône par défaut
  return <C strokeWidth={1.5} aria-hidden {...p} />;
}
