import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";
import type { Registrant } from "@/data/managerEvents";

type RegRow = {
  id: string;
  phone: string;
  branch: string;
  semester: number;
  registered_at: string;
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
      profiles ( full_name, email )
    `
    )
    .eq("event_id", eventId)
    .order("registered_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));

  return (data as RegRow[] | null)?.map((r) => ({
    id: r.id,
    name: r.profiles?.full_name ?? "—",
    email: r.profiles?.email ?? "",
    phone: r.phone,
    branch: r.branch,
    semester: r.semester,
    registeredAt: r.registered_at,
  })) ?? [];
}
