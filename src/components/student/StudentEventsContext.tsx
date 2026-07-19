import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarCheck, CalendarClock, Flame, Loader2, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TeamRegistrationDialog } from "@/components/student/TeamRegistrationDialog";
import { registerTeamForEvent } from "@/lib/registrations";
import { isTeamEvent, type TeamRegistrationDetails } from "@/data/teamRegistration";
import { DashboardCard, StatCard } from "@/components/DashboardCard";
import { CalendarIcon, Search, X } from "lucide-react";
import { EventDetailsDialog } from "@/components/student/EventDetailsDialog";

export type DateFilter = "all" | "today" | "week" | "custom";
export type StudentEventCategory = EventCategory | "Hackathons" | "Workshops";

export const CATEGORIES: StudentEventCategory[] = [
  "Technical",
  "Cultural",
  "Sports",
  "Hackathons",
  "Workshops",
];

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const within7Days = (d: Date) => {
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + 7);
  return d >= now && d <= end;
};

export const StudentEventSection = ({
  title,
  icon,
  description,
  events,
  onRegister,
  onDetails,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  events: ManagerEvent[];
  onRegister: (e: ManagerEvent) => void;
  onDetails?: (e: ManagerEvent) => void;
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
          <EventCard key={e.id} event={e} onRegisterClick={() => onRegister(e)} onDetailsClick={onDetails ? () => onDetails(e) : undefined} />
        ))}
      </div>
    )}
  </section>
);

export const RegisteredEventsEmptyState = () => (
  <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary/60 text-muted-foreground mb-3">
      <CalendarCheck className="h-6 w-6" />
    </div>
    <p className="font-medium">You haven&apos;t registered for any events yet.</p>
  </div>
);

export const EmptyState = () => (
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

export async function loadMyRegisteredEvents(studentId: string): Promise<ManagerEvent[]> {
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

export async function loadApprovedEventsWithCounts(): Promise<ManagerEvent[]> {
  const { data: rows, error } = await supabase
    .from("events")
    .select("*, clubs ( name, club_logo_url )")
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
    const row = r as EventRow & { clubs: { name: string; club_logo_url?: string | null } | null };
    const clubName = row.clubs?.name ?? "Club";
    const clubLogoUrl = row.clubs?.club_logo_url ?? null;
    return mapEventRowToManagerEvent(row, clubName, {
      registrationCount: countMap.get(row.id) ?? 0,
      clubLogoUrl,
    });
  });
}

type StudentEventsContextValue = {
  allApproved: ManagerEvent[];
  isLoading: boolean;
  error: Error | null;
  myRegisteredEvents: ManagerEvent[];
  myRegistrationEventIds: string[];
  filtered: ManagerEvent[];
  recommended: ManagerEvent[];
  trending: ManagerEvent[];
  upcoming: ManagerEvent[];
  showRecommended: boolean;
  openRegisterDialog: (event: ManagerEvent) => void;
  openDetailsDialog: (event: ManagerEvent) => void;
  search: string;
  setSearch: (v: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  range: DateRange | undefined;
  setRange: (v: DateRange | undefined) => void;
  categories: Set<StudentEventCategory>;
  toggleCategory: (c: StudentEventCategory) => void;
  clearCategories: () => void;
};

const StudentEventsContext = createContext<StudentEventsContextValue | null>(null);

export const useStudentEvents = () => {
  const ctx = useContext(StudentEventsContext);
  if (!ctx) throw new Error("useStudentEvents must be used within StudentEventsProvider");
  return ctx;
};

export const StudentEventsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [range, setRange] = useState<DateRange | undefined>();
  const [categories, setCategories] = useState<Set<StudentEventCategory>>(new Set());
  const [registerTarget, setRegisterTarget] = useState<ManagerEvent | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<ManagerEvent | null>(null);
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("1");
  const [registering, setRegistering] = useState(false);

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

  const { data: myRegisteredEvents = [] } = useQuery({
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

  const clearCategories = () => setCategories(new Set());

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();
    return allApproved
      .filter((e) => {
        const endTime = e.endsAt ? +new Date(e.endsAt) : +new Date(e.date);
        return endTime > now;
      })
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

  const openRegisterDialog = async (event: ManagerEvent) => {
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

    const now = Date.now();
    const endTime = event.endsAt ? +new Date(event.endsAt) : +new Date(event.date);
    const isRegistrationClosed = 
      (event.registrationClosesAt && +new Date(event.registrationClosesAt) < now) ||
      (endTime < now);

    if (isRegistrationClosed) {
      toast.error("Registration for this event is closed.");
      return;
    }

    setRegisterTarget(event);
  };

  const applyRegistrationSuccess = (event: ManagerEvent) => {
    if (!user) return;
    queryClient.setQueryData<ManagerEvent[]>(["student-approved-events"], (prev = []) =>
      prev.map((e) =>
        e.id === event.id ? { ...e, registrationCount: registrationCount(e) + 1 } : e
      )
    );
    queryClient.setQueryData<string[]>(["my-registration-ids", user.id], (prev = []) =>
      prev.includes(event.id) ? prev : [...prev, event.id]
    );
    queryClient.setQueryData<ManagerEvent[]>(["my-registered-events", user.id], (prev = []) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev, event].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    });
    queryClient.setQueryData<EventCategory[]>(
      ["my-registration-categories", user.id, [...myRegistrationEventIds].sort().join(",")],
      (prev = []) => {
        const category = event.category;
        return prev.includes(category) ? prev : [...prev, category];
      }
    );
    void queryClient.invalidateQueries({ queryKey: ["student-approved-events"] });
    void queryClient.invalidateQueries({ queryKey: ["my-registration-ids"] });
    void queryClient.invalidateQueries({ queryKey: ["my-registration-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["my-registered-events", user.id] });
  };

  const submitTeamRegister = async (teamDetails: TeamRegistrationDetails) => {
    if (!registerTarget || !user) return;
    if (myRegistrationEventIds.includes(registerTarget.id)) {
      toast.error("You have already registered for this event.");
      return;
    }
    if (registrationCount(registerTarget) >= registerTarget.maxRegistrations) {
      toast.error("This event is full.");
      return;
    }

    setRegistering(true);
    try {
      await registerTeamForEvent({
        eventId: registerTarget.id,
        studentId: user.id,
        phone: teamDetails.leader.phone,
        branch: teamDetails.leader.branch,
        semester: teamDetails.leader.semester,
        teamDetails,
      });
      toast.success("Your team is registered!");
      applyRegistrationSuccess(registerTarget);
      setRegisterTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const submitRegister = async () => {
    if (!registerTarget || !user) return;
    const sem = parseInt(semester, 10);
    if (!phone.trim()) return toast.error("Phone is required");
    if (!branch.trim()) return toast.error("Branch is required");
    if (!sem || sem < 1 || sem > 8) return toast.error("Semester must be 1–8");
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
    applyRegistrationSuccess(registerTarget);
    setRegisterTarget(null);
    setPhone("");
    setBranch("");
    setSemester("1");
  };

  const openDetailsDialog = (event: ManagerEvent) => {
    setDetailsEvent(event);
  };

  const value: StudentEventsContextValue = {
    allApproved,
    isLoading,
    error: error as Error | null,
    myRegisteredEvents,
    myRegistrationEventIds,
    filtered,
    recommended,
    trending,
    upcoming,
    showRecommended,
    openRegisterDialog,
    openDetailsDialog,
    search,
    setSearch,
    dateFilter,
    setDateFilter,
    range,
    setRange,
    categories,
    toggleCategory,
    clearCategories,
  };

  return (
    <StudentEventsContext.Provider value={value}>
      {children}

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={detailsEvent}
        open={!!detailsEvent}
        onOpenChange={(o) => !o && setDetailsEvent(null)}
        isRegistered={detailsEvent ? myRegistrationEventIds.includes(detailsEvent.id) : false}
        onRegisterClick={() => {
          if (detailsEvent) {
            setDetailsEvent(null);
            openRegisterDialog(detailsEvent);
          }
        }}
      />

      <TeamRegistrationDialog
        event={registerTarget && isTeamEvent(registerTarget.eventType) ? registerTarget : null}
        open={!!registerTarget && isTeamEvent(registerTarget.eventType)}
        onOpenChange={(o) => !o && setRegisterTarget(null)}
        defaultLeaderName={user?.name}
        defaultLeaderEmail={user?.email}
        onSubmit={submitTeamRegister}
        submitting={registering}
      />

      <Dialog
        open={!!registerTarget && !isTeamEvent(registerTarget.eventType)}
        onOpenChange={(o) => !o && setRegisterTarget(null)}
      >
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
              <Label htmlFor="semester">Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger id="semester" className="bg-secondary/60 border-border/60">
                  <SelectValue placeholder="Select semester (1–8)" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </StudentEventsContext.Provider>
  );
};

export const StudentEventFilters = () => {
  const {
    search,
    setSearch,
    dateFilter,
    setDateFilter,
    range,
    setRange,
    categories,
    toggleCategory,
    clearCategories,
  } = useStudentEvents();

  return (
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
            onClick={clearCategories}
            className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export const MyRegistrationsList = () => {
  const { user } = useAuth();
  const { myRegisteredEvents } = useStudentEvents();

  const { isLoading: isLoadingMyRegistered, error: myRegisteredError } = useQuery({
    queryKey: ["my-registered-events", user?.id],
    enabled: !!user?.id,
    queryFn: () => loadMyRegisteredEvents(user!.id),
  });

  if (myRegisteredError) {
    return <p className="text-sm text-destructive">{(myRegisteredError as Error).message}</p>;
  }

  if (isLoadingMyRegistered) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your events…
      </div>
    );
  }

  if (myRegisteredEvents.length === 0) {
    return <RegisteredEventsEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {myRegisteredEvents.map((e) => (
        <EventCard key={e.id} event={e} isRegistered showCertificateButton />
      ))}
    </div>
  );
};

export const StudentRegistrationSummary = () => {
  const { myRegisteredEvents } = useStudentEvents();
  return (
    <StatCard
      label="My Registrations"
      value={myRegisteredEvents.length}
      icon={<CalendarCheck className="h-5 w-5" />}
    />
  );
};

export const StudentTrendingSummary = () => {
  const { trending } = useStudentEvents();
  return (
    <StatCard
      label="Trending Events"
      value={trending.length}
      icon={<Flame className="h-5 w-5" />}
    />
  );
};

export const StudentUpcomingSummary = () => {
  const { upcoming } = useStudentEvents();
  return (
    <StatCard
      label="Upcoming Events"
      value={upcoming.length}
      icon={<CalendarClock className="h-5 w-5" />}
    />
  );
};

export const StudentRecommendedSummary = () => {
  const { recommended, showRecommended } = useStudentEvents();
  if (!showRecommended) return null;
  return (
    <StatCard
      label="Recommended"
      value={recommended.length}
      icon={<Sparkles className="h-5 w-5" />}
    />
  );
};
