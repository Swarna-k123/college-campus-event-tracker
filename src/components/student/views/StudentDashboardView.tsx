import { useAuth } from "@/context/AuthContext";
import {
  CalendarCheck,
  CalendarClock,
  Flame,
  Sparkles,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { StatCard } from "@/components/DashboardCard";
import { useStudentEvents } from "@/components/student/StudentEventsContext";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ProfilePhotoUploader } from "@/components/ui/ProfilePhotoUploader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/** Fetch count of certificates the student has earned (attended + event has certificate enabled). */
async function loadCertificatesEarned(studentId: string): Promise<number> {
  const { data, error } = await supabase
    .from("attendance")
    .select("event_id, events!inner(certificate_template_url)")
    .eq("student_id", studentId)
    .eq("status", "PRESENT")
    .not("events.certificate_template_url", "is", null);

  if (error) return 0;
  return (data ?? []).length;
}

export const StudentDashboardView = () => {
  const { user } = useAuth();
  const {
    isLoading,
    error,
    recommended,
    trending,
    upcoming,
    myRegisteredEvents,
    showRecommended,
    openRegisterDialog,
    openDetailsDialog,
  } = useStudentEvents();

  const { data: certificatesEarned = 0 } = useQuery({
    queryKey: ["certificates-earned", user?.id],
    enabled: !!user?.id,
    queryFn: () => loadCertificatesEarned(user!.id),
  });

  return (
    <div className="space-y-8">
      {/* ── Hero welcome banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent shadow-soft p-6 md:p-8">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-8 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Profile photo */}
          <div className="shrink-0">
            <ProfilePhotoUploader
              userId={user?.id ?? ""}
              currentUrl={null}
              userName={user?.name ?? ""}
              size="lg"
              readOnly
            />
          </div>

          {/* Welcome text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{getGreeting()},</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {user?.name ?? "Student"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Explore amazing events, grow your skills, and make the most of your campus journey.
            </p>
          </div>

          {/* Quick CTA */}
          <div className="shrink-0 hidden md:block">
            <Button asChild className="bg-gradient-primary border-0 text-primary-foreground shadow-glow gap-2">
              <Link to="/student-dashboard/events">
                Browse Events <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {/* ── Stats row — 5 KPI cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Upcoming Events"
          value={upcoming.length}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <StatCard
          label="My Registrations"
          value={myRegisteredEvents.length}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Trending Now"
          value={trending.length}
          icon={<Flame className="h-5 w-5" />}
        />
        {showRecommended ? (
          <StatCard
            label="Recommended"
            value={recommended.length}
            icon={<Sparkles className="h-5 w-5" />}
          />
        ) : (
          <StatCard
            label="Available Events"
            value={upcoming.length}
            icon={<Sparkles className="h-5 w-5" />}
          />
        )}
        <StatCard
          label="Certificates Earned"
          value={certificatesEarned}
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      {/* ── Upcoming Events ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Upcoming Events
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Events happening soon on campus.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 gap-1">
            <Link to="/student-dashboard/events">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
          </div>
        ) : upcoming.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 3).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegisterClick={() => openRegisterDialog(event)}
                onDetailsClick={() => openDetailsDialog(event)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 py-10 text-center">
            <p className="text-sm text-muted-foreground">No upcoming events at the moment.</p>
          </div>
        )}
      </section>

      {/* ── Recommended / Trending Events ── */}
      {showRecommended && recommended.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Recommended for You
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Picked based on your interests and activity.
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 3).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegisterClick={() => openRegisterDialog(event)}
                onDetailsClick={() => openDetailsDialog(event)}
              />
            ))}
          </div>
        </section>
      ) : trending.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Flame className="h-5 w-5 text-accent" /> Trending Events
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Most popular across campus right now.
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trending.slice(0, 3).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegisterClick={() => openRegisterDialog(event)}
                onDetailsClick={() => openDetailsDialog(event)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
