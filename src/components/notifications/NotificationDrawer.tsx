import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { NotificationCard } from "./NotificationCard";

type NotificationDrawerProps = {
  open: boolean;
  loading: boolean;
  error?: Error | null;
  notifications: NotificationItem[];
  onClose: () => void;
  onToggleRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => Promise<unknown>;
};

type TabValue = "all" | "unread";

export const NotificationDrawer = ({
  open,
  loading,
  error,
  notifications,
  onClose,
  onToggleRead,
  onMarkAllAsRead,
  onRefresh,
}: NotificationDrawerProps) => {
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("all");
  }, [open]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const visibleNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((item) => !item.isRead);
    }
    return notifications;
  }, [activeTab, notifications]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close notifications backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative z-[1001] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0F111A] shadow-[0_0_80px_rgba(0,0,0,0.55)] transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.24em]">CampusHub</span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Notifications</h2>
              <p className="mt-1 text-sm text-slate-400">You have {unreadCount} unread notifications.</p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full text-slate-300 hover:bg-white/10" onClick={onClose} aria-label="Close notifications">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            {(["all", "unread"] as TabValue[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  activeTab === tab
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white shadow-lg shadow-cyan-500/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                {tab === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Bell className="h-4 w-4 text-cyan-400" />
            <span>Student updates</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full text-slate-300 hover:bg-white/10" onClick={() => void onRefresh()} aria-label="Refresh notifications">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-sm text-cyan-300 hover:bg-cyan-500/20"
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="mb-3 animate-pulse rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-white/10" />
                    <div className="h-3 w-full rounded bg-white/10" />
                    <div className="h-3 w-20 rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <p className="text-lg font-semibold text-white">Unable to load notifications.</p>
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-300">
                <Bell className="h-7 w-7" />
              </div>
              <p className="text-lg font-semibold text-white">No notifications yet.</p>
              <p className="mt-2 text-sm text-slate-400">You&apos;re all caught up.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} onToggleRead={onToggleRead} />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <button type="button" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10">
            <span>View all notifications</span>
            <span className="text-cyan-300">→</span>
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
};
