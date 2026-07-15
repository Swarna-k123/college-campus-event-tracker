import { DashboardCard } from "@/components/DashboardCard";

export const StudentNotificationsView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">This section is reserved for event and campus updates.</p>
      </header>

      <DashboardCard title="Coming soon" subtitle="Notifications will appear here in a future update.">
        <p className="text-sm text-muted-foreground">No alerts to display right now.</p>
      </DashboardCard>
    </div>
  );
};
