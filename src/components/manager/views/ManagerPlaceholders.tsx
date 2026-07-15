import { DashboardCard } from "@/components/DashboardCard";
import { BarChart3, Activity, Settings } from "lucide-react";

export const ManagerAnalyticsView = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      <p className="text-muted-foreground mt-2">Track performance, registrations, and budget metrics.</p>
    </div>
    <DashboardCard>
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Analytics</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Analytics dashboard will be implemented in a future phase.
        </p>
      </div>
    </DashboardCard>
  </div>
);

export const ManagerActivityView = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
      <p className="text-muted-foreground mt-2">Monitor recent logs and event status updates.</p>
    </div>
    <DashboardCard>
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Activity className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Activity Logs</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Activity logs will be implemented in a future phase.
        </p>
      </div>
    </DashboardCard>
  </div>
);

export const ManagerSettingsView = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground mt-2">Configure club preferences and profile settings.</p>
    </div>
    <DashboardCard>
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Settings className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Club Settings</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Settings configuration will be implemented in a future phase.
        </p>
      </div>
    </DashboardCard>
  </div>
);
