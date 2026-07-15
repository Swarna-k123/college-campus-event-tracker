import { useEffect, useRef, useState } from "react";
import { ImagePlus, MapPin, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CertificateTemplatePickerProps {
  certEnabled: boolean;
  /** Existing Supabase public URL (edit mode) */
  existingTemplateUrl?: string | null;
  existingTemplateName?: string | null;
  /** Previously saved name coordinates in natural image pixels */
  existingNameX?: number | null;
  existingNameY?: number | null;
  onFileChange: (file: File | null) => void;
  onNamePositionChange: (x: number, y: number) => void;
  onClearPosition: () => void;
}

export const CertificateTemplatePicker = ({
  certEnabled,
  existingTemplateUrl,
  existingTemplateName,
  existingNameX,
  existingNameY,
  onFileChange,
  onNamePositionChange,
  onClearPosition,
}: CertificateTemplatePickerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(existingTemplateName ?? null);

  // Displayed marker position in percentage (0-100) relative to the container
  const [markerPctX, setMarkerPctX] = useState<number | null>(null);
  const [markerPctY, setMarkerPctY] = useState<number | null>(null);

  // Natural (pixel) coordinates — the values we surface to the parent
  const [naturalX, setNaturalX] = useState<number | null>(existingNameX ?? null);
  const [naturalY, setNaturalY] = useState<number | null>(existingNameY ?? null);

  // Revoke blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (blobPreviewUrl) URL.revokeObjectURL(blobPreviewUrl);
    };
  }, [blobPreviewUrl]);

  // When an existingTemplateUrl is supplied (edit mode), recalculate the
  // percentage marker once the image has loaded its natural dimensions.
  const recalcMarkerFromNatural = () => {
    const img = imgRef.current;
    if (!img || naturalX == null || naturalY == null) return;
    const { naturalWidth, naturalHeight } = img;
    if (!naturalWidth || !naturalHeight) return;
    setMarkerPctX((naturalX / naturalWidth) * 100);
    setMarkerPctY((naturalY / naturalHeight) * 100);
  };

  // Re-run whenever existing coords change (e.g. parent re-mounts with new event)
  useEffect(() => {
    setNaturalX(existingNameX ?? null);
    setNaturalY(existingNameY ?? null);
    if (existingNameX == null || existingNameY == null) {
      setMarkerPctX(null);
      setMarkerPctY(null);
    }
    // Recalc if img is already loaded
    recalcMarkerFromNatural();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingNameX, existingNameY]);

  // Sync fileName with existingTemplateName when prop changes (edit mode reset)
  useEffect(() => {
    if (!selectedFile) {
      setFileName(existingTemplateName ?? null);
    }
  }, [existingTemplateName, selectedFile]);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a PNG or JPG image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    // Revoke previous blob
    if (blobPreviewUrl) URL.revokeObjectURL(blobPreviewUrl);
    const url = URL.createObjectURL(file);
    setBlobPreviewUrl(url);
    setSelectedFile(file);
    setFileName(file.name);
    // Clear any previously placed marker when a new image is selected
    setMarkerPctX(null);
    setMarkerPctY(null);
    setNaturalX(null);
    setNaturalY(null);
    onClearPosition();
    onFileChange(file);
  };

  const handleRemove = () => {
    if (blobPreviewUrl) URL.revokeObjectURL(blobPreviewUrl);
    setBlobPreviewUrl(null);
    setSelectedFile(null);
    setFileName(null);
    setMarkerPctX(null);
    setMarkerPctY(null);
    setNaturalX(null);
    setNaturalY(null);
    onClearPosition();
    onFileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Captures click position relative to the displayed image and converts it
   * to natural (pixel) coordinates using the img element's naturalWidth /
   * naturalHeight vs. displayed clientWidth / clientHeight.
   */
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const displayW = rect.width;
    const displayH = rect.height;

    const { naturalWidth, naturalHeight } = img;
    if (!naturalWidth || !naturalHeight || !displayW || !displayH) return;

    const nx = Math.round((clickX / displayW) * naturalWidth);
    const ny = Math.round((clickY / displayH) * naturalHeight);

    // Store percentage for responsive rendering
    setMarkerPctX((clickX / displayW) * 100);
    setMarkerPctY((clickY / displayH) * 100);

    setNaturalX(nx);
    setNaturalY(ny);
    onNamePositionChange(nx, ny);
  };

  const previewSrc = blobPreviewUrl ?? existingTemplateUrl ?? null;
  const hasFile = !!previewSrc;

  if (!certEnabled) return null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id="cert-template-file"
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
      />

      <Label>Certificate Template</Label>

      {/* File picker row */}
      {!hasFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-md border border-dashed border-border bg-card/40 hover:border-primary/60 hover:bg-secondary/40 transition-colors py-4 text-sm text-muted-foreground flex flex-col items-center gap-1"
        >
          <ImagePlus className="h-5 w-5 mb-1 text-primary/60" />
          Upload certificate template
          <span className="text-xs opacity-60">PNG or JPG, up to 5 MB</span>
        </button>
      ) : (
        <div className="flex items-center justify-between bg-secondary/60 border border-border/60 rounded-md px-3 py-2">
          <p className="truncate text-sm max-w-[60%]">{fileName ?? "Certificate template"}</p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-2 py-1 bg-background/80 hover:bg-secondary rounded border border-border/40 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs px-2 py-1 bg-background/80 hover:bg-destructive/20 text-destructive rounded border border-border/40 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Preview + coordinate picker */}
      {hasFile && (
        <div className="space-y-2">
          {/* Instruction banner */}
          <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-sm text-primary">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {markerPctX == null
                ? "Click on the certificate where the participant's name should appear."
                : "Name position set. Click again to move it."}
            </span>
            {markerPctX != null && (
              <button
                type="button"
                onClick={() => {
                  setMarkerPctX(null);
                  setMarkerPctY(null);
                  setNaturalX(null);
                  setNaturalY(null);
                  onClearPosition();
                }}
                className="ml-auto shrink-0 p-0.5 rounded hover:bg-primary/20 transition-colors"
                aria-label="Clear name position"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Image preview with overlay */}
          <div
            ref={containerRef}
            className={cn(
              "relative rounded-xl overflow-hidden border border-border/60 bg-black/20",
              "select-none"
            )}
            style={{ aspectRatio: "auto", maxHeight: "420px" }}
          >
            <img
              ref={imgRef}
              src={previewSrc}
              alt="Certificate template preview"
              className="w-full h-auto object-contain block"
              draggable={false}
              onLoad={recalcMarkerFromNatural}
            />

            {/* Transparent click overlay */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Click to set name position on certificate"
              className="absolute inset-0 cursor-crosshair"
              onClick={handleImageClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  // keyboard fallback — do nothing (mouse-only interaction)
                }
              }}
            />

            {/* Name position marker */}
            {markerPctX != null && markerPctY != null && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${markerPctX}%`,
                  top: `${markerPctY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Outer ring animation */}
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                {/* Inner dot */}
                <div className="relative w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                {/* Coordinate label */}
                <div className="absolute left-6 top-0 whitespace-nowrap text-xs bg-background/90 border border-border/60 rounded px-1.5 py-0.5 shadow-sm text-foreground/80">
                  x:{naturalX} y:{naturalY}
                </div>
              </div>
            )}
          </div>

          {naturalX != null && naturalY != null && (
            <p className="text-xs text-muted-foreground">
              Name position: <span className="text-foreground font-medium">({naturalX}, {naturalY})</span> px from top-left
            </p>
          )}
        </div>
      )}
    </div>
  );
};
