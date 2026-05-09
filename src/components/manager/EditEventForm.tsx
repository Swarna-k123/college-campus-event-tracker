import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EventCategory } from "@/data/events";
import type { ManagerEvent } from "@/data/managerEvents";

export type EditEventSubmitPayload = {
  title: string;
  description: string;
  venue: string;
  category: EventCategory;
  maxRegistrations: number;
  startsAt: Date;
  posterFile: File | null;
};

const CATEGORIES: EventCategory[] = ["Technical", "Cultural", "Sports", "Others"];

type Props = {
  event: ManagerEvent;
  onSave: (payload: EditEventSubmitPayload) => Promise<void>;
  onCancel: () => void;
};

export const EditEventForm = ({ event, onSave, onCancel }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const initialDate = new Date(event.date);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState(
    `${String(initialDate.getHours()).padStart(2, "0")}:${String(initialDate.getMinutes()).padStart(2, "0")}`
  );
  const [venue, setVenue] = useState(event.venue);
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [maxReg, setMaxReg] = useState(String(event.maxRegistrations));
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>(event.poster);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (posterPreview.startsWith("blob:")) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    if (posterPreview.startsWith("blob:")) URL.revokeObjectURL(posterPreview);
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length > 120) return toast.error("Enter a valid title (1–120 chars)");
    if (!description.trim() || description.length > 1000)
      return toast.error("Description is required (max 1000 chars)");
    if (!date) return toast.error("Pick a date");
    if (!venue.trim()) return toast.error("Enter a venue");
    const max = parseInt(maxReg, 10);
    if (!max || max < 1 || max > 10000) return toast.error("Max registrations must be 1–10,000");

    const [hh, mm] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(hh || 0, mm || 0, 0, 0);

    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        category,
        maxRegistrations: max,
        startsAt: dt,
        posterFile,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save event";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_260px] gap-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Event Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="bg-secondary/60 border-border/60 h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="bg-secondary/60 border-border/60 resize-none"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal bg-secondary/60 border-border/60",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-time">Time</Label>
            <Input
              id="edit-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-venue">Venue</Label>
            <Input
              id="edit-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              maxLength={120}
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger className="h-11 bg-secondary/60 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-max">Max Registrations</Label>
          <Input
            id="edit-max"
            type="number"
            min={1}
            max={10000}
            value={maxReg}
            onChange={(e) => setMaxReg(e.target.value)}
            className="bg-secondary/60 border-border/60 h-11"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Poster</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="relative rounded-2xl overflow-hidden border border-border/60 aspect-[4/5]">
          <img src={posterPreview} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-x-2 bottom-2 py-2 rounded-xl bg-background/80 backdrop-blur text-sm border border-border/60 hover:bg-secondary"
          >
            Replace image
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Leave unchanged to keep the current poster URL.</p>
      </div>
    </form>
  );
};
