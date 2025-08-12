#!/bin/bash

echo "=== Testing SIP Routing Fix ==="

# Test with the actual SIP destination that failed
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

const dest = 'RTB7aa40b746620460da628edb554ad4b8d@rtb.ringba.sip.telnyx.com';
console.log('Destination:', dest);
console.log('Is SIP:', isSip(dest));
console.log('Length:', dest.length);
"

echo -e "\n2. Checking database schema for destination storage:"
echo "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'rtb_bid_responses' AND column_name = 'destination_number';" | DATABASE_URL="$DATABASE_URL" psql

echo -e "\n3. Testing call simulation with correct SIP routing..."
