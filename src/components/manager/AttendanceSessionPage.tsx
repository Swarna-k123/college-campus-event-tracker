import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "react-qr-code";
import { X, Users, CheckCircle2, XCircle, Clock, Radio, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  buildAttendanceUrl,
  deactivateAttendanceSession,
  fetchSessionStats,
  type SessionStats,
} from "@/lib/attendanceSessions";
import type { ManagerDashboardEvent } from "@/components/manager/ManagerWorkspace";

type Props = {
  event: ManagerDashboardEvent;
  sessionId: string;
  sessionToken: string;
  expiresAt: string;
  onEnd: () => void;
};

function useCountdown(expiresAt: string, onExpired: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    return diff;
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpired();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onExpired();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  return { secondsLeft, hours, minutes, seconds };
}

export const AttendanceSessionPage = ({ event, sessionId, sessionToken, expiresAt, onEnd }: Props) => {
  const qrUrl = buildAttendanceUrl(sessionToken);
  const [stats, setStats] = useState<SessionStats>({ registered: 0, present: 0, absent: 0, percentage: 0 });
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const isMounted = useRef(true);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchSessionStats(sessionId, event.id);
      if (isMounted.current) setStats(s);
    } catch {
      // silently fail — stats are non-critical
    }
  }, [sessionId, event.id]);

  // Initial load
  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Realtime subscription on the attendance table for this event
  useEffect(() => {
    isMounted.current = true;

    const channel = supabase
      .channel(`attendance-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          void loadStats();
        }
      )
      .subscribe((status) => {
        if (isMounted.current) {
          setIsRealtimeConnected(status === "SUBSCRIBED");
        }
      });

    // Fallback polling every 5 seconds (in case realtime fails)
    const pollInterval = setInterval(() => {
      void loadStats();
    }, 5000);

    return () => {
      isMounted.current = false;
      void supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId, event.id, loadStats]);

  const handleExpired = useCallback(() => {
    toast.info("Attendance session has expired automatically.");
    onEnd();
  }, [onEnd]);

  const { hours, minutes, seconds, secondsLeft } = useCountdown(expiresAt, handleExpired);

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await deactivateAttendanceSession(sessionId);
      toast.success("Attendance session ended.");
      onEnd();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end session");
      setIsEnding(false);
    }
  };

  const isUrgent = secondsLeft < 300; // < 5 minutes

  const timeDisplay =
    hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-auto">
      {/* ── Ambient glow background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      {/* ── Top bar ── */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold text-emerald-400">LIVE</span>
          </div>
          <div className="h-4 w-px bg-border/60" />
          <p className="text-sm text-muted-foreground font-medium line-clamp-1 max-w-[200px] sm:max-w-none">
            {event.title}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Realtime status */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isRealtimeConnected ? (
              <><Wifi className="h-3.5 w-3.5 text-emerald-400" /><span className="hidden sm:inline">Live</span></>
            ) : (
              <><WifiOff className="h-3.5 w-3.5 text-amber-400" /><span className="hidden sm:inline">Polling</span></>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleEndSession()}
            disabled={isEnding}
            className="gap-2 bg-destructive/80 hover:bg-destructive"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">End Attendance</span>
            <span className="sm:hidden">End</span>
          </Button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 p-6 sm:p-8">

        {/* Left: QR Code */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-1">
              Scan to Mark Attendance
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground line-clamp-2 max-w-sm text-center">
              {event.title}
            </h1>
          </div>

          {/* QR Code container */}
          <div className="relative group">
            {/* Glow ring */}
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
            <div className="relative rounded-2xl bg-white p-5 sm:p-7 shadow-2xl border border-white/20">
              <QRCode
                value={qrUrl}
                size={240}
                level="H"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center max-w-[280px] leading-relaxed">
            Students scan this code to mark their attendance automatically
          </p>
        </div>

        {/* Right: Stats + Timer */}
        <div className="flex flex-col gap-6 w-full max-w-sm lg:max-w-xs">

          {/* Countdown Timer */}
          <div className={cn(
            "rounded-2xl border p-6 text-center transition-colors duration-500",
            isUrgent
              ? "border-red-500/40 bg-red-500/10"
              : "border-border/40 bg-gradient-card"
          )}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className={cn("h-4 w-4", isUrgent ? "text-red-400 animate-pulse" : "text-muted-foreground")} />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Time Remaining
              </p>
            </div>
            <p className={cn(
              "text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums",
              isUrgent ? "text-red-400" : "text-foreground"
            )}>
              {timeDisplay}
            </p>
          </div>

          {/* Attendance Stats */}
          <div className="rounded-2xl border border-border/40 bg-gradient-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Attendance
              </p>
              <div className="flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">Live</span>
              </div>
            </div>

            {/* Percentage ring */}
            <div className="flex items-center justify-center py-2">
              <div className="relative">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - stats.percentage / 100)}`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tabular-nums text-foreground">
                    {stats.percentage}%
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Present</span>
                </div>
              </div>
            </div>

            {/* Stats rows */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Registered</span>
                </div>
                <span className="font-bold text-foreground tabular-nums">{stats.registered}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Present</span>
                </div>
                <span className="font-bold text-emerald-400 tabular-nums">{stats.present}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>Absent</span>
                </div>
                <span className="font-bold text-destructive tabular-nums">{stats.absent}</span>
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* URL display */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Attendance URL
            </p>
            <p className="text-xs text-muted-foreground break-all font-mono leading-relaxed">
              {qrUrl}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
