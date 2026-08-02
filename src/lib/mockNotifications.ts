export type NotificationType = "success" | "info" | "warning" | "error" | "reminder";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

const now = new Date();

const createTimestamp = (minutesAgo: number) => {
  const value = new Date(now.getTime() - minutesAgo * 60_000);
  return value.toISOString();
};

export const mockNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Registration Successful",
    message: "You successfully registered for Hackathon.",
    type: "success",
    isRead: false,
    createdAt: createTimestamp(2),
  },
  {
    id: "notif-2",
    title: "Event Reminder",
    message: "Hackathon starts tomorrow.",
    type: "reminder",
    isRead: false,
    createdAt: createTimestamp(1200),
  },
  {
    id: "notif-3",
    title: "Venue Updated",
    message: "Venue changed to Auditorium.",
    type: "info",
    isRead: false,
    createdAt: createTimestamp(4320),
  },
  {
    id: "notif-4",
    title: "Registration Approved",
    message: "Your team registration has been approved.",
    type: "success",
    isRead: true,
    createdAt: createTimestamp(7200),
  },
  {
    id: "notif-5",
    title: "Event Cancelled",
    message: "The workshop has been cancelled due to venue issues.",
    type: "warning",
    isRead: true,
    createdAt: createTimestamp(10080),
  },
  {
    id: "notif-6",
    title: "Certificate Available",
    message: "Your certificate for the design sprint is ready to download.",
    type: "error",
    isRead: true,
    createdAt: createTimestamp(14400),
  },
];
