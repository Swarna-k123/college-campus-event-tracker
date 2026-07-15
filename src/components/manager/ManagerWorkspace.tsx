import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Pencil,
  Trash2,
  Users,
  Calendar as CalIcon,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { DashboardCard } from "@/components/DashboardCard";
import { CreateEventForm, type CreateEventSubmitPayload } from "@/components/manager/CreateEventForm";
import { EditEventForm, type EditEventSubmitPayload } from "@/components/manager/EditEventForm";
import { RegistrationsDialog } from "@/components/manager/RegistrationsDialog";
import { type ManagerEvent, type ManagerStatus, registrationCount } from "@/data/managerEvents";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage, type EventRow } from "@/lib/db";
import { mapEventRowToManagerEvent } from "@/lib/eventMap";
import { uploadEventPoster } from "@/lib/uploadPoster";
import { uploadCertificateTemplate } from "@/lib/uploadCertificate";
import { fetchEventRegistrantsForManager } from "@/lib/registrations";

export type ManagerDashboardEvent = ManagerEvent & {
  reviewerName?: string;
  reviewerEmail?: string;
  createdBy?: string;
};

type ManagerClubMembership = {
  clubId: string;
  role: string;
  joinedAt?: string | null;
};

export const statusMeta: Record<ManagerStatus, { label: string; cls: string; icon: React.ReactNode }> = {
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

export async function loadManagerClubMembership(userId: string): Promise<ManagerClubMembership | null> {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!data) return null;

  return {
    clubId: data.club_id,
    role: data.role,
    joinedAt: data.joined_at ?? null,
  };
}

export async function loadManagerEvents(clubId: string): Promise<ManagerDashboardEvent[]> {
  const { data: rows, error } = await supabase
    .from("events")
    .select("*, clubs ( name )")
    .eq("club_id", clubId)
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
      createdBy: row.created_by,
    } as ManagerDashboardEvent;
  });
}

type ClubMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt?: string | null;
};

type ManagerWorkspaceContextValue = {
  events: ManagerDashboardEvent[];
  myEvents: ManagerDashboardEvent[];
  managerClubId: string | null;
  members: ClubMember[];
  isLoading: boolean;
  error: Error | null;
  managerClubName: string | undefined;
  stats: { total: number; approved: number; pending: number; registrations: number };
  viewing: ManagerDashboardEvent | null;
  setViewing: (e: ManagerDashboardEvent | null) => void;
  setEditing: (e: ManagerDashboardEvent | null) => void;
  setDeleting: (e: ManagerDashboardEvent | null) => void;
  handleCreate: (payload: CreateEventSubmitPayload) => Promise<void>;
};

const ManagerWorkspaceContext = createContext<ManagerWorkspaceContextValue | null>(null);

export const useManagerWorkspace = () => {
  const ctx = useContext(ManagerWorkspaceContext);
  if (!ctx) throw new Error("useManagerWorkspace must be used within ManagerWorkspaceProvider");
  return ctx;
};

export const ManagerWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<ManagerDashboardEvent | null>(null);
  const [deleting, setDeleting] = useState<ManagerDashboardEvent | null>(null);
  const [editing, setEditing] = useState<ManagerDashboardEvent | null>(null);

  const {
    data: membership,
    isLoading: membershipLoading,
    error: membershipError,
  } = useQuery({
    queryKey: ["manager-club-membership", user?.id],
    enabled: !!user?.id,
    queryFn: () => loadManagerClubMembership(user!.id),
  });

  const managerClubId = membership?.clubId ?? null;

  const {
    data: events = [] as ManagerDashboardEvent[],
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ["manager-events", managerClubId],
    enabled: !!managerClubId,
    queryFn: () => loadManagerEvents(managerClubId!),
  });

  const { data: viewingRegs = [], isLoading: viewingRegsLoading } = useQuery({
    queryKey: ["manager-event-regs", viewing?.id],
    enabled: !!viewing,
    queryFn: () => fetchEventRegistrantsForManager(viewing!.id),
  });

  const { data: managerClubName } = useQuery({
    queryKey: ["manager-club-name", managerClubId],
    enabled: !!managerClubId,
    queryFn: async () => {
      const { data, error: clubErr } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", managerClubId!)
        .maybeSingle();
      if (clubErr) throw new Error(getSupabaseErrorMessage(clubErr));
      return data?.name ?? "Club";
    },
  });

  const { data: members = [] as ClubMember[] } = useQuery({
    queryKey: ["manager-club-members", managerClubId],
    enabled: !!managerClubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select("*, profiles ( full_name, email )")
        .eq("club_id", managerClubId)
        .order("joined_at", { ascending: true });
      if (error) throw new Error(getSupabaseErrorMessage(error));
      return (data as { id: string; role: string; joined_at?: string | null; profiles: { full_name: string; email: string } | null }[] | null)?.map((row) => ({
        id: row.id,
        name: row.profiles?.full_name ?? "Unknown",
        email: row.profiles?.email ?? "",
        role: row.role,
        joinedAt: row.joined_at ?? null,
      })) ?? [];
    },
  });

  const myEvents = useMemo(
    () => events.filter((e) => e.createdBy === user?.id),
    [events, user?.id]
  );

  const isLoading = membershipLoading || eventsLoading;
  const error = membershipError ?? (user?.id && !membershipLoading && !managerClubId ? new Error("Your account is not assigned to a club. Contact an administrator.") : (eventsError || null));

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
    const clubId = managerClubId ?? user?.clubId;
    if (!user?.id || !clubId) {
      throw new Error("Your profile has no club assigned. Contact an administrator.");
    }
    const posterUrl = await uploadEventPoster(payload.posterFile, user.id);
    let certUrl: string | null = null;
    let certName: string | null = null;
    if (payload.certificatesEnabled && payload.certificateFile) {
      const cert = await uploadCertificateTemplate(payload.certificateFile, user.id);
      certUrl = cert.publicUrl;
      certName = cert.path;
    }

    const { error: insErr } = await supabase.from("events").insert({
      title: payload.title,
      description: payload.description,
      poster_url: posterUrl,
      starts_at: payload.startsAt.toISOString(),
      venue: payload.venue,
      category: payload.category,
      max_registrations: payload.maxRegistrations,
      budget: payload.budget,
      event_type: payload.eventType,
      min_team_size: payload.eventType === "team" ? payload.minTeamSize : null,
      max_team_size: payload.eventType === "team" ? payload.maxTeamSize : null,
      certificates_enabled: payload.certificatesEnabled ?? false,
      certificate_template_url: certUrl,
      certificate_template_name: certName,
      certificate_name_x: payload.certificatesEnabled ? (payload.certificateNameX ?? null) : null,
      certificate_name_y: payload.certificatesEnabled ? (payload.certificateNameY ?? null) : null,
      status: "pending",
      club_id: clubId,
      created_by: user.id,
    });
    if (insErr) throw new Error(getSupabaseErrorMessage(insErr));
    toast.success("Event submitted for approval");
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
    let certUrl = (editing as any).certificateTemplateUrl ?? null;
    let certName = (editing as any).certificateTemplateName ?? null;
    let certNameX = (editing as any).certificateNameX ?? null;
    let certNameY = (editing as any).certificateNameY ?? null;
    if (payload.certificatesEnabled === false) {
      certUrl = null;
      certName = null;
      certNameX = null;
      certNameY = null;
    } else if (payload.certificateFile) {
      const cert = await uploadCertificateTemplate(payload.certificateFile, user.id);
      certUrl = cert.publicUrl;
      certName = cert.path;
      certNameX = payload.certificateNameX ?? null;
      certNameY = payload.certificateNameY ?? null;
    } else {
      // No new file uploaded — use payload coords if provided, else keep existing
      if (payload.certificateNameX !== undefined) certNameX = payload.certificateNameX ?? null;
      if (payload.certificateNameY !== undefined) certNameY = payload.certificateNameY ?? null;
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
        budget: payload.budget,
        event_type: payload.eventType,
        max_team_size: payload.eventType === "team" ? payload.maxTeamSize : null,
        certificates_enabled: payload.certificatesEnabled ?? ((editing as any).certificatesEnabled ?? false),
        certificate_template_url: certUrl,
        certificate_template_name: certName,
        certificate_name_x: certNameX,
        certificate_name_y: certNameY,
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

  const value: ManagerWorkspaceContextValue = {
    events,
    myEvents,
    managerClubId,
    members,
    isLoading,
    error: error as Error | null,
    managerClubName,
    stats,
    viewing,
    setViewing,
    setEditing,
    setDeleting,
    handleCreate,
  };

  return (
    <ManagerWorkspaceContext.Provider value={value}>
      {children}

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
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ManagerWorkspaceContext.Provider>
  );
};

type ManagerEventCardProps = {
  event: ManagerDashboardEvent;
  showActions?: boolean;
};

export const ManagerEventCard = ({ event, showActions = true }: ManagerEventCardProps) => {
  const { setViewing, setEditing, setDeleting } = useManagerWorkspace();
  const meta = statusMeta[event.status];
  const count = registrationCount(event);
  const pct = Math.min(100, Math.round((count / event.maxRegistrations) * 100));

  return (
    <article className="flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-gradient-card shadow-soft backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-glow hover:border-primary/40">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={event.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
        <Badge variant="outline" className={cn("absolute top-3 left-3 gap-1 backdrop-blur-md", meta.cls)}>
          {meta.icon}{meta.label}
        </Badge>
      </div>
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3 className="font-semibold leading-snug line-clamp-1">{event.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" />{format(new Date(event.date), "MMM d, p")}</p>
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.venue}</p>
        </div>

        {event.status === "rejected" && event.rejectionReason && (
          <div className="text-xs rounded-lg bg-destructive/10 border border-destructive/30 text-destructive p-2 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="space-y-1">
              {event.reviewerName && <p>Rejected by: {event.reviewerName}</p>}
              {event.reviewerEmail && <p>Email: {event.reviewerEmail}</p>}
              <p>Reason: {event.rejectionReason}</p>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Registrations</span>
            <span className="font-medium">{count}/{event.maxRegistrations}</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 mt-auto">
          <Button size="sm" variant="outline" className="flex-1 border-border/60" type="button" onClick={() => setViewing(event)}>
            <Users className="h-4 w-4 mr-1" /> View
          </Button>
          {showActions && (
            <>
              <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(event)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" type="button" onClick={() => setDeleting(event)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export const ManagerEventsGrid = ({ events, showActions = true }: { events: ManagerDashboardEvent[]; showActions?: boolean }) => {
  if (events.length === 0) {
    return (
      <DashboardCard>
        <div className="py-12 text-center text-sm text-muted-foreground">
          No events to display.
        </div>
      </DashboardCard>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {events.map((e) => (
        <ManagerEventCard key={e.id} event={e} showActions={showActions} />
      ))}
    </div>
  );
};

export const ManagerCreateEventSection = () => {
  const { handleCreate } = useManagerWorkspace();
  return (
    <DashboardCard title="Create New Event" subtitle="Submit an event for admin approval.">
      <CreateEventForm onCreate={handleCreate} />
    </DashboardCard>
  );
};

export const ManagerLoadingState = () => (
  <div className="flex items-center gap-2 text-muted-foreground py-12">
    <Loader2 className="h-5 w-5 animate-spin" /> Loading your events…
  </div>
);

export const ManagerRecentActivityRow = ({ event }: { event: ManagerDashboardEvent }) => {
  const { setViewing } = useManagerWorkspace();
  const meta = statusMeta[event.status];
  const count = registrationCount(event);
  const pct = Math.round((count / event.maxRegistrations) * 100);

  return (
    <div className="py-4 flex items-center gap-4">
      <img src={event.poster} alt="" className="h-12 w-12 rounded-xl object-cover border border-border/60" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{event.title}</p>
          <Badge variant="outline" className={cn("gap-1", meta.cls)}>
            {meta.icon}{meta.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(new Date(event.date), "MMM d, p")} · {count}/{event.maxRegistrations} registered
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setViewing(event)} className="hidden sm:inline-flex">
        <Eye className="h-4 w-4 mr-1" /> Registrations
      </Button>
    </div>
  );
};
