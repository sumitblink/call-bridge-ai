import twilio from 'twilio';
import { storage } from './hybrid-storage';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface TrunkConfiguration {
  id: string;
  friendlyName: string;
  domainName: string;
  disaster_recovery_url?: string;
  disaster_recovery_method?: string;
  recording?: {
    mode: 'do-not-record' | 'record-from-ringing' | 'record-from-answer';
    trim: 'trim-silence' | 'do-not-trim';
  };
  secure: boolean;
  cnam_lookup_enabled: boolean;
  connection_policy_sid?: string;
  origination_url: string;
  origination_urls: string[];
  termination_uri?: string;
}

export interface NumberPoolAssignment {
  sessionId: string;
  campaignId: number;
  phoneNumber: string;
  assignedAt: Date;
  expiresAt: Date;
  utmData?: Record<string, string>;
  visitorData?: {
    ipAddress: string;
    userAgent: string;
    referrer?: string;
  };
}

export interface TrunkNumberPool {
  trunkSid: string;
  campaignId: number;
  phoneNumbers: string[];
  availableNumbers: string[];
  assignedNumbers: Map<string, NumberPoolAssignment>;
  poolConfig: {
    maxConcurrentAssignments: number;
    sessionDurationMinutes: number;
    cooldownMinutes: number;
    assignmentStrategy: 'round-robin' | 'random' | 'least-used';
  };
}

export class TwilioTrunkService {
  private static numberPools: Map<number, TrunkNumberPool> = new Map();

  /**
   * Create a new SIP trunk for a campaign
   */
  static async createTrunk(campaignId: number, config: Partial<TrunkConfiguration>): Promise<TrunkConfiguration> {
    if (!client) {
      throw new Error('Twilio client not configured');
    }

    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const trunkConfig = {
      friendlyName: config.friendlyName || `Campaign-${campaign.name}-Trunk`,
      domainName: config.domainName || `campaign-${campaignId}.${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}`,
      secure: config.secure ?? true,
      cnam_lookup_enabled: config.cnam_lookup_enabled ?? true,
      origination_url: config.origination_url || `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/twilio/trunk/voice`,
      origination_urls: config.origination_urls || [`https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/twilio/trunk/voice`],
      recording: config.recording || {
        mode: 'record-from-answer',
        trim: 'trim-silence'
      }
    };

    try {
      const trunk = await client.trunking.v1.trunks.create(trunkConfig);
      
      return {
        id: trunk.sid,
        friendlyName: trunk.friendlyName || trunkConfig.friendlyName,
        domainName: trunk.domainName || trunkConfig.domainName,
        secure: trunk.secure || trunkConfig.secure,
        cnam_lookup_enabled: trunk.cnamLookupEnabled || trunkConfig.cnam_lookup_enabled,
        origination_url: trunkConfig.origination_url,
        origination_urls: trunk.originationUrls || trunkConfig.origination_urls
      };
    } catch (error) {
      console.error('Error creating trunk:', error);
      throw new Error('Failed to create SIP trunk');
    }
  }

  /**
   * Provision phone numbers for a trunk
   */
  static async provisionNumbers(
    trunkSid: string, 
    campaignId: number, 
    count: number = 10,
    areaCode?: string
  ): Promise<string[]> {
    if (!client) {
      throw new Error('Twilio client not configured');
    }

    const availableNumbers = await client.availablePhoneNumbers('US')
      .local.list({
        areaCode: areaCode ? parseInt(areaCode) : undefined,
        limit: count
      });

    if (availableNumbers.length === 0) {
      throw new Error('No available phone numbers found');
    }

    const purchasedNumbers: string[] = [];

    for (const availableNumber of availableNumbers.slice(0, count)) {
      try {
        const purchasedNumber = await client.incomingPhoneNumbers.create({
          phoneNumber: availableNumber.phoneNumber,
          trunkSid: trunkSid,
          voiceUrl: `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/twilio/trunk/voice`
        });

        purchasedNumbers.push(purchasedNumber.phoneNumber);
      } catch (error) {
        console.error(`Error purchasing number ${availableNumber.phoneNumber}:`, error);
      }
    }

    // Initialize number pool for campaign
    this.initializeNumberPool(campaignId, trunkSid, purchasedNumbers);

    return purchasedNumbers;
  }

  /**
   * Initialize number pool for a campaign
   */
  static initializeNumberPool(
    campaignId: number, 
    trunkSid: string, 
    phoneNumbers: string[],
    config?: Partial<TrunkNumberPool['poolConfig']>
  ): void {
    const poolConfig = {
      maxConcurrentAssignments: config?.maxConcurrentAssignments || 50,
      sessionDurationMinutes: config?.sessionDurationMinutes || 30,
      cooldownMinutes: config?.cooldownMinutes || 5,
      assignmentStrategy: config?.assignmentStrategy || 'round-robin' as const
    };

    const pool: TrunkNumberPool = {
      trunkSid,
      campaignId,
      phoneNumbers: [...phoneNumbers],
      availableNumbers: [...phoneNumbers],
      assignedNumbers: new Map(),
      poolConfig
    };

    this.numberPools.set(campaignId, pool);
  }

  /**
   * Assign a phone number from the pool to a session
   */
  static async assignNumberFromPool(
    campaignId: number,
    sessionId: string,
    utmData?: Record<string, string>,
    visitorData?: NumberPoolAssignment['visitorData']
  ): Promise<NumberPoolAssignment | null> {
    const pool = this.numberPools.get(campaignId);
    if (!pool) {
      throw new Error(`No number pool found for campaign ${campaignId}`);
    }

    // Clean up expired assignments
    this.cleanupExpiredAssignments(campaignId);

    if (pool.availableNumbers.length === 0) {
      console.warn(`No available numbers in pool for campaign ${campaignId}`);
      return null;
    }

    let selectedNumber: string;
    
    // Select number based on strategy
    switch (pool.poolConfig.assignmentStrategy) {
      case 'random':
        selectedNumber = pool.availableNumbers[Math.floor(Math.random() * pool.availableNumbers.length)];
        break;
      case 'least-used':
        // For simplicity, use round-robin for now
        selectedNumber = pool.availableNumbers[0];
        break;
      case 'round-robin':
      default:
        selectedNumber = pool.availableNumbers[0];
        break;
    }

    // Create assignment
    const assignment: NumberPoolAssignment = {
      sessionId,
      campaignId,
      phoneNumber: selectedNumber,
      assignedAt: new Date(),
      expiresAt: new Date(Date.now() + pool.poolConfig.sessionDurationMinutes * 60 * 1000),
      utmData,
      visitorData
    };

    // Update pool state
    pool.assignedNumbers.set(sessionId, assignment);
    pool.availableNumbers = pool.availableNumbers.filter(num => num !== selectedNumber);

    return assignment;
  }

  /**
   * Release a number back to the pool
   */
  static async releaseNumber(campaignId: number, sessionId: string): Promise<boolean> {
    const pool = this.numberPools.get(campaignId);
    if (!pool) {
      return false;
    }

    const assignment = pool.assignedNumbers.get(sessionId);
    if (!assignment) {
      return false;
    }

    // Remove from assigned numbers
    pool.assignedNumbers.delete(sessionId);

    // Add back to available numbers after cooldown
    setTimeout(() => {
      if (!pool.availableNumbers.includes(assignment.phoneNumber)) {
        pool.availableNumbers.push(assignment.phoneNumber);
      }
    }, pool.poolConfig.cooldownMinutes * 60 * 1000);

    return true;
  }

  /**
   * Get assignment by session ID
   */
  static getAssignmentBySession(campaignId: number, sessionId: string): NumberPoolAssignment | null {
    const pool = this.numberPools.get(campaignId);
    if (!pool) {
      return null;
    }

    return pool.assignedNumbers.get(sessionId) || null;
  }

  /**
   * Get assignment by phone number
   */
  static getAssignmentByPhoneNumber(phoneNumber: string): NumberPoolAssignment | null {
    for (const pool of this.numberPools.values()) {
      for (const assignment of pool.assignedNumbers.values()) {
        if (assignment.phoneNumber === phoneNumber) {
          return assignment;
        }
      }
    }
    return null;
  }

  /**
   * Clean up expired assignments
   */
  static cleanupExpiredAssignments(campaignId: number): void {
    const pool = this.numberPools.get(campaignId);
    if (!pool) {
      return;
    }

    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, assignment] of pool.assignedNumbers.entries()) {
      if (assignment.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.releaseNumber(campaignId, sessionId);
    }
  }

  /**
   * Get pool statistics
   */
  static getPoolStats(campaignId: number): {
    totalNumbers: number;
    availableNumbers: number;
    assignedNumbers: number;
    activeAssignments: NumberPoolAssignment[];
  } | null {
    const pool = this.numberPools.get(campaignId);
    if (!pool) {
      return null;
    }

    this.cleanupExpiredAssignments(campaignId);

    return {
      totalNumbers: pool.phoneNumbers.length,
      availableNumbers: pool.availableNumbers.length,
      assignedNumbers: pool.assignedNumbers.size,
      activeAssignments: Array.from(pool.assignedNumbers.values())
    };
  }

  /**
   * Handle incoming call from trunk
   */
  static async handleTrunkCall(
    callSid: string,
    from: string,
    to: string,
    callerId?: string
  ): Promise<{ twiml: string; assignment: NumberPoolAssignment | null }> {
    // Find assignment for this phone number
    const assignment = this.getAssignmentByPhoneNumber(to);
    
    if (!assignment) {
      // No assignment found, handle as general campaign call
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Thank you for calling. Please hold while we connect you.</Say>
          <Dial timeout="30">
            <Number>${process.env.DEFAULT_FORWARD_NUMBER || '+15555551234'}</Number>
          </Dial>
        </Response>`;
      
      return { twiml, assignment: null };
    }

    // Get campaign and route call
    const campaign = await storage.getCampaign(assignment.campaignId);
    if (!campaign) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, this campaign is no longer active.</Say>
          <Hangup/>
        </Response>`;
      
      return { twiml, assignment };
    }

    // Create call record
    const callData = {
      callSid,
      status: 'in-progress',
      fromNumber: from,
      toNumber: to,
      campaignId: assignment.campaignId,
      sessionId: assignment.sessionId,
      utmData: assignment.utmData,
      visitorData: assignment.visitorData
    };

    await storage.createCall(callData);

    // Generate TwiML for call routing
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Thank you for calling ${campaign.name}. Please hold while we connect you to an agent.</Say>
        <Dial timeout="30" record="record-from-answer">
          <Number>${campaign.phoneNumber || process.env.DEFAULT_FORWARD_NUMBER}</Number>
        </Dial>
      </Response>`;

    return { twiml, assignment };
  }
}