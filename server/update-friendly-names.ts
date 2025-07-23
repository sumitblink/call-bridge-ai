import { TwilioWebhookService } from './twilio-webhook-service';
import { db } from './db';
import { phoneNumbers, numberPoolAssignments } from '../shared/schema';
import { eq } from 'drizzle-orm';

export class FriendlyNameUpdater {
  /**
   * Update all phone number friendly names to simple format
   */
  static async updateAllFriendlyNames(): Promise<{
    success: boolean;
    poolUpdated: string[];
    unassignedUpdated: string[];
    failed: string[];
    errors: string[];
  }> {
    const result = {
      success: false,
      poolUpdated: [] as string[],
      unassignedUpdated: [] as string[],
      failed: [] as string[],
      errors: [] as string[]
    };

    try {
      // Get all phone numbers with their pool assignments
      const numbers = await db
        .select({
          id: phoneNumbers.id,
          phoneNumber: phoneNumbers.phoneNumber,
          phoneNumberSid: phoneNumbers.phoneNumberSid,
          poolId: numberPoolAssignments.poolId
        })
        .from(phoneNumbers)
        .leftJoin(numberPoolAssignments, eq(phoneNumbers.id, numberPoolAssignments.phoneNumberId))
        .where(eq(phoneNumbers.isActive, true));

      console.log(`Found ${numbers.length} phone numbers to update`);

      for (const number of numbers) {
        if (!number.phoneNumberSid || !number.phoneNumberSid.startsWith('PN')) {
          console.log(`Skipping ${number.phoneNumber}: No valid Twilio SID`);
          continue;
        }

        try {
          let friendlyName: string;
          
          if (number.poolId) {
            friendlyName = `Pool ${number.poolId}`;
          } else {
            friendlyName = 'Unassigned';
          }

          // Update Twilio friendly name
          await this.updateTwilioFriendlyName(number.phoneNumberSid, friendlyName);
          
          // Update database friendly name
          await db
            .update(phoneNumbers)
            .set({ friendlyName })
            .where(eq(phoneNumbers.id, number.id));

          if (number.poolId) {
            result.poolUpdated.push(number.phoneNumber);
          } else {
            result.unassignedUpdated.push(number.phoneNumber);
          }

          console.log(`✅ Updated ${number.phoneNumber} to "${friendlyName}"`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.failed.push(number.phoneNumber);
          result.errors.push(`Failed to update ${number.phoneNumber}: ${errorMsg}`);
          console.error(`❌ Error updating ${number.phoneNumber}:`, error);
        }
      }

      result.success = (result.poolUpdated.length + result.unassignedUpdated.length) > 0;
      
      console.log(`✅ Friendly name update completed:`);
      console.log(`   Pool numbers updated: ${result.poolUpdated.length}`);
      console.log(`   Unassigned numbers updated: ${result.unassignedUpdated.length}`);
      console.log(`   Failed: ${result.failed.length}`);

      return result;
    } catch (error) {
      console.error('Error updating friendly names:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Update a single phone number's friendly name in Twilio
   */
  private static async updateTwilioFriendlyName(phoneNumberSid: string, friendlyName: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'FriendlyName': friendlyName
      }).toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio API error: ${response.status} ${error}`);
    }
  }
}