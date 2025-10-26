# Debug Account Orders Loading Issue

## Steps to Debug the "Failed to Load Orders" Error

### 1. Open Browser Developer Tools
- Open the Account page
- Click "Pesanan" tab
- Open Developer Tools (F12)
- Check the Console tab for error messages

### 2. Look for These Debug Messages
The updated code will now show detailed logs:

```
Account fetchOrders - Starting fetch for user: [user-id]
Account fetchOrders - Testing basic connectivity...
Account fetchOrders - Basic connectivity OK
Account fetchOrders - Attempting full query...
Account fetchOrders - Full query result: { dataLength: X, error: null }
Account fetchOrders - Success! Orders fetched: X
```

### 3. Common Error Patterns to Look For

#### Pattern 1: Authentication Issue
```
Account fetchOrders - No user ID available
```
**Solution**: User needs to log out and log back in

#### Pattern 2: Database Connectivity Issue
```
Account fetchOrders - Basic connectivity test failed: [error]
```
**Solution**: Check Supabase connection, API keys, and network

#### Pattern 3: Permission Issue
```
Account fetchOrders - Supabase error: { message: "...", code: "42501" }
```
**Solution**: Check RLS policies on orders table

#### Pattern 4: Missing Field Issue
```
Account fetchOrders - payment_url field may not exist, falling back
Account fetchOrders - Fallback query result: { error: null }
```
**Solution**: Run the database-updates.sql script

### 4. Debug Panel Information
If no orders are found, a debug panel will appear showing:
- User ID
- User Email  
- Loading status
- Orders array length
- Profile loading status
- Retry button

### 5. Manual Testing Steps
1. Click "Retry Fetch Orders" button in debug panel
2. Check console logs during retry
3. Verify user is properly authenticated
4. Test with different user accounts

### 6. Database Verification
Run this query in Supabase SQL editor to check orders exist:
```sql
SELECT id, user_id, order_number, status, created_at 
FROM orders 
WHERE user_id = 'your-user-id-here'
ORDER BY created_at DESC;
```

### 7. RLS Policy Check
Verify RLS policies allow users to read their own orders:
```sql
SELECT * FROM orders WHERE user_id = auth.uid();
```

This should return orders for the authenticated user without errors.