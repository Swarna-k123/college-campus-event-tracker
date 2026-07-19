import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  uploadProfileImage,
  removeProfileImage,
  fetchProfileImageUrl,
  validateProfileImage,
} from "@/lib/uploadProfileImage";

export interface ProfilePhotoUploaderProps {
  /** The authenticated user's ID (maps to profiles.id) */
  userId: string;
  /** Current value of profiles.profile_image_url */
  currentUrl: string | null;
  /** Display name used for initials fallback */
  userName: string;
  /** Called after a successful upload or remove with the new URL (or null) */
  onUploaded?: (newUrl: string | null) => void;
  /** Visual size variant */
  size?: "sm" | "md" | "lg";
  /** If true, renders in read-only display mode (no upload/remove buttons) */
  readOnly?: boolean;
}

const sizeMap = {
  sm: { outer: "h-10 w-10", text: "text-sm", icon: "h-4 w-4", ring: "ring-2" },
  md: { outer: "h-20 w-20", text: "text-xl", icon: "h-5 w-5", ring: "ring-2" },
  lg: { outer: "h-28 w-28", text: "text-3xl", icon: "h-5 w-5", ring: "ring-2" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Reusable ProfilePhotoUploader component.
 *
 * Reads from: profiles.profile_image_url
 * Uploads to: profile-images bucket
 * Updates:    profiles.profile_image_url
 *
 * Used by: Student Profile, Manager Settings, Admin Settings, and AppSidebar.
 */
export const ProfilePhotoUploader = ({
  userId,
  currentUrl,
  userName,
  onUploaded,
  size = "md",
  readOnly = false,
}: ProfilePhotoUploaderProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dims = sizeMap[size];

  // Sync when parent prop changes (e.g. after auth refresh)
  useEffect(() => {
    setImageUrl(currentUrl);
  }, [currentUrl]);

  // Fetch from DB on mount in case prop is stale
  useEffect(() => {
    if (!userId) return;
    void fetchProfileImageUrl(userId).then((url) => {
      if (url !== undefined) setImageUrl(url);
    });
  }, [userId]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input value so the same file can be re-selected
      e.target.value = "";

      const validationError = validateProfileImage(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const newUrl = await uploadProfileImage(file, userId, (pct) => {
          setProgress(pct);
        });
        setImageUrl(newUrl);
        onUploaded?.(newUrl);
        toast.success("Profile photo updated successfully.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [userId, onUploaded]
  );

  const handleRemove = useCallback(async () => {
    if (!imageUrl) return;
    setRemoving(true);
    try {
      await removeProfileImage(userId, imageUrl);
      setImageUrl(null);
      onUploaded?.(null);
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setRemoving(false);
    }
  }, [userId, imageUrl, onUploaded]);

  const initials = getInitials(userName || "U");
  const isLoading = uploading || removing;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <div className="relative group">
        <div
          className={cn(
            "relative rounded-full overflow-hidden shrink-0",
            dims.outer,
            dims.ring,
            "ring-primary/30 ring-offset-2 ring-offset-background",
            "transition-all duration-300",
            !readOnly && "group-hover:ring-primary/60"
          )}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${userName} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold select-none">
              <span className={dims.text}>{initials}</span>
            </div>
          )}

          {/* Overlay on hover (not in readOnly or loading) */}
          {!readOnly && !isLoading && (
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              aria-label="Change profile photo"
            >
              <Camera className={cn(dims.icon, "text-white")} />
            </button>
          )}

          {/* Upload progress ring overlay */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className={cn(dims.icon, "text-white animate-spin")} />
            </div>
          )}
        </div>

        {/* Small camera badge for sm size */}
        {size === "sm" && !readOnly && !isLoading && (
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
            aria-label="Change profile photo"
          >
            <Camera className="h-2.5 w-2.5 text-primary-foreground" />
          </button>
        )}
      </div>

      {/* Upload progress bar */}
      {uploading && progress > 0 && size !== "sm" && (
        <div className="w-full max-w-[120px] h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Action buttons — hidden in readOnly or sm mode */}
      {!readOnly && size !== "sm" && (
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
            {imageUrl ? "Replace" : "Upload"}
          </Button>

          {imageUrl && (
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
