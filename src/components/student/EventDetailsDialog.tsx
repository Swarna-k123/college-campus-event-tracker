import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  X,
  Building2,
  CheckCircle2,
  Tag,
  Armchair,
  Timer,
  Info,
} from "lucide-react";
import type { ManagerEvent } from "@/data/managerEvents";
import { registrationCount } from "@/data/managerEvents";
import { cn } from "@/lib/utils";
import { categoryStyles, formatDateOnly, formatTimeOnly } from "@/components/EventCard";

/** Registration deadline: 1 hour before start (best-effort approximation) */
const formatDeadline = (iso: string) => {
  const d = new Date(new Date(iso).getTime() - 60 * 60 * 1000);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

type Props = {
  event: ManagerEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRegistered: boolean;
  onRegisterClick: () => void;
};

/** Info row used inside the details dialog */
const InfoRow = ({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">{label}</p>
      <p className={cn("text-sm font-medium mt-0.5 leading-snug", valueClass)}>{value}</p>
    </div>
  </div>
);

/** Reusable Event Details Dialog — shows FULL poster with correct aspect ratio, no cropping. */
export const EventDetailsDialog = ({
  event,
  open,
  onOpenChange,
  isRegistered,
  onRegisterClick,
}: Props) => {
  if (!event) return null;

  const count = registrationCount(event);
  const seatsLeft = Math.max(0, event.maxRegistrations - count);
  const isFull = seatsLeft === 0;

  const now = Date.now();
  const endTime = event.endsAt ? +new Date(event.endsAt) : +new Date(event.date);
  const isRegistrationClosed = 
    (event.registrationClosesAt && +new Date(event.registrationClosesAt) < now) ||
    (endTime < now);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden",
          "bg-[#0d0d18] border-border/50 shadow-2xl",
          "max-w-lg w-full max-h-[92vh] overflow-y-auto rounded-2xl"
        )}
      >
        {/* ── Close button (floating) ── */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors border border-white/10"
          aria-label="Close event details"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* ── Full poster — natural aspect ratio, no crop ── */}
        <div className="relative w-full bg-black/40">
          <img
            src={event.poster}
            alt={`${event.title} poster`}
            className="w-full h-auto object-contain block"
            style={{ maxHeight: "55vh" }}
          />
          {/* Soft fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d0d18] to-transparent pointer-events-none" />
        </div>

        {/* ── Content body ── */}
        <div className="px-6 pb-6 pt-2 space-y-6">

          {/* Category badge + title */}
          <div>
            <Badge
              variant="outline"
              className={cn(
                "mb-3 text-xs font-semibold backdrop-blur-md",
                categoryStyles[event.category] ?? categoryStyles["Others"]
              )}
            >
              <Tag className="h-3 w-3 mr-1" />
              {event.category}
            </Badge>
            <h2 className="text-2xl font-extrabold tracking-tight leading-tight text-foreground">
              {event.title}
            </h2>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* ── Organizing Club ── */}
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
            {event.clubLogoUrl ? (
              <img
                src={event.clubLogoUrl}
                alt={`${event.club} logo`}
                className="h-10 w-10 rounded-xl object-contain border border-border/60 bg-background/50 p-0.5 shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl border border-border/60 bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary/70" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">
                Organized by
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5 truncate">{event.club}</p>
            </div>
          </div>

          {/* ── Event details grid ── */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
              Event Details
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Date"
                value={formatDateOnly(event.date)}
              />
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Time"
                value={formatTimeOnly(event.date)}
              />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Venue"
                value={event.venue}
              />
              <InfoRow
                icon={<Armchair className="h-4 w-4" />}
                label="Available Seats"
                value={
                  isFull ? (
                    <span className="text-red-400 font-semibold">Fully Booked</span>
                  ) : (
                    <>
                      <span className={seatsLeft <= 10 ? "text-amber-400 font-semibold" : undefined}>
                        {seatsLeft} seats left
                      </span>
                      <span className="text-muted-foreground font-normal"> / {event.maxRegistrations} total</span>
                    </>
                  )
                }
              />
              <InfoRow
                icon={<Users className="h-4 w-4" />}
                label="Registrations"
                value={`${count} student${count !== 1 ? "s" : ""} registered`}
              />
              <InfoRow
                icon={<Timer className="h-4 w-4" />}
                label="Registration Deadline"
                value={formatDeadline(event.date)}
                valueClass="text-muted-foreground"
              />
            </div>
          </div>

          {/* Team event info */}
          {event.eventType === "team" && event.minTeamSize && event.maxTeamSize && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-primary/80 font-medium">
                Team event:{" "}
                {event.minTeamSize === event.maxTeamSize
                  ? `${event.minTeamSize} members per team`
                  : `${event.minTeamSize}–${event.maxTeamSize} members per team`}
              </p>
            </div>
          )}

          {/* ── Action ── */}
          <div className="pt-1">
            {isRegistered ? (
              <div className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                You&apos;re Registered for This Event
              </div>
            ) : isFull ? (
              <Button disabled className="w-full h-11 opacity-60" variant="outline">
                <Users className="h-4 w-4 mr-2" /> Event Full — Registration Closed
              </Button>
            ) : isRegistrationClosed ? (
              <Button disabled className="w-full h-11 opacity-60" variant="outline">
                <Clock className="h-4 w-4 mr-2" /> Registration Closed
              </Button>
            ) : (
              <Button
                className="w-full h-12 bg-gradient-primary text-primary-foreground border-0 hover:opacity-90 text-base font-bold shadow-glow tracking-wide"
                onClick={onRegisterClick}
              >
                Register Now
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
