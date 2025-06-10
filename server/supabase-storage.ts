import { eq, desc, count, sql, and } from 'drizzle-orm';
import { db } from './db';
import { 
  campaigns, 
  agents, 
  calls, 
  users,
  buyers,
  campaignBuyers,
  callLogs,
  urlParameters,
  trackingPixels,
  webhookConfigs,
  apiAuthentications,
  platformIntegrations,
  publishers,
  publisherCampaigns,
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

export class SupabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Username field doesn't exist in current schema, fallback to email search
    const result = await db.select().from(users).where(eq(users.email, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async upsertUser(userData: any): Promise<User> {
    const result = await db.insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return result[0];
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    const result = await db.select().from(campaigns).where(eq(campaigns.phoneNumber, phoneNumber)).limit(1);
    return result[0];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const result = await db.insert(campaigns).values({
      ...campaign,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const result = await db.update(campaigns)
      .set({
        ...campaign,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, id))
      .returning();
    return result[0];
  }

  async deleteCampaign(id: number): Promise<boolean> {
    // Delete all related records first to avoid foreign key constraint violations
    
    // Delete call logs for calls related to this campaign
    const campaignCalls = await db.select({ id: calls.id }).from(calls).where(eq(calls.campaignId, id));
    for (const call of campaignCalls) {
      await db.delete(callLogs).where(eq(callLogs.callId, call.id));
    }
    
    // Delete calls related to this campaign
    await db.delete(calls).where(eq(calls.campaignId, id));
    
    // Delete URL parameters related to this campaign
    await db.delete(urlParameters).where(eq(urlParameters.campaignId, id));
    
    // Delete tracking pixels related to this campaign
    // Note: tracking pixels use campaigns array, so we skip this for now
    
    // Delete campaign-buyer relationships
    await db.delete(campaignBuyers).where(eq(campaignBuyers.campaignId, id));
    
    // Delete publisher-campaign relationships
    await db.delete(publisherCampaigns).where(eq(publisherCampaigns.campaignId, id));
    
    // Finally delete the campaign
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return result.rowCount > 0;
  }

  // Buyers
  async getBuyers(): Promise<Buyer[]> {
    return await db.select().from(buyers).orderBy(desc(buyers.createdAt));
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    const result = await db.select().from(buyers).where(eq(buyers.id, id)).limit(1);
    return result[0];
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    const result = await db.insert(buyers).values({
      ...buyer,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateBuyer(id: number, buyer: Partial<InsertBuyer>): Promise<Buyer | undefined> {
    const result = await db.update(buyers)
      .set({
        ...buyer,
        updatedAt: new Date()
      })
      .where(eq(buyers.id, id))
      .returning();
    return result[0];
  }

  async deleteBuyer(id: number): Promise<boolean> {
    // First delete all campaign-buyer relationships
    await db.delete(campaignBuyers).where(eq(campaignBuyers.buyerId, id));
    
    // Then delete the buyer
    const result = await db.delete(buyers).where(eq(buyers.id, id));
    return result.rowCount > 0;
  }

  // Campaign-Buyer Relations
  async getCampaignBuyers(campaignId: number): Promise<Buyer[]> {
    const result = await db
      .select({
        id: buyers.id,
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
      })
      .from(buyers)
      .innerJoin(campaignBuyers, eq(buyers.id, campaignBuyers.buyerId))
      .where(eq(campaignBuyers.campaignId, campaignId));
    
    return result;
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    const result = await db.insert(campaignBuyers).values({
      campaignId,
      buyerId,
      priority,
    }).returning();
    return result[0];
  }

  async removeBuyerFromCampaign(campaignId: number, buyerId: number): Promise<boolean> {
    const result = await db.delete(campaignBuyers)
      .where(and(
        eq(campaignBuyers.campaignId, campaignId),
        eq(campaignBuyers.buyerId, buyerId)
      ));
    return result.rowCount > 0;
  }

  // Call Routing & Ping/Post
  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    const result = await db
      .select({
        id: buyers.id,
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
      })
      .from(buyers)
      .innerJoin(campaignBuyers, eq(buyers.id, campaignBuyers.buyerId))
      .where(and(
        eq(campaignBuyers.campaignId, campaignId),
        eq(buyers.status, "active"),
        eq(campaignBuyers.isActive, true)
      ))
      .orderBy(campaignBuyers.priority);

    return result;
  }

  async postCallToBuyer(buyerId: number, callData: any): Promise<boolean> {
    // Implementation for posting call to buyer endpoint
    return true;
  }

  // Agents (backward compatibility)
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(desc(agents.createdAt));
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    return result[0];
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await db.insert(agents).values({
      ...agent,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const result = await db.update(agents)
      .set({
        ...agent,
        updatedAt: new Date()
      })
      .where(eq(agents.id, id))
      .returning();
    return result[0];
  }

  async deleteAgent(id: number): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id));
    return result.rowCount > 0;
  }

  // Calls
  async getCalls(): Promise<Call[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt));
  }

  async getCallsByCampaign(campaignId: number): Promise<Call[]> {
    return await db.select().from(calls)
      .where(eq(calls.campaignId, campaignId))
      .orderBy(desc(calls.createdAt));
  }

  async createCall(call: InsertCall): Promise<Call> {
    const result = await db.insert(calls).values({
      ...call,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  // Call Logs
  async getCallLogs(callId: number): Promise<CallLog[]> {
    return await db.select().from(callLogs)
      .where(eq(callLogs.callId, callId))
      .orderBy(desc(callLogs.timestamp));
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const result = await db.insert(callLogs).values(log).returning();
    return result[0];
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
    const activeCampaigns = await db.select().from(campaigns).where(eq(campaigns.status, "active"));
    const totalCalls = await db.select().from(calls);
    const activeAgents = await db.select().from(agents).where(eq(agents.status, "active"));
    const activeBuyersList = await db.select().from(buyers).where(eq(buyers.status, "active"));

    const completedCalls = totalCalls.filter(call => call.status === "completed");
    const successRate = totalCalls.length > 0 
      ? ((completedCalls.length / totalCalls.length) * 100).toFixed(2)
      : "0.00";

    const avgResponseTime = activeBuyersList.length > 0
      ? Math.round(activeBuyersList.reduce((sum, buyer) => sum + buyer.avgResponseTime, 0) / activeBuyersList.length)
      : 0;

    return {
      activeCampaigns: activeCampaigns.length,
      totalCalls: totalCalls.length,
      successRate,
      activeAgents: activeAgents.length,
      activeBuyers: activeBuyersList.length,
      avgResponseTime,
    };
  }

  // Integration methods
  async getUrlParameters(): Promise<any[]> {
    return await db.select().from(urlParameters);
  }

  async createUrlParameter(data: any): Promise<any> {
    const [result] = await db.insert(urlParameters).values(data).returning();
    return result;
  }

  async getTrackingPixels(): Promise<any[]> {
    return await db.select().from(trackingPixels);
  }

  async createTrackingPixel(data: any): Promise<any> {
    const [result] = await db.insert(trackingPixels).values(data).returning();
    return result;
  }

  async updateTrackingPixel(id: number, data: any): Promise<any> {
    const [result] = await db.update(trackingPixels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trackingPixels.id, id))
      .returning();
    return result;
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    const result = await db.delete(trackingPixels)
      .where(eq(trackingPixels.id, id));
    return result.rowCount > 0;
  }

  async getWebhookConfigs(): Promise<any[]> {
    return await db.select().from(webhookConfigs);
  }

  async createWebhookConfig(data: any): Promise<any> {
    const [result] = await db.insert(webhookConfigs).values(data).returning();
    return result;
  }

  async getApiAuthentications(): Promise<any[]> {
    return await db.select().from(apiAuthentications);
  }

  async createApiAuthentication(data: any): Promise<any> {
    const [result] = await db.insert(apiAuthentications).values(data).returning();
    return result;
  }

  async getPlatformIntegrations(): Promise<any[]> {
    return await db.select().from(platformIntegrations);
  }

  async createPlatformIntegration(data: any): Promise<any> {
    const [result] = await db.insert(platformIntegrations).values(data).returning();
    return result;
  }

  // Publishers methods
  async getPublishers(): Promise<any[]> {
    return await db.select().from(publishers);
  }

  async getPublisher(id: number): Promise<any | undefined> {
    const result = await db.select().from(publishers).where(eq(publishers.id, id));
    return result[0];
  }

  async createPublisher(publisher: any): Promise<any> {
    const [result] = await db.insert(publishers).values(publisher).returning();
    return result;
  }

  async updatePublisher(id: number, publisher: any): Promise<any | undefined> {
    const [result] = await db.update(publishers).set(publisher).where(eq(publishers.id, id)).returning();
    return result;
  }

  async deletePublisher(id: number): Promise<boolean> {
    // First delete all publisher-campaign relationships
    await db.delete(publisherCampaigns).where(eq(publisherCampaigns.publisherId, id));
    
    // Then delete the publisher
    const result = await db.delete(publishers).where(eq(publishers.id, id));
    return result.rowCount > 0;
  }

  async getPublisherCampaigns(publisherId: number): Promise<any[]> {
    const result = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        description: campaigns.description,
        phoneNumber: campaigns.phoneNumber,
        routingType: campaigns.routingType,
        maxConcurrentCalls: campaigns.maxConcurrentCalls,
        callCap: campaigns.callCap,
        geoTargeting: campaigns.geoTargeting,
        timeZoneRestriction: campaigns.timeZoneRestriction,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(publisherCampaigns)
      .innerJoin(campaigns, eq(publisherCampaigns.campaignId, campaigns.id))
      .where(eq(publisherCampaigns.publisherId, publisherId));
    return result;
  }

  async addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string): Promise<any> {
    const [result] = await db.insert(publisherCampaigns).values({
      publisherId,
      campaignId,
      customPayout,
      isActive: true,
    }).returning();
    return result;
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: number): Promise<boolean> {
    const result = await db.delete(publisherCampaigns)
      .where(and(
        eq(publisherCampaigns.publisherId, publisherId),
        eq(publisherCampaigns.campaignId, campaignId)
      ));
    return result.rowCount > 0;
  }
}

export const storage = new SupabaseStorage();