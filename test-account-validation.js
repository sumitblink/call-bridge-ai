import fetch from 'node-fetch';

async function validateAccount() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  console.log('Account validation details:');
  console.log(`Account SID: ${accountSid}`);
  console.log(`Token format valid: ${/^[a-f0-9]{32}$/i.test(authToken)}`);
  console.log(`SID format valid: ${/^AC[a-f0-9]{32}$/i.test(accountSid)}`);
  
  // Test with minimal endpoint
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
    });
    
    const responseText = await response.text();
    console.log(`\nHTTP Status: ${response.status}`);
    console.log(`Response: ${responseText}`);
    
    if (response.status === 401) {
      console.log('\nPossible issues:');
      console.log('1. Account SID or Auth Token is incorrect');
      console.log('2. Trial account with API restrictions');
      console.log('3. Account suspended or billing issues');
      console.log('4. Auth Token has been regenerated');
    }
    
  } catch (error) {
    console.log(`Network error: ${error.message}`);
  }
}

validateAccount();