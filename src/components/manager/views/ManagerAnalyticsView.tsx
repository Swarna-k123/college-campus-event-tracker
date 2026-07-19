import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { 
  Calendar, Users, CheckCircle2, Award, 
  ChevronDown, TrendingUp, AlertCircle, LayoutDashboard, CalendarX
} from "lucide-react";
import { useManagerWorkspace, ManagerLoadingState } from "@/components/manager/ManagerWorkspace";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { registrationCount } from "@/data/managerEvents";

// Reusable card styling for the dark SaaS theme with hover lift & glow
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("group rounded-2xl border border-border/40 bg-[#0F1117] shadow-lg backdrop-blur-xl hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300", className)}>
    {children}
  </div>
);

const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
  <div className="flex flex-col items-center justify-center text-muted-foreground w-full h-full py-12 absolute inset-0">
    <div className="h-12 w-12 rounded-full bg-secondary/30 flex items-center justify-center mb-3">
      <Icon className="h-6 w-6 opacity-50" />
    </div>
    <p className="text-sm font-medium opacity-80">{message}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1C1F26] border border-border/50 p-3 rounded-xl shadow-2xl">
        <p className="text-muted-foreground text-xs mb-1 font-medium">{label}</p>
        <p className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {payload[0].value} Registrations
        </p>
      </div>
    );
  }
  return null;
};

export const ManagerAnalyticsView = () => {
  const { events, managerClubId, stats, isLoading: workspaceLoading, error: workspaceError } = useManagerWorkspace();
  const [trendFilter, setTrendFilter] = useState<"7d" | "30d">("7d");

  // Certificates Issued Query
  const { data: certificatesCount = 0, isLoading: certsLoading } = useQuery({
    queryKey: ["manager-analytics-certs", managerClubId],
    enabled: !!managerClubId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_registrations")
        .select("id, events!inner(club_id, certificates_enabled)", { count: "exact", head: true })
        .eq("events.club_id", managerClubId)
        .eq("status", "PRESENT")
        .eq("events.certificates_enabled", true);
      
      if (error) throw error;
      return count ?? 0;
    }
  });

  // Registration Trend Query
  const daysToFetch = trendFilter === "7d" ? 7 : 30;
  const { data: trendData = [], isLoading: trendLoading } = useQuery({
    queryKey: ["manager-analytics-trend", managerClubId, trendFilter],
    enabled: !!managerClubId,
    queryFn: async () => {
      const startDate = subDays(new Date(), daysToFetch - 1);
      
      const { data, error } = await supabase
        .from("event_registrations")
        .select("created_at, events!inner(club_id)")
        .eq("events.club_id", managerClubId)
        .gte("created_at", startOfDay(startDate).toISOString());
      
      if (error) throw error;

      // Initialize all days in interval with 0
      const days = eachDayOfInterval({ start: startDate, end: new Date() });
      const countsByDay = new Map(days.map(d => [format(d, "MMM dd"), 0]));

      data?.forEach(reg => {
        const dateStr = format(new Date(reg.created_at), "MMM dd");
        if (countsByDay.has(dateStr)) {
          countsByDay.set(dateStr, countsByDay.get(dateStr)! + 1);
        }
      });

      return Array.from(countsByDay.entries()).map(([date, count]) => ({
        date,
        count
      }));
    }
  });

  // Category Distribution
  const categoryData = useMemo(() => {
    const counts = events.reduce((acc, e) => {
      const cat = e.category || "Others";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [events]);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

  // Top Performing Events (ONLY APPROVED)
  const topEvents = useMemo(() => {
    return events
      .filter(e => e.status === "approved")
      .sort((a, b) => registrationCount(b) - registrationCount(a))
      .slice(0, 5);
  }, [events]);

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
  const isLoading = workspaceLoading || certsLoading || trendLoading;

  if (isLoading) return <ManagerLoadingState />;
  if (workspaceError) return <p className="text-sm text-destructive">{workspaceError.message}</p>;

  return (
    <div className="space-y-8 pb-10">
      {/* Header matching the premium feel */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Analytics Overview 🚀</h1>
        <p className="text-[#8F9BB3]">Here's what's happening with your club events today.</p>
      </div>

      {/* SECTION 1: KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center transition-colors group-hover:bg-blue-500/20">
              <Calendar className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <p className="text-sm font-medium text-[#8F9BB3]">Total Events</p>
          </div>
          <p className="text-3xl font-bold text-white group-hover:text-blue-50 transition-colors">{stats.total.toLocaleString()}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center transition-colors group-hover:bg-emerald-500/20">
              <Users className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <p className="text-sm font-medium text-[#8F9BB3]">Total Registrations</p>
          </div>
          <p className="text-3xl font-bold text-white group-hover:text-emerald-50 transition-colors">{stats.registrations.toLocaleString()}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center transition-colors group-hover:bg-violet-500/20">
              <CheckCircle2 className="h-5 w-5 text-violet-500 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <p className="text-sm font-medium text-[#8F9BB3]">Approval Rate</p>
          </div>
          <p className="text-3xl font-bold text-white group-hover:text-violet-50 transition-colors">{approvalRate}%</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center transition-colors group-hover:bg-orange-500/20">
              <Award className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <p className="text-sm font-medium text-[#8F9BB3]">Certificates Issued</p>
          </div>
          <p className="text-3xl font-bold text-white group-hover:text-orange-50 transition-colors">{certificatesCount.toLocaleString()}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 2: REGISTRATION TREND */}
        <Card className="p-6 lg:col-span-2 flex flex-col relative min-h-[350px]">
          <div className="flex items-center justify-between mb-8 z-10">
            <h3 className="font-semibold text-lg text-white">Registration Trend</h3>
            <div className="relative">
              <select 
                value={trendFilter} 
                onChange={(e) => setTrendFilter(e.target.value as "7d" | "30d")}
                className="appearance-none bg-[#1C1F26] border border-border/40 text-[#8F9BB3] hover:text-white transition-colors text-sm py-1.5 pl-3 pr-8 rounded-lg outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <ChevronDown className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8F9BB3] pointer-events-none" />
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            {trendData.length > 0 && trendData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8F9BB3', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8F9BB3', fontSize: 12 }}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCount)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981', className: "drop-shadow-lg" }}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={TrendingUp} message="No registrations yet" />
            )}
          </div>
        </Card>

        {/* SECTION 3: EVENT CATEGORY DISTRIBUTION */}
        <Card className="p-6 flex flex-col relative min-h-[350px]">
          <h3 className="font-semibold text-lg text-white mb-6 z-10">Category Distribution</h3>
          
          <div className="flex-1 w-full flex items-center justify-center relative">
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%" className="min-h-[220px]">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1000}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1C1F26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-white">{events.length}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8F9BB3]">Events</span>
                </div>
              </>
            ) : (
              <EmptyState icon={LayoutDashboard} message="No categories available" />
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-y-3 gap-x-2 z-10">
            {categoryData.slice(0, 6).map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-2 group/legend">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover/legend:scale-125" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-[#8F9BB3] group-hover/legend:text-white transition-colors truncate">{entry.name}</span>
                <span className="text-xs text-white ml-auto font-medium">{Math.round((entry.value / events.length) * 100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* SECTION 4: TOP PERFORMING EVENTS */}
      <Card className="p-0 overflow-hidden !hover:translate-y-0 !hover:shadow-lg !hover:border-border/40 relative min-h-[300px]">
        <div className="p-6 border-b border-border/40">
          <h3 className="font-semibold text-lg text-white">Top Performing Events</h3>
        </div>
        
        <div className="w-full overflow-x-auto">
          {topEvents.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#8F9BB3] uppercase bg-[#1C1F26]/50">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">#</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Event Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Registrations</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {topEvents.map((event, index) => {
                  const regCount = registrationCount(event);
                  return (
                    <tr key={event.id} className="group/row hover:-translate-y-[2px] hover:shadow-lg hover:shadow-primary/5 hover:bg-[#1C1F26] transition-all duration-250 cursor-pointer">
                      <td className="px-6 py-4 text-[#8F9BB3] font-medium group-hover/row:text-white transition-colors">{index + 1}</td>
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-4">
                        <div className="w-9 h-9 rounded-md shrink-0 overflow-hidden bg-secondary/30 shadow-inner">
                          <img src={event.poster} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover/row:scale-110" />
                        </div>
                        <span className="truncate max-w-[200px] sm:max-w-xs group-hover/row:text-primary transition-colors duration-250">{event.title}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                        <div className="inline-block transform group-hover/row:scale-110 transition-transform duration-250 origin-right">
                          {regCount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md text-emerald-400 bg-emerald-400/10 transition-shadow duration-250 group-hover/row:shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="absolute inset-0 pt-20">
              <EmptyState icon={CalendarX} message="No approved events available" />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
