import {
  useManagerWorkspace,
  ManagerRecentActivityRow,
  ManagerLoadingState,
  ManagerEventsGrid,
} from "@/components/manager/ManagerWorkspace";
import { StatCard, DashboardCard } from "@/components/DashboardCard";
import { Megaphone, Clock, Users, CheckCircle2, CalendarPlus, ClipboardList, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const ManagerDashboardView = () => {
  const { stats, events, isLoading, error, managerClubName } = useManagerWorkspace();

  if (isLoading) return <ManagerLoadingState />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex-1 rounded-2xl border border-border/40 bg-gradient-card px-6 py-6 md:px-8 md:py-7 shadow-soft backdrop-blur-xl">
          <p className="text-xl md:text-2xl font-semibold tracking-tight">
            Welcome back, {managerClubName || "Club Manager"}
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-3">CampusHub</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            Club Management Dashboard & Overview
          </p>
        </div>
      </div>

      {/* 1. Summary Stats cards (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Events" value={stats.total} icon={<Megaphone className="h-5 w-5" />} />
        <StatCard label="Pending Approvals" value={stats.pending} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Total Registrations" value={stats.registrations} icon={<Users className="h-5 w-5" />} />
      </div>

      {/* 2. Side-by-side Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCard title="Recent Activity" subtitle="Your latest events status at a glance">
            <div className="divide-y divide-border/60">
              {events.slice(0, 3).map((e) => (
                <ManagerRecentActivityRow key={e.id} event={e} />
              ))}
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No events yet. Create one to get started.</p>
              )}
            </div>
          </DashboardCard>
        </div>

        <div>
          <DashboardCard title="Quick Actions" subtitle="Management shortcuts">
            <div className="flex flex-col gap-3 mt-2">
              <Button asChild className="w-full justify-start gap-2.5 bg-gradient-primary border-0 text-primary-foreground shadow-glow">
                <Link to="/manager-dashboard/create">
                  <CalendarPlus className="h-4 w-4" /> Create New Event
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2.5 border-border/40">
                <Link to="/manager-dashboard/registrations">
                  <ClipboardList className="h-4 w-4" /> View Registrations
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2.5 border-border/40">
                <Link to="/manager-dashboard/my-events">
                  <CalendarClock className="h-4 w-4" /> Manage My Events
                </Link>
              </Button>
            </div>
          </DashboardCard>
        </div>
      </div>

      {/* 3. Recent Club Events below (showing 3 recent event cards) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Recent Club Events</h2>
            <p className="text-sm text-muted-foreground mt-0.5">The most recent events created for your club.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
            <Link to="/manager-dashboard/club-events">View all events</Link>
          </Button>
        </div>
        
        <ManagerEventsGrid events={events.slice(0, 3)} showActions={true} />
      </div>
    </div>
  );
};
