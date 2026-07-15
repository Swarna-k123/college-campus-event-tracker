import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";

export type PaymentStatus = "pending" | "success" | "failed";

export type PaymentRecord = {
  id?: string;
  student_id: string;
  event_id: string;
  amount: number;
  status: PaymentStatus;
  payment_method: string;
  transaction_id: string;
  payment_gateway: string;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function hasSuccessfulPayment(studentId: string, eventId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("id")
    .eq("student_id", studentId)
    .eq("event_id", eventId)
    .eq("status", "success")
    .maybeSingle();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return !!data;
}

export async function createMockPayment(payload: PaymentRecord) {
  const { data, error } = await supabase.from("payments").insert(payload).select("id").single();
  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
}

export async function createMockPaymentForEvent({
  studentId,
  eventId,
  amount,
}: {
  studentId: string;
  eventId: string;
  amount: number;
}) {
  const transactionId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return createMockPayment({
    student_id: studentId,
    event_id: eventId,
    amount,
    status: "success",
    payment_method: "mock",
    transaction_id: transactionId,
    payment_gateway: "mock",
    paid_at: new Date().toISOString(),
  });
}
