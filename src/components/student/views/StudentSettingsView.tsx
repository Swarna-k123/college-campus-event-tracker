import { DashboardCard } from "@/components/DashboardCard";

export const StudentSettingsView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Adjust your campus experience preferences here.</p>
      </header>

      <DashboardCard title="Preferences" subtitle="This area is ready for future student settings.">
        <p className="text-sm text-muted-foreground">No settings are configured yet.</p>
      </DashboardCard>
    </div>
  );
};
