import { DashboardCard } from "@/components/DashboardCard";

export const AdminSettingsView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure platform preferences and admin settings here.</p>
      </header>

      <DashboardCard title="Platform Settings" subtitle="Placeholder page for future system settings.">
        <p className="text-sm text-muted-foreground">No settings are configured yet.</p>
      </DashboardCard>
    </div>
  );
};
