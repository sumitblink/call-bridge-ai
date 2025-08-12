#!/bin/bash

echo "=== Testing Twilio SIP Compliance ==="

echo "1. Testing SIP URI formatting with proper headers:"
curl -s -X POST "http://localhost:5000/api/webhooks/pool/16/voice" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'CallSid=CAtest123&From=%2B15551234567&To=%2B18667776655&CallStatus=ringing&Direction=inbound' \
  > /tmp/sip_test_response.xml

echo "Generated TwiML saved to /tmp/sip_test_response.xml"
echo "Checking for proper SIP formatting..."

# Look for SIP tags in the response
if grep -q "<Sip>" /tmp/sip_test_response.xml; then
  echo "✅ SIP tags found in TwiML"
  echo "SIP URI format:"
  grep -o '<Sip>[^<]*</Sip>' /tmp/sip_test_response.xml || echo "No SIP URI found"
else
  echo "❌ No SIP tags found - falling back to phone numbers"
fi

echo -e "\n2. Testing RTB inbound with SIP compliance:"
curl -s -X POST http://localhost:5000/v1/production/hmac123test.json \
  -H 'Content-Type: application/json' \
  -d '{
    "bidAmount": 6.0,
    "sipAddress": "RTBtest@rtb.ringba.sip.telnyx.com",
    "phoneNumber": "+17733408913"
  }' | head -5

echo -e "\n=== SIP Fix Test Complete ==="
