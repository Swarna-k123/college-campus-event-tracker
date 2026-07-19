import { useRef, useState, useCallback, useEffect } from "react";
import { Building2, Upload, Trash2, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  uploadClubLogo,
  removeClubLogo,
  fetchClubLogoUrl,
  validateClubLogo,
} from "@/lib/uploadClubLogo";

export interface ClubLogoUploaderProps {
  /** The club's ID (maps to clubs.id) */
  clubId: string;
  /** Current value of clubs.club_logo_url */
  currentUrl: string | null;
  /** Club name for alt text and placeholder */
  clubName: string;
  /** Called after a successful upload or remove with the new URL (or null) */
  onUploaded?: (newUrl: string | null) => void;
  /** If true, renders in read-only display mode (no upload/remove buttons) */
  readOnly?: boolean;
  /** Visual size variant */
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { outer: "h-12 w-12", icon: "h-5 w-5", text: "text-sm" },
  md: { outer: "h-20 w-20", icon: "h-8 w-8", text: "text-base" },
  lg: { outer: "h-28 w-28", icon: "h-10 w-10", text: "text-lg" },
};

/**
 * Reusable ClubLogoUploader component.
 *
 * Reads from: clubs.club_logo_url
 * Uploads to: club-logos bucket
 * Updates:    clubs.club_logo_url
 *
 * Used by: Manager Settings page and Manager Dashboard.
 */
export const ClubLogoUploader = ({
  clubId,
  currentUrl,
  clubName,
  onUploaded,
  readOnly = false,
  size = "md",
}: ClubLogoUploaderProps) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dims = sizeMap[size];

  useEffect(() => {
    setLogoUrl(currentUrl);
  }, [currentUrl]);

  // Fetch fresh URL from DB on mount
  useEffect(() => {
    if (!clubId) return;
    void fetchClubLogoUrl(clubId).then((url) => {
      if (url !== undefined) setLogoUrl(url);
    });
  }, [clubId]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const validationError = validateClubLogo(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const newUrl = await uploadClubLogo(file, clubId, (pct) => {
          setProgress(pct);
        });
        setLogoUrl(newUrl);
        onUploaded?.(newUrl);
        toast.success("Club logo updated successfully.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [clubId, onUploaded]
  );

  const handleRemove = useCallback(async () => {
    if (!logoUrl) return;
    setRemoving(true);
    try {
      await removeClubLogo(clubId, logoUrl);
      setLogoUrl(null);
      onUploaded?.(null);
      toast.success("Club logo removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setRemoving(false);
    }
  }, [clubId, logoUrl, onUploaded]);

  const isLoading = uploading || removing;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Logo display */}
      <div className="relative group">
        <div
          className={cn(
            "relative rounded-2xl overflow-hidden shrink-0 border-2 border-border/60 shadow-soft",
            dims.outer,
            "transition-all duration-300",
            !readOnly && "group-hover:border-primary/60 group-hover:shadow-glow"
          )}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${clubName} logo`}
              className="h-full w-full object-contain bg-background p-1"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 gap-1">
              <Building2 className={cn(dims.icon, "text-primary/60")} />
            </div>
          )}

          {/* Hover overlay */}
          {!readOnly && !isLoading && (
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer gap-1"
              aria-label="Change club logo"
            >
              <ImagePlus className="h-5 w-5 text-white" />
            </button>
          )}

          {/* Uploading spinner */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="w-full max-w-[120px] h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Action buttons */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {logoUrl ? "Replace Logo" : "Upload Logo"}
          </Button>

          {logoUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => void handleRemove()}
              disabled={isLoading}
            >
              {removing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remove
            </Button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
        disabled={isLoading}
      />
    </div>
  );
};
