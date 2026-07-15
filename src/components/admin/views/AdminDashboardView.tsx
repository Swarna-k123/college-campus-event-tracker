import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Clock, Loader2, ShieldCheck, Users, CheckCircle2, XCircle } from "lucide-react";
import { StatCard } from "@/components/DashboardCard";
import { DashboardCard } from "@/components/DashboardCard";
import { loadAllEventsForAdmin } from "@/components/dashboards/AdminDashboard";

export const AdminDashboardView = () => {
  const { user } = useAuth();
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["admin-all-events"],
    queryFn: loadAllEventsForAdmin,
  });

  const pending = events.filter((e) => e.status === "pending");
  const approved = events.filter((e) => e.status === "approved");
  const rejected = events.filter((e) => e.status === "rejected");

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-border/60 bg-gradient-card px-6 py-6 md:px-8 md:py-7 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
              <ShieldCheck className="h-3.5 w-3.5" /> Administrator
            </div>
            <p className="text-xl md:text-2xl font-semibold tracking-tight mt-3">Welcome back, {user?.name ?? "Admin"}</p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-4">CampusHub</h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">Administration Dashboard</p>
          </div>
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pending Event Approvals" value={pending.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Today's Events" value={approved.length} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Total Clubs" value="—" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Total Students" value="—" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Recent Activity" value={rejected.length} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Quick Actions" value="Review" icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DashboardCard title="Overview" subtitle="Quick snapshot of your admin operations.">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">Pending approvals require review before events go live.</div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">Approved and rejected events are maintained in the admin event views.</div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-3">Use the sidebar to jump between approvals, clubs, and platform insights.</div>
            </div>
          </DashboardCard>

          <DashboardCard title="Quick Actions" subtitle="Fast navigation for common admin tasks.">
            <div className="space-y-2 text-sm">
              <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-muted-foreground">Review pending events</div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-muted-foreground">Browse all platform events</div>
              <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-muted-foreground">Manage clubs and future admin areas</div>
            </div>
          </DashboardCard>
        </div>
      )}
    </div>
  );
};
