import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttendanceSession = {
  id: string;
  event_id: string;
  session_token: string;
  started_by: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
};

export type SessionStats = {
  registered: number;
  present: number;
  absent: number;
  percentage: number;
};

export type MarkAttendanceResult =
  | { success: true }
  | { success: false; reason: "invalid_session" | "session_expired" | "not_registered" | "already_marked" | "error"; message: string };

// ─── Session management ───────────────────────────────────────────────────────

/**
 * Creates a new attendance session for the given event.
 * Returns the session token (used in the QR URL).
 */
export async function createAttendanceSession(
  eventId: string,
  startedBy: string,
  durationMinutes: number = 60
): Promise<{ sessionToken: string; sessionId: string; expiresAt: string }> {
  const sessionToken = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      event_id: eventId,
      session_token: sessionToken,
      started_by: startedBy,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!data?.id) throw new Error("Failed to create attendance session");

  return {
    sessionToken,
    sessionId: data.id as string,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Deactivates an attendance session (manual end by manager).
 */
export async function deactivateAttendanceSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ is_active: false })
    .eq("id", sessionId);

  if (error) throw new Error(getSupabaseErrorMessage(error));
}

/**
 * Fetches a session by its token.
 */
export async function getSessionByToken(sessionToken: string): Promise<AttendanceSession | null> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data as AttendanceSession | null;
}

/**
 * Fetches live attendance stats for a session.
 */
export async function fetchSessionStats(sessionId: string, eventId: string): Promise<SessionStats> {
  // Count registered students
  const { count: registeredCount, error: regErr } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (regErr) throw new Error(getSupabaseErrorMessage(regErr));

  // Count present students (marked via this session OR manually)
  const { count: presentCount, error: attErr } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "PRESENT");

  if (attErr) throw new Error(getSupabaseErrorMessage(attErr));

  const registered = registeredCount ?? 0;
  const present = presentCount ?? 0;
  const absent = Math.max(0, registered - present);
  const percentage = registered > 0 ? Math.round((present / registered) * 100) : 0;

  return { registered, present, absent, percentage };
}

// ─── Student attendance marking via session token ─────────────────────────────

/**
 * Full validation chain + attendance marking for a student scanning a session QR.
 *
 * Validates in order:
 * 1. Session exists
 * 2. Session is active & not expired
 * 3. Student is registered for the event
 * 4. Attendance not already marked PRESENT
 * 5. Marks attendance
 */
export async function markAttendanceViaSession(
  sessionToken: string,
  studentId: string
): Promise<MarkAttendanceResult> {
  try {
    // 1. Fetch session
    const session = await getSessionByToken(sessionToken);
    if (!session) {
      return { success: false, reason: "invalid_session", message: "Invalid QR code. This attendance session does not exist." };
    }

    // 2. Check active + not expired
    const now = new Date();
    const isExpired = new Date(session.expires_at) <= now;
    if (!session.is_active || isExpired) {
      return { success: false, reason: "session_expired", message: "Attendance is closed. This session has ended." };
    }

    const eventId = session.event_id;

    // 3. Check student is registered for the event
    const { data: registration, error: regErr } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (regErr) throw new Error(getSupabaseErrorMessage(regErr));

    if (!registration) {
      return { success: false, reason: "not_registered", message: "You are not registered for this event." };
    }

    // 4. Check attendance not already marked PRESENT
    const { data: existing, error: existErr } = await supabase
      .from("attendance")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existErr) throw new Error(getSupabaseErrorMessage(existErr));

    if (existing?.status === "PRESENT") {
      return { success: false, reason: "already_marked", message: "Your attendance has already been marked." };
    }

    // 5. Mark attendance (upsert)
    const markedAt = new Date().toISOString();

    if (existing?.id) {
      // Update existing ABSENT record to PRESENT
      const { error: updateErr } = await supabase
        .from("attendance")
        .update({
          status: "PRESENT",
          marked_by: studentId,
          marked_at: markedAt,
          attendance_session_id: session.id,
        })
        .eq("id", existing.id);

      if (updateErr) throw new Error(getSupabaseErrorMessage(updateErr));
    } else {
      // Insert new PRESENT record
      const { error: insertErr } = await supabase.from("attendance").insert({
        event_id: eventId,
        student_id: studentId,
        status: "PRESENT",
        marked_by: studentId,
        marked_at: markedAt,
        attendance_session_id: session.id,
      });

      if (insertErr) throw new Error(getSupabaseErrorMessage(insertErr));
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      reason: "error",
      message: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Builds the QR URL for a session token using the current app origin.
 */
export function buildAttendanceUrl(sessionToken: string): string {
  return `${window.location.origin}/attendance/${sessionToken}`;
}
