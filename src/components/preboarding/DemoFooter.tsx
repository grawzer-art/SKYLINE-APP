import { DEMO_NOTICE, event } from "@/data/demo";

export function DemoFooter() {
  return (
    <footer className="mt-16 px-5 pb-4 text-center">
      <p className="font-display text-lg text-cloud/90">{event.signature}</p>
      <p className="mt-3 inline-block rounded-full border border-line px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-dim">
        {DEMO_NOTICE}
      </p>
    </footer>
  );
}
