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
  type Feedback,
  type InsertFeedback,
} from '@shared/schema';
import type { IStorage } from './storage';
import { SupabaseStorage } from './supabase-storage';
import { MemStorage } from './storage';

class HybridStorage implements IStorage {
  private databaseStorage: SupabaseStorage;
  private memStorage: MemStorage;
  private useDatabase: boolean = true; // Use PostgreSQL as primary storage

  constructor() {
    this.databaseStorage = new SupabaseStorage();
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
        await this.databaseStorage.createCampaign(campaignData);
      }

      // Add sample buyers
      const buyers = await this.memStorage.getBuyers();
      for (const buyer of buyers) {
        const { id, createdAt, updatedAt, ...buyerData } = buyer;
        await this.databaseStorage.createBuyer(buyerData);
      }

      // Add sample agents
      const agents = await this.memStorage.getAgents();
      for (const agent of agents) {
        const { id, createdAt, updatedAt, ...agentData } = agent;
        await this.databaseStorage.createAgent(agentData);
      }
    } catch (error) {
      console.warn('Failed to populate database with sample data:', error);
    }
  }

  private async executeOperation<T>(
    supabaseOp: () => Promise<T>,
    memoryOp: () => Promise<T>
  ): Promise<T> {
    if (this.useDatabase) {
      try {
        return await supabaseOp();
      } catch (error) {
        console.warn('Database operation failed, trying memory storage:', error);
        // Don't disable database permanently, just fallback for this operation
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
      () => this.databaseStorage.getBuyers(),
      () => this.memStorage.getBuyers()
    );
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getBuyer(id),
      () => this.memStorage.getBuyer(id)
    );
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    return this.executeOperation(
      () => this.databaseStorage.createBuyer(buyer),
      () => this.memStorage.createBuyer(buyer)
    );
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateBuyer(id, buyer),
      () => this.memStorage.updateBuyer(id, buyer)
    );
  }

  async deleteBuyer(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteBuyer(id),
      () => this.memStorage.deleteBuyer(id)
    );
  }

  // Campaign-Buyer Relations
  async getCampaignBuyers(campaignId: number): Promise<Buyer[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignBuyers(campaignId),
      () => this.memStorage.getCampaignBuyers(campaignId)
    );
  }

  async getBuyerCampaignAssignments(buyerId: number): Promise<Campaign[]> {
    return this.executeOperation(
      () => this.databaseStorage.getBuyerCampaignAssignments(buyerId),
      () => this.memStorage.getBuyerCampaignAssignments(buyerId)
    );
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    return this.executeOperation(
      () => this.databaseStorage.addBuyerToCampaign(campaignId, buyerId, priority),
      () => this.memStorage.addBuyerToCampaign(campaignId, buyerId, priority)
    );
  }

  async removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.removeBuyerFromCampaign(campaignId, buyerId),
      () => this.memStorage.removeBuyerFromCampaign(campaignId, buyerId)
    );
  }

  // Call Routing & Ping/Post
  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    return this.executeOperation(
      () => this.databaseStorage.pingBuyersForCall(campaignId, callData),
      () => this.memStorage.pingBuyersForCall(campaignId, callData)
    );
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.postCallToBuyer(buyerId, callData),
      () => this.memStorage.postCallToBuyer(buyerId, callData)
    );
  }

  // Agents (backward compatibility)
  async getAgents(): Promise<Agent[]> {
    return this.executeOperation(
      () => this.databaseStorage.getAgents(),
      () => this.memStorage.getAgents()
    );
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getAgent(id),
      () => this.memStorage.getAgent(id)
    );
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    return this.executeOperation(
      () => this.databaseStorage.createAgent(agent),
      () => this.memStorage.createAgent(agent)
    );
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateAgent(id, agent),
      () => this.memStorage.updateAgent(id, agent)
    );
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteAgent(id),
      () => this.memStorage.deleteAgent(id)
    );
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCalls(),
      () => this.memStorage.getCalls()
    );
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCallsByCampaign(campaignId),
      () => this.memStorage.getCallsByCampaign(campaignId)
    );
  }

  async createCall(call: InsertCall): Promise<Call> {
    return this.executeOperation(
      () => this.databaseStorage.createCall(call),
      () => this.memStorage.createCall(call)
    );
  }

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateCall(id, updates),
      () => this.memStorage.updateCall(id, updates)
    );
  }

  // Call Logs
  async getCallLogs(callId: number): Promise<CallLog[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCallLogs(callId),
      () => this.memStorage.getCallLogs(callId)
    );
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    return this.executeOperation(
      () => this.databaseStorage.createCallLog(log),
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
      () => this.databaseStorage.getStats(),
      () => this.memStorage.getStats()
    );
  }

  // Integrations
  async getUrlParameters(): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getUrlParameters(),
      () => this.memStorage.getUrlParameters()
    );
  }

  async createUrlParameter(data: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createUrlParameter(data),
      () => this.memStorage.createUrlParameter(data)
    );
  }

  async getTrackingPixels(): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getTrackingPixels(),
      () => this.memStorage.getTrackingPixels()
    );
  }

  async createTrackingPixel(data: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createTrackingPixel(data),
      () => this.memStorage.createTrackingPixel(data)
    );
  }

  async updateTrackingPixel(id: number, data: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.updateTrackingPixel(id, data),
      () => this.memStorage.updateTrackingPixel(id, data)
    );
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteTrackingPixel(id),
      () => this.memStorage.deleteTrackingPixel(id)
    );
  }

  async getWebhookConfigs(): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getWebhookConfigs(),
      () => this.memStorage.getWebhookConfigs()
    );
  }

  async createWebhookConfig(data: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createWebhookConfig(data),
      () => this.memStorage.createWebhookConfig(data)
    );
  }

  async getApiAuthentications(): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getApiAuthentications(),
      () => this.memStorage.getApiAuthentications()
    );
  }

  async createApiAuthentication(data: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createApiAuthentication(data),
      () => this.memStorage.createApiAuthentication(data)
    );
  }

  async getPlatformIntegrations(): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getPlatformIntegrations(),
      () => this.memStorage.getPlatformIntegrations()
    );
  }

  async createPlatformIntegration(data: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createPlatformIntegration(data),
      () => this.memStorage.createPlatformIntegration(data)
    );
  }

  // Publishers
  async getPublishers(): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getPublishers(),
      () => this.memStorage.getPublishers()
    );
  }

  async getPublisher(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getPublisher(id),
      () => this.memStorage.getPublisher(id)
    );
  }

  async createPublisher(publisher: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createPublisher(publisher),
      () => this.memStorage.createPublisher(publisher)
    );
  }

  async updatePublisher(id: number, publisher: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updatePublisher(id, publisher),
      () => this.memStorage.updatePublisher(id, publisher)
    );
  }

  async deletePublisher(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deletePublisher(id),
      () => this.memStorage.deletePublisher(id)
    );
  }

  async getPublisherCampaigns(publisherId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getPublisherCampaigns(publisherId),
      () => this.memStorage.getPublisherCampaigns(publisherId)
    );
  }

  async addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.addPublisherToCampaign(publisherId, campaignId, customPayout),
      () => this.memStorage.addPublisherToCampaign(publisherId, campaignId, customPayout)
    );
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.removePublisherFromCampaign(publisherId, campaignId),
      () => this.memStorage.removePublisherFromCampaign(publisherId, campaignId)
    );
  }

  // Feedback methods
  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    return this.executeOperation(
      () => this.databaseStorage.createFeedback(feedback),
      () => this.memStorage.createFeedback(feedback)
    );
  }

  async getFeedbackHistory(userId: number): Promise<Feedback[]> {
    return this.executeOperation(
      () => this.databaseStorage.getFeedbackHistory(userId),
      () => this.memStorage.getFeedbackHistory(userId)
    );
  }

  async getAllFeedback(userId: number): Promise<Feedback[]> {
    return this.executeOperation(
      () => this.databaseStorage.getAllFeedback(userId),
      () => this.memStorage.getAllFeedback(userId)
    );
  }

  // Phone Numbers
  async getPhoneNumbers(userId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getPhoneNumbers(userId),
      () => this.memStorage.getPhoneNumbers(userId)
    );
  }

  async getPhoneNumber(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getPhoneNumber(id),
      () => this.memStorage.getPhoneNumber(id)
    );
  }

  async createPhoneNumber(phoneNumber: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createPhoneNumber(phoneNumber),
      () => this.memStorage.createPhoneNumber(phoneNumber)
    );
  }

  async updatePhoneNumber(id: number, phoneNumber: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updatePhoneNumber(id, phoneNumber),
      () => this.memStorage.updatePhoneNumber(id, phoneNumber)
    );
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deletePhoneNumber(id),
      () => this.memStorage.deletePhoneNumber(id)
    );
  }

  // Number Pools
  async getNumberPools(userId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getNumberPools(userId),
      () => this.memStorage.getNumberPools(userId)
    );
  }

  async getNumberPool(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getNumberPool(id),
      () => this.memStorage.getNumberPool(id)
    );
  }

  async getPoolNumbers(poolId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getPoolNumbers(poolId),
      () => this.memStorage.getPoolNumbers(poolId)
    );
  }

  async createNumberPool(pool: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createNumberPool(pool),
      () => this.memStorage.createNumberPool(pool)
    );
  }

  async updateNumberPool(id: number, pool: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateNumberPool(id, pool),
      () => this.memStorage.updateNumberPool(id, pool)
    );
  }

  async deleteNumberPool(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteNumberPool(id),
      () => this.memStorage.deleteNumberPool(id)
    );
  }

  async getCampaignsByPool(poolId: number): Promise<Campaign[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignsByPool(poolId),
      () => this.memStorage.getCampaignsByPool(poolId)
    );
  }

  async getCampaignByPoolId(poolId: number): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignByPoolId(poolId),
      () => this.memStorage.getCampaignByPoolId(poolId)
    );
  }

  // RTB methods - add missing methods
  async getRtbTargets(userId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbTargets(userId),
      () => this.memStorage.getRtbTargets(userId)
    );
  }

  async getRtbBidRequests(campaignId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbBidRequests(campaignId),
      () => this.memStorage.getRtbBidRequests(campaignId)
    );
  }

  async getRtbBidResponses(requestId: string): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbBidResponses(requestId),
      () => this.memStorage.getRtbBidResponses(requestId)
    );
  }

  async getRtbRouters(userId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbRouters(userId),
      () => this.memStorage.getRtbRouters(userId)
    );
  }

  // Call Flow methods
  async getCallFlows(userId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCallFlows(userId),
      () => this.memStorage.getCallFlows(userId)
    );
  }

  async getCallFlow(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getCallFlow(id),
      () => this.memStorage.getCallFlow(id)
    );
  }

  async createCallFlow(flow: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createCallFlow(flow),
      () => this.memStorage.createCallFlow(flow)
    );
  }

  async updateCallFlow(id: number, flow: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateCallFlow(id, flow),
      () => this.memStorage.updateCallFlow(id, flow)
    );
  }

  async deleteCallFlow(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteCallFlow(id),
      () => this.memStorage.deleteCallFlow(id)
    );
  }
}

export const storage = new HybridStorage();