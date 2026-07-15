import { useManagerWorkspace, ManagerEventsGrid, ManagerLoadingState } from "@/components/manager/ManagerWorkspace";

export const ManagerClubEventsView = () => {
  const { events, isLoading, error } = useManagerWorkspace();

  if (isLoading) return <ManagerLoadingState />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Club Events</h1>
        <p className="text-muted-foreground mt-2">
          Browse all events hosted by your club.
        </p>
      </div>

      <ManagerEventsGrid events={events} showActions={false} />
    </div>
  );
};
