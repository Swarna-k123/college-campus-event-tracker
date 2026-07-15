import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

const BUCKET = "certificate-templates";

export async function downloadCertificate(
  eventId: string,
  studentId: string,
  studentName: string,
  certificateNameX: number | null,
  certificateNameY: number | null
): Promise<void> {
  // Fetch event details to get certificate template URL
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("certificate_template_url, certificate_name_x, certificate_name_y")
    .eq("id", eventId)
    .single();

  if (eventError) throw new Error(getSupabaseErrorMessage(eventError));
  if (!event?.certificate_template_url) throw new Error("No certificate template found for this event");

  // Download the certificate template image
  const response = await fetch(event.certificate_template_url);
  if (!response.ok) throw new Error("Failed to download certificate template");
  
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas context");

  // Draw the template
  ctx.drawImage(imageBitmap, 0, 0);

  // Draw student name at specified coordinates
  const x = certificateNameX ?? event.certificate_name_x ?? canvas.width / 2;
  const y = certificateNameY ?? event.certificate_name_y ?? canvas.height / 2;
  
  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(studentName, x, y);

  // Generate PNG and download
  canvas.toBlob((blob) => {
    if (!blob) {
      throw new Error("Failed to generate certificate image");
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `certificate-${eventId}-${studentName.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, "image/png");
}

export async function checkCertificateEligibility(
  eventId: string,
  studentId: string
): Promise<{ eligible: boolean; reason?: string }> {
  // Check if student is registered
  const { data: registration, error: regError } = await supabase
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (regError) throw new Error(getSupabaseErrorMessage(regError));
  if (!registration) return { eligible: false, reason: "You are not registered for this event" };

  // Check attendance status
  const { data: attendance, error: attError } = await supabase
    .from("attendance")
    .select("status")
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (attError) throw new Error(getSupabaseErrorMessage(attError));
  if (!attendance) return { eligible: false, reason: "Attendance has not been marked yet" };
  if (attendance.status !== "PRESENT") return { eligible: false, reason: "You must be present to download the certificate" };

  // Check if event has certificate template
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("certificate_template_url")
    .eq("id", eventId)
    .single();

  if (eventError) throw new Error(getSupabaseErrorMessage(eventError));
  if (!event?.certificate_template_url) return { eligible: false, reason: "No certificate template available for this event" };

  return { eligible: true };
}
