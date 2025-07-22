import twilio from 'twilio';

export class TwilioWebhookService {
  private static twilioClient: twilio.Twilio | null = null;

  private static getTwilioClient(): twilio.Twilio {
    if (!this.twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }
      
      this.twilioClient = twilio(accountSid, authToken);
    }
    return this.twilioClient;
  }

  /**
   * Update webhook URLs for phone numbers in a pool
   */
  static async updatePoolWebhooks(poolId: number, phoneNumbers: any[]): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    errors: string[];
  }> {
    const client = this.getTwilioClient();
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    
    // Pool-based webhook URLs
    const webhookUrl = `${protocol}://${domain}/api/webhooks/pool/${poolId}/voice`;
    const statusCallbackUrl = `${protocol}://${domain}/api/webhooks/pool/${poolId}/status`;
    
    const result = {
      success: false,
      updated: [] as string[],
      failed: [] as string[],
      errors: [] as string[]
    };

    console.log(`Updating webhooks for pool ${poolId} with ${phoneNumbers.length} numbers`);
    console.log(`Voice webhook URL: ${webhookUrl}`);
    console.log(`Status callback URL: ${statusCallbackUrl}`);

    try {
      for (const phoneNumber of phoneNumbers) {
        try {
          console.log(`Processing ${phoneNumber.phoneNumber} with SID: ${phoneNumber.phoneNumberSid || 'MISSING'}`);
          
          if (!phoneNumber.phoneNumberSid || phoneNumber.phoneNumberSid === '' || phoneNumber.phoneNumberSid === null || phoneNumber.phoneNumberSid === undefined) {
            console.log(`Skipping ${phoneNumber.phoneNumber}: No Twilio SID configured (this is normal for manually added numbers)`);
            continue;
          }

          // Test if the SID format is valid (should start with PN)
          if (!phoneNumber.phoneNumberSid.startsWith('PN')) {
            result.failed.push(phoneNumber.phoneNumber);
            result.errors.push(`Invalid Twilio SID format for ${phoneNumber.phoneNumber}: ${phoneNumber.phoneNumberSid}`);
            console.log(`Skipping ${phoneNumber.phoneNumber}: Invalid SID format`);
            continue;
          }

          console.log(`Updating Twilio webhook for ${phoneNumber.phoneNumber} (${phoneNumber.phoneNumberSid})`);
          
          await client.incomingPhoneNumbers(phoneNumber.phoneNumberSid).update({
            voiceUrl: webhookUrl,
            voiceMethod: 'POST',
            statusCallback: statusCallbackUrl,
            statusCallbackMethod: 'POST',
            friendlyName: `Pool-${poolId}-${phoneNumber.phoneNumber}`
          });

          result.updated.push(phoneNumber.phoneNumber);
          console.log(`Successfully updated webhook for ${phoneNumber.phoneNumber}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.failed.push(phoneNumber.phoneNumber);
          result.errors.push(`Failed to update ${phoneNumber.phoneNumber}: ${errorMsg}`);
          console.error(`Twilio API error for ${phoneNumber.phoneNumber}:`, error);
        }
      }

      result.success = result.updated.length > 0;
      console.log(`Webhook update completed: ${result.updated.length} updated, ${result.failed.length} failed`);
      
      return result;
    } catch (error) {
      console.error('Error updating pool webhooks:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Update webhook URLs for a single campaign number
   */
  static async updateCampaignWebhook(campaignId: number, phoneNumber: any): Promise<boolean> {
    const client = this.getTwilioClient();
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    
    const webhookUrl = `${protocol}://${domain}/api/campaigns/${campaignId}/webhook/voice`;
    const statusCallbackUrl = `${protocol}://${domain}/api/campaigns/${campaignId}/webhook/status`;

    try {
      if (!phoneNumber.phoneNumberSid) {
        throw new Error(`No Twilio SID found for ${phoneNumber.phoneNumber}`);
      }

      await client.incomingPhoneNumbers(phoneNumber.phoneNumberSid).update({
        voiceUrl: webhookUrl,
        voiceMethod: 'POST',
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: 'POST',
        friendlyName: `Campaign-${campaignId}-${phoneNumber.phoneNumber}`
      });

      console.log(`Updated campaign webhook for ${phoneNumber.phoneNumber}`);
      return true;
    } catch (error) {
      console.error(`Failed to update campaign webhook for ${phoneNumber.phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Remove webhook configuration and reset to unassigned state
   */
  static async removeWebhooks(phoneNumbers: any[]): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    errors: string[];
  }> {
    const client = this.getTwilioClient();
    const result = {
      success: false,
      updated: [] as string[],
      failed: [] as string[],
      errors: [] as string[]
    };

    console.log(`Removing webhooks and resetting ${phoneNumbers.length} numbers to unassigned state`);

    try {
      for (const phoneNumber of phoneNumbers) {
        try {
          if (!phoneNumber.phoneNumberSid || phoneNumber.phoneNumberSid === '' || phoneNumber.phoneNumberSid === null || phoneNumber.phoneNumberSid === undefined) {
            console.log(`Skipping ${phoneNumber.phoneNumber}: No Twilio SID configured (this is normal for manually added numbers)`);
            continue;
          }

          await client.incomingPhoneNumbers(phoneNumber.phoneNumberSid).update({
            voiceUrl: '',
            statusCallback: '',
            friendlyName: `Unassigned-${phoneNumber.phoneNumber}`
          });

          result.updated.push(phoneNumber.phoneNumber);
          console.log(`Reset webhook and friendly name for ${phoneNumber.phoneNumber}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.failed.push(phoneNumber.phoneNumber);
          result.errors.push(`Failed to reset ${phoneNumber.phoneNumber}: ${errorMsg}`);
          console.error(`Failed to reset webhook for ${phoneNumber.phoneNumber}:`, error);
        }
      }

      result.success = result.updated.length > 0;
      console.log(`Webhook removal completed: ${result.updated.length} updated, ${result.failed.length} failed`);
      return result;
    } catch (error) {
      console.error('Error removing webhooks:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Reset numbers to unassigned state when removed from pools
   */
  static async resetNumbersToUnassigned(phoneNumbers: any[]): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    errors: string[];
  }> {
    return this.removeWebhooks(phoneNumbers);
  }
}