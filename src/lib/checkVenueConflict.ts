import { supabase } from "@/lib/supabase";
import type { ConflictEvent } from "@/data/events";

export async function checkVenueConflict(
  venue: string,
  date: Date,
  startTimeStr: string,
  endTimeStr: string,
  ignoreEventId?: string
): Promise<ConflictEvent | null> {
  if (!venue.trim() || !date || !startTimeStr || !endTimeStr) {
    return null;
  }

  // Parse times to full Date objects for comparison
  const [startH, startM] = startTimeStr.split(":").map(Number);
  const [endH, endM] = endTimeStr.split(":").map(Number);
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return null;
  }
  
  const currentStart = new Date(date);
  currentStart.setHours(startH, startM, 0, 0);
  
  const currentEnd = new Date(date);
  currentEnd.setHours(endH, endM, 0, 0);

  // Simple validation: end time must be after start time
  if (currentEnd <= currentStart) {
    return null; 
  }

  // Get all events for this venue on this date (ignoring time for now, we'll filter in JS for safety)
  // Only checking approved or pending events
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let query = supabase
    .from("events")
    .select("*, clubs(name, club_logo_url), profiles!events_created_by_fkey(full_name, email)")
    .eq("venue", venue.trim())
    .in("status", ["approved", "pending"])
    .gte("starts_at", startOfDay.toISOString())
    .lte("starts_at", endOfDay.toISOString());
    
  if (ignoreEventId) {
    query = query.neq("id", ignoreEventId);
  }

  const { data, error } = await query;
  
  if (error || !data) {
    console.error("Conflict check error:", error);
    return null;
  }
  
  // Find the first overlapping event
  const conflict = data.find(event => {
    if (!event.ends_at) return false; // If ends_at doesn't exist, we can't reliably determine overlap
    
    const eventStart = new Date(event.starts_at);
    const eventEnd = new Date(event.ends_at);
    
    const new_start = currentStart;
    const new_end = currentEnd;
    const existing_start = eventStart;
    const existing_end = eventEnd;
    
    // A conflict exists whenever: new_start < existing_end AND new_end > existing_start
    return new_start < existing_end && new_end > existing_start;
  });

  if (conflict) {
    return {
      id: conflict.id,
      title: conflict.title,
      clubName: conflict.clubs?.name ?? "Unknown Club",
      clubLogoUrl: conflict.clubs?.club_logo_url ?? null,
      managerName: conflict.profiles?.full_name ?? "Unknown Manager",
      managerEmail: conflict.profiles?.email ?? "No Email",
      date: conflict.starts_at,
      startsAt: conflict.starts_at,
      endsAt: conflict.ends_at!,
      status: conflict.status as "approved" | "pending" | "rejected"
    };
  }

  return null;
}
