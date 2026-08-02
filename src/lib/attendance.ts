import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

export function extractRegistrationIdFromQr(value: string): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) {
      const candidate = parsed.registrationId ?? parsed.registration_id ?? parsed.id;
      return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
    }
  } catch {
    // fall through to simple string handling
  }

  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export type AttendanceStatus = "present" | "absent";

export type DatabaseAttendanceStatus = "PRESENT" | "ABSENT";

export type AttendanceRecord = {
  id: string;
  event_id: string;
  student_id: string;
  status: DatabaseAttendanceStatus;
  marked_by: string;
  marked_at: string;
  created_at: string;
};

export type StudentAttendance = {
  registrationId: string;
  studentId: string;
  name: string;
  email: string;
  usn?: string | null;
  department?: string | null;
  status: AttendanceStatus;
};

function toDatabaseStatus(status: AttendanceStatus): DatabaseAttendanceStatus {
  return status === "present" ? "PRESENT" : "ABSENT";
}

function fromDatabaseStatus(status: DatabaseAttendanceStatus): AttendanceStatus {
  return status === "PRESENT" ? "present" : "absent";
}

export async function fetchEventAttendance(eventId: string): Promise<Map<string, AttendanceRecord>> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("event_id", eventId);

  if (error) throw new Error(getSupabaseErrorMessage(error));

  const attendanceMap = new Map<string, AttendanceRecord>();
  (data as AttendanceRecord[] | null)?.forEach((record) => {
    attendanceMap.set(record.student_id, record);
  });

  return attendanceMap;
}

export async function saveAttendance(
  eventId: string,
  attendanceData: StudentAttendance[],
  markedBy: string
): Promise<void> {
  const operations = attendanceData.map(async (student) => {
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("event_id", eventId)
      .eq("student_id", student.studentId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("attendance")
        .update({
          status: toDatabaseStatus(student.status),
          marked_by: markedBy,
          marked_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) throw new Error(getSupabaseErrorMessage(updateError));
    } else {
      // Insert new record
      const { error: insertError } = await supabase.from("attendance").insert({
        event_id: eventId,
        student_id: student.studentId,
        status: toDatabaseStatus(student.status),
        marked_by: markedBy,
        marked_at: new Date().toISOString(),
      });

      if (insertError) throw new Error(getSupabaseErrorMessage(insertError));
    }
  });

  await Promise.all(operations);
}
