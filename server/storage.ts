import { 
  type Campaign, 
  type InsertCampaign, 
  type Agent, 
  type InsertAgent, 
  type Call, 
  type InsertCall, 
  type User, 
  type InsertUser,
  type Buyer,
  type InsertBuyer,
  type CampaignBuyer,
  type InsertCampaignBuyer,
  type CallLog,
  type InsertCallLog,
  type NumberPool,
  type InsertNumberPool,
  type NumberPoolAssignment,
  type InsertNumberPoolAssignment,
  type CampaignPoolAssignment,
  type InsertCampaignPoolAssignment,
  type RtbTarget,
  type InsertRtbTarget,
  type RtbRouter,
  type InsertRtbRouter,
  type CampaignRtbTarget,
  type InsertCampaignRtbTarget,
  type RtbBidRequest,
  type InsertRtbBidRequest,
  type RtbBidResponse,
  type InsertRtbBidResponse,
  type Feedback,
  type InsertFeedback,
  type CallFlow,
  type InsertCallFlow,
  type VisitorSession,
  type InsertVisitorSession,
  type ConversionEvent,
  type InsertConversionEvent,
} from '@shared/schema';

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: any): Promise<User>;

  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;

  // Buyers
  getBuyers(): Promise<Buyer[]>;
  getBuyer(id: number): Promise<Buyer | undefined>;
  createBuyer(buyer: InsertBuyer): Promise<Buyer>;
  updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined>;
  deleteBuyer(id: number): Promise<boolean>;
  
  // Campaign-Buyer Relations
  getCampaignBuyers(campaignId: number): Promise<Buyer[]>;
  getBuyerCampaignAssignments(buyerId: number): Promise<Campaign[]>;
  addBuyerToCampaign(campaignId: number, buyerId: number, priority?: number): Promise<CampaignBuyer>;
  removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean>;
  
  // Call Routing & Ping/Post
  pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]>;
  postCallToBuyer(buyerId: number, callData: any): Promise<boolean>;

  // Agents (backward compatibility)
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;

  // Calls
  getCalls(): Promise<Call[]>;
  getCallsByCampaign(campaignId: number): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined>;
  
  // Enhanced Calls (for advanced reporting)
  getEnhancedCallsByUser(userId: number, filters?: any): Promise<any[]>;
  getEnhancedCallById(id: number): Promise<any | undefined>;
  
  // Call Logs
  getCallLogs(callId: number): Promise<CallLog[]>;
  createCallLog(log: InsertCallLog): Promise<CallLog>;

  // Stats
  getStats(): Promise<{
    activeCampaigns: number;
    totalCalls: number;
    successRate: string;
    activeAgents: number;
    activeBuyers: number;
    avgResponseTime: number;
  }>;

  // Integrations
  getUrlParameters(): Promise<any[]>;
  createUrlParameter(data: any): Promise<any>;
  getTrackingPixels(): Promise<any[]>;
  createTrackingPixel(data: any): Promise<any>;
  updateTrackingPixel(id: number, data: any): Promise<any>;
  deleteTrackingPixel(id: number): Promise<boolean>;
  getWebhookConfigs(): Promise<any[]>;
  createWebhookConfig(data: any): Promise<any>;
  getApiAuthentications(): Promise<any[]>;
  createApiAuthentication(data: any): Promise<any>;
  getPlatformIntegrations(): Promise<any[]>;
  createPlatformIntegration(data: any): Promise<any>;

  // Publishers
  getPublishers(): Promise<any[]>;
  getPublisher(id: number): Promise<any | undefined>;
  createPublisher(publisher: any): Promise<any>;
  updatePublisher(id: number, publisher: any): Promise<any | undefined>;
  deletePublisher(id: number): Promise<boolean>;
  
  // Publisher-Campaign Relations
  getPublisherCampaigns(publisherId: number): Promise<any[]>;
  getCampaignPublishers(campaignId: number): Promise<any[]>;
  addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string): Promise<any>;
  removePublisherFromCampaign(publisherId: number, campaignId: number): Promise<boolean>;

  // Phone Numbers
  getPhoneNumbers(userId?: number): Promise<any[]>;
  getPhoneNumber(id: number): Promise<any | undefined>;
  createPhoneNumber(phoneNumber: any): Promise<any>;
  updatePhoneNumber(id: number, phoneNumber: any): Promise<any | undefined>;
  deletePhoneNumber(id: number): Promise<boolean>;
  getPhoneNumberByNumber(phoneNumber: string): Promise<any | undefined>;
  assignPhoneNumberToCampaign(phoneNumberId: number, campaignId: number): Promise<any | undefined>;
  unassignPhoneNumberFromCampaign(phoneNumberId: number): Promise<any | undefined>;
  getUnassignedPhoneNumbers(userId?: number): Promise<any[]>;

  // Number Pools
  getNumberPools(userId?: number): Promise<NumberPool[]>;
  getNumberPool(id: number): Promise<NumberPool | undefined>;
  createNumberPool(pool: InsertNumberPool): Promise<NumberPool>;
  updateNumberPool(id: number, pool: Partial<InsertNumberPool>): Promise<NumberPool | undefined>;
  deleteNumberPool(id: number): Promise<boolean>;
  
  // Pool Assignments
  getPoolNumbers(poolId: number): Promise<any[]>;
  assignNumberToPool(poolId: number, phoneNumberId: number, priority?: number): Promise<NumberPoolAssignment>;
  removeNumberFromPool(poolId: number, phoneNumberId: number): Promise<boolean>;
  getNumberPoolAssignments(phoneNumberId: number): Promise<NumberPoolAssignment[]>;
  getPoolAssignedCount(poolId: number): Promise<number>;
  
  // Campaign Pool Assignments
  getCampaignPools(campaignId: number): Promise<NumberPool[]>;
  getCampaignsByPool(poolId: number): Promise<Campaign[]>;
  getCampaignByPoolId(poolId: number): Promise<Campaign | undefined>;
  assignPoolToCampaign(campaignId: number, poolId: number, priority?: number): Promise<CampaignPoolAssignment>;
  removePoolFromCampaign(campaignId: number, poolId: number): Promise<boolean>;
  
  // RTB Targets
  getRtbTargets(userId?: number): Promise<RtbTarget[]>;
  getRtbTarget(id: number, userId?: number): Promise<RtbTarget | undefined>;
  createRtbTarget(target: InsertRtbTarget): Promise<RtbTarget>;
  updateRtbTarget(id: number, target: Partial<InsertRtbTarget>): Promise<RtbTarget | undefined>;
  deleteRtbTarget(id: number): Promise<boolean>;
  
  // Campaign RTB Target assignments
  getCampaignRtbTargets(campaignId: string): Promise<any[]>;
  createCampaignRtbTarget(data: { campaignId: string; rtbTargetId: number }): Promise<any>;
  removeCampaignRtbTarget(campaignId: string, rtbTargetId: number): Promise<boolean>;
  updateCampaignRtbTargets(campaignId: string, targetIds: number[]): Promise<void>;
  
  // RTB Routers
  getRtbRouters(userId?: number): Promise<RtbRouter[]>;
  getRtbRouter(id: number, userId?: number): Promise<RtbRouter | undefined>;
  createRtbRouter(router: InsertRtbRouter): Promise<RtbRouter>;
  updateRtbRouter(id: number, router: Partial<InsertRtbRouter>): Promise<RtbRouter | undefined>;
  deleteRtbRouter(id: number): Promise<boolean>;
  
  // Campaign RTB Target Assignments (replaces router assignments)
  getCampaignRtbTargets(campaignId: number): Promise<CampaignRtbTarget[]>;
  createCampaignRtbTarget(assignment: InsertCampaignRtbTarget): Promise<CampaignRtbTarget>;
  deleteCampaignRtbTarget(campaignId: number, targetId: number): Promise<boolean>;
  
  // RTB Bid Requests
  getRtbBidRequests(campaignId?: number): Promise<RtbBidRequest[]>;
  getRtbBidRequest(requestId: string): Promise<RtbBidRequest | undefined>;
  createRtbBidRequest(request: InsertRtbBidRequest): Promise<RtbBidRequest>;
  updateRtbBidRequest(requestId: string, request: Partial<InsertRtbBidRequest>): Promise<RtbBidRequest | undefined>;
  
  // RTB Bid Responses
  getRtbBidResponses(requestId: string): Promise<RtbBidResponse[]>;
  createRtbBidResponse(response: InsertRtbBidResponse): Promise<RtbBidResponse>;
  updateRtbBidResponse(id: number, response: Partial<InsertRtbBidResponse>): Promise<RtbBidResponse | undefined>;
  
  // RTB Audit Data Cleanup
  clearRtbAuditData(): Promise<void>;

  // Feedback
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackHistory(userId: number): Promise<Feedback[]>;
  getAllFeedback(userId: number): Promise<Feedback[]>;

  // Call Flows
  getCallFlows(userId?: number): Promise<any[]>;
  getCallFlow(id: number): Promise<any | undefined>;
  createCallFlow(flow: any): Promise<any>;
  updateCallFlow(id: number, flow: any): Promise<any | undefined>;
  deleteCallFlow(id: number): Promise<boolean>;
  
  // MVP Tracking methods
  createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession>;
  getVisitorSession(sessionId: string): Promise<VisitorSession | undefined>;
  updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorSession>): Promise<VisitorSession | undefined>;
  createConversionEvent(event: InsertConversionEvent): Promise<ConversionEvent>;
  getConversionEvents(sessionId?: string, campaignId?: number): Promise<ConversionEvent[]>;
  getBasicTrackingStats(userId: number): Promise<{
    totalSessions: number;
    totalConversions: number;
    conversionRate: number;
    topSources: Array<{source: string; count: number}>;
    recentConversions: ConversionEvent[];
  }>;

  // Enhanced Reporting Methods
  getPhoneNumberTagsByUser(userId: number): Promise<any[]>;
  getPhoneNumberTagById(tagId: number): Promise<any | undefined>;
  createPhoneNumberTag(tag: any): Promise<any>;
  updatePhoneNumberTag(tagId: number, tag: any): Promise<any>;
  deletePhoneNumberTag(tagId: number): Promise<boolean>;
  
  getEnhancedCallsByUser(userId: number, filters?: any): Promise<any[]>;
  getEnhancedCallById(callId: number, userId: number): Promise<any | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private campaigns: Map<number, Campaign> = new Map();
  private buyers: Map<number, Buyer> = new Map();
  private campaignBuyers: Map<string, CampaignBuyer> = new Map();
  private agents: Map<number, Agent> = new Map();
  private calls: Map<number, Call> = new Map();
  private callLogs: Map<number, CallLog> = new Map();
  private publishers: Map<number, any> = new Map();
  private publisherCampaigns: Map<string, any> = new Map();
  private phoneNumberTags: Map<number, any> = new Map();
  private currentUserId: number = 1;
  private currentCampaignId: number = 1;
  private currentBuyerId: number = 1;
  private currentAgentId: number = 1;
  private currentCallId: number = 1;
  private currentCallLogId: number = 1;
  private currentPublisherId: number = 1;
  private currentTagId: number = 1;

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample campaigns
    this.campaigns.set(1, {
      id: 1,
      userId: "demo-user-1",
      name: "Home Insurance Lead Gen",
      description: "Insurance leads for homeowners",
      status: "active",
      phoneNumber: "+17177347577",
      routingType: "round_robin",
      maxConcurrentCalls: 5,
      callCap: 100,
      geoTargeting: ["US"],
      timeZoneRestriction: "EST",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.campaigns.set(2, {
      id: 2,
      userId: "demo-user-1",
      name: "Auto Insurance Campaign",
      description: "Auto insurance quote generation",
      status: "active",
      phoneNumber: null,
      routingType: "weighted",
      maxConcurrentCalls: 3,
      callCap: 50,
      geoTargeting: ["CA", "TX"],
      timeZoneRestriction: "PST",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Sample buyers - using correct schema fields
    this.buyers.set(1, {
      id: 1,
      userId: "demo-user-1",
      name: "LeadGen Pro",
      email: "contact@leadgenpro.com",
      phoneNumber: "+12125551234",
      status: "active",
      endpoint: "https://api.leadgenpro.com/webhook",
      priority: 1,
      dailyCap: 50,
      concurrencyLimit: 3,
      acceptanceRate: "75.50",
      avgResponseTime: 150,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.buyers.set(2, {
      id: 2,
      userId: "demo-user-1",
      name: "Insurance Direct",
      email: "leads@insurancedirect.com",
      phoneNumber: "+13235556789",
      status: "active",
      endpoint: "https://webhook.insurancedirect.com/leads",
      priority: 2,
      dailyCap: 100,
      concurrencyLimit: 5,
      acceptanceRate: "82.30",
      avgResponseTime: 200,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Sample agents
    this.agents.set(1, {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@company.com",
      status: "active",
      callsHandled: 45,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.agents.set(2, {
      id: 2,
      name: "Mike Chen",
      email: "mike@company.com",
      status: "active",
      callsHandled: 32,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.currentCampaignId = 3;
    this.currentBuyerId = 3;
    this.currentAgentId = 3;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === username) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { 
      id: insertUser.id,
      email: insertUser.email ?? null,
      password: insertUser.password ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async upsertUser(userData: any): Promise<User> {
    const existingUser = this.users.get(userData.id);
    if (existingUser) {
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date()
      };
      this.users.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      return this.createUser(userData);
    }
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    const campaigns: Campaign[] = [];
    for (const campaign of this.campaigns.values()) {
      campaigns.push(campaign);
    }
    return campaigns;
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    for (const campaign of this.campaigns.values()) {
      if (campaign.phoneNumber === phoneNumber) {
        return campaign;
      }
    }
    return undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const id = this.currentCampaignId++;
    const newCampaign: Campaign = {
      id,
      userId: campaign.userId,
      name: campaign.name,
      description: campaign.description ?? null,
      status: campaign.status ?? "active",
      phoneNumber: campaign.phoneNumber ?? null,
      routingType: campaign.routingType ?? "round_robin",
      maxConcurrentCalls: campaign.maxConcurrentCalls ?? 1,
      callCap: campaign.callCap ?? 100,
      geoTargeting: campaign.geoTargeting ?? null,
      timeZoneRestriction: campaign.timeZoneRestriction ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.campaigns.set(id, newCampaign);
    return newCampaign;
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const existing = this.campaigns.get(id);
    if (!existing) return undefined;
    
    const updated: Campaign = {
      ...existing,
      ...campaign,
      updatedAt: new Date()
    };
    this.campaigns.set(id, updated);
    return updated;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    // Delete all related records first to avoid foreign key constraint violations
    
    // Delete call logs for calls related to this campaign
    const callsToRemove: number[] = [];
    for (const [callId, call] of this.calls.entries()) {
      if (call.campaignId === id) {
        callsToRemove.push(callId);
      }
    }
    
    // Remove call logs for these calls
    for (const callId of callsToRemove) {
      const logsToRemove: number[] = [];
      for (const [logId, log] of this.callLogs.entries()) {
        if (log.callId === callId) {
          logsToRemove.push(logId);
        }
      }
      logsToRemove.forEach(logId => this.callLogs.delete(logId));
    }
    
    // Remove the calls
    callsToRemove.forEach(callId => this.calls.delete(callId));
    
    // Remove campaign-buyer relationships
    const campaignBuyersToRemove: string[] = [];
    for (const [key, cb] of this.campaignBuyers.entries()) {
      if (cb.campaignId === id) {
        campaignBuyersToRemove.push(key);
      }
    }
    campaignBuyersToRemove.forEach(key => this.campaignBuyers.delete(key));
    
    // Remove publisher-campaign relationships
    const publisherCampaignsToRemove: string[] = [];
    for (const [key, pc] of this.publisherCampaigns.entries()) {
      if (pc.campaignId === id) {
        publisherCampaignsToRemove.push(key);
      }
    }
    publisherCampaignsToRemove.forEach(key => this.publisherCampaigns.delete(key));
    
    // Finally delete the campaign
    return this.campaigns.delete(id);
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    const agents: Agent[] = [];
    for (const agent of this.agents.values()) {
      agents.push(agent);
    }
    return agents;
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const id = this.currentAgentId++;
    const newAgent: Agent = {
      id,
      name: agent.name,
      email: agent.email,
      status: agent.status ?? "active",
      callsHandled: agent.callsHandled ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.agents.set(id, newAgent);
    return newAgent;
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const existing = this.agents.get(id);
    if (!existing) return undefined;
    
    const updated: Agent = {
      ...existing,
      ...agent,
      updatedAt: new Date()
    };
    this.agents.set(id, updated);
    return updated;
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.agents.delete(id);
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    const calls: Call[] = [];
    for (const call of this.calls.values()) {
      calls.push(call);
    }
    return calls;
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    const calls: Call[] = [];
    for (const call of this.calls.values()) {
      if (call.campaignId === campaignId) {
        calls.push(call);
      }
    }
    return calls;
  }

  async createCall(call: InsertCall): Promise<Call> {
    const id = this.currentCallId++;
    const newCall: Call = {
      id,
      campaignId: call.campaignId ?? null,
      buyerId: call.buyerId ?? null,
      callSid: call.callSid,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
      duration: call.duration ?? 0,
      status: call.status,
      callQuality: call.callQuality ?? null,
      recordingUrl: call.recordingUrl ?? null,
      recordingSid: call.recordingSid ?? null,
      recordingStatus: call.recordingStatus ?? null,
      recordingDuration: call.recordingDuration ?? null,
      transcription: call.transcription ?? null,
      transcriptionStatus: call.transcriptionStatus ?? null,
      cost: call.cost ?? "0.0000",
      revenue: call.revenue ?? "0.0000",
      geoLocation: call.geoLocation ?? null,
      userAgent: call.userAgent ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.calls.set(id, newCall);
    return newCall;
  }

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined> {
    const existing = this.calls.get(id);
    if (!existing) return undefined;
    
    const updated: Call = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.calls.set(id, updated);
    return updated;
  }

  // Buyers
  async getBuyers(): Promise<Buyer[]> {
    const buyers: Buyer[] = [];
    for (const buyer of this.buyers.values()) {
      buyers.push(buyer);
    }
    return buyers;
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    return this.buyers.get(id);
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    const id = this.currentBuyerId++;
    const newBuyer: Buyer = {
      id,
      userId: buyer.userId,
      name: buyer.name,
      email: buyer.email,
      phoneNumber: buyer.phoneNumber,
      status: buyer.status ?? "active",
      endpoint: buyer.endpoint ?? null,
      priority: buyer.priority ?? 1,
      dailyCap: buyer.dailyCap ?? 50,
      concurrencyLimit: buyer.concurrencyLimit ?? 3,
      acceptanceRate: buyer.acceptanceRate ?? "0.00",
      avgResponseTime: buyer.avgResponseTime ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.buyers.set(id, newBuyer);
    return newBuyer;
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined> {
    const existing = this.buyers.get(id);
    if (!existing) return undefined;
    
    const updated: Buyer = {
      ...existing,
      ...buyer,
      updatedAt: new Date()
    };
    this.buyers.set(id, updated);
    return updated;
  }

  async deleteBuyer(id: number): Promise<boolean> {
    // First check if there are any calls referencing this buyer
    const callsToUpdate: Call[] = [];
    for (const call of this.calls.values()) {
      if (call.buyerId === id) {
        callsToUpdate.push(call);
      }
    }
    
    // Set buyer_id to null for existing calls (soft delete)
    for (const call of callsToUpdate) {
      const updatedCall = { ...call, buyerId: null };
      this.calls.set(call.id, updatedCall);
    }
    
    // Delete campaign-buyer relationships
    const keysToDelete = [];
    for (const [key, relationship] of this.campaignBuyers.entries()) {
      if (relationship.buyerId === id) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.campaignBuyers.delete(key));
    
    // Delete the buyer
    return this.buyers.delete(id);
  }

  // Campaign-Buyer Relations
  async getCampaignBuyers(campaignId: number): Promise<Buyer[]> {
    const campaignBuyerEntries: CampaignBuyer[] = [];
    for (const cb of this.campaignBuyers.values()) {
      if (cb.campaignId === campaignId) {
        campaignBuyerEntries.push(cb);
      }
    }
    
    const buyers: Buyer[] = [];
    for (const cb of campaignBuyerEntries) {
      const buyer = this.buyers.get(cb.buyerId);
      if (buyer) {
        buyers.push(buyer);
      }
    }
    return buyers;
  }

  async getBuyerCampaignAssignments(buyerId: number): Promise<Campaign[]> {
    const campaignBuyerEntries: CampaignBuyer[] = [];
    for (const cb of this.campaignBuyers.values()) {
      if (cb.buyerId === buyerId) {
        campaignBuyerEntries.push(cb);
      }
    }
    
    const campaigns: Campaign[] = [];
    for (const cb of campaignBuyerEntries) {
      const campaign = this.campaigns.get(cb.campaignId);
      if (campaign) {
        campaigns.push(campaign);
      }
    }
    return campaigns;
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    const key = `${campaignId}-${buyerId}`;
    const campaignBuyer: CampaignBuyer = {
      id: this.campaignBuyers.size + 1,
      campaignId,
      buyerId,
      isActive: true,
      priority,
      createdAt: new Date()
    };
    this.campaignBuyers.set(key, campaignBuyer);
    return campaignBuyer;
  }

  async removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean> {
    const key = `${campaignId}-${buyerId}`;
    return this.campaignBuyers.delete(key);
  }

  // Call Routing & Ping/Post
  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    const campaignBuyers = await this.getCampaignBuyers(campaignId);
    const activeBuyers: Buyer[] = [];
    for (const buyer of campaignBuyers) {
      if (buyer.status === 'active') {
        activeBuyers.push(buyer);
      }
    }
    return activeBuyers;
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    const buyer = await this.getBuyer(buyerId);
    return buyer !== undefined && buyer.status === 'active';
  }

  // Call Logs
  async getCallLogs(callId: number): Promise<CallLog[]> {
    const logs: CallLog[] = [];
    for (const log of this.callLogs.values()) {
      if (log.callId === callId) {
        logs.push(log);
      }
    }
    return logs;
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const id = this.currentCallLogId++;
    const newLog: CallLog = {
      id,
      callId: log.callId,
      buyerId: log.buyerId ?? null,
      action: log.action,
      response: log.response ?? null,
      responseTime: log.responseTime ?? null,
      timestamp: new Date()
    };
    this.callLogs.set(id, newLog);
    return newLog;
  }

  // Stats
  async getStats(): Promise<{
    activeCampaigns: number;
    totalCalls: number;
    successRate: string;
    activeAgents: number;
    activeBuyers: number;
    avgResponseTime: number;
  }> {
    let activeCampaigns = 0;
    for (const campaign of this.campaigns.values()) {
      if (campaign.status === 'active') {
        activeCampaigns++;
      }
    }

    const totalCalls = this.calls.size;
    
    let successfulCalls = 0;
    for (const call of this.calls.values()) {
      if (call.status === 'completed') {
        successfulCalls++;
      }
    }
    
    const successRate = totalCalls > 0 ? `${Math.round((successfulCalls / totalCalls) * 100)}%` : "0%";
    
    let activeAgents = 0;
    for (const agent of this.agents.values()) {
      if (agent.status === 'active') {
        activeAgents++;
      }
    }
    
    let activeBuyers = 0;
    for (const buyer of this.buyers.values()) {
      if (buyer.status === 'active') {
        activeBuyers++;
      }
    }
    
    let totalResponseTime = 0;
    for (const buyer of this.buyers.values()) {
      totalResponseTime += buyer.avgResponseTime;
    }
    const avgResponseTime = this.buyers.size > 0 ? totalResponseTime / this.buyers.size : 0;

    return {
      activeCampaigns,
      totalCalls,
      successRate,
      activeAgents,
      activeBuyers,
      avgResponseTime
    };
  }

  // Integration methods - returning empty arrays for in-memory storage
  async getUrlParameters(): Promise<any[]> {
    return [];
  }

  async createUrlParameter(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }

  async getTrackingPixels(): Promise<any[]> {
    return [];
  }

  async createTrackingPixel(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }

  async updateTrackingPixel(id: number, data: any): Promise<any> {
    return { id, ...data };
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    return true;
  }

  async getWebhookConfigs(): Promise<any[]> {
    return [];
  }

  async createWebhookConfig(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }

  async getApiAuthentications(): Promise<any[]> {
    return [];
  }

  async createApiAuthentication(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }

  async getPlatformIntegrations(): Promise<any[]> {
    return [];
  }

  async createPlatformIntegration(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }

  // Publisher methods - full implementation for in-memory storage
  async getPublishers(): Promise<any[]> {
    return Array.from(this.publishers.values());
  }

  async getPublisher(id: number): Promise<any | undefined> {
    return this.publishers.get(id);
  }

  async createPublisher(publisher: any): Promise<any> {
    const id = this.currentPublisherId++;
    const newPublisher = { 
      id, 
      ...publisher,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.publishers.set(id, newPublisher);
    return newPublisher;
  }

  async updatePublisher(id: number, publisher: any): Promise<any | undefined> {
    const existing = this.publishers.get(id);
    if (!existing) return undefined;
    
    const updated = { 
      ...existing, 
      ...publisher, 
      id,
      updatedAt: new Date()
    };
    this.publishers.set(id, updated);
    return updated;
  }

  async deletePublisher(id: number): Promise<boolean> {
    // First delete all publisher-campaign relationships
    const keysToDelete = [];
    for (const [key, relationship] of this.publisherCampaigns.entries()) {
      if (relationship.publisherId === id) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.publisherCampaigns.delete(key));
    
    // Then delete the publisher
    return this.publishers.delete(id);
  }

  async getPublisherCampaigns(publisherId: number): Promise<any[]> {
    const relationships = Array.from(this.publisherCampaigns.values())
      .filter(rel => rel.publisherId === publisherId);
    
    const campaigns = [];
    for (const rel of relationships) {
      const campaign = this.campaigns.get(rel.campaignId);
      if (campaign) {
        campaigns.push(campaign);
      }
    }
    return campaigns;
  }

  async getCampaignPublishers(campaignId: number): Promise<any[]> {
    const relationships = Array.from(this.publisherCampaigns.values())
      .filter(rel => rel.campaignId === campaignId);
    
    const publishers = [];
    for (const rel of relationships) {
      const publisher = this.publishers.get(rel.publisherId);
      if (publisher) {
        publishers.push({
          ...publisher,
          customPayout: rel.customPayout,
          isActive: rel.isActive,
        });
      }
    }
    return publishers;
  }

  async addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string): Promise<any> {
    const key = `${publisherId}-${campaignId}`;
    const relationship = {
      id: Date.now(),
      publisherId,
      campaignId,
      customPayout,
      isActive: true,
      createdAt: new Date()
    };
    this.publisherCampaigns.set(key, relationship);
    return relationship;
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: number): Promise<boolean> {
    const key = `${publisherId}-${campaignId}`;
    return this.publisherCampaigns.delete(key);
  }

  // Feedback methods
  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const newFeedback: Feedback = {
      id: Date.now(),
      userId: feedback.userId,
      question: feedback.question,
      response: feedback.response,
      resolved: feedback.resolved ?? false,
      timestamp: new Date()
    };
    return newFeedback;
  }

  async getFeedbackHistory(userId: number): Promise<Feedback[]> {
    // For memory storage, return empty array as we don't persist feedback
    return [];
  }

  async getAllFeedback(userId: number): Promise<Feedback[]> {
    // For memory storage, return empty array as we don't persist feedback
    return [];
  }

  // Phone Numbers methods (placeholder for memory storage)
  async getPhoneNumbers(userId?: number): Promise<any[]> {
    return [];
  }

  // Number Pools methods (placeholder for memory storage)
  async getNumberPools(userId?: number): Promise<any[]> {
    return [];
  }

  async getNumberPool(id: number): Promise<any | undefined> {
    return undefined;
  }

  async createNumberPool(pool: any): Promise<any> {
    return pool;
  }

  async updateNumberPool(id: number, pool: any): Promise<any | undefined> {
    return undefined;
  }

  async deleteNumberPool(id: number): Promise<boolean> {
    return false;
  }

  async getPoolNumbers(poolId: number): Promise<any[]> {
    return [];
  }

  async assignNumberToPool(poolId: number, phoneNumberId: number, priority?: number): Promise<any> {
    return {};
  }

  async removeNumberFromPool(poolId: number, phoneNumberId: number): Promise<boolean> {
    return false;
  }

  async getNumberPoolAssignments(phoneNumberId: number): Promise<any[]> {
    return [];
  }

  async getPoolAssignedCount(poolId: number): Promise<number> {
    return 0;
  }

  async getCampaignPools(campaignId: number): Promise<any[]> {
    return [];
  }

  async getCampaignsByPool(poolId: number): Promise<Campaign[]> {
    return [];
  }

  async getCampaignByPoolId(poolId: number): Promise<Campaign | undefined> {
    return undefined;
  }

  async assignPoolToCampaign(campaignId: number, poolId: number, priority?: number): Promise<any> {
    return {};
  }

  async removePoolFromCampaign(campaignId: number, poolId: number): Promise<boolean> {
    return false;
  }

  async getPhoneNumber(id: number): Promise<any | undefined> {
    return undefined;
  }

  async createPhoneNumber(phoneNumber: any): Promise<any> {
    return phoneNumber;
  }

  async updatePhoneNumber(id: number, phoneNumber: any): Promise<any | undefined> {
    return undefined;
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    return false;
  }

  async getPhoneNumberByNumber(phoneNumber: string): Promise<any | undefined> {
    return undefined;
  }

  async assignPhoneNumberToCampaign(phoneNumberId: number, campaignId: number): Promise<any | undefined> {
    return undefined;
  }

  async unassignPhoneNumberFromCampaign(phoneNumberId: number): Promise<any | undefined> {
    return undefined;
  }

  async getUnassignedPhoneNumbers(userId?: number): Promise<any[]> {
    return [];
  }

  // RTB methods - In-memory storage implementation
  private rtbTargets: any[] = [];
  private rtbRouters: any[] = [];
  private rtbBidRequests: any[] = [];
  private rtbBidResponses: any[] = [];

  async getRtbTargets(userId?: number): Promise<any[]> {
    if (userId) {
      return this.rtbTargets.filter(target => target.userId === userId);
    }
    return this.rtbTargets;
  }

  async getRtbTarget(id: number, userId?: number): Promise<any | undefined> {
    const target = this.rtbTargets.find(t => t.id === id);
    if (target && userId && target.userId !== userId) {
      return undefined;
    }
    return target;
  }

  async createRtbTarget(target: any): Promise<any> {
    const newTarget = {
      id: Date.now(),
      ...target,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.rtbTargets.push(newTarget);
    return newTarget;
  }

  async updateRtbTarget(id: number, target: any): Promise<any | undefined> {
    const index = this.rtbTargets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.rtbTargets[index] = {
        ...this.rtbTargets[index],
        ...target,
        updatedAt: new Date()
      };
      return this.rtbTargets[index];
    }
    return undefined;
  }

  async deleteRtbTarget(id: number): Promise<boolean> {
    const index = this.rtbTargets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.rtbTargets.splice(index, 1);
      return true;
    }
    return false;
  }

  async getRtbBidRequests(campaignId?: number): Promise<any[]> {
    if (campaignId) {
      return this.rtbBidRequests.filter(req => req.campaignId === campaignId);
    }
    return this.rtbBidRequests;
  }

  async getRtbBidRequest(requestId: string): Promise<any | undefined> {
    return this.rtbBidRequests.find(req => req.requestId === requestId);
  }

  async getRtbBidResponses(requestId: string): Promise<any[]> {
    return this.rtbBidResponses.filter(res => res.requestId === requestId);
  }

  async getRtbRouters(userId?: number): Promise<any[]> {
    if (userId) {
      return this.rtbRouters.filter(router => router.userId === userId);
    }
    return this.rtbRouters;
  }

  async getRtbRouter(id: number): Promise<any | undefined> {
    return this.rtbRouters.find(router => router.id === id);
  }

  async getRtbRouterAssignments(routerId: number): Promise<any[]> {
    return [];
  }

  // Campaign RTB Target assignments - In-memory storage
  private campaignRtbTargets: any[] = [];

  async getCampaignRtbTargets(campaignId: string): Promise<any[]> {
    return this.campaignRtbTargets
      .filter(assignment => assignment.campaignId === campaignId)
      .map(assignment => {
        const target = this.rtbTargets.find(t => t.id === assignment.rtbTargetId);
        return target ? { ...target, assignmentId: assignment.id } : null;
      })
      .filter(Boolean);
  }

  async createCampaignRtbTarget(data: { campaignId: string; rtbTargetId: number }): Promise<any> {
    const assignment = {
      id: Date.now(),
      campaignId: data.campaignId,
      rtbTargetId: data.rtbTargetId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.campaignRtbTargets.push(assignment);
    return assignment;
  }

  async removeCampaignRtbTarget(campaignId: string, rtbTargetId: number): Promise<boolean> {
    const index = this.campaignRtbTargets.findIndex(
      assignment => assignment.campaignId === campaignId && assignment.rtbTargetId === rtbTargetId
    );
    if (index !== -1) {
      this.campaignRtbTargets.splice(index, 1);
      return true;
    }
    return false;
  }

  async updateCampaignRtbTargets(campaignId: string, targetIds: number[]): Promise<void> {
    // Remove existing assignments
    this.campaignRtbTargets = this.campaignRtbTargets.filter(
      assignment => assignment.campaignId !== campaignId
    );
    
    // Add new assignments
    targetIds.forEach(targetId => {
      this.campaignRtbTargets.push({
        id: Date.now() + Math.random(),
        campaignId,
        rtbTargetId: targetId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }

  // Call Flow methods - In-memory storage implementation
  private callFlows: any[] = [];

  async getCallFlows(userId?: number): Promise<any[]> {
    // Filter by userId if provided
    if (userId) {
      return this.callFlows.filter(flow => flow.userId === userId);
    }
    return this.callFlows;
  }

  async getCallFlow(id: number): Promise<any | undefined> {
    return this.callFlows.find(flow => flow.id === id);
  }

  async createCallFlow(flow: any): Promise<any> {
    const newFlow = {
      id: Date.now(),
      ...flow,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.callFlows.push(newFlow);
    return newFlow;
  }

  async updateCallFlow(id: number, updates: any): Promise<any | undefined> {
    const index = this.callFlows.findIndex(flow => flow.id === id);
    if (index !== -1) {
      this.callFlows[index] = {
        ...this.callFlows[index],
        ...updates,
        updatedAt: new Date()
      };
      return this.callFlows[index];
    }
    return undefined;
  }

  async deleteCallFlow(id: number): Promise<boolean> {
    const index = this.callFlows.findIndex(flow => flow.id === id);
    if (index !== -1) {
      this.callFlows.splice(index, 1);
      return true;
    }
    return false;
  }

  // MVP Tracking methods - In-memory storage implementation
  private visitorSessions: VisitorSession[] = [];
  private conversionEvents: ConversionEvent[] = [];

  async createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession> {
    const newSession: VisitorSession = {
      id: Date.now(),
      ...session,
      firstVisit: new Date(),
      lastActivity: new Date(),
      isActive: true,
      hasConverted: false
    };
    this.visitorSessions.push(newSession);
    return newSession;
  }

  async getVisitorSession(sessionId: string): Promise<VisitorSession | undefined> {
    return this.visitorSessions.find(session => session.sessionId === sessionId);
  }

  async updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorSession>): Promise<VisitorSession | undefined> {
    const index = this.visitorSessions.findIndex(session => session.sessionId === sessionId);
    if (index !== -1) {
      this.visitorSessions[index] = {
        ...this.visitorSessions[index],
        ...updates,
        lastActivity: new Date()
      };
      return this.visitorSessions[index];
    }
    return undefined;
  }

  async createConversionEvent(event: InsertConversionEvent): Promise<ConversionEvent> {
    const newEvent: ConversionEvent = {
      id: Date.now(),
      ...event,
      createdAt: new Date(),
      pixelsFired: false,
      pixelData: null
    };
    this.conversionEvents.push(newEvent);
    return newEvent;
  }

  async getConversionEvents(sessionId?: string, campaignId?: number): Promise<ConversionEvent[]> {
    let events = this.conversionEvents;
    
    if (sessionId) {
      events = events.filter(event => event.sessionId === sessionId);
    }
    
    if (campaignId) {
      events = events.filter(event => event.campaignId === campaignId);
    }
    
    return events;
  }

  async getBasicTrackingStats(userId: number): Promise<{
    totalSessions: number;
    totalConversions: number;
    conversionRate: number;
    topSources: Array<{source: string; count: number}>;
    recentConversions: ConversionEvent[];
  }> {
    const userSessions = this.visitorSessions.filter(session => session.userId === userId);
    const userConversions = this.conversionEvents.filter(event => {
      const session = this.visitorSessions.find(s => s.sessionId === event.sessionId);
      return session?.userId === userId;
    });

    const sourceCounts: Record<string, number> = {};
    userSessions.forEach(session => {
      const source = session.source || 'direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentConversions = userConversions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalSessions: userSessions.length,
      totalConversions: userConversions.length,
      conversionRate: userSessions.length > 0 ? (userConversions.length / userSessions.length) * 100 : 0,
      topSources,
      recentConversions
    };
  }

  // Enhanced Reporting Methods
  async getPhoneNumberTagsByUser(userId: number): Promise<any[]> {
    const tags: any[] = [];
    for (const tag of this.phoneNumberTags.values()) {
      if (tag.userId === userId) {
        tags.push(tag);
      }
    }
    return tags;
  }

  async getPhoneNumberTagById(tagId: number): Promise<any | undefined> {
    return this.phoneNumberTags.get(tagId);
  }

  async createPhoneNumberTag(tag: any): Promise<any> {
    const id = this.currentTagId++;
    const newTag = {
      id,
      ...tag,
      callCount: 0,
      totalRevenue: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.phoneNumberTags.set(id, newTag);
    return newTag;
  }

  async updatePhoneNumberTag(tagId: number, tag: any): Promise<any> {
    const existing = this.phoneNumberTags.get(tagId);
    if (!existing) return undefined;
    
    const updated = {
      ...existing,
      ...tag,
      updatedAt: new Date()
    };
    this.phoneNumberTags.set(tagId, updated);
    return updated;
  }

  async deletePhoneNumberTag(tagId: number): Promise<boolean> {
    return this.phoneNumberTags.delete(tagId);
  }

  async getEnhancedCallsByUser(userId: number, filters?: any): Promise<any[]> {
    const enhancedCalls: any[] = [];
    
    // Get user campaigns for filtering
    const userCampaigns = await this.getCampaigns();
    const userCampaignIds = userCampaigns
      .filter(c => c.userId === userId.toString())
      .map(c => c.id);

    for (const call of this.calls.values()) {
      // Filter by user campaigns
      if (call.campaignId && !userCampaignIds.includes(call.campaignId)) {
        continue;
      }

      // Apply date filters
      if (filters?.startDate && call.createdAt < filters.startDate) continue;
      if (filters?.endDate && call.createdAt > filters.endDate) continue;
      
      // Apply status filter
      if (filters?.status && call.status !== filters.status) continue;
      
      // Apply campaign filter
      if (filters?.campaignId && call.campaignId !== parseInt(filters.campaignId)) continue;
      
      // Apply minimum duration filter
      if (filters?.minDuration && call.duration < filters.minDuration) continue;

      // Get related entities
      const campaign = await this.getCampaign(call.campaignId || 0);
      const buyer = call.buyerId ? await this.getBuyer(call.buyerId) : undefined;

      // Create enhanced call object with financial tracking
      const enhancedCall = {
        ...call,
        campaign,
        buyer,
        // Enhanced financial data
        revenue: parseFloat(call.revenue || '0'),
        cost: parseFloat(call.cost || '0'),
        profit: parseFloat(call.revenue || '0') - parseFloat(call.cost || '0'),
        margin: parseFloat(call.revenue || '0') > 0 
          ? ((parseFloat(call.revenue || '0') - parseFloat(call.cost || '0')) / parseFloat(call.revenue || '0')) * 100 
          : 0,
        
        // Enhanced tracking data
        tags: call.tags || [],
        utmSource: call.utmSource || undefined,
        utmMedium: call.utmMedium || undefined,
        utmCampaign: call.utmCampaign || undefined,
        city: call.city || undefined,
        state: call.state || undefined,
        
        // Call quality data
        callQuality: call.callQuality || undefined,
        disposition: call.disposition || undefined,
        talkTime: call.talkTime || call.duration,
        ringTime: call.ringTime || 0,
        connectionTime: call.connectionTime || 0,
        audioQuality: call.audioQuality || undefined,
        
        // Technical details
        ipAddress: call.ipAddress || undefined,
        userAgent: call.userAgent || undefined,
        referrer: call.referrer || undefined,
        deviceType: call.deviceType || undefined,
        transcription: call.transcription || undefined,
      };

      enhancedCalls.push(enhancedCall);
    }

    // Sort by creation date (newest first)
    enhancedCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return enhancedCalls;
  }

  async getEnhancedCallById(callId: number, userId: number): Promise<any | undefined> {
    const calls = await this.getEnhancedCallsByUser(userId);
    return calls.find(call => call.id === callId);
  }
}

// Export SupabaseStorage as the main storage implementation  
export { storage } from './supabase-storage';