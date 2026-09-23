import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EventPosterPreviewProps = {
  /** The event's existing poster URL (from the database). */
  posterUrl?: string | null;
  /** Event title, used for accessible alt text / labels. */
  title: string;
  /** Classes for the thumbnail container (sizing, rounding, etc.) — unchanged from callsite. */
  className?: string;
  /** Classes for the <img> itself (object-fit, hover scale, etc.) — unchanged from callsite. */
  imgClassName?: string;
  /** Rendered instead of the image when there is no poster URL. */
  placeholder?: ReactNode;
  /** Extra content rendered on top of the thumbnail image (e.g. badges, gradient overlays). */
  overlay?: ReactNode;
};

/**
 * Wraps an event poster thumbnail so it becomes clickable, opening a lightbox
 * Dialog with the full, uncropped poster. Reuses the existing shadcn/ui Dialog
 * component and the poster URL already stored for the event — no new image
 * copies, no schema changes.
 */
export const EventPosterPreview = ({
  posterUrl,
  title,
  className,
  imgClassName,
  placeholder,
  overlay,
}: EventPosterPreviewProps) => {
  const [open, setOpen] = useState(false);

  if (!posterUrl) {
    return (
      <div className={className}>
        {placeholder}
        {overlay}
      </div>
    );
  }

  const openPreview = () => setOpen(true);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPreview();
    }
  };

  return (
    <>
      <div
        className={cn(className, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background")}
        role="button"
        tabIndex={0}
        aria-label={`View full poster for ${title}`}
        onClick={openPreview}
        onKeyDown={handleKeyDown}
      >
        <img src={posterUrl} alt={`Poster for ${title}`} className={imgClassName} loading="lazy" />
        {overlay}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-fit max-w-[95vw] sm:max-w-3xl max-h-[90vh] p-2 sm:p-3 bg-background/95 border-border/40 flex items-center justify-center overflow-hidden">
          <DialogTitle className="sr-only">Poster for {title}</DialogTitle>
          <img
            src={posterUrl}
            alt={`Poster for ${title}`}
            className="max-h-[85vh] max-w-full w-auto h-auto object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
