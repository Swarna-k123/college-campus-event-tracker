import { Calendar, Clock, MapPin, Users, Download, Award, Building2, Tag, Armchair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ManagerEvent } from "@/data/managerEvents";
import { registrationCount } from "@/data/managerEvents";
import { useState } from "react";
import { toast } from "sonner";
import { downloadCertificate, checkCertificateEligibility } from "@/lib/downloadCertificate";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export const categoryStyles: Record<string, string> = {
  Technical: "bg-primary/20 text-primary border-primary/40",
  Cultural: "bg-accent/20 text-accent border-accent/40",
  Sports: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Others: "bg-secondary text-foreground border-border",
  Hackathons: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  Workshops: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

export const formatDateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const formatTimeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

type Props = {
  event: ManagerEvent;
  onRegisterClick?: () => void;
  /** Called when the user clicks anywhere on the card body (except Register/Certificate buttons). */
  onDetailsClick?: () => void;
  isRegistered?: boolean;
  showCertificateButton?: boolean;
};

/** Club logo avatar */
const ClubAvatar = ({ name, logoUrl, size = "sm" }: { name: string; logoUrl?: string | null; size?: "sm" | "md" }) => {
  const sizeClass = size === "md" ? "h-7 w-7 rounded-lg" : "h-5 w-5 rounded-md";
  const iconClass = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn(sizeClass, "object-contain border border-border/50 bg-background/50 shrink-0")}
      />
    );
  }
  return (
    <div className={cn(sizeClass, "border border-border/50 bg-primary/10 flex items-center justify-center shrink-0")}>
      <Building2 className={cn(iconClass, "text-primary/60")} />
    </div>
  );
};

export const EventCard = ({
  event,
  onRegisterClick,
  onDetailsClick,
  isRegistered,
  showCertificateButton = false,
}: Props) => {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const count = registrationCount(event);
  const seatsLeft = Math.max(0, event.maxRegistrations - count);
  const isFull = seatsLeft === 0;
  
  const now = Date.now();
  const endTime = event.endsAt ? +new Date(event.endsAt) : +new Date(event.date);
  const isRegistrationClosed = 
    (event.registrationClosesAt && +new Date(event.registrationClosesAt) < now) ||
    (endTime < now);

  const handleCertificateClick = async () => {
    if (!user) return;
    setIsDownloading(true);
    try {
      const eligibility = await checkCertificateEligibility(event.id, user.id);
      if (!eligibility.eligible) {
        toast.error(eligibility.reason || "Cannot download certificate");
        return;
      }
      await downloadCertificate(
        event.id,
        user.id,
        user.name || "Student",
        event.certificateNameX || null,
        event.certificateNameY || null
      );
      toast.success("Certificate downloaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download certificate");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <article className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border/60 bg-gradient-card shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:border-primary/40">
      {/* ── Poster ── clickable to open details */}
      <div
        className={cn("relative overflow-hidden shrink-0", onDetailsClick && "cursor-pointer")}
        onClick={onDetailsClick}
        role={onDetailsClick ? "button" : undefined}
        tabIndex={onDetailsClick ? 0 : undefined}
        onKeyDown={onDetailsClick ? (e) => e.key === "Enter" && onDetailsClick() : undefined}
        aria-label={onDetailsClick ? `View details for ${event.title}` : undefined}
      >
        <img
          src={event.poster}
          alt={`${event.title} poster`}
          loading="lazy"
          className="w-full aspect-[16/9] object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {/* Category badge */}
        <Badge
          variant="outline"
          className={cn(
            "absolute top-3 left-3 backdrop-blur-md text-[11px] font-semibold",
            categoryStyles[event.category] ?? categoryStyles["Others"]
          )}
        >
          <Tag className="h-2.5 w-2.5 mr-1" />
          {event.category}
        </Badge>

        {/* Registered badge overlay */}
        {isRegistered && (
          <Badge
            variant="outline"
            className="absolute top-3 right-3 backdrop-blur-md bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-semibold"
          >
            ✓ Registered
          </Badge>
        )}

        {/* Hover hint */}
        {onDetailsClick && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              View Details
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 gap-0 p-4">
        {/* Club row */}
        <div
          className={cn("flex items-center gap-2 mb-2.5", onDetailsClick && "cursor-pointer")}
          onClick={onDetailsClick}
        >
          <ClubAvatar name={event.club} logoUrl={event.clubLogoUrl} />
          <p className="text-xs text-muted-foreground truncate font-medium">{event.club}</p>
        </div>

        {/* Title */}
        <div
          className={cn("mb-3", onDetailsClick && "cursor-pointer")}
          onClick={onDetailsClick}
        >
          <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground/95 group-hover:text-primary transition-colors duration-200">
            {event.title}
          </h3>
        </div>

        {/* ── Info rows ── */}
        <div className="space-y-1.5 mb-4 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="truncate">{formatDateOnly(event.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span>{formatTimeOnly(event.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Armchair className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            {isFull ? (
              <span className="text-red-400 font-medium">Full</span>
            ) : (
              <span className={cn("font-medium", seatsLeft <= 10 ? "text-amber-400" : "text-muted-foreground")}>
                {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left
                <span className="text-muted-foreground/60 font-normal"> / {event.maxRegistrations}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Action ── */}
        {isRegistered ? (
          <div className="space-y-2">
            {showCertificateButton && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-border/60 text-sm"
                onClick={(e) => { e.stopPropagation(); void handleCertificateClick(); }}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <><Award className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="h-4 w-4" /> Download Certificate</>
                )}
              </Button>
            )}
          </div>
        ) : isFull ? (
          <Button type="button" disabled variant="outline" className="w-full text-sm opacity-60">
            <Users className="h-4 w-4 mr-2" /> Event Full
          </Button>
        ) : isRegistrationClosed ? (
          <Button type="button" disabled variant="outline" className="w-full text-sm opacity-60">
            <Clock className="h-4 w-4 mr-2" /> Registration Closed
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full bg-gradient-primary text-primary-foreground border-0 hover:opacity-90 text-sm font-semibold"
            onClick={(e) => { e.stopPropagation(); onRegisterClick?.(); }}
          >
            Register Now
          </Button>
        )}
      </div>
    </article>
  );
};
