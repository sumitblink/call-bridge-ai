import { 
  users,
  campaigns, 
  buyers,
  campaignBuyers,
  calls,
  callLogs,
  agents,
  trackingPixels,
  phoneNumbers,
  publishers,
  publisherCampaigns,
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
  type PhoneNumber,
  type InsertPhoneNumber, 
  type CallLog,
  type InsertCallLog,
  type Agent, 
  type InsertAgent,
} from '@shared/schema';
import { db } from './db';
import { eq, and, sql } from 'drizzle-orm';
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
    // First remove buyer from all campaigns
    await db.delete(campaignBuyers).where(eq(campaignBuyers.buyerId, id));
    
    // Then delete the buyer
    const result = await db.delete(buyers).where(eq(buyers.id, id));
    return result.rowCount > 0;
  }

  async getBuyerCampaignAssignments(buyerId: number): Promise<{ campaignId: number; campaignName: string; isActive: boolean }[]> {
    const result = await db
      .select({
        campaignId: campaigns.id,
        campaignName: campaigns.name,
        isActive: sql<boolean>`${campaigns.status} = 'active'`
      })
      .from(campaignBuyers)
      .innerJoin(campaigns, eq(campaignBuyers.campaignId, campaigns.id))
      .where(eq(campaignBuyers.buyerId, buyerId));
    
    return result;
  }

  // Campaign-Buyer relations
  async getCampaignBuyers(campaignId: number): Promise<Buyer[]> {
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
      })
      .from(buyers)
      .innerJoin(campaignBuyers, eq(campaignBuyers.buyerId, buyers.id))
      .where(eq(campaignBuyers.campaignId, campaignId));
    
    return result;
  }

  async addBuyerToCampaign(campaignId: number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    // Check if the relationship already exists
    const existing = await db
      .select()
      .from(campaignBuyers)
      .where(
        and(
          eq(campaignBuyers.campaignId, campaignId),
          eq(campaignBuyers.buyerId, buyerId)
        )
      );

    if (existing.length > 0) {
      // Update existing relationship
      const [updated] = await db
        .update(campaignBuyers)
        .set({
          priority,
          isActive: true,
        })
        .where(
          and(
            eq(campaignBuyers.campaignId, campaignId),
            eq(campaignBuyers.buyerId, buyerId)
          )
        )
        .returning();
      return updated;
    }

    // Create new relationship
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
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          pixel_type as "pixelType",
          fire_on_event as "fireOnEvent", 
          code,
          assigned_campaigns as "assignedCampaigns",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tracking_pixels 
        ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error("Error fetching tracking pixels:", error);
      return [];
    }
  }

  async createTrackingPixel(data: any): Promise<any> {
    try {
      // Ensure assignedCampaigns is properly formatted as an array of strings
      const campaigns = Array.isArray(data.assignedCampaigns) 
        ? data.assignedCampaigns.map(String)
        : data.assignedCampaigns ? [String(data.assignedCampaigns)] : [];
      
      const [result] = await db
        .insert(trackingPixels)
        .values({
          name: data.name,
          pixelType: data.pixelType,
          fireOnEvent: data.fireOnEvent,
          code: data.code,
          assignedCampaigns: campaigns,
          isActive: data.isActive !== undefined ? data.isActive : true,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating tracking pixel:", error);
      throw error;
    }
  }

  async updateTrackingPixel(id: number, data: any): Promise<any> {
    try {
      // Prepare update data with proper array formatting
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.pixelType !== undefined) updateData.pixelType = data.pixelType;
      if (data.fireOnEvent !== undefined) updateData.fireOnEvent = data.fireOnEvent;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.assignedCampaigns !== undefined) {
        const campaigns = Array.isArray(data.assignedCampaigns) 
          ? data.assignedCampaigns.map(String)
          : data.assignedCampaigns ? [String(data.assignedCampaigns)] : [];
        updateData.assignedCampaigns = campaigns;
      }
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const [result] = await db
        .update(trackingPixels)
        .set(updateData)
        .where(eq(trackingPixels.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating tracking pixel:", error);
      throw error;
    }
  }

  async deleteTrackingPixel(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(trackingPixels)
        .where(eq(trackingPixels.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting tracking pixel:", error);
      return false;
    }
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

  // Phone Numbers Management
  async getPhoneNumbers(userId?: number): Promise<PhoneNumber[]> {
    if (userId) {
      return await db.select().from(phoneNumbers).where(eq(phoneNumbers.userId, userId));
    }
    return await db.select().from(phoneNumbers);
  }

  async getPhoneNumber(id: number): Promise<PhoneNumber | undefined> {
    const [number] = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, id));
    return number;
  }

  async createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber> {
    const [newNumber] = await db
      .insert(phoneNumbers)
      .values(phoneNumber)
      .returning();
    return newNumber;
  }

  async updatePhoneNumber(id: number, phoneNumber: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined> {
    const [updatedNumber] = await db
      .update(phoneNumbers)
      .set(phoneNumber)
      .where(eq(phoneNumbers.id, id))
      .returning();
    return updatedNumber;
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    const result = await db
      .delete(phoneNumbers)
      .where(eq(phoneNumbers.id, id));
    return result.rowCount > 0;
  }

  async getPhoneNumberByNumber(phoneNumber: string): Promise<PhoneNumber | undefined> {
    const [number] = await db.select().from(phoneNumbers).where(eq(phoneNumbers.phoneNumber, phoneNumber));
    return number;
  }

  async assignPhoneNumberToCampaign(phoneNumberId: number, campaignId: number): Promise<PhoneNumber | undefined> {
    const [updatedNumber] = await db
      .update(phoneNumbers)
      .set({ campaignId })
      .where(eq(phoneNumbers.id, phoneNumberId))
      .returning();
    return updatedNumber;
  }

  async unassignPhoneNumberFromCampaign(phoneNumberId: number): Promise<PhoneNumber | undefined> {
    const [updatedNumber] = await db
      .update(phoneNumbers)
      .set({ campaignId: null })
      .where(eq(phoneNumbers.id, phoneNumberId))
      .returning();
    return updatedNumber;
  }
}

export const storage = new DatabaseStorage();