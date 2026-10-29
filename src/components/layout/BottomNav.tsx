"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/cn";
import { useSignals } from "@/lib/useSignals";

/** Quatre onglets, trait fin : l'état actif est porté par la couleur et un filet. */
export function BottomNav({ signalIds = [] }: { signalIds?: string[] }) {
  const pathname = usePathname();
  const { unseen } = useSignals(signalIds);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (pathname.startsWith("/signal/") || pathname.startsWith("/v3") || pathname.startsWith("/staff") || pathname === "/start") return null;
  return (
    <nav aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-cloud/10 bg-jet/80 pb-[var(--safe-bottom)] backdrop-blur-2xl">
      <ul className="grid h-[var(--nav-h)] grid-cols-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.id} className="relative">
              <Link href={item.href} aria-current={active ? "page" : undefined}
                className={cn("flex h-full min-h-11 flex-col items-center justify-center gap-1.5 transition-colors", active ? "text-cloud" : "text-silver/60 hover:text-cloud")}>
                <span className="relative">
                  <Icon name={item.icon} size={20} className={cn(item.id === "flight" && "-rotate-45")} />
                  {item.id === "explore" && unseen.length > 0 && <span aria-hidden className="absolute -right-1.5 -top-1 size-1.5 rounded-full bg-sunset" />}
                </span>
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em]">{item.label}{item.id === "explore" && unseen.length > 0 && <span className="sr-only"> — nouvelle révélation</span>}</span>
              </Link>
              {active && <span aria-hidden className="absolute inset-x-[30%] top-0 h-px bg-sky" />}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
