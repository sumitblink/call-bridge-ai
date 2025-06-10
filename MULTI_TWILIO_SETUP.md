# Multiple Twilio Phone Numbers Setup Guide

## Overview
Your call center system supports multiple Twilio phone numbers through campaign-based configuration. Each campaign can have its own dedicated phone number.

## Setup Methods

### Method 1: Campaign-Based Numbers (Current Implementation)

1. **Create separate campaigns** for each phone number:
   - Campaign A: Uses phone number +1-555-XXX-1111
   - Campaign B: Uses phone number +1-555-XXX-2222

2. **Configure each campaign**:
   - Set the phone number field for each campaign
   - Assign specific buyers to each campaign
   - Configure routing rules per campaign

3. **Webhook Configuration**:
   - Set up Twilio webhooks for each number to point to:
   - `https://your-domain.replit.app/api/webhooks/voice`
   - The system will automatically route based on the `To` number

### Method 2: Enhanced Multi-Number Configuration

For more advanced setups, configure multiple numbers with:

#### Environment Variables
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER_1=+15551234567
TWILIO_PHONE_NUMBER_2=+15551234568
```

#### Webhook URLs for Each Number
Set these webhook URLs in your Twilio Console for each phone number:

**Voice Webhooks:**
- Number 1: `https://your-domain.replit.app/api/webhooks/voice`
- Number 2: `https://your-domain.replit.app/api/webhooks/voice`

**Status Callbacks:**
- `https://your-domain.replit.app/api/webhooks/call-status`

## Campaign Configuration

### Creating Campaigns for Each Number

1. **Login to your dashboard**
2. **Navigate to Campaigns**
3. **Create New Campaign**:
   - Name: "Lead Gen Campaign - Number 1"
   - Phone Number: +15551234567
   - Configure buyers and routing

4. **Repeat for each number**:
   - Name: "Lead Gen Campaign - Number 2"
   - Phone Number: +15551234568
   - Configure different buyers/routing

### Routing Logic

The system automatically:
- Identifies which campaign based on the incoming phone number
- Routes calls to buyers assigned to that specific campaign
- Tracks calls separately for each number/campaign

## Buyer Assignment

You can assign buyers to specific campaigns/numbers:

1. **Dedicated Buyers**: Assign specific buyers only to certain campaigns
2. **Shared Buyers**: Add the same buyer to multiple campaigns with different priorities
3. **Fallback Routing**: Configure backup buyers across campaigns

## Call Flow Examples

### Single Number Flow
```
Incoming Call → Campaign A → Buyer Pool A → Routing Algorithm → Selected Buyer
```

### Multi-Number Flow
```
Number 1 Call → Campaign A → Buyer Pool A → Selected Buyer A
Number 2 Call → Campaign B → Buyer Pool B → Selected Buyer B
```

## Advanced Features

### Geographic Routing
- Configure different numbers for different regions
- Set geo-targeting rules per campaign
- Route based on caller location

### Time-Based Routing
- Different numbers active at different times
- Schedule-based campaign activation
- Timezone-specific routing

### Load Balancing
- Distribute calls across multiple campaigns
- Balance load between buyer pools
- Failover between numbers

## Monitoring & Analytics

Track performance for each number separately:
- Call volume per number
- Conversion rates by campaign
- Buyer performance by number
- Response times per campaign

## Best Practices

1. **Separate Campaigns**: Always create separate campaigns for different business purposes
2. **Clear Naming**: Use descriptive campaign names that include the purpose/number
3. **Buyer Assignment**: Carefully assign buyers based on their expertise/capacity
4. **Monitor Performance**: Regularly check analytics for each number
5. **Test Routing**: Test call flows for each number before going live

## Webhook Configuration in Twilio Console

For each phone number in your Twilio Console:

1. Go to Phone Numbers → Manage → Active Numbers
2. Click on each phone number
3. Set Voice Webhook: `https://your-domain.replit.app/api/webhooks/voice`
4. Set Status Callback: `https://your-domain.replit.app/api/webhooks/call-status`
5. Save configuration

## Troubleshooting

### Common Issues:
- **Calls not routing**: Check webhook URLs are correct
- **Wrong campaign triggered**: Verify phone number fields in campaigns
- **No buyers available**: Check buyer assignments and status

### Debug Steps:
1. Check webhook logs in Twilio Console
2. Monitor server logs for incoming calls
3. Verify campaign phone number configuration
4. Test with Twilio's webhook testing tools