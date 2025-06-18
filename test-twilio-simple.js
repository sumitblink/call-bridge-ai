import fetch from 'node-fetch';

async function testTwilioAuth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.log('❌ Missing credentials');
    return;
  }
  
  console.log('🔍 Testing with credentials...');
  console.log('Account SID:', accountSid.substring(0, 10) + '...');
  console.log('Auth Token:', authToken.substring(0, 10) + '...');
  
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authentication successful');
      console.log('Account friendly name:', data.friendly_name);
      console.log('Account status:', data.status);
    } else {
      const error = await response.text();
      console.log('❌ Authentication failed:', response.status, error);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }
}

testTwilioAuth();