import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

export type NotificationType = "success" | "info" | "warning" | "error" | "reminder";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  relatedEventId?: string | null;
}

export interface NotificationInsertPayload {
  title: string;
  message: string;
  type: NotificationType;
  relatedEventId?: string | null;
}

const normalizeNotificationType = (value: string | null | undefined): NotificationType => {
  switch (value) {
    case "success":
    case "info":
    case "warning":
    case "error":
    case "reminder":
      return value;
    default:
      return "info";
  }
};

const mapNotificationRow = (row: Record<string, unknown>): NotificationItem => {
  const value = row as Record<string, unknown> & {
    is_read?: unknown;
    isRead?: unknown;
    created_at?: unknown;
    createdAt?: unknown;
    related_event_id?: unknown;
    relatedEventId?: unknown;
    title?: unknown;
    message?: unknown;
    type?: unknown;
    id?: unknown;
  };

  return {
    id: String(value.id ?? ""),
    title: String(value.title ?? "Notification"),
    message: String(value.message ?? ""),
    type: normalizeNotificationType(typeof value.type === "string" ? value.type : null),
    isRead: value.is_read === true || value.is_read === "true" || value.isRead === true || value.isRead === "true",
    createdAt: String(value.created_at ?? value.createdAt ?? ""),
    relatedEventId: typeof value.related_event_id === "string" || typeof value.relatedEventId === "string"
      ? String(value.related_event_id ?? value.relatedEventId ?? "")
      : null,
  };
};

const notificationExists = async (userId: string, payload: NotificationInsertPayload): Promise<boolean> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("title", payload.title)
    .eq("message", payload.message)
    .eq("related_event_id", payload.relatedEventId ?? null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Notification existence check failed", error.message);
    return false;
  }

  return Boolean(data);
};

export const createNotificationForUser = async (userId: string, payload: NotificationInsertPayload): Promise<void> => {
  if (!userId) return;

  const exists = await notificationExists(userId, payload);
  if (exists) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    related_event_id: payload.relatedEventId ?? null,
    is_read: false,
  });

  if (error) {
    throw new Error(error.message || "Unable to create notification.");
  }
};

export const createNotificationsForUsers = async (
  userIds: string[],
  payload: NotificationInsertPayload
): Promise<void> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) return;

  await Promise.all(uniqueUserIds.map((userId) => createNotificationForUser(userId, payload)));
};

const getEventTitle = async (eventId: string): Promise<string | null> => {
  const { data, error } = await supabase.from("events").select("title").eq("id", eventId).maybeSingle();

  if (error) {
    console.warn("Unable to load event title for notifications", error.message);
    return null;
  }

  return data?.title ?? null;
};

const getEventCertificatesEnabled = async (eventId: string): Promise<boolean> => {
  const { data, error } = await supabase.from("events").select("certificates_enabled").eq("id", eventId).maybeSingle();

  if (error) {
    console.warn("Unable to load certificate setting for notifications", error.message);
    return false;
  }

  return Boolean(data?.certificates_enabled);
};

const getPresentStudentIds = async (eventId: string): Promise<string[]> => {
  const { data, error } = await supabase.from("attendance").select("student_id").eq("event_id", eventId).eq("status", "PRESENT");

  if (error) {
    throw new Error(error.message || "Unable to load present students.");
  }

  return (data ?? []).map((row) => String((row as { student_id?: string }).student_id ?? "")).filter(Boolean);
};

const getBookmarkedOrSavedStudentIds = async (eventId: string): Promise<string[]> => {
  const candidateTables = ["saved_events", "event_bookmarks", "event_saves", "bookmarks"];

  for (const tableName of candidateTables) {
    const { data, error } = await supabase.from(tableName).select("user_id, student_id, event_id, eventId");

    if (error) {
      if (String(error.message).includes("does not exist") || String(error.message).includes("relation")) {
        continue;
      }
      console.warn(`Unable to query ${tableName} for notifications`, error.message);
      continue;
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const matchingIds = rows
      .filter((row) => {
        const eventIdValue = row.event_id ?? row.eventId;
        return eventIdValue === eventId;
      })
      .flatMap((row) => {
        const userId = typeof row.user_id === "string" ? row.user_id : null;
        const studentId = typeof row.student_id === "string" ? row.student_id : null;
        return [userId, studentId].filter(Boolean) as string[];
      });

    if (matchingIds.length) {
      return Array.from(new Set(matchingIds));
    }
  }

  return [];
};

export const getRegisteredStudentIds = async (eventId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("student_id")
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message || "Unable to load registered students.");
  }

  return (data ?? []).map((row) => String((row as { student_id?: string }).student_id ?? "")).filter(Boolean);
};

export const notifyRegisteredStudents = async (
  eventId: string,
  payload: NotificationInsertPayload
): Promise<void> => {
  const studentIds = await getRegisteredStudentIds(eventId);
  await createNotificationsForUsers(studentIds, { ...payload, relatedEventId: eventId });
};

export const notifyRegistrationSuccess = async (userId: string, eventId: string, eventTitle: string): Promise<void> => {
  await createNotificationForUser(userId, {
    title: "Registration Successful",
    message: `You have successfully registered for "${eventTitle}".`,
    type: "success",
    relatedEventId: eventId,
  });
};

export const notifyRegistrationClosed = async (userId: string, eventId: string, eventTitle: string): Promise<void> => {
  await createNotificationForUser(userId, {
    title: "Registration Closed",
    message: `Registrations for "${eventTitle}" are now closed.`,
    type: "warning",
    relatedEventId: eventId,
  });
};

export const notifyEventCancelled = async (eventId: string, eventTitle: string): Promise<void> => {
  const studentIds = await getRegisteredStudentIds(eventId);
  await createNotificationsForUsers(studentIds, {
    title: "Event Cancelled",
    message: `"${eventTitle}" has been cancelled by the organizer.`,
    type: "warning",
    relatedEventId: eventId,
  });
};

export const notifyCertificateAvailableForPresentStudents = async (eventId: string, eventTitle?: string): Promise<void> => {
  const certificatesEnabled = await getEventCertificatesEnabled(eventId);
  if (!certificatesEnabled) return;

  const studentIds = await getPresentStudentIds(eventId);
  if (!studentIds.length) return;

  const resolvedTitle = eventTitle ?? (await getEventTitle(eventId)) ?? "Event";

  await createNotificationsForUsers(studentIds, {
    title: "Certificate Available",
    message: `Your participation certificate for "${resolvedTitle}" is now available for download.`,
    type: "success",
    relatedEventId: eventId,
  });
};

export const notifyRegistrationClosingSoon = async (): Promise<void> => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("events")
    .select("id, title, registration_closes_at")
    .eq("status", "approved")
    .not("registration_closes_at", "is", null)
    .gte("registration_closes_at", now.toISOString())
    .lte("registration_closes_at", windowEnd.toISOString());

  if (error) {
    console.warn("Unable to load events for registration deadline notifications", error.message);
    return;
  }

  for (const event of data ?? []) {
    const registeredStudents = await getRegisteredStudentIds(String(event.id));
    const bookmarkedStudents = await getBookmarkedOrSavedStudentIds(String(event.id));
    const targetIds = Array.from(new Set([...bookmarkedStudents, ...registeredStudents]));
    const intendedRecipients = targetIds.filter((id) => !registeredStudents.includes(id));

    if (!intendedRecipients.length) continue;

    await createNotificationsForUsers(intendedRecipients, {
      title: "Registration Closing Soon",
      message: `Registrations for "${event.title}" close tomorrow.`,
      type: "warning",
      relatedEventId: String(event.id),
    });
  }
};

export interface EventNotificationPlan {
  title: string;
  message: string;
  type: NotificationType;
}

export const buildEventUpdateNotifications = ({
  eventTitle,
  oldVenue,
  newVenue,
  oldStartsAt,
  newStartsAt,
  oldCertificatesEnabled,
  newCertificatesEnabled,
}: {
  eventTitle: string;
  oldVenue: string;
  newVenue: string;
  oldStartsAt: Date | string | null;
  newStartsAt: Date | string | null;
  oldCertificatesEnabled: boolean;
  newCertificatesEnabled: boolean;
}): EventNotificationPlan[] => {
  const notifications: EventNotificationPlan[] = [];

  if (oldVenue.trim() !== newVenue.trim()) {
    notifications.push({
      title: "Venue Updated",
      message: `The venue for "${eventTitle}" has been changed to "${newVenue}".`,
      type: "info",
    });
  }

  const oldStart = oldStartsAt ? new Date(oldStartsAt) : null;
  const newStart = newStartsAt ? new Date(newStartsAt) : null;

  if (oldStart && newStart) {
    const oldDateChanged = format(oldStart, "yyyy-MM-dd") !== format(newStart, "yyyy-MM-dd");
    const oldTimeChanged =
      oldStart.getHours() !== newStart.getHours() || oldStart.getMinutes() !== newStart.getMinutes();

    if (oldDateChanged) {
      notifications.push({
        title: "Event Date Updated",
        message: `"${eventTitle}" has been rescheduled to ${format(newStart, "MMM d, yyyy")}.`,
        type: "info",
      });
    }

    if (oldTimeChanged) {
      notifications.push({
        title: "Event Time Updated",
        message: `"${eventTitle}" now starts at ${format(newStart, "p")}.`,
        type: "info",
      });
    }
  }

  if (!oldCertificatesEnabled && newCertificatesEnabled) {
    notifications.push({
      title: "Certificate Available",
      message: `Your participation certificate for "${eventTitle}" is ready.`,
      type: "success",
    });
  }

  return notifications;
};

export const notifyEventUpdates = async ({
  eventId,
  eventTitle,
  oldVenue,
  newVenue,
  oldStartsAt,
  newStartsAt,
  oldCertificatesEnabled,
  newCertificatesEnabled,
}: {
  eventId: string;
  eventTitle: string;
  oldVenue: string;
  newVenue: string;
  oldStartsAt: Date | string | null;
  newStartsAt: Date | string | null;
  oldCertificatesEnabled: boolean;
  newCertificatesEnabled: boolean;
}): Promise<void> => {
  const plans = buildEventUpdateNotifications({
    eventTitle,
    oldVenue,
    newVenue,
    oldStartsAt,
    newStartsAt,
    oldCertificatesEnabled,
    newCertificatesEnabled,
  });

  if (!plans.length) return;

  const studentIds = await getRegisteredStudentIds(eventId);
  await Promise.all(
    plans.map((plan) => createNotificationsForUsers(studentIds, { ...plan, relatedEventId: eventId }))
  );
};

export const triggerAutomaticNotifications = async (): Promise<void> => {
  await Promise.allSettled([
    notifyRegistrationClosingSoon(),
    generateUpcomingEventReminders(),
    notifyCompletedEvents(),
  ]);
};

export const generateUpcomingEventReminders = async (): Promise<void> => {
  const now = new Date();
  const { data, error } = await supabase.from("events").select("id, title, starts_at").eq("status", "approved");

  if (error) {
    console.warn("Unable to load event reminders", error.message);
    return;
  }

  for (const event of data ?? []) {
    const startsAt = event.starts_at ? new Date(event.starts_at) : null;
    if (!startsAt || startsAt <= now) continue;

    const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60_000;

    if (minutesUntilStart <= 24 * 60 && minutesUntilStart > 23 * 60) {
      await notifyRegisteredStudents(String(event.id), {
        title: "Event Reminder",
        message: `"${event.title}" starts tomorrow.`,
        type: "reminder",
        relatedEventId: String(event.id),
      });
    }

    if (minutesUntilStart <= 60 && minutesUntilStart > 0) {
      await notifyRegisteredStudents(String(event.id), {
        title: "Event Reminder",
        message: `"${event.title}" starts in one hour.`,
        type: "reminder",
        relatedEventId: String(event.id),
      });
    }

    if (minutesUntilStart <= 15 && minutesUntilStart > 0) {
      await notifyRegisteredStudents(String(event.id), {
        title: "Event Reminder",
        message: `"${event.title}" starts in 15 minutes.`,
        type: "reminder",
        relatedEventId: String(event.id),
      });
    }
  }
};

export const notifyCompletedEvents = async (): Promise<void> => {
  const now = new Date();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, ends_at")
    .eq("status", "approved")
    .not("ends_at", "is", null);

  if (error) {
    console.warn("Unable to load completed events for notifications", error.message);
    return;
  }

  for (const event of data ?? []) {
    const endsAt = event.ends_at ? new Date(event.ends_at) : null;
    if (!endsAt || endsAt > now) continue;

    const studentIds = await getRegisteredStudentIds(String(event.id));
    if (!studentIds.length) continue;

    await createNotificationsForUsers(studentIds, {
      title: "Thanks for Participating",
      message: `Thank you for participating in "${event.title}".`,
      type: "success",
      relatedEventId: String(event.id),
    });
  }
};

export const getNotifications = async (userId: string): Promise<NotificationItem[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, title, message, type, related_event_id, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Unable to load notifications.");
  }

  return (data ?? []).map((row) => mapNotificationRow(row as Record<string, unknown>));
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message || "Unable to load notifications.");
  }

  return count ?? 0;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);

  if (error) {
    throw new Error(error.message || "Unable to update notification.");
  }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Unable to update notifications.");
  }
};
