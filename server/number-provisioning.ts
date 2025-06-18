import twilio from 'twilio';
import { DatabaseStorage } from './storage-db';

const dbStorage = new DatabaseStorage();

export interface NumberProvisioningConfig {
  campaignId: number;
  quantity: number;
  areaCode?: string;
  numberType: 'local' | 'toll-free';
  capabilities: {
    voice: boolean;
    sms: boolean;
  };
}

export interface ProvisionedNumber {
  phoneNumber: string;
  phoneNumberSid: string;
  friendlyName: string;
  capabilities: string[];
  cost: string;
  region: string;
}

export interface ProvisioningResult {
  success: boolean;
  numbers: ProvisionedNumber[];
  totalCost: number;
  failedNumbers: string[];
  error?: string;
}

export class NumberProvisioningService {
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
   * Search available phone numbers for provisioning
   */
  static async searchAvailableNumbers(config: Omit<NumberProvisioningConfig, 'campaignId'>): Promise<any[]> {
    const client = this.getTwilioClient();
    
    try {
      let searchParams: any = {
        limit: config.quantity * 2, // Search for more than needed
      };

      if (config.areaCode) {
        searchParams.areaCode = config.areaCode;
      }

      if (config.capabilities.voice) {
        searchParams.voiceEnabled = true;
      }

      if (config.capabilities.sms) {
        searchParams.smsEnabled = true;
      }

      let availableNumbers;
      
      if (config.numberType === 'toll-free') {
        availableNumbers = await client.availablePhoneNumbers('US')
          .tollFree
          .list(searchParams);
      } else {
        availableNumbers = await client.availablePhoneNumbers('US')
          .local
          .list(searchParams);
      }

      return availableNumbers.slice(0, config.quantity);
    } catch (error) {
      console.error('Error searching available numbers:', error);
      throw error;
    }
  }

  /**
   * Provision phone numbers for a campaign
   */
  static async provisionNumbers(config: NumberProvisioningConfig): Promise<ProvisioningResult> {
    const client = this.getTwilioClient();
    const result: ProvisioningResult = {
      success: false,
      numbers: [],
      totalCost: 0,
      failedNumbers: []
    };

    try {
      // Verify campaign exists
      const campaign = await dbStorage.getCampaign(config.campaignId);
      if (!campaign) {
        throw new Error(`Campaign with ID ${config.campaignId} not found`);
      }

      // Search for available numbers
      const availableNumbers = await this.searchAvailableNumbers(config);
      
      if (availableNumbers.length === 0) {
        throw new Error('No available numbers found matching criteria');
      }

      // Get webhook URL for the campaign
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const webhookUrl = `https://${domain}/api/campaigns/${config.campaignId}/webhook/voice`;
      const statusCallbackUrl = `https://${domain}/api/campaigns/${config.campaignId}/webhook/status`;

      // Purchase numbers
      const purchasePromises = availableNumbers.map(async (availableNumber) => {
        try {
          const purchasedNumber = await client.incomingPhoneNumbers.create({
            phoneNumber: availableNumber.phoneNumber,
            friendlyName: `Campaign-${campaign.name}-${availableNumber.phoneNumber}`,
            voiceUrl: webhookUrl,
            voiceMethod: 'POST',
            statusCallback: statusCallbackUrl,
            statusCallbackMethod: 'POST',
            voiceCallerIdLookup: true
          });

          // Store in database
          await dbStorage.createPhoneNumber({
            phoneNumber: purchasedNumber.phoneNumber,
            phoneNumberSid: purchasedNumber.sid,
            friendlyName: purchasedNumber.friendlyName || '',
            campaignId: config.campaignId,
            userId: campaign.userId,
            accountSid: purchasedNumber.accountSid,
            isActive: true,
            capabilities: JSON.stringify({
              voice: purchasedNumber.capabilities.voice,
              sms: purchasedNumber.capabilities.sms
            }),
            monthlyPrice: '1.00', // Default Twilio pricing
            setupPrice: '1.00',
            currency: 'USD',
            region: availableNumber.region || 'US',
            purchaseDate: new Date()
          });

          const provisionedNumber: ProvisionedNumber = {
            phoneNumber: purchasedNumber.phoneNumber,
            phoneNumberSid: purchasedNumber.sid,
            friendlyName: purchasedNumber.friendlyName || '',
            capabilities: Object.keys(purchasedNumber.capabilities).filter(cap => 
              purchasedNumber.capabilities[cap as keyof typeof purchasedNumber.capabilities]
            ),
            cost: '1.00',
            region: availableNumber.region || 'US'
          };

          result.numbers.push(provisionedNumber);
          result.totalCost += 1.00; // Standard Twilio pricing

          return purchasedNumber;
        } catch (error) {
          console.error(`Failed to purchase number ${availableNumber.phoneNumber}:`, error);
          result.failedNumbers.push(availableNumber.phoneNumber);
          return null;
        }
      });

      await Promise.all(purchasePromises);

      if (result.numbers.length > 0) {
        result.success = true;
        console.log(`Successfully provisioned ${result.numbers.length} numbers for campaign ${config.campaignId}`);
      } else {
        throw new Error('Failed to provision any numbers');
      }

    } catch (error) {
      console.error('Error provisioning numbers:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Release phone numbers and return them to Twilio
   */
  static async releaseNumbers(phoneNumberSids: string[]): Promise<{ success: boolean; released: string[]; failed: string[] }> {
    const client = this.getTwilioClient();
    const result = {
      success: false,
      released: [] as string[],
      failed: [] as string[]
    };

    try {
      const releasePromises = phoneNumberSids.map(async (sid) => {
        try {
          await client.incomingPhoneNumbers(sid).remove();
          
          // Update database
          await dbStorage.updatePhoneNumber(parseInt(sid), { isActive: false });
          
          result.released.push(sid);
          return true;
        } catch (error) {
          console.error(`Failed to release number ${sid}:`, error);
          result.failed.push(sid);
          return false;
        }
      });

      await Promise.all(releasePromises);
      result.success = result.released.length > 0;

    } catch (error) {
      console.error('Error releasing numbers:', error);
    }

    return result;
  }

  /**
   * Get pricing information for different number types
   */
  static async getPricingInfo(numberType: 'local' | 'toll-free', areaCode?: string): Promise<any> {
    const client = this.getTwilioClient();
    
    try {
      if (numberType === 'toll-free') {
        return {
          monthlyPrice: '2.00',
          setupPrice: '1.00',
          currency: 'USD',
          features: ['Toll-free calling', 'National coverage', 'Professional appearance']
        };
      } else {
        return {
          monthlyPrice: '1.00',
          setupPrice: '1.00',
          currency: 'USD',
          features: ['Local presence', 'Higher answer rates', 'Area-specific targeting']
        };
      }
    } catch (error) {
      console.error('Error getting pricing info:', error);
      throw error;
    }
  }

  /**
   * Get campaign number statistics
   */
  static async getCampaignNumberStats(campaignId: number): Promise<{
    totalNumbers: number;
    activeNumbers: number;
    inactiveNumbers: number;
    monthlyCost: number;
  }> {
    try {
      const numbers = await dbStorage.getCampaignPhoneNumbers(campaignId);
      
      const stats = {
        totalNumbers: numbers.length,
        activeNumbers: numbers.filter(n => n.isActive).length,
        inactiveNumbers: numbers.filter(n => !n.isActive).length,
        monthlyCost: numbers.filter(n => n.isActive).reduce((sum, n) => sum + parseFloat(n.monthlyPrice), 0)
      };

      return stats;
    } catch (error) {
      console.error('Error getting campaign number stats:', error);
      throw error;
    }
  }
}