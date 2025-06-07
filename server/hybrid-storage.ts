import { campaigns, agents, calls, users, type Campaign, type InsertCampaign, type Agent, type InsertAgent, type Call, type InsertCall, type User, type InsertUser } from '@shared/schema';
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

  // Agents
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

  // Stats
  async getStats(): Promise<{
    activeCampaigns: number;
    totalCalls: number;
    successRate: string;
    activeAgents: number;
  }> {
    return this.trySupabaseOperation(() => this.supabaseStorage.getStats());
  }
}

export const storage = new HybridStorage();