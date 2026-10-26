import { DEMO_NOTICE, event } from "@/data/demo";
import { Emblem } from "@/components/ui/Emblem";

export function DemoFooter() {
  return (
    <footer className="mt-32 flex flex-col items-center px-5 pb-4 text-center">
      <Emblem size={72} className="mb-5 opacity-90" />
      <p className="font-tagline text-[0.6rem] text-silver/80">{event.signature}</p>
      <p className="mt-3 inline-block border border-line px-3 py-1.5 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-dim">{DEMO_NOTICE}</p>
    </footer>
  );
}
