# Debug: SIP Issue Resolution

## Issue Discovery
The TwiML generation logs weren't showing because we were fixing the wrong webhook handler. RTB calls from Pool 16 are processed by:
- `POST /api/webhooks/pool/16/voice` in `routes.ts`
- NOT by `twilio-webhooks.ts`

## Actual Problem Location
Found the real TwiML generation at `routes.ts` line 2278-2279:
```xml
<Dial callerId="${toNumber}" timeout="30" ...>
  <Number>${targetPhoneNumber}</Number>  <!-- WRONG for SIP! -->
</Dial>
```

This explains why Twilio was seeing SIP addresses as phone numbers and generating malformed digits.

## Solution Applied
1. **Added SIP Detection**: Function to identify SIP vs phone destinations
2. **Conditional Dial Tags**: Use `<Sip>` for RTB SIP addresses, `<Number>` for phone numbers
3. **Transport Parameter**: Added `?transport=udp` to prevent phone number extraction
4. **Comprehensive Logging**: Added detailed TwiML generation logs to see exactly what's sent

## Expected Fix
RTB calls with SIP destinations will now generate:
```xml
<Dial callerId="+12129200892" timeout="30" ...>
  <Sip>sip:RTBxxx@rtb.ringba.sip.telnyx.com?transport=udp</Sip>
</Dial>
```

This should completely resolve the malformed phone number issue in Twilio console.

## Test Plan
1. Make a test call to Pool 16
2. Watch for new detailed logs showing SIP detection and TwiML generation
3. Verify Twilio console shows "SIP" call type instead of malformed phone numbers
4. Confirm call attempts to connect to the SIP endpoint