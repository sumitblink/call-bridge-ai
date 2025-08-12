#!/bin/bash

echo "=== RTB Bid Expiration Test ==="
echo "Testing with the exact bid response that caused callee hangup..."

# Test 1: Bid with 39 seconds expiration (your actual scenario)
echo -e "\n1. Testing bid with 39 seconds expiration:"
curl -s -X POST http://localhost:5000/v1/production/hmac123test.json \
  -H 'Content-Type: application/json' \
  -d '{
    "test": "real_scenario",
    "bidAmount": 4.2,
    "expireInSeconds": 39,
    "bidExpireDT": "8/12/2025 4:12:56 PM +00:00",
    "sipAddress": "RTBe983e428edc946a3863bcc912b828927@rtb.ringba.sip.telnyx.com",
    "phoneNumber": "+17733408913",
    "warnings": [
      {
        "code": 230,
        "description": "Previous bid for this request not yet expired. This is a cached version"
      }
    ]
  }' | jq -r '"Status: " + (if .accept then "ACCEPTED" else "REJECTED" end) + " | Destination: " + (.sipAddress // .phoneNumber // "NONE") + " | Bid: $" + (.bidAmount | tostring)'

# Test 2: Bid with expired timestamp
echo -e "\n2. Testing bid with expired timestamp:"
PAST_EPOCH=$(($(date +%s) * 1000 - 60000))  # 1 minute ago
curl -s -X POST http://localhost:5000/v1/production/hmac123test.json \
  -H 'Content-Type: application/json' \
  -d "{
    \"test\": \"expired_epoch\",
    \"bidAmount\": 5.0,
    \"bidExpireEpoch\": $PAST_EPOCH,
    \"sipAddress\": \"expired@rtb.test.com\"
  }" | jq -r '"Status: " + (if .accept then "ACCEPTED" else "REJECTED" end) + " | Reason: " + (.rejectReason // "N/A")'

# Test 3: Bid with insufficient time (less than 10 seconds)
echo -e "\n3. Testing bid with insufficient time (5 seconds):"
curl -s -X POST http://localhost:5000/v1/production/hmac123test.json \
  -H 'Content-Type: application/json' \
  -d '{
    "test": "too_short",
    "bidAmount": 3.5,
    "expireInSeconds": 5,
    "sipAddress": "short@rtb.test.com"
  }' | jq -r '"Status: " + (if .accept then "ACCEPTED" else "REJECTED" end) + " | Reason: " + (.rejectReason // "N/A")'

# Test 4: Valid bid with good expiration time
echo -e "\n4. Testing valid bid with good expiration time (120 seconds):"
curl -s -X POST http://localhost:5000/v1/production/hmac123test.json \
  -H 'Content-Type: application/json' \
  -d '{
    "test": "valid_bid",
    "bidAmount": 6.0,
    "expireInSeconds": 120,
    "sipAddress": "valid@rtb.test.com"
  }' | jq -r '"Status: " + (if .accept then "ACCEPTED" else "REJECTED" end) + " | Destination: " + (.sipAddress // .phoneNumber // "NONE") + " | Bid: $" + (.bidAmount | tostring)'

echo -e "\n=== Test Complete ==="
