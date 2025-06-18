import { DatabaseStorage } from './storage-db';

const dbStorage = new DatabaseStorage();

// For now, we'll simulate trunk functionality since Twilio SIP trunking requires enterprise setup
// In production, you would import and configure the Twilio client here

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
    // First verify campaign exists
    const campaign = await dbStorage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    
    // Simulate trunk creation - in production this would call Twilio's SIP trunking API
    const trunkId = `TK${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    
    const trunkConfiguration: TrunkConfiguration = {
      id: trunkId,
      friendlyName: config.friendlyName || `Campaign-${campaign.name}-Trunk`,
      domainName: config.domainName || `campaign-${campaignId}.${domain}`,
      secure: config.secure ?? true,
      cnam_lookup_enabled: config.cnam_lookup_enabled ?? true,
      origination_url: `https://${domain}/api/twilio/trunk/voice`,
      origination_urls: [`https://${domain}/api/twilio/trunk/voice`]
    };

    return trunkConfiguration;
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
    // Simulate number provisioning - in production this would purchase from Twilio
    const purchasedNumbers: string[] = [];
    const baseAreaCode = areaCode || '555';
    
    for (let i = 0; i < count; i++) {
      const randomDigits = Math.floor(Math.random() * 9000000) + 1000000;
      const phoneNumber = `+1${baseAreaCode}${randomDigits.toString().slice(0, 7)}`;
      purchasedNumbers.push(phoneNumber);
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
    const campaign = await dbStorage.getCampaign(assignment.campaignId);
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
      campaignId: assignment.campaignId
    };

    await dbStorage.createCall(callData);

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