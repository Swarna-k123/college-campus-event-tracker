import { DashboardCard } from "@/components/DashboardCard";

export const AdminVenueConflictsView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Venue Conflicts</h1>
        <p className="text-muted-foreground">Venue conflict detection will be implemented in a future phase.</p>
      </header>

      <DashboardCard title="Coming soon" subtitle="This page is reserved for future venue overlap detection.">
        <p className="text-sm text-muted-foreground">No venue conflicts are currently tracked here.</p>
      </DashboardCard>
    </div>
  );
};
