import { useMemo, useState } from "react";
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
import { useEvents } from "@/context/EventsContext";
import type { ManagerEvent } from "@/data/managerEvents";

const statusMeta = {
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  rejected: { label: "Rejected", cls: "bg-destructive/20 text-destructive border-destructive/50" },
} as const;

const EventReviewCard = ({
  event,
  onApprove,
  onReject,
}: {
  event: ManagerEvent;
  onApprove?: (id: string) => void;
  onReject?: (e: ManagerEvent) => void;
}) => {
  const meta = statusMeta[event.status];
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
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
          <p className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" />{format(new Date(event.date), "MMM d, p")}</p>
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.venue}</p>
          <p className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />{event.category}</p>
          <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Cap {event.maxRegistrations}</p>
        </div>

        {event.status === "rejected" && event.rejectionReason && (
          <div className="text-xs rounded-lg bg-destructive/10 border border-destructive/30 text-destructive p-2 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{event.rejectionReason}</span>
          </div>
        )}

        {event.status === "pending" && onApprove && onReject && (
          <div className="flex items-center gap-2 pt-2 mt-auto">
            <Button
              size="sm"
              onClick={() => onReject(event)}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(event.id)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-600/90 text-white border-0"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
          </div>
        )}
      </div>
    </article>
  );
};

export const AdminDashboard = () => {
  const { events, approve, reject } = useEvents();
  const [rejectTarget, setRejectTarget] = useState<ManagerEvent | null>(null);
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const buckets = useMemo(
    () => ({
      pending: events.filter((e) => e.status === "pending"),
      approved: events.filter((e) => e.status === "approved"),
      rejected: events.filter((e) => e.status === "rejected"),
      all: events,
    }),
    [events]
  );

  const handleApprove = (id: string) => {
    approve(id);
    toast.success("Event approved — now visible to students");
  };

  const submitReject = () => {
    if (!rejectTarget) return;
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Please provide a reason (min 5 characters)");
      return;
    }
    reject(rejectTarget.id, reason.trim());
    toast.success("Event rejected — manager has been notified");
    setRejectTarget(null);
    setReason("");
  };

  const list = buckets[tab];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
            <ShieldCheck className="h-3.5 w-3.5" /> Administrator
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">Campus Control Center</h1>
          <p className="text-muted-foreground mt-1">Review and control every event across campus.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Review" value={buckets.pending.length} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Approved" value={buckets.approved.length} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Rejected" value={buckets.rejected.length} icon={<XCircle className="h-5 w-5" />} />
        <StatCard label="Total Events" value={events.length} icon={<Building2 className="h-5 w-5" />} />
      </div>

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
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setReason(""); } }}>
        <DialogContent className="bg-gradient-card border-border/60">
          <DialogHeader>
            <DialogTitle>Reject "{rejectTarget?.title}"?</DialogTitle>
            <DialogDescription>
              Give the club manager a clear reason. They'll see this on their dashboard.
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
            <Button variant="ghost" onClick={() => { setRejectTarget(null); setReason(""); }}>Cancel</Button>
            <Button onClick={submitReject} className="bg-destructive hover:bg-destructive/90">
              Reject Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};