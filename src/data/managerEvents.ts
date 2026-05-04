import tech from "@/assets/event-tech.jpg";
import cultural from "@/assets/event-cultural.jpg";
import sports from "@/assets/event-sports.jpg";
import arts from "@/assets/event-arts.jpg";
import hackathon from "@/assets/event-hackathon.jpg";
import startup from "@/assets/event-startup.jpg";
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
  date: string; // ISO
  venue: string;
  category: EventCategory;
  maxRegistrations: number;
  status: ManagerStatus;
  rejectionReason?: string;
  registrants: Registrant[];
  club: string;
}

const branches = ["Computer Science", "Electronics", "Mechanical", "Civil", "AI & DS"];
const firstNames = ["Aarav", "Diya", "Vihaan", "Anaya", "Arjun", "Isha", "Kabir", "Myra", "Rohan", "Saanvi", "Vivaan", "Zara"];
const lastNames = ["Sharma", "Patel", "Gupta", "Singh", "Iyer", "Khan", "Reddy", "Kapoor"];

const makeRegistrants = (n: number, base: number): Registrant[] =>
  Array.from({ length: n }, (_, i) => {
    const fn = firstNames[(i + base) % firstNames.length];
    const ln = lastNames[(i * 3 + base) % lastNames.length];
    const days = (i % 14) + 1;
    const reg = new Date();
    reg.setDate(reg.getDate() - days);
    return {
      id: `${base}-${i}`,
      name: `${fn} ${ln}`,
      email: `${fn}.${ln}`.toLowerCase() + `@campus.edu`,
      phone: `+91 9${String(100000000 + ((i + base) * 17 % 899999999)).slice(0, 9)}`,
      branch: branches[(i + base) % branches.length],
      semester: ((i + base) % 8) + 1,
      registeredAt: reg.toISOString(),
    };
  });

const futureDate = (d: number, h = 17) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};

export const CURRENT_CLUB = "Tech Club";

export const initialManagerEvents: ManagerEvent[] = [
  {
    id: "m1",
    title: "AI & Robotics Summit",
    description: "A full-day summit on AI, robotics and applied ML with industry speakers and live demos.",
    poster: tech,
    date: futureDate(3, 16),
    venue: "Auditorium A",
    category: "Technical",
    maxRegistrations: 200,
    status: "approved",
    registrants: makeRegistrants(162, 1),
    club: CURRENT_CLUB,
  },
  {
    id: "m2",
    title: "HackNight 48",
    description: "48-hour overnight hackathon. Form teams, build, ship, demo to the campus.",
    poster: hackathon,
    date: futureDate(10, 20),
    venue: "Innovation Lab",
    category: "Technical",
    maxRegistrations: 300,
    status: "pending",
    registrants: makeRegistrants(48, 7),
    club: CURRENT_CLUB,
  },
  {
    id: "m3",
    title: "Startup Pitch Night",
    description: "Founders pitch to a panel of investors and alumni. Networking dinner included.",
    poster: startup,
    date: futureDate(14, 18),
    venue: "MBA Block",
    category: "Others",
    maxRegistrations: 120,
    status: "rejected",
    rejectionReason: "Venue conflict — please reschedule or pick a different venue.",
    registrants: [],
    club: CURRENT_CLUB,
  },
  // Other clubs (admin sees these; manager does not)
  {
    id: "o1",
    title: "Spring Music Festival",
    description: "Live performances by student bands across genres on the open grounds.",
    poster: cultural,
    date: futureDate(2, 18),
    venue: "Open Grounds",
    category: "Cultural",
    maxRegistrations: 1000,
    status: "approved",
    registrants: makeRegistrants(820, 11),
    club: "Music Society",
  },
  {
    id: "o2",
    title: "Inter-College Basketball",
    description: "Knockout tournament between visiting colleges and our campus team.",
    poster: sports,
    date: futureDate(5, 9),
    venue: "Indoor Stadium",
    category: "Sports",
    maxRegistrations: 400,
    status: "approved",
    registrants: makeRegistrants(256, 3),
    club: "Sports Club",
  },
  {
    id: "o3",
    title: "Photography Walk",
    description: "Sunrise photo walk through the old quad. All skill levels welcome.",
    poster: arts,
    date: futureDate(6, 7),
    venue: "Old Quad",
    category: "Others",
    maxRegistrations: 60,
    status: "approved",
    registrants: makeRegistrants(38, 17),
    club: "Lens Club",
  },
  {
    id: "o4",
    title: "Cultural Night",
    description: "Annual showcase of dance, drama, and music from every cultural society.",
    poster: cultural,
    date: futureDate(11, 19),
    venue: "Main Auditorium",
    category: "Cultural",
    maxRegistrations: 800,
    status: "pending",
    registrants: [],
    club: "Arts Society",
  },
  {
    id: "o5",
    title: "Marathon 5K",
    description: "Campus-wide morning marathon with prizes for top three finishers.",
    poster: sports,
    date: futureDate(18, 6),
    venue: "Sports Complex",
    category: "Sports",
    maxRegistrations: 500,
    status: "pending",
    registrants: [],
    club: "Sports Club",
  },
];