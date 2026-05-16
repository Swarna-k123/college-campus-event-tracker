import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, CalendarCheck, Flame, Loader2, Search, Sparkles, CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/data/events";
import type { ManagerEvent } from "@/data/managerEvents";
import { registrationCount } from "@/data/managerEvents";
import { EventCard } from "@/components/EventCard";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage, type EventRow } from "@/lib/db";
import { mapEventRowToManagerEvent } from "@/lib/eventMap";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type DateFilter = "all" | "today" | "week" | "custom";
type StudentEventCategory = EventCategory | "Hackathons" | "Workshops";
const CATEGORIES: StudentEventCategory[] = [
  "Technical",
  "Cultural",
  "Sports",
  "Hackathons",
  "Workshops",
];

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
  onRegister,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  events: ManagerEvent[];
  onRegister: (e: ManagerEvent) => void;
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
          <EventCard key={e.id} event={e} onRegisterClick={() => onRegister(e)} />
        ))}
      </div>
    )}
  </section>
);

const RegisteredEventsEmptyState = () => (
  <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary/60 text-muted-foreground mb-3">
      <CalendarCheck className="h-6 w-6" />
    </div>
    <p className="font-medium">You haven&apos;t registered for any events yet.</p>
  </div>
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

type RegistrationWithEvent = {
  event_id: string;
  events: (EventRow & { clubs: { name: string } | null }) | null;
};

async function loadMyRegisteredEvents(studentId: string): Promise<ManagerEvent[]> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id, events ( *, clubs ( name ) )")
    .eq("student_id", studentId)
    .order("registered_at", { ascending: true });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!data?.length) return [];

  const events: ManagerEvent[] = [];
  for (const row of data as RegistrationWithEvent[]) {
    const ev = row.events;
    if (!ev || ev.status !== "approved") continue;
    events.push(mapEventRowToManagerEvent(ev, ev.clubs?.name ?? "Club"));
  }

  return events.sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

async function loadApprovedEventsWithCounts(): Promise<ManagerEvent[]> {
  const { data: rows, error } = await supabase
    .from("events")
    .select("*, clubs ( name )")
    .eq("status", "approved")
    .order("starts_at", { ascending: true });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const { data: regs, error: regErr } = await supabase
    .from("event_registrations")
    .select("event_id")
    .in("event_id", ids);

  if (regErr) throw new Error(getSupabaseErrorMessage(regErr));

  const countMap = new Map<string, number>();
  (regs as { event_id: string }[] | null)?.forEach((r) => {
    countMap.set(r.event_id, (countMap.get(r.event_id) ?? 0) + 1);
  });

  return rows.map((r) => {
    const row = r as EventRow & { clubs: { name: string } | null };
    const clubName = row.clubs?.name ?? "Club";
    return mapEventRowToManagerEvent(row, clubName, {
      registrationCount: countMap.get(row.id) ?? 0,
    });
  });
}

export const StudentDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [range, setRange] = useState<DateRange | undefined>();
  const [categories, setCategories] = useState<Set<StudentEventCategory>>(new Set());

  const [registerTarget, setRegisterTarget] = useState<ManagerEvent | null>(null);
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("1");
  const [registering, setRegistering] = useState(false);
  const [myRegistrationsOpen, setMyRegistrationsOpen] = useState(false);

  const {
    data: allApproved = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["student-approved-events"],
    queryFn: loadApprovedEventsWithCounts,
  });

  useEffect(() => {
    const channel = supabase
      .channel("student-events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["student-approved-events"] });
        if (user?.id) {
          void queryClient.invalidateQueries({ queryKey: ["my-registered-events", user.id] });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("student-registrations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_registrations",
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["my-registered-events", user.id] });
          void queryClient.invalidateQueries({ queryKey: ["my-registration-ids", user.id] });
          void queryClient.invalidateQueries({ queryKey: ["my-registration-categories"] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const {
    data: myRegisteredEvents = [],
    isLoading: isLoadingMyRegistered,
    error: myRegisteredError,
  } = useQuery({
    queryKey: ["my-registered-events", user?.id],
    enabled: !!user?.id,
    queryFn: () => loadMyRegisteredEvents(user!.id),
  });

  const { data: myRegistrationEventIds = [] } = useQuery({
    queryKey: ["my-registration-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("student_id", user!.id);
      if (e) throw new Error(getSupabaseErrorMessage(e));
      return (data as { event_id: string }[]).map((x) => x.event_id);
    },
  });

  const { data: categoriesRegisteredList = [] } = useQuery({
    queryKey: ["my-registration-categories", user?.id, [...myRegistrationEventIds].sort().join(",")],
    enabled: !!user?.id && myRegistrationEventIds.length > 0,
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("events")
        .select("id, category")
        .in("id", myRegistrationEventIds);
      if (e) throw new Error(getSupabaseErrorMessage(e));
      const seen = new Set<StudentEventCategory>();
      (data as { category: StudentEventCategory }[] | null)?.forEach((row) => seen.add(row.category));
      return Array.from(seen);
    },
  });

  const categoriesRegistered = useMemo(
    () => new Set(categoriesRegisteredList),
    [categoriesRegisteredList]
  );

  const toggleCategory = (c: StudentEventCategory) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allApproved
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
  }, [search, dateFilter, range, categories, allApproved]);

  const hasHistory = myRegistrationEventIds.length > 0;

  const recommended = useMemo(() => {
    if (!hasHistory || categoriesRegistered.size === 0) return [];
    return filtered
      .filter((e) => categoriesRegistered.has(e.category) && !myRegistrationEventIds.includes(e.id))
      .slice(0, 4);
  }, [filtered, hasHistory, categoriesRegistered, myRegistrationEventIds]);

  const trending = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => registrationCount(b) - registrationCount(a))
        .slice(0, 4),
    [filtered]
  );

  const upcoming = useMemo(
    () =>
      filtered
        .filter((e) => +new Date(e.date) >= Date.now())
        .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [filtered]
  );

  const showRecommended = hasHistory && recommended.length > 0;

  const openRegisterDialog = (event: ManagerEvent) => {
    const alreadyRegistered = myRegistrationEventIds.includes(event.id);
    if (alreadyRegistered) {
      toast.error("You have already registered for this event.");
      return;
    }

    const isFull = registrationCount(event) >= event.maxRegistrations;
    if (isFull) {
      toast.error("This event is full.");
      return;
    }

    setRegisterTarget(event);
  };

  const submitRegister = async () => {
    if (!registerTarget || !user) return;
    const sem = parseInt(semester, 10);
    if (!phone.trim()) return toast.error("Phone is required");
    if (!branch.trim()) return toast.error("Branch is required");
    if (!sem || sem < 1 || sem > 12) return toast.error("Semester must be 1–12");
    if (myRegistrationEventIds.includes(registerTarget.id)) {
      toast.error("You have already registered for this event.");
      return;
    }
    if (registrationCount(registerTarget) >= registerTarget.maxRegistrations) {
      toast.error("This event is full.");
      return;
    }

    setRegistering(true);
    const { error: rpcError } = await supabase.rpc("register_for_event", {
      p_event_id: registerTarget.id,
      p_phone: phone.trim(),
      p_branch: branch.trim(),
      p_semester: sem,
    });
    setRegistering(false);

    if (rpcError) {
      toast.error(getSupabaseErrorMessage(rpcError));
      return;
    }

    toast.success("You're registered!");

    queryClient.setQueryData<ManagerEvent[]>(["student-approved-events"], (prev = []) =>
      prev.map((event) =>
        event.id === registerTarget.id
          ? { ...event, registrationCount: registrationCount(event) + 1 }
          : event
      )
    );
    queryClient.setQueryData<string[]>(["my-registration-ids", user.id], (prev = []) =>
      prev.includes(registerTarget.id) ? prev : [...prev, registerTarget.id]
    );
    queryClient.setQueryData<ManagerEvent[]>(["my-registered-events", user.id], (prev = []) => {
      if (prev.some((e) => e.id === registerTarget.id)) return prev;
      return [...prev, registerTarget].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    });
    queryClient.setQueryData<EventCategory[]>(
      ["my-registration-categories", user.id, [...myRegistrationEventIds].sort().join(",")],
      (prev = []) => {
        const category = registerTarget.category;
        return prev.includes(category) ? prev : [...prev, category];
      }
    );

    setRegisterTarget(null);
    setPhone("");
    setBranch("");
    setSemester("1");
    void queryClient.invalidateQueries({ queryKey: ["student-approved-events"] });
    void queryClient.invalidateQueries({ queryKey: ["my-registration-ids"] });
    void queryClient.invalidateQueries({ queryKey: ["my-registration-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["my-registered-events", user.id] });
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{user?.name ?? "Student"} 👋</h1>
          <p className="text-muted-foreground mt-1">
            Discover what&apos;s happening on campus and register in one tap.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMyRegistrationsOpen(true)}
          className="h-11 shrink-0 rounded-xl gap-2 border-border/60 bg-secondary/60 hover:bg-secondary"
        >
          <CalendarCheck className="h-4 w-4 text-primary" />
          My Registrations
          {myRegisteredEvents.length > 0 && (
            <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary/20 px-1.5 text-xs font-medium text-primary">
              {myRegisteredEvents.length}
            </span>
          )}
        </Button>
      </header>

      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}

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
                type="button"
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
                  type="button"
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
                type="button"
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
                type="button"
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
              type="button"
              onClick={() => setCategories(new Set())}
              className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {showRecommended ? (
            <Section
              title="Recommended for You"
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              description="Picked from clubs and categories you've engaged with."
              events={recommended}
              onRegister={openRegisterDialog}
            />
          ) : (
            <Section
              title="Trending Events"
              icon={<Flame className="h-5 w-5 text-accent" />}
              description="What everyone on campus is signing up for."
              events={trending}
              onRegister={openRegisterDialog}
            />
          )}

          {showRecommended && (
            <Section
              title="Trending Events"
              icon={<Flame className="h-5 w-5 text-accent" />}
              description="Most registrations across campus right now."
              events={trending}
              onRegister={openRegisterDialog}
            />
          )}

          <Section
            title="Upcoming Events"
            icon={<CalendarClock className="h-5 w-5 text-primary" />}
            description="Sorted by the soonest start time."
            events={upcoming}
            onRegister={openRegisterDialog}
          />
        </>
      )}

      <Sheet open={myRegistrationsOpen} onOpenChange={setMyRegistrationsOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-border/60 bg-gradient-card sm:max-w-xl md:max-w-3xl lg:max-w-4xl"
        >
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              My Registrations
            </SheetTitle>
            <SheetDescription>Events you&apos;ve signed up for.</SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {myRegisteredError && (
              <p className="text-sm text-destructive mb-4">{(myRegisteredError as Error).message}</p>
            )}
            {isLoadingMyRegistered ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading your events…
              </div>
            ) : myRegisteredEvents.length === 0 ? (
              <RegisteredEventsEmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myRegisteredEvents.map((e) => (
                  <EventCard key={e.id} event={e} isRegistered />
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setMyRegistrationsOpen(false)}
            className="mt-8 w-full rounded-xl border-border/60"
          >
            Back to dashboard
          </Button>
        </SheetContent>
      </Sheet>

      <Dialog open={!!registerTarget} onOpenChange={(o) => !o && setRegisterTarget(null)}>
        <DialogContent className="bg-gradient-card border-border/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register</DialogTitle>
            <DialogDescription>
              {registerTarget?.title} — enter your details to complete registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 ..."
                className="bg-secondary/60 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Computer Science"
                className="bg-secondary/60 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester (1–12)</Label>
              <Input
                id="semester"
                type="number"
                min={1}
                max={12}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="bg-secondary/60 border-border/60"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setRegisterTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitRegister} disabled={registering} className="gap-2">
              {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
