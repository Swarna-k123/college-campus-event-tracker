import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationDrawer } from "./NotificationDrawer";
import { useNotifications } from "@/hooks/useNotifications";

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refetch } = useNotifications();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative rounded-full transition-transform duration-200 hover:scale-105"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Toggle notifications"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-1 text-[10px] font-semibold text-white shadow-lg shadow-rose-500/30 transition-all duration-300",
            )}
          >
            {unreadCount}
          </span>
        )}
      </Button>

      <NotificationDrawer
        open={isOpen}
        loading={loading}
        error={error}
        notifications={notifications}
        onClose={() => setIsOpen(false)}
        onToggleRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onRefresh={refetch}
      />
    </>
  );
};
