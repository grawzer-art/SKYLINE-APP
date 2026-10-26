import { V3Explore } from "@/components/v3/V3Explore";
import { SignalList } from "@/components/signal/SignalList";
import { getPublishedSignals } from "@/data/signals";

export default function Page() {
  return <V3Explore signals={<SignalList items={getPublishedSignals()} />} />;
}
