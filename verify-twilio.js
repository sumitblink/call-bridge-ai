import fetch from 'node-fetch';

async function verifyTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  console.log('Verifying Twilio credentials...');
  console.log(`Account SID: ${accountSid}`);
  console.log(`Auth Token length: ${authToken?.length}`);
  
  if (!accountSid || !authToken) {
    console.log('Missing credentials');
    return;
  }
  
  // Test different API endpoints
  const endpoints = [
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=1`,
    `https://api.twilio.com/2010-04-01/Accounts.json`
  ];
  
  for (const endpoint of endpoints) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.text();
      console.log(`\nEndpoint: ${endpoint}`);
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${data.substring(0, 200)}...`);
      
      if (response.ok) {
        console.log('SUCCESS: Authentication working!');
        break;
      }
    } catch (error) {
      console.log(`Error testing ${endpoint}: ${error.message}`);
    }
  }
}

verifyTwilioCredentials();