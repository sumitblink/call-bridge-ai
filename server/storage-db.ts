import { 
  users,
  campaigns, 
  buyers,
  campaignBuyers,
  calls,
  callLogs,
  agents,
  type User, 
  type InsertUser,
  type UpsertUser,
  type Campaign, 
  type InsertCampaign, 
  type Buyer,
  type InsertBuyer,
  type CampaignBuyer,
  type InsertCampaignBuyer,
  type Call, 
  type InsertCall, 
  type CallLog,
  type InsertCallLog,
  type Agent, 
  type InsertAgent,
} from '@shared/schema';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import type { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Campaign operations
  async getCampaigns(userId?: number): Promise<Campaign[]> {
    try {
      if (userId) {
        return await db.select().from(campaigns).where(eq(campaigns.userId, userId));
      }
      return await db.select().from(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns from database:', error);
      throw error;
    }
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.phoneNumber, phoneNumber));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updated] = await db
      .update(campaigns)
      .set(campaign)
      .where(eq(campaigns.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    try {
      // First delete related campaign_buyers entries
      await db.delete(campaignBuyers).where(eq(campaignBuyers.campaignId, id));
      
      // Then delete the campaign
      const result = await db.delete(campaigns).where(eq(campaigns.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return false;
    }
  }

  // Buyer operations
  async getBuyers(userId?: number): Promise<Buyer[]> {
    if (userId) {
      return await db.select().from(buyers).where(eq(buyers.userId, userId));
    }
    return await db.select().from(buyers);
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    const [buyer] = await db.select().from(buyers).where(eq(buyers.id, id));
    return buyer || undefined;
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    const [newBuyer] = await db
      .insert(buyers)
      .values(buyer)
      .returning();
    return newBuyer;
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined> {
    const [updated] = await db
      .update(buyers)
      .set(buyer)
      .where(eq(buyers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBuyer(id: number): Promise<boolean> {
    const result = await db.delete(buyers).where(eq(buyers.id, id));
    return result.rowCount > 0;
  }

  // Campaign-Buyer relations
  async getCampaignBuyers(campaignId: number): Promise<(Buyer & { campaignPriority: number })[]> {
    const result = await db
      .select({
        id: buyers.id,
        userId: buyers.userId,
        name: buyers.name,
        email: buyers.email,
        phoneNumber: buyers.phoneNumber,
        endpoint: buyers.endpoint,
        status: buyers.status,
        priority: buyers.priority,
        dailyCap: buyers.dailyCap,
        concurrencyLimit: buyers.concurrencyLimit,
        acceptanceRate: buyers.acceptanceRate,
        avgResponseTime: buyers.avgResponseTime,
        createdAt: buyers.createdAt,
        updatedAt: buyers.updatedAt,
        campaignPriority: campaignBuyers.priority,
      })
      .from(buyers)
      .innerJoin(campaignBuyers, eq(campaignBuyers.buyerId, buyers.id))
      .where(eq(campaignBuyers.campaignId, campaignId));
    
    return result;
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    const [relation] = await db
      .insert(campaignBuyers)
      .values({
        campaignId,
        buyerId,
        priority,
        isActive: true,
      })
      .returning();
    return relation;
  }

  async removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean> {
    const result = await db
      .delete(campaignBuyers)
      .where(and(
        eq(campaignBuyers.campaignId, campaignId),
        eq(campaignBuyers.buyerId, buyerId)
      ));
    return result.rowCount > 0;
  }

  // Call routing & Ping/Post
  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    // Get buyers for this campaign
    const campaignBuyersList = await this.getCampaignBuyers(campaignId);
    
    // Filter active buyers and simulate ping responses
    const responsiveBuyers = campaignBuyersList.filter(buyer => 
      buyer.status === 'active'
    );
    
    return responsiveBuyers;
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    // Simulate successful call posting
    return true;
  }

  // Agent operations (backward compatibility)
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db
      .insert(agents)
      .values(agent)
      .returning();
    return newAgent;
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [updated] = await db
      .update(agents)
      .set(agent)
      .where(eq(agents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAgent(id: number): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id));
    return result.rowCount > 0;
  }

  // Call operations
  async getCalls(): Promise<Call[]> {
    return await db.select().from(calls);
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.campaignId, campaignId));
  }

  async createCall(call: InsertCall): Promise<Call> {
    const [newCall] = await db
      .insert(calls)
      .values(call)
      .returning();
    return newCall;
  }

  // Call logs
  async getCallLogs(callId: number): Promise<CallLog[]> {
    return await db.select().from(callLogs).where(eq(callLogs.callId, callId));
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const [newLog] = await db
      .insert(callLogs)
      .values(log)
      .returning();
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
    const allCampaigns = await this.getCampaigns();
    const allCalls = await this.getCalls();
    const allAgents = await this.getAgents();
    const allBuyers = await this.getBuyers();

    const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;
    const completedCalls = allCalls.filter(c => c.status === 'completed').length;
    const successRate = allCalls.length > 0 ? 
      ((completedCalls / allCalls.length) * 100).toFixed(1) : '0.0';
    const activeAgents = allAgents.filter(a => a.status === 'active').length;
    const activeBuyers = allBuyers.filter(b => b.status === 'active').length;
    const avgResponseTime = allBuyers.length > 0 ?
      allBuyers.reduce((sum, b) => sum + b.avgResponseTime, 0) / allBuyers.length : 0;

    return {
      activeCampaigns,
      totalCalls: allCalls.length,
      successRate,
      activeAgents,
      activeBuyers,
      avgResponseTime
    };
  }

  // URL Parameters
  async getUrlParameters(): Promise<any[]> {
    return [];
  }

  async createUrlParameter(data: any): Promise<any> {
    return data;
  }

  // Tracking Pixels
  async getTrackingPixels(): Promise<any[]> {
    return [];
  }

  async createTrackingPixel(data: any): Promise<any> {
    return data;
  }

  async updateTrackingPixel(id: number, data: any): Promise<any> {
    return data;
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    return true;
  }

  // Webhook Configs
  async getWebhookConfigs(): Promise<any[]> {
    return [];
  }

  async createWebhookConfig(data: any): Promise<any> {
    return data;
  }

  // API Authentications
  async getApiAuthentications(): Promise<any[]> {
    return [];
  }

  async createApiAuthentication(data: any): Promise<any> {
    return data;
  }

  // Platform Integrations
  async getPlatformIntegrations(): Promise<any[]> {
    return [];
  }

  async createPlatformIntegration(data: any): Promise<any> {
    return data;
  }

  // Publishers
  async getPublishers(): Promise<any[]> {
    return [];
  }

  async getPublisher(id: number): Promise<any | undefined> {
    return undefined;
  }

  async createPublisher(publisher: any): Promise<any> {
    return publisher;
  }

  async updatePublisher(id: number, publisher: any): Promise<any | undefined> {
    return publisher;
  }

  async deletePublisher(id: number): Promise<boolean> {
    return true;
  }

  async getPublisherCampaigns(publisherId: number): Promise<any[]> {
    return [];
  }

  async addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string): Promise<any> {
    return { publisherId, campaignId, customPayout };
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: number): Promise<boolean> {
    return true;
  }
}

export const storage = new DatabaseStorage();