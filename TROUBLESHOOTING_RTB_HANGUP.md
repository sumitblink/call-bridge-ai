# RTB Callee Hangup Troubleshooting Guide

## Problem Description
When RTB responses contain bid expiration data and both `sipAddress` and `phoneNumber`, calls are getting routed to destinations where the callee hangs up immediately.

## Root Cause Analysis

Based on the RTB response you provided:
```json
{
  "bidId": "RTBe983e428edc946a3863bcc912b828927",
  "bidAmount": 4.2,
  "expireInSeconds": 39,
  "bidExpireDT": "8/12/2025 4:12:56 PM +00:00",
  "bidExpireEpoch": 1755015176448,
  "phoneNumber": "+17733408913",
  "phoneNumberNoPlus": "17733408913",
  "sipAddress": "RTBe983e428edc946a3863bcc912b828927@rtb.ringba.sip.telnyx.com",
  "warnings": [
    {
      "code": 230,
      "description": "Previous bid for this request not yet expired. This is a cached version"
    }
  ]
}
```

### Key Issues Identified:

1. **Cached Bid Response**: Warning code 230 indicates this is a cached/stale bid
2. **Short Expiration Time**: 39 seconds may be too short for proper call setup
3. **SIP vs Phone Routing**: Need to prefer SIP routing over traditional phone numbers
4. **Bid Expiration Logic**: System needs to validate bid expiration before routing calls

## Solutions Implemented

### 1. Enhanced Bid Expiration Validation
- Added `checkBidExpiration()` function to validate bid freshness
- Checks multiple expiration formats: `expireInSeconds`, `bidExpireDT`, `bidExpireEpoch`
- Handles cached bid warnings (code 230) intelligently
- Minimum expiration time threshold: 10 seconds (configurable)

### 2. SIP-First Routing
- Enhanced destination parsing to prefer `sipAddress` over `phoneNumber`
- Proper SIP URI formatting with `sip:` prefix
- Fallback to E.164 phone number format if SIP not available
- TwiML generation prefers `<Sip>` tags over `<Number>` tags

### 3. Improved RTB Response Processing
- Extract SIP address from multiple possible fields: `sipAddress`, `destinationNumber`, `phoneNumber`
- Validate destination format (SIP URI or E.164)
- Enhanced logging for troubleshooting routing decisions

### 4. Call Routing Enhancements
- Updated Twilio webhook to handle expired bids gracefully
- Fallback routing when RTB bids are expired or invalid
- Better error messages for debugging call flow issues

## Configuration Recommendations

### Campaign RTB Settings
```javascript
{
  "enableRtb": true,
  "biddingTimeoutMs": 3000,        // RTB auction timeout
  "minBidAmount": 1.0,             // Minimum acceptable bid
  "maxBidAmount": 50.0,            // Maximum acceptable bid
  "preferSipRouting": true,        // Prefer SIP over phone numbers
  "bidExpirationBuffer": 30        // Require at least 30 seconds
}
```

### RTB Target Configuration
```javascript
{
  "timeoutMs": 5000,               // Individual target timeout
  "minBidAmount": 2.0,
  "maxBidAmount": 25.0,
  "sipHeaders": {                  // SIP-specific headers
    "X-Custom-Header": "value"
  },
  "callerIdPolicy": "passthrough"  // or "fixed" or "campaign_default"
}
```

## Testing Commands

### Test RTB Inbound with Expiration
```bash
curl -X POST http://localhost:5000/v1/production/YOUR_RTB_ID.json \
  -H 'Content-Type: application/json' \
  -d '{
    "test": "expiration_check",
    "bidAmount": 4.2,
    "expireInSeconds": 39,
    "sipAddress": "test@rtb.example.com",
    "warnings": [{"code": 230, "description": "Cached version"}]
  }'
```

### Test Call Routing with Expired Bid
```bash
# This would trigger through actual Twilio webhook
# Check logs for bid expiration validation
```

## Monitoring and Debugging

### Key Log Messages to Watch
```
[RTB] Warning: Cached bid response detected - Code 230
[RTB] Accepting cached bid with X seconds remaining
[RTB Transfer] Routing via SIP to sip:address
[RTB Transfer] Using caller ID: +1234567890
```

### Health Check Endpoints
- `/api/rtb/health-checks` - RTB target health monitoring
- `/api/rtb/targets/{id}/uptime` - Individual target uptime
- `/api/rtb/bid-requests` - Recent bid request history

## Prevention Strategies

1. **Bid Freshness**: Only accept bids with > 30 seconds expiration
2. **SIP Preference**: Always prefer SIP routing for better reliability
3. **Fallback Logic**: Implement robust fallback when RTB fails
4. **Monitoring**: Track bid success/failure rates per target
5. **Timeout Tuning**: Optimize RTB auction timeouts for your use case

## Expected Results After Fix

- Expired/cached bids are properly rejected
- SIP routing is preferred over phone numbers
- Calls route to valid, non-expired destinations
- Reduced callee hangup rates
- Better call success rates through RTB

The enhanced RTB system now handles bid expiration properly and should eliminate the callee hangup issue you experienced.