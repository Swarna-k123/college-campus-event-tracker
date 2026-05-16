import type { EventCategory } from "@/data/events";
import type { ManagerEvent, Registrant } from "@/data/managerEvents";
import type { EventRow } from "@/lib/db";

export function mapEventRowToManagerEvent(
  row: EventRow,
  clubName: string,
  opts?: { registrants?: Registrant[]; registrationCount?: number }
): ManagerEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    poster: row.poster_url,
    date: row.starts_at,
    venue: row.venue,
    category: row.category as EventCategory,
    maxRegistrations: row.max_registrations,
    budget: row.budget ?? null,
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
    registrants: opts?.registrants ?? [],
    registrationCount: opts?.registrationCount,
    club: clubName,
  };
}
