# Twilio Webhook Setup Guide

## Webhook Endpoint
Your application provides a Twilio-compatible webhook at:
```
POST /api/call/inbound
```

## Public URL
Replace `[your-replit-domain]` with your actual Replit domain:
```
https://[your-replit-domain].replit.app/api/call/inbound
```

## Twilio Console Configuration

### 1. Phone Number Setup
1. Login to [Twilio Console](https://console.twilio.com/)
2. Navigate to: **Phone Numbers** → **Manage** → **Active numbers**
3. Select your phone number
4. In **Voice Configuration**:
   - **Webhook URL**: `https://[your-replit-domain].replit.app/api/call/inbound`
   - **HTTP Method**: `POST`
   - **Content-Type**: `application/x-www-form-urlencoded` (default)

### 2. Campaign Phone Number Mapping
Update your campaign with the Twilio phone number:

```bash
curl -X PATCH https://[your-replit-domain].replit.app/api/campaigns/[campaign-id] \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## Webhook Behavior

### Successful Match (Active Campaign)
- **Request**: `To=+1234567890` (matches campaign phone number)
- **Response**: TwiML connects caller to buyer number
```xml
<Response>
  <Say>You are being connected</Say>
  <Dial>+1234567890</Dial>
</Response>
```

### Campaign Not Found
- **Request**: `To=+1999999999` (no matching campaign)
- **Response**: TwiML ends call
```xml
<Response>
  <Say>Campaign not found. Goodbye.</Say>
  <Hangup/>
</Response>
```

### Invalid Request
- **Request**: Missing `To` parameter
- **Response**: TwiML error message
```xml
<Response>
  <Say>Invalid request. Goodbye.</Say>
  <Hangup/>
</Response>
```

## Testing
Test your webhook with curl:
```bash
curl -X POST https://[your-replit-domain].replit.app/api/call/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "To=%2B1234567890&From=%2B1987654321&CallSid=CAtest123"
```

## Buyer Number Configuration
Currently set to: `+1234567890` (dummy number)
Update in `server/routes.ts` line 161 to use your actual buyer number.