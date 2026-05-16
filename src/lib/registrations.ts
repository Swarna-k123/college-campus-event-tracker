import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";
import type { Registrant } from "@/data/managerEvents";
import type { TeamRegistrationDetails } from "@/data/teamRegistration";

type RegRow = {
  id: string;
  phone: string;
  branch: string;
  semester: number;
  registered_at: string;
  team_details: TeamRegistrationDetails | null;
  profiles: { full_name: string; email: string } | null;
};

export async function fetchEventRegistrantsForManager(eventId: string): Promise<Registrant[]> {
  const { data, error } = await supabase
    .from("event_registrations")
    .select(
      `
      id,
      phone,
      branch,
      semester,
      registered_at,
      team_details,
      profiles ( full_name, email )
    `
    )
    .eq("event_id", eventId)
    .order("registered_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));

  return (data as RegRow[] | null)?.map((r) => ({
    id: r.id,
    name: r.team_details?.leader.name ?? r.profiles?.full_name ?? "—",
    email: r.team_details?.leader.email ?? r.profiles?.email ?? "",
    phone: r.team_details?.leader.phone ?? r.phone,
    branch: r.team_details?.leader.branch ?? r.branch,
    semester: r.team_details?.leader.semester ?? r.semester,
    registeredAt: r.registered_at,
    teamDetails: r.team_details,
  })) ?? [];
}

export async function registerTeamForEvent(input: {
  eventId: string;
  studentId: string;
  phone: string;
  branch: string;
  semester: number;
  teamDetails: TeamRegistrationDetails;
}) {
  const { error: rpcError } = await supabase.rpc("register_for_team_event", {
    p_event_id: input.eventId,
    p_phone: input.phone,
    p_branch: input.branch,
    p_semester: input.semester,
    p_team_details: input.teamDetails,
  });

  if (!rpcError) return;

  const { error: insertError } = await supabase.from("event_registrations").insert({
    event_id: input.eventId,
    student_id: input.studentId,
    phone: input.phone,
    branch: input.branch,
    semester: input.semester,
    team_details: input.teamDetails,
  });

  if (insertError) throw new Error(getSupabaseErrorMessage(insertError));
}
