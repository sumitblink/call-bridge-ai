import fetch from 'node-fetch';

export interface TwilioPhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  region: string;
  isoCountry: string;
  addressRequirements: string;
  beta: boolean;
  capabilities: {
    voice?: boolean;
    SMS?: boolean;
    MMS?: boolean;
  };
}

export interface SearchPhoneNumbersParams {
  country: string;
  numberType: 'local' | 'toll-free' | 'mobile';
  areaCode?: string;
  contains?: string;
  limit?: number;
}

export interface PurchasePhoneNumberParams {
  phoneNumber: string;
  voiceUrl?: string;
  voiceMethod?: 'GET' | 'POST';
  statusCallback?: string;
  friendlyName?: string;
}

export class TwilioPhoneService {
  private accountSid: string;
  private authToken: string;
  private baseUrl: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;

    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured');
    }
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
  }

  /**
   * Search for available phone numbers
   */
  async searchAvailableNumbers(params: SearchPhoneNumbersParams): Promise<TwilioPhoneNumber[]> {
    const { country, numberType, areaCode, contains, limit = 20 } = params;
    
    // Map our number types to Twilio's API endpoints
    const typeMapping = {
      'local': 'Local',
      'toll-free': 'TollFree',
      'mobile': 'Mobile'
    };

    const twilioType = typeMapping[numberType];
    if (!twilioType) {
      throw new Error(`Unsupported number type: ${numberType}`);
    }

    const searchParams = new URLSearchParams({
      VoiceEnabled: 'true',
      PageSize: limit.toString()
    });

    if (areaCode) {
      searchParams.append('AreaCode', areaCode);
    }

    if (contains) {
      searchParams.append('Contains', contains);
    }

    const url = `${this.baseUrl}/AvailablePhoneNumbers/${country.toUpperCase()}/${twilioType}.json?${searchParams}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      
      return data.available_phone_numbers.map((number: any) => ({
        phoneNumber: number.phone_number,
        friendlyName: number.friendly_name,
        region: number.region,
        isoCountry: number.iso_country,
        addressRequirements: number.address_requirements,
        beta: number.beta,
        capabilities: {
          voice: number.capabilities?.voice,
          SMS: number.capabilities?.SMS,
          MMS: number.capabilities?.MMS
        }
      }));
    } catch (error) {
      console.error('Error searching available numbers:', error);
      throw error;
    }
  }

  /**
   * Purchase a phone number
   */
  async purchasePhoneNumber(params: PurchasePhoneNumberParams): Promise<any> {
    const { phoneNumber, voiceUrl, voiceMethod = 'POST', statusCallback, friendlyName } = params;

    const formData = new URLSearchParams({
      PhoneNumber: phoneNumber
    });

    if (voiceUrl) {
      formData.append('VoiceUrl', voiceUrl);
    }

    if (voiceMethod) {
      formData.append('VoiceMethod', voiceMethod);
    }

    if (statusCallback) {
      formData.append('StatusCallback', statusCallback);
    }

    if (friendlyName) {
      formData.append('FriendlyName', friendlyName);
    }

    const url = `${this.baseUrl}/IncomingPhoneNumbers.json`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      
      return {
        phoneNumberSid: data.sid,
        accountSid: data.account_sid,
        phoneNumber: data.phone_number,
        friendlyName: data.friendly_name,
        voiceUrl: data.voice_url,
        voiceMethod: data.voice_method,
        statusCallback: data.status_callback,
        capabilities: data.capabilities,
        dateCreated: data.date_created,
        dateUpdated: data.date_updated
      };
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      throw error;
    }
  }

  /**
   * Get purchased phone numbers
   */
  async getIncomingPhoneNumbers(): Promise<any[]> {
    const url = `${this.baseUrl}/IncomingPhoneNumbers.json`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      return data.incoming_phone_numbers || [];
    } catch (error) {
      console.error('Error fetching incoming phone numbers:', error);
      throw error;
    }
  }

  /**
   * Update phone number configuration
   */
  async updatePhoneNumber(phoneNumberSid: string, params: Partial<PurchasePhoneNumberParams>): Promise<any> {
    const { voiceUrl, voiceMethod, statusCallback, friendlyName } = params;

    const formData = new URLSearchParams();

    if (voiceUrl) {
      formData.append('VoiceUrl', voiceUrl);
    }

    if (voiceMethod) {
      formData.append('VoiceMethod', voiceMethod);
    }

    if (statusCallback) {
      formData.append('StatusCallback', statusCallback);
    }

    if (friendlyName) {
      formData.append('FriendlyName', friendlyName);
    }

    const url = `${this.baseUrl}/IncomingPhoneNumbers/${phoneNumberSid}.json`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating phone number:', error);
      throw error;
    }
  }

  /**
   * Release (delete) a phone number
   */
  async releasePhoneNumber(phoneNumberSid: string): Promise<boolean> {
    const url = `${this.baseUrl}/IncomingPhoneNumbers/${phoneNumberSid}.json`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error releasing phone number:', error);
      throw error;
    }
  }
}

export const twilioPhoneService = new TwilioPhoneService();