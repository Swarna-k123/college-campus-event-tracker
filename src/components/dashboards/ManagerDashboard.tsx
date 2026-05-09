import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Megaphone,
  Pencil,
  Trash2,
  Users,
  Calendar as CalIcon,
  MapPin,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardCard, StatCard } from "@/components/DashboardCard";
import { CreateEventForm, type CreateEventSubmitPayload } from "@/components/manager/CreateEventForm";
import { EditEventForm, type EditEventSubmitPayload } from "@/components/manager/EditEventForm";
import { RegistrationsDialog } from "@/components/manager/RegistrationsDialog";
import { type ManagerEvent, type ManagerStatus, registrationCount } from "@/data/managerEvents";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage, type EventRow } from "@/lib/db";
import { mapEventRowToManagerEvent } from "@/lib/eventMap";
import { uploadEventPoster } from "@/lib/uploadPoster";
import { fetchEventRegistrantsForManager } from "@/lib/registrations";

type ManagerDashboardEvent = ManagerEvent & {
  reviewerName?: string;
  reviewerEmail?: string;
};

const statusMeta: Record<ManagerStatus, { label: string; cls: string; icon: React.ReactNode }> = {
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

async function loadManagerEvents(userId: string): Promise<ManagerDashboardEvent[]> {
  const { data: rows, error } = await supabase
    .from("events")
    .select("*, clubs ( name )")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const reviewerIds = Array.from(
    new Set(
      rows
        .map((r) => (r.approved_by as string | null) ?? null)
        .filter((id): id is string => !!id)
    )
  );

  const { data: reviewerRows, error: reviewerErr } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", reviewerIds)
    : { data: [], error: null };

  if (reviewerErr) throw new Error(getSupabaseErrorMessage(reviewerErr));

  const reviewerMap = new Map<string, { name: string; email: string }>();
  (reviewerRows as { id: string; full_name: string; email: string }[] | null)?.forEach((r) => {
    reviewerMap.set(r.id, { name: r.full_name, email: r.email });
  });

  const { data: regs } = await supabase.from("event_registrations").select("event_id").in("event_id", ids);

  const countMap = new Map<string, number>();
  (regs as { event_id: string }[] | null)?.forEach((r) => {
    countMap.set(r.event_id, (countMap.get(r.event_id) ?? 0) + 1);
  });

  return rows.map((r) => {
    const row = r as EventRow & { clubs: { name: string } | null; approved_by?: string | null };
    const clubName = row.clubs?.name ?? "Club";
    const reviewer = row.approved_by ? reviewerMap.get(row.approved_by) : undefined;
    return {
      ...mapEventRowToManagerEvent(row, clubName, {
        registrationCount: countMap.get(row.id) ?? 0,
      }),
      reviewerName: reviewer?.name,
      reviewerEmail: reviewer?.email,
    } as ManagerDashboardEvent;
  });
}

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "create" | "events">("overview");
  const [viewing, setViewing] = useState<ManagerDashboardEvent | null>(null);
  const [deleting, setDeleting] = useState<ManagerDashboardEvent | null>(null);
  const [editing, setEditing] = useState<ManagerDashboardEvent | null>(null);

  const {
    data: events = [] as ManagerDashboardEvent[],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["manager-events", user?.id],
    enabled: !!user?.id,
    queryFn: () => loadManagerEvents(user!.id),
  });

  const { data: viewingRegs = [], isLoading: viewingRegsLoading } = useQuery({
    queryKey: ["manager-event-regs", viewing?.id],
    enabled: !!viewing,
    queryFn: () => fetchEventRegistrantsForManager(viewing!.id),
  });

  const stats = useMemo(() => {
    const totalRegs = events.reduce((s, e) => s + registrationCount(e), 0);
    return {
      total: events.length,
      approved: events.filter((e) => e.status === "approved").length,
      pending: events.filter((e) => e.status === "pending").length,
      registrations: totalRegs,
    };
  }, [events]);

  const handleCreate = async (payload: CreateEventSubmitPayload) => {
    if (!user?.id || !user.clubId) {
      throw new Error("Your profile has no club assigned. Contact an administrator.");
    }
    const posterUrl = await uploadEventPoster(payload.posterFile, user.id);
    const { error: insErr } = await supabase.from("events").insert({
      title: payload.title,
      description: payload.description,
      poster_url: posterUrl,
      starts_at: payload.startsAt.toISOString(),
      venue: payload.venue,
      category: payload.category,
      max_registrations: payload.maxRegistrations,
      status: "pending",
      club_id: user.clubId,
      created_by: user.id,
    });
    if (insErr) throw new Error(getSupabaseErrorMessage(insErr));
    toast.success("Event submitted for approval");
    setTab("events");
    await queryClient.invalidateQueries({ queryKey: ["manager-events"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
    await queryClient.invalidateQueries({ queryKey: ["student-approved-events"] });
  };

  const handleEditSave = async (payload: EditEventSubmitPayload) => {
    if (!editing || !user?.id) return;
    let posterUrl = editing.poster;
    if (payload.posterFile) {
      posterUrl = await uploadEventPoster(payload.posterFile, user.id);
    }
    const { error: upErr } = await supabase
      .from("events")
      .update({
        title: payload.title,
        description: payload.description,
        poster_url: posterUrl,
        starts_at: payload.startsAt.toISOString(),
        venue: payload.venue,
        category: payload.category,
        max_registrations: payload.maxRegistrations,
      })
      .eq("id", editing.id)
      .eq("created_by", user.id);

    if (upErr) throw new Error(getSupabaseErrorMessage(upErr));
    toast.success("Event updated");
    setEditing(null);
    await queryClient.invalidateQueries({ queryKey: ["manager-events"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
    await queryClient.invalidateQueries({ queryKey: ["student-approved-events"] });
  };

  const confirmDelete = async () => {
    if (!deleting || !user?.id) return;
    const { error: delErr } = await supabase.from("events").delete().eq("id", deleting.id).eq("created_by", user.id);
    if (delErr) {
      toast.error(getSupabaseErrorMessage(delErr));
      return;
    }
    toast.success(`Deleted "${deleting.title}"`);
    if (viewing?.id === deleting.id) setViewing(null);
    setDeleting(null);
    await queryClient.invalidateQueries({ queryKey: ["manager-events"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
    await queryClient.invalidateQueries({ queryKey: ["student-approved-events"] });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex-1 rounded-2xl border border-border/60 bg-gradient-card px-6 py-6 md:px-8 md:py-7 shadow-soft backdrop-blur-xl">
          <p className="text-xl md:text-2xl font-semibold tracking-tight">
            Welcome back, {user?.name ?? "Club Manager"}
          </p>
          {user?.clubName && (
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              Managing: {user.clubName}
            </p>
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-4">CampusHub</h1>
          <p className="text-base md:text-lg text-muted-foreground mt-2">
            Club Management Dashboard
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setTab("create")}
          className="bg-gradient-primary text-primary-foreground border-0 gap-2 shadow-glow"
        >
          <CalendarPlus className="h-4 w-4" /> New Event
        </Button>
      </header>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Events" value={stats.total} icon={<Megaphone className="h-5 w-5" />} />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Registrations" value={stats.registrations} icon={<Users className="h-5 w-5" />} />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your events…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
          <TabsList className="bg-secondary/60 border border-border/60 h-11 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
            <TabsTrigger value="create" className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Create Event</TabsTrigger>
            <TabsTrigger value="events" className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">My Events</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <DashboardCard title="Recent activity" subtitle="Your latest events at a glance">
              <div className="divide-y divide-border/60">
                {events.slice(0, 4).map((e) => {
                  const meta = statusMeta[e.status];
                  const count = registrationCount(e);
                  const pct = Math.round((count / e.maxRegistrations) * 100);
                  return (
                    <div key={e.id} className="py-4 flex items-center gap-4">
                      <img src={e.poster} alt="" className="h-12 w-12 rounded-xl object-cover border border-border/60" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{e.title}</p>
                          <Badge variant="outline" className={cn("gap-1", meta.cls)}>
                            {meta.icon}{meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(e.date), "MMM d, p")} · {count}/{e.maxRegistrations} registered
                        </p>
                        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setViewing(e)} className="hidden sm:inline-flex">
                        <Eye className="h-4 w-4 mr-1" /> Registrations
                      </Button>
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">No events yet. Create one to get started.</p>
                )}
              </div>
            </DashboardCard>
          </TabsContent>

          <TabsContent value="create" className="mt-0">
            <DashboardCard title="Create New Event" subtitle="Submit an event for admin approval.">
              <CreateEventForm onCreate={handleCreate} />
            </DashboardCard>
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            {events.length === 0 ? (
              <DashboardCard>
                <div className="py-12 text-center text-sm text-muted-foreground">
                  You haven&apos;t created any events yet.
                </div>
              </DashboardCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map((e) => {
                  const meta = statusMeta[e.status];
                  const count = registrationCount(e);
                  const pct = Math.min(100, Math.round((count / e.maxRegistrations) * 100));
                  return (
                    <article
                      key={e.id}
                      className="flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-gradient-card shadow-soft backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-glow hover:border-primary/40"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img src={e.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
                        <Badge variant="outline" className={cn("absolute top-3 left-3 gap-1 backdrop-blur-md", meta.cls)}>
                          {meta.icon}{meta.label}
                        </Badge>
                      </div>
                      <div className="flex flex-col flex-1 p-5 gap-3">
                        <div>
                          <h3 className="font-semibold leading-snug line-clamp-1">{e.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" />{format(new Date(e.date), "MMM d, p")}</p>
                          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{e.venue}</p>
                        </div>

                        {e.status === "rejected" && e.rejectionReason && (
                          <div className="text-xs rounded-lg bg-destructive/10 border border-destructive/30 text-destructive p-2 flex gap-2">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              {e.reviewerName && <p>Rejected by: {e.reviewerName}</p>}
                              {e.reviewerEmail && <p>Email: {e.reviewerEmail}</p>}
                              <p>Reason: {e.rejectionReason}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Registrations</span>
                            <span className="font-medium">{count}/{e.maxRegistrations}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 mt-auto">
                          <Button size="sm" variant="outline" className="flex-1 border-border/60" type="button" onClick={() => setViewing(e)}>
                            <Users className="h-4 w-4 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" type="button" onClick={() => setDeleting(e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <RegistrationsDialog
        event={viewing}
        registrants={viewingRegs}
        loading={viewingRegsLoading}
        onClose={() => setViewing(null)}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl bg-gradient-card border-border/60 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditEventForm event={editing} onSave={handleEditSave} onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="bg-gradient-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.title}&quot; will be removed permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
