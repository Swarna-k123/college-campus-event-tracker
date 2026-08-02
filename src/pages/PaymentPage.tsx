import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/DashboardCard";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { createMockPaymentForEvent, hasSuccessfulPayment } from "@/lib/payment";
import { supabase } from "@/lib/supabase";
import { getSupabaseErrorMessage } from "@/lib/db";
import { toast } from "sonner";
import { notifyRegistrationSuccess } from "@/lib/notifications";

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);

  const state = location.state as
    | {
        eventId?: string;
        eventName?: string;
        fee?: number;
        phone?: string;
        branch?: string;
        semester?: string;
      }
    | undefined;

  const eventName = state?.eventName ?? "Event";
  const fee = state?.fee ?? 0;
  const eventId = state?.eventId;
  const phone = state?.phone ?? "";
  const branch = state?.branch ?? "";
  const semester = state?.semester ?? "1";

  const handlePay = async () => {
    if (!user?.id || !eventId) return;

    setPaying(true);
    try {
      const paymentExists = await hasSuccessfulPayment(user.id, eventId);
      if (!paymentExists) {
        await createMockPaymentForEvent({
          studentId: user.id,
          eventId,
          amount: fee,
        });
      }

      const sem = parseInt(semester, 10);
      const { error: rpcError } = await supabase.rpc("register_for_event", {
        p_event_id: eventId,
        p_phone: phone.trim(),
        p_branch: branch.trim(),
        p_semester: sem,
      });

      if (rpcError) {
        throw new Error(getSupabaseErrorMessage(rpcError));
      }

      if (user?.id && eventId) {
        await notifyRegistrationSuccess(user.id, eventId, eventName);
      }

      toast.success("Payment successful and registration complete.");
      navigate("/student-dashboard", { replace: true, state: { paymentSuccess: true } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <DashboardCard title="Secure Payment" subtitle="Complete your fee payment to confirm registration.">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <p className="text-sm text-muted-foreground">Event</p>
                <p className="text-xl font-semibold">{eventName}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <p className="text-sm text-muted-foreground">Student</p>
                <p className="font-medium">{user?.name ?? "Student"}</p>
                <p className="text-sm text-muted-foreground">{user?.email ?? ""}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <p className="text-sm text-muted-foreground">Payment Summary</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>Registration fee</span>
                  <span>₹{fee}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                  <span>Total payable</span>
                  <span>₹{fee}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-primary">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mock payment gateway</p>
                  <p className="font-semibold">Pay securely</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> This is a foundation flow for future Razorpay/Stripe integration.</p>
              </div>

              <Button onClick={() => void handlePay()} disabled={paying} className="mt-6 w-full gap-2">
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {paying ? "Processing payment..." : "Pay Now"}
              </Button>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default PaymentPage;
