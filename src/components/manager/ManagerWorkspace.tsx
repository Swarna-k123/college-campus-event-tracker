import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
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
import { AttendanceDialog } from "@/components/manager/AttendanceDialog";
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
  creatorName?: string;
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
  const userIds = Array.from(
    new Set(
      rows
        .flatMap((r) => [r.approved_by as string | null, r.created_by as string | null])
        .filter((id): id is string => !!id)
    )
  );

  const { data: profileRows, error: profileErr } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [], error: null };

  if (profileErr) throw new Error(getSupabaseErrorMessage(profileErr));

  const profileMap = new Map<string, { name: string; email: string }>();
  (profileRows as { id: string; full_name: string; email: string }[] | null)?.forEach((r) => {
    profileMap.set(r.id, { name: r.full_name, email: r.email });
  });

  const { data: regs } = await supabase.from("event_registrations").select("event_id").in("event_id", ids);

  const countMap = new Map<string, number>();
  (regs as { event_id: string }[] | null)?.forEach((r) => {
    countMap.set(r.event_id, (countMap.get(r.event_id) ?? 0) + 1);
  });

  return rows.map((r) => {
    const row = r as EventRow & { clubs: { name: string } | null; approved_by?: string | null };
    const clubName = row.clubs?.name ?? "Club";
    const reviewer = row.approved_by ? profileMap.get(row.approved_by) : undefined;
    const creator = row.created_by ? profileMap.get(row.created_by) : undefined;
    return {
      ...mapEventRowToManagerEvent(row, clubName, {
        registrationCount: countMap.get(row.id) ?? 0,
      }),
      reviewerName: reviewer?.name,
      reviewerEmail: reviewer?.email,
      createdBy: row.created_by,
      creatorName: creator?.name,
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
  attendanceEvent: ManagerDashboardEvent | null;
  setAttendanceEvent: (e: ManagerDashboardEvent | null) => void;
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
  const [attendanceEvent, setAttendanceEvent] = useState<ManagerDashboardEvent | null>(null);

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

  const { data: attendanceRegs = [], isLoading: attendanceRegsLoading } = useQuery({
    queryKey: ["manager-event-attendance-regs", attendanceEvent?.id],
    enabled: !!attendanceEvent,
    queryFn: () => fetchEventRegistrantsForManager(attendanceEvent!.id),
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
      ends_at: payload.endsAt.toISOString(),
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
      registration_closes_at: payload.registrationClosesAt ? payload.registrationClosesAt.toISOString() : null,
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
        ends_at: payload.endsAt.toISOString(),
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
        is_paid: payload.isPaid ?? false,
        registration_fee: payload.registrationFee,
        registration_closes_at: payload.registrationClosesAt ? payload.registrationClosesAt.toISOString() : null,
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
    attendanceEvent,
    setAttendanceEvent,
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

      <AttendanceDialog
        event={attendanceEvent}
        registrants={attendanceRegs}
        loading={attendanceRegsLoading}
        onClose={() => setAttendanceEvent(null)}
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
const ManagerEventDetailsDialog = ({ event, open, onOpenChange, showActions, hideCoordinator }: { event: ManagerDashboardEvent, open: boolean, onOpenChange: (o: boolean) => void, showActions: boolean, hideCoordinator?: boolean }) => {
  const { setViewing, setEditing, setDeleting, setAttendanceEvent } = useManagerWorkspace();
  const meta = statusMeta[event.status];
  const count = registrationCount(event);
  const pct = Math.min(100, Math.round((count / event.maxRegistrations) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gradient-card border-border/60 max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0 shadow-2xl">
        <DialogTitle className="sr-only">{event.title} Details</DialogTitle>
        
        {/* Pinned Status Badge */}
        <div className="absolute top-4 left-4 z-50">
          <Badge variant="outline" className={cn("gap-1.5 backdrop-blur-md shadow-lg bg-background/95 px-3 py-1", meta.cls)}>
            {meta.icon}
            <span className="font-semibold uppercase tracking-wider text-[11px]">{meta.label}</span>
          </Badge>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto w-full relative">
          
          {/* Poster Section (No cropping, object-contain) */}
          <div className="w-full bg-black/60 flex items-center justify-center relative border-b border-border/40">
            <img 
              src={event.poster} 
              alt={event.title} 
              className="w-full h-auto max-h-[60vh] object-contain" 
            />
          </div>
          
          {/* Details Section (32px top spacing = pt-8) */}
          <div className="p-6 pt-8 md:p-8 space-y-8">
            
            {/* Title & Club */}
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">{event.title}</h2>
              <p className="text-base font-semibold text-muted-foreground mt-2">{event.club}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4 text-sm font-medium text-foreground bg-secondary/20 p-5 rounded-2xl border border-border/40 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CalIcon className="h-4 w-4" />
                </div>
                <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Clock className="h-4 w-4" />
                </div>
                <span>{format(new Date(event.date), "h:mm a")}{event.endsAt ? ` - ${format(new Date(event.endsAt), "h:mm a")}` : ""}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>{event.venue}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs">
                  {event.category}
                </Badge>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 opacity-80">Description</h3>
              <p className="text-sm text-muted-foreground/90 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Coordinator Info */}
            {!hideCoordinator && (
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 opacity-80">👤 Coordinator</h3>
                <p className="text-sm text-muted-foreground">
                  {event.creatorName || "Unknown Coordinator"}
                </p>
              </div>
            )}

            {/* Rejection Reason */}
            {event.status === "rejected" && event.rejectionReason && (
              <div className="text-sm rounded-xl bg-destructive/10 border border-destructive/20 text-destructive p-4 flex gap-3 shadow-inner">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="space-y-1.5 font-medium">
                  {event.reviewerName && <p>Rejected by: {event.reviewerName}</p>}
                  <p>Reason: {event.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Registration Progress */}
            <div className="p-5 rounded-2xl bg-secondary/30 border border-border/50 space-y-4 shadow-inner">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  {count} / {event.maxRegistrations} Students
                </span>
                <span className={cn(pct >= 100 ? "text-emerald-500" : "text-primary")}>{pct}% Filled</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary/80 overflow-hidden shadow-inner relative">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out", pct >= 100 ? "bg-emerald-500" : "bg-gradient-primary")} 
                  style={{ width: `${pct}%` }} 
                />
              </div>
              {event.maxRegistrations - count > 0 ? (
                <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>Remaining Seats</span>
                  <span className="bg-secondary px-2.5 py-1 rounded-md text-foreground shadow-sm border border-border/40">{event.maxRegistrations - count}</span>
                </p>
              ) : (
                <p className="text-xs text-emerald-500 font-bold flex items-center justify-end gap-1.5 bg-emerald-500/10 py-1.5 px-3 rounded-md w-fit ml-auto border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" /> Fully Booked
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/40">
              <Button 
                variant="outline" 
                className="flex-1 min-w-[140px] rounded-xl border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm group/btn py-6" 
                onClick={() => { onOpenChange(false); setViewing(event); }}
              >
                <Users className="h-5 w-5 mr-2 group-hover/btn:scale-110 transition-transform" /> 
                <span className="font-semibold">View Registrations</span>
              </Button>
              
              {showActions && (
                <>
                  <Button 
                    variant="outline" 
                    className="flex-1 xl:flex-none rounded-xl border-border/60 shadow-sm hover:bg-secondary transition-all group/btn py-6" 
                    onClick={() => { onOpenChange(false); setAttendanceEvent(event); }} 
                    disabled={count === 0}
                    title="Attendance"
                  >
                    <CheckCircle className="h-5 w-5 xl:mr-2 group-hover/btn:scale-110 transition-transform" />
                    <span className="inline xl:hidden 2xl:inline font-semibold">Attendance</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 xl:flex-none rounded-xl border-border/60 shadow-sm hover:bg-secondary transition-all group/btn py-6" 
                    onClick={() => { onOpenChange(false); setEditing(event); }}
                    title="Edit Event"
                  >
                    <Pencil className="h-5 w-5 xl:mr-2 group-hover/btn:scale-110 transition-transform" />
                    <span className="inline xl:hidden 2xl:inline font-semibold">Edit</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 xl:flex-none rounded-xl border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm group/btn py-6" 
                    onClick={() => { onOpenChange(false); setDeleting(event); }}
                    title="Delete Event"
                  >
                    <Trash2 className="h-5 w-5 xl:mr-2 group-hover/btn:scale-110 transition-transform" />
                    <span className="inline xl:hidden 2xl:inline font-semibold">Delete</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type ManagerEventCardProps = { event: ManagerDashboardEvent; showActions?: boolean; simplified?: boolean; hideCoordinator?: boolean };
export const ManagerEventCard = ({ event, showActions = true, hideCoordinator }: ManagerEventCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const meta = statusMeta[event.status];

  return (
    <>
      <article 
        onClick={() => setDetailsOpen(true)}
        className="group flex flex-col rounded-3xl overflow-hidden border border-border/40 bg-gradient-card shadow-soft backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:border-primary/50 relative cursor-pointer"
      >
        {/* Poster Section */}
        <div className="relative aspect-[16/10] overflow-hidden bg-secondary/20">
          <img 
            src={event.poster} 
            alt={event.title} 
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
            loading="lazy" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
          
          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <Badge variant="outline" className={cn("gap-1.5 px-3 py-1 backdrop-blur-md shadow-lg border-opacity-50", meta.cls)}>
              {meta.icon}
              <span className="font-semibold tracking-wide uppercase text-[10px]">{meta.label}</span>
            </Badge>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="flex flex-col flex-1 p-5 lg:p-6 gap-5 bg-gradient-to-b from-background to-secondary/5 relative z-10">
          
          {/* Title */}
          <div>
            <h3 className="font-extrabold text-xl md:text-2xl leading-snug text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1 font-medium">{event.club}</p>
          </div>
          
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-2.5">
              <CalIcon className="h-4 w-4 text-primary" />
              <span className="truncate">{format(new Date(event.date), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="truncate">{format(new Date(event.date), "h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2.5 col-span-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>

          {/* View Details Link */}
          <div className="mt-auto pt-2 flex items-center justify-end text-sm font-semibold text-primary/80 group-hover:text-primary transition-colors">
            View Details <span className="ml-1.5 group-hover:translate-x-1.5 transition-transform">→</span>
          </div>
        </div>
      </article>
      <ManagerEventDetailsDialog 
        event={event} 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen} 
        showActions={showActions} 
        hideCoordinator={hideCoordinator}
      />
    </>
  );
};

export const ManagerEventsGrid = ({ events, showActions = true, simplified = false, hideCoordinator }: { events: ManagerDashboardEvent[]; showActions?: boolean; simplified?: boolean; hideCoordinator?: boolean }) => {
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
        <ManagerEventCard key={e.id} event={e} showActions={showActions} simplified={simplified} hideCoordinator={hideCoordinator} />
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
  const count = registrationCount(event);
  const pct = Math.min(100, Math.round((count / event.maxRegistrations) * 100));

  let statusBadge;
  if (event.status === "approved") {
    statusBadge = (
      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40 gap-1.5 backdrop-blur-md px-2.5 py-0.5 shadow-sm">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  } else if (event.status === "pending") {
    statusBadge = (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/40 gap-1.5 backdrop-blur-md px-2.5 py-0.5 shadow-sm">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    );
  } else {
    statusBadge = (
      <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/50 gap-1.5 backdrop-blur-md px-2.5 py-0.5 shadow-sm">
        <AlertCircle className="h-3 w-3" /> ⚠ Rejected
      </Badge>
    );
  }

  return (
    <article 
      onClick={() => setViewing(event)}
      className="group relative flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-gradient-card shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/50 cursor-pointer overflow-hidden"
    >
      {/* Poster */}
      <div className="shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-secondary/20 relative shadow-inner">
        <img 
          src={event.poster} 
          alt="" 
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
          loading="lazy"
        />
        <div className="absolute inset-0 shadow-inner rounded-xl pointer-events-none bg-gradient-to-t from-black/20 to-transparent opacity-50" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-bold text-base sm:text-lg text-foreground truncate group-hover:text-primary transition-colors leading-tight">
            {event.title}
          </h4>
          <div className="shrink-0">
            {statusBadge}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground mt-1">
          <div className="flex items-center gap-1.5 group-hover:text-foreground/80 transition-colors">
            <CalIcon className="h-3.5 w-3.5 text-primary" />
            <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
            <span className="mx-0.5 text-border">•</span>
            <Clock className="h-3.5 w-3.5 text-orange-400" />
            <span>{format(new Date(event.date), "h:mm a")}</span>
          </div>
          
          <div className="flex items-center gap-2 group-hover:text-foreground/80 transition-colors">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            <span>{count} / {event.maxRegistrations} Registered</span>
            <div className="w-16 sm:w-20 h-1.5 rounded-full bg-secondary/80 overflow-hidden ml-1 shadow-inner">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000 ease-out", pct >= 100 ? "bg-emerald-500" : "bg-gradient-primary")} 
                style={{ width: `${pct}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
