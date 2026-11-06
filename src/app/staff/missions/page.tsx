import { Suspense } from "react";
import { MissionsScreen } from "@/components/staff/MissionsScreen";

export default function Page() { return <Suspense fallback={null}><MissionsScreen /></Suspense>; }
