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
  type Target,
  type InsertTarget,
  type CampaignBuyer,
  type InsertCampaignBuyer,
  type CampaignTarget,
  type InsertCampaignTarget,
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
  type RedtrackConfig,
  type InsertRedtrackConfig,
  type URLParameter,
  type InsertURLParameter,
  type PredictiveRoutingConfig,
  type InsertPredictiveRoutingConfig,
} from '@shared/schema';

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailAsync(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: any): Promise<User>;

  // Campaigns
  getCampaigns(userId?: number): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  // Buyers (top-level companies)
  getBuyers(): Promise<Buyer[]>;
  getBuyer(id: number): Promise<Buyer | undefined>;
  createBuyer(buyer: InsertBuyer): Promise<Buyer>;
  updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined>;
  deleteBuyer(id: number): Promise<boolean>;
  
  // Targets (individual endpoints under buyers)
  getTargets(): Promise<Target[]>;
  getTarget(id: number): Promise<Target | undefined>;
  getTargetsByBuyer(buyerId: number): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target | undefined>;
  deleteTarget(id: number): Promise<boolean>;
  
  // Campaign-Buyer Relations (legacy, transitioning)
  getCampaignBuyers(campaignId: string | number): Promise<Buyer[]>;
  getBuyerCampaignAssignments(buyerId: number): Promise<Campaign[]>;
  addBuyerToCampaign(campaignId: string | number, buyerId: number, priority?: number): Promise<CampaignBuyer>;
  removeBuyerFromCampaign(campaignId: string | number, buyerId: number): Promise<boolean>;
  
  // Campaign-Target Relations (new architecture)
  getCampaignTargets(campaignId: string | number): Promise<Target[]>;
  getTargetCampaignAssignments(targetId: number): Promise<Campaign[]>;
  addTargetToCampaign(campaignId: string | number, targetId: number, priority?: number): Promise<CampaignTarget>;
  removeTargetFromCampaign(campaignId: string | number, targetId: number): Promise<boolean>;
  

  
  // Call Routing & Ping/Post
  pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]>;
  postCallToBuyer(buyerId: number, callData: any): Promise<boolean>;

  // Agents (backward compatibility)
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  
  // Agent Statistics
  getAgentActiveCalls(agentId: number): Promise<any[]>;
  getAgentStats(agentId: number): Promise<any>;
  updateAgentStatus(agentId: number, status: string): Promise<any>;
  assignAgentToCampaign(agentId: number, campaignId: string): Promise<any>;

  // Calls
  getCalls(): Promise<Call[]>;
  getCallsByCampaign(campaignId: string | number): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined>;
  
  // Enhanced Calls (for advanced reporting)
  getEnhancedCallsByUser(userId: number, filters?: any): Promise<any[]>;
  getEnhancedCallById(id: number): Promise<any | undefined>;
  
  // Call Logs
  getCallLogs(callId: number): Promise<CallLog[]>;
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  
  // Call Events
  getCallEvents(callId: number): Promise<any[]>;
  addCallEvent(callId: number, event: any): Promise<any>;

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
  
  // Campaign-specific Tracking Pixels
  getCampaignTrackingPixels(campaignId: string): Promise<any[]>;
  createCampaignTrackingPixel(data: any): Promise<any>;
  updateCampaignTrackingPixel(campaignId: string, pixelId: number, data: any): Promise<any>;
  deleteCampaignTrackingPixel(campaignId: string, pixelId: number): Promise<boolean>;
  
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
  addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string, userId?: number): Promise<any>;
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
  getVisitorSessions(userId: number): Promise<VisitorSession[]>;
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
  
  // RedTrack Configuration Methods
  createRedtrackConfig(config: InsertRedtrackConfig): Promise<RedtrackConfig>;
  getRedtrackConfigs(userId: number): Promise<RedtrackConfig[]>;
  updateRedtrackConfig(id: number, config: Partial<InsertRedtrackConfig>): Promise<RedtrackConfig | undefined>;
  deleteRedtrackConfig(id: number): Promise<boolean>;
  updatePhoneNumberTag(tagId: number, tag: any): Promise<any>;
  deletePhoneNumberTag(tagId: number): Promise<boolean>;
  
  getEnhancedCallsByUser(userId: number, filters?: any): Promise<any[]>;
  getEnhancedCallById(callId: number, userId: number): Promise<any | undefined>;

  // RedTrack Integration
  createRedtrackConfig(config: InsertRedtrackConfig): Promise<RedtrackConfig>;
  getRedtrackConfig(id: number): Promise<RedtrackConfig | undefined>;
  getRedtrackConfigs(userId: number): Promise<RedtrackConfig[]>;
  updateRedtrackConfig(id: number, updates: Partial<InsertRedtrackConfig>): Promise<RedtrackConfig | undefined>;
  deleteRedtrackConfig(id: number): Promise<boolean>;

  // URL Parameters
  getUrlParameters(userId: number): Promise<URLParameter[]>;
  getUrlParameter(id: number): Promise<URLParameter | undefined>;
  createUrlParameter(parameter: InsertURLParameter): Promise<URLParameter>;
  updateUrlParameter(id: number, parameter: Partial<InsertURLParameter>): Promise<URLParameter | undefined>;
  deleteUrlParameter(id: number): Promise<boolean>;

  // Predictive Routing Configurations
  getPredictiveRoutingConfigs(userId?: number): Promise<PredictiveRoutingConfig[]>;
  getPredictiveRoutingConfig(id: number): Promise<PredictiveRoutingConfig | undefined>;
  createPredictiveRoutingConfig(config: InsertPredictiveRoutingConfig): Promise<PredictiveRoutingConfig>;
  updatePredictiveRoutingConfig(id: number, config: Partial<InsertPredictiveRoutingConfig>): Promise<PredictiveRoutingConfig | undefined>;
  deletePredictiveRoutingConfig(id: number): Promise<boolean>;

  // Integration Tracking Pixels
  getTrackingPixels(): Promise<any[]>;
  createTrackingPixel(data: any): Promise<any>;
  updateTrackingPixel(id: number, data: any): Promise<any>;
  deleteTrackingPixel(id: number): Promise<boolean>;

  // Campaign-specific Tracking Pixels
  getCampaignTrackingPixels(campaignId: string): Promise<any[]>;
  createCampaignTrackingPixel(data: any): Promise<any>;
  updateCampaignTrackingPixel(campaignId: string, pixelId: number, data: any): Promise<any | undefined>;
  deleteCampaignTrackingPixel(campaignId: string, pixelId: number): Promise<boolean>;

  // Custom Reports
  getCustomReports(userId: number): Promise<any[]>;
  createCustomReport(report: any): Promise<any>;
  updateCustomReport(id: number, report: any, userId: number): Promise<any>;
  deleteCustomReport(id: number, userId: number): Promise<boolean>;
  copyCustomReport(id: number, userId: number): Promise<any>;

  // Bulk Actions
  bulkTranscribeCalls(callIds: number[], userId: number): Promise<any>;
  bulkAnnotateCalls(callIds: number[], data: any, userId: number): Promise<any>;
  bulkBlockCallerIds(callIds: number[], data: any, userId: number): Promise<any>;
  bulkRequestAdjustments(callIds: number[], data: any, userId: number): Promise<any>;

  // Missing agent methods
  getAgentActiveCalls(userId: number, agentId: number): Promise<any[]>;
  addCallEvent(event: any): Promise<any>;
  getAgentStats(userId: number, agentId: number): Promise<any>;
  updateAgentStatus(userId: number, agentId: number, status: string): Promise<any>;
  getUserByEmailAsync(email: string): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private campaigns: Map<string, Campaign> = new Map();
  private buyers: Map<number, Buyer> = new Map();
  private targets: Map<number, Target> = new Map();
  private campaignBuyers: Map<string, CampaignBuyer> = new Map();
  private agents: Map<number, Agent> = new Map();
  private calls: Map<number, Call> = new Map();
  private callLogs: Map<number, CallLog> = new Map();
  private callEvents: any[] = [];
  private publishers: Map<number, any> = new Map();
  private publisherCampaigns: Map<string, any> = new Map();
  private phoneNumberTags: Map<number, any> = new Map();
  private redtrackConfigs: Map<number, any> = new Map();
  private urlParameters: Map<number, URLParameter> = new Map();
  private trackingPixels: Map<number, any> = new Map();
  private campaignTrackingPixels: Map<string, any[]> = new Map();
  private currentUserId: number = 1;
  private currentCampaignId: number = 1;
  private currentBuyerId: number = 1;
  private currentTargetId: number = 1;
  private currentPixelId: number = 1;
  private currentAgentId: number = 1;
  private currentCallId: number = 1;
  private currentCallLogId: number = 1;
  private currentPublisherId: number = 1;
  private currentTagId: number = 1;
  private currentRedtrackConfigId: number = 1;
  private currentUrlParameterId: number = 1;
  private phoneNumbers: Map<number, any> = new Map();
  private numberPools: Map<number, any> = new Map();
  private poolAssignments: Map<string, any> = new Map();
  private currentPhoneNumberId: number = 1;
  private currentPoolId: number = 1;

  constructor() {
    // Initialize empty storage for production use
    // Sample data only in development mode if needed
    this.initializeEmptyState();
  }

  private initializeEmptyState() {
    // Initialize clean empty state for production use
    // All data will come from database or user-created content
    console.log('MemStorage initialized with empty state - no sample data');
    
    // Start IDs from 1 for clean sequential numbering
    this.currentCampaignId = 1;
    this.currentBuyerId = 1;
    this.currentAgentId = 1;
    this.currentCallId = 1;
    this.currentCallLogId = 1;
    this.currentPublisherId = 1;
    this.currentTagId = 1;
    this.currentRedtrackConfigId = 1;
    this.currentUrlParameterId = 1;
    this.currentPhoneNumberId = 1;
    this.currentPoolId = 1;
    this.currentPixelId = 1;
    this.currentTargetId = 1;
    this.currentUserId = 1;
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
  async getCampaigns(userId?: number): Promise<Campaign[]> {
    const campaigns: Campaign[] = [];
    for (const campaign of this.campaigns.values()) {
      if (!userId || campaign.userId === userId) {
        campaigns.push(campaign);
      }
    }
    return campaigns.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    // For memory storage, campaigns are stored with string keys
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
    // Generate UUID-like string for campaign ID
    const id = 'cam_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
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

  async updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
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

  async deleteCampaign(id: string): Promise<boolean> {
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
      userId: agent.userId,
      phoneNumber: agent.phoneNumber,
      priority: agent.priority ?? 1,
      maxConcurrentCalls: agent.maxConcurrentCalls ?? 1,
      skillLevel: agent.skillLevel,
      department: agent.department,
      averageCallDuration: agent.averageCallDuration ?? 0,
      successRate: agent.successRate ?? 0,
      totalCallsHandled: agent.totalCallsHandled ?? 0,
      totalRevenue: agent.totalRevenue ?? 0,
      lastActivity: agent.lastActivity ?? new Date(),
      isOnline: agent.isOnline ?? false,
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

  async getCallsByCampaign(campaignId: string | number): Promise<Call[]> {
    const calls: Call[] = [];
    const campaignIdStr = typeof campaignId === 'string' ? campaignId : campaignId.toString();
    for (const call of this.calls.values()) {
      if (String(call.campaignId) === campaignIdStr) {
        calls.push(call);
      }
    }
    return calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCallsByUser(userId: number): Promise<Call[]> {
    // Get user's campaigns first
    const userCampaigns = await this.getCampaigns(userId);
    const campaignIds = userCampaigns.map(c => c.id);
    
    // Get calls for those campaigns
    const calls: Call[] = [];
    for (const call of this.calls.values()) {
      if (campaignIds.includes(call.campaignId)) {
        calls.push(call);
      }
    }
    return calls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  // Targets (individual endpoints under buyers)
  async getTargets(): Promise<Target[]> {
    return Array.from(this.targets.values());
  }

  async getTarget(id: number): Promise<Target | undefined> {
    return this.targets.get(id);
  }

  async getTargetsByBuyer(buyerId: number): Promise<Target[]> {
    return Array.from(this.targets.values()).filter(target => target.buyerId === buyerId);
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const id = this.currentTargetId++;
    const newTarget: Target = {
      ...target,
      id,
      userId: target.userId || 1,
      priority: target.priority ?? 1,
      dailyCap: target.dailyCap ?? 0,
      concurrencyLimit: target.concurrencyLimit ?? 1,
      acceptanceRate: target.acceptanceRate ?? "0.00",
      avgResponseTime: target.avgResponseTime ?? 0,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.targets.set(id, newTarget);
    return newTarget;
  }

  async updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target | undefined> {
    const existing = this.targets.get(id);
    if (!existing) return undefined;
    
    const updated: Target = {
      ...existing,
      ...target,
      updatedAt: new Date()
    };
    this.targets.set(id, updated);
    return updated;
  }

  async deleteTarget(id: number): Promise<boolean> {
    return this.targets.delete(id);
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

  // Call Events implementation
  async getCallEvents(callId: number): Promise<any[]> {
    return this.callEvents.filter(event => event.callId === callId);
  }

  async addCallEvent(callId: number, event: any): Promise<any> {
    const newEvent = {
      id: this.callEvents.length + 1,
      callId,
      ...event,
      timestamp: new Date()
    };
    this.callEvents.push(newEvent);
    return newEvent;
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
      totalResponseTime += buyer.avgResponseTime || 0;
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

  // Integration Tracking Pixels
  async getTrackingPixels(): Promise<any[]> {
    return Array.from(this.trackingPixels.values());
  }

  async createTrackingPixel(data: any): Promise<any> {
    const id = this.currentPixelId++;
    const pixel = { id, ...data };
    this.trackingPixels.set(id, pixel);
    return pixel;
  }

  async updateTrackingPixel(id: number, data: any): Promise<any> {
    const existing = this.trackingPixels.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.trackingPixels.set(id, updated);
    return updated;
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    return this.trackingPixels.delete(id);
  }

  // Campaign-specific Tracking Pixels
  async getCampaignTrackingPixels(campaignId: string): Promise<any[]> {
    console.log('Getting campaign tracking pixels for campaign:', campaignId);
    console.log('Available campaigns in storage:', Array.from(this.campaignTrackingPixels.keys()));
    
    const pixels = this.campaignTrackingPixels.get(campaignId) || [];
    console.log('Raw pixels for campaign:', pixels);
    
    // Filter out any corrupted pixels with invalid IDs
    const validPixels = pixels.filter(pixel => pixel && typeof pixel.id === 'number');
    console.log('Valid pixels after filtering:', validPixels);
    
    return validPixels;
  }

  async createCampaignTrackingPixel(data: any): Promise<any> {
    const id = this.currentPixelId++;
    const pixel = { id, ...data };
    
    console.log('Creating campaign tracking pixel:', pixel);
    
    const campaignPixels = this.campaignTrackingPixels.get(data.campaignId) || [];
    campaignPixels.push(pixel);
    this.campaignTrackingPixels.set(data.campaignId, campaignPixels);
    
    console.log('Campaign pixels after creation:', this.campaignTrackingPixels.get(data.campaignId));
    
    return pixel;
  }

  async updateCampaignTrackingPixel(campaignId: string, pixelId: number, data: any): Promise<any | undefined> {
    const campaignPixels = this.campaignTrackingPixels.get(campaignId) || [];
    const pixelIndex = campaignPixels.findIndex(p => p.id === pixelId);
    
    if (pixelIndex === -1) {
      return undefined; // Pixel not found
    }
    
    const updatedPixel = {
      ...campaignPixels[pixelIndex],
      ...data,
      updatedAt: new Date()
    };
    
    campaignPixels[pixelIndex] = updatedPixel;
    this.campaignTrackingPixels.set(campaignId, campaignPixels);
    
    return updatedPixel;
  }

  async deleteCampaignTrackingPixel(campaignId: string, pixelId: number): Promise<boolean> {
    const campaignPixels = this.campaignTrackingPixels.get(campaignId) || [];
    const filteredPixels = campaignPixels.filter(p => p.id !== pixelId);
    
    if (filteredPixels.length === campaignPixels.length) {
      return false; // Pixel not found
    }
    
    this.campaignTrackingPixels.set(campaignId, filteredPixels);
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

  // Phone Numbers methods
  async getPhoneNumbers(userId?: number): Promise<any[]> {
    const numbers = Array.from(this.phoneNumbers.values());
    console.log(`[MemStorage] getPhoneNumbers: Total numbers in memory: ${numbers.length}, userId filter: ${userId}`);
    if (userId !== undefined) {
      const filtered = numbers.filter(n => n.userId === userId);
      console.log(`[MemStorage] getPhoneNumbers: Filtered numbers for userId ${userId}: ${filtered.length}`);
      return filtered;
    }
    console.log(`[MemStorage] getPhoneNumbers: Returning all numbers: ${numbers.length}`);
    return numbers;
  }

  async createPhoneNumber(phoneNumber: any): Promise<any> {
    const id = this.currentPhoneNumberId++;
    const newPhoneNumber = {
      id,
      ...phoneNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.phoneNumbers.set(id, newPhoneNumber);
    console.log(`[MemStorage] createPhoneNumber: Created phone number ${newPhoneNumber.phoneNumber} with ID ${id}, userId: ${newPhoneNumber.userId}`);
    console.log(`[MemStorage] createPhoneNumber: Total numbers in memory: ${this.phoneNumbers.size}`);
    return newPhoneNumber;
  }

  async getUnassignedPhoneNumbers(userId?: number): Promise<any[]> {
    const numbers = await this.getPhoneNumbers(userId);
    
    console.log(`[MemStorage] getUnassignedPhoneNumbers: Returning ALL ${numbers.length} numbers for pool creation (filter removed)`);
    
    // Return all numbers for pool creation - remove filtering
    return numbers;
  }

  // Number Pools methods
  async getNumberPools(userId?: number): Promise<any[]> {
    const pools = Array.from(this.numberPools.values());
    if (userId !== undefined) {
      return pools.filter(p => p.userId === userId);
    }
    return pools;
  }

  async getNumberPool(id: number): Promise<any | undefined> {
    return this.numberPools.get(id);
  }

  async createNumberPool(pool: any): Promise<any> {
    const id = this.currentPoolId++;
    const newPool = {
      id,
      ...pool,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.numberPools.set(id, newPool);
    return newPool;
  }

  async updateNumberPool(id: number, pool: any): Promise<any | undefined> {
    const existing = this.numberPools.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...pool, updatedAt: new Date() };
    this.numberPools.set(id, updated);
    return updated;
  }

  async deleteNumberPool(id: number): Promise<boolean> {
    return this.numberPools.delete(id);
  }

  async getPoolNumbers(poolId: number): Promise<any[]> {
    const numbers = [];
    for (const [key, assignment] of this.poolAssignments.entries()) {
      if (assignment.poolId === poolId) {
        const phoneNumber = this.phoneNumbers.get(assignment.phoneNumberId);
        if (phoneNumber) {
          numbers.push(phoneNumber);
        }
      }
    }
    return numbers;
  }

  async assignNumberToPool(poolId: number, phoneNumberId: number, priority?: number): Promise<any> {
    const assignmentKey = `${poolId}_${phoneNumberId}`;
    const assignment = {
      poolId,
      phoneNumberId,
      priority: priority || 1,
      createdAt: new Date()
    };
    this.poolAssignments.set(assignmentKey, assignment);
    return assignment;
  }

  async removeNumberFromPool(poolId: number, phoneNumberId: number): Promise<boolean> {
    const assignmentKey = `${poolId}_${phoneNumberId}`;
    return this.poolAssignments.delete(assignmentKey);
  }

  async getNumberPoolAssignments(phoneNumberId: number): Promise<any[]> {
    const assignments = [];
    for (const assignment of this.poolAssignments.values()) {
      if (assignment.phoneNumberId === phoneNumberId) {
        assignments.push(assignment);
      }
    }
    return assignments;
  }

  async getPoolAssignedCount(poolId: number): Promise<number> {
    let count = 0;
    for (const assignment of this.poolAssignments.values()) {
      if (assignment.poolId === poolId) {
        count++;
      }
    }
    return count;
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
    return this.phoneNumbers.get(id);
  }

  async updatePhoneNumber(id: number, phoneNumber: any): Promise<any | undefined> {
    const existing = this.phoneNumbers.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...phoneNumber, updatedAt: new Date() };
    this.phoneNumbers.set(id, updated);
    return updated;
  }

  async updatePhoneNumberFriendlyName(id: number, friendlyName: string): Promise<any | undefined> {
    const phoneNumber = this.phoneNumbers.get(id);
    if (!phoneNumber) return undefined;
    
    const updated = { ...phoneNumber, friendlyName, updatedAt: new Date() };
    this.phoneNumbers.set(id, updated);
    return updated;
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    return this.phoneNumbers.delete(id);
  }

  async getPhoneNumberByNumber(phoneNumber: string): Promise<any | undefined> {
    for (const number of this.phoneNumbers.values()) {
      if (number.phoneNumber === phoneNumber) {
        return number;
      }
    }
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

  async clearRtbAuditData(): Promise<void> {
    console.log('Clearing RTB audit data from memory storage');
    this.rtbBidResponses = [];
    this.rtbBidRequests = [];
    console.log('RTB audit data cleared from memory');
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

  async getVisitorSessions(userId: number): Promise<VisitorSession[]> {
    return this.visitorSessions.filter(session => session.userId === userId);
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

  // RedTrack Integration methods
  async createRedtrackConfig(config: InsertRedtrackConfig): Promise<RedtrackConfig> {
    const newConfig: RedtrackConfig = {
      ...config,
      id: this.currentRedtrackConfigId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null
    };
    this.redtrackConfigs.set(newConfig.id, newConfig);
    return newConfig;
  }

  async getRedtrackConfig(id: number): Promise<RedtrackConfig | undefined> {
    return this.redtrackConfigs.get(id);
  }

  async getRedtrackConfigs(userId: number): Promise<RedtrackConfig[]> {
    return Array.from(this.redtrackConfigs.values())
      .filter(config => config.userId === userId);
  }

  async updateRedtrackConfig(id: number, updates: Partial<InsertRedtrackConfig>): Promise<RedtrackConfig | undefined> {
    const config = this.redtrackConfigs.get(id);
    if (!config) return undefined;

    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date()
    };
    this.redtrackConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  async deleteRedtrackConfig(id: number): Promise<boolean> {
    return this.redtrackConfigs.delete(id);
  }

  // URL Parameters methods
  async getUrlParameters(userId: number): Promise<URLParameter[]> {
    return Array.from(this.urlParameters.values())
      .filter(param => param.userId === userId);
  }

  async getUrlParameter(id: number): Promise<URLParameter | undefined> {
    return this.urlParameters.get(id);
  }

  async createUrlParameter(parameter: InsertURLParameter): Promise<URLParameter> {
    const newParameter: URLParameter = {
      ...parameter,
      id: this.currentUrlParameterId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.urlParameters.set(newParameter.id, newParameter);
    return newParameter;
  }

  async updateUrlParameter(id: number, parameter: Partial<InsertURLParameter>): Promise<URLParameter | undefined> {
    const existing = this.urlParameters.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...parameter,
      updatedAt: new Date()
    };
    this.urlParameters.set(id, updated);
    return updated;
  }

  async deleteUrlParameter(id: number): Promise<boolean> {
    return this.urlParameters.delete(id);
  }

  // Tracking Pixels methods
  async getTrackingPixels(userId: number): Promise<any[]> {
    return Array.from(this.trackingPixels.values())
      .filter(pixel => pixel.userId === userId);
  }

  async getTrackingPixel(id: number): Promise<any | undefined> {
    return this.trackingPixels.get(id);
  }

  async createTrackingPixel(pixel: any): Promise<any> {
    const newPixel = {
      ...pixel,
      id: this.currentPixelId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.trackingPixels.set(newPixel.id, newPixel);
    return newPixel;
  }

  async updateTrackingPixel(id: number, pixel: any): Promise<any | undefined> {
    const existing = this.trackingPixels.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...pixel,
      updatedAt: new Date()
    };
    this.trackingPixels.set(id, updated);
    return updated;
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    return this.trackingPixels.delete(id);
  }

  // Campaign-specific Tracking Pixels
  async getCampaignTrackingPixels(campaignId: string): Promise<any[]> {
    return this.campaignTrackingPixels.get(campaignId) || [];
  }

  async createCampaignTrackingPixel(data: any): Promise<any> {
    const newPixel = {
      ...data,
      id: this.currentPixelId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const existing = this.campaignTrackingPixels.get(data.campaignId) || [];
    existing.push(newPixel);
    this.campaignTrackingPixels.set(data.campaignId, existing);
    return newPixel;
  }

  async deleteCampaignTrackingPixel(campaignId: string, pixelId: number): Promise<boolean> {
    const existing = this.campaignTrackingPixels.get(campaignId) || [];
    const filtered = existing.filter(pixel => pixel.id !== pixelId);
    this.campaignTrackingPixels.set(campaignId, filtered);
    return filtered.length < existing.length;
  }

  // Custom Reports
  private customReports: Map<number, any> = new Map();
  private currentReportId: number = 1;

  async getCustomReports(userId: number): Promise<any[]> {
    return Array.from(this.customReports.values())
      .filter(report => report.userId === userId);
  }

  async createCustomReport(report: any): Promise<any> {
    const newReport = {
      ...report,
      id: this.currentReportId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customReports.set(newReport.id, newReport);
    return newReport;
  }

  async updateCustomReport(id: number, report: any, userId: number): Promise<any> {
    const existing = this.customReports.get(id);
    if (!existing || existing.userId !== userId) return undefined;

    const updated = {
      ...existing,
      ...report,
      updatedAt: new Date()
    };
    this.customReports.set(id, updated);
    return updated;
  }

  async deleteCustomReport(id: number, userId: number): Promise<boolean> {
    const existing = this.customReports.get(id);
    if (!existing || existing.userId !== userId) return false;
    return this.customReports.delete(id);
  }

  async copyCustomReport(id: number, userId: number): Promise<any> {
    const existing = this.customReports.get(id);
    if (!existing) return undefined;

    const copied = {
      ...existing,
      id: this.currentReportId++,
      name: `${existing.name} (Copy)`,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customReports.set(copied.id, copied);
    return copied;
  }

  // Bulk Actions
  async bulkTranscribeCalls(callIds: number[], userId: number): Promise<any> {
    const results = [];
    for (const callId of callIds) {
      const call = this.calls.get(callId);
      if (call && call.userId === userId) {
        call.transcription = `Mock transcription for call ${callId}`;
        call.updatedAt = new Date();
        results.push({ callId, status: 'transcribed' });
      }
    }
    return { results, total: callIds.length, processed: results.length };
  }

  async bulkAnnotateCalls(callIds: number[], data: any, userId: number): Promise<any> {
    const results = [];
    for (const callId of callIds) {
      const call = this.calls.get(callId);
      if (call && call.userId === userId) {
        call.notes = data.annotation;
        call.updatedAt = new Date();
        results.push({ callId, status: 'annotated' });
      }
    }
    return { results, total: callIds.length, processed: results.length };
  }

  async bulkBlockCallerIds(callIds: number[], data: any, userId: number): Promise<any> {
    const results = [];
    for (const callId of callIds) {
      const call = this.calls.get(callId);
      if (call && call.userId === userId) {
        // In a real implementation, would add caller ID to blocklist
        results.push({ callId, status: 'blocked', callerNumber: call.callerNumber });
      }
    }
    return { results, total: callIds.length, processed: results.length };
  }

  async bulkRequestAdjustments(callIds: number[], data: any, userId: number): Promise<any> {
    const results = [];
    for (const callId of callIds) {
      const call = this.calls.get(callId);
      if (call && call.userId === userId) {
        // In a real implementation, would create adjustment requests
        results.push({ 
          callId, 
          status: 'adjustment_requested', 
          requestType: data.adjustmentType,
          reason: data.reason 
        });
      }
    }
    return { results, total: callIds.length, processed: results.length };
  }

  // Missing agent methods implementation
  async getAgentActiveCalls(userId: number, agentId: number): Promise<any[]> {
    const activeCalls = [];
    for (const call of this.calls.values()) {
      if (call.status === 'in-progress') {
        activeCalls.push(call);
      }
    }
    return activeCalls;
  }



  async getAgentStats(userId: number, agentId: number): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { totalCalls: 0, activeCalls: 0, avgResponseTime: 0 };
    }

    let totalCalls = 0;
    let activeCalls = 0;
    for (const call of this.calls.values()) {
      if (call.buyerId === agentId) {
        totalCalls++;
        if (call.status === 'in-progress') {
          activeCalls++;
        }
      }
    }

    return {
      totalCalls,
      activeCalls,
      avgResponseTime: agent.avgResponseTime || 0,
      status: agent.status
    };
  }

  async updateAgentStatus(userId: number, agentId: number, status: string): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    const updatedAgent = { ...agent, status: status as any, updatedAt: new Date() };
    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  async getUserByEmailAsync(email: string): Promise<User | undefined> {
    return this.getUserByEmail(email);
  }
}

// Export SupabaseStorage as the main storage implementation  
export { storage } from './supabase-storage';