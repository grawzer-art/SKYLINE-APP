import { V3Home } from "@/components/v3/V3Home";
import { getFeaturedSignal } from "@/data/signals";

export default function Page() {
  return <V3Home signal={getFeaturedSignal()} />;
}
