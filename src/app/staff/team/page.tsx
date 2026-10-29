import { StaffTitle, StaffSection, DemoLine } from "@/components/staff/ui";
import { TeamDirectory } from "@/components/staff/TeamDirectory";

export default function Page() {
  return (
    <>
      <StaffTitle eyebrow="Annuaire de l'organisation" title="Team" />
      <StaffSection className="pt-6"><TeamDirectory /></StaffSection>
      <DemoLine />
    </>
  );
}
