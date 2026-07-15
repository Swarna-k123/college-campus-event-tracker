import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CheckCircle,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Settings,
  User,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/roles";

export type SidebarNavItem = {
  label: string;
  segment: string;
  icon: LucideIcon;
  end?: boolean;
};

export const roleBasePath: Record<Role, string> = {
  student: "/student-dashboard",
  manager: "/manager-dashboard",
  admin: "/admin-dashboard",
};

export const studentNav: SidebarNavItem[] = [
  { label: "Dashboard", segment: "", icon: LayoutDashboard, end: true },
  { label: "Events", segment: "events", icon: Calendar },
  { label: "My Registrations", segment: "registrations", icon: CalendarCheck },
  { label: "Notifications", segment: "notifications", icon: Bell },
  { label: "Profile", segment: "profile", icon: User },
  { label: "Settings", segment: "settings", icon: Settings },
];

export const managerNav: SidebarNavItem[] = [
  { label: "Dashboard", segment: "", icon: LayoutDashboard, end: true },
  { label: "Club Events", segment: "club-events", icon: Users },
  { label: "My Events", segment: "my-events", icon: CalendarClock },
  { label: "Create Event", segment: "create", icon: CalendarPlus },
  { label: "Members", segment: "members", icon: Users },
  { label: "Registrations", segment: "registrations", icon: ClipboardList },
  { label: "Attendance", segment: "attendance", icon: CheckCircle },
  { label: "Analytics", segment: "analytics", icon: BarChart3 },
  { label: "Activity", segment: "activity", icon: Activity },
  { label: "Settings", segment: "settings", icon: Settings },
];

export const adminNav: SidebarNavItem[] = [
  { label: "Dashboard", segment: "", icon: LayoutDashboard, end: true },
  { label: "Pending Approvals", segment: "pending", icon: CalendarClock },
  { label: "All Events", segment: "events", icon: Calendar },
  { label: "Clubs", segment: "clubs", icon: Building2 },
  { label: "Venue Conflicts", segment: "venue-conflicts", icon: MapPin },
  { label: "Activity", segment: "activity", icon: Activity },
  { label: "Analytics", segment: "analytics", icon: BarChart3 },
  { label: "Settings", segment: "settings", icon: Settings },
];

export const navByRole: Record<Role, SidebarNavItem[]> = {
  student: studentNav,
  manager: managerNav,
  admin: adminNav,
};
