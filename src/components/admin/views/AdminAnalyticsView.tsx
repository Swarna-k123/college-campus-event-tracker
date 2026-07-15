import { DashboardCard } from "@/components/DashboardCard";

export const AdminAnalyticsView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Platform insights and reporting will be added here in a future phase.</p>
      </header>

      <DashboardCard title="Analytics Overview" subtitle="Placeholder page for future reporting widgets.">
        <p className="text-sm text-muted-foreground">No analytics data is available yet.</p>
      </DashboardCard>
    </div>
  );
};
