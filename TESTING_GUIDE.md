# Call Center Management Platform - Testing Guide

## Complete Testing Flow

### 1. Authentication & Setup
- **Login**: Use credentials `sumit@blinkdigital.in` / `demo1234`
- **Dashboard**: Verify stats display correctly (active campaigns, calls, success rate)

### 2. Campaign Management
- **Create Campaign**: Go to Campaigns → Create new campaign with buyers
- **Edit Campaign**: Test campaign settings, description, status changes
- **Campaign Metrics**: Verify daily, monthly, and total call counts

### 3. Buyer Management
- **Add Buyers**: Create buyers with phone numbers, priorities, and capacity limits
- **Campaign Assignment**: Assign buyers to campaigns with specific priorities
- **Routing Logic**: Test priority-based routing with capacity constraints

### 4. Phone Number Flow (Trial Account Workaround)
- **Search Numbers**: Use the "Find Numbers" tab to search available numbers
- **Purchase Limitation**: Trial accounts can only purchase 1 number
- **Alternative Testing**: Use the webhook testing interface instead

### 5. Live Call Routing Testing

#### Option A: Webhook Testing Interface
1. Go to Phone Numbers → Live Calls tab
2. Click "Test Webhook Endpoints" to verify configuration
3. Review routing logic and capacity rules

#### Option B: Simulate Call Routing
1. Use the campaign buyers interface
2. Test different priority scenarios
3. Verify buyer capacity limits work correctly

### 6. DNI (Dynamic Number Insertion) Testing
- **JavaScript SDK**: Access `/dni.js` endpoint
- **Tracking API**: Test `/api/dni/track` with campaign parameters
- **HTML Snippets**: Generate integration code for websites

### 7. Call Analytics & Reporting
- **Call Logs**: View detailed call routing decisions
- **Campaign Stats**: Monitor performance metrics
- **Buyer Performance**: Track acceptance rates and response times

## Known Limitations (Trial Account)
- Only 1 phone number can be purchased
- SMS/voice calls have usage limits
- Webhook testing is the best way to verify routing logic

## Testing Recommendations
1. Focus on the buyer management and routing logic
2. Use the webhook testing interface for call flow verification
3. Test campaign-specific buyer priorities
4. Verify capacity limits and daily caps work correctly
5. Test the DNI system for website integration

## Advanced Testing (Production Account)
- Purchase multiple phone numbers for different campaigns
- Test live call routing with real phone calls
- Verify call recordings and status callbacks
- Test SMS capabilities if needed