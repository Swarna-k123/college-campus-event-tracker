import { useManagerWorkspace, ManagerLoadingState } from "@/components/manager/ManagerWorkspace";
import { CreateEventForm } from "@/components/manager/CreateEventForm";
import { DashboardCard } from "@/components/DashboardCard";
import { useNavigate } from "react-router-dom";

export const ManagerCreateEventView = () => {
  const { handleCreate, isLoading } = useManagerWorkspace();
  const navigate = useNavigate();

  const onCreateWrapper = async (payload: any) => {
    await handleCreate(payload);
    navigate("/manager-dashboard/my-events");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Event</h1>
        <p className="text-muted-foreground mt-2">
          Submit a new event proposal for administrator approval.
        </p>
      </div>

      <DashboardCard title="Event Details" subtitle="Enter your event information.">
        <CreateEventForm onCreate={onCreateWrapper} />
      </DashboardCard>
    </div>
  );
};
