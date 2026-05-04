import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardCard, StatCard } from "@/components/DashboardCard";
import { CreateEventForm } from "@/components/manager/CreateEventForm";
import { RegistrationsDialog } from "@/components/manager/RegistrationsDialog";
import { type ManagerEvent, type ManagerStatus } from "@/data/managerEvents";
import { useEvents } from "@/context/EventsContext";

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

export const ManagerDashboard = () => {
  const { events: allEvents, myClub, addEvent, removeEvent } = useEvents();
  const events = useMemo(() => allEvents.filter((e) => e.club === myClub), [allEvents, myClub]);
  const [tab, setTab] = useState<"overview" | "create" | "events">("overview");
  const [viewing, setViewing] = useState<ManagerEvent | null>(null);
  const [deleting, setDeleting] = useState<ManagerEvent | null>(null);

  const stats = useMemo(() => {
    const total = events.reduce((s, e) => s + e.registrants.length, 0);
    return {
      total: events.length,
      approved: events.filter((e) => e.status === "approved").length,
      pending: events.filter((e) => e.status === "pending").length,
      registrations: total,
    };
  }, [events]);

  const handleCreate = (event: ManagerEvent) => {
    addEvent(event);
    setTab("events");
  };

  const confirmDelete = () => {
    if (!deleting) return;
    removeEvent(deleting.id);
    toast.success(`Deleted "${deleting.title}"`);
    setDeleting(null);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Tech Club · Manager</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Event Studio</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track registrations for your club's events.
          </p>
        </div>
        <Button
          onClick={() => setTab("create")}
          className="bg-gradient-primary text-primary-foreground border-0 gap-2 shadow-glow"
        >
          <CalendarPlus className="h-4 w-4" /> New Event
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Events" value={stats.total} icon={<Megaphone className="h-5 w-5" />} />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Registrations" value={stats.registrations} icon={<Users className="h-5 w-5" />} />
      </div>

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
                const pct = Math.round((e.registrants.length / e.maxRegistrations) * 100);
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
                        {format(new Date(e.date), "MMM d, p")} · {e.registrants.length}/{e.maxRegistrations} registered
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
                You haven't created any events yet.
              </div>
            </DashboardCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((e) => {
                const meta = statusMeta[e.status];
                const pct = Math.min(100, Math.round((e.registrants.length / e.maxRegistrations) * 100));
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
                          <span>{e.rejectionReason}</span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Registrations</span>
                          <span className="font-medium">{e.registrants.length}/{e.maxRegistrations}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 mt-auto">
                        <Button size="sm" variant="outline" className="flex-1 border-border/60" onClick={() => setViewing(e)}>
                          <Users className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toast("Edit form coming soon")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleting(e)}>
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

      <RegistrationsDialog event={viewing} onClose={() => setViewing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="bg-gradient-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be removed permanently. This cannot be undone.
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