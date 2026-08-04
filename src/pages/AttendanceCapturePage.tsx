import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, CalendarDays, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { markAttendanceViaSession, getSessionByToken } from "@/lib/attendanceSessions";
import { supabase } from "@/lib/supabase";
import { getDashboardPathForRole } from "@/context/AuthContext";

type PageState =
  | { status: "loading" }
  | { status: "marking" }
  | { status: "success"; eventTitle: string }
  | { status: "already_marked"; eventTitle: string }
  | { status: "not_registered"; eventTitle: string }
  | { status: "session_expired"; eventTitle?: string }
  | { status: "invalid_session" }
  | { status: "error"; message: string };

const CampusHubLogo = () => (
  <div className="flex items-center gap-2 mb-8">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
      <GraduationCap className="h-5 w-5 text-primary-foreground" />
    </span>
    <span className="text-lg font-semibold tracking-tight">CampusHub</span>
  </div>
);

export default function AttendanceCapturePage() {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    // Wait for auth to resolve
    if (authLoading) return;

    // If not authenticated, redirect to login with a redirect param
    if (!user) {
      const redirectPath = `/attendance/${sessionToken ?? ""}`;
      navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
      return;
    }

    // Auth resolved and user is logged in — only students should mark their own attendance
    if (user.role !== "student") {
      setPageState({
        status: "error",
        message: "Only students can mark attendance via QR code. Managers use the attendance dashboard.",
      });
      return;
    }

    if (!sessionToken) {
      setPageState({ status: "invalid_session" });
      return;
    }

    // Mark attendance
    const doMark = async () => {
      setPageState({ status: "marking" });

      // First, get session to prefetch event title for display
      let eventTitle = "this event";
      try {
        const session = await getSessionByToken(sessionToken);
        if (session?.event_id) {
          const { data: ev } = await supabase
            .from("events")
            .select("title")
            .eq("id", session.event_id)
            .maybeSingle();
          if (ev?.title) eventTitle = ev.title as string;
        }
      } catch {
        // best-effort only
      }

      const result = await markAttendanceViaSession(sessionToken, user.id);

      if (result.success) {
        setPageState({ status: "success", eventTitle });
        return;
      }

      switch (result.reason) {
        case "invalid_session":
          setPageState({ status: "invalid_session" });
          break;
        case "session_expired":
          setPageState({ status: "session_expired", eventTitle });
          break;
        case "not_registered":
          setPageState({ status: "not_registered", eventTitle });
          break;
        case "already_marked":
          setPageState({ status: "already_marked", eventTitle });
          break;
        default:
          setPageState({ status: "error", message: result.message });
      }
    };

    void doMark();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, sessionToken]);

  const dashboardPath = user ? getDashboardPathForRole(user.role) : "/";

  const renderContent = () => {
    switch (pageState.status) {
      case "loading":
      case "marking":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-9 w-9 text-primary animate-spin" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-primary/20 animate-ping opacity-30" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {pageState.status === "loading" ? "Verifying…" : "Marking Attendance…"}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {pageState.status === "loading"
                  ? "Checking your session…"
                  : "Saving your attendance record…"}
              </p>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-emerald-500/30 animate-ping opacity-40" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Attendance Marked!</h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-sm">
                You have been marked <strong className="text-emerald-400">present</strong> for{" "}
                <span className="font-semibold text-foreground">{pageState.eventTitle}</span>.
              </p>
            </div>
            <Button asChild className="gap-2 bg-gradient-primary hover:opacity-90 border-0 text-primary-foreground">
              <Link to={dashboardPath}>Go to Dashboard</Link>
            </Button>
          </div>
        );

      case "already_marked":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Already Marked</h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-sm">
                Your attendance for{" "}
                <span className="font-semibold text-foreground">{pageState.eventTitle}</span> has already been recorded.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2 border-border/60">
              <Link to={dashboardPath}>Go to Dashboard</Link>
            </Button>
          </div>
        );

      case "not_registered":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Not Registered</h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-sm">
                You are not registered for{" "}
                <span className="font-semibold text-foreground">{pageState.eventTitle}</span>.
                Please register first to mark attendance.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline" className="gap-2 border-border/60">
                <Link to={dashboardPath}>Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        );

      case "session_expired":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Attendance Closed</h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-sm">
                {pageState.eventTitle
                  ? `The attendance session for ${pageState.eventTitle} has ended.`
                  : "This attendance session has ended."}
                {" "}Please contact your event manager.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2 border-border/60">
              <Link to={dashboardPath}>Go to Dashboard</Link>
            </Button>
          </div>
        );

      case "invalid_session":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Invalid QR Code</h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-sm">
                This QR code is not valid or has been removed. Please scan the QR code displayed by your event manager.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2 border-border/60">
              <Link to={dashboardPath}>Go to Dashboard</Link>
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-sm">
                {pageState.message}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2 border-border/60" onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button asChild variant="ghost">
                <Link to={dashboardPath}>Dashboard</Link>
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center">
          <CampusHubLogo />
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-soft backdrop-blur-xl p-8 sm:p-10">
          {/* Event info decoration */}
          {(pageState.status === "success" ||
            pageState.status === "already_marked" ||
            pageState.status === "not_registered" ||
            pageState.status === "session_expired") && (
            <div className="flex flex-col items-center gap-2 mb-6 p-3 rounded-xl bg-secondary/30 border border-border/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>CampusHub Attendance</span>
              </div>
            </div>
          )}

          {renderContent()}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="text-primary font-medium">CampusHub</span>
        </p>
      </div>
    </main>
  );
}
