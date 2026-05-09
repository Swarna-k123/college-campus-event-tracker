import type { EventCategory } from "@/data/events";

/** Matches public.app_role in your database */
export type DbAppRole = "student" | "club_manager" | "admin";

export type EventRow = {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  starts_at: string;
  venue: string;
  category: EventCategory;
  max_registrations: number;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  club_id: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClubRow = { id: string; name: string };

export type RegistrationRow = {
  id: string;
  event_id: string;
  student_id: string;
  phone: string;
  branch: string;
  semester: number;
  registered_at: string;
};

export function getSupabaseErrorMessage(error: { message?: string; details?: string; hint?: string }) {
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ") || "Request failed";
}
