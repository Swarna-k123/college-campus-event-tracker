export type EventCategory = "Technical" | "Cultural" | "Sports" | "Others";
export type EventStatus = "approved" | "pending" | "rejected";

export type ConflictEvent = {
  id: string;
  title: string;
  clubName: string;
  managerName: string;
  managerEmail: string;
  date: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  clubLogoUrl?: string | null;
};