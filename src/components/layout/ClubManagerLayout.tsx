import { ManagerWorkspaceProvider } from "@/components/manager/ManagerWorkspace";
import { RoleDashboardLayout } from "@/components/layout/RoleDashboardLayout";

export const ClubManagerLayout = () => {
  return (
    <ManagerWorkspaceProvider>
      <RoleDashboardLayout role="manager" roleLabel="Club Manager" />
    </ManagerWorkspaceProvider>
  );
};
