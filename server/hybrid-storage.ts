import { 
  campaigns, 
  agents, 
  calls, 
  users,
  buyers,
  targets,
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
  type Target,
  type InsertTarget,
  type CampaignBuyer,
  type InsertCampaignBuyer,
  type CallLog,
  type InsertCallLog,
  type Feedback,
  type InsertFeedback,
  type VisitorSession,
  type InsertVisitorSession,
  type ConversionEvent,
  type InsertConversionEvent,
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
    // Force database usage since PostgreSQL is available
    try {
      const campaigns = await this.databaseStorage.getCampaigns();
      if (campaigns.length === 0) {
        console.log('Database is empty, populating with sample data...');
        await this.populateDatabase();
      }
      this.useDatabase = true;
      console.log('Using PostgreSQL database - phone numbers will persist');
    } catch (error) {
      console.log('Database error:', error);
      console.log('Database not available, using memory storage with sample data');
      this.useDatabase = false;
    }
  }

  private async populateDatabase() {
    try {
      // First create sample user if it doesn't exist
      try {
        await this.databaseStorage.getUser("1");
      } catch {
        await this.databaseStorage.createUser({
          username: "demo-user",
          email: "demo@example.com",
          password: "demo123"
        });
      }

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
        const result = await supabaseOp();
        // Removed excessive success logging to reduce console noise
        return result;
      } catch (error) {
        console.warn('Database operation failed, trying memory storage:', error);
        // Don't disable database permanently, just fallback for this operation
        const fallbackResult = await memoryOp();
        console.log('[HybridStorage] Memory storage fallback result returned');
        return fallbackResult;
      }
    } else {
      // Only log when actually using memory storage directly
      const memResult = await memoryOp();
      return memResult;
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
  async getCampaigns(userId?: number): Promise<Campaign[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaigns(userId),
      () => this.memStorage.getCampaigns(userId)
    );
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
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

  async updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateCampaign(id, campaign),
      () => this.memStorage.updateCampaign(id, campaign)
    );
  }

  async deleteCampaign(id: string): Promise<boolean> {
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

  // Targets (individual endpoints under buyers)
  async getTargets(): Promise<Target[]> {
    return this.executeOperation(
      () => this.databaseStorage.getTargets(),
      () => this.memStorage.getTargets()
    );
  }

  async getTarget(id: number): Promise<Target | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getTarget(id),
      () => this.memStorage.getTarget(id)
    );
  }

  async getTargetsByBuyer(buyerId: number): Promise<Target[]> {
    return this.executeOperation(
      () => this.databaseStorage.getTargetsByBuyer(buyerId),
      () => this.memStorage.getTargetsByBuyer(buyerId)
    );
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    return this.executeOperation(
      () => this.databaseStorage.createTarget(target),
      () => this.memStorage.createTarget(target)
    );
  }

  async updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateTarget(id, target),
      () => this.memStorage.updateTarget(id, target)
    );
  }

  async deleteTarget(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteTarget(id),
      () => this.memStorage.deleteTarget(id)
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

  async getCallsByCampaign(campaignId: string | number): Promise<Call[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCallsByCampaign(campaignId),
      () => this.memStorage.getCallsByCampaign(campaignId)
    );
  }

  async getCallsByUser(userId: number): Promise<Call[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCallsByUser(userId),
      () => this.memStorage.getCallsByUser(userId)
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

  // Enhanced call status update method for webhook processing
  async updateCallStatus(callId: number, updates: any): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.updateCallStatus(callId, updates),
      () => Promise.resolve(false) // Memory storage fallback
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

  // Campaign-specific Tracking Pixels
  async getCampaignTrackingPixels(campaignId: string): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignTrackingPixels(campaignId),
      () => this.memStorage.getCampaignTrackingPixels(campaignId)
    );
  }

  async createCampaignTrackingPixel(data: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createCampaignTrackingPixel(data),
      () => this.memStorage.createCampaignTrackingPixel(data)
    );
  }

  async deleteCampaignTrackingPixel(campaignId: string, pixelId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteCampaignTrackingPixel(campaignId, pixelId),
      () => this.memStorage.deleteCampaignTrackingPixel(campaignId, pixelId)
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

  async getCampaignPublishers(campaignId: string | number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignPublishers(campaignId),
      () => this.memStorage.getCampaignPublishers ? this.memStorage.getCampaignPublishers(campaignId) : []
    );
  }

  async addPublisherToCampaign(publisherId: number, campaignId: string | number, customPayout?: string, userId?: number): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.addPublisherToCampaign(publisherId, campaignId, customPayout, userId),
      () => this.memStorage.addPublisherToCampaign ? this.memStorage.addPublisherToCampaign(publisherId, campaignId, customPayout, userId) : {}
    );
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: string | number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.removePublisherFromCampaign(publisherId, campaignId),
      () => this.memStorage.removePublisherFromCampaign ? this.memStorage.removePublisherFromCampaign(publisherId, campaignId) : true
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

  async updatePhoneNumberFriendlyName(id: number, friendlyName: string): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updatePhoneNumberFriendlyName(id, friendlyName),
      () => this.memStorage.updatePhoneNumberFriendlyName(id, friendlyName)
    );
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deletePhoneNumber(id),
      () => this.memStorage.deletePhoneNumber(id)
    );
  }

  async getUnassignedPhoneNumbers(userId?: number): Promise<any[]> {
    console.log(`[HybridStorage] getUnassignedPhoneNumbers called with userId: ${userId}, useDatabase: ${this.useDatabase}`);
    
    return this.executeOperation(
      async () => {
        console.log(`[HybridStorage] Using database for unassigned numbers`);
        return this.databaseStorage.getUnassignedPhoneNumbers(userId);
      },
      async () => {
        console.log(`[HybridStorage] Using memory storage for unassigned numbers`);
        return this.memStorage.getUnassignedPhoneNumbers(userId);
      }
    );
  }

  async getPhoneNumberByNumber(phoneNumber: string): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getPhoneNumberByNumber(phoneNumber),
      () => this.memStorage.getPhoneNumberByNumber(phoneNumber)
    );
  }

  async assignPhoneNumberToCampaign(phoneNumberId: number, campaignId: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.assignPhoneNumberToCampaign(phoneNumberId, campaignId),
      () => this.memStorage.assignPhoneNumberToCampaign(phoneNumberId, campaignId)
    );
  }

  async unassignPhoneNumberFromCampaign(phoneNumberId: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.unassignPhoneNumberFromCampaign(phoneNumberId),
      () => this.memStorage.unassignPhoneNumberFromCampaign(phoneNumberId)
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

  // Pool Assignment methods
  async assignNumberToPool(poolId: number, phoneNumberId: number, priority?: number): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.assignNumberToPool(poolId, phoneNumberId, priority),
      () => this.memStorage.assignNumberToPool(poolId, phoneNumberId, priority)
    );
  }

  async removeNumberFromPool(poolId: number, phoneNumberId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.removeNumberFromPool(poolId, phoneNumberId),
      () => this.memStorage.removeNumberFromPool(poolId, phoneNumberId)
    );
  }

  async getNumberPoolAssignments(phoneNumberId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getNumberPoolAssignments(phoneNumberId),
      () => this.memStorage.getNumberPoolAssignments(phoneNumberId)
    );
  }

  async getPoolAssignedCount(poolId: number): Promise<number> {
    return this.executeOperation(
      () => this.databaseStorage.getPoolAssignedCount(poolId),
      () => this.memStorage.getPoolAssignedCount(poolId)
    );
  }

  async assignPoolToCampaign(campaignId: number, poolId: number, priority?: number): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.assignPoolToCampaign(campaignId, poolId, priority),
      () => this.memStorage.assignPoolToCampaign(campaignId, poolId, priority)
    );
  }

  async removePoolFromCampaign(campaignId: number, poolId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.removePoolFromCampaign(campaignId, poolId),
      () => this.memStorage.removePoolFromCampaign(campaignId, poolId)
    );
  }

  async getCampaignPools(campaignId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignPools(campaignId),
      () => this.memStorage.getCampaignPools(campaignId)
    );
  }

  // RTB methods - add missing methods
  async getRtbTargets(userId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbTargets(userId),
      () => this.memStorage.getRtbTargets(userId)
    );
  }

  async getRtbTarget(id: number, userId?: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbTarget(id, userId),
      () => this.memStorage.getRtbTarget(id, userId)
    );
  }

  async createRtbTarget(target: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createRtbTarget(target),
      () => this.memStorage.createRtbTarget(target)
    );
  }

  async updateRtbTarget(id: number, target: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateRtbTarget(id, target),
      () => this.memStorage.updateRtbTarget(id, target)
    );
  }

  async deleteRtbTarget(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteRtbTarget(id),
      () => this.memStorage.deleteRtbTarget(id)
    );
  }

  async getRtbTarget(id: number, userId?: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbTarget(id, userId),
      () => this.memStorage.getRtbTarget(id, userId)
    );
  }

  async clearRtbAuditData(): Promise<void> {
    return this.executeOperation(
      () => this.databaseStorage.clearRtbAuditData(),
      () => this.memStorage.clearRtbAuditData()
    );
  }

  async getRtbBidRequests(campaignId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbBidRequests(campaignId),
      () => this.memStorage.getRtbBidRequests(campaignId)
    );
  }

  async getRtbBidRequest(requestId: string): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbBidRequest(requestId),
      () => this.memStorage.getRtbBidRequest ? this.memStorage.getRtbBidRequest(requestId) : undefined
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

  async getRtbRouter(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbRouter(id),
      () => this.memStorage.getRtbRouter ? this.memStorage.getRtbRouter(id) : undefined
    );
  }

  async getCampaignRtbTargets(campaignId: string): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getCampaignRtbTargets(campaignId),
      () => this.memStorage.getCampaignRtbTargets(campaignId)
    );
  }

  async createCampaignRtbTarget(data: { campaignId: string; rtbTargetId: number }): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createCampaignRtbTarget(data),
      () => this.memStorage.createCampaignRtbTarget(data)
    );
  }

  async removeCampaignRtbTarget(campaignId: string, rtbTargetId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.removeCampaignRtbTarget(campaignId, rtbTargetId),
      () => this.memStorage.removeCampaignRtbTarget(campaignId, rtbTargetId)
    );
  }

  async updateCampaignRtbTargets(campaignId: string, targetIds: number[]): Promise<void> {
    return this.executeOperation(
      () => this.databaseStorage.updateCampaignRtbTargets(campaignId, targetIds),
      () => this.memStorage.updateCampaignRtbTargets(campaignId, targetIds)
    );
  }

  async createCampaignRtbTarget(assignment: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createCampaignRtbTarget(assignment),
      () => this.memStorage.createCampaignRtbTarget ? this.memStorage.createCampaignRtbTarget(assignment) : assignment
    );
  }

  async deleteCampaignRtbTarget(campaignId: number, targetId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteCampaignRtbTarget(campaignId, targetId),
      () => this.memStorage.deleteCampaignRtbTarget ? this.memStorage.deleteCampaignRtbTarget(campaignId, targetId) : true
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

  // MVP Tracking methods
  async createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession> {
    return this.executeOperation(
      () => this.databaseStorage.createVisitorSession(session),
      () => this.memStorage.createVisitorSession(session)
    );
  }

  async getVisitorSession(sessionId: string): Promise<VisitorSession | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getVisitorSession(sessionId),
      () => this.memStorage.getVisitorSession(sessionId)
    );
  }

  async getVisitorSessions(userId?: number): Promise<VisitorSession[]> {
    return this.executeOperation(
      () => this.databaseStorage.getVisitorSessions(userId),
      () => this.memStorage.getVisitorSessions(userId)
    );
  }

  async updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorSession>): Promise<VisitorSession | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateVisitorSession(sessionId, updates),
      () => this.memStorage.updateVisitorSession(sessionId, updates)
    );
  }

  async createConversionEvent(event: InsertConversionEvent): Promise<ConversionEvent> {
    return this.executeOperation(
      () => this.databaseStorage.createConversionEvent(event),
      () => this.memStorage.createConversionEvent(event)
    );
  }

  async getConversionEvents(sessionId?: string, campaignId?: number): Promise<ConversionEvent[]> {
    return this.executeOperation(
      () => this.databaseStorage.getConversionEvents(sessionId, campaignId),
      () => this.memStorage.getConversionEvents(sessionId, campaignId)
    );
  }

  async getBasicTrackingStats(userId: number): Promise<{
    totalSessions: number;
    totalConversions: number;
    conversionRate: number;
    topSources: Array<{source: string; count: number}>;
    recentConversions: ConversionEvent[];
  }> {
    return this.executeOperation(
      () => this.databaseStorage.getBasicTrackingStats(userId),
      () => this.memStorage.getBasicTrackingStats(userId)
    );
  }

  // Enhanced Reporting Methods
  async getPhoneNumberTagsByUser(userId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getPhoneNumberTagsByUser ? this.databaseStorage.getPhoneNumberTagsByUser(userId) : Promise.resolve([]),
      () => this.memStorage.getPhoneNumberTagsByUser(userId)
    );
  }

  async getPhoneNumberTagById(tagId: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getPhoneNumberTagById ? this.databaseStorage.getPhoneNumberTagById(tagId) : Promise.resolve(undefined),
      () => this.memStorage.getPhoneNumberTagById(tagId)
    );
  }

  async createPhoneNumberTag(tag: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createPhoneNumberTag ? this.databaseStorage.createPhoneNumberTag(tag) : Promise.resolve(tag),
      () => this.memStorage.createPhoneNumberTag(tag)
    );
  }

  async updatePhoneNumberTag(tagId: number, tag: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.updatePhoneNumberTag ? this.databaseStorage.updatePhoneNumberTag(tagId, tag) : Promise.resolve(tag),
      () => this.memStorage.updatePhoneNumberTag(tagId, tag)
    );
  }

  async deletePhoneNumberTag(tagId: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deletePhoneNumberTag ? this.databaseStorage.deletePhoneNumberTag(tagId) : Promise.resolve(true),
      () => this.memStorage.deletePhoneNumberTag(tagId)
    );
  }

  async getEnhancedCallsByUser(userId: number, filters?: any): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getEnhancedCallsByUser ? this.databaseStorage.getEnhancedCallsByUser(userId, filters) : Promise.resolve([]),
      () => {
        // Memory storage fallback - return basic calls with some enhancement
        const calls = this.memStorage.getCalls();
        return calls.map(call => ({
          ...call,
          campaignName: "Sample Campaign",
          buyerName: "Sample Buyer",
          publisherName: "Sample Publisher", 
          tags: [],
          profit: 0,
          margin: 0,
          isConverted: false
        }));
      }
    );
  }

  async getEnhancedCallById(callId: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getEnhancedCallById ? this.databaseStorage.getEnhancedCallById(callId) : Promise.resolve(undefined),
      () => {
        // Memory storage fallback - return basic call with some enhancement
        const call = this.memStorage.getCalls().find(c => c.id === callId);
        if (!call) return undefined;
        return {
          ...call,
          campaignName: "Sample Campaign",
          buyerName: "Sample Buyer", 
          publisherName: "Sample Publisher",
          tags: [],
          profit: 0,
          margin: 0,
          isConverted: false
        };
      }
    );
  }

  // RedTrack Integration methods
  async createRedtrackConfig(config: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createRedtrackConfig ? this.databaseStorage.createRedtrackConfig(config) : Promise.resolve({ ...config, id: Date.now() }),
      () => this.memStorage.createRedtrackConfig(config)
    );
  }

  async getRedtrackConfig(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getRedtrackConfig ? this.databaseStorage.getRedtrackConfig(id) : Promise.resolve(undefined),
      () => this.memStorage.getRedtrackConfig(id)
    );
  }

  async getRedtrackConfigs(userId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRedtrackConfigs ? this.databaseStorage.getRedtrackConfigs(userId) : Promise.resolve([]),
      () => this.memStorage.getRedtrackConfigs(userId)
    );
  }

  async updateRedtrackConfig(id: number, updates: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updateRedtrackConfig ? this.databaseStorage.updateRedtrackConfig(id, updates) : Promise.resolve(undefined),
      () => this.memStorage.updateRedtrackConfig(id, updates)
    );
  }

  async deleteRedtrackConfig(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deleteRedtrackConfig ? this.databaseStorage.deleteRedtrackConfig(id) : Promise.resolve(true),
      () => this.memStorage.deleteRedtrackConfig(id)
    );
  }

  // Predictive Routing Configurations
  async getPredictiveRoutingConfigs(userId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getPredictiveRoutingConfigs ? this.databaseStorage.getPredictiveRoutingConfigs(userId) : Promise.resolve([]),
      () => Promise.resolve([]) // No memory fallback for predictive routing
    );
  }

  async getPredictiveRoutingConfig(id: number): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getPredictiveRoutingConfig ? this.databaseStorage.getPredictiveRoutingConfig(id) : Promise.resolve(undefined),
      () => Promise.resolve(undefined)
    );
  }

  async createPredictiveRoutingConfig(config: any): Promise<any> {
    return this.executeOperation(
      () => this.databaseStorage.createPredictiveRoutingConfig ? this.databaseStorage.createPredictiveRoutingConfig(config) : Promise.resolve({ ...config, id: Date.now() }),
      () => Promise.resolve({ ...config, id: Date.now() })
    );
  }

  async updatePredictiveRoutingConfig(id: number, config: any): Promise<any | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.updatePredictiveRoutingConfig ? this.databaseStorage.updatePredictiveRoutingConfig(id, config) : Promise.resolve(undefined),
      () => Promise.resolve(undefined)
    );
  }

  async deletePredictiveRoutingConfig(id: number): Promise<boolean> {
    return this.executeOperation(
      () => this.databaseStorage.deletePredictiveRoutingConfig ? this.databaseStorage.deletePredictiveRoutingConfig(id) : Promise.resolve(true),
      () => Promise.resolve(true)
    );
  }

  // Call Details methods
  async getCall(callId: number): Promise<Call | undefined> {
    return this.executeOperation(
      () => this.databaseStorage.getCall(callId),
      () => this.memStorage.getCall(callId)
    );
  }

  async getRoutingDecisions(callId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRoutingDecisions(callId),
      () => this.memStorage.getRoutingDecisions(callId)
    );
  }

  async getRTBAuctionDetails(callId: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRTBAuctionDetails(callId),
      () => this.memStorage.getRTBAuctionDetails(callId)
    );
  }

  // RTB Inbound Request/Response Logging
  async logRtbInboundRequest(request: any): Promise<void> {
    return this.executeOperation(
      () => this.databaseStorage.logRtbInboundRequest ? this.databaseStorage.logRtbInboundRequest(request) : Promise.resolve(),
      () => Promise.resolve() // Memory storage doesn't persist these logs
    );
  }

  async logRtbInboundResponse(response: any): Promise<void> {
    return this.executeOperation(
      () => this.databaseStorage.logRtbInboundResponse ? this.databaseStorage.logRtbInboundResponse(response) : Promise.resolve(),
      () => Promise.resolve() // Memory storage doesn't persist these logs
    );
  }

  async getRtbInboundRequests(campaignId?: string): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbInboundRequests ? this.databaseStorage.getRtbInboundRequests(campaignId) : Promise.resolve([]),
      () => Promise.resolve([]) // Memory storage returns empty array
    );
  }

  async getRtbInboundResponses(requestId?: number): Promise<any[]> {
    return this.executeOperation(
      () => this.databaseStorage.getRtbInboundResponses ? this.databaseStorage.getRtbInboundResponses(requestId) : Promise.resolve([]),
      () => Promise.resolve([]) // Memory storage returns empty array
    );
  }

}

export const storage = new HybridStorage();