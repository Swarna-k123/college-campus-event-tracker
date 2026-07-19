import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Pencil, 
  FileText, 
  Award, 
  CalendarPlus, 
  MapPin,
  Search,
  Calendar,
  Activity,
  ChevronDown,
  Loader2,
  Inbox
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/DashboardCard";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";

type ActivityType = 'approval' | 'rejection' | 'update' | 'attendance' | 'certificate' | 'creation' | 'venue';

interface ActorInfo {
  name: string;
  role: "Club Manager" | "Administrator";
}

interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: ActorInfo;
  title: React.ReactNode;
  description: string;
  timeAgo: string;
  group: 'Today' | 'Yesterday' | 'This Week' | 'Earlier';
  timestamp: number;
  rawDate: Date;
  eventName: string;
}

const FILTERS = ["All Activities", "Events Created", "Event Updates", "Approvals", "Rejections", "Attendance", "Certificates"];

const getActivityConfig = (type: ActivityType) => {
  switch(type) {
    case 'approval': return { icon: CheckCircle2, bg: "bg-emerald-500/15", color: "text-emerald-500", border: "border-emerald-500/30" };
    case 'rejection': return { icon: XCircle, bg: "bg-destructive/15", color: "text-destructive", border: "border-destructive/30" };
    case 'update': return { icon: Pencil, bg: "bg-orange-500/15", color: "text-orange-500", border: "border-orange-500/30" };
    case 'attendance': return { icon: FileText, bg: "bg-sky-500/15", color: "text-sky-500", border: "border-sky-500/30" };
    case 'certificate': return { icon: Award, bg: "bg-green-500/15", color: "text-green-500", border: "border-green-500/30" };
    case 'creation': return { icon: CalendarPlus, bg: "bg-primary/15", color: "text-primary", border: "border-primary/30" };
    case 'venue': return { icon: MapPin, bg: "bg-amber-500/15", color: "text-amber-500", border: "border-amber-500/30" };
    default: return { icon: Activity, bg: "bg-secondary", color: "text-foreground", border: "border-border" };
  }
};

export const ManagerActivityView = () => {
  const [filter, setFilter] = useState("All Activities");
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const clubId = user?.clubId;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["manager-activities-ops", clubId],
    queryFn: async () => {
      if (!clubId) return [];

      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("club_id", clubId);

      if (eventsError) throw eventsError;
      const evts = events || [];

      const activityList: ActivityItem[] = [];

      evts.forEach((event) => {
        const managerActor: ActorInfo = { name: "Club Manager", role: "Club Manager" };
        const adminActor: ActorInfo = { name: "Administrator", role: "Administrator" };

        if (event.created_at) {
          activityList.push({
            id: `create-${event.id}`,
            type: "creation",
            actor: managerActor,
            title: <>Created <span className="text-primary font-bold">"{event.title}"</span></>,
            description: `Event Category: ${event.category}`,
            timestamp: new Date(event.created_at).getTime(),
            rawDate: new Date(event.created_at),
            eventName: event.title,
            timeAgo: '',
            group: 'Earlier'
          });
        }

        if (event.status === "approved" && (event.approved_at || event.updated_at)) {
          const approvedAt = event.approved_at || event.updated_at || event.created_at;
          activityList.push({
            id: `approve-${event.id}`,
            type: "approval",
            actor: adminActor,
            title: <>Approved <span className="text-emerald-500 font-bold">"{event.title}"</span></>,
            description: `Event is now live and accepting registrations.`,
            timestamp: new Date(approvedAt).getTime(),
            rawDate: new Date(approvedAt),
            eventName: event.title,
            timeAgo: '',
            group: 'Earlier'
          });
        }

        if (event.status === "rejected" && event.updated_at) {
          activityList.push({
            id: `reject-${event.id}`,
            type: "rejection",
            actor: adminActor,
            title: <>Rejected <span className="text-destructive font-bold">"{event.title}"</span></>,
            description: `Reason: ${event.rejection_reason || "Not specified"}`,
            timestamp: new Date(event.updated_at).getTime(),
            rawDate: new Date(event.updated_at),
            eventName: event.title,
            timeAgo: '',
            group: 'Earlier'
          });
        }
        
        if (event.updated_at && event.created_at && event.status !== "rejected") {
          const cTime = new Date(event.created_at).getTime();
          const uTime = new Date(event.updated_at).getTime();
          if (uTime - cTime > 10 * 60 * 1000) {
            activityList.push({
              id: `update-${event.id}-${uTime}`,
              type: "update",
              actor: managerActor,
              title: <>Updated details for <span className="text-orange-500 font-bold">"{event.title}"</span></>,
              description: "Changes made to event configuration, venue, or timing.",
              timestamp: uTime,
              rawDate: new Date(event.updated_at),
              eventName: event.title,
              timeAgo: '',
              group: 'Earlier'
            });
          }
        }
      });

      activityList.sort((a, b) => b.timestamp - a.timestamp);

      activityList.forEach((act) => {
        act.timeAgo = formatDistanceToNow(act.rawDate, { addSuffix: true });
        if (isToday(act.rawDate)) {
          act.group = "Today";
        } else if (isYesterday(act.rawDate)) {
          act.group = "Yesterday";
        } else if (isThisWeek(act.rawDate)) {
          act.group = "This Week";
        } else {
          act.group = "Earlier";
        }
      });

      return activityList;
    },
    enabled: !!clubId,
  });

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (filter !== "All Activities") {
        if (filter === "Events Created" && act.type !== "creation") return false;
        if (filter === "Event Updates" && act.type !== "update") return false;
        if (filter === "Approvals" && act.type !== "approval") return false;
        if (filter === "Rejections" && act.type !== "rejection") return false;
        if (filter === "Attendance" && act.type !== "attendance") return false;
        if (filter === "Certificates" && act.type !== "certificate") return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        if (!act.eventName.toLowerCase().includes(query) && !act.description.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [activities, filter, search]);

  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    if (!acc[activity.group]) acc[activity.group] = [];
    acc[activity.group].push(activity);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  const groups = ["Today", "Yesterday", "This Week", "Earlier"].filter(g => groupedActivities[g]?.length > 0);

  const summary = useMemo(() => {
    return {
      total: activities.length,
      approvals: activities.filter(a => a.type === "approval").length,
      creations: activities.filter(a => a.type === "creation").length,
      rejections: activities.filter(a => a.type === "rejection").length,
      updates: activities.filter(a => a.type === "update").length,
      certificates: activities.filter(a => a.type === "certificate").length,
    };
  }, [activities]);

  const topEvents = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach(act => {
      counts[act.eventName] = (counts[act.eventName] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    const colors = ["bg-primary", "bg-blue-500", "bg-orange-500", "bg-emerald-500"];
    
    return sorted.map((s, i) => ({
      name: s[0],
      count: s[1],
      max: max,
      color: colors[i % colors.length]
    }));
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm">Activity</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1.5">
            Track everything happening in your club.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search activities..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto gap-2 border-border/40 bg-secondary/20 hover:bg-secondary/40 rounded-xl px-4 font-medium">
                Filter: <span className="text-foreground">{filter}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border-border/50 rounded-xl shadow-xl">
              <DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
                {FILTERS.map(f => (
                  <DropdownMenuRadioItem key={f} value={f} className="rounded-lg cursor-pointer">{f}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showEmptyState ? (
        <DashboardCard className="border-dashed border-2 border-border/60 bg-transparent flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-6">
          <div className="h-20 w-20 rounded-full bg-secondary/40 flex items-center justify-center">
            <Inbox className="h-10 w-10 text-muted-foreground opacity-60" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">No club activity yet</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once your club starts creating events and managing activities, they will appear here.
            </p>
          </div>
          <Button className="rounded-xl px-6" onClick={() => window.location.href = '/manager-dashboard/create'}>
            Create First Event
          </Button>
        </DashboardCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* ── Timeline Section (Left) ── */}
          <div className="lg:col-span-2 space-y-8">
            {groups.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground">No activities match your search/filter.</div>
            ) : (
              groups.map((group) => (
                <div key={group} className="relative">
                  {/* Group Title with Timeline dot */}
                  <div className="flex items-center gap-4 mb-5 relative z-10">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/20 shrink-0" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{group}</h3>
                  </div>

                  {/* Timeline Connector Line */}
                  <div className="absolute left-[5px] top-4 bottom-0 w-[2px] bg-border/40 -z-10" />

                  <div className="space-y-4 pl-8 relative z-10">
                    {groupedActivities[group].map((activity) => {
                      const cfg = getActivityConfig(activity.type);
                      const Icon = cfg.icon;
                      return (
                        <div 
                          key={activity.id} 
                          className="group flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-3xl border border-border/30 bg-gradient-card shadow-soft hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                        >
                          {/* Icon */}
                          <div className={cn("shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center border", cfg.bg, cfg.color, cfg.border)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-3">
                            
                            {/* Actor Info */}
                            <div className="flex items-center gap-2.5">
                              <div className="h-6 w-6 rounded-full bg-secondary/80 flex items-center justify-center text-[10px] font-bold shrink-0 border border-border/50 text-foreground shadow-sm">
                                {activity.actor.name.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold text-foreground truncate">{activity.actor.name}</span>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full border border-border/30">
                                {activity.actor.role}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm md:text-base text-foreground leading-snug group-hover:text-primary transition-colors duration-300">
                                {activity.title}
                              </p>
                              {activity.description && (
                                <p className="text-xs md:text-sm text-muted-foreground/80 truncate">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div className="shrink-0 text-xs font-semibold text-muted-foreground/60 sm:ml-auto pt-1">
                            {activity.timeAgo}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-6">
            {/* Summary Card */}
            <DashboardCard>
              <div className="p-1">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold tracking-tight">Activity Summary</h2>
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                    All Time <ChevronDown className="h-3 w-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Total */}
                  <div className="col-span-2 flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-2xl font-extrabold leading-none truncate">{summary.total}</p>
                      <p className="text-xs font-medium text-muted-foreground mt-1 truncate">Total Activities</p>
                    </div>
                  </div>

                  {/* Approvals */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold leading-none truncate">{summary.approvals}</p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1 truncate" title="Approvals">Approvals</p>
                    </div>
                  </div>

                  {/* Creations */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <CalendarPlus className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold leading-none truncate">{summary.creations}</p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1 truncate" title="Events Created">Creations</p>
                    </div>
                  </div>

                  {/* Rejections */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold leading-none truncate">{summary.rejections}</p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1 truncate" title="Rejections">Rejections</p>
                    </div>
                  </div>

                  {/* Updates */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <Pencil className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold leading-none truncate">{summary.updates}</p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1 truncate" title="Updates">Updates</p>
                    </div>
                  </div>

                  {/* Certificates */}
                  <div className="col-span-2 flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-bold leading-none truncate">{summary.certificates}</p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1 truncate" title="Certificates Generated">Certificates</p>
                    </div>
                  </div>
                </div>
              </div>
            </DashboardCard>

            {/* Top Active Events Card */}
            {topEvents.length > 0 && (
              <DashboardCard>
                <div className="p-1">
                  <h2 className="text-lg font-bold tracking-tight mb-5">Top Active Events</h2>
                  <div className="space-y-5">
                    {topEvents.map((event, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-semibold text-foreground truncate">{event.name}</span>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">{event.count} activities</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-1000", event.color)}
                            style={{ width: `${(event.count / event.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DashboardCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
