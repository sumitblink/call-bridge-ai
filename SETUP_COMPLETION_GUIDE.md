# Complete Call Flow Setup Guide

## Current Status ✓
- Twilio number imported: +17177...
- Campaign created: "First Campaign"
- Buyer assigned: "Buyer A"
- Publisher connected: "Publisher A"

## Call Flow When Someone Calls Your Number

### Step 1: Call Arrives
- Caller dials your Twilio number (+17177...)
- Twilio sends webhook to your system at: `/api/webhooks/twilio/voice`

### Step 2: Campaign Identification
- System looks up campaign by phone number
- Finds "First Campaign" (if number is assigned to campaign)

### Step 3: Intelligent Buyer Selection
Your system uses these criteria to select the best buyer:
- **Priority Level**: Higher priority buyers get calls first
- **Capacity Limits**: Respects max concurrent calls per buyer
- **Availability Windows**: Only routes during buyer's active hours
- **Recent Call Volume**: Distributes calls evenly when priorities are equal
- **Caller History**: Can route repeat callers to same buyer

### Step 4: Call Connection
If buyer available:
- Caller hears: "Please hold while we connect you"
- Call forwards to buyer's phone number
- Call is recorded automatically

If no buyers available:
- Caller hears: "All agents are currently busy. Please try again later"
- Call ends gracefully

### Step 5: Real-time Tracking
- Call record created with: Campaign, Buyer, Duration, Cost
- Status updates: ringing → answered → completed
- Call logs track all routing decisions
- Recording stored for quality monitoring

## Required Configuration Steps

### 1. Assign Phone Number to Campaign
Go to **Phone Numbers** page → Select "First Campaign" from dropdown next to your imported number

### 2. Set Buyer Phone Number
Go to **Buyers** page → Edit "Buyer A" → Add phone number for call forwarding

### 3. Configure Twilio Webhooks (Already Done)
Your webhooks are automatically configured:
- Voice URL: `https://your-domain.replit.app/api/webhooks/twilio/voice`
- Status Callback: `https://your-domain.replit.app/api/webhooks/twilio/status`

## Test Your Call Flow

1. Complete steps 1-2 above
2. Call your imported number from any phone
3. System will route to Buyer A's phone
4. Check **Calls** page for real-time tracking
5. Review **Analytics** for performance metrics

## Advanced Features Available

- **Multiple Buyers**: Add more buyers with different priorities
- **Time-Based Routing**: Set buyer availability schedules  
- **Geographic Routing**: Route based on caller location
- **Failover Logic**: Automatic backup buyers if primary unavailable
- **Custom Greetings**: Personalized messages per campaign
- **Call Recording**: Automatic recording with transcription
- **Real-time Analytics**: Live dashboard with call metrics
- **Publisher Tracking**: Attribution and payout management

Your system is enterprise-ready with intelligent routing, real-time tracking, and comprehensive analytics.