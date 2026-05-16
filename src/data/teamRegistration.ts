export type EventType = "individual" | "team";

export type TeamMemberDetails = {
  name: string;
  semester: number;
  branch: string;
  email: string;
  usn: string;
};

export type TeamLeaderDetails = TeamMemberDetails & {
  phone: string;
};

export type TeamRegistrationDetails = {
  team_name: string;
  leader: TeamLeaderDetails;
  members: TeamMemberDetails[];
};

export const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function isTeamEvent(eventType?: EventType | null): boolean {
  return eventType === "team";
}
