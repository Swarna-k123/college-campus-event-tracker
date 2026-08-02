import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, MapPin, QrCode } from "lucide-react";
import QRCode from "react-qr-code";

type EntryPassDialogProps = {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  open: boolean;
  onClose: () => void;
};

const formatPassDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const EntryPassDialog = ({
  registrationId,
  eventId,
  eventTitle,
  eventDate,
  eventVenue,
  open,
  onClose,
}: EntryPassDialogProps) => {
  const payload = JSON.stringify({ registrationId, eventId });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md border-border/60 bg-background/95 p-0 overflow-hidden">
        <div className="p-6 sm:p-8">
          <DialogHeader className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">
              Entry Pass
            </p>
            <DialogTitle className="text-2xl font-semibold tracking-tight">ENTRY PASS</DialogTitle>
          </DialogHeader>

          <div className="mt-6 rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
            <div className="flex justify-center rounded-2xl bg-white p-4 sm:p-6">
              <QRCode
                value={payload}
                size={220}
                level="H"
                bgColor="#ffffff"
                fgColor="#0f172a"
                className="h-auto w-full max-w-[220px]"
              />
            </div>

            <div className="mt-5 space-y-3 text-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Event
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">{eventTitle}</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>{formatPassDate(eventDate)}</span>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{eventVenue}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" />
            <span>Scan at the venue entrance</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
