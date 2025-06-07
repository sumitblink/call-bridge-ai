import { campaigns, agents, calls, users, type Campaign, type InsertCampaign, type Agent, type InsertAgent, type Call, type InsertCall, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;

  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;

  // Calls
  getCalls(): Promise<Call[]>;
  getCallsByCampaign(campaignId: number): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;

  // Stats
  getStats(): Promise<{
    activeCampaigns: number;
    totalCalls: number;
    successRate: string;
    activeAgents: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private campaigns: Map<number, Campaign>;
  private agents: Map<number, Agent>;
  private calls: Map<number, Call>;
  private currentUserId: number;
  private currentCampaignId: number;
  private currentAgentId: number;
  private currentCallId: number;

  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.agents = new Map();
    this.calls = new Map();
    this.currentUserId = 1;
    this.currentCampaignId = 1;
    this.currentAgentId = 1;
    this.currentCallId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample campaigns
    const sampleCampaigns: Campaign[] = [
      {
        id: 1,
        name: "Customer Satisfaction Survey",
        description: "Monthly satisfaction tracking",
        status: "active",
        progress: 75,
        callsMade: 1247,
        successRate: "72.30",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: "Product Launch Outreach",
        description: "New product announcement calls",
        status: "active",
        progress: 45,
        callsMade: 892,
        successRate: "68.70",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: "Debt Collection Follow-up",
        description: "Outstanding payment reminders",
        status: "paused",
        progress: 30,
        callsMade: 456,
        successRate: "41.20",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        name: "Healthcare Appointment Reminders",
        description: "Patient appointment confirmations",
        status: "active",
        progress: 90,
        callsMade: 2103,
        successRate: "94.10",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleCampaigns.forEach((campaign) => {
      this.campaigns.set(campaign.id, campaign);
    });

    this.currentCampaignId = 5;

    // Sample agents
    const sampleAgents: Agent[] = [
      {
        id: 1,
        name: "Alice Johnson",
        email: "alice@callcenter.com",
        status: "online",
        campaignId: 1,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Bob Smith",
        email: "bob@callcenter.com",
        status: "online",
        campaignId: 2,
        createdAt: new Date(),
      },
    ];

    sampleAgents.forEach((agent) => {
      this.agents.set(agent.id, agent);
    });

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
    return Array.from(this.campaigns.values());
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const id = this.currentCampaignId++;
    const newCampaign: Campaign = {
      id,
      name: campaign.name,
      description: campaign.description ?? null,
      status: campaign.status ?? "draft",
      progress: campaign.progress ?? 0,
      callsMade: campaign.callsMade ?? 0,
      successRate: campaign.successRate ?? "0.00",
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
      campaignId: agent.campaignId ?? null,
      createdAt: new Date(),
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
    };
    this.agents.set(id, updated);
    return updated;
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
      campaignId: call.campaignId,
      agentId: call.agentId ?? null,
      phoneNumber: call.phoneNumber,
      status: call.status,
      duration: call.duration ?? null,
      notes: call.notes ?? null,
      createdAt: new Date(),
    };
    this.calls.set(id, newCall);
    return newCall;
  }

  // Stats
  async getStats(): Promise<{
    activeCampaigns: number;
    totalCalls: number;
    successRate: string;
    activeAgents: number;
  }> {
    const campaigns = Array.from(this.campaigns.values());
    const agents = Array.from(this.agents.values());
    
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalCalls = campaigns.reduce((sum, c) => sum + c.callsMade, 0);
    const activeAgents = agents.filter(a => a.status === 'online').length;
    
    // Calculate overall success rate
    const totalCallsForSuccessRate = campaigns.reduce((sum, c) => sum + c.callsMade, 0);
    const weightedSuccessRate = campaigns.reduce((sum, c) => {
      return sum + (parseFloat(c.successRate || "0") * c.callsMade);
    }, 0);
    
    const overallSuccessRate = totalCallsForSuccessRate > 0 
      ? (weightedSuccessRate / totalCallsForSuccessRate).toFixed(1)
      : "0.0";

    return {
      activeCampaigns,
      totalCalls,
      successRate: `${overallSuccessRate}%`,
      activeAgents,
    };
  }
}

// Export SupabaseStorage as the main storage implementation  
export { storage } from './supabase-storage';
