import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity, Building2, Clock, Loader2, ShieldCheck,
  Users, CheckCircle2, XCircle, ChevronRight,
  Calendar as CalIcon, MapPin, Award, FileText, Check, LayoutDashboard, AlertCircle
} from "lucide-react";
import { loadAllEventsForAdmin } from "@/components/dashboards/AdminDashboard";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Card wrapper for premium SaaS look
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-[24px] border border-border/30 bg-[#0A0C10] shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:border-border/50", className)}>
    {children}
  </div>
);

// EmptyState component
const EmptyState = ({ icon: Icon, message, title = "All caught up!" }: { icon: any, message: string, title?: string }) => (
  <div className="flex flex-col items-center justify-center text-muted-foreground w-full py-16">
    <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
      <Icon className="h-8 w-8 text-emerald-400 opacity-90" />
    </div>
    <p className="text-lg font-semibold text-white">{title}</p>
    <p className="text-sm font-medium opacity-70 mt-1">{message}</p>
  </div>
);

export const AdminDashboardView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Existing Events Query
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ["admin-all-events"],
    queryFn: loadAllEventsForAdmin,
  });

  // Exact Counts
  const { data: totalClubs = 0 } = useQuery({
    queryKey: ["admin-total-clubs"],
    queryFn: async () => {
      const { count } = await supabase.from("clubs").select("id", { count: "exact", head: true });
      return count ?? 0;
    }
  });

  const { data: totalStudents = 0 } = useQuery({
    queryKey: ["admin-total-students"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student");
      return count ?? 0;
    }
  });

  const { data: certificatesIssued = 0 } = useQuery({
    queryKey: ["admin-certificates-issued"],
    queryFn: async () => {
      const { count } = await supabase.from("event_registrations").select("id, events!inner(certificates_enabled)", { count: "exact", head: true }).eq("status", "PRESENT").eq("events.certificates_enabled", true);
      return count ?? 0;
    }
  });

  // Real activities generated from latest events
  const { data: recentActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["admin-recent-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, status, created_at, approved_at, clubs(name), profiles!events_created_by_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(5); // Limit to 5 as requested

      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        status: event.status,
        timestamp: event.approved_at && event.status !== 'pending' ? event.approved_at : event.created_at,
        clubName: event.clubs?.name ?? "Unknown Club",
        managerName: event.profiles?.full_name ?? "Unknown Manager",
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
  });

  // Approve/Reject Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("events")
        .update({
          status,
          approved_by: status === "approved" ? user?.id : null,
          approved_at: status === "approved" ? new Date().toISOString() : null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-activities"] });
      toast.success(`Event ${variables.status === 'approved' ? 'approved' : 'rejected'} successfully.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update event status.");
    }
  });

  const pending = events.filter((e) => e.status === "pending");
  const approved = events.filter((e) => e.status === "approved");
  const rejected = events.filter((e) => e.status === "rejected");
  const todayEvents = approved.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'));

  // Upcoming Platform Events
  const now = new Date().getTime();
  const upcomingEvents = approved
    .filter(e => new Date(e.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Calculate Venue Conflicts
  const venueConflicts = useMemo(() => {
    let conflicts = 0;
    for (const p of pending) {
      const pStart = new Date(p.date).getTime();
      const pEnd = p.endsAt ? new Date(p.endsAt).getTime() : pStart + (180 * 60_000);

      const hasConflict = approved.some(a => {
        if (a.venue !== p.venue) return false;
        const aStart = new Date(a.date).getTime();
        const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : aStart + (180 * 60_000);
        return pStart < aEnd && pEnd > aStart;
      });
      if (hasConflict) conflicts++;
    }
    return conflicts;
  }, [pending, approved]);

  if (eventsError) return <p className="text-sm text-destructive">{(eventsError as Error).message}</p>;

  if (eventsLoading || activitiesLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* COMPACT PAGE HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage platform operations and monitor system health.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-white">{format(new Date(), "d MMMM, yyyy")}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE")}</p>
        </div>
      </header>

      {/* TOP KPI SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Pending Approvals", value: pending.length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: "group-hover:border-amber-500/30", glow: "group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]", iconGlow: "shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]", subtitle: "Requires attention" },
          { label: "Total Clubs", value: totalClubs, icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "group-hover:border-emerald-500/30", glow: "group-hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]", iconGlow: "shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]", subtitle: "Active clubs" },
          { label: "Total Students", value: totalStudents.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", border: "group-hover:border-blue-500/30", glow: "group-hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]", iconGlow: "shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]", subtitle: "Registered students" },
          { label: "Events Today", value: todayEvents.length, icon: CalIcon, color: "text-purple-500", bg: "bg-purple-500/10", border: "group-hover:border-purple-500/30", glow: "group-hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]", iconGlow: "shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]", subtitle: "Across all clubs" },
        ].map((kpi, idx) => (
          <div key={idx} className={cn(
            "group rounded-[24px] border border-border/20 bg-gradient-to-b from-[#14161C] to-[#0A0C10] p-6 shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
            kpi.border, kpi.glow
          )}>
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", kpi.bg, kpi.iconGlow)}>
                  <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-white tracking-tight leading-none mb-2">{kpi.value}</p>
                  <p className="text-sm font-semibold text-white/90">{kpi.label}</p>
                  <p className="text-xs text-white/50 mt-1">{kpi.subtitle}</p>
                </div>
              </div>
            </div>
            {/* Subtle gradient accent background */}
            <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl", kpi.bg)} />
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN (70%) */}
        <div className="lg:col-span-8 space-y-10">

          {/* Pending Approval Queue */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-border/20 bg-[#12141A]/50">
              <h3 className="font-semibold text-lg text-white">Pending Approvals</h3>
            </div>

            <div className="p-2">
              {pending.length > 0 ? (
                <div className="space-y-1">
                  {pending.slice(0, 5).map((event) => (
                    <div key={event.id} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-[16px] hover:bg-[#1A1D24] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer border border-transparent hover:border-border/30">
                      <div className="w-16 h-16 rounded-xl bg-[#0A0C10] overflow-hidden shrink-0 shadow-inner border border-border/10">
                        <img src={event.poster} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate group-hover:text-primary transition-colors text-base">{event.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1.5 text-white/70 font-medium"><Building2 className="h-4 w-4" /> {event.club}</span>
                          <span className="hidden sm:inline-block">•</span>
                          <span className="truncate">{event.managerName}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          <span className="inline-block px-2.5 py-1 rounded text-[11px] uppercase font-bold tracking-wider bg-[#0F1117] border border-border/40 text-muted-foreground shadow-sm">
                            {format(new Date(event.date), "MMM d")}
                          </span>
                          <span className="inline-block px-2.5 py-1 rounded text-[11px] uppercase font-bold tracking-wider bg-primary/10 text-primary border border-primary/20 shadow-sm">
                            {event.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: event.id, status: 'approved' }); }}
                          disabled={updateStatusMutation.isPending}
                          className="px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: event.id, status: 'rejected' }); }}
                          disabled={updateStatusMutation.isPending}
                          className="px-5 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} message="No pending approvals." />
              )}
            </div>
          </Card>

          {/* Recent Platform Activity */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-border/20 bg-[#12141A]/50 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-white">Recent Platform Activity</h3>
            </div>

            <div className="p-6">
              {recentActivities.length > 0 ? (
                <div className="space-y-6">
                  {recentActivities.map((act, index) => {
                    const isPending = act.status === 'pending';
                    const isApproved = act.status === 'approved';
                    const Icon = isApproved ? CheckCircle2 : (isPending ? Clock : XCircle);

                    let colorCls = "";
                    let actionText = "";

                    if (isPending) {
                      colorCls = "text-amber-400 bg-amber-400/10 border-amber-400/30";
                      actionText = "Submitted event for approval";
                    } else if (isApproved) {
                      colorCls = "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
                      actionText = "Approved event";
                    } else {
                      colorCls = "text-rose-400 bg-rose-400/10 border-rose-400/30";
                      actionText = "Rejected event";
                    }

                    return (
                      <div key={act.id + index} className="relative flex items-start gap-5 group">
                        {index !== recentActivities.length - 1 && (
                          <div className="absolute top-10 bottom-[-24px] left-[1.15rem] w-px bg-border/40 group-hover:bg-border/80 transition-colors" />
                        )}
                        <div className={cn("mt-1 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-500 group-hover:scale-125 z-10", colorCls)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 bg-[#151820] p-5 rounded-2xl border border-border/20 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:border-border/50 group-hover:-translate-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3">
                            <div>
                              <p className="text-base font-semibold text-white group-hover:text-primary transition-colors">{act.clubName}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">Manager: <span className="text-white/80">{act.managerName}</span></p>
                            </div>
                            <span className="text-xs font-medium bg-[#0A0C10] border border-border/40 px-3 py-1.5 rounded-lg text-muted-foreground shadow-inner self-start sm:self-auto">
                              {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm bg-[#0A0C10]/50 p-3 rounded-xl border border-border/10 inline-block w-full">
                            <span className="text-muted-foreground">{actionText}</span> <span className="font-bold text-white tracking-wide ml-1">{act.title}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Activity} message="No recent activities." title="No Activity" />
              )}
            </div>
            {recentActivities.length > 0 && (
              <div className="p-4 border-t border-border/20 bg-[#12141A]/30 text-center hover:bg-[#1A1D24] transition-colors group cursor-pointer" onClick={() => navigate("/admin-dashboard/activity")}>
                <button className="text-sm font-semibold text-muted-foreground group-hover:text-white transition-colors flex items-center justify-center gap-2 w-full">
                  View Full Activity <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN (30%) */}
        <div className="lg:col-span-4 space-y-10">

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg text-white mb-5">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: "Review Pending Events", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", glow: "group-hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]", link: "/admin-dashboard/pending" },
                { label: "Browse All Events", icon: CalIcon, color: "text-blue-400", bg: "bg-blue-400/10", glow: "group-hover:shadow-[0_0_15px_rgba(96,165,250,0.3)]", link: "/admin-dashboard/events" },
                { label: "Manage Clubs", icon: Building2, color: "text-violet-400", bg: "bg-violet-400/10", glow: "group-hover:shadow-[0_0_15px_rgba(167,139,250,0.3)]", link: "/admin-dashboard/clubs" },
              ].map((action, i) => (
                <button key={i} onClick={() => navigate(action.link)} className="w-full group flex items-center justify-between p-4 rounded-2xl bg-[#151820] border border-border/20 hover:bg-[#1A1D24] hover:border-border/60 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110", action.bg, action.color, action.glow)}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{action.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white group-hover:translate-x-1.5 transition-transform duration-300" />
                </button>
              ))}
            </div>
          </Card>

          {/* System Overview */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg text-white mb-5">Platform Overview</h3>
            <div className="space-y-4">
              {[
                { label: "Approved Events", value: approved.length, dot: "bg-emerald-400" },
                { label: "Pending Events", value: pending.length, dot: "bg-amber-400" },
                { label: "Rejected Events", value: rejected.length, dot: "bg-rose-400" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between group cursor-default p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] transition-transform group-hover:scale-150", stat.dot)} />
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">{stat.label}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base font-bold text-white tracking-wide">{stat.value}</span>
                  </div>
                </div>
              ))}

              <div className="h-px w-full bg-border/20 my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#151820] border border-border/20 hover:border-border/60 transition-all duration-300 group cursor-default hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 group-hover:text-white/80 transition-colors flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Conflicts</p>
                  <p className="text-3xl font-extrabold text-white">{venueConflicts}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#151820] border border-border/20 hover:border-border/60 transition-all duration-300 group cursor-default hover:-translate-y-1 hover:shadow-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 group-hover:text-white/80 transition-colors flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-400" /> Certificates</p>
                  <p className="text-3xl font-extrabold text-white">{certificatesIssued.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Upcoming Platform Events */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-border/20 bg-[#12141A]/50">
              <h3 className="font-semibold text-lg text-white">Upcoming Events</h3>
            </div>

            <div className="p-2">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-1">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="group flex items-center gap-4 p-4 rounded-[16px] hover:bg-[#1A1D24] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-transparent hover:border-border/30">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                        <CalIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate text-sm group-hover:text-primary transition-colors">{event.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-white/70"><Building2 className="w-3 h-3" /> {event.club}</span>
                          <span>•</span>
                          <span>{format(new Date(event.date), "MMM d")}</span>
                          <span>•</span>
                          <span>{format(new Date(event.date), "p")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalIcon} message="No upcoming events." title="Empty Schedule" />
              )}
            </div>
            {upcomingEvents.length > 0 && (
              <div className="p-4 border-t border-border/20 bg-[#12141A]/30 text-center hover:bg-[#1A1D24] transition-colors group cursor-pointer" onClick={() => navigate("/admin-dashboard/events")}>
                <button className="text-sm font-semibold text-muted-foreground group-hover:text-white transition-colors flex items-center justify-center gap-2 w-full">
                  View All Events <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </Card>

        </div>

      </div>
    </div>
  );
};
