import { StudentEventFilters, StudentEventSection, useStudentEvents } from "@/components/student/StudentEventsContext";
import { CalendarClock, Flame, Sparkles } from "lucide-react";
import { Loader2 } from "lucide-react";

export const StudentEventsView = () => {
  const { isLoading, error, filtered, recommended, trending, upcoming, showRecommended, openRegisterDialog, openDetailsDialog } = useStudentEvents();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">Browse all approved campus events and register directly from here.</p>
      </header>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <StudentEventFilters />

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <p className="font-medium">No events match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {showRecommended ? (
            <StudentEventSection
              title="Recommended for You"
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              description="Picked from clubs and categories you've engaged with."
              events={recommended}
              onRegister={openRegisterDialog}
              onDetails={openDetailsDialog}
            />
          ) : (
            <StudentEventSection
              title="Trending Events"
              icon={<Flame className="h-5 w-5 text-accent" />}
              description="What everyone on campus is signing up for."
              events={trending}
              onRegister={openRegisterDialog}
              onDetails={openDetailsDialog}
            />
          )}

          {showRecommended && (
            <StudentEventSection
              title="Trending Events"
              icon={<Flame className="h-5 w-5 text-accent" />}
              description="Most registrations across campus right now."
              events={trending}
              onRegister={openRegisterDialog}
              onDetails={openDetailsDialog}
            />
          )}

          <StudentEventSection
            title="Upcoming Events"
            icon={<CalendarClock className="h-5 w-5 text-primary" />}
            description="Sorted by the soonest start time."
            events={upcoming}
            onRegister={openRegisterDialog}
            onDetails={openDetailsDialog}
          />
        </div>
      )}
    </div>
  );
};
