import { Activity, CheckCircle2, ShieldCheck, Users, Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardCard, StatCard } from "@/components/DashboardCard";

const approvals = [
  { title: "Hackathon 2026", club: "Tech Club", submitted: "2h ago" },
  { title: "Cultural Night", club: "Arts Society", submitted: "5h ago" },
  { title: "Marathon 5K", club: "Sports Club", submitted: "1d ago" },
];

const activity = [
  { who: "Tech Club", what: "published AI & Robotics Summit", when: "10m" },
  { who: "Admin", what: "approved Design Workshop", when: "1h" },
  { who: "Music Society", what: "added 12 new members", when: "3h" },
  { who: "E-Cell", what: "updated Pitch Night venue", when: "5h" },
];

export const AdminDashboard = () => (
  <div className="space-y-8">
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
          <ShieldCheck className="h-3.5 w-3.5" /> Administrator
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">Campus Control Center</h1>
        <p className="text-muted-foreground mt-1">System-wide events, clubs, and user oversight.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="border-border/60">Export Report</Button>
        <Button className="bg-gradient-primary text-primary-foreground border-0">Settings</Button>
      </div>
    </header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Users" value="4,820" delta="+312 this month" icon={<Users className="h-5 w-5" />} />
      <StatCard label="Active Clubs" value={42} delta="+3" icon={<Building2 className="h-5 w-5" />} />
      <StatCard label="Events Hosted" value={186} delta="+24" icon={<Activity className="h-5 w-5" />} />
      <StatCard label="Open Issues" value={3} icon={<AlertTriangle className="h-5 w-5" />} />
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      <DashboardCard title="Pending Approvals" subtitle="Events awaiting review" className="lg:col-span-2">
        <div className="space-y-3">
          {approvals.map((a) => (
            <div
              key={a.title}
              className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border/60 hover:border-primary/40 transition-colors"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary/20 text-primary border border-primary/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.club} · submitted {a.submitted}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost">Reject</Button>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground border-0">Approve</Button>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Recent Activity">
        <ul className="space-y-4">
          {activity.map((a, i) => (
            <li key={i} className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-gradient-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{a.who}</span>{" "}
                  <span className="text-muted-foreground">{a.what}</span>
                </p>
                <p className="text-xs text-muted-foreground">{a.when} ago</p>
              </div>
            </li>
          ))}
        </ul>
      </DashboardCard>
    </div>

    <DashboardCard title="Top Clubs" subtitle="Ranked by engagement this month">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {["Tech Club", "Music Society", "E-Cell", "Sports Club"].map((c, i) => (
          <div key={c} className="p-4 rounded-xl bg-secondary/50 border border-border/60">
            <Badge variant="outline" className="border-primary/40 text-primary">#{i + 1}</Badge>
            <p className="font-semibold mt-2">{c}</p>
            <p className="text-xs text-muted-foreground mt-1">{120 - i * 18} events · {98 - i * 5}% rating</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  </div>
);