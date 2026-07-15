import { useManagerWorkspace, ManagerLoadingState } from "@/components/manager/ManagerWorkspace";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusMeta } from "@/components/manager/ManagerWorkspace";
import { registrationCount } from "@/data/managerEvents";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ManagerAttendanceView = () => {
  const { events, isLoading, error, setAttendanceEvent } = useManagerWorkspace();

  if (isLoading) return <ManagerLoadingState />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground mt-2">
          Manage attendance for your events. Click on an event to mark student attendance.
        </p>
      </div>

      <DashboardCard title="Event Attendance Overview" subtitle="Click on an event to manage attendance.">
        <div className="divide-y divide-border/60">
          {events.map((e) => {
            const meta = statusMeta[e.status];
            const count = registrationCount(e);
            const pct = Math.min(100, Math.round((count / e.maxRegistrations) * 100));
            return (
              <div key={e.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <img src={e.poster} alt="" className="h-12 w-12 rounded-xl object-cover border border-border/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{e.title}</p>
                      <Badge variant="outline" className={cn("gap-1 shrink-0", meta.cls)}>
                        {meta.icon}{meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(e.date), "MMM d, yyyy, p")} · {count}/{e.maxRegistrations} registered
                    </p>
                    <div className="mt-2 h-1.5 w-full max-w-md rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAttendanceEvent(e)}
                    className="gap-1.5 border-border/60"
                    disabled={count === 0}
                  >
                    <CheckCircle className="h-4 w-4" /> Manage Attendance
                  </Button>
                </div>
              </div>
            );
          })}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No events yet. Create one to manage attendance.</p>
          )}
        </div>
      </DashboardCard>
    </div>
  );
};
