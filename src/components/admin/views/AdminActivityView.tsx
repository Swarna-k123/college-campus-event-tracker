import { DashboardCard } from "@/components/DashboardCard";

export const AdminActivityView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">Recent system activity and moderation history will be shown here.</p>
      </header>

      <DashboardCard title="Recent Activity" subtitle="Placeholder page for moderation and audit activity.">
        <p className="text-sm text-muted-foreground">No recent activity is available yet.</p>
      </DashboardCard>
    </div>
  );
};
