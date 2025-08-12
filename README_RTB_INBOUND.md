# RTB Inbound Production Endpoint

CallCenter Pro now supports inbound RTB requests via the production endpoint `/v1/production/:rtbId.json`, making it a full RTB platform that can both consume (ping external bidders) and provide (accept inbound bids) RTB services.

## Quick Test Commands

### Bearer Authentication + Accept (SIP)
```bash
curl -X POST https://your-host.com/v1/production/your-rtb-id.json \
  -H 'Authorization: Bearer your-token' \
  -H 'Content-Type: application/json' \
  -d '{"test":"ping"}'
```

**Expected Response (200 OK):**
```json
{
  "bidId": "RTB1754977156314...",
  "accept": true,
  "bidAmount": 25.86,
  "bidCurrency": "USD",
  "expiresInSec": 60,
  "requiredDuration": 60,
  "sipAddress": "sip:test-rtb@buyer.example.com"
}
```

### HMAC-SHA256 Authentication
```bash
TS=$(date +%s)
BODY='{"test":"hmac"}'
SIG=$(node -e "
const crypto = require('crypto');
const secret = process.env.HMAC_SECRET;
const ts = '$TS';
const body = '$BODY';
console.log(crypto.createHmac('sha256', secret).update(ts + '.' + body).digest('base64'));
")

curl -X POST https://your-host.com/v1/production/your-rtb-id.json \
  -H "X-RTB-Timestamp: $TS" \
  -H "X-RTB-Signature: $SIG" \
  -H 'Content-Type: application/json' \
  -d "$BODY"
```

### Test Rejection (No Capacity)
Set `capacity_available = false` in campaign configuration:
```json
{
  "bidId": "RTB1754977156314...",
  "accept": false,
  "bidAmount": 0,
  "rejectReason": "Capacity not available"
}
```

## Features

- **Industry-Standard URL Pattern**: `/v1/production/:rtbId.json` matches Ringba conventions
- **Multi-Auth Support**: None, Bearer token, or HMAC-SHA256 with timestamp validation
- **SIP-First Routing**: Prefers `sipAddress` over `phoneNumber` in responses
- **Security**: Phone number obfuscation, replay attack protection, comprehensive logging
- **Shareable Tags**: Token replacement system for enriched bid responses
- **Performance**: Sub-500ms response times with proper error handling

## Configuration

Campaign RTB settings control the behavior:

- `rtbId`: Unique identifier for the RTB endpoint
- `rtbAuthMethod`: Authentication method (none, bearer, hmac-sha256)
- `rtbAuthSecret`: Bearer token or HMAC secret key
- `capacityAvailable`: Whether to accept bids
- `minBid`/`maxBid`: Bid amount range
- `sipRtbUri`: SIP destination (preferred over phone number)
- `rtbShareableTags`: Enable token replacement in responses
- `rtbRequestTemplate`: JSON template with replaceable tokens

## Response Schema

### Success (Accept)
```json
{
  "bidId": "string",
  "accept": true,
  "bidAmount": 2.5,
  "bidCurrency": "USD",
  "expiresInSec": 60,
  "requiredDuration": 90,
  "sipAddress": "sip:token@rtb.buyer.sip.telnyx.com"
}
```

### Success (Reject)
```json
{
  "bidId": "string",
  "accept": false,
  "bidAmount": 0,
  "rejectReason": "Capacity not available"
}
```

### Error Responses
```json
{
  "error": "RTB ID not found or inactive"  // 404
}
```

```json
{
  "error": "Bearer token required"  // 401
}
```

```json
{
  "error": "Invalid HMAC signature"  // 403
}
```

## Comprehensive Testing

Use the included test script:
```bash
./test-rtb-inbound.sh [HOST] [RTB_ID]
```

Tests all authentication methods, error conditions, and response formats.

## Integration Notes

- **Time-to-First-Byte**: < 500ms under normal load
- **Status Codes**: 200 for bid responses, 4xx/5xx for errors
- **Logging**: All requests/responses logged with sanitized phone numbers
- **Health Monitoring**: Available via `/api/rtb/health-checks`
- **Production Ready**: Full HMAC security, replay protection, comprehensive audit trails

The RTB inbound system transforms CallCenter Pro into a complete RTB platform capable of both consuming external RTB services and providing RTB services to external platforms.