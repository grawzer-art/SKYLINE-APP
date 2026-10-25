import type { NavId } from "@/data/demo";

/** Les cinq entrées de navigation. Ajouter une section = ajouter une ligne + un dossier dans src/app. */
export const navItems: { id: NavId; label: string; href: string; icon: string }[] = [
  { id: "home", label: "Home", href: "/", icon: "home" },
  { id: "pass", label: "My Pass", href: "/pass", icon: "ticket" },
  { id: "explore", label: "Explore", href: "/explore", icon: "compass" },
  { id: "club", label: "Club", href: "/club", icon: "club" },
  { id: "more", label: "More", href: "/more", icon: "more" },
];
