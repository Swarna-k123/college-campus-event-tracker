import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, CalendarClock, ClipboardList, CheckCircle2, TrendingUp, LayoutDashboard,
  AlertCircle, ChevronDown, QrCode, PenLine, Loader2, Bell, Building2, XCircle, UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ── shared presentational helpers ──────────────────────────────────────────

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("group rounded-2xl border border-border/40 bg-[#0F1117] shadow-lg backdrop-blur-xl transition-all duration-300", className)}>
    {children}
  </div>
);

const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
  <div className="flex flex-col items-center justify-center text-muted-foreground w-full h-full py-12">
    <div className="h-12 w-12 rounded-full bg-secondary/30 flex items-center justify-center mb-3">
      <Icon className="h-6 w-6 opacity-50" />
    </div>
    <p className="text-sm font-medium opacity-80">{message}</p>
  </div>
);

const statusMeta: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  rejected: { label: "Rejected", cls: "bg-destructive/20 text-destructive border-destructive/50" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Technical: "#8B5CF6",
  Cultural: "#EC4899",
  Sports: "#F59E0B",
  Hackathons: "#3B82F6",
  Workshops: "#10B981",
  Others: "#06B6D4",
};
const FALLBACK_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#3B82F6", "#10B981", "#06B6D4"];
const colorFor = (name: string, idx: number) => CATEGORY_COLORS[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

const TrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1C1F26] border border-border/50 p-3 rounded-xl shadow-2xl">
        <p className="text-muted-foreground text-xs mb-1 font-medium">{label}</p>
        <p className="text-primary font-bold text-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {payload[0].value} Registrations
        </p>
      </div>
    );
  }
  return null;
};

type DateRangeFilter = "all" | "30d" | "7d";
type CategoryFilter = "All Categories" | "Technical" | "Cultural" | "Sports" | "Hackathons" | "Workshops";

const CATEGORY_OPTIONS: CategoryFilter[] = ["All Categories", "Technical", "Cultural", "Sports", "Hackathons", "Workshops"];

export const AdminAnalyticsView = () => {
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("All Categories");

  // ── Core dataset: all events with registration + attendance counts ──────
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ["admin-analytics-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, category, status, max_registrations, created_at, clubs(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: totalStudents = 0, isLoading: studentsLoading } = useQuery({
    queryKey: ["admin-analytics-students"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student");
      return count ?? 0;
    },
  });

  const { data: registrationRows = [], isLoading: regsLoading } = useQuery({
    queryKey: ["admin-analytics-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_registrations").select("id, event_id, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attendanceRows = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["admin-analytics-attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("id, event_id, status, attendance_session_id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["admin-analytics-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, created_at, approved_at, clubs(name), profiles!events_created_by_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data || []).map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        timestamp: e.approved_at && e.status !== "pending" ? e.approved_at : e.created_at,
        clubName: e.clubs?.name ?? "Unknown Club",
        managerName: e.profiles?.full_name ?? "Unknown Manager",
      }));
    },
  });

  const isLoading = eventsLoading || studentsLoading || regsLoading || attendanceLoading || activitiesLoading;

  // ── Filtering (category filter applies to events + derived metrics) ─────
  const filteredEvents = useMemo(() => {
    if (category === "All Categories") return events;
    return events.filter((e) => (e.category || "").toLowerCase() === category.toLowerCase());
  }, [events, category]);

  const filteredEventIds = useMemo(() => new Set(filteredEvents.map((e) => e.id)), [filteredEvents]);

  const filteredRegs = useMemo(
    () => registrationRows.filter((r) => filteredEventIds.has(r.event_id)),
    [registrationRows, filteredEventIds]
  );

  const filteredAttendance = useMemo(
    () => attendanceRows.filter((a) => filteredEventIds.has(a.event_id)),
    [attendanceRows, filteredEventIds]
  );

  // ── KPI computations ─────────────────────────────────────────────────────
  const totalEvents = filteredEvents.length;
  const totalRegistrations = filteredRegs.length;
  const presentCount = filteredAttendance.filter((a) => a.status === "PRESENT").length;
  const attendanceRate = filteredAttendance.length > 0 ? Math.round((presentCount / filteredAttendance.length) * 100) : 0;

  // ── Registration Trend ───────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const startDate = subDays(new Date(), days - 1);
    const interval = eachDayOfInterval({ start: startDate, end: new Date() });
    const counts = new Map(interval.map((d) => [format(d, "MMM dd"), 0]));

    filteredRegs.forEach((r) => {
      if (dateRange !== "all" && new Date(r.created_at) < startOfDay(startDate)) return;
      const key = format(new Date(r.created_at), "MMM dd");
      if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
    });

    return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
  }, [filteredRegs, dateRange]);

  // ── Events by Category ───────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const counts = filteredEvents.reduce((acc, e) => {
      const cat = e.category || "Others";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredEvents]);

  // ── Most Registered Events ───────────────────────────────────────────────
  const regCountByEvent = useMemo(() => {
    const map = new Map<string, number>();
    registrationRows.forEach((r) => map.set(r.event_id, (map.get(r.event_id) || 0) + 1));
    return map;
  }, [registrationRows]);

  const mostRegisteredEvents = useMemo(() => {
    return filteredEvents
      .map((e) => ({
        ...e,
        regCount: regCountByEvent.get(e.id) || 0,
        fillPct: e.max_registrations > 0 ? Math.min(100, Math.round(((regCountByEvent.get(e.id) || 0) / e.max_registrations) * 100)) : 0,
      }))
      .sort((a, b) => b.regCount - a.regCount)
      .slice(0, 8);
  }, [filteredEvents, regCountByEvent]);

  // ── Attendance breakdown (QR vs Manual) ──────────────────────────────────
  const qrAttendance = filteredAttendance.filter((a) => !!a.attendance_session_id).length;
  const manualAttendance = filteredAttendance.length - qrAttendance;
  const absentCount = filteredAttendance.length - presentCount;

  if (eventsError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm">{(eventsError as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Overview of campus events, registrations and attendance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              className="appearance-none bg-[#1C1F26] border border-border/40 text-[#8F9BB3] hover:text-white transition-colors text-sm py-2 pl-3 pr-8 rounded-lg outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <ChevronDown className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F9BB3] pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryFilter)}
              className="appearance-none bg-[#1C1F26] border border-border/40 text-[#8F9BB3] hover:text-white transition-colors text-sm py-2 pl-3 pr-8 rounded-lg outline-none focus:border-primary/50 cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F9BB3] pointer-events-none" />
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Total Students", value: totalStudents.toLocaleString(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Total Events", value: totalEvents.toLocaleString(), icon: CalendarClock, color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { label: "Total Registrations", value: totalRegistrations.toLocaleString(), icon: ClipboardList, color: "text-pink-400", bg: "bg-pink-500/10" },
              { label: "Overall Attendance Rate", value: `${attendanceRate}%`, icon: CheckCircle2, color: "text-orange-400", bg: "bg-orange-500/10" },
            ].map((kpi) => (
              <Card key={kpi.label} className="p-5 sm:p-6 hover:-translate-y-1 hover:border-primary/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", kpi.bg)}>
                    <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white leading-none">{kpi.value}</p>
                <p className="text-xs sm:text-sm text-[#8F9BB3] mt-2">{kpi.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* REGISTRATION TREND */}
            <Card className="p-6 lg:col-span-2 flex flex-col relative min-h-[350px]">
              <h3 className="font-semibold text-lg text-white mb-8">Registration Trend</h3>
              <div className="flex-1 w-full relative">
                {trendData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="adminAnalyticsColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#8F9BB3", fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8F9BB3", fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip content={<TrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#adminAnalyticsColor)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={TrendingUp} message="No registrations in this period" />
                )}
              </div>
            </Card>

            {/* EVENTS BY CATEGORY */}
            <Card className="p-6 flex flex-col relative min-h-[350px]">
              <h3 className="font-semibold text-lg text-white mb-6">Events by Category</h3>
              <div className="flex-1 w-full flex items-center justify-center relative">
                {categoryData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%" className="min-h-[200px]">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          animationDuration={800}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={entry.name} fill={colorFor(entry.name, index)} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#1C1F26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                          itemStyle={{ color: "#fff", fontSize: "13px", fontWeight: 500 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-extrabold text-white">{totalEvents}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8F9BB3]">Events</span>
                    </div>
                  </>
                ) : (
                  <EmptyState icon={LayoutDashboard} message="No events yet" />
                )}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-y-3 gap-x-2">
                {categoryData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorFor(entry.name, i) }} />
                    <span className="text-xs text-[#8F9BB3] truncate">{entry.name}</span>
                    <span className="text-xs text-white ml-auto font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MOST REGISTERED EVENTS */}
            <Card className="p-0 overflow-hidden lg:col-span-2 relative min-h-[300px]">
              <div className="p-6 border-b border-border/40">
                <h3 className="font-semibold text-lg text-white">Most Registered Events</h3>
              </div>
              <div className="w-full overflow-x-auto">
                {mostRegisteredEvents.length > 0 ? (
                  <table className="w-full text-sm text-left min-w-[560px]">
                    <thead className="text-xs text-[#8F9BB3] uppercase bg-[#1C1F26]/50">
                      <tr>
                        <th className="px-5 py-3 font-semibold tracking-wider">Event</th>
                        <th className="px-5 py-3 font-semibold tracking-wider">Category</th>
                        <th className="px-5 py-3 font-semibold tracking-wider text-right">Regs</th>
                        <th className="px-5 py-3 font-semibold tracking-wider">Fill %</th>
                        <th className="px-5 py-3 font-semibold tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {mostRegisteredEvents.map((event) => {
                        const meta = statusMeta[event.status] ?? statusMeta.pending;
                        return (
                          <tr key={event.id} className="hover:bg-[#1C1F26] transition-colors">
                            <td className="px-5 py-3.5 font-medium text-white max-w-[180px]">
                              <div className="flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorFor(event.category || "Others", 0) }} />
                                <span className="truncate">{event.title}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-[#8F9BB3] whitespace-nowrap">{event.category}</td>
                            <td className="px-5 py-3.5 text-right font-semibold text-white">{event.regCount}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2 min-w-[90px]">
                                <div className="h-1.5 w-16 rounded-full bg-secondary/60 overflow-hidden shrink-0">
                                  <div
                                    className={cn("h-full rounded-full", event.fillPct >= 100 ? "bg-emerald-500" : "bg-primary")}
                                    style={{ width: `${event.fillPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-[#8F9BB3]">{event.fillPct}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className={cn("inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border", meta.cls)}>
                                {meta.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState icon={ClipboardList} message="No events available" />
                )}
              </div>
            </Card>

            {/* ATTENDANCE OVERVIEW */}
            <Card className="p-6 flex flex-col relative min-h-[300px]">
              <h3 className="font-semibold text-lg text-white mb-6">Attendance Overview</h3>
              <div className="flex-1 w-full flex items-center justify-center relative">
                {filteredAttendance.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%" className="min-h-[160px]">
                      <PieChart>
                        <Pie
                          data={[{ name: "Present", value: presentCount }, { name: "Absent", value: absentCount }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: "#1C1F26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-extrabold text-white">{attendanceRate}%</span>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8F9BB3]">Attendance</span>
                    </div>
                  </>
                ) : (
                  <EmptyState icon={CheckCircle2} message="No attendance marked yet" />
                )}
              </div>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-[#8F9BB3]">Present</span><span className="text-white font-medium">{presentCount}</span></div>
                <div className="flex justify-between"><span className="text-[#8F9BB3]">Absent</span><span className="text-white font-medium">{absentCount}</span></div>
                <div className="flex justify-between"><span className="text-[#8F9BB3]">Total Marked</span><span className="text-white font-medium">{filteredAttendance.length}</span></div>
                <div className="h-px bg-border/30 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-[#8F9BB3] flex items-center gap-1.5"><QrCode className="h-3.5 w-3.5" /> QR Attendance</span>
                  <span className="text-white font-medium">{qrAttendance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8F9BB3] flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" /> Manual Attendance</span>
                  <span className="text-white font-medium">{manualAttendance}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* RECENT ACTIVITY */}
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border/40">
              <h3 className="font-semibold text-lg text-white">Recent Activity</h3>
            </div>
            <div className="p-2">
              {recentActivities.length > 0 ? (
                <div className="divide-y divide-border/20">
                  {recentActivities.map((activity) => {
                    const isApproved = activity.status === "approved";
                    const isRejected = activity.status === "rejected";
                    const Icon = isApproved ? CheckCircle2 : isRejected ? XCircle : Bell;
                    const iconColor = isApproved ? "text-emerald-400 bg-emerald-500/10" : isRejected ? "text-rose-400 bg-rose-500/10" : "text-amber-400 bg-amber-500/10";
                    return (
                      <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-[#1A1D24] transition-colors rounded-xl">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", iconColor)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">
                            <span className="font-medium">{activity.title}</span>{" "}
                            {isApproved ? "was approved" : isRejected ? "was rejected" : "was submitted for approval"}
                          </p>
                          <p className="text-xs text-[#8F9BB3] mt-0.5 flex items-center gap-1.5 truncate">
                            <Building2 className="h-3 w-3 shrink-0" /> {activity.clubName}
                            <span>•</span>
                            {activity.managerName}
                          </p>
                        </div>
                        <span className="text-xs text-[#8F9BB3] shrink-0">{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={UserPlus} message="No recent activity" />
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
