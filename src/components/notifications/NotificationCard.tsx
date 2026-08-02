import { AlertCircle, AlertTriangle, BellRing, CheckCircle2, Info } from "lucide-react";
import type { NotificationItem, NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const iconMap: Record<NotificationType, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  reminder: BellRing,
};

const accentMap: Record<NotificationType, { chip: string; icon: string; border: string }> = {
  success: {
    chip: "bg-emerald-500/10",
    icon: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  info: {
    chip: "bg-cyan-500/10",
    icon: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  warning: {
    chip: "bg-amber-500/10",
    icon: "text-amber-400",
    border: "border-amber-500/20",
  },
  error: {
    chip: "bg-rose-500/10",
    icon: "text-rose-400",
    border: "border-rose-500/20",
  },
  reminder: {
    chip: "bg-violet-500/10",
    icon: "text-violet-400",
    border: "border-violet-500/20",
  },
};

const formatRelativeTime = (createdAt: string) => {
  const timestamp = new Date(createdAt);
  if (Number.isNaN(timestamp.getTime())) {
    return "Just now";
  }

  const diffInMinutes = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 60_000));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  return `${diffInDays} days ago`;
};

type NotificationCardProps = {
  notification: NotificationItem;
  onToggleRead: (id: string) => void;
};

export const NotificationCard = ({ notification, onToggleRead }: NotificationCardProps) => {
  const Icon = iconMap[notification.type];
  const accent = accentMap[notification.type];

  return (
    <button
      type="button"
      onClick={() => onToggleRead(notification.id)}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-white/10",
        notification.isRead
          ? "border-white/10 bg-white/5 text-slate-400"
          : "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-slate-900/70 to-violet-500/10 text-white shadow-lg shadow-cyan-500/10",
      )}
    >
      <div className="flex gap-3">
        <div className={cn("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", accent.chip, accent.border)}>
          <Icon className={cn("h-5 w-5", accent.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {!notification.isRead && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" />}
              <p className={cn("truncate font-semibold", notification.isRead ? "text-slate-300" : "text-white")}>{notification.title}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(notification.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{notification.message}</p>
        </div>
      </div>
    </button>
  );
};
