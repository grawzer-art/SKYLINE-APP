"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname === "/crew" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] border-t border-line bg-jet/92 pb-[var(--safe-bottom)] backdrop-blur-xl"
    >
      <ul className="grid h-[var(--nav-h)] grid-cols-5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href} aria-current={active ? "page" : undefined}
                className={cn("flex h-full min-h-11 flex-col items-center justify-center gap-1 transition-colors", active ? "text-sky" : "text-silver/80 hover:text-cloud")}
              >
                <Icon name={item.icon} size={22} />
                <span className="text-[0.625rem] font-medium uppercase tracking-[0.06em]">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
