import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar as CalIcon,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
  Building2,
  Tag,
  Loader2,
  IndianRupee,
  Activity,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/DashboardCard";
import type { ManagerEvent } from "@/data/managerEvents";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage, type EventRow } from "@/lib/db";
import { mapEventRowToManagerEvent } from "@/lib/eventMap";

type AdminEvent = ManagerEvent & {
  managerName: string;
  managerEmail: string;
  clubId: string;
};

type ConflictInfo = {
  approvedEvent: AdminEvent;
};

const EVENT_WINDOW_MINUTES = 180;

const getAcademicYearStart = () => {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 6, 1);
};

type ClubGroup = {
  clubId: string;
  clubName: string;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    budgetUsed: number;
  };
  events: AdminEvent[];
};

const formatBudget = (amount: number | null | undefined) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusMeta = {
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  rejected: { label: "Rejected", cls: "bg-destructive/20 text-destructive border-destructive/50" },
} as const;

const EventReviewCard = ({
  event,
  onApprove,
  onReject,
  conflict,
  canReview,
}: {
  event: AdminEvent;
  onApprove?: (id: string) => void;
  onReject?: (e: AdminEvent) => void;
  conflict?: ConflictInfo;
  canReview: boolean;
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = statusMeta[event.status];
  const eventStart = new Date(event.date);
  const eventEnd = new Date(eventStart.getTime() + EVENT_WINDOW_MINUTES * 60_000);
  const approvedStart = conflict ? new Date(conflict.approvedEvent.date) : null;
  const approvedEnd = approvedStart
    ? new Date(approvedStart.getTime() + EVENT_WINDOW_MINUTES * 60_000)
    : null;
  return (
    <>
      <article className="group flex flex-col rounded-2xl overflow-hidden border border-border/40 bg-background/40 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow hover:border-primary/40 relative">
        <div className="relative aspect-[16/9] overflow-hidden">
          <img src={event.poster} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent transition-opacity duration-300 group-hover:opacity-80" />
          <Badge variant="outline" className={cn("absolute top-3 left-3 backdrop-blur-md shadow-sm border-0", meta.cls)}>
            {meta.label}
          </Badge>
        </div>
        <div className="flex flex-col flex-1 p-5 gap-3">
          <div>
            <h3 className="font-semibold text-lg leading-snug truncate group-hover:text-primary transition-colors">{event.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> {event.club}
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{event.description}</p>
          
          <div className="pt-3 mt-auto">
            <Button 
              variant="secondary" 
              className="w-full bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300 group-hover:shadow-md"
              onClick={() => setDetailsOpen(true)}
            >
              View Details
            </Button>
          </div>
        </div>
      </article>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-card border-border/60 p-0 overflow-hidden shadow-2xl backdrop-blur-3xl">
          <div className="relative h-48 sm:h-64 w-full">
            <img src={event.poster} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <Badge variant="outline" className={cn("absolute top-4 left-4 backdrop-blur-md text-sm py-1 px-3 border-0", meta.cls)}>
              {meta.label}
            </Badge>
          </div>
          
          <div className="p-6 pt-0 space-y-6 max-h-[60vh] overflow-y-auto">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" /> {event.club}
                <span className="text-muted-foreground ml-2">|</span>
                <span className="text-muted-foreground ml-2">Manager: {event.managerName}</span>
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.description}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm bg-secondary/20 p-4 rounded-xl border border-border/40">
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2"><CalIcon className="h-4 w-4" /> Date & Time</p>
                <p className="font-medium">{format(eventStart, "MMM d, yyyy")}</p>
                <p className="text-muted-foreground text-xs">{format(eventStart, "p")} - {format(eventEnd, "p")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Venue</p>
                <p className="font-medium">{event.venue}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4" /> Category</p>
                <p className="font-medium">{event.category}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Budget</p>
                <p className="font-medium">{formatBudget(event.budget)}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Capacity</p>
                <p className="font-medium">{event.maxRegistrations} attendees</p>
              </div>
            </div>

            {event.status === "rejected" && event.rejectionReason && (
              <div className="text-sm rounded-lg bg-destructive/10 border border-destructive/30 text-destructive p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{event.rejectionReason}</span>
              </div>
            )}

            {event.status === "pending" && conflict && approvedStart && approvedEnd && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 space-y-2">
                <p className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4"/> Venue Conflict Detected</p>
                <div className="bg-background/40 p-3 rounded-lg border border-border/30">
                  <p className="text-amber-100/70 text-xs mb-1">Conflicts with Approved Event:</p>
                  <p className="font-medium">{conflict.approvedEvent.title} ({conflict.approvedEvent.club})</p>
                  <p className="text-xs text-amber-100/80 mt-1">
                    {format(approvedStart, "MMM d, p")} - {format(approvedEnd, "p")}
                  </p>
                </div>
              </div>
            )}

            {event.status === "pending" && onApprove && onReject && (
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => { setDetailsOpen(false); onReject(event); }}
                  disabled={!canReview}
                  variant="outline"
                  className="flex-1 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground border-destructive/20 transition-all"
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject Event
                </Button>
                <Button
                  type="button"
                  onClick={() => { setDetailsOpen(false); onApprove(event.id); }}
                  disabled={!canReview}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0 transition-all shadow-[0_0_20px_rgba(5,150,105,0.3)] hover:shadow-[0_0_25px_rgba(5,150,105,0.5)]"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Event
                </Button>
              </div>
            )}
            {event.status === "pending" && !canReview && (
              <p className="text-sm text-center text-muted-foreground pt-2">This event was handled by another admin.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

async function loadAllEventsForAdmin(): Promise<AdminEvent[]> {
  const { data: rows, error } = await supabase
    .from("events")
    .select("*, clubs ( name )")
    .order("created_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const managerIds = Array.from(new Set(rows.map((r) => r.created_by as string).filter(Boolean)));

  const { data: managerRows, error: managersError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", managerIds);

  if (managersError) throw new Error(getSupabaseErrorMessage(managersError));

  const managerMap = new Map<string, { name: string; email: string }>();
  (managerRows as { id: string; full_name: string; email: string }[] | null)?.forEach((row) => {
    managerMap.set(row.id, { name: row.full_name, email: row.email });
  });

  const { data: regs } = await supabase.from("event_registrations").select("event_id").in("event_id", ids);

  const countMap = new Map<string, number>();
  (regs as { event_id: string }[] | null)?.forEach((r) => {
    countMap.set(r.event_id, (countMap.get(r.event_id) ?? 0) + 1);
  });

  return rows.map((r) => {
    const row = r as EventRow & { clubs: { name: string } | null };
    const clubName = row.clubs?.name ?? "Club";
    const manager = managerMap.get(row.created_by);
    return {
      ...mapEventRowToManagerEvent(row, clubName, {
        registrationCount: countMap.get(row.id) ?? 0,
      }),
      managerName: manager?.name ?? "Unknown manager",
      managerEmail: manager?.email ?? "",
      clubId: row.club_id,
    } as AdminEvent;
  });
}

export const AdminDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<AdminEvent | null>(null);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: events = [] as AdminEvent[],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-all-events"],
    queryFn: loadAllEventsForAdmin,
  });

  const buckets = useMemo(
    () => ({
      pending: events.filter((e) => e.status === "pending"),
      approved: events.filter((e) => e.status === "approved"),
      rejected: events.filter((e) => e.status === "rejected"),
      all: events,
    }),
    [events]
  );

  const pendingConflictMap = useMemo(() => {
    const approvedEvents = buckets.approved;
    const overlaps = (a: AdminEvent, b: AdminEvent) => {
      const aStart = new Date(a.date).getTime();
      const aEnd = aStart + EVENT_WINDOW_MINUTES * 60_000;
      const bStart = new Date(b.date).getTime();
      const bEnd = bStart + EVENT_WINDOW_MINUTES * 60_000;
      return aStart < bEnd && bStart < aEnd;
    };

    const map = new Map<string, ConflictInfo>();
    for (const pending of buckets.pending) {
      const conflict = approvedEvents.find(
        (approved) =>
          approved.venue.trim().toLowerCase() === pending.venue.trim().toLowerCase() &&
          overlaps(approved, pending)
      );
      if (conflict) {
        map.set(pending.id, { approvedEvent: conflict });
      }
    }
    return map;
  }, [buckets.approved, buckets.pending]);

  const handleApprove = async (id: string) => {
    if (!user?.id) return;
    const target = events.find((e) => e.id === id);
    if (!target) return;
    const { error: upErr } = await supabase
      .from("events")
      .update({
        status: "approved",
        rejection_reason: null,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (upErr) {
      toast.error(getSupabaseErrorMessage(upErr));
      return;
    }
    toast.success("Event approved — now visible to students");
    await queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
    await queryClient.invalidateQueries({ queryKey: ["student-approved-events"] });
  };

  const submitReject = async () => {
    if (!rejectTarget || !user?.id) return;
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Please provide a reason (min 5 characters)");
      return;
    }
    const { error: upErr } = await supabase
      .from("events")
      .update({
        status: "rejected",
        rejection_reason: reason.trim(),
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", rejectTarget.id);

    if (upErr) {
      toast.error(getSupabaseErrorMessage(upErr));
      return;
    }
    toast.success("Event rejected — manager has been notified");
    setRejectTarget(null);
    setReason("");
    await queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
  };

  const list = buckets[tab];

  const groupedList = useMemo(() => {
    const groups = new Map<string, ClubGroup>();
    const acYearStart = getAcademicYearStart();
    
    events.forEach(e => {
      if (!groups.has(e.clubId)) {
        groups.set(e.clubId, {
          clubId: e.clubId,
          clubName: e.club,
          stats: { total: 0, pending: 0, approved: 0, rejected: 0, budgetUsed: 0 },
          events: []
        });
      }
      const group = groups.get(e.clubId)!;
      group.stats.total++;
      if (e.status === "pending") group.stats.pending++;
      if (e.status === "approved") {
        group.stats.approved++;
        const eventDate = new Date(e.date);
        if (eventDate >= acYearStart && e.budget) {
          group.stats.budgetUsed += e.budget;
        }
      }
      if (e.status === "rejected") group.stats.rejected++;
    });

    const normalizedQuery = searchQuery.toLowerCase().trim();

    list.forEach(e => {
      const matchesSearch = !normalizedQuery || 
        e.title.toLowerCase().includes(normalizedQuery) || 
        e.club.toLowerCase().includes(normalizedQuery);

      if (matchesSearch) {
        const group = groups.get(e.clubId);
        if (group) {
          group.events.push(e);
        }
      }
    });

    return Array.from(groups.values())
      .filter(g => g.events.length > 0)
      .sort((a, b) => a.clubName.localeCompare(b.clubName));
  }, [events, list, searchQuery]);

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-border/60 bg-gradient-card px-6 py-6 md:px-8 md:py-7 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
              <ShieldCheck className="h-3.5 w-3.5" /> Administrator
            </div>
            <p className="text-xl md:text-2xl font-semibold tracking-tight mt-3">
              Welcome back, {user?.name ?? "Admin"}
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-4">CampusHub</h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">Administration Dashboard</p>
          </div>
          <div className="w-full md:w-80 mt-2 md:mt-0 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none blur-md" />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-20" />
            <Input
              placeholder="Search clubs or events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 bg-background/60 border-border/60 hover:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/50 transition-all rounded-xl backdrop-blur-md shadow-sm h-11 text-sm relative z-10"
            />
          </div>
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Review" value={buckets.pending.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Approved" value={buckets.approved.length} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Rejected" value={buckets.rejected.length} icon={<XCircle className="h-5 w-5" />} />
        <StatCard label="Total Events" value={events.length} icon={<Building2 className="h-5 w-5" />} />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading events…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
          <TabsList className="bg-secondary/60 border border-border/60 h-11 p-1 rounded-xl flex flex-wrap">
            <TabsTrigger value="pending" className="rounded-lg gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              Pending {buckets.pending.length > 0 && (
                <span className="text-xs px-1.5 rounded-full bg-amber-500/30 text-amber-100">{buckets.pending.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Rejected</TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-0 space-y-12">
            {groupedList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary/60 text-muted-foreground mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="font-medium">All caught up</p>
                <p className="text-sm text-muted-foreground mt-1">There are no events in this bucket.</p>
              </div>
            ) : (
              groupedList.map((group) => (
                <section key={group.clubId} className="space-y-6">
                  {/* Club Summary Card */}
                  <div className="bg-gradient-card border border-border/60 rounded-2xl p-6 shadow-soft backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">{group.clubName}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Activity className="h-3.5 w-3.5" /> 
                          Overview & Statistics
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="flex flex-col bg-background/50 rounded-xl p-4 border border-border/40">
                        <span className="text-xs text-muted-foreground font-medium mb-1">Total Events</span>
                        <span className="text-2xl font-semibold">{group.stats.total}</span>
                      </div>
                      <div className="flex flex-col bg-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                        <span className="text-xs text-amber-500/80 font-medium mb-1">Pending</span>
                        <span className="text-2xl font-semibold text-amber-500">{group.stats.pending}</span>
                      </div>
                      <div className="flex flex-col bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                        <span className="text-xs text-emerald-500/80 font-medium mb-1">Approved</span>
                        <span className="text-2xl font-semibold text-emerald-500">{group.stats.approved}</span>
                      </div>
                      <div className="flex flex-col bg-destructive/5 rounded-xl p-4 border border-destructive/20">
                        <span className="text-xs text-destructive/80 font-medium mb-1">Rejected</span>
                        <span className="text-2xl font-semibold text-destructive">{group.stats.rejected}</span>
                      </div>
                      <div className="flex flex-col bg-primary/5 rounded-xl p-4 border border-primary/20 md:col-span-1 col-span-2">
                        <span className="text-xs text-primary/80 font-medium mb-1">Yearly Budget Used</span>
                        <span className="text-xl sm:text-2xl font-semibold text-primary">
                          {formatBudget(group.stats.budgetUsed)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Club Events Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {group.events.map((e) => (
                      <EventReviewCard
                        key={e.id}
                        event={e}
                        onApprove={handleApprove}
                        onReject={setRejectTarget}
                        conflict={pendingConflictMap.get(e.id)}
                        canReview
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setReason(""); } }}>
        <DialogContent className="bg-gradient-card border-border/60">
          <DialogHeader>
            <DialogTitle>Reject &quot;{rejectTarget?.title}&quot;?</DialogTitle>
            <DialogDescription>
              Give the club manager a clear reason. They&apos;ll see this on their dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Venue conflict — please reschedule."
              rows={4}
              maxLength={500}
              className="bg-secondary/60 border-border/60 resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => { setRejectTarget(null); setReason(""); }}>Cancel</Button>
            <Button type="button" onClick={() => void submitReject()} className="bg-destructive hover:bg-destructive/90">
              Reject Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
