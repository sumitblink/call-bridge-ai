// Quick test to verify Twilio credentials and API connectivity
import fetch from 'node-fetch';

async function testTwilioConnection() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('❌ Twilio credentials not found');
    return;
  }
  
  console.log('🔍 Testing Twilio connection...');
  console.log('Account SID:', accountSid.substring(0, 10) + '...');
  
  try {
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { 'Authorization': authHeader }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Twilio connection successful!');
      console.log('Account Name:', data.friendly_name);
      console.log('Account Status:', data.status);
      return true;
    } else {
      console.error('❌ Twilio API error:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

testTwilioConnection();