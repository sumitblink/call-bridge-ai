/**
 * Phone Number Configuration Test
 * This script helps verify which phone numbers are configured in the system
 */

const fetch = require('node-fetch');

async function testPhoneConfiguration() {
  console.log('=== PHONE NUMBER CONFIGURATION TEST ===');
  
  // Test different variations of the phone number
  const testNumbers = [
    '+18562813889',  // This should work
    '+18562813888',  // This should fail  
    '+18562813890',  // This should fail
    '18562813889',   // This should fail (no +)
    '+1 856 281 3889' // This should fail (formatted differently)
  ];
  
  for (const phoneNumber of testNumbers) {
    console.log(`\nTesting phone number: ${phoneNumber}`);
    
    try {
      const response = await fetch('http://localhost:5000/api/webhooks/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          CallSid: 'CA123456789',
          From: '+19876543210',
          To: phoneNumber,
          CallStatus: 'ringing',
          Direction: 'inbound'
        })
      });
      
      const twiml = await response.text();
      
      if (twiml.includes('Gather')) {
        console.log('✅ SUCCESS: Call flow executed correctly');
      } else if (twiml.includes('not configured')) {
        console.log('❌ FAILED: Phone number not configured');
      } else {
        console.log('⚠️  UNKNOWN: Unexpected response');
      }
      
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('The working phone number appears to be: +18562813889');
  console.log('When making actual phone calls, ensure you dial this exact number.');
  console.log('If you\'re still getting errors, check that:');
  console.log('1. The Twilio webhook URL is correctly configured');
  console.log('2. The campaign is active and has a call flow assigned');
  console.log('3. The phone number format matches exactly');
}

testPhoneConfiguration().catch(console.error);