import type { EventCategory, EventStatus } from "@/data/events";

export type ManagerStatus = EventStatus;

export interface Registrant {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  semester: number;
  registeredAt: string;
}

export interface ManagerEvent {
  id: string;
  title: string;
  description: string;
  poster: string;
  date: string;
  venue: string;
  category: EventCategory;
  maxRegistrations: number;
  status: ManagerStatus;
  rejectionReason?: string;
  registrants: Registrant[];
  /** When loaded from API, prefer this over registrants.length for display. */
  registrationCount?: number;
  club: string;
}

export function registrationCount(e: ManagerEvent): number {
  return e.registrationCount ?? e.registrants.length;
}
