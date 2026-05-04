import { Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ManagerEvent } from "@/data/managerEvents";

const categoryStyles: Record<string, string> = {
  Technical: "bg-primary/20 text-primary border-primary/40",
  Cultural: "bg-accent/20 text-accent border-accent/40",
  Sports: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Others: "bg-secondary text-foreground border-border",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const EventCard = ({ event }: { event: ManagerEvent }) => (
  <article className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border/60 bg-gradient-card shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:border-primary/40">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={event.poster}
        alt={`${event.title} poster`}
        loading="lazy"
        width={768}
        height={576}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
      <Badge variant="outline" className={`absolute top-3 left-3 backdrop-blur-md ${categoryStyles[event.category]}`}>
        {event.category}
      </Badge>
    </div>
    <div className="flex flex-col flex-1 gap-3 p-5">
      <div className="flex-1 min-h-0">
        <h3 className="font-semibold text-base leading-snug line-clamp-2">{event.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{event.club}</p>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> {formatDate(event.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {event.registrants.length}
        </span>
      </div>
      <Button className="w-full bg-gradient-primary text-primary-foreground border-0 hover:opacity-90">
        Register Now
      </Button>
    </div>
  </article>
);