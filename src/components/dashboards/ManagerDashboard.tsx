import { CalendarPlus, Eye, Pencil, TrendingUp, Users, Megaphone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardCard, StatCard } from "@/components/DashboardCard";

const myEvents = [
  { title: "AI & Robotics Summit", date: "May 12", status: "Live", registrations: 162, capacity: 200 },
  { title: "Hackathon 2026", date: "Jun 04", status: "Draft", registrations: 0, capacity: 300 },
  { title: "Design Workshop", date: "May 28", status: "Approved", registrations: 48, capacity: 60 },
];

const statusStyles: Record<string, string> = {
  Live: "bg-accent/20 text-accent border-accent/40",
  Draft: "bg-muted text-muted-foreground border-border",
  Approved: "bg-primary/20 text-primary border-primary/40",
};

export const ManagerDashboard = () => (
  <div className="space-y-8">
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Tech Club · Manager</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Event Studio</h1>
        <p className="text-muted-foreground mt-1">Plan, publish, and track your club's events.</p>
      </div>
      <Button className="bg-gradient-primary text-primary-foreground border-0 gap-2 shadow-glow">
        <CalendarPlus className="h-4 w-4" /> New Event
      </Button>
    </header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Active Events" value={5} delta="+1 this month" icon={<Megaphone className="h-5 w-5" />} />
      <StatCard label="Total Attendees" value="1.2k" delta="+18%" icon={<Users className="h-5 w-5" />} />
      <StatCard label="Pending Approval" value={2} icon={<Clock className="h-5 w-5" />} />
      <StatCard label="Engagement" value="94%" delta="+4%" icon={<TrendingUp className="h-5 w-5" />} />
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      <DashboardCard title="My Events" subtitle="Manage upcoming activities" className="lg:col-span-2">
        <div className="divide-y divide-border/60">
          {myEvents.map((e) => {
            const pct = Math.round((e.registrations / e.capacity) * 100);
            return (
              <div key={e.title} className="py-4 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary/60 text-primary border border-border/60">
                  <CalendarPlus className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{e.title}</p>
                    <Badge variant="outline" className={statusStyles[e.status]}>{e.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.date} · {e.registrations}/{e.capacity} registered</p>
                  <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="hidden sm:flex gap-1">
                  <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard title="Quick Actions">
        <div className="grid gap-2">
          {["Send announcement", "Export attendees", "Request venue", "Invite co-host"].map((a) => (
            <button
              key={a}
              className="text-left px-4 py-3 rounded-xl bg-secondary/60 border border-border/60 hover:border-primary/40 hover:bg-secondary transition-colors text-sm"
            >
              {a}
            </button>
          ))}
        </div>
      </DashboardCard>
    </div>
  </div>
);