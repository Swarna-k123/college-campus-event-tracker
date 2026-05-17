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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const meta = statusMeta[event.status];
  const eventStart = new Date(event.date);
  const eventEnd = new Date(eventStart.getTime() + EVENT_WINDOW_MINUTES * 60_000);
  const approvedStart = conflict ? new Date(conflict.approvedEvent.date) : null;
  const approvedEnd = approvedStart
    ? new Date(approvedStart.getTime() + EVENT_WINDOW_MINUTES * 60_000)
    : null;
  return (
    <article className="flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-gradient-card shadow-soft backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-glow hover:border-primary/40">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={event.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
        <Badge variant="outline" className={cn("absolute top-3 left-3 backdrop-blur-md", meta.cls)}>
          {meta.label}
        </Badge>
        <Badge variant="outline" className="absolute top-3 right-3 backdrop-blur-md bg-background/60 border-border/60">
          {event.category}
        </Badge>
      </div>
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3 className="font-semibold text-lg leading-snug">{event.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> {event.club}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Manager: {event.managerName}
            {event.managerEmail ? ` (${event.managerEmail})` : ""}
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
          <p className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" />{format(new Date(event.date), "MMM d, p")}</p>
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.venue}</p>
          <p className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{event.category}</p>
          <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Cap {event.maxRegistrations}</p>
          <p className="flex items-center gap-1.5 col-span-2">
            <IndianRupee className="h-3.5 w-3.5" />
            Budget: {formatBudget(event.budget)}
          </p>
        </div>

        {event.status === "rejected" && event.rejectionReason && (
          <div className="text-xs rounded-lg bg-destructive/10 border border-destructive/30 text-destructive p-2 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{event.rejectionReason}</span>
          </div>
        )}

        {event.status === "pending" && conflict && approvedStart && approvedEnd && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1.5">
            <p className="font-semibold">⚠ Potential Venue Conflict Detected</p>
            <p className="text-amber-100">Existing Approved Event:</p>
            <p>Event: {conflict.approvedEvent.title}</p>
            <p>Club: {conflict.approvedEvent.club}</p>
            <p>Venue: {conflict.approvedEvent.venue}</p>
            <p>
              Time: {format(approvedStart, "MMM d, p")} - {format(approvedEnd, "p")}
            </p>
            <p>Status: Approved</p>
            <p className="text-amber-100 pt-1">Pending Event:</p>
            <p>Event: {event.title}</p>
            <p>Club: {event.club}</p>
            <p>Venue: {event.venue}</p>
            <p>
              Time: {format(eventStart, "MMM d, p")} - {format(eventEnd, "p")}
            </p>
          </div>
        )}

        {event.status === "pending" && onApprove && onReject && (
          <div className="flex items-center gap-2 pt-2 mt-auto">
            <Button
              size="sm"
              type="button"
              onClick={() => onReject(event)}
              disabled={!canReview}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => onApprove(event.id)}
              disabled={!canReview}
              className="flex-1 bg-emerald-600 hover:bg-emerald-600/90 text-white border-0"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
          </div>
        )}
        {event.status === "pending" && !canReview && (
          <p className="text-xs text-muted-foreground pt-2 mt-auto">Handled by another admin</p>
        )}
      </div>
    </article>
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

  return (
    <div className="space-y-10">
      <header className="relative rounded-3xl overflow-hidden border border-border/40 bg-gradient-card shadow-soft backdrop-blur-xl px-6 md:px-10 py-8 md:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/40 font-medium mb-4">
            <ShieldCheck className="h-4 w-4" /> Administrator
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary/80 bg-clip-text text-transparent">
            Welcome back, {user?.name ?? "Admin"} 🛡️
          </h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            Review and manage all campus events and ensure quality control.
          </p>
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

          <TabsContent value={tab} className="mt-0">
            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary/60 text-muted-foreground mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="font-medium">All caught up</p>
                <p className="text-sm text-muted-foreground mt-1">There are no events in this bucket.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {list.map((e) => (
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
