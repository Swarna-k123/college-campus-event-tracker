import { Calendar, Clock, MapPin, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ManagerEvent } from "@/data/managerEvents";
import { registrationCount } from "@/data/managerEvents";

const categoryStyles: Record<string, string> = {
  Technical: "bg-blue-500/20 text-blue-300 border-blue-500/50",
  Cultural: "bg-purple-500/20 text-purple-300 border-purple-500/50",
  Sports: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
  Hackathons: "bg-pink-500/20 text-pink-300 border-pink-500/50",
  Workshops: "bg-orange-500/20 text-orange-300 border-orange-500/50",
  Others: "bg-slate-500/20 text-slate-300 border-slate-500/50",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTimeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

type Props = {
  event: ManagerEvent;
  onRegisterClick?: () => void;
  isRegistered?: boolean;
};

export const EventCard = ({ event, onRegisterClick, isRegistered }: Props) => {
  const count = registrationCount(event);
  const isFull = count >= event.maxRegistrations;
  const occupancyPercent = Math.round((count / event.maxRegistrations) * 100);

  return (
    <article className="group flex flex-col h-full rounded-3xl overflow-hidden border border-border/40 bg-gradient-card shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-glow hover:border-primary/50">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-accent/10">
        <img
          src={event.poster}
          alt={`${event.title} poster`}
          loading="lazy"
          width={768}
          height={576}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <Badge variant="outline" className={`backdrop-blur-md font-semibold ${categoryStyles[event.category]}`}>
            {event.category}
          </Badge>
          {event.eventType === "team" && (
            <Badge variant="outline" className="backdrop-blur-md bg-background/40 border-border/60 text-xs font-medium gap-1">
              <Zap className="h-3 w-3" /> Team
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-col flex-1 gap-4 p-6">
        <div className="flex-1 min-h-0">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 text-foreground">{event.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{event.club}</p>
        </div>
        {isRegistered ? (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-primary" /> {formatDateOnly(event.date)}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" /> {formatTimeOnly(event.date)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" /> {event.venue}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {count}
            </span>
          </div>
        )}

        {!isRegistered && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Capacity</span>
              <span className="font-bold text-foreground">{occupancyPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/60 overflow-hidden border border-border/40">
              <div
                className="h-full bg-gradient-primary transition-all duration-300"
                style={{ width: `${Math.min(100, occupancyPercent)}%` }}
              />
            </div>
          </div>
        )}

        {isRegistered ? (
          <Badge variant="outline" className="w-full justify-center py-2.5 text-sm font-semibold bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
            ✓ Registered
          </Badge>
        ) : isFull ? (
          <Badge variant="outline" className="w-full justify-center py-2.5 text-sm font-semibold bg-destructive/15 text-destructive border-destructive/40">
            Event Full
          </Badge>
        ) : (
          <Button
            type="button"
            className="w-full bg-gradient-primary text-primary-foreground border-0 hover:opacity-90 font-semibold py-2.5 h-auto rounded-xl transition-all duration-200 hover:shadow-glow"
            onClick={onRegisterClick}
          >
            Register Now
          </Button>
        )}
      </div>
    </article>
  );
};
