# Twilio SIP URI Fix - Phone Number Extraction Issue

## Problem Identified
Twilio was converting SIP addresses like `RTB4cf5064d60c84bae854d4566c87b1546@rtb.ringba.sip.telnyx.com` into malformed phone numbers like `782425506430284223854456307271546` because it was trying to extract phone numbers from SIP URIs.

## Root Cause
According to Twilio documentation and troubleshooting guides:
1. **Phone Number Extraction**: Twilio attempts to extract E.164 phone numbers from SIP URIs when certain patterns are detected
2. **Domain Pattern Matching**: Certain domain patterns trigger Twilio's phone number extraction logic
3. **Missing Transport Parameter**: Without explicit `transport=` parameter, Twilio may misinterpret the URI format

## Solution Applied

### Fix 1: Explicit Transport Parameter
Added `transport=udp` parameter to force Twilio to treat as SIP URI:
```
Before: sip:RTBxxx@rtb.ringba.sip.telnyx.com
After:  sip:RTBxxx@rtb.ringba.sip.telnyx.com?transport=udp
```

### Fix 2: Proper SIP Prefix
Ensured all URIs start with `sip:` prefix for correct parsing.

### Fix 3: Length Validation
Enforced 255 character limit as per Twilio SIP URI requirements.

## Expected Results
- Twilio console should show "SIP" call type instead of "Phone"
- No more malformed phone numbers in call logs
- Proper SIP routing to destination endpoints
- Successful call connection attempts

## Testing
The next real call will verify if these fixes resolve the phone number extraction issue.

## Implementation
- Updated `server/twilio-webhooks.ts` with Twilio-compatible SIP URI formatting
- Added comprehensive logging for debugging
- Maintained backward compatibility with existing RTB system

## References
- Twilio SIP Documentation: URI format requirements
- Error Code 13223: Invalid phone number format solutions
- Twilio Community: SIP URI parsing best practices