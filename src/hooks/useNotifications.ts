import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "@/lib/notifications";

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id ?? "";

  const notificationsQuery = useQuery<NotificationItem[]>({
    queryKey: ["notifications", userId],
    queryFn: () => getNotifications(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const unreadCountQuery = useQuery<number>({
    queryKey: ["notifications-unread-count", userId],
    queryFn: () => getUnreadNotificationCount(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread-count", userId] });

      const previousNotifications = queryClient.getQueryData<NotificationItem[]>(["notifications", userId]);
      queryClient.setQueryData<NotificationItem[]>(["notifications", userId], (current = []) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item))
      );
      queryClient.setQueryData<number>(["notifications-unread-count", userId], (current = 0) => Math.max(0, current - 1));

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", userId], context.previousNotifications);
      }
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", userId] });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(userId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread-count", userId] });

      const previousNotifications = queryClient.getQueryData<NotificationItem[]>(["notifications", userId]);
      queryClient.setQueryData<NotificationItem[]>(["notifications", userId], (current = []) =>
        current.map((item) => ({ ...item, isRead: true }))
      );
      queryClient.setQueryData<number>(["notifications-unread-count", userId], 0);

      return { previousNotifications };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", userId], context.previousNotifications);
      }
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", userId] });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", userId] });
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          void queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = unreadCountQuery.data ?? 0;

  return useMemo(
    () => ({
      notifications,
      unreadCount,
      loading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
      error: notificationsQuery.error || unreadCountQuery.error,
      markAsRead: (notificationId: string) => markAsReadMutation.mutate(notificationId),
      markAllAsRead: () => markAllAsReadMutation.mutate(),
      refetch: async () => {
        await notificationsQuery.refetch();
        await unreadCountQuery.refetch();
      },
    }),
    [notifications, unreadCount, notificationsQuery.isLoading, unreadCountQuery.isLoading, notificationsQuery.error, unreadCountQuery.error, markAsReadMutation, markAllAsReadMutation, notificationsQuery, unreadCountQuery],
  );
};
