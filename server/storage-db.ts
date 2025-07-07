import { 
  users,
  campaigns, 
  buyers,
  campaignBuyers,
  calls,
  callLogs,
  agents,
  agentCampaigns,
  agentStatusLogs,
  agentCalls,
  trackingPixels,
  phoneNumbers,
  publishers,
  publisherCampaigns,
  numberPools,
  numberPoolAssignments,
  campaignPoolAssignments,
  callTrackingTags,
  dniSnippets,
  rtbTargets,
  rtbRouters,
  rtbRouterAssignments,
  rtbBidRequests,
  rtbBidResponses,
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
  type NumberPool,
  type InsertNumberPool,
  type NumberPoolAssignment,
  type InsertNumberPoolAssignment,
  type CampaignPoolAssignment,
  type InsertCampaignPoolAssignment,
  type RtbTarget,
  type InsertRtbTarget,
  type RtbRouter,
  type InsertRtbRouter,
  type RtbRouterAssignment,
  type InsertRtbRouterAssignment,
  type RtbBidRequest,
  type InsertRtbBidRequest,
  type RtbBidResponse,
  type InsertRtbBidResponse,
} from '@shared/schema';
import { db } from './db';
import { eq, and, sql, inArray } from 'drizzle-orm';
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
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.phoneNumber, phoneNumber));
    return campaign;
  }

  async getCampaignByPoolId(poolId: number): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.poolId, poolId));
    return campaign;
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    const [result] = await db
      .select({
        id: campaigns.id,
        userId: campaigns.userId,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        phoneNumber: campaigns.phoneNumber,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .innerJoin(phoneNumbers, eq(phoneNumbers.campaignId, campaigns.id))
      .where(eq(phoneNumbers.phoneNumber, phoneNumber));
    
    return result || undefined;
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
      // Delete related records in proper order to avoid foreign key constraints
      
      // 1. Delete DNI snippets for tracking tags related to this campaign
      const trackingTagsToDelete = await db.select({ id: callTrackingTags.id })
        .from(callTrackingTags)
        .where(eq(callTrackingTags.campaignId, id));
      
      for (const tag of trackingTagsToDelete) {
        await db.delete(dniSnippets).where(eq(dniSnippets.tagId, tag.id));
      }
      
      // 2. Delete call tracking tags
      await db.delete(callTrackingTags).where(eq(callTrackingTags.campaignId, id));
      
      // 3. Delete campaign_buyers entries
      await db.delete(campaignBuyers).where(eq(campaignBuyers.campaignId, id));
      
      // 4. Delete publisher_campaigns entries
      await db.delete(publisherCampaigns).where(eq(publisherCampaigns.campaignId, id));
      
      // 5. Finally delete the campaign
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
        priority: campaignBuyers.priority, // Use campaign-specific priority instead of buyer's global priority
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

  // Enhanced Agent operations
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(agents.name);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const agentData = {
      ...agent,
      userId: agent.userId || 1, // Default to user 1 if not provided
      status: agent.status || 'offline',
      skills: agent.skills || [],
      maxConcurrentCalls: agent.maxConcurrentCalls || 1,
      priority: agent.priority || 5,
      timezone: agent.timezone || 'UTC',
      isOnline: false
    };

    const [newAgent] = await db
      .insert(agents)
      .values(agentData)
      .returning();
    return newAgent;
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const updateData = {
      ...agent,
      updatedAt: new Date()
    };

    const [updatedAgent] = await db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, id))
      .returning();
    return updatedAgent || undefined;
  }

  async deleteAgent(id: number): Promise<boolean> {
    const result = await db
      .delete(agents)
      .where(eq(agents.id, id));
    return result.rowCount > 0;
  }

  // Agent Campaign Management
  async getAgentCampaigns(agentId: number): Promise<any[]> {
    try {
      const assignments = await db
        .select({
          campaignId: agentCampaigns.campaignId,
          campaignName: campaigns.name,
          priority: agentCampaigns.priority,
          isActive: agentCampaigns.isActive,
          createdAt: agentCampaigns.createdAt
        })
        .from(agentCampaigns)
        .leftJoin(campaigns, eq(agentCampaigns.campaignId, campaigns.id))
        .where(eq(agentCampaigns.agentId, agentId));
      
      return assignments;
    } catch (error) {
      console.error("Error fetching agent campaigns:", error);
      return [];
    }
  }

  async assignAgentToCampaign(agentId: number, campaignId: number, priority = 1): Promise<any> {
    try {
      const [assignment] = await db
        .insert(agentCampaigns)
        .values({
          agentId,
          campaignId,
          priority,
          isActive: true
        })
        .returning();
      return assignment;
    } catch (error) {
      console.error("Error assigning agent to campaign:", error);
      throw error;
    }
  }

  async removeAgentFromCampaign(agentId: number, campaignId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(agentCampaigns)
        .where(
          and(
            eq(agentCampaigns.agentId, agentId),
            eq(agentCampaigns.campaignId, campaignId)
          )
        );
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error removing agent from campaign:", error);
      return false;
    }
  }

  // Agent Status Management
  async updateAgentStatus(agentId: number, status: string, reason?: string): Promise<Agent | undefined> {
    try {
      const [updatedAgent] = await db
        .update(agents)
        .set({
          status,
          lastActivityAt: new Date(),
          isOnline: status !== 'offline',
          loginTime: status === 'available' ? new Date() : undefined
        })
        .where(eq(agents.id, agentId))
        .returning();

      // Log status change
      if (reason) {
        await db.insert(agentStatusLogs).values({
          agentId,
          newStatus: status,
          reason
        });
      }

      return updatedAgent || undefined;
    } catch (error) {
      console.error("Error updating agent status:", error);
      throw error;
    }
  }

  // Agent Call Management
  async getAgentActiveCalls(agentId: number): Promise<any[]> {
    try {
      const activeCalls = await db
        .select({
          callId: agentCalls.callId,
          status: agentCalls.status,
          assignedAt: agentCalls.assignedAt,
          answeredAt: agentCalls.answeredAt,
          call: calls
        })
        .from(agentCalls)
        .leftJoin(calls, eq(agentCalls.callId, calls.id))
        .where(
          and(
            eq(agentCalls.agentId, agentId),
            inArray(agentCalls.status, ['assigned', 'answered'])
          )
        );
      
      return activeCalls;
    } catch (error) {
      console.error("Error fetching agent active calls:", error);
      return [];
    }
  }

  async getOnlineAgents(): Promise<Agent[]> {
    return await db
      .select()
      .from(agents)
      .where(eq(agents.isOnline, true))
      .orderBy(agents.priority, agents.name);
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

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined> {
    const [updatedCall] = await db
      .update(calls)
      .set(updates)
      .where(eq(calls.id, id))
      .returning();
    return updatedCall;
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

  async getCampaignPublishers(campaignId: number): Promise<any[]> {
    const result = await db
      .select({
        id: publishers.id,
        userId: publishers.userId,
        name: publishers.name,
        email: publishers.email,
        phone: publishers.phone,
        status: publishers.status,
        payoutType: publishers.payoutType,
        payoutAmount: publishers.payoutAmount,
        minCallDuration: publishers.minCallDuration,
        allowedTargets: publishers.allowedTargets,
        trackingSettings: publishers.trackingSettings,
        totalCalls: publishers.totalCalls,
        totalPayout: publishers.totalPayout,
        createdAt: publishers.createdAt,
        updatedAt: publishers.updatedAt,
        customPayout: publisherCampaigns.customPayout,
        isActive: publisherCampaigns.isActive,
      })
      .from(publishers)
      .innerJoin(publisherCampaigns, eq(publishers.id, publisherCampaigns.publisherId))
      .where(eq(publisherCampaigns.campaignId, campaignId));
    return result;
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

  async getUnassignedPhoneNumbers(userId?: number): Promise<PhoneNumber[]> {
    // Get phone numbers that are not assigned to any pool
    const query = db
      .select({
        id: phoneNumbers.id,
        userId: phoneNumbers.userId,
        phoneNumber: phoneNumbers.phoneNumber,
        phoneNumberSid: phoneNumbers.phoneNumberSid,
        friendlyName: phoneNumbers.friendlyName,
        country: phoneNumbers.country,
        numberType: phoneNumbers.numberType,
        capabilities: phoneNumbers.capabilities,
        isActive: phoneNumbers.isActive,
        campaignId: phoneNumbers.campaignId,
        createdAt: phoneNumbers.createdAt,
        updatedAt: phoneNumbers.updatedAt,
      })
      .from(phoneNumbers)
      .leftJoin(numberPoolAssignments, eq(phoneNumbers.id, numberPoolAssignments.phoneNumberId))
      .where(
        and(
          userId ? eq(phoneNumbers.userId, userId) : undefined,
          sql`${numberPoolAssignments.phoneNumberId} IS NULL`
        )
      );

    return await query;
  }

  // Number Pools
  async getNumberPools(userId?: number): Promise<NumberPool[]> {
    if (userId) {
      return await db.select().from(numberPools).where(eq(numberPools.userId, userId));
    }
    return await db.select().from(numberPools);
  }

  async getNumberPool(id: number): Promise<NumberPool | undefined> {
    const [pool] = await db.select().from(numberPools).where(eq(numberPools.id, id));
    return pool;
  }

  async createNumberPool(pool: InsertNumberPool): Promise<NumberPool> {
    try {
      const [newPool] = await db.insert(numberPools).values(pool).returning();
      return newPool;
    } catch (error: any) {
      // Handle duplicate pool name error
      if (error.code === '23505' || error.message?.includes('unique_pool_name_per_user')) {
        throw new Error(`A pool with the name "${pool.name}" already exists. Please choose a different name.`);
      }
      throw error;
    }
  }

  async updateNumberPool(id: number, pool: Partial<InsertNumberPool>): Promise<NumberPool | undefined> {
    const [updatedPool] = await db
      .update(numberPools)
      .set({ ...pool, updatedAt: new Date() })
      .where(eq(numberPools.id, id))
      .returning();
    return updatedPool;
  }

  async deleteNumberPool(id: number): Promise<boolean> {
    try {
      // Delete related records in proper order to avoid foreign key constraints
      
      // 1. Delete DNI snippets for tracking tags related to this pool
      const trackingTagsToDelete = await db.select({ id: callTrackingTags.id })
        .from(callTrackingTags)
        .where(eq(callTrackingTags.poolId, id));
      
      for (const tag of trackingTagsToDelete) {
        await db.delete(dniSnippets).where(eq(dniSnippets.tagId, tag.id));
      }
      
      // 2. Delete call tracking tags that reference this pool
      await db.delete(callTrackingTags).where(eq(callTrackingTags.poolId, id));
      
      // 3. Remove all number assignments
      await db.delete(numberPoolAssignments).where(eq(numberPoolAssignments.poolId, id));
      
      // 4. Remove campaign assignments
      await db.delete(campaignPoolAssignments).where(eq(campaignPoolAssignments.poolId, id));
      
      // 5. Finally delete the pool
      const result = await db.delete(numberPools).where(eq(numberPools.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting number pool:', error);
      return false;
    }
  }

  // Pool Assignments
  async getPoolNumbers(poolId: number): Promise<any[]> {
    const result = await db
      .select({
        id: phoneNumbers.id,
        phoneNumber: phoneNumbers.phoneNumber,
        phoneNumberSid: phoneNumbers.phoneNumberSid,
        friendlyName: phoneNumbers.friendlyName,
        numberType: phoneNumbers.numberType,
        country: phoneNumbers.country,
        isActive: phoneNumbers.isActive,
        priority: numberPoolAssignments.priority,
        assignedAt: numberPoolAssignments.assignedAt,
      })
      .from(numberPoolAssignments)
      .innerJoin(phoneNumbers, eq(numberPoolAssignments.phoneNumberId, phoneNumbers.id))
      .where(eq(numberPoolAssignments.poolId, poolId));
    return result;
  }

  async assignNumberToPool(poolId: number, phoneNumberId: number, priority = 1): Promise<NumberPoolAssignment> {
    // Check if number is already assigned to a different pool
    const [existingAssignment] = await db
      .select({
        poolId: numberPoolAssignments.poolId,
        poolName: numberPools.name
      })
      .from(numberPoolAssignments)
      .innerJoin(numberPools, eq(numberPoolAssignments.poolId, numberPools.id))
      .where(eq(numberPoolAssignments.phoneNumberId, phoneNumberId))
      .limit(1);
    
    if (existingAssignment && existingAssignment.poolId !== poolId) {
      throw new Error(`Phone number is already assigned to pool "${existingAssignment.poolName}". Remove it from that pool first.`);
    }
    
    // If already assigned to the same pool, return existing assignment
    if (existingAssignment && existingAssignment.poolId === poolId) {
      const [existing] = await db
        .select()
        .from(numberPoolAssignments)
        .where(and(
          eq(numberPoolAssignments.poolId, poolId),
          eq(numberPoolAssignments.phoneNumberId, phoneNumberId)
        ))
        .limit(1);
      return existing;
    }
    
    // Create new assignment
    const [assignment] = await db
      .insert(numberPoolAssignments)
      .values({ poolId, phoneNumberId, priority })
      .returning();
    return assignment;
  }

  async removeNumberFromPool(poolId: number, phoneNumberId: number): Promise<boolean> {
    const result = await db
      .delete(numberPoolAssignments)
      .where(and(
        eq(numberPoolAssignments.poolId, poolId),
        eq(numberPoolAssignments.phoneNumberId, phoneNumberId)
      ));
    return result.rowCount > 0;
  }

  async getNumberPoolAssignments(phoneNumberId: number): Promise<NumberPoolAssignment[]> {
    return await db
      .select()
      .from(numberPoolAssignments)
      .where(eq(numberPoolAssignments.phoneNumberId, phoneNumberId));
  }

  async getPoolAssignedCount(poolId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(numberPoolAssignments)
      .where(eq(numberPoolAssignments.poolId, poolId));
    return result?.count || 0;
  }

  // Campaign Pool Assignments
  async getCampaignPools(campaignId: number): Promise<NumberPool[]> {
    const result = await db
      .selectDistinct({
        id: numberPools.id,
        userId: numberPools.userId,
        name: numberPools.name,
        country: numberPools.country,
        numberType: numberPools.numberType,
        poolSize: numberPools.poolSize,
        closedBrowserDelay: numberPools.closedBrowserDelay,
        idleLimit: numberPools.idleLimit,
        prefix: numberPools.prefix,
        isActive: numberPools.isActive,
        createdAt: numberPools.createdAt,
        updatedAt: numberPools.updatedAt,
      })
      .from(campaignPoolAssignments)
      .innerJoin(numberPools, eq(campaignPoolAssignments.poolId, numberPools.id))
      .where(eq(campaignPoolAssignments.campaignId, campaignId));
    return result;
  }

  async assignPoolToCampaign(campaignId: number, poolId: number, priority = 1): Promise<CampaignPoolAssignment> {
    try {
      const [assignment] = await db
        .insert(campaignPoolAssignments)
        .values({ campaignId, poolId, priority })
        .returning();
      return assignment;
    } catch (error: any) {
      // If duplicate key error, return existing assignment
      if (error.code === '23505' || error.message?.includes('unique_campaign_pool')) {
        const [existing] = await db
          .select()
          .from(campaignPoolAssignments)
          .where(and(
            eq(campaignPoolAssignments.campaignId, campaignId),
            eq(campaignPoolAssignments.poolId, poolId)
          ));
        return existing;
      }
      throw error;
    }
  }

  async removePoolFromCampaign(campaignId: number, poolId: number): Promise<boolean> {
    const result = await db
      .delete(campaignPoolAssignments)
      .where(and(
        eq(campaignPoolAssignments.campaignId, campaignId),
        eq(campaignPoolAssignments.poolId, poolId)
      ));
    return result.rowCount > 0;
  }

  // RTB Targets
  async getRtbTargets(): Promise<RtbTarget[]> {
    return await db.select().from(rtbTargets);
  }

  async getRtbTarget(id: number): Promise<RtbTarget | undefined> {
    const [target] = await db.select().from(rtbTargets).where(eq(rtbTargets.id, id));
    return target;
  }

  async createRtbTarget(target: InsertRtbTarget): Promise<RtbTarget> {
    const [newTarget] = await db.insert(rtbTargets).values(target).returning();
    return newTarget;
  }

  async updateRtbTarget(id: number, target: Partial<InsertRtbTarget>): Promise<RtbTarget | undefined> {
    const [updatedTarget] = await db
      .update(rtbTargets)
      .set({ ...target, updatedAt: new Date() })
      .where(eq(rtbTargets.id, id))
      .returning();
    return updatedTarget;
  }

  async deleteRtbTarget(id: number): Promise<boolean> {
    try {
      // First remove all router assignments for this target
      await db
        .delete(rtbRouterAssignments)
        .where(eq(rtbRouterAssignments.rtbTargetId, id));
      
      // Then delete the target itself
      const result = await db.delete(rtbTargets).where(eq(rtbTargets.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting RTB target:', error);
      return false;
    }
  }

  // RTB Routers
  async getRtbRouters(): Promise<RtbRouter[]> {
    return await db.select().from(rtbRouters);
  }

  async getRtbRouter(id: number): Promise<RtbRouter | undefined> {
    const [router] = await db.select().from(rtbRouters).where(eq(rtbRouters.id, id));
    return router;
  }

  async createRtbRouter(router: InsertRtbRouter): Promise<RtbRouter> {
    const [newRouter] = await db.insert(rtbRouters).values(router).returning();
    return newRouter;
  }

  async updateRtbRouter(id: number, router: Partial<InsertRtbRouter>): Promise<RtbRouter | undefined> {
    const [updatedRouter] = await db
      .update(rtbRouters)
      .set({ ...router, updatedAt: new Date() })
      .where(eq(rtbRouters.id, id))
      .returning();
    return updatedRouter;
  }

  async deleteRtbRouter(id: number): Promise<boolean> {
    // First delete all assignments for this router
    await db.delete(rtbRouterAssignments).where(eq(rtbRouterAssignments.rtbRouterId, id));
    
    // Then delete the router
    const result = await db.delete(rtbRouters).where(eq(rtbRouters.id, id));
    return result.rowCount > 0;
  }

  // RTB Router Assignments
  async getRtbRouterAssignments(routerId?: number): Promise<RtbRouterAssignment[]> {
    if (routerId) {
      return await db.select().from(rtbRouterAssignments).where(eq(rtbRouterAssignments.rtbRouterId, routerId));
    }
    return await db.select().from(rtbRouterAssignments);
  }

  async deleteRtbRouterAssignmentById(id: number): Promise<boolean> {
    const result = await db.delete(rtbRouterAssignments).where(eq(rtbRouterAssignments.id, id));
    return result.rowCount > 0;
  }

  async createRtbRouterAssignment(assignment: InsertRtbRouterAssignment): Promise<RtbRouterAssignment> {
    const [newAssignment] = await db.insert(rtbRouterAssignments).values(assignment).returning();
    return newAssignment;
  }

  async deleteRtbRouterAssignment(routerId: number, targetId: number): Promise<boolean> {
    const result = await db
      .delete(rtbRouterAssignments)
      .where(and(
        eq(rtbRouterAssignments.rtbRouterId, routerId),
        eq(rtbRouterAssignments.rtbTargetId, targetId)
      ));
    return result.rowCount > 0;
  }

  // RTB Bid Requests
  async getRtbBidRequests(campaignId?: number): Promise<RtbBidRequest[]> {
    if (campaignId) {
      return await db.select().from(rtbBidRequests).where(eq(rtbBidRequests.campaignId, campaignId));
    }
    return await db.select().from(rtbBidRequests);
  }

  async createRtbBidRequest(request: InsertRtbBidRequest): Promise<RtbBidRequest> {
    const [newRequest] = await db.insert(rtbBidRequests).values(request).returning();
    return newRequest;
  }

  async updateRtbBidRequest(requestId: string, updates: Partial<InsertRtbBidRequest>): Promise<RtbBidRequest | undefined> {
    const [updatedRequest] = await db
      .update(rtbBidRequests)
      .set(updates)
      .where(eq(rtbBidRequests.requestId, requestId))
      .returning();
    return updatedRequest;
  }

  // RTB Bid Responses
  async getRtbBidResponses(requestId: string): Promise<RtbBidResponse[]> {
    return await db.select().from(rtbBidResponses).where(eq(rtbBidResponses.requestId, requestId));
  }

  async createRtbBidResponse(response: InsertRtbBidResponse): Promise<RtbBidResponse> {
    const [newResponse] = await db.insert(rtbBidResponses).values(response).returning();
    return newResponse;
  }

  async updateRtbBidResponse(id: number, updates: Partial<InsertRtbBidResponse>): Promise<RtbBidResponse | undefined> {
    const [updatedResponse] = await db
      .update(rtbBidResponses)
      .set(updates)
      .where(eq(rtbBidResponses.id, id))
      .returning();
    return updatedResponse;
  }
}

export const storage = new DatabaseStorage();