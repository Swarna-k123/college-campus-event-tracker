import { useManagerWorkspace, ManagerEventsGrid, ManagerLoadingState } from "@/components/manager/ManagerWorkspace";

export const ManagerMyEventsView = () => {
  const { myEvents, isLoading, error } = useManagerWorkspace();

  if (isLoading) return <ManagerLoadingState />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
        <p className="text-muted-foreground mt-2">
          Manage your created events. Use edit and delete controls below.
        </p>
      </div>

      <ManagerEventsGrid events={myEvents} showActions={true} />
    </div>
  );
};
