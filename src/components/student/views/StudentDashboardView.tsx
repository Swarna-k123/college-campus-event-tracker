import { useAuth } from "@/context/AuthContext";
import { CalendarCheck, CalendarClock, Flame, Sparkles } from "lucide-react";
import { DashboardCard, StatCard } from "@/components/DashboardCard";
import { useStudentEvents } from "@/components/student/StudentEventsContext";
import { EventCard } from "@/components/EventCard";
import { Loader2 } from "lucide-react";

export const StudentDashboardView = () => {
  const { user } = useAuth();
  const { isLoading, error, recommended, trending, upcoming, showRecommended, openRegisterDialog } = useStudentEvents();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{user?.name ?? "Student"} 👋</h1>
        <p className="text-muted-foreground">
          Discover campus events and keep up with your registrations from one place.
        </p>
      </header>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recommended Events" value={showRecommended ? recommended.length : 0} icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="Trending Events" value={trending.length} icon={<Flame className="h-5 w-5" />} />
        <StatCard label="Upcoming Events" value={upcoming.length} icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="Registration Summary" value="Live" icon={<CalendarCheck className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DashboardCard title="Recommended Events" subtitle="Events matched to your interests and history.">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading recommendations…
            </div>
          ) : showRecommended && recommended.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {recommended.map((event) => (
                <EventCard key={event.id} event={event} onRegisterClick={() => openRegisterDialog(event)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Register for a few events to see personalized recommendations here.</p>
          )}
        </DashboardCard>

        <DashboardCard title="Recent Notifications" subtitle="Stay updated with campus activity.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">New event registrations are now visible in your dashboard.</div>
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">Trending events are updated in real time based on campus activity.</div>
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">Your upcoming registrations remain easy to review from the sidebar.</div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
