import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const styles = {
  primary: "bg-cloud text-jet hover:bg-white",
  accent: "bg-sunset text-jet hover:brightness-110",
  ghost: "border border-line bg-cloud/5 text-cloud hover:bg-cloud/10",
} as const;

type Common = { variant?: keyof typeof styles; children: ReactNode; className?: string };

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.8rem] font-medium uppercase tracking-[0.14em] transition active:scale-[0.97]";

export function Button({ variant = "primary", className, ...p }: Common & ComponentProps<"button">) {
  return <button type="button" {...p} className={cn(base, styles[variant], className)} />;
}
export function ButtonLink({ variant = "primary", className, ...p }: Common & ComponentProps<typeof Link>) {
  return <Link {...p} className={cn(base, styles[variant], className)} />;
}
