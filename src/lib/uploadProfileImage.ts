import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

const BUCKET = "profile-images";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateProfileImage(file: File): string | null {
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
 * Uploads a profile image to the `profile-images` bucket and updates
 * `profiles.profile_image_url`. Returns the new public URL.
 *
 * Reuses existing bucket and column — does NOT create new storage or schema.
 */
export async function uploadProfileImage(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const validationError = validateProfileImage(file);
  if (validationError) throw new Error(validationError);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExt = ALLOWED_EXTS.includes(ext) ? ext : "jpg";
  const fileId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).substring(2);

  const path = `${userId}/${fileId}.${safeExt}`;

  // Simulate progress start
  onProgress?.(10);

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (upErr) throw new Error(getSupabaseErrorMessage(upErr));

  onProgress?.(70);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get profile image URL.");

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ profile_image_url: data.publicUrl })
    .eq("id", userId);

  if (dbErr) throw new Error(getSupabaseErrorMessage(dbErr));

  onProgress?.(100);

  return data.publicUrl;
}

/**
 * Removes the profile image by deleting the file from storage and
 * clearing `profiles.profile_image_url`. Reuses existing column.
 */
export async function removeProfileImage(
  userId: string,
  currentUrl: string
): Promise<void> {
  // Extract the storage path from the public URL
  try {
    const url = new URL(currentUrl);
    // Path after /object/public/profile-images/
    const parts = url.pathname.split(`/object/public/${BUCKET}/`);
    if (parts[1]) {
      await supabase.storage.from(BUCKET).remove([parts[1]]);
    }
  } catch {
    // Non-fatal: even if file delete fails, we clear the DB column
  }

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ profile_image_url: null })
    .eq("id", userId);

  if (dbErr) throw new Error(getSupabaseErrorMessage(dbErr));
}

/**
 * Fetches the current profile_image_url for a user.
 * Used by components to get the latest URL without touching auth context.
 */
export async function fetchProfileImageUrl(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_image_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as { profile_image_url: string | null } | null)?.profile_image_url ?? null;
}
