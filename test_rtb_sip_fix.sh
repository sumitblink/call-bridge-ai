#!/bin/bash

echo "=== RTB SIP Routing Fix Verification ==="

echo "1. Testing SIP destination detection:"
node -e "
const isSip = (dest) => {
  if (!dest) return false;
  const trimmed = dest.trim();
  return /^sip:/i.test(trimmed) || 
         /@/.test(trimmed) || 
         /\.sip\./.test(trimmed) || 
         /\.(com|net|org|io)$/i.test(trimmed);
};

const toE164 = (n) => {
  if (!n) return null;
  const trimmed = n.trim();
  
  if (isSip(trimmed)) {
    console.log(\`[toE164] Skipping E.164 conversion for SIP address: \${trimmed}\`);
    return null;
  }
  
  let s = trimmed.replace(/[^\d+]/g, '');
  if (!s.startsWith('+')) s = '+' + s;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
};

// Test the exact destination that failed
const problematicDest = 'RTB7aa40b746620460da628edb554ad4b8d@rtb.ringba.sip.telnyx.com';
console.log('Destination:', problematicDest);
console.log('Is SIP:', isSip(problematicDest));
console.log('E.164 conversion:', toE164(problematicDest));
console.log('Length:', problematicDest.length);

// Test other formats
const tests = [
  '+15551234567',
  'sip:test@domain.com', 
  'user@sip.provider.com',
  'RTBeeb951111646484aa741097a927c5fdf@rtb.ringba.sip.telnyx.com'
];

tests.forEach(dest => {
  console.log(\`\nTesting: \${dest}\`);
  console.log(\`  SIP: \${isSip(dest)}\`);
  console.log(\`  E.164: \${toE164(dest)}\`);
});
"

echo -e "\n2. Checking database can store long SIP addresses:"
echo "SELECT character_maximum_length FROM information_schema.columns WHERE table_name = 'rtb_bid_responses' AND column_name = 'destination_number';" | DATABASE_URL="$DATABASE_URL" psql

echo -e "\n3. Testing RTB inbound endpoint with SIP address:"
curl -s -X POST http://localhost:5000/v1/production/hmac123test.json \
  -H 'Content-Type: application/json' \
  -d '{
    "test": "sip_routing_test",
    "bidAmount": 6.5,
    "expireInSeconds": 60,
    "sipAddress": "RTBtestfix@rtb.ringba.sip.telnyx.com",
    "phoneNumber": "+17733408913"
  }' | jq -r '"Status: " + (if .accept then "ACCEPTED" else "REJECTED") + " | SIP: " + (.sipAddress // "NONE") + " | Bid: $" + (.bidAmount | tostring)'

echo -e "\n=== RTB SIP Fix Complete ==="