import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

export type TrendingEventCard = {
  id: string;
  title: string;
  club: string;
  posterUrl: string | null;
};

type EventRow = {
  id: string;
  title: string;
  poster_url: string | null;
  clubs: { name: string } | { name: string }[] | null;
};

function clubNameFromRow(clubs: EventRow["clubs"]): string {
  if (clubs == null) return "Club";
  if (Array.isArray(clubs)) return clubs[0]?.name ?? "Club";
  return clubs.name ?? "Club";
}

/** Top approved events by registration count (for public landing page). */
export async function loadTrendingEvents(limit = 4): Promise<TrendingEventCard[]> {
  const { data: rows, error } = await supabase
    .from("events")
    .select("id, title, poster_url, clubs ( name )")
    .eq("status", "approved");

  if (error) throw new Error(getSupabaseErrorMessage(error));
  if (!rows?.length) return [];

  const ids = rows.map((r) => (r as EventRow).id);
  const { data: regs, error: regErr } = await supabase
    .from("event_registrations")
    .select("event_id")
    .in("event_id", ids);

  if (regErr) throw new Error(getSupabaseErrorMessage(regErr));

  const countMap = new Map<string, number>();
  (regs as { event_id: string }[] | null)?.forEach((r) => {
    countMap.set(r.event_id, (countMap.get(r.event_id) ?? 0) + 1);
  });

  return (rows as EventRow[])
    .map((row) => ({
      id: row.id,
      title: row.title,
      club: clubNameFromRow(row.clubs),
      posterUrl: row.poster_url?.trim() || null,
      registrationCount: countMap.get(row.id) ?? 0,
    }))
    .sort((a, b) => b.registrationCount - a.registrationCount)
    .slice(0, limit)
    .map(({ id, title, club, posterUrl }) => ({ id, title, club, posterUrl }));
}
