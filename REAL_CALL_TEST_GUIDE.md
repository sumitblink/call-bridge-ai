# Real Call Test Guide - SIP Routing Verification

## Test Objective
Verify that Twilio correctly processes SIP addresses and shows "SIP" call type instead of malformed phone numbers.

## Prerequisites
✅ Twilio account has SIP capabilities enabled
✅ RTB system generates proper `<Sip>` TwiML tags  
✅ Mock RTB endpoint returns valid SIP addresses

## Test Scenarios

### Scenario 1: Mock RTB Test (Guaranteed Success)
**Phone Number**: Your campaign's pool number
**Expected RTB Response**: Returns `sip:test-rtb@buyer.example.com`
**Expected Result**: Twilio shows "SIP" call type, no malformed numbers

### Scenario 2: Real RTB Test (Depends on Bidder Acceptance)
**Phone Number**: Your campaign's pool number  
**RTB Bidders**: Real external bidders (may reject due to caller ID/capacity)
**Expected Result**: If accepted, should route to real SIP endpoint

## What to Watch For

### ✅ Success Indicators
- Twilio console shows "SIP" in call type field
- Destination shows proper SIP URI format
- Call attempts to connect to SIP endpoint
- No malformed phone numbers like `782228536279564942365227297322`

### ❌ Failure Indicators  
- Call type shows "Phone" instead of "SIP"
- Malformed destination numbers
- "Application error occurred" messages
- Immediate hangup without connection attempt

## Test Steps
1. **Call the pool number**: Use your personal phone
2. **Monitor logs**: Watch console for RTB auction results
3. **Check Twilio console**: Verify call shows as SIP type
4. **Listen to call**: Should hear "Connecting to our premium partner, please hold"

## Expected Log Output (Success)
```
🏆 AUCTION WINNER: External Bidder
💰 Winning Bid: $X.XX
📞 External Phone: sip:RTBxxxx@rtb.ringba.sip.telnyx.com
[RTB Transfer] Processing SIP destination: RTBxxxx@rtb.ringba.sip.telnyx.com
[RTB Transfer] Final SIP URI for Twilio: sip:RTBxxxx@rtb.ringba.sip.telnyx.com
```

## Backup Plan
If all real RTB bidders reject the call, the system will fall back to internal buyers (phone numbers). This is expected behavior, not a bug.

Ready for testing!