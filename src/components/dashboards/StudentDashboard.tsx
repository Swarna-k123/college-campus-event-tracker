import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Flame, Search, Sparkles, CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/data/events";
import type { ManagerEvent } from "@/data/managerEvents";
import { useEvents } from "@/context/EventsContext";
import { EventCard } from "@/components/EventCard";
import type { DateRange } from "react-day-picker";

type DateFilter = "all" | "today" | "week" | "custom";
const CATEGORIES: EventCategory[] = ["Technical", "Cultural", "Sports", "Others"];

// Mock: pretend the user previously registered for these event ids. Empty = new user.
const PAST_REGISTRATIONS: string[] = ["m1", "o1"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const within7Days = (d: Date) => {
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + 7);
  return d >= now && d <= end;
};

const Section = ({
  title,
  icon,
  description,
  events,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  events: ManagerEvent[];
}) => (
  <section>
    <div className="flex items-end justify-between mb-4 gap-4">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          {icon} {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    {events.length === 0 ? (
      <EmptyState />
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    )}
  </section>
);

const EmptyState = () => (
  <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary/60 text-muted-foreground mb-3">
      <CalendarClock className="h-6 w-6" />
    </div>
    <p className="font-medium">No events available</p>
    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or check back soon.</p>
  </div>
);

export const StudentDashboard = () => {
  const { events: ALL_EVENTS } = useEvents();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [range, setRange] = useState<DateRange | undefined>();
  const [categories, setCategories] = useState<Set<EventCategory>>(new Set());

  const toggleCategory = (c: EventCategory) => {
    setCategories((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_EVENTS.filter((e) => e.status === "approved")
      .filter((e) =>
        q ? e.title.toLowerCase().includes(q) || e.club.toLowerCase().includes(q) : true
      )
      .filter((e) => (categories.size ? categories.has(e.category) : true))
      .filter((e) => {
        const d = new Date(e.date);
        if (dateFilter === "today") return sameDay(d, new Date());
        if (dateFilter === "week") return within7Days(d);
        if (dateFilter === "custom" && range?.from) {
          const to = range.to ?? range.from;
          return d >= range.from && d <= new Date(to.getTime() + 86400000 - 1);
        }
        return true;
      });
  }, [search, dateFilter, range, categories, ALL_EVENTS]);

  const hasHistory = PAST_REGISTRATIONS.length > 0;

  const recommended = useMemo(() => {
    if (!hasHistory) return [];
    const pastCats = new Set(
      ALL_EVENTS.filter((e) => PAST_REGISTRATIONS.includes(e.id)).map((e) => e.category)
    );
    return filtered
      .filter((e) => pastCats.has(e.category) && !PAST_REGISTRATIONS.includes(e.id))
      .slice(0, 4);
  }, [filtered, hasHistory, ALL_EVENTS]);

  const trending = useMemo(
    () => [...filtered].sort((a, b) => b.registrants.length - a.registrants.length).slice(0, 4),
    [filtered]
  );

  const upcoming = useMemo(
    () => [...filtered].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [filtered]
  );

  const showRecommended = hasHistory && recommended.length > 0;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Aarav Sharma 👋</h1>
        <p className="text-muted-foreground mt-1">
          Discover what's happening on campus and register in one tap.
        </p>
      </header>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 md:p-5 shadow-soft backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events or clubs..."
              className="pl-9 bg-secondary/60 border-border/60 h-11"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "today", "week"] as DateFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={cn(
                  "px-4 h-11 rounded-xl text-sm border transition-colors",
                  dateFilter === f
                    ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground"
                )}
              >
                {f === "all" ? "All dates" : f === "today" ? "Today" : "This week"}
              </button>
            ))}

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setDateFilter("custom")}
                  className={cn(
                    "h-11 rounded-xl gap-2 border-border/60",
                    dateFilter === "custom" &&
                      "bg-gradient-primary text-primary-foreground border-transparent shadow-glow hover:opacity-90"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {range?.from
                    ? range.to
                      ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`
                      : format(range.from, "MMM d")
                    : "Custom range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={(r) => {
                    setRange(r);
                    setDateFilter("custom");
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {(dateFilter !== "all" || range) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDateFilter("all");
                  setRange(undefined);
                }}
                aria-label="Clear date filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = categories.has(c);
            return (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border transition-colors",
                  active
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground"
                )}
              >
                {c}
              </button>
            );
          })}
          {categories.size > 0 && (
            <button
              onClick={() => setCategories(new Set())}
              className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {showRecommended ? (
            <Section
              title="Recommended for You"
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              description="Picked from clubs and categories you've engaged with."
              events={recommended}
            />
          ) : (
            <Section
              title="Trending Events"
              icon={<Flame className="h-5 w-5 text-accent" />}
              description="What everyone on campus is signing up for."
              events={trending}
            />
          )}

          {showRecommended && (
            <Section
              title="Trending Events"
              icon={<Flame className="h-5 w-5 text-accent" />}
              description="Most registrations across campus right now."
              events={trending}
            />
          )}

          <Section
            title="Upcoming Events"
            icon={<CalendarClock className="h-5 w-5 text-primary" />}
            description="Sorted by the soonest start time."
            events={upcoming}
          />
        </>
      )}
    </div>
  );
};