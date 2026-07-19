import { AlertCircle, Building2, User, Mail, Calendar, Clock, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { ConflictEvent } from "@/data/events";
import { cn } from "@/lib/utils";

interface Props {
  conflictEvent: ConflictEvent;
  className?: string;
}

export const VenueConflictWarning = ({ conflictEvent, className }: Props) => {
  return (
    <div className={cn("animate-in fade-in slide-in-from-top-2 duration-300", className)}>
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
        
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/20 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-destructive flex items-center gap-2">
                Venue Conflict Detected
              </h3>
              <p className="text-sm text-destructive/90 mt-1 mb-4">
                This venue is already reserved during the selected time.
              </p>
              
              <div className="bg-background/60 rounded-lg p-4 border border-border/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  {conflictEvent.clubLogoUrl ? (
                    <img 
                      src={conflictEvent.clubLogoUrl} 
                      alt={conflictEvent.clubName} 
                      className="h-12 w-12 rounded-lg object-cover border border-border/60"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-secondary/50 border border-border/60 flex items-center justify-center text-muted-foreground">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Existing Event</p>
                    <h4 className="font-semibold text-foreground leading-snug line-clamp-1">{conflictEvent.title}</h4>
                    <span className={cn(
                      "inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                      conflictEvent.status === "approved" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                    )}>
                      {conflictEvent.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{conflictEvent.clubName}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{conflictEvent.managerName}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{conflictEvent.managerEmail}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="truncate">{format(new Date(conflictEvent.date), "PPP")}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {format(new Date(conflictEvent.startsAt), "p")} - {format(new Date(conflictEvent.endsAt), "p")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">Same Venue</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
