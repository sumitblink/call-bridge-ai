// Create a temporary endpoint to fix the webhook issue
const express = require('express');
const { TwilioWebhookService } = require('./server/twilio-webhook-service');

// This will be added to server/routes.ts temporarily
const webhookFixRoute = `
  app.post('/api/admin/fix-webhook', async (req, res) => {
    try {
      console.log('🔧 Fixing webhook for +18565290287...');
      
      const phoneNumbers = [{
        phoneNumber: '+18565290287',
        phoneNumberSid: 'PN49112031139bb2a8b104aa327a930fba'
      }];
      
      const result = await TwilioWebhookService.updatePoolWebhooks(3, phoneNumbers);
      
      if (result.success) {
        console.log('✅ Successfully updated webhook URL for +18565290287');
        res.json({ 
          success: true, 
          message: 'Webhook fixed successfully',
          result 
        });
      } else {
        console.log('❌ Failed to update webhook:', result.errors);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to update webhook',
          errors: result.errors 
        });
      }
    } catch (error) {
      console.error('❌ Error fixing webhook:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fixing webhook',
        error: error.message 
      });
    }
  });
`;

console.log('Add this route to server/routes.ts:');
console.log(webhookFixRoute);