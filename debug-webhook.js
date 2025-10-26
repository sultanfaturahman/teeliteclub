// Debug script to test the Midtrans webhook functionality
// This script simulates a webhook call to test stock reduction

const WEBHOOK_URL = 'http://localhost:54321/functions/v1/midtrans-webhook';

// Sample webhook payload that simulates a successful payment
const sampleNotification = {
  transaction_time: "2025-01-17 12:00:00",
  transaction_status: "settlement", // This should trigger 'paid' status
  transaction_id: "test-transaction-123",
  status_message: "midtrans payment notification",
  status_code: "200",
  signature_key: "test-signature",
  payment_type: "credit_card",
  order_id: "ORDER-123456", // Replace with actual order number from your system
  merchant_id: "test-merchant",
  gross_amount: "100000.00",
  fraud_status: "accept",
  currency: "IDR"
};

async function testWebhook() {
  try {
    console.log('Testing webhook with payload:', JSON.stringify(sampleNotification, null, 2));
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleNotification)
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', result);

    if (response.ok) {
      console.log('✅ Webhook test successful');
    } else {
      console.log('❌ Webhook test failed');
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

// Instructions for use:
console.log(`
=== WEBHOOK DEBUG INSTRUCTIONS ===

1. Make sure your Supabase local development is running:
   npx supabase start

2. Replace the order_id in the sampleNotification with a real order number from your database

3. Run this script:
   node debug-webhook.js

4. Check the Supabase function logs:
   npx supabase functions logs midtrans-webhook

5. Check your database to see if stock was reduced:
   - Check the 'orders' table for the order status
   - Check the 'product_sizes' table for updated stock quantities
   - Check the 'products' table for updated total stock

=== TROUBLESHOOTING TIPS ===

- If the webhook URL is different, update WEBHOOK_URL above
- Make sure the order_id exists in your orders table
- Check that the order has order_items with valid product_id and ukuran values
- Verify that the products exist in the product_sizes table

`);

// Uncomment the line below to run the test
// testWebhook();
