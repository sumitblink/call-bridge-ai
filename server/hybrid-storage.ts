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
} from '@shared/schema';
import type { IStorage } from './storage';
import { SupabaseStorage } from './supabase-storage';
import { MemStorage } from './storage';

class HybridStorage implements IStorage {
  private supabaseStorage: SupabaseStorage;
  private memStorage: MemStorage;
  private useSupabase: boolean = false; // Start with memory storage for immediate data

  constructor() {
    this.supabaseStorage = new SupabaseStorage();
    this.memStorage = new MemStorage();
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    // Try to use Supabase, fall back to memory storage if it fails
    try {
      const campaigns = await this.supabaseStorage.getCampaigns();
      if (campaigns.length === 0) {
        console.log('Database is empty, populating with sample data...');
        await this.populateDatabase();
      }
      this.useSupabase = true;
      console.log('Using Supabase database with sample data');
    } catch (error) {
      console.log('Database not available, using memory storage with sample data');
      this.useSupabase = false;
    }
  }

  private async populateDatabase() {
    try {
      // Add sample campaigns
      const campaigns = await this.memStorage.getCampaigns();
      for (const campaign of campaigns) {
        const { id, createdAt, updatedAt, ...campaignData } = campaign;
        await this.supabaseStorage.createCampaign(campaignData);
      }

      // Add sample buyers
      const buyers = await this.memStorage.getBuyers();
      for (const buyer of buyers) {
        const { id, createdAt, updatedAt, ...buyerData } = buyer;
        await this.supabaseStorage.createBuyer(buyerData);
      }

      // Add sample agents
      const agents = await this.memStorage.getAgents();
      for (const agent of agents) {
        const { id, createdAt, updatedAt, ...agentData } = agent;
        await this.supabaseStorage.createAgent(agentData);
      }
    } catch (error) {
      console.warn('Failed to populate database with sample data:', error);
    }
  }

  private async executeOperation<T>(
    supabaseOp: () => Promise<T>,
    memoryOp: () => Promise<T>
  ): Promise<T> {
    if (this.useSupabase) {
      try {
        return await supabaseOp();
      } catch (error) {
        console.warn('Supabase operation failed, falling back to memory storage:', error);
        this.useSupabase = false;
        return await memoryOp();
      }
    } else {
      return await memoryOp();
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.getUser(id),
      () => this.memStorage.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.getUserByUsername(username),
      () => this.memStorage.getUserByUsername(username)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeOperation(
      () => this.supabaseStorage.createUser(user),
      () => this.memStorage.createUser(user)
    );
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getCampaigns(),
      () => this.memStorage.getCampaigns()
    );
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.getCampaign(id),
      () => this.memStorage.getCampaign(id)
    );
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.getCampaignByPhoneNumber(phoneNumber),
      () => this.memStorage.getCampaignByPhoneNumber(phoneNumber)
    );
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    return this.executeOperation(
      () => this.supabaseStorage.createCampaign(campaign),
      () => this.memStorage.createCampaign(campaign)
    );
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.updateCampaign(id, campaign),
      () => this.memStorage.updateCampaign(id, campaign)
    );
  }

  async deleteCampaign(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.deleteCampaign(id),
      () => this.memStorage.deleteCampaign(id)
    );
  }

  // Buyers
  async getBuyers(): Promise<Buyer[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getBuyers(),
      () => this.memStorage.getBuyers()
    );
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.getBuyer(id),
      () => this.memStorage.getBuyer(id)
    );
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    return this.executeOperation(
      () => this.supabaseStorage.createBuyer(buyer),
      () => this.memStorage.createBuyer(buyer)
    );
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.updateBuyer(id, buyer),
      () => this.memStorage.updateBuyer(id, buyer)
    );
  }

  async deleteBuyer(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.deleteBuyer(id),
      () => this.memStorage.deleteBuyer(id)
    );
  }

  // Campaign-Buyer Relations
  async getCampaignBuyers(campaignId: number): Promise<Buyer[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getCampaignBuyers(campaignId));
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    return this.trySupabaseOperation(() => this.supabaseStorage.addBuyerToCampaign(campaignId, buyerId, priority));
  }

  async removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean> {
    return this.trySupabaseOperation(() => this.supabaseStorage.removeBuyerFromCampaign(campaignId, buyerId));
  }

  // Call Routing & Ping/Post
  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.pingBuyersForCall(campaignId, callData));
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    return this.trySupabaseOperation(() => this.supabaseStorage.postCallToBuyer(buyerId, callData));
  }

  // Agents (backward compatibility)
  async getAgents(): Promise<Agent[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getAgents());
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getAgent(id));
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    return this.trySupabaseOperation(() => this.supabaseStorage.createAgent(agent));
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.updateAgent(id, agent));
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getCalls());
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getCallsByCampaign(campaignId));
  }

  async createCall(call: InsertCall): Promise<Call> {
    return this.trySupabaseOperation(() => this.supabaseStorage.createCall(call));
  }

  // Call Logs
  async getCallLogs(callId: number): Promise<CallLog[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getCallLogs(callId));
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    return this.trySupabaseOperation(() => this.supabaseStorage.createCallLog(log));
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
    return this.trySupabaseOperation(() => this.supabaseStorage.getStats());
  }
}

export const storage = new HybridStorage();