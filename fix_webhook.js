// Quick script to fix the webhook configuration
const TwilioWebhookService = require('./server/twilio-webhook-service.ts');

async function fixWebhook() {
  try {
    // Phone number details
    const phoneNumbers = [{
      phoneNumber: '+18565290287',
      phoneNumberSid: 'PN1b8d9a4e5f6c7a8b9c0d1e2f3a4b5c6d7'  // This needs to be the actual SID
    }];
    
    // Update to pool 3 (correct pool)
    const result = await TwilioWebhookService.updatePoolWebhooks(3, phoneNumbers);
    console.log('Webhook update result:', result);
  } catch (error) {
    console.error('Error fixing webhook:', error);
  }
}

fixWebhook();