import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

const BUCKET = "club-logos";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateClubLogo(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
    return "Only JPG, JPEG, PNG, and WEBP files are allowed.";
  }
  if (file.size > MAX_BYTES) {
    return "File size must be under 5 MB.";
  }
  return null;
}

/**
 * Uploads a club logo to the `club-logos` bucket and updates
 * `clubs.club_logo_url`. Returns the new public URL.
 *
 * Reuses existing bucket and column — does NOT create new storage or schema.
 */
export async function uploadClubLogo(
  file: File,
  clubId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const validationError = validateClubLogo(file);
  if (validationError) throw new Error(validationError);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ALLOWED_EXTS.includes(ext) ? ext : "jpg";
  const fileId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).substring(2);

  const path = `${clubId}/${fileId}.${safeExt}`;

  onProgress?.(10);

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (upErr) throw new Error(getSupabaseErrorMessage(upErr));

  onProgress?.(70);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get club logo URL.");

  const { error: dbErr } = await supabase
    .from("clubs")
    .update({ club_logo_url: data.publicUrl })
    .eq("id", clubId);

  if (dbErr) throw new Error(getSupabaseErrorMessage(dbErr));

  onProgress?.(100);

  return data.publicUrl;
}

/**
 * Removes the club logo by deleting the file from storage and
 * clearing `clubs.club_logo_url`. Reuses existing column.
 */
export async function removeClubLogo(
  clubId: string,
  currentUrl: string
): Promise<void> {
  try {
    const url = new URL(currentUrl);
    const parts = url.pathname.split(`/object/public/${BUCKET}/`);
    if (parts[1]) {
      await supabase.storage.from(BUCKET).remove([parts[1]]);
    }
  } catch {
    // Non-fatal: clear DB column even if file delete fails
  }

  const { error: dbErr } = await supabase
    .from("clubs")
    .update({ club_logo_url: null })
    .eq("id", clubId);

  if (dbErr) throw new Error(getSupabaseErrorMessage(dbErr));
}

/**
 * Fetches the current club_logo_url for a club.
 */
export async function fetchClubLogoUrl(clubId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("clubs")
    .select("club_logo_url")
    .eq("id", clubId)
    .maybeSingle();

  if (error) return null;
  return (data as { club_logo_url: string | null } | null)?.club_logo_url ?? null;
}
