import tech from "@/assets/event-tech.jpg";
import cultural from "@/assets/event-cultural.jpg";
import sports from "@/assets/event-sports.jpg";
import arts from "@/assets/event-arts.jpg";
import hackathon from "@/assets/event-hackathon.jpg";
import startup from "@/assets/event-startup.jpg";

export type EventCategory = "Technical" | "Cultural" | "Sports" | "Others";
export type EventStatus = "approved" | "pending" | "rejected";

export interface CampusEvent {
  id: string;
  title: string;
  club: string;
  category: EventCategory;
  status: EventStatus;
  date: string; // ISO
  poster: string;
  registrations: number;
}

const d = (offsetDays: number, hour = 17) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const events: CampusEvent[] = [
  { id: "1", title: "AI & Robotics Summit", club: "Tech Club", category: "Technical", status: "approved", date: d(0, 16), poster: tech, registrations: 412 },
  { id: "2", title: "Spring Music Festival", club: "Music Society", category: "Cultural", status: "approved", date: d(2, 18), poster: cultural, registrations: 980 },
  { id: "3", title: "Inter-College Basketball", club: "Sports Club", category: "Sports", status: "approved", date: d(5, 9), poster: sports, registrations: 256 },
  { id: "4", title: "Photography Walk", club: "Lens Club", category: "Others", status: "approved", date: d(6, 7), poster: arts, registrations: 88 },
  { id: "5", title: "HackNight 48", club: "Coding Club", category: "Technical", status: "approved", date: d(9, 20), poster: hackathon, registrations: 640 },
  { id: "6", title: "Startup Pitch Night", club: "E-Cell", category: "Others", status: "approved", date: d(12, 17), poster: startup, registrations: 174 },
  { id: "7", title: "Drama Night", club: "Theatre Group", category: "Cultural", status: "approved", date: d(14, 19), poster: cultural, registrations: 220 },
  { id: "8", title: "Marathon 5K", club: "Sports Club", category: "Sports", status: "approved", date: d(18, 6), poster: sports, registrations: 305 },
  { id: "9", title: "AI Ethics Talk", club: "Tech Club", category: "Technical", status: "pending", date: d(7, 15), poster: tech, registrations: 30 },
];