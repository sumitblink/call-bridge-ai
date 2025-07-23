import twilio from 'twilio';
import { db } from './db';
import { phoneNumbers } from '../shared/schema';
import { isNotNull, ne, eq } from 'drizzle-orm';

export class TwilioCleanupService {
  private static twilioClient: any;

  private static getTwilioClient() {
    if (!this.twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not found in environment variables');
      }
      
      this.twilioClient = twilio(accountSid, authToken);
    }
    return this.twilioClient;
  }

  /**
   * Remove all webhooks and reset friendly names for all phone numbers
   */
  static async cleanupAllPhoneNumbers(): Promise<{
    success: boolean;
    processed: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    const client = this.getTwilioClient();
    
    const result = {
      success: false,
      processed: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get all phone numbers with Twilio SIDs from database
      const allNumbers = await db
        .select({
          id: phoneNumbers.id,
          phoneNumber: phoneNumbers.phoneNumber,
          phoneNumberSid: phoneNumbers.phoneNumberSid,
          friendlyName: phoneNumbers.friendlyName,
        })
        .from(phoneNumbers)
        .where(
          isNotNull(phoneNumbers.phoneNumberSid)
        );

      console.log(`Found ${allNumbers.length} phone numbers with Twilio SIDs to clean up`);
      result.processed = allNumbers.length;

      for (const phoneNumber of allNumbers) {
        try {
          if (!phoneNumber.phoneNumberSid || !phoneNumber.phoneNumberSid.startsWith('PN')) {
            console.log(`Skipping ${phoneNumber.phoneNumber}: Invalid SID format`);
            continue;
          }

          console.log(`Cleaning up ${phoneNumber.phoneNumber} (${phoneNumber.phoneNumberSid})`);
          
          // Remove all webhooks and reset friendly name
          await client.incomingPhoneNumbers(phoneNumber.phoneNumberSid).update({
            voiceUrl: '',
            voiceMethod: 'POST',
            statusCallback: '',
            statusCallbackMethod: 'POST',
            friendlyName: 'Unassigned'
          });

          // Update database friendly name
          await db
            .update(phoneNumbers)
            .set({ friendlyName: 'Unassigned' })
            .where(eq(phoneNumbers.id, phoneNumber.id));

          result.updated++;
          console.log(`Successfully cleaned up ${phoneNumber.phoneNumber}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.failed++;
          result.errors.push(`Failed to clean up ${phoneNumber.phoneNumber}: ${errorMsg}`);
          console.error(`Error cleaning up ${phoneNumber.phoneNumber}:`, error);
        }
      }

      result.success = result.updated > 0;
      console.log(`Cleanup completed: ${result.updated} updated, ${result.failed} failed`);
      
      return result;
    } catch (error) {
      console.error('Error during cleanup:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }
}