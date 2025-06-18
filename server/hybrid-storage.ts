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
  type UpsertUser,
  type Buyer,
  type InsertBuyer,
  type CampaignBuyer,
  type InsertCampaignBuyer,
  type CallLog,
  type InsertCallLog,
} from '@shared/schema';
import type { IStorage } from './storage';
import { DatabaseStorage } from './storage-db';
import { MemStorage } from './storage';

class HybridStorage implements IStorage {
  private databaseStorage: DatabaseStorage;
  private memStorage: MemStorage;
  private useDatabase: boolean = true; // Use PostgreSQL as primary storage

  constructor() {
    this.databaseStorage = new DatabaseStorage();
    this.memStorage = new MemStorage();
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    // Try to use PostgreSQL database, fall back to memory storage if it fails
    try {
      const campaigns = await this.databaseStorage.getCampaigns();
      if (campaigns.length === 0) {
        console.log('Database is empty, populating with sample data...');
        await this.populateDatabase();
      }
      this.useDatabase = true;
      console.log('Using PostgreSQL database with sample data');
    } catch (error) {
      console.log('Database not available, using memory storage with sample data');
      this.useDatabase = false;
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
  async getUser(id: string): Promise<User | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getUser(id),
      () => this.memStorage.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getUserByUsername(username),
      () => this.memStorage.getUserByUsername(username)
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getUserByEmail(email),
      () => this.memStorage.getUserByEmail(email)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeOperation(
      () => this.databaseStorage.createUser(user),
      () => this.memStorage.createUser(user)
    );
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    return this.executeOperation(
      () => this.databaseStorage.upsertUser(user),
      () => this.memStorage.upsertUser(user)
    );
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaigns(),
      () => this.memStorage.getCampaigns()
    );
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaign(id),
      () => this.memStorage.getCampaign(id)
    );
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignByPhoneNumber(phoneNumber),
      () => this.memStorage.getCampaignByPhoneNumber(phoneNumber)
    );
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    return this.executeOperation(
      () => this.databaseStorage.createCampaign(campaign),
      () => this.memStorage.createCampaign(campaign)
    );
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateCampaign(id, campaign),
      () => this.memStorage.updateCampaign(id, campaign)
    );
  }

  async deleteCampaign(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteCampaign(id),
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

  async deleteAgent(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.deleteAgent(id),
      () => this.memStorage.deleteAgent(id)
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

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.updateCall(id, updates),
      () => this.memStorage.updateCall(id, updates)
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

  // Integrations
  async getUrlParameters(): Promise<any[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getUrlParameters(),
      () => this.memStorage.getUrlParameters()
    );
  }

  async createUrlParameter(data: any): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.createUrlParameter(data),
      () => this.memStorage.createUrlParameter(data)
    );
  }

  async getTrackingPixels(): Promise<any[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getTrackingPixels(),
      () => this.memStorage.getTrackingPixels()
    );
  }

  async createTrackingPixel(data: any): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.createTrackingPixel(data),
      () => this.memStorage.createTrackingPixel(data)
    );
  }

  async updateTrackingPixel(id: number, data: any): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.updateTrackingPixel(id, data),
      () => this.memStorage.updateTrackingPixel(id, data)
    );
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.deleteTrackingPixel(id),
      () => this.memStorage.deleteTrackingPixel(id)
    );
  }

  async getWebhookConfigs(): Promise<any[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getWebhookConfigs(),
      () => this.memStorage.getWebhookConfigs()
    );
  }

  async createWebhookConfig(data: any): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.createWebhookConfig(data),
      () => this.memStorage.createWebhookConfig(data)
    );
  }

  async getApiAuthentications(): Promise<any[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getApiAuthentications(),
      () => this.memStorage.getApiAuthentications()
    );
  }

  async createApiAuthentication(data: any): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.createApiAuthentication(data),
      () => this.memStorage.createApiAuthentication(data)
    );
  }

  async getPlatformIntegrations(): Promise<any[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getPlatformIntegrations(),
      () => this.memStorage.getPlatformIntegrations()
    );
  }

  async createPlatformIntegration(data: any): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.createPlatformIntegration(data),
      () => this.memStorage.createPlatformIntegration(data)
    );
  }

  // Publishers
  async getPublishers(): Promise<any[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getPublishers(),
      () => this.memStorage.getPublishers()
    );
  }

  async getPublisher(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.getPublisher(id),
      () => this.memStorage.getPublisher(id)
    );
  }

  async createPublisher(publisher: any): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.createPublisher(publisher),
      () => this.memStorage.createPublisher(publisher)
    );
  }

  async updatePublisher(id: number, publisher: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.supabaseStorage.updatePublisher(id, publisher),
      () => this.memStorage.updatePublisher(id, publisher)
    );
  }

  async deletePublisher(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.deletePublisher(id),
      () => this.memStorage.deletePublisher(id)
    );
  }

  async getPublisherCampaigns(publisherId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.supabaseStorage.getPublisherCampaigns(publisherId),
      () => this.memStorage.getPublisherCampaigns(publisherId)
    );
  }

  async addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string): Promise<any> {
    return this.executeOperation(
      () => this.supabaseStorage.addPublisherToCampaign(publisherId, campaignId, customPayout),
      () => this.memStorage.addPublisherToCampaign(publisherId, campaignId, customPayout)
    );
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.supabaseStorage.removePublisherFromCampaign(publisherId, campaignId),
      () => this.memStorage.removePublisherFromCampaign(publisherId, campaignId)
    );
  }
}

export const storage = new HybridStorage();