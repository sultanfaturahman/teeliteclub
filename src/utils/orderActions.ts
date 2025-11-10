import { supabase } from "@/integrations/supabase/client";

const USER_SCOPED_ERROR = "User not authenticated";

export async function cancelUserOrder(orderId: string, userId?: string) {
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  const resolvedUserId = userId || (await supabase.auth.getUser()).data.user?.id;

  if (!resolvedUserId) {
    throw new Error(USER_SCOPED_ERROR);
  }

  const timestamp = new Date().toISOString();

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      payment_url: null,
      updated_at: timestamp,
    })
    .eq("id", orderId)
    .eq("user_id", resolvedUserId);

  if (orderError) {
    throw new Error(orderError.message || "Failed to cancel order");
  }

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "cancelled",
      updated_at: timestamp,
    })
    .eq("order_id", orderId)
    .neq("status", "paid");

  if (paymentError) {
    console.warn("Failed to mark payments as cancelled", paymentError);
  }
}
