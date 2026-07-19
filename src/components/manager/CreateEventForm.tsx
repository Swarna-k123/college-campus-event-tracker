import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ImagePlus, Loader2, X, CheckCircle2 } from "lucide-react";
import { CertificateTemplatePicker } from "@/components/manager/CertificateTemplatePicker";
import { VenueConflictWarning } from "./VenueConflictWarning";
import { checkVenueConflict } from "@/lib/checkVenueConflict";
import type { ConflictEvent } from "@/data/events";
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
import type { EventType } from "@/data/teamRegistration";

export type CreateEventSubmitPayload = {
  title: string;
  description: string;
  venue: string;
  category: EventCategory;
  maxRegistrations: number;
  budget: number;
  eventType: EventType;
  minTeamSize: number | null;
  maxTeamSize: number | null;
  startsAt: Date;
  endsAt: Date;
  registrationClosesAt: Date | null;
  posterFile: File;
  certificatesEnabled?: boolean;
  certificateFile?: File | null;
  certificateNameX?: number | null;
  certificateNameY?: number | null;
};

interface Props {
  onCreate: (payload: CreateEventSubmitPayload) => Promise<void>;
}

const CATEGORIES: EventCategory[] = ["Technical", "Cultural", "Sports", "Others"];

export const CreateEventForm = ({ onCreate }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("17:00");
  const [endTime, setEndTime] = useState("19:00");
  const [regCloseDate, setRegCloseDate] = useState<Date | undefined>();
  const [regCloseTime, setRegCloseTime] = useState("12:00");
  const [venue, setVenue] = useState("");
  const [conflict, setConflict] = useState<ConflictEvent | null>(null);
  const [isValidatingVenue, setIsValidatingVenue] = useState(false);
  const [category, setCategory] = useState<EventCategory | "">("");
  const [maxReg, setMaxReg] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [eventType, setEventType] = useState<EventType>("individual");
  const [minTeamSize, setMinTeamSize] = useState<string>("");
  const [maxTeamSize, setMaxTeamSize] = useState<string>("");
  const [minTeamErr, setMinTeamErr] = useState("");
  const [maxTeamErr, setMaxTeamErr] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [certEnabled, setCertEnabled] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateName, setCertificateName] = useState<string | null>(null);
  const [certNameX, setCertNameX] = useState<number | null>(null);
  const [certNameY, setCertNameY] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (posterPreview?.startsWith("blob:")) URL.revokeObjectURL(posterPreview);
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
    if (posterPreview?.startsWith("blob:")) URL.revokeObjectURL(posterPreview);
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };



  const reset = () => {
    setTitle("");
    setDescription("");
    setDate(undefined);
    setTime("17:00");
    setEndTime("19:00");
    setRegCloseDate(undefined);
    setRegCloseTime("12:00");
    setVenue("");
    setConflict(null);
    setIsValidatingVenue(false);
    setCategory("");
    setMaxReg("");
    setBudget("");
    setEventType("individual");
    setMinTeamSize("");
    setMaxTeamSize("");
    setMinTeamErr("");
    setMaxTeamErr("");
    if (posterPreview?.startsWith("blob:")) URL.revokeObjectURL(posterPreview);
    setPosterFile(null);
    setPosterPreview(null);
    setCertEnabled(false);
    setCertificateFile(null);
    setCertificateName(null);
    setCertNameX(null);
    setCertNameY(null);
  };

  useEffect(() => {
    const checkConflict = async () => {
      if (!date || !venue.trim() || !time || !endTime) {
        setConflict(null);
        return;
      }
      setIsValidatingVenue(true);
      const res = await checkVenueConflict(venue, date, time, endTime);
      setConflict(res);
      setIsValidatingVenue(false);
    };

    const timer = setTimeout(checkConflict, 500);
    return () => clearTimeout(timer);
  }, [venue, date, time, endTime]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length > 120) return toast.error("Enter a valid title (1–120 chars)");
    if (!description.trim() || description.length > 1000)
      return toast.error("Description is required (max 1000 chars)");
    if (!posterFile) return toast.error("Please upload a poster");
    if (!date) return toast.error("Pick a date");
    if (!venue.trim()) return toast.error("Enter a venue");
    if (!category) return toast.error("Select a category");
    const max = parseInt(maxReg, 10);
    if (!max || max < 1 || max > 10000) return toast.error("Max registrations must be 1–10,000");
    const budgetAmount = parseFloat(budget);
    if (!budget.trim() || Number.isNaN(budgetAmount) || budgetAmount < 0)
      return toast.error("Enter a valid approximate budget");

    let minT: number | null = null;
    let maxT: number | null = null;
    setMinTeamErr("");
    setMaxTeamErr("");
    if (eventType === "team") {
      const minParsed = parseInt(minTeamSize, 10);
      const maxParsed = parseInt(maxTeamSize, 10);
      let teamOk = true;
      if (!Number.isFinite(minParsed) || minParsed < 1) {
        setMinTeamErr("Minimum team size must be at least 1");
        teamOk = false;
      }
      if (!Number.isFinite(maxParsed)) {
        setMaxTeamErr("Enter a valid maximum team size");
        teamOk = false;
      } else if (Number.isFinite(minParsed) && maxParsed < minParsed) {
        setMaxTeamErr("Maximum team size must be greater than or equal to minimum team size");
        teamOk = false;
      }
      if (!teamOk) return;
      minT = minParsed;
      maxT = maxParsed;
    }

    const [hh, mm] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(hh || 0, mm || 0, 0, 0);

    const [ehh, emm] = endTime.split(":").map(Number);
    const edt = new Date(date);
    edt.setHours(ehh || 0, emm || 0, 0, 0);
    
    if (edt <= dt) {
      return toast.error("End time must be after start time");
    }

    let regClosesDt: Date | null = null;
    if (regCloseDate) {
      const [rchh, rcmm] = regCloseTime.split(":").map(Number);
      regClosesDt = new Date(regCloseDate);
      regClosesDt.setHours(rchh || 0, rcmm || 0, 0, 0);
      if (regClosesDt >= dt) {
        return toast.error("Registration closing time must be before the event starts.");
      }
    }

    if (conflict) {
      return toast.error("Please resolve the venue conflict before submitting");
    }

    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        category,
        maxRegistrations: max,
        budget: budgetAmount,
        eventType,
        minTeamSize: minT,
        maxTeamSize: maxT,
        startsAt: dt,
        endsAt: edt,
        registrationClosesAt: regClosesDt,
        posterFile,
        certificatesEnabled: certEnabled,
        certificateFile: certEnabled ? certificateFile ?? null : null,
        certificateNameX: certEnabled ? certNameX : null,
        certificateNameY: certEnabled ? certNameY : null,
      });
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create event";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AI & Robotics Summit"
            maxLength={120}
            className="bg-secondary/60 border-border/60 h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the event about?"
            maxLength={1000}
            rows={4}
            className="bg-secondary/60 border-border/60 resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
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
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Start Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
        </div>

        {/* Registration Closing Date & Time */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Registration Closing Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal bg-secondary/60 border-border/60",
                    !regCloseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {regCloseDate ? format(regCloseDate, "PPP") : "Pick a date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={regCloseDate}
                  onSelect={setRegCloseDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="regCloseTime">Registration Closing Time</Label>
            <Input
              id="regCloseTime"
              type="time"
              value={regCloseTime}
              onChange={(e) => setRegCloseTime(e.target.value)}
              disabled={!regCloseDate}
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Auditorium A"
              maxLength={120}
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
          
          <div className="sm:col-span-2 empty:hidden">
            {isValidatingVenue ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking venue availability...
              </div>
            ) : conflict ? (
              <VenueConflictWarning conflictEvent={conflict} />
            ) : venue.trim() && date && time && endTime && !conflict ? (
              <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg w-fit animate-in fade-in zoom-in-95">
                <CheckCircle2 className="h-4 w-4" />
                This venue is available for the selected time.
              </div>
            ) : null}
          </div>
          
          <div className="space-y-2 sm:col-span-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger className="h-11 bg-secondary/60 border-border/60">
                <SelectValue placeholder="Select category" />
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
          <Label>Event Type</Label>
          <Select
            value={eventType}
            onValueChange={(v) => {
              setEventType(v as EventType);
              if (v === "individual") {
                setMinTeamSize("");
                setMaxTeamSize("");
                setMinTeamErr("");
                setMaxTeamErr("");
              }
            }}
          >
            <SelectTrigger className="h-11 bg-secondary/60 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual Event</SelectItem>
              <SelectItem value="team">Team Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {eventType === "team" && (
          <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <Label htmlFor="minTeamSize">
                Minimum Team Size <span className="text-destructive">*</span>
              </Label>
              <Input
                id="minTeamSize"
                type="number"
                min={1}
                value={minTeamSize}
                onChange={(e) => {
                  setMinTeamSize(e.target.value);
                  setMinTeamErr("");
                }}
                placeholder="e.g. 2"
                className="bg-secondary/60 border-border/60 h-11"
                aria-invalid={!!minTeamErr}
              />
              {minTeamErr ? <p className="text-sm text-destructive">{minTeamErr}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTeamSize">
                Maximum Team Size <span className="text-destructive">*</span>
              </Label>
              <Input
                id="maxTeamSize"
                type="number"
                min={1}
                value={maxTeamSize}
                onChange={(e) => {
                  setMaxTeamSize(e.target.value);
                  setMaxTeamErr("");
                }}
                placeholder="e.g. 5"
                className="bg-secondary/60 border-border/60 h-11"
                aria-invalid={!!maxTeamErr}
              />
              {maxTeamErr ? <p className="text-sm text-destructive">{maxTeamErr}</p> : null}
            </div>
          </div>
        )}



        {/* Payment fields removed: legacy `isPaid` / `registrationFee` references caused runtime errors */}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max">Max Registrations</Label>
            <Input
              id="max"
              type="number"
              min={1}
              max={10000}
              value={maxReg}
              onChange={(e) => setMaxReg(e.target.value)}
              placeholder="e.g. 200"
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Approximate Budget</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Enter estimated budget"
              className="bg-secondary/60 border-border/60 h-11"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting || !!conflict}
            className="bg-gradient-primary text-primary-foreground border-0 shadow-glow gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit for Approval
          </Button>
          {conflict && (
            <div className="w-full text-sm text-destructive mt-1">
              Please choose another venue or modify the event timing before submitting.
            </div>
          )}
          <Button type="button" variant="ghost" onClick={reset} disabled={submitting}>
            Reset
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Certificates Available</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCertEnabled(true)}
              className={cn(
                "px-3 py-1 rounded-md h-9",
                certEnabled ? "bg-primary text-primary-foreground" : "bg-background/60 border border-border/60"
              )}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => {
                setCertEnabled(false);
                setCertificateFile(null);
                setCertificateName(null);
                setCertNameX(null);
                setCertNameY(null);
              }}
              className={cn(
                "px-3 py-1 rounded-md h-9",
                !certEnabled ? "bg-primary text-primary-foreground" : "bg-background/60 border border-border/60"
              )}
            >
              No
            </button>
          </div>
          <CertificateTemplatePicker
            certEnabled={certEnabled}
            existingTemplateName={certificateName}
            onFileChange={(file) => {
              setCertificateFile(file);
              setCertificateName(file?.name ?? null);
            }}
            onNamePositionChange={(x, y) => {
              setCertNameX(x);
              setCertNameY(y);
            }}
            onClearPosition={() => {
              setCertNameX(null);
              setCertNameY(null);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Poster <span className="text-destructive">*</span></Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {posterPreview ? (
          <div className="relative group rounded-2xl overflow-hidden border border-border/60 aspect-[4/5]">
            <img src={posterPreview} alt="Poster preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                if (posterPreview.startsWith("blob:")) URL.revokeObjectURL(posterPreview);
                setPosterPreview(null);
                setPosterFile(null);
              }}
              className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur border border-border/60 hover:bg-destructive hover:text-destructive-foreground transition-colors"
              aria-label="Remove poster"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-x-2 bottom-2 py-2 rounded-xl bg-background/80 backdrop-blur text-sm border border-border/60 hover:bg-secondary"
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-[4/5] rounded-2xl border-2 border-dashed border-border bg-card/40 hover:border-primary/60 hover:bg-secondary/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary/60 border border-border/60">
              <ImagePlus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">Upload poster</p>
            <p className="text-xs">PNG or JPG up to 5MB</p>
          </button>
        )}
      </div>
    </form>
  );
};
