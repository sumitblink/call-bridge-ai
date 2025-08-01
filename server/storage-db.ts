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
  campaignPublishers,
  numberPools,
  numberPoolAssignments,
  campaignPoolAssignments,
  callTrackingTags,
  dniSnippets,
  rtbTargets,
  rtbRouters,
  campaignRtbTargets,
  rtbBidRequests,
  rtbBidResponses,
  feedback,
  visitorSessions,
  conversionEvents,
  redtrackConfigs,
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
  type CampaignRtbTarget,
  type InsertCampaignRtbTarget,
  type RtbBidRequest,
  type InsertRtbBidRequest,
  type RtbBidResponse,
  type InsertRtbBidResponse,
  type Feedback,
  type InsertFeedback,
  type VisitorSession,
  type InsertVisitorSession,
  type ConversionEvent,
  type InsertConversionEvent,
  type RedtrackConfig,
  type InsertRedtrackConfig,
} from '@shared/schema';
import { db } from './db';
import { eq, and, sql, inArray, isNotNull, ne, isNull } from 'drizzle-orm';
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

  async getCampaign(id: string): Promise<Campaign | undefined> {
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

  async deleteCampaign(id: string): Promise<boolean> {
    try {
      // Delete related records in proper order to avoid foreign key constraints
      
      // 1. Delete call tracking tags if table exists
      try {
        await db.delete(callTrackingTags).where(eq(callTrackingTags.campaignId, id));
      } catch (error) {
        console.log('Call tracking tags table does not exist, skipping...');
      }
      
      // 3. Delete campaign_buyers entries
      await db.delete(campaignBuyers).where(eq(campaignBuyers.campaignId, id));
      
      // 4. Delete campaign RTB targets
      await db.delete(campaignRtbTargets).where(eq(campaignRtbTargets.campaignId, id));
      
      // 5. Update phone numbers to remove campaign reference
      await db.update(phoneNumbers)
        .set({ campaignId: null })
        .where(eq(phoneNumbers.campaignId, id));
      
      // 6. Finally delete the campaign
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
    console.log('[Database] createCall input data:', {
      clickId: call.clickId,
      sessionId: call.sessionId,
      campaignId: call.campaignId,
      callSid: call.callSid
    });
    
    const [newCall] = await db
      .insert(calls)
      .values(call)
      .returning();
      
    console.log('[Database] createCall output data:', {
      id: newCall.id,
      clickId: newCall.clickId,
      sessionId: newCall.sessionId,
      campaignId: newCall.campaignId,
      callSid: newCall.callSid
    });
    
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

  async getCallEvents(callId: number): Promise<any[]> {
    try {
      const events = await db
        .select()
        .from(callEvents)
        .where(eq(callEvents.callId, callId))
        .orderBy(callEvents.timestamp);
      return events;
    } catch (error) {
      console.error('Error fetching call events:', error);
      return [];
    }
  }

  async addCallEvent(callId: number, event: any): Promise<any> {
    try {
      const [result] = await db
        .insert(callEvents)
        .values({
          callId: callId,
          eventType: event.eventType || 'custom',
          nodeId: event.nodeId,
          nodeName: event.nodeName,
          nodeType: event.nodeType,
          stepName: event.stepName,
          userInput: event.userInput,
          duration: event.duration,
          metadata: event.metadata || event,
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error adding call event:', error);
      throw error;
    }
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
    const result = await db.delete(campaignPublishers)
      .where(and(
        eq(campaignPublishers.publisherId, publisherId),
        eq(campaignPublishers.campaignId, campaignId)
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
        customPayout: campaignPublishers.payout,
        isActive: campaignPublishers.isActive,
      })
      .from(publishers)
      .innerJoin(campaignPublishers, eq(publishers.id, campaignPublishers.publisherId))
      .where(eq(campaignPublishers.campaignId, campaignId));
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
    // Get phone numbers that are not assigned to any pool AND have valid Twilio SIDs
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
          sql`${numberPoolAssignments.phoneNumberId} IS NULL`,
          isNotNull(phoneNumbers.phoneNumberSid),
          ne(phoneNumbers.phoneNumberSid, ''),
          sql`${phoneNumbers.phoneNumberSid} LIKE 'PN%'` // Valid Twilio SID format
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

  async getCampaignsByPool(poolId: number): Promise<Campaign[]> {
    const result = await db
      .select({
        id: campaigns.id,
        userId: campaigns.userId,
        name: campaigns.name,
        description: campaigns.description,
        status: campaigns.status,
        phoneNumber: campaigns.phoneNumber,
        poolId: campaigns.poolId,
        routingType: campaigns.routingType,
        callRoutingStrategy: campaigns.callRoutingStrategy,
        maxConcurrentCalls: campaigns.maxConcurrentCalls,
        callCap: campaigns.callCap,
        geoTargeting: campaigns.geoTargeting,
        timeZoneRestriction: campaigns.timeZoneRestriction,
        enableRtb: campaigns.enableRtb,
        rtbRouterId: campaigns.rtbRouterId,
        rtbId: campaigns.rtbId,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(eq(campaigns.poolId, poolId));
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
  async getRtbTargets(userId?: number): Promise<RtbTarget[]> {
    if (userId) {
      return await db.select().from(rtbTargets).where(eq(rtbTargets.userId, userId));
    }
    return await db.select().from(rtbTargets);
  }

  async getRtbTarget(id: number, userId?: number): Promise<RtbTarget | undefined> {
    const whereConditions = [eq(rtbTargets.id, id)];
    if (userId) {
      whereConditions.push(eq(rtbTargets.userId, userId));
    }
    const [target] = await db.select().from(rtbTargets).where(and(...whereConditions));
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
      // First delete all bid responses that reference this target
      await db
        .delete(rtbBidResponses)
        .where(eq(rtbBidResponses.rtbTargetId, id));
      
      // Then delete all bid requests that reference this target as winning target
      await db
        .delete(rtbBidRequests)
        .where(eq(rtbBidRequests.winningTargetId, id));
      
      // Remove all campaign assignments for this target (new architecture)
      await db
        .delete(campaignRtbTargets)
        .where(eq(campaignRtbTargets.rtbTargetId, id));
      
      // Finally delete the target itself
      const result = await db.delete(rtbTargets).where(eq(rtbTargets.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting RTB target:', error);
      return false;
    }
  }

  // RTB Routers
  async getRtbRouters(userId?: number): Promise<RtbRouter[]> {
    if (userId) {
      return await db.select().from(rtbRouters).where(eq(rtbRouters.userId, userId));
    }
    return await db.select().from(rtbRouters);
  }

  async getRtbRouter(id: number, userId?: number): Promise<RtbRouter | undefined> {
    const whereConditions = [eq(rtbRouters.id, id)];
    if (userId) {
      whereConditions.push(eq(rtbRouters.userId, userId));
    }
    const [router] = await db.select().from(rtbRouters).where(and(...whereConditions));
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
    try {
      // Check if any campaigns are using this router
      const campaignsUsingRouter = await db
        .select({ id: campaigns.id, name: campaigns.name })
        .from(campaigns)
        .where(eq(campaigns.rtbRouterId, id));
      
      if (campaignsUsingRouter.length > 0) {
        console.error(`Cannot delete RTB router ${id}: ${campaignsUsingRouter.length} campaigns are using it:`, 
                     campaignsUsingRouter.map(c => `${c.name} (ID: ${c.id})`).join(', '));
        return false;
      }
      
      // First delete all bid responses for targets assigned to this router
      const assignedTargets = await db
        .select({ targetId: rtbRouterAssignments.rtbTargetId })
        .from(rtbRouterAssignments)
        .where(eq(rtbRouterAssignments.rtbRouterId, id));
      
      if (assignedTargets.length > 0) {
        const targetIds = assignedTargets.map(t => t.targetId);
        await db
          .delete(rtbBidResponses)
          .where(inArray(rtbBidResponses.rtbTargetId, targetIds));
      }
      
      // Then delete all bid requests that reference this router
      await db
        .delete(rtbBidRequests)
        .where(eq(rtbBidRequests.rtbRouterId, id));
      
      // Note: RTB Router assignments are no longer used - campaigns now directly assign targets
      
      // Finally delete the router itself
      const result = await db.delete(rtbRouters).where(eq(rtbRouters.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting RTB router:', error);
      return false;
    }
  }

  // Campaign RTB Target Assignments (replaces router assignments)
  async getCampaignRtbTargets(campaignId: string): Promise<CampaignRtbTarget[]> {
    return await db
      .select()
      .from(campaignRtbTargets)
      .where(eq(campaignRtbTargets.campaignId, campaignId));
  }

  async createCampaignRtbTarget(assignment: InsertCampaignRtbTarget): Promise<CampaignRtbTarget> {
    const [newAssignment] = await db.insert(campaignRtbTargets).values(assignment).returning();
    return newAssignment;
  }

  async deleteCampaignRtbTarget(campaignId: number, targetId: number): Promise<boolean> {
    const result = await db.delete(campaignRtbTargets)
      .where(and(
        eq(campaignRtbTargets.campaignId, campaignId),
        eq(campaignRtbTargets.rtbTargetId, targetId)
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

  async getRtbBidRequest(requestId: string): Promise<RtbBidRequest | undefined> {
    const [request] = await db.select().from(rtbBidRequests).where(eq(rtbBidRequests.requestId, requestId));
    return request || undefined;
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

  // Clear all RTB audit data (bid requests and responses)
  async clearRtbAuditData(): Promise<void> {
    try {
      console.log('Clearing RTB audit data: bid responses first, then bid requests');
      
      // Delete all bid responses first (they reference bid requests via request_id)
      const responsesResult = await db.delete(rtbBidResponses);
      console.log(`Deleted ${responsesResult.rowCount} bid responses`);
      
      // Then delete all bid requests
      const requestsResult = await db.delete(rtbBidRequests);
      console.log(`Deleted ${requestsResult.rowCount} bid requests`);
    } catch (error) {
      console.error('Error clearing RTB audit data:', error);
      throw error;
    }
  }

  // Feedback methods
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async getFeedbackHistory(userId: number): Promise<Feedback[]> {
    return await db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(sql`${feedback.timestamp} DESC`);
  }

  async getAllFeedback(userId: number): Promise<Feedback[]> {
    // For now, return all feedback for all users (admin view)
    // In production, you might want to add role-based access control
    return await db.select().from(feedback).orderBy(sql`${feedback.timestamp} DESC`);
  }

  // MVP Tracking methods
  async createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession> {
    const [newSession] = await db.insert(visitorSessions).values(session).returning();
    return newSession;
  }

  async getVisitorSession(sessionId: string): Promise<VisitorSession | undefined> {
    const [session] = await db.select().from(visitorSessions).where(eq(visitorSessions.sessionId, sessionId));
    return session;
  }

  async getVisitorSessions(userId: number): Promise<VisitorSession[]> {
    const sessions = await db.select().from(visitorSessions).where(eq(visitorSessions.userId, userId));
    return sessions;
  }

  async updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorSession>): Promise<VisitorSession | undefined> {
    const [updatedSession] = await db
      .update(visitorSessions)
      .set({ ...updates, lastActivity: new Date() })
      .where(eq(visitorSessions.sessionId, sessionId))
      .returning();
    return updatedSession;
  }

  async createConversionEvent(event: InsertConversionEvent): Promise<ConversionEvent> {
    const [newEvent] = await db.insert(conversionEvents).values(event).returning();
    return newEvent;
  }

  async getConversionEvents(sessionId?: string, campaignId?: number): Promise<ConversionEvent[]> {
    let query = db.select().from(conversionEvents);
    
    if (sessionId && campaignId) {
      query = query.where(and(
        eq(conversionEvents.sessionId, sessionId),
        eq(conversionEvents.campaignId, campaignId)
      ));
    } else if (sessionId) {
      query = query.where(eq(conversionEvents.sessionId, sessionId));
    } else if (campaignId) {
      query = query.where(eq(conversionEvents.campaignId, campaignId));
    }
    
    return await query.orderBy(sql`${conversionEvents.createdAt} DESC`);
  }

  async getBasicTrackingStats(userId: number): Promise<{
    totalSessions: number;
    totalConversions: number;
    conversionRate: number;
    topSources: Array<{source: string; count: number}>;
    recentConversions: ConversionEvent[];
  }> {
    // Get sessions for the user
    const userSessions = await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.userId, userId));

    // Get conversion events for the user's sessions
    const sessionIds = userSessions.map(s => s.sessionId);
    const userConversions = sessionIds.length > 0 
      ? await db
          .select()
          .from(conversionEvents)
          .where(inArray(conversionEvents.sessionId, sessionIds))
          .orderBy(sql`${conversionEvents.createdAt} DESC`)
      : [];

    // Calculate top sources
    const sourceCounts: Record<string, number> = {};
    userSessions.forEach(session => {
      const source = session.source || 'direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentConversions = userConversions.slice(0, 10);

    return {
      totalSessions: userSessions.length,
      totalConversions: userConversions.length,
      conversionRate: userSessions.length > 0 ? (userConversions.length / userSessions.length) * 100 : 0,
      topSources,
      recentConversions
    };
  }

  // RedTrack Integration methods
  async createRedtrackConfig(config: InsertRedtrackConfig): Promise<RedtrackConfig> {
    const [newConfig] = await db
      .insert(redtrackConfigs)
      .values(config)
      .returning();
    return newConfig;
  }

  async getRedtrackConfig(id: number): Promise<RedtrackConfig | undefined> {
    const [config] = await db
      .select()
      .from(redtrackConfigs)
      .where(eq(redtrackConfigs.id, id));
    return config || undefined;
  }

  async getRedtrackConfigs(userId: number): Promise<RedtrackConfig[]> {
    return await db
      .select()
      .from(redtrackConfigs)
      .where(eq(redtrackConfigs.userId, userId))
      .orderBy(sql`${redtrackConfigs.createdAt} DESC`);
  }

  async updateRedtrackConfig(id: number, updates: Partial<InsertRedtrackConfig>): Promise<RedtrackConfig | undefined> {
    const [updatedConfig] = await db
      .update(redtrackConfigs)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(redtrackConfigs.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  async deleteRedtrackConfig(id: number): Promise<boolean> {
    const result = await db
      .delete(redtrackConfigs)
      .where(eq(redtrackConfigs.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();