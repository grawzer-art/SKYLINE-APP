import { DEMO_NOTICE, event } from "@/data/demo";
import { Emblem } from "@/components/ui/Emblem";

export function DemoFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={compact ? "mt-4 flex flex-col items-center px-5 pb-2 text-center" : "mt-32 flex flex-col items-center px-5 pb-4 text-center"}>
      {!compact && <Emblem size={72} className="mb-5 opacity-90" />}
      {!compact && <p className="font-tagline text-[0.72rem] text-silver/80">{event.signature}</p>}
      <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-dim">{DEMO_NOTICE}</p>
    </footer>
  );
}
