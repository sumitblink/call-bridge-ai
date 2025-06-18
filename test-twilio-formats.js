import fetch from 'node-fetch';

async function testDifferentFormats() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  console.log('Testing different authentication formats...');
  
  // Format 1: Basic Auth with colon separator
  const auth1 = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  
  // Format 2: Try with URL encoding
  const encodedSid = encodeURIComponent(accountSid);
  const encodedToken = encodeURIComponent(authToken);
  const auth2 = Buffer.from(`${encodedSid}:${encodedToken}`).toString('base64');
  
  // Format 3: Try trimmed values
  const trimmedSid = accountSid.trim();
  const trimmedToken = authToken.trim();
  const auth3 = Buffer.from(`${trimmedSid}:${trimmedToken}`).toString('base64');
  
  const formats = [
    { name: 'Standard', auth: auth1 },
    { name: 'URL Encoded', auth: auth2 },
    { name: 'Trimmed', auth: auth3 }
  ];
  
  for (const format of formats) {
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        headers: {
          'Authorization': `Basic ${format.auth}`,
          'Accept': 'application/json'
        }
      });
      
      console.log(`${format.name}: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`SUCCESS with ${format.name} format!`);
        console.log(`Account: ${data.friendly_name}, Status: ${data.status}`);
        return;
      } else {
        const errorText = await response.text();
        console.log(`Error: ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`${format.name} failed: ${error.message}`);
    }
  }
  
  // Test with Twilio SDK format
  console.log('\nTesting with direct credentials...');
  console.log(`SID length: ${accountSid.length}, Token length: ${authToken.length}`);
  console.log(`SID starts with AC: ${accountSid.startsWith('AC')}`);
  console.log(`Token is hex: ${/^[a-f0-9]+$/i.test(authToken)}`);
}

testDifferentFormats();