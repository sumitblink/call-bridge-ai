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

class HybridStorage implements IStorage {
  private supabaseStorage: SupabaseStorage;
  private useSupabase: boolean = true;

  constructor() {
    this.supabaseStorage = new SupabaseStorage();
  }

  private async trySupabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.useSupabase) {
      throw new Error('Database not available');
    }
    
    try {
      return await operation();
    } catch (error) {
      console.warn('Supabase operation failed, database may not be configured properly:', error);
      // Don't switch to memory storage automatically - require proper database setup
      throw error;
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getUser(id));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getUserByUsername(username));
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.trySupabaseOperation(() => this.supabaseStorage.createUser(user));
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getCampaigns());
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getCampaign(id));
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getCampaignByPhoneNumber(phoneNumber));
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    return this.trySupabaseOperation(() => this.supabaseStorage.createCampaign(campaign));
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.updateCampaign(id, campaign));
  }

  async deleteCampaign(id: number): Promise<boolean> {
    return this.trySupabaseOperation(() => this.supabaseStorage.deleteCampaign(id));
  }

  // Buyers
  async getBuyers(): Promise<Buyer[]> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getBuyers());
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getBuyer(id));
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    return this.trySupabaseOperation(() => this.supabaseStorage.createBuyer(buyer));
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined> {
    return this.trySupabaseOperation(() => this.supabaseStorage.updateBuyer(id, buyer));
  }

  async deleteBuyer(id: number): Promise<boolean> {
    return this.trySupabaseOperation(() => this.supabaseStorage.deleteBuyer(id));
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