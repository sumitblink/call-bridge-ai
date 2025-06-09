import {
  campaigns,
  agents,
  calls,
  users,
  buyers,
  campaignBuyers,
  callLogs,
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
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  deleteAgent(id: number): Promise<boolean>;

  // Calls
  getCalls(): Promise<Call[]>;
  getCallsByCampaign(campaignId: number): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private campaigns: Map<number, Campaign>;
  private buyers: Map<number, Buyer>;
  private campaignBuyers: Map<string, CampaignBuyer>;
  private agents: Map<number, Agent>;
  private calls: Map<number, Call>;
  private callLogs: Map<number, CallLog>;
  private currentUserId: number;
  private currentCampaignId: number;
  private currentBuyerId: number;
  private currentAgentId: number;
  private currentCallId: number;
  private currentCallLogId: number;

  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.buyers = new Map();
    this.campaignBuyers = new Map();
    this.agents = new Map();
    this.calls = new Map();
    this.callLogs = new Map();
    this.currentUserId = 1;
    this.currentCampaignId = 1;
    this.currentBuyerId = 1;
    this.currentAgentId = 1;
    this.currentCallId = 1;
    this.currentCallLogId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample campaigns
    this.campaigns.set(1, {
      id: 1,
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
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return [...this.campaigns.values()];
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
      updatedAt: new Date(),
    };
    this.campaigns.set(id, updated);
    return updated;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    return this.campaigns.delete(id);
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
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
      status: agent.status ?? "offline",
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
    return Array.from(this.calls.values());
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(
      (call) => call.campaignId === campaignId
    );
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

  // Buyers
  async getBuyers(): Promise<Buyer[]> {
    return Array.from(this.buyers.values());
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    return this.buyers.get(id);
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    const id = this.currentBuyerId++;
    const newBuyer: Buyer = {
      id,
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
    return this.buyers.delete(id);
  }

  // Campaign-Buyer Relations
  async getCampaignBuyers(campaignId: number): Promise<Buyer[]> {
    const campaignBuyerEntries = Array.from(this.campaignBuyers.values())
      .filter(cb => cb.campaignId === campaignId);
    
    return campaignBuyerEntries
      .map(cb => this.buyers.get(cb.buyerId))
      .filter(buyer => buyer !== undefined) as Buyer[];
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
    return campaignBuyers.filter(buyer => buyer.status === 'active');
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    const buyer = await this.getBuyer(buyerId);
    return buyer !== undefined && buyer.status === 'active';
  }

  // Call Logs
  async getCallLogs(callId: number): Promise<CallLog[]> {
    return Array.from(this.callLogs.values()).filter(log => log.callId === callId);
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
    const activeCampaigns = [...this.campaigns.values()].filter(c => c.status === 'active').length;
    const totalCalls = this.calls.size;
    const successfulCalls = [...this.calls.values()].filter(c => c.status === 'completed').length;
    const successRate = totalCalls > 0 ? `${Math.round((successfulCalls / totalCalls) * 100)}%` : "0%";
    const activeAgents = [...this.agents.values()].filter(a => a.status === 'active').length;
    const activeBuyers = [...this.buyers.values()].filter(b => b.status === 'active').length;
    const avgResponseTime = [...this.buyers.values()].reduce((sum, buyer) => sum + buyer.avgResponseTime, 0) / Math.max(this.buyers.size, 1);

    return {
      activeCampaigns,
      totalCalls,
      successRate,
      activeAgents,
      activeBuyers,
      avgResponseTime
    };
  }
}

// Export SupabaseStorage as the main storage implementation  
export { storage } from './supabase-storage';
