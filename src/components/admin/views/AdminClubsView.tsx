import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Building2,
  ChevronDown,
  Calendar,
  Users,
  Mail,
  Eye,
  ShieldOff,
  ShieldCheck,
  Inbox,
  User,
  X,
  MapPin,
  Clock,
  CheckCircle2,
  CalendarClock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

// ── types ─────────────────────────────────────────────────────────────────

type ClubData = {
  id: string;
  name: string;
  club_logo_url: string | null;
  created_at: string | null;
  is_active: boolean | null;
  // manager
  managerId: string | null;
  managerName: string;
  managerEmail: string;
  // event counts
  totalEventCount: number;
  approvedEventCount: number;
  pendingEventCount: number;
  totalRegistrations: number;
};

type DrawerEvent = {
  id: string;
  title: string;
  poster_url: string | null;
  starts_at: string;
  status: string;
  venue: string;
};

type ClubDetails = {
  managerAvatar: string | null;
  upcomingCount: number;
  completedCount: number;
  recentEvents: DrawerEvent[];
  upcomingEvents: DrawerEvent[];
};

// ── helpers ───────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const GRADIENT_PAIRS = [
  ["#6366F1", "#818CF8"],
  ["#EC4899", "#F472B6"],
  ["#F59E0B", "#FCD34D"],
  ["#10B981", "#34D399"],
  ["#3B82F6", "#60A5FA"],
  ["#8B5CF6", "#A78BFA"],
  ["#EF4444", "#F87171"],
  ["#06B6D4", "#22D3EE"],
];

const getGradient = (name: string) => {
  const idx = name.charCodeAt(0) % GRADIENT_PAIRS.length;
  return GRADIENT_PAIRS[idx];
};

const statusMeta: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  pending:  { label: "Pending",  cls: "bg-amber-500/15  text-amber-400  border-amber-500/30"  },
  rejected: { label: "Rejected", cls: "bg-rose-500/15   text-rose-400   border-rose-500/30"   },
};

// ── main view ─────────────────────────────────────────────────────────────

export const AdminClubsView = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [filterOpen, setFilterOpen]     = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubData | null>(null);

  const { data: clubs = [], isLoading, isError } = useQuery({
    queryKey: ["admin-clubs-full"],
    queryFn: async (): Promise<ClubData[]> => {
      // Use select('*') so we don't fail on columns that may or may not exist.
      const { data: clubRows, error: clubError } = await supabase
        .from("clubs")
        .select("*")
        .order("name");

      if (clubError) throw clubError;
      if (!clubRows?.length) return [];

      const clubIds = clubRows.map((c: any) => c.id as string);

      // --- Manager profiles ---
      const { data: managerRows } = await supabase
        .from("profiles")
        .select("id, full_name, email, club_id")
        .eq("role", "club_manager")
        .in("club_id", clubIds);

      const managerMap = new Map<string, { id: string; name: string; email: string }>();
      (managerRows || []).forEach((m: any) => {
        if (m.club_id) managerMap.set(m.club_id, { id: m.id, name: m.full_name, email: m.email });
      });

      // --- All events per club (fetch all statuses) ---
      const { data: allEventRows } = await supabase
        .from("events")
        .select("id, club_id, status")
        .in("club_id", clubIds);

      const totalCountMap    = new Map<string, number>();
      const approvedCountMap = new Map<string, number>();
      const pendingCountMap  = new Map<string, number>();
      const approvedEventIds: string[] = [];

      (allEventRows || []).forEach((e: any) => {
        totalCountMap.set(e.club_id, (totalCountMap.get(e.club_id) ?? 0) + 1);
        if (e.status === "approved") {
          approvedCountMap.set(e.club_id, (approvedCountMap.get(e.club_id) ?? 0) + 1);
          approvedEventIds.push(e.id);
        }
        if (e.status === "pending") {
          pendingCountMap.set(e.club_id, (pendingCountMap.get(e.club_id) ?? 0) + 1);
        }
      });

      // --- Registrations across approved events ---
      const regCountMap = new Map<string, number>();
      if (approvedEventIds.length) {
        const { data: regRows } = await supabase
          .from("event_registrations")
          .select("event_id")
          .in("event_id", approvedEventIds);

        const eventToClub = new Map<string, string>();
        (allEventRows || []).forEach((e: any) => eventToClub.set(e.id, e.club_id));

        (regRows || []).forEach((r: any) => {
          const cid = eventToClub.get(r.event_id);
          if (cid) regCountMap.set(cid, (regCountMap.get(cid) ?? 0) + 1);
        });
      }

      return clubRows.map((club: any) => ({
        id:                club.id,
        name:              club.name,
        club_logo_url:     club.club_logo_url  ?? null,
        created_at:        club.created_at     ?? null,
        // is_active may or may not exist; default to true (active) if absent
        is_active:         club.is_active != null ? Boolean(club.is_active) : true,
        managerId:         managerMap.get(club.id)?.id    ?? null,
        managerName:       managerMap.get(club.id)?.name  ?? "No manager assigned",
        managerEmail:      managerMap.get(club.id)?.email ?? "—",
        totalEventCount:   totalCountMap.get(club.id)    ?? 0,
        approvedEventCount:approvedCountMap.get(club.id) ?? 0,
        pendingEventCount: pendingCountMap.get(club.id)  ?? 0,
        totalRegistrations:regCountMap.get(club.id)      ?? 0,
      }));
    },
    staleTime: 1000 * 60 * 2,
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ clubId, newState }: { clubId: string; newState: boolean }) => {
      const { error } = await supabase
        .from("clubs")
        .update({ is_active: newState })
        .eq("id", clubId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-clubs-full"] });
      toast.success(variables.newState ? "Club enabled." : "Club disabled.");
      // Sync selectedClub state without closing drawer
      setSelectedClub((prev) =>
        prev?.id === variables.clubId ? { ...prev, is_active: variables.newState } : prev
      );
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update club status."),
  });

  const filtered = clubs.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (q &&
        !c.name.toLowerCase().includes(q) &&
        !c.managerName.toLowerCase().includes(q))
      return false;
    if (statusFilter === "active"   && c.is_active === false) return false;
    if (statusFilter === "inactive" && c.is_active !== false) return false;
    return true;
  });

  const filterLabel =
    statusFilter === "active" ? "Active Clubs" : statusFilter === "inactive" ? "Inactive Clubs" : "All Clubs";

  // Only show empty state when truly done loading AND no error AND no results
  const isEmpty = !isLoading && !isError && filtered.length === 0;

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#1E1B4B] text-[#818CF8] rounded-xl border border-[#312E81] shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Clubs</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage all registered clubs on the platform.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clubs..."
              className="pl-10 pr-4 py-2.5 bg-[#0F111A] border border-border/40 rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 w-full md:w-56 text-white placeholder:text-muted-foreground/70 transition-all shadow-sm"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0F111A] border border-border/40 rounded-xl text-sm text-white font-medium hover:bg-[#1A1D24] transition-colors shadow-sm whitespace-nowrap"
            >
              {filterLabel}
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", filterOpen && "rotate-180")} />
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-2 min-w-[180px] bg-[#0F111A] border border-border/20 rounded-xl shadow-xl z-50 py-1">
                  {(["all", "active", "inactive"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setStatusFilter(opt); setFilterOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2",
                        statusFilter === opt
                          ? "bg-[#1A1D24] text-white font-medium"
                          : "text-white/70 hover:bg-[#1A1D24] hover:text-white"
                      )}
                    >
                      {opt === "active"   && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />}
                      {opt === "inactive" && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                      {opt === "all"      && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                      {opt === "all" ? "All Clubs" : opt === "active" ? "Active Clubs" : "Inactive Clubs"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6 font-medium">
        {isLoading
          ? "Loading clubs..."
          : isError
          ? "Failed to load clubs."
          : isEmpty
          ? "No clubs found"
          : `${filtered.length} club${filtered.length === 1 ? "" : "s"} found`}
      </p>

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center p-20 rounded-2xl bg-[#0F111A] border border-rose-500/20 text-center">
          <div className="p-5 rounded-full bg-rose-500/10 border border-rose-500/20 mb-6">
            <Building2 className="w-10 h-10 text-rose-400/60" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Could not load clubs</h2>
          <p className="text-muted-foreground max-w-sm">
            There was an error fetching data from the database. Please refresh the page.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[#0F111A] border border-border/20 rounded-2xl p-5 animate-pulse flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-border/20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-border/20 rounded w-3/4" />
                  <div className="h-3.5 bg-border/20 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3.5 bg-border/20 rounded w-full" />
                <div className="h-3.5 bg-border/20 rounded w-4/5" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="h-14 bg-border/20 rounded-xl" />
                <div className="h-14 bg-border/20 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="h-9 bg-border/20 rounded-lg" />
                <div className="h-9 bg-border/20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center p-20 rounded-2xl bg-[#0F111A] border border-border/20 text-center">
          <div className="p-5 rounded-full bg-[#151820] border border-border/30 mb-6">
            <Inbox className="w-10 h-10 text-muted-foreground/60" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No clubs found</h2>
          <p className="text-muted-foreground max-w-sm">
            No clubs match your current search or filter. Try adjusting your criteria.
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
              className="mt-6 px-4 py-2 bg-[#1E1B4B] text-[#818CF8] hover:bg-[#312E81] border border-[#312E81] rounded-lg text-sm font-medium transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Club Cards grid */}
      {!isLoading && !isEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((club) => {
            const isActive = club.is_active !== false;
            const [from, to] = getGradient(club.name);
            return (
              <ClubCard
                key={club.id}
                club={club}
                isActive={isActive}
                gradientFrom={from}
                gradientTo={to}
                onViewDetails={() => setSelectedClub(club)}
                onToggle={() => toggleMutation.mutate({ clubId: club.id, newState: !isActive })}
                isToggling={toggleMutation.isPending && toggleMutation.variables?.clubId === club.id}
              />
            );
          })}
        </div>
      )}

      {/* Details drawer */}
      <ClubDetailsDrawer
        club={selectedClub}
        onClose={() => setSelectedClub(null)}
        onToggle={(club) =>
          toggleMutation.mutate({ clubId: club.id, newState: club.is_active === false })
        }
        isToggling={toggleMutation.isPending}
      />
    </div>
  );
};

// ── ClubCard ─────────────────────────────────────────────────────────────

const ClubCard = ({
  club,
  isActive,
  gradientFrom,
  gradientTo,
  onViewDetails,
  onToggle,
  isToggling,
}: {
  club: ClubData;
  isActive: boolean;
  gradientFrom: string;
  gradientTo: string;
  onViewDetails: () => void;
  onToggle: () => void;
  isToggling: boolean;
}) => {
  const initials = getInitials(club.name);

  return (
    <div
      className={cn(
        "group relative bg-[#0F111A] border rounded-2xl p-5 flex flex-col gap-4",
        "hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300",
        isActive
          ? "border-border/20 hover:border-indigo-500/30"
          : "border-border/10 opacity-75 hover:opacity-100 hover:border-rose-500/20"
      )}
    >
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        {isActive ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Inactive
          </span>
        )}
      </div>

      {/* Club identity */}
      <div className="flex items-center gap-4 pr-20">
        <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden border border-white/10 shadow-md">
          {club.club_logo_url ? (
            <img src={club.club_logo_url} alt={club.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base leading-snug truncate">{club.name}</h3>
          {club.created_at && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Joined {format(new Date(club.created_at), "dd MMM yyyy")}
            </p>
          )}
        </div>
      </div>

      {/* Manager info */}
      <div className="bg-[#151820] rounded-xl p-3.5 border border-border/10 space-y-1.5">
        <p className="flex items-center gap-2 text-sm text-white/90 font-medium">
          <User className="w-3.5 h-3.5 text-[#818CF8] shrink-0" />
          <span className="truncate">{club.managerName}</span>
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{club.managerEmail}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#151820] border border-border/10 rounded-xl p-3.5 text-center">
          <div className="flex items-center justify-center text-[#818CF8] mb-1.5">
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-white">{club.approvedEventCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved Events</p>
        </div>
        <div className="bg-[#151820] border border-border/10 rounded-xl p-3.5 text-center">
          <div className="flex items-center justify-center text-[#818CF8] mb-1.5">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-white">{club.totalRegistrations}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total Registrations</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onViewDetails}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-transparent text-[#9F7AEA] border border-[#9F7AEA]/30 hover:bg-[#9F7AEA]/10 transition-colors"
        >
          <Eye className="w-4 h-4" /> View Details
        </button>
        {isActive ? (
          <button
            onClick={onToggle}
            disabled={isToggling}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-transparent text-rose-400 border border-rose-400/30 hover:bg-rose-400/10 transition-colors disabled:opacity-50"
          >
            {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
            Disable Club
          </button>
        ) : (
          <button
            onClick={onToggle}
            disabled={isToggling}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-transparent text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
          >
            {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Enable Club
          </button>
        )}
      </div>
    </div>
  );
};

// ── ClubDetailsDrawer ────────────────────────────────────────────────────

const ClubDetailsDrawer = ({
  club,
  onClose,
  onToggle,
  isToggling,
}: {
  club: ClubData | null;
  onClose: () => void;
  onToggle: (club: ClubData) => void;
  isToggling: boolean;
}) => {
  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin-club-details", club?.id],
    enabled: !!club?.id,
    queryFn: async (): Promise<ClubDetails> => {
      const clubId = club!.id;

      // All events for this club
      const { data: events } = await supabase
        .from("events")
        .select("id, title, poster_url, starts_at, status, venue")
        .eq("club_id", clubId)
        .order("starts_at", { ascending: false });

      const allEvents: DrawerEvent[] = (events || []) as DrawerEvent[];

      const now = new Date();
      const upcomingEvents = allEvents.filter(
        (e) => e.status === "approved" && !isPast(new Date(e.starts_at))
      );
      const completedEvents = allEvents.filter(
        (e) => e.status === "approved" && isPast(new Date(e.starts_at))
      );
      const recentEvents = allEvents.slice(0, 5);

      // Manager avatar from profiles
      let managerAvatar: string | null = null;
      if (club?.managerId) {
        const { data: mp } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", club.managerId)
          .maybeSingle();
        managerAvatar = (mp as any)?.avatar_url ?? null;
      }

      return {
        managerAvatar,
        upcomingCount: upcomingEvents.length,
        completedCount: completedEvents.length,
        recentEvents,
        upcomingEvents: upcomingEvents.slice(0, 5),
      };
    },
    staleTime: 60 * 1000,
  });

  const isActive = club?.is_active !== false;
  const [gradFrom, gradTo] = club ? getGradient(club.name) : ["#6366F1", "#818CF8"];

  return (
    <Sheet open={!!club} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-[480px] p-0 bg-[#080A10] border-l border-border/20 flex flex-col overflow-hidden"
      >
        {club && (
          <>
            {/* Header banner */}
            <div
              className="relative shrink-0 h-36 flex items-end px-6 pb-5"
              style={{
                background: `linear-gradient(135deg, ${gradFrom}22, ${gradTo}11), #0F111A`,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Logo + Name */}
              <div className="flex items-end gap-4">
                <div
                  className="w-16 h-16 rounded-xl shrink-0 overflow-hidden border-2 shadow-xl"
                  style={{ borderColor: `${gradFrom}60` }}
                >
                  {club.club_logo_url ? (
                    <img src={club.club_logo_url} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
                      style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                    >
                      {getInitials(club.name)}
                    </div>
                  )}
                </div>
                <div className="pb-0.5">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">{club.name}</h2>
                    {isActive ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full text-[10px] font-bold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/25 rounded-full text-[10px] font-bold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        INACTIVE
                      </span>
                    )}
                  </div>
                  {club.created_at && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Joined {format(new Date(club.created_at), "dd MMMM yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Club Manager */}
              <section>
                <SectionLabel icon={User} label="Club Manager" />
                <div className="bg-[#0F111A] border border-border/15 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
                    {details?.managerAvatar ? (
                      <img src={details.managerAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                      >
                        {getInitials(club.managerName)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{club.managerName}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {club.managerEmail}
                    </p>
                  </div>
                </div>
              </section>

              {/* Statistics */}
              <section>
                <SectionLabel icon={TrendingUp} label="Statistics" />
                {detailsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-[72px] bg-[#0F111A] rounded-xl animate-pulse border border-border/10" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile icon={CheckCircle2} iconColor="text-emerald-400" value={club.approvedEventCount} label="Approved Events" />
                    <StatTile icon={Users} iconColor="text-[#818CF8]" value={club.totalRegistrations} label="Total Registrations" />
                    <StatTile icon={CalendarClock} iconColor="text-amber-400" value={details?.upcomingCount ?? 0} label="Upcoming Events" />
                    <StatTile icon={Clock} iconColor="text-rose-400" value={details?.completedCount ?? 0} label="Completed Events" />
                  </div>
                )}
              </section>

              {/* Recent Events */}
              <section>
                <SectionLabel icon={Calendar} label="Recent Events" />
                {detailsLoading ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-[#0F111A] rounded-xl animate-pulse border border-border/10" />
                    ))}
                  </div>
                ) : details?.recentEvents.length ? (
                  <div className="space-y-2">
                    {details.recentEvents.map((event) => {
                      const sm = statusMeta[event.status] ?? statusMeta.pending;
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 bg-[#0F111A] border border-border/10 rounded-xl p-3 hover:border-border/30 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#151820] border border-border/10">
                            {event.poster_url ? (
                              <img src={event.poster_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{event.title}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">
                              {format(new Date(event.starts_at), "dd MMM yyyy")}
                            </p>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0", sm.cls)}>
                            {sm.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptySection label="No events yet" />
                )}
              </section>

              {/* Upcoming Events */}
              <section>
                <SectionLabel icon={CalendarClock} label="Upcoming Events" />
                {detailsLoading ? (
                  <div className="space-y-2.5">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-[#0F111A] rounded-xl animate-pulse border border-border/10" />
                    ))}
                  </div>
                ) : details?.upcomingEvents.length ? (
                  <div className="space-y-2">
                    {details.upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="bg-[#0F111A] border border-border/10 rounded-xl p-3.5 hover:border-indigo-500/20 transition-colors"
                      >
                        <p className="text-white text-sm font-semibold truncate">{event.title}</p>
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-[#818CF8]" />
                            {format(new Date(event.starts_at), "dd MMM yyyy")}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#818CF8] shrink-0" />
                            <span className="truncate">{event.venue}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptySection label="No upcoming events" />
                )}
              </section>

              {/* bottom padding to clear fixed footer */}
              <div className="h-4" />
            </div>

            {/* Fixed footer actions */}
            <div className="shrink-0 px-6 py-4 border-t border-border/15 bg-[#080A10] flex gap-3">
              {isActive ? (
                <button
                  onClick={() => onToggle(club)}
                  disabled={isToggling}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                >
                  {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                  Disable Club
                </button>
              ) : (
                <button
                  onClick={() => onToggle(club)}
                  disabled={isToggling}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Enable Club
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#818CF8] text-white hover:bg-[#6366F1] transition-colors shadow-lg shadow-indigo-500/20"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ── small helper components ───────────────────────────────────────────────

const SectionLabel = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon className="w-4 h-4 text-[#818CF8]" />
    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-widest">{label}</h3>
  </div>
);

const StatTile = ({
  icon: Icon,
  iconColor,
  value,
  label,
}: {
  icon: any;
  iconColor: string;
  value: number;
  label: string;
}) => (
  <div className="bg-[#0F111A] border border-border/10 rounded-xl p-4 flex flex-col gap-2">
    <Icon className={cn("w-4 h-4", iconColor)} />
    <p className="text-2xl font-bold text-white leading-none">{value}</p>
    <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
  </div>
);

const EmptySection = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center py-6 rounded-xl bg-[#0F111A] border border-border/10 text-muted-foreground/60 text-sm">
    {label}
  </div>
);
