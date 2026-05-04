import { Calendar, MapPin, Search, Ticket, Users, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DashboardCard, StatCard } from "@/components/DashboardCard";

const events = [
  { title: "AI & Robotics Summit", club: "Tech Club", date: "May 12 · 4:00 PM", venue: "Auditorium A", tag: "Tech", spots: 38 },
  { title: "Spring Music Festival", club: "Music Society", date: "May 18 · 6:30 PM", venue: "Open Grounds", tag: "Culture", spots: 120 },
  { title: "Startup Pitch Night", club: "E-Cell", date: "May 22 · 5:00 PM", venue: "Innovation Lab", tag: "Business", spots: 24 },
  { title: "Photography Walk", club: "Lens Club", date: "May 25 · 7:00 AM", venue: "Old Quad", tag: "Arts", spots: 15 },
];

export const StudentDashboard = () => (
  <div className="space-y-8">
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Aarav Sharma 👋</h1>
        <p className="text-muted-foreground mt-1">Discover what's happening on campus this week.</p>
      </div>
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search events, clubs..." className="pl-9 bg-secondary/60 border-border/60" />
      </div>
    </header>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Registered" value={6} delta="+2 this week" icon={<Ticket className="h-5 w-5" />} />
      <StatCard label="Upcoming" value={3} icon={<Calendar className="h-5 w-5" />} />
      <StatCard label="Clubs Joined" value={4} icon={<Users className="h-5 w-5" />} />
      <StatCard label="Saved" value={9} icon={<Bookmark className="h-5 w-5" />} />
    </div>

    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Featured Events</h2>
        <Button variant="ghost" size="sm">View all</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {events.map((e) => (
          <DashboardCard key={e.title} className="flex flex-col gap-3">
            <div className="aspect-[4/3] rounded-xl bg-gradient-primary/30 border border-border/60 grid place-items-center text-primary">
              <Calendar className="h-8 w-8 opacity-70" />
            </div>
            <Badge variant="secondary" className="self-start bg-secondary/80">{e.tag}</Badge>
            <div>
              <h3 className="font-semibold leading-snug">{e.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{e.club}</p>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {e.date}</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {e.venue}</p>
            </div>
            <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 border-0">
              Register · {e.spots} left
            </Button>
          </DashboardCard>
        ))}
      </div>
    </section>
  </div>
);