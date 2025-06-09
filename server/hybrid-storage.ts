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
  private useSupabase: boolean = true; // Use Supabase as primary storage

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
        console.warn('Supabase operation failed, trying memory storage:', error);
        // Don't disable Supabase permanently, just fallback for this operation
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
    return this.executeOperation(
      () => this.supabaseStorage.getCampaignBuyers(campaignId),
      () => this.memStorage.getCampaignBuyers(campaignId)
    );
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    return this.executeOperation(
      () => this.supabaseStorage.addBuyerToCampaign(campaignId, buyerId, priority),
      () => this.memStorage.addBuyerToCampaign(campaignId, buyerId, priority)
    );
  }

  async removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.removeBuyerFromCampaign(campaignId, buyerId),
      () => this.memStorage.removeBuyerFromCampaign(campaignId, buyerId)
    );
  }

  // Call Routing & Ping/Post
  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    return this.executeOperation(
      () => this.supabaseStorage.pingBuyersForCall(campaignId, callData),
      () => this.memStorage.pingBuyersForCall(campaignId, callData)
    );
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.postCallToBuyer(buyerId, callData),
      () => this.memStorage.postCallToBuyer(buyerId, callData)
    );
  }

  // Agents (backward compatibility)
  async getAgents(): Promise<Agent[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getAgents(),
      () => this.memStorage.getAgents()
    );
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.getAgent(id),
      () => this.memStorage.getAgent(id)
    );
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    return this.executeOperation(
      () => this.supabaseStorage.createAgent(agent),
      () => this.memStorage.createAgent(agent)
    );
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.updateAgent(id, agent),
      () => this.memStorage.updateAgent(id, agent)
    );
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getCalls(),
      () => this.memStorage.getCalls()
    );
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getCallsByCampaign(campaignId),
      () => this.memStorage.getCallsByCampaign(campaignId)
    );
  }

  async createCall(call: InsertCall): Promise<Call> {
    return this.executeOperation(
      () => this.supabaseStorage.createCall(call),
      () => this.memStorage.createCall(call)
    );
  }

  // Call Logs
  async getCallLogs(callId: number): Promise<CallLog[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getCallLogs(callId),
      () => this.memStorage.getCallLogs(callId)
    );
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    return this.executeOperation(
      () => this.supabaseStorage.createCallLog(log),
      () => this.memStorage.createCallLog(log)
    );
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
    return this.executeOperation(
      () => this.supabaseStorage.getStats(),
      () => this.memStorage.getStats()
    );
  }
}

export const storage = new HybridStorage();