import type { NavId } from "@/data/demo";

/** Quatre destinations. Ajouter une section = une ligne ici + un dossier dans src/app. */
export const navItems: { id: NavId; label: string; href: string; icon: string }[] = [
  { id: "home", label: "Home", href: "/", icon: "home" },
  { id: "flight", label: "My Flight", href: "/flight", icon: "plane" },
  { id: "explore", label: "Explore", href: "/explore", icon: "compass" },
  { id: "club", label: "Club", href: "/club", icon: "idcard" },
];
