import { DashboardCard } from "@/components/DashboardCard";

export const AdminClubsView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Clubs</h1>
        <p className="text-muted-foreground">Browse and manage campus clubs from this section.</p>
      </header>

      <DashboardCard title="Club Directory" subtitle="A placeholder view for future club management functionality.">
        <p className="text-sm text-muted-foreground">Club management details will be added in a future phase.</p>
      </DashboardCard>
    </div>
  );
};
