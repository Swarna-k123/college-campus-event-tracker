import {
  useManagerWorkspace,
  ManagerRecentActivityRow,
  ManagerLoadingState,
  ManagerEventsGrid,
  type ManagerDashboardEvent,
} from "@/components/manager/ManagerWorkspace";
import { DashboardCard } from "@/components/DashboardCard";
import {
  Clock,
  Users,
  CheckCircle2,
  CalendarPlus,
  ClipboardList,
  CalendarClock,
  LineChart,
  Calendar,
  TrendingUp,
  ArrowRight,
  MapPin,
  Calendar as CalIcon,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubLogoUploader } from "@/components/ui/ClubLogoUploader";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { format, isAfter, startOfDay } from "date-fns";

// ─── Upcoming Schedule helpers ────────────────────────────────────────────────

const scheduleStatusMeta: Record<
  "approved" | "pending" | "rejected",
  { label: string; cls: string; icon: React.ReactNode }
> = {
  approved: {
    label: "Approved",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending: {
    label: "Pending",
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    icon: <Clock className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    cls: "bg-destructive/20 text-destructive border-destructive/50",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

const BADGE_GRADIENTS = [
  "from-violet-600 to-purple-700",
  "from-orange-500 to-amber-600",
  "from-rose-600 to-pink-700",
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
];

function getDayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const eventDay = startOfDay(date);
  const diffDays = Math.round(
    (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return format(date, "EEEE");
}

const UpcomingScheduleItem = ({
  event,
  index,
  isLast,
}: {
  event: ManagerDashboardEvent;
  index: number;
  isLast: boolean;
}) => {
  const startDate = new Date(event.date);
  const endDate = event.endsAt ? new Date(event.endsAt) : null;
  const gradientCls = BADGE_GRADIENTS[index % BADGE_GRADIENTS.length];
  const meta = scheduleStatusMeta[event.status] ?? scheduleStatusMeta["pending"];
  const dayLabel = getDayLabel(startDate);
  const timeStr = endDate
    ? `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`
    : format(startDate, "h:mm a");

  return (
    <div
      className={cn(
        "flex items-center gap-4 py-5 group transition-colors hover:bg-white/[0.025]",
        !isLast && "border-b border-border/40"
      )}
    >
      {/* Coloured date badge */}
      <div
        className={cn(
          "shrink-0 flex flex-col items-center justify-center rounded-2xl w-16 h-16 bg-gradient-to-br shadow-lg text-white font-bold select-none",
          gradientCls
        )}
      >
        <span className="text-2xl leading-none">{format(startDate, "dd")}</span>
        <span className="text-[11px] uppercase tracking-widest opacity-90 mt-0.5">
          {format(startDate, "MMM")}
        </span>
      </div>

      {/* Title + day label */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
          {dayLabel}
        </p>
        <h3 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
          {event.title}
        </h3>
      </div>

      {/* Date / Time / Venue — hidden on xs */}
      <div className="hidden sm:flex items-center gap-5 shrink-0 text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{format(startDate, "MMM dd, yyyy")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
          <span>{timeStr}</span>
        </div>
        <div className="flex items-center gap-1.5 max-w-[130px]">
          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{event.venue}</span>
        </div>
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
          meta.cls
        )}
      >
        {meta.icon}
        {meta.label}
      </Badge>
    </div>
  );
};

const UpcomingScheduleSection = () => {
  const { events } = useManagerWorkspace();

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => {
        const isApproved = e.status === "approved";
        const isStartInFuture = new Date(e.date).getTime() > now;
        const endTime = e.endsAt ? new Date(e.endsAt).getTime() : new Date(e.date).getTime();
        const hasNotEnded = endTime > now;
        return isApproved && isStartInFuture && hasNotEnded;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [events]);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Upcoming Schedule</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your next scheduled events.
          </p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary hover:bg-primary/10"
        >
          <Link to="/manager-dashboard/club-events">View Calendar →</Link>
        </Button>
      </div>

      <div className="rounded-3xl border border-border/40 bg-gradient-card shadow-soft backdrop-blur-xl overflow-hidden px-6">
        {upcomingEvents.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <h3 className="text-base font-semibold text-foreground mb-1">
              No upcoming approved events
            </h3>
            <p className="text-sm text-muted-foreground">
              Approved events scheduled for your club will appear here once they are ready.
            </p>
          </div>
        ) : (
          upcomingEvents.map((event, i) => (
            <UpcomingScheduleItem
              key={event.id}
              event={event}
              index={i}
              isLast={i === upcomingEvents.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── Main Dashboard View ──────────────────────────────────────────────────────

export const ManagerDashboardView = () => {
  const { stats, events, isLoading, error, managerClubName } = useManagerWorkspace();
  const { user } = useAuth();

  if (isLoading) return <ManagerLoadingState />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-8">
      {/* ── Hero / Welcome ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-6 md:p-8 rounded-3xl border border-border/40 bg-gradient-to-br from-background via-secondary/30 to-primary/5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-56 h-56 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 z-10">
          {user?.clubId && (
            <div className="shrink-0 relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-blue-500 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="relative bg-background/60 p-2 rounded-2xl border border-border/50 backdrop-blur-md shadow-inner">
                <ClubLogoUploader
                  clubId={user.clubId}
                  currentUrl={null}
                  clubName={managerClubName ?? "Club"}
                  size="lg"
                  readOnly
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="text-lg md:text-xl font-medium text-muted-foreground flex items-center gap-2">
              Welcome back, {user?.name ? user.name.split(" ")[0] : "Manager"}!{" "}
              <span className="animate-wave origin-bottom-right inline-block">👋</span>
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
              {managerClubName || "Club Management"}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground/90 mt-1 max-w-xl leading-relaxed">
              Manage your events, registrations, approvals and club activities from one place.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0 z-10 mt-2 lg:mt-0">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto gap-2.5 bg-gradient-primary hover:opacity-90 border-0 text-primary-foreground shadow-glow transition-all hover:-translate-y-0.5 active:translate-y-0 font-semibold rounded-xl px-6"
          >
            <Link to="/manager-dashboard/create">
              <CalendarPlus className="h-5 w-5" /> Create New Event
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto gap-2.5 border-border/40 hover:bg-secondary/60 hover:text-foreground backdrop-blur-sm transition-all hover:-translate-y-0.5 active:translate-y-0 rounded-xl font-semibold px-6 bg-background/40"
          >
            <Link to="/manager-dashboard/analytics">
              <LineChart className="h-5 w-5 text-muted-foreground group-hover:text-foreground" /> View Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* ── KPI Stats cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Events",
            value: stats.total,
            icon: Calendar,
            gradient: "from-blue-500/20 to-blue-500/5 hover:border-blue-500/40 hover:shadow-blue-500/20",
            iconBg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            glowBg: "bg-blue-500/20",
            lineBg: "bg-blue-500",
            subtitle: "All time events",
          },
          {
            label: "Pending Approvals",
            value: stats.pending,
            icon: Clock,
            gradient: "from-orange-500/20 to-orange-500/5 hover:border-orange-500/40 hover:shadow-orange-500/20",
            iconBg: "bg-orange-500/20 text-orange-400 border-orange-500/30",
            glowBg: "bg-orange-500/20",
            lineBg: "bg-orange-500",
            subtitle: "Awaiting review",
          },
          {
            label: "Total Registrations",
            value: stats.registrations,
            icon: Users,
            gradient: "from-emerald-500/20 to-emerald-500/5 hover:border-emerald-500/40 hover:shadow-emerald-500/20",
            iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            glowBg: "bg-emerald-500/20",
            lineBg: "bg-emerald-500",
            subtitle: "Across all events",
          },
          {
            label: "Approval Rate",
            value: `${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%`,
            icon: TrendingUp,
            gradient: "from-pink-500/20 to-pink-500/5 hover:border-pink-500/40 hover:shadow-pink-500/20",
            iconBg: "bg-pink-500/20 text-pink-400 border-pink-500/30",
            glowBg: "bg-pink-500/20",
            lineBg: "bg-pink-500",
            subtitle: "Historical rate",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={cn(
                "group relative flex flex-col rounded-3xl border border-border/40 p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl bg-gradient-to-br overflow-hidden",
                card.gradient
              )}
            >
              <div
                className={cn(
                  "absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[50px] opacity-30 transition-opacity duration-500 group-hover:opacity-60",
                  card.glowBg
                )}
              />
              <div className="flex items-start justify-between relative z-10">
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-muted-foreground tracking-wide mb-1.5 uppercase">
                    {card.label}
                  </p>
                  <p className="text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
                    {typeof card.value === "number" && card.value < 10 && card.value > 0
                      ? `0${card.value}`
                      : card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl border shadow-inner transition-transform duration-500 group-hover:scale-110",
                    card.iconBg
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-5 w-full bg-secondary/50 rounded-full h-1 overflow-hidden relative z-10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 w-0 group-hover:w-full",
                    card.lineBg
                  )}
                />
              </div>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground/80 mt-3 relative z-10 font-medium">
                  {card.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recent Activity + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Latest updates from your club events.
              </p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Link to="/manager-dashboard/activity">View All Activity →</Link>
            </Button>
          </div>
          <div className="space-y-4">
            {events.slice(0, 4).map((e) => (
              <ManagerRecentActivityRow key={e.id} event={e} />
            ))}
            {events.length === 0 && (
              <div className="rounded-3xl border border-border/40 p-8 text-center text-sm text-muted-foreground bg-gradient-card">
                No events yet. Create one to get started.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Management shortcuts</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 flex-1">
            <Link
              to="/manager-dashboard/create"
              className="group flex items-center justify-between p-5 rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 to-transparent shadow-soft backdrop-blur-xl hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 flex-1"
            >
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <CalendarPlus className="h-7 w-7" />
                </div>
                <span className="font-extrabold text-lg text-foreground group-hover:text-primary transition-colors tracking-tight">
                  Create New Event
                </span>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1.5 transition-all" />
            </Link>

            <Link
              to="/manager-dashboard/registrations"
              className="group flex items-center justify-between p-5 rounded-3xl border border-border/40 bg-gradient-card shadow-soft backdrop-blur-xl hover:shadow-2xl hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300 flex-1"
            >
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <span className="font-extrabold text-lg text-foreground group-hover:text-blue-500 transition-colors tracking-tight">
                  View Registrations
                </span>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground/50 group-hover:text-blue-500 group-hover:translate-x-1.5 transition-all" />
            </Link>

            <Link
              to="/manager-dashboard/my-events"
              className="group flex items-center justify-between p-5 rounded-3xl border border-border/40 bg-gradient-card shadow-soft backdrop-blur-xl hover:shadow-2xl hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-300 flex-1"
            >
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <CalendarClock className="h-7 w-7" />
                </div>
                <span className="font-extrabold text-lg text-foreground group-hover:text-emerald-500 transition-colors tracking-tight">
                  Manage My Events
                </span>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground/50 group-hover:text-emerald-500 group-hover:translate-x-1.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Upcoming Schedule ── */}
      <UpcomingScheduleSection />

      {/* ── Recent Club Events ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Recent Club Events</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              The most recent events created for your club.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <Link to="/manager-dashboard/club-events">View all events</Link>
          </Button>
        </div>
        <ManagerEventsGrid events={events.slice(0, 3)} showActions={false} simplified={true} hideCoordinator={true} />
      </div>
    </div>
  );
};
