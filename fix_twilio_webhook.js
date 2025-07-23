const { TwilioWebhookService } = require('./server/twilio-webhook-service.ts');

async function fixWebhook() {
  try {
    console.log('Fixing webhook configuration for +18565290287...');
    
    // Phone number with correct details from database
    const phoneNumbers = [{
      phoneNumber: '+18565290287',
      phoneNumberSid: 'PN49112031139bb2a8b104aa327a930fba'
    }];
    
    // Update to pool 3 (correct pool according to database)
    const result = await TwilioWebhookService.updatePoolWebhooks(3, phoneNumbers);
    console.log('✅ Webhook update result:', result);
    
    if (result.success) {
      console.log('✅ Successfully updated webhook URL for +18565290287 to pool 3');
    } else {
      console.log('❌ Failed to update webhook:', result.errors);
    }
  } catch (error) {
    console.error('❌ Error fixing webhook:', error);
  }
}

fixWebhook();