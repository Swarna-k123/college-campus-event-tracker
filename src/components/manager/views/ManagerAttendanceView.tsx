import { useState } from "react";
import { useManagerWorkspace, ManagerLoadingState } from "@/components/manager/ManagerWorkspace";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { statusMeta } from "@/components/manager/ManagerWorkspace";
import { registrationCount } from "@/data/managerEvents";
import { format } from "date-fns";
import { CheckCircle, QrCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "60 minutes", value: "60" },
  { label: "120 minutes", value: "120" },
];

function StartAttendancePopover({ eventId, isDisabled }: { eventId: string; isDisabled: boolean }) {
  const { startAttendanceSession, events } = useManagerWorkspace();
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const event = events.find((e) => e.id === eventId) ?? null;

  const handleStart = async () => {
    if (!event) return;
    setLoading(true);
    setOpen(false);
    await startAttendanceSession(event, parseInt(duration, 10));
    setLoading(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 border-0 text-primary-foreground shadow-glow"
          disabled={isDisabled || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <QrCode className="h-4 w-4" />
          )}
          Start Attendance
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-gradient-card border-border/60 shadow-2xl p-4" align="end">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Start QR Attendance</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A QR code will be displayed for students to scan and mark attendance automatically.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session Duration</p>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-secondary/60 border-border/60 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full gap-2 bg-gradient-primary hover:opacity-90 border-0 text-primary-foreground"
            onClick={() => void handleStart()}
          >
            <QrCode className="h-4 w-4" />
            Start Session
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const ManagerAttendanceView = () => {
  const { events, isLoading, error, setAttendanceEvent } = useManagerWorkspace();

  if (isLoading) return <ManagerLoadingState />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  const approvedEvents = events.filter((e) => e.status === "approved");
  const otherEvents = events.filter((e) => e.status !== "approved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground mt-2">
          Start a QR attendance session or manually manage attendance for your events.
        </p>
      </div>

      {/* Approved Events — QR Sessions available */}
      <DashboardCard
        title="Approved Events"
        subtitle="Start a QR session or manually manage attendance."
      >
        <div className="divide-y divide-border/60">
          {approvedEvents.map((e) => {
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
                    <CheckCircle className="h-4 w-4" /> Manual
                  </Button>
                  <StartAttendancePopover eventId={e.id} isDisabled={count === 0} />
                </div>
              </div>
            );
          })}
          {approvedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No approved events yet. Events must be approved before attendance can be taken.
            </p>
          )}
        </div>
      </DashboardCard>

      {/* Other Events — Manual only */}
      {otherEvents.length > 0 && (
        <DashboardCard title="Other Events" subtitle="Manual attendance only (pending/rejected events).">
          <div className="divide-y divide-border/60">
            {otherEvents.map((e) => {
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
          </div>
        </DashboardCard>
      )}
    </div>
  );
};
