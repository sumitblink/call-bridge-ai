#!/bin/bash

# RTB Inbound Production Endpoint Test Script
# Usage: ./test-rtb-inbound.sh [HOST] [RTB_ID]

HOST=${1:-"localhost:5000"}
RTB_ID=${2:-"hmac123test"}
BASE_URL="http://$HOST"

echo "=== RTB Inbound Production Endpoint Tests ==="
echo "Host: $HOST"
echo "RTB ID: $RTB_ID"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: GET method (should return 405)
echo "=== Test 1: GET method (should return 405) ==="
curl -s -X GET "$BASE_URL/v1/production/$RTB_ID.json" | jq .
echo -e "\n"

# Test 2: Invalid RTB ID (should return 404)
echo "=== Test 2: Invalid RTB ID (should return 404) ==="
curl -s -X POST "$BASE_URL/v1/production/invalid-rtb-id.json" \
  -H 'Content-Type: application/json' \
  -d '{"test":"ping"}' | jq .
echo -e "\n"

# Test 3: No authentication (should work with 'none' auth campaigns)
echo "=== Test 3: No authentication ==="
curl -s -X POST "$BASE_URL/v1/production/04a3040e3b3c74ba4c880e832ea9cdf1.json" \
  -H 'Content-Type: application/json' \
  -d '{"test":"no-auth","caller":"+15551234567"}' | jq .
echo -e "\n"

# Test 4: Bearer authentication (success)
echo "=== Test 4: Bearer authentication (success) ==="
curl -s -X POST "$BASE_URL/v1/production/bearer-test-rtb.json" \
  -H 'Authorization: Bearer test-bearer-token-2024' \
  -H 'Content-Type: application/json' \
  -d '{"test":"bearer-auth","caller":"+15551234567"}' | jq .
echo -e "\n"

# Test 5: Bearer authentication (failure - wrong token)
echo "=== Test 5: Bearer authentication (failure - wrong token) ==="
curl -s -X POST "$BASE_URL/v1/production/bearer-test-rtb.json" \
  -H 'Authorization: Bearer wrong-token' \
  -H 'Content-Type: application/json' \
  -d '{"test":"bearer-auth-fail"}' | jq .
echo -e "\n"

# Test 6: HMAC authentication (success)
echo "=== Test 6: HMAC authentication (success) ==="
TS=$(date +%s)
BODY='{"test":"hmac","caller":"+15551234567"}'
SIG=$(node -e "
const crypto = require('crypto');
const secret = 'hmac-test-secret-key';
const ts = '$TS';
const body = '$BODY';
const sig = crypto.createHmac('sha256', secret).update(ts + '.' + body).digest('base64');
console.log(sig);
")

echo "Timestamp: $TS"
echo "Signature: $SIG"
curl -s -X POST "$BASE_URL/v1/production/$RTB_ID.json" \
  -H "X-RTB-Timestamp: $TS" \
  -H "X-RTB-Signature: $SIG" \
  -H 'Content-Type: application/json' \
  -d "$BODY" | jq .
echo -e "\n"

# Test 7: HMAC authentication (failure - old timestamp)
echo "=== Test 7: HMAC authentication (failure - old timestamp) ==="
OLD_TS=$(($(date +%s) - 400)) # 400 seconds ago (older than 5 min limit)
OLD_BODY='{"test":"hmac-old-timestamp"}'
OLD_SIG=$(node -e "
const crypto = require('crypto');
const secret = 'hmac-test-secret-key';
const ts = '$OLD_TS';
const body = '$OLD_BODY';
const sig = crypto.createHmac('sha256', secret).update(ts + '.' + body).digest('base64');
console.log(sig);
")

curl -s -X POST "$BASE_URL/v1/production/$RTB_ID.json" \
  -H "X-RTB-Timestamp: $OLD_TS" \
  -H "X-RTB-Signature: $OLD_SIG" \
  -H 'Content-Type: application/json' \
  -d "$OLD_BODY" | jq .
echo -e "\n"

# Test 8: HMAC authentication (failure - wrong signature)
echo "=== Test 8: HMAC authentication (failure - wrong signature) ==="
curl -s -X POST "$BASE_URL/v1/production/$RTB_ID.json" \
  -H "X-RTB-Timestamp: $(date +%s)" \
  -H "X-RTB-Signature: wrong-signature" \
  -H 'Content-Type: application/json' \
  -d '{"test":"hmac-wrong-sig"}' | jq .
echo -e "\n"

echo "=== All Tests Complete ==="