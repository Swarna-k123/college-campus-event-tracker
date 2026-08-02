import { supabase } from "@/lib/supabase";

export type LandingStats = {
  clubs: number;
  events: number;
  registrations: number;
  venues: number;
};

export async function loadLandingStats(): Promise<LandingStats> {
  // Clubs
  const { count: clubs } = await supabase
    .from("clubs")
    .select("*", { count: "exact", head: true });

  // Approved Events
  const { count: events } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  // Registrations
  const { count: registrations } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true });

  // Venues
  const { data: venueData } = await supabase
    .from("events")
    .select("venue")
    .eq("status", "approved");

  const venues = new Set(
    (venueData ?? [])
      .map((v) => v.venue)
      .filter(Boolean)
  ).size;

  return {
    clubs: clubs ?? 0,
    events: events ?? 0,
    registrations: registrations ?? 0,
    venues,
  };
}