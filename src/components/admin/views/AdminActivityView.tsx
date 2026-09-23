import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Loader2,
  Pencil,
  QrCode,
  Search,
  UserPlus,
  Users2,
  XCircle,
  Award,
} from "lucide-react";
import { formatDistanceToNow, isThisWeek, isToday, isYesterday } from "date-fns";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── shared presentational helpers (matches AdminAnalyticsView dark-navy style) ──

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-border/40 bg-[#0F1117] shadow-lg backdrop-blur-xl", className)}>
    {children}
  </div>
);

type ActivityType = "creation" | "approval" | "rejection" | "update" | "registration" | "attendance" | "certificate" | "manager_added";
type RoleName = "Administrator" | "Club Manager" | "Student";
type ResourceName = "Events" | "Clubs" | "Users" | "Registrations" | "Attendance" | "Certificates";
type ActionName = "Approved" | "Rejected" | "Created" | "Updated" | "Registered" | "Verified" | "Certificate Issued";

interface ActivityItem {
  id: string;
  type: ActivityType;
  actorName: string;
  role: RoleName;
  resource: ResourceName;
  action: ActionName;
  title: string;
  description: string;
  timestamp: number;
  rawDate: Date;
  group: "Today" | "Yesterday" | "This Week" | "Earlier";
}

const ROLE_OPTIONS = ["All Roles", "Administrator", "Club Manager", "Student"] as const;
const ACTION_OPTIONS = ["All Actions", "Approved", "Rejected", "Created", "Updated", "Registered", "Verified", "Certificate Issued"] as const;
const RESOURCE_OPTIONS = ["All Resources", "Events", "Clubs", "Users", "Registrations", "Attendance", "Certificates"] as const;
const DATE_OPTIONS = ["Today", "This Week", "This Month", "All Time"] as const;

const getActivityConfig = (type: ActivityType) => {
  switch (type) {
    case "approval":
      return { icon: CheckCircle2, bg: "bg-emerald-500/15", color: "text-emerald-400", border: "border-emerald-500/30" };
    case "rejection":
      return { icon: XCircle, bg: "bg-destructive/15", color: "text-destructive", border: "border-destructive/30" };
    case "update":
      return { icon: Pencil, bg: "bg-orange-500/15", color: "text-orange-400", border: "border-orange-500/30" };
    case "registration":
      return { icon: UserPlus, bg: "bg-violet-500/15", color: "text-violet-400", border: "border-violet-500/30" };
    case "attendance":
      return { icon: QrCode, bg: "bg-cyan-500/15", color: "text-cyan-400", border: "border-cyan-500/30" };
    case "certificate":
      return { icon: Award, bg: "bg-purple-500/15", color: "text-purple-400", border: "border-purple-500/30" };
    case "manager_added":
      return { icon: Users2, bg: "bg-cyan-500/15", color: "text-cyan-400", border: "border-cyan-500/30" };
    case "creation":
    default:
      return { icon: CalendarPlus, bg: "bg-primary/15", color: "text-primary", border: "border-primary/30" };
  }
};

const roleBadgeCls = (role: RoleName) =>
  role === "Administrator"
    ? "bg-primary/15 text-primary border-primary/30"
    : role === "Club Manager"
    ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
    : "bg-sky-500/15 text-sky-400 border-sky-500/30";

export const AdminActivityView = () => {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("All Roles");
  const [action, setAction] = useState<(typeof ACTION_OPTIONS)[number]>("All Actions");
  const [resource, setResource] = useState<(typeof RESOURCE_OPTIONS)[number]>("All Resources");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_OPTIONS)[number]>("This Week");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["admin-activity-feed"],
    queryFn: async (): Promise<ActivityItem[]> => {
      const [eventsRes, regsRes, managersRes, attendanceRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, category, status, created_at, updated_at, approved_at, rejection_reason, profiles!events_created_by_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("event_registrations")
          .select("id, registered_at, profiles(full_name), events(title)")
          .order("registered_at", { ascending: false })
          .limit(150),
        supabase
          .from("profiles")
          .select("id, full_name, created_at, clubs(name)")
          .eq("role", "club_manager")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("attendance")
          .select("id, marked_at, status, profiles(full_name), events(title, certificate_template_url, certificates_enabled)")
          .eq("status", "PRESENT")
          .order("marked_at", { ascending: false })
          .limit(150),
      ]);

      const list: ActivityItem[] = [];

      (eventsRes.data || []).forEach((e: any) => {
        const creatorName = e.profiles?.full_name ?? "Club Manager";
        if (e.created_at) {
          list.push({
            id: `create-${e.id}`,
            type: "creation",
            actorName: creatorName,
            role: "Club Manager",
            resource: "Events",
            action: "Created",
            title: `Created "${e.title}"`,
            description: `Event category: ${e.category}`,
            timestamp: new Date(e.created_at).getTime(),
            rawDate: new Date(e.created_at),
            group: "Earlier",
          });
        }
        if (e.status === "approved" && (e.approved_at || e.updated_at)) {
          const at = e.approved_at || e.updated_at || e.created_at;
          list.push({
            id: `approve-${e.id}`,
            type: "approval",
            actorName: "Administrator",
            role: "Administrator",
            resource: "Events",
            action: "Approved",
            title: `Approved "${e.title}"`,
            description: "Event is now live and accepting registrations.",
            timestamp: new Date(at).getTime(),
            rawDate: new Date(at),
            group: "Earlier",
          });
        }
        if (e.status === "rejected" && e.updated_at) {
          list.push({
            id: `reject-${e.id}`,
            type: "rejection",
            actorName: "Administrator",
            role: "Administrator",
            resource: "Events",
            action: "Rejected",
            title: `Rejected "${e.title}"`,
            description: e.rejection_reason ? `Reason: ${e.rejection_reason}` : "Event does not meet the required guidelines.",
            timestamp: new Date(e.updated_at).getTime(),
            rawDate: new Date(e.updated_at),
            group: "Earlier",
          });
        }
        if (e.updated_at && e.created_at && e.status !== "rejected") {
          const cTime = new Date(e.created_at).getTime();
          const uTime = new Date(e.updated_at).getTime();
          if (uTime - cTime > 10 * 60 * 1000) {
            list.push({
              id: `update-${e.id}-${uTime}`,
              type: "update",
              actorName: creatorName,
              role: "Club Manager",
              resource: "Events",
              action: "Updated",
              title: `Updated "${e.title}"`,
              description: "Changes made to event configuration, venue, or timing.",
              timestamp: uTime,
              rawDate: new Date(e.updated_at),
              group: "Earlier",
            });
          }
        }
      });

      (regsRes.data || []).forEach((r: any) => {
        if (!r.registered_at) return;
        const studentName = r.profiles?.full_name ?? "Student";
        const eventTitle = r.events?.title ?? "an event";
        list.push({
          id: `reg-${r.id}`,
          type: "registration",
          actorName: studentName,
          role: "Student",
          resource: "Registrations",
          action: "Registered",
          title: `Registered for "${eventTitle}"`,
          description: "New participant registration recorded.",
          timestamp: new Date(r.registered_at).getTime(),
          rawDate: new Date(r.registered_at),
          group: "Earlier",
        });
      });

      (managersRes.data || []).forEach((m: any) => {
        if (!m.created_at) return;
        list.push({
          id: `mgr-${m.id}`,
          type: "manager_added",
          actorName: "Administrator",
          role: "Administrator",
          resource: "Users",
          action: "Created",
          title: `Added club manager "${m.full_name}"`,
          description: m.clubs?.name ? `Assigned to ${m.clubs.name}` : "New club manager account created.",
          timestamp: new Date(m.created_at).getTime(),
          rawDate: new Date(m.created_at),
          group: "Earlier",
        });
      });

      (attendanceRes.data || []).forEach((a: any) => {
        if (!a.marked_at) return;
        const studentName = a.profiles?.full_name ?? "Student";
        const eventTitle = a.events?.title ?? "an event";
        list.push({
          id: `att-${a.id}`,
          type: "attendance",
          actorName: studentName,
          role: "Student",
          resource: "Attendance",
          action: "Verified",
          title: `Attendance verified for "${eventTitle}"`,
          description: `${studentName}'s attendance was marked present.`,
          timestamp: new Date(a.marked_at).getTime(),
          rawDate: new Date(a.marked_at),
          group: "Earlier",
        });
        if (a.events?.certificates_enabled && a.events?.certificate_template_url) {
          list.push({
            id: `cert-${a.id}`,
            type: "certificate",
            actorName: studentName,
            role: "Student",
            resource: "Certificates",
            action: "Certificate Issued",
            title: `Certificate issued for "${eventTitle}"`,
            description: `${studentName} became eligible for a participation certificate.`,
            timestamp: new Date(a.marked_at).getTime(),
            rawDate: new Date(a.marked_at),
            group: "Earlier",
          });
        }
      });

      list.sort((a, b) => b.timestamp - a.timestamp);
      list.forEach((item) => {
        if (isToday(item.rawDate)) item.group = "Today";
        else if (isYesterday(item.rawDate)) item.group = "Yesterday";
        else if (isThisWeek(item.rawDate)) item.group = "This Week";
        else item.group = "Earlier";
      });

      return list;
    },
  });

  const dateFiltered = useMemo(() => {
    if (dateFilter === "All Time") return activities;
    const now = Date.now();
    const ranges: Record<string, number> = {
      Today: 1000 * 60 * 60 * 24,
      "This Week": 1000 * 60 * 60 * 24 * 7,
      "This Month": 1000 * 60 * 60 * 24 * 30,
    };
    const span = ranges[dateFilter];
    return activities.filter((a) => now - a.timestamp <= span);
  }, [activities, dateFilter]);

  const filteredActivities = useMemo(() => {
    return dateFiltered.filter((act) => {
      if (role !== "All Roles" && act.role !== role) return false;
      if (action !== "All Actions" && act.action !== action) return false;
      if (resource !== "All Resources" && act.resource !== resource) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!act.title.toLowerCase().includes(q) && !act.description.toLowerCase().includes(q) && !act.actorName.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [dateFiltered, role, action, resource, search]);

  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    if (!acc[activity.group]) acc[activity.group] = [];
    acc[activity.group].push(activity);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];
  const groups = groupOrder.filter((g) => groupedActivities[g]?.length > 0);

  const summary = useMemo(() => {
    return {
      total: activities.length,
      approved: activities.filter((a) => a.type === "approval").length,
      created: activities.filter((a) => a.type === "creation").length,
      rejected: activities.filter((a) => a.type === "rejection").length,
      updated: activities.filter((a) => a.type === "update").length,
      registered: activities.filter((a) => a.type === "registration").length,
      managers: activities.filter((a) => a.type === "manager_added").length,
      certificates: activities.filter((a) => a.type === "certificate").length,
      attendance: activities.filter((a) => a.type === "attendance").length,
    };
  }, [activities]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showEmptyState = activities.length === 0;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Admin Activity</h1>
        </div>
        <p className="text-sm md:text-base text-[#8F9BB3] ml-11">
          Monitor and track all important actions happening across CampusHub.
        </p>
      </header>

      {/* ── Filter Bar ── */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9BB3]" />
            <Input
              placeholder="Search activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#161A22] border-border/40 focus-visible:ring-primary/30 rounded-xl text-white placeholder:text-[#8F9BB3]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:flex lg:items-center lg:w-auto overflow-x-auto">
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="bg-[#161A22] border-border/40 rounded-xl text-white lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0F1117] border-border/40 text-white">
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={(v) => setAction(v as any)}>
              <SelectTrigger className="bg-[#161A22] border-border/40 rounded-xl text-white lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0F1117] border-border/40 text-white">
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resource} onValueChange={(v) => setResource(v as any)}>
              <SelectTrigger className="bg-[#161A22] border-border/40 rounded-xl text-white lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0F1117] border-border/40 text-white">
                {RESOURCE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
              <SelectTrigger className="bg-[#161A22] border-border/40 rounded-xl text-white lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0F1117] border-border/40 text-white">
                {DATE_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {showEmptyState ? (
        <Card className="border-dashed border-2 flex flex-col items-center justify-center min-h-[40vh] text-center p-8 space-y-6">
          <div className="h-20 w-20 rounded-full bg-secondary/20 flex items-center justify-center">
            <Inbox className="h-10 w-10 text-[#8F9BB3] opacity-60" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-bold tracking-tight text-white">No activity yet</h2>
            <p className="text-sm text-[#8F9BB3] leading-relaxed">
              Once activity happens across CampusHub, it will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          {/* ── Timeline (Left, ~70%) ── */}
          <div className="lg:col-span-7 space-y-8">
            {groups.length === 0 ? (
              <div className="text-center py-12 text-[#8F9BB3]">No activities match your search/filter.</div>
            ) : (
              groups.map((group) => (
                <div key={group} className="relative">
                  <div className="flex items-center gap-4 mb-5 relative z-10">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/20 shrink-0" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">{group}</h3>
                  </div>
                  <div className="absolute left-[5px] top-4 bottom-0 w-[2px] bg-border/30 -z-10" />

                  <div className="space-y-4 pl-8 relative z-10">
                    {groupedActivities[group].map((activity) => {
                      const cfg = getActivityConfig(activity.type);
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={activity.id}
                          className="group flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-3xl border border-border/30 bg-[#0F1117] shadow-lg hover:border-primary/30 hover:bg-[#141822] transition-all duration-300"
                        >
                          <div className={cn("shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center border", cfg.bg, cfg.color, cfg.border)}>
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <div className="h-6 w-6 rounded-full bg-secondary/40 flex items-center justify-center text-[10px] font-bold shrink-0 border border-border/40 text-white">
                                {activity.actorName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-white truncate">{activity.actorName}</span>
                              <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border", roleBadgeCls(activity.role))}>
                                {activity.role}
                              </span>
                              <span className="text-xs font-medium text-[#8F9BB3] sm:ml-auto">
                                {formatDistanceToNow(activity.rawDate, { addSuffix: true })}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className={cn("text-sm md:text-base leading-snug", cfg.color)}>{activity.title}</p>
                              {activity.description && (
                                <p className="text-xs md:text-sm text-[#8F9BB3] truncate">{activity.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Right: Activity Summary (~30%) ── */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold tracking-tight text-white">Activity Summary</h2>
                <div className="text-xs font-medium text-[#8F9BB3] flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                  All Time <ChevronDown className="h-3 w-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center gap-4 p-4 rounded-2xl border border-border/30 bg-[#161A22] overflow-hidden">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-extrabold leading-none truncate text-white">{summary.total}</p>
                    <p className="text-xs font-medium text-[#8F9BB3] mt-1 truncate">Total Activities</p>
                  </div>
                </div>

                {[
                  { label: "Approved", value: summary.approved, icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-400" },
                  { label: "Created", value: summary.created, icon: CalendarPlus, cls: "bg-blue-500/10 text-blue-400" },
                  { label: "Rejected", value: summary.rejected, icon: XCircle, cls: "bg-destructive/10 text-destructive" },
                  { label: "Updated", value: summary.updated, icon: Pencil, cls: "bg-orange-500/10 text-orange-400" },
                  { label: "Registered", value: summary.registered, icon: UserPlus, cls: "bg-violet-500/10 text-violet-400" },
                  { label: "Club Managers", value: summary.managers, icon: Users2, cls: "bg-cyan-500/10 text-cyan-400" },
                  { label: "Certificates Issued", value: summary.certificates, icon: Award, cls: "bg-purple-500/10 text-purple-400" },
                  { label: "Attendance Verified", value: summary.attendance, icon: QrCode, cls: "bg-cyan-500/10 text-cyan-400" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 bg-[#161A22] overflow-hidden">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", stat.cls)}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold leading-none truncate text-white">{stat.value}</p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-[#8F9BB3] mt-1 truncate" title={stat.label}>
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
