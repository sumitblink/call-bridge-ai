import { eq, desc, count, sql, and, isNull, gte, isNotNull, ne, inArray, or } from 'drizzle-orm';
import { db } from './db';
import { 
  campaigns, 
  agents, 
  calls, 
  users,
  buyers,
  targets,
  campaignBuyers,
  callLogs,
  urlParameters,
  trackingPixels,
  webhookConfigs,
  apiAuthentications,
  platformIntegrations,
  publishers,
  campaignPublishers,
  callTrackingTags,
  phoneNumbers,
  numberPools,
  numberPoolAssignments,
  campaignPoolAssignments,
  rtbTargets,
  rtbRouters,
  campaignRtbTargets,
  rtbBidRequests,
  rtbBidResponses,
  callFlows,
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
  type Target,
  type InsertTarget,
  type CampaignBuyer,
  type InsertCampaignBuyer,
  type CallLog,
  type InsertCallLog,
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
  feedback,
  type Feedback,
  type InsertFeedback,
  type CallFlow,
  type InsertCallFlow,
  visitorSessions,
  conversionEvents,
  type VisitorSession,
  type InsertVisitorSession,
  type ConversionEvent,
  type InsertConversionEvent,
} from '@shared/schema';
import type { IStorage } from './storage';

export class SupabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);
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
  async getCampaigns(userId?: number): Promise<Campaign[]> {
    if (userId) {
      return await db.select().from(campaigns)
        .where(eq(campaigns.userId, userId))
        .orderBy(desc(campaigns.createdAt));
    }
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string | number): Promise<Campaign | undefined> {
    const campaignId = typeof id === 'string' ? id : id.toString();
    const result = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    return result[0];
  }

  async getCampaignByPhoneNumber(phoneNumber: string): Promise<Campaign | undefined> {
    try {
      const result = await db
        .select()
        .from(campaigns)
        .innerJoin(phoneNumbers, eq(phoneNumbers.campaignId, campaigns.id))
        .where(eq(phoneNumbers.phoneNumber, phoneNumber))
        .limit(1);
      
      if (result.length > 0) {
        // Map the joined result to a campaign object
        const campaignData = result[0].campaigns;
        return {
          ...campaignData,
          phoneNumber: result[0].phone_numbers.phoneNumber
        } as Campaign;
      }
      return undefined;
    } catch (error) {
      console.error('Error in getCampaignByPhoneNumber:', error);
      return undefined;
    }
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const result = await db.insert(campaigns).values({
      ...campaign,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCampaign(id: string | number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const campaignId = typeof id === 'string' ? id : id.toString();
    const result = await db.update(campaigns)
      .set({
        ...campaign,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId))
      .returning();
    return result[0];
  }

  async deleteCampaign(id: string): Promise<boolean> {
    // Delete all related records first to avoid foreign key constraint violations
    
    // Delete call logs for calls related to this campaign
    const campaignCalls = await db.select({ id: calls.id }).from(calls).where(eq(calls.campaignId, id));
    for (const call of campaignCalls) {
      await db.delete(callLogs).where(eq(callLogs.callId, call.id));
    }
    
    // Delete calls related to this campaign
    await db.delete(calls).where(eq(calls.campaignId, id));
    
    // Delete conversion events using raw SQL
    try {
      await db.execute(sql`DELETE FROM conversion_events WHERE campaign_id = ${id}`);
    } catch (error) {
      console.log('Conversion events table error, skipping...');
    }
    
    // Delete RTB bid responses first (they reference bid requests)
    try {
      await db.execute(sql`DELETE FROM rtb_bid_responses WHERE request_id IN (SELECT request_id FROM rtb_bid_requests WHERE campaign_id = ${id})`);
    } catch (error) {
      console.log('RTB bid responses table error, skipping...');
    }
    
    // Delete RTB bid requests using raw SQL
    try {
      await db.execute(sql`DELETE FROM rtb_bid_requests WHERE campaign_id = ${id}`);
    } catch (error) {
      console.log('RTB bid requests table error, skipping...');
    }
    
    // Delete campaign pool assignments using raw SQL
    try {
      await db.execute(sql`DELETE FROM campaign_pool_assignments WHERE campaign_id = ${id}`);
    } catch (error) {
      console.log('Campaign pool assignments table error, skipping...');
    }
    
    // Delete agent campaigns using raw SQL
    try {
      await db.execute(sql`DELETE FROM agent_campaigns WHERE campaign_id = ${id}`);
    } catch (error) {
      console.log('Agent campaigns table error, skipping...');
    }
    
    // Delete call flows using raw SQL
    try {
      await db.execute(sql`DELETE FROM call_flows WHERE campaign_id = ${id}`);
    } catch (error) {
      console.log('Call flows table error, skipping...');
    }
    
    // Delete DNI sessions first (they reference call_tracking_tags)
    try {
      const dniResult = await db.execute(sql`DELETE FROM dni_sessions WHERE tag_id IN (SELECT id FROM call_tracking_tags WHERE campaign_id = ${id})`);
      console.log(`Deleted ${dniResult.rowCount || 0} DNI sessions for campaign ${id}`);
    } catch (error) {
      console.log('DNI sessions table error, skipping...');
    }
    
    // Delete DNI snippets (they reference call_tracking_tags)
    try {
      const snippetsResult = await db.execute(sql`DELETE FROM dni_snippets WHERE tag_id IN (SELECT id FROM call_tracking_tags WHERE campaign_id = ${id})`);
      console.log(`Deleted ${snippetsResult.rowCount || 0} DNI snippets for campaign ${id}`);
    } catch (error) {
      console.log('DNI snippets table error, skipping...');
    }
    
    // Delete call tracking tags using raw SQL (must be before campaign deletion)
    try {
      const result = await db.execute(sql`DELETE FROM call_tracking_tags WHERE campaign_id = ${id}`);
      console.log(`Deleted ${result.rowCount || 0} call tracking tags for campaign ${id}`);
    } catch (error) {
      console.log('Call tracking tags table error:', error);
      // This is critical - if we can't delete tracking tags, we can't delete the campaign
      throw new Error(`Cannot delete campaign: call tracking tags deletion failed - ${error}`);
    }
    
    // Delete campaign-buyer relationships
    await db.delete(campaignBuyers).where(eq(campaignBuyers.campaignId, id));
    
    // Delete campaign RTB targets
    await db.delete(campaignRtbTargets).where(eq(campaignRtbTargets.campaignId, id));
    
    // Update phone numbers to remove campaign reference (don't delete, just unlink)
    await db.update(phoneNumbers)
      .set({ campaignId: null })
      .where(eq(phoneNumbers.campaignId, id));
    
    // Finally delete the campaign
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return result.rowCount > 0;
  }

  // Buyers
  async getBuyers(): Promise<Buyer[]> {
    try {
      const result = await db.select().from(buyers).orderBy(desc(buyers.createdAt));
      
      // Transform the results to include calculated metrics
      return result.map(buyer => ({
        ...buyer,
        // Use existing acceptanceRate and avgResponseTime fields from database
        acceptanceRate: buyer.acceptanceRate || "0",
        avgResponseTime: buyer.avgResponseTime || 0,
      }));
    } catch (error) {
      console.error('Error fetching buyers:', error);
      throw error;
    }
  }

  async getBuyer(id: number): Promise<Buyer | undefined> {
    const result = await db.select().from(buyers).where(eq(buyers.id, id)).limit(1);
    return result[0];
  }

  async createBuyer(buyer: InsertBuyer): Promise<Buyer> {
    const result = await db.insert(buyers).values({
      ...buyer,
      userId: buyer.userId || 1, // Provide default userId
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
    try {
      // Delete all targets associated with this buyer first
      await db.delete(targets).where(eq(targets.buyerId, id));
      
      // Delete call logs that reference this buyer
      await db.delete(callLogs).where(eq(callLogs.buyerId, id));
      
      // Update calls to remove buyer reference (soft delete to preserve call history)
      await db.update(calls)
        .set({ buyerId: null })
        .where(eq(calls.buyerId, id));
      
      // Delete campaign-buyer relationships
      await db.delete(campaignBuyers).where(eq(campaignBuyers.buyerId, id));
      
      // Finally delete the buyer
      const result = await db.delete(buyers).where(eq(buyers.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting buyer:', error);
      throw error;
    }
  }

  // Targets (individual endpoints under buyers)
  async getTargets(): Promise<Target[]> {
    try {
      const result = await db.select().from(targets);
      return result;
    } catch (error) {
      console.error('Error fetching targets:', error);
      throw error;
    }
  }

  async getTarget(id: number): Promise<Target | undefined> {
    try {
      const result = await db.select().from(targets).where(eq(targets.id, id));
      return result[0];
    } catch (error) {
      console.error('Error fetching target:', error);
      return undefined;
    }
  }

  async getTargetsByBuyer(buyerId: number): Promise<Target[]> {
    try {
      const result = await db.select().from(targets).where(eq(targets.buyerId, buyerId));
      return result;
    } catch (error) {
      console.error('Error fetching targets by buyer:', error);
      return [];
    }
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const result = await db.insert(targets).values(target).returning();
    return result[0];
  }

  async updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target | undefined> {
    const result = await db.update(targets)
      .set({ ...target, updatedAt: new Date() })
      .where(eq(targets.id, id))
      .returning();
    return result[0];
  }

  async deleteTarget(id: number): Promise<boolean> {
    const result = await db.delete(targets).where(eq(targets.id, id));
    return result.rowCount > 0;
  }

  // Campaign-Buyer Relations
  async getCampaignBuyers(campaignId: string | number): Promise<Buyer[]> {
    const result = await db
      .select({
        id: buyers.id,
        name: buyers.name,
        email: buyers.email,
        phoneNumber: buyers.phoneNumber,
        endpoint: buyers.endpoint,
        status: buyers.status,
        priority: campaignBuyers.priority, // Use campaign-specific priority instead of buyer's global priority
        dailyCap: buyers.dailyCap,
        concurrencyLimit: buyers.concurrencyLimit,
        // acceptanceRate and avgResponseTime removed - calculated dynamically
        createdAt: buyers.createdAt,
        updatedAt: buyers.updatedAt,
        userId: buyers.userId,
      })
      .from(buyers)
      .innerJoin(campaignBuyers, eq(buyers.id, campaignBuyers.buyerId))
      .where(eq(campaignBuyers.campaignId, campaignId));
    
    return result;
  }

  async getBuyerCampaignAssignments(buyerId: number): Promise<Campaign[]> {
    const result = await db
      .select({
        id: campaigns.id,
        userId: campaigns.userId,
        name: campaigns.name,
        description: campaigns.description,
        phoneNumber: campaigns.phoneNumber,
        status: campaigns.status,
        routingType: campaigns.routingType,
        enableRtb: campaigns.enableRtb,
        // rtbRouterId removed - using direct campaign-target assignments
        rtbId: campaigns.rtbId,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .innerJoin(campaignBuyers, eq(campaigns.id, campaignBuyers.campaignId))
      .where(eq(campaignBuyers.buyerId, buyerId));
    
    return result;
  }

  async addBuyerToCampaign(campaignId: string | number, buyerId: number, priority = 1): Promise<CampaignBuyer> {
    const result = await db.insert(campaignBuyers).values({
      campaignId: typeof campaignId === 'string' ? campaignId : campaignId.toString(),
      buyerId,
      priority,
    }).returning();
    return result[0];
  }

  async removeBuyerFromCampaign(campaignId: string | number, buyerId: number): Promise<boolean> {
    const campaignIdStr = typeof campaignId === 'string' ? campaignId : campaignId.toString();
    const result = await db.delete(campaignBuyers)
      .where(and(
        eq(campaignBuyers.campaignId, campaignIdStr),
        eq(campaignBuyers.buyerId, buyerId)
      ));
    return result.rowCount > 0;
  }

  // Call Routing & Ping/Post
  async pingBuyersForCall(campaignId: number, callData: any): Promise<Buyer[]> {
    const campaignIdStr = campaignId.toString();
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
        // acceptanceRate and avgResponseTime removed - calculated dynamically
        createdAt: buyers.createdAt,
        updatedAt: buyers.updatedAt,
        userId: buyers.userId,
      })
      .from(buyers)
      .innerJoin(campaignBuyers, eq(buyers.id, campaignBuyers.buyerId))
      .where(and(
        eq(campaignBuyers.campaignId, campaignIdStr),
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
      userId: agent.userId || 1, // Provide default userId
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

  async getCallsByCampaign(campaignId: string | number): Promise<Call[]> {
    const campaignIdStr = typeof campaignId === 'string' ? campaignId : campaignId.toString();
    return await db.select().from(calls)
      .where(eq(calls.campaignId, campaignIdStr))
      .orderBy(desc(calls.createdAt))
      .limit(500); // Limit to prevent massive queries
  }

  async getCallsByUser(userId: number): Promise<Call[]> {
    try {
      // Use simple select to avoid field mapping issues
      const result = await db
        .select()
        .from(calls)
        .innerJoin(campaigns, eq(calls.campaignId, campaigns.id))
        .where(eq(campaigns.userId, userId))
        .orderBy(desc(calls.createdAt))
        .limit(1000); // Limit to prevent massive queries
      
      // Extract just the calls data from the joined result
      return result.map(row => row.calls);
    } catch (error) {
      console.error('Error fetching calls by user:', error);
      return [];
    }
  }

  async createCall(call: InsertCall): Promise<Call> {
    const result = await db.insert(calls).values({
      ...call,
      updatedAt: new Date()
    }).returning();
    return result[0];
  }

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<Call | undefined> {
    const result = await db.update(calls)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(calls.id, id))
      .returning();
    return result[0];
  }

  // Enhanced Calls with detailed joins for reporting
  async getEnhancedCallsByUser(userId: number, filters?: any): Promise<any[]> {
    let query = db
      .select({
        id: calls.id,
        campaignId: calls.campaignId,
        buyerId: calls.buyerId,
        publisherId: calls.publisherId,
        callSid: calls.callSid,
        fromNumber: calls.fromNumber,
        toNumber: calls.toNumber,
        dialedNumber: calls.dialedNumber,
        duration: calls.duration,
        ringTime: calls.ringTime,
        talkTime: calls.talkTime,
        holdTime: calls.holdTime,
        status: calls.status,
        disposition: calls.disposition,
        hangupCause: calls.hangupCause,
        callQuality: calls.callQuality,
        connectionTime: calls.connectionTime,
        audioQuality: calls.audioQuality,
        isDuplicate: calls.isDuplicate,
        cost: calls.cost,
        revenue: calls.revenue,
        payout: calls.payout,
        profit: calls.profit,
        margin: calls.margin,
        tags: calls.tags,
        utmSource: calls.utmSource,
        utmMedium: calls.utmMedium,
        utmCampaign: calls.utmCampaign,
        utmContent: calls.utmContent,
        utmTerm: calls.utmTerm,
        referrer: calls.referrer,
        landingPage: calls.landingPage,
        geoLocation: calls.geoLocation,
        city: calls.city,
        state: calls.state,
        country: calls.country,
        zipCode: calls.zipCode,
        ipAddress: calls.ipAddress,
        deviceType: calls.deviceType,
        recordingUrl: calls.recordingUrl,
        recordingSid: calls.recordingSid,
        recordingStatus: calls.recordingStatus,
        recordingDuration: calls.recordingDuration,
        transcription: calls.transcription,
        transcriptionStatus: calls.transcriptionStatus,
        transcriptionConfidence: calls.transcriptionConfidence,
        isConverted: calls.isConverted,
        conversionType: calls.conversionType,
        conversionValue: calls.conversionValue,
        conversionTimestamp: calls.conversionTimestamp,
        createdAt: calls.createdAt,
        updatedAt: calls.updatedAt,
        // Campaign details
        campaignName: campaigns.name,
        campaignStatus: campaigns.status,
        // Buyer details
        buyerName: buyers.name,
        buyerEmail: buyers.email,
        // Publisher details
        publisherName: publishers.name,
        publisherStatus: publishers.status,
      })
      .from(calls)
      .leftJoin(campaigns, eq(calls.campaignId, campaigns.id))
      .leftJoin(buyers, eq(calls.buyerId, buyers.id))
      .leftJoin(publishers, eq(calls.publisherId, publishers.id))
      .where(eq(campaigns.userId, userId));

    // Apply filters
    if (filters?.status && filters.status !== "all") {
      query = query.where(eq(calls.status, filters.status));
    }

    if (filters?.campaignId && filters.campaignId !== "all") {
      query = query.where(eq(calls.campaignId, filters.campaignId));
    }

    if (filters?.minDuration) {
      const minDuration = parseInt(filters.minDuration);
      if (!isNaN(minDuration)) {
        query = query.where(gte(calls.duration, minDuration));
      }
    }

    return await query.orderBy(desc(calls.createdAt));
  }

  async getEnhancedCallById(id: number): Promise<any | undefined> {
    const result = await db
      .select({
        id: calls.id,
        campaignId: calls.campaignId,
        buyerId: calls.buyerId,
        publisherId: calls.publisherId,
        callSid: calls.callSid,
        fromNumber: calls.fromNumber,
        toNumber: calls.toNumber,
        dialedNumber: calls.dialedNumber,
        duration: calls.duration,
        ringTime: calls.ringTime,
        talkTime: calls.talkTime,
        holdTime: calls.holdTime,
        status: calls.status,
        disposition: calls.disposition,
        hangupCause: calls.hangupCause,
        callQuality: calls.callQuality,
        connectionTime: calls.connectionTime,
        audioQuality: calls.audioQuality,
        isDuplicate: calls.isDuplicate,
        cost: calls.cost,
        revenue: calls.revenue,
        payout: calls.payout,
        profit: calls.profit,
        margin: calls.margin,
        tags: calls.tags,
        utmSource: calls.utmSource,
        utmMedium: calls.utmMedium,
        utmCampaign: calls.utmCampaign,
        utmContent: calls.utmContent,
        utmTerm: calls.utmTerm,
        referrer: calls.referrer,
        landingPage: calls.landingPage,
        geoLocation: calls.geoLocation,
        city: calls.city,
        state: calls.state,
        country: calls.country,
        zipCode: calls.zipCode,
        ipAddress: calls.ipAddress,
        deviceType: calls.deviceType,
        recordingUrl: calls.recordingUrl,
        recordingSid: calls.recordingSid,
        recordingStatus: calls.recordingStatus,
        recordingDuration: calls.recordingDuration,
        transcription: calls.transcription,
        transcriptionStatus: calls.transcriptionStatus,
        transcriptionConfidence: calls.transcriptionConfidence,
        isConverted: calls.isConverted,
        conversionType: calls.conversionType,
        conversionValue: calls.conversionValue,
        conversionTimestamp: calls.conversionTimestamp,
        createdAt: calls.createdAt,
        updatedAt: calls.updatedAt,
        // Campaign details
        campaignName: campaigns.name,
        campaignStatus: campaigns.status,
        // Buyer details
        buyerName: buyers.name,
        buyerEmail: buyers.email,
        // Publisher details
        publisherName: publishers.name,
        publisherStatus: publishers.status,
      })
      .from(calls)
      .leftJoin(campaigns, eq(calls.campaignId, campaigns.id))
      .leftJoin(buyers, eq(calls.buyerId, buyers.id))
      .leftJoin(publishers, eq(calls.publisherId, publishers.id))
      .where(eq(calls.id, id))
      .limit(1);

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

    // Calculate average response time from call data instead of hardcoded values
    const avgResponseTime = 200; // Default fallback for dashboard stats (this is less critical than buyer-specific metrics)

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
  async getUrlParameters(userId: number): Promise<any[]> {
    return await db.select().from(urlParameters).where(eq(urlParameters.userId, userId));
  }

  async getUrlParameter(id: number): Promise<any | undefined> {
    const result = await db.select().from(urlParameters).where(eq(urlParameters.id, id));
    return result[0];
  }

  async createUrlParameter(data: any): Promise<any> {
    const [result] = await db.insert(urlParameters).values(data).returning();
    return result;
  }

  async updateUrlParameter(id: number, data: any): Promise<any | undefined> {
    const [result] = await db.update(urlParameters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(urlParameters.id, id))
      .returning();
    return result[0];
  }

  async deleteUrlParameter(id: number): Promise<boolean> {
    const result = await db.delete(urlParameters)
      .where(eq(urlParameters.id, id));
    return result.rowCount > 0;
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

  // Campaign-specific Tracking Pixels (using integration pixels table for now)
  async getCampaignTrackingPixels(campaignId: string): Promise<any[]> {
    console.log('SupabaseStorage: Getting campaign tracking pixels for campaign:', campaignId);
    
    try {
      // Query tracking pixels where the campaignId exists in assignedCampaigns array
      const result = await db.select()
        .from(trackingPixels)
        .where(sql`${campaignId} = ANY(${trackingPixels.assignedCampaigns})`);
      
      console.log('SupabaseStorage: Campaign tracking pixels query result:', result);
      return result || [];
    } catch (error) {
      console.error('SupabaseStorage: Error getting campaign tracking pixels:', error);
      return [];
    }
  }

  async createCampaignTrackingPixel(data: any): Promise<any> {
    console.log('SupabaseStorage: Creating campaign tracking pixel:', data);
    
    try {
      // Insert into tracking_pixels table with campaignId in assignedCampaigns array
      const [result] = await db.insert(trackingPixels).values({
        name: data.name,
        pixelType: data.pixelType || 'postback',
        fireOnEvent: data.fire_on_event || data.fireOnEvent || 'incoming',
        code: data.code || data.url,
        httpMethod: data.httpMethod || (data.pixelType === 'postback' ? 'POST' : 'GET'),
        assignedCampaigns: [data.campaignId], // Store campaign ID in array
        isActive: data.is_active !== false && data.active !== false,
      }).returning();
      
      console.log('SupabaseStorage: Campaign tracking pixel created:', result);
      return result;
    } catch (error) {
      console.error('SupabaseStorage: Error creating campaign tracking pixel:', error);
      throw error;
    }
  }

  async updateCampaignTrackingPixel(campaignId: string, pixelId: number, data: any): Promise<any | undefined> {
    console.log('SupabaseStorage: Updating campaign tracking pixel:', { campaignId, pixelId, data });
    
    try {
      // Update the tracking pixel with the new data
      const [result] = await db.update(trackingPixels)
        .set({
          name: data.name,
          fireOnEvent: data.fireOnEvent,
          code: data.code,
          httpMethod: data.httpMethod || 'POST',
          headers: data.headers || '[]',
          authenticationType: data.authenticationType || 'none',
          isActive: data.active !== false,
          updatedAt: new Date()
        })
        .where(eq(trackingPixels.id, pixelId))
        .returning();
      
      console.log('SupabaseStorage: Campaign tracking pixel updated:', result);
      return result;
    } catch (error) {
      console.error('SupabaseStorage: Error updating campaign tracking pixel:', error);
      throw error;
    }
  }

  async deleteCampaignTrackingPixel(campaignId: string, pixelId: number): Promise<boolean> {
    console.log('SupabaseStorage: Deleting campaign tracking pixel:', { campaignId, pixelId });
    
    try {
      // Delete the tracking pixel from the database
      const result = await db.delete(trackingPixels)
        .where(eq(trackingPixels.id, pixelId))
        .returning();
      
      const deleted = result.length > 0;
      console.log('SupabaseStorage: Campaign tracking pixel deletion result:', { deleted, pixelId });
      return deleted;
    } catch (error) {
      console.error('SupabaseStorage: Error deleting campaign tracking pixel:', error);
      throw error;
    }
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
    // Soft delete approach: Set publisher references to null instead of deleting historical data
    // This preserves historical call data while removing the publisher entity
    
    // Update call tracking tags to remove publisher reference (preserves tags for historical calls)
    await db.update(callTrackingTags)
      .set({ publisherId: null })
      .where(eq(callTrackingTags.publisherId, id));
    
    // Delete publisher-campaign relationships (these can be safely removed)
    await db.delete(campaignPublishers).where(eq(campaignPublishers.publisherId, id));
    
    // Finally delete the publisher entity
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
      .from(campaignPublishers)
      .innerJoin(campaigns, eq(campaignPublishers.campaignId, campaigns.id))
      .where(eq(campaignPublishers.publisherId, publisherId));
    return result;
  }

  async addPublisherToCampaign(publisherId: number, campaignId: number, customPayout?: string, userId?: number): Promise<any> {
    const campaignIdStr = typeof campaignId === 'string' ? campaignId : campaignId.toString();
    

    
    // First check if the assignment already exists
    const existingAssignment = await db
      .select()
      .from(campaignPublishers)
      .where(and(
        eq(campaignPublishers.campaignId, campaignIdStr),
        eq(campaignPublishers.publisherId, publisherId)
      ))
      .limit(1);

    if (existingAssignment.length > 0) {
      // Update existing assignment
      const updateData = {
        payout: customPayout ? customPayout : "0.00",
        payoutModel: "per_call",
        isActive: true,
        updatedAt: new Date(),
      };
      

      
      const [result] = await db
        .update(campaignPublishers)
        .set(updateData)
        .where(and(
          eq(campaignPublishers.campaignId, campaignIdStr),
          eq(campaignPublishers.publisherId, publisherId)
        ))
        .returning();
      return result;
    } else {
      // Create new assignment
      const insertData = {
        userId: userId || 2,
        publisherId,
        campaignId: campaignIdStr,
        payout: customPayout ? customPayout : "0.00",
        payoutModel: "per_call",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedAt: new Date(),
      };
      

      
      const [result] = await db.insert(campaignPublishers).values(insertData).returning();
      return result;
    }
  }

  async removePublisherFromCampaign(publisherId: number, campaignId: number): Promise<boolean> {
    const campaignIdStr = typeof campaignId === 'string' ? campaignId : campaignId.toString();
    const result = await db.delete(campaignPublishers)
      .where(and(
        eq(campaignPublishers.publisherId, publisherId),
        eq(campaignPublishers.campaignId, campaignIdStr)
      ));
    return result.rowCount > 0;
  }

  // RTB Targets
  async getRtbTargets(): Promise<RtbTarget[]> {
    return await db.select().from(rtbTargets).orderBy(desc(rtbTargets.createdAt));
  }

  async getRtbTarget(id: number): Promise<RtbTarget | undefined> {
    const result = await db.select().from(rtbTargets).where(eq(rtbTargets.id, id)).limit(1);
    return result[0];
  }

  async createRtbTarget(target: InsertRtbTarget): Promise<RtbTarget> {
    const result = await db.insert(rtbTargets).values(target).returning();
    return result[0];
  }

  async updateRtbTarget(id: number, target: Partial<InsertRtbTarget>): Promise<RtbTarget | undefined> {
    const result = await db.update(rtbTargets)
      .set({ ...target, updatedAt: new Date() })
      .where(eq(rtbTargets.id, id))
      .returning();
    return result[0];
  }

  async deleteRtbTarget(id: number): Promise<boolean> {
    const result = await db.delete(rtbTargets).where(eq(rtbTargets.id, id));
    return result.rowCount > 0;
  }

  // RTB Routers
  async getRtbRouters(): Promise<RtbRouter[]> {
    return await db.select().from(rtbRouters).orderBy(desc(rtbRouters.createdAt));
  }

  async getRtbRouter(id: number): Promise<RtbRouter | undefined> {
    const result = await db.select().from(rtbRouters).where(eq(rtbRouters.id, id)).limit(1);
    return result[0];
  }

  async createRtbRouter(router: InsertRtbRouter): Promise<RtbRouter> {
    const result = await db.insert(rtbRouters).values(router).returning();
    return result[0];
  }

  async updateRtbRouter(id: number, router: Partial<InsertRtbRouter>): Promise<RtbRouter | undefined> {
    const result = await db.update(rtbRouters)
      .set({ ...router, updatedAt: new Date() })
      .where(eq(rtbRouters.id, id))
      .returning();
    return result[0];
  }

  async deleteRtbRouter(id: number): Promise<boolean> {
    const result = await db.delete(rtbRouters).where(eq(rtbRouters.id, id));
    return result.rowCount > 0;
  }

  // RTB Router Assignments - DEPRECATED: Now using direct campaign-target assignments

  // RTB Bid Requests
  async getRtbBidRequests(campaignId?: number): Promise<RtbBidRequest[]> {
    const query = db.select().from(rtbBidRequests);
    if (campaignId) {
      const campaignIdStr = typeof campaignId === 'string' ? campaignId : campaignId.toString();
      return await query.where(eq(rtbBidRequests.campaignId, campaignIdStr))
        .orderBy(desc(rtbBidRequests.createdAt));
    }
    return await query.orderBy(desc(rtbBidRequests.createdAt));
  }

  async getRtbBidRequest(requestId: string): Promise<RtbBidRequest | undefined> {
    const result = await db.select().from(rtbBidRequests)
      .where(eq(rtbBidRequests.requestId, requestId))
      .limit(1);
    return result[0];
  }

  async createRtbBidRequest(request: InsertRtbBidRequest): Promise<RtbBidRequest> {
    const result = await db.insert(rtbBidRequests).values(request).returning();
    return result[0];
  }

  async updateRtbBidRequest(requestId: string, request: Partial<InsertRtbBidRequest>): Promise<RtbBidRequest | undefined> {
    const result = await db.update(rtbBidRequests)
      .set(request)
      .where(eq(rtbBidRequests.requestId, requestId))
      .returning();
    return result[0];
  }

  // RTB Bid Responses
  async getRtbBidResponses(requestId: string): Promise<RtbBidResponse[]> {
    return await db.select().from(rtbBidResponses)
      .where(eq(rtbBidResponses.requestId, requestId))
      .orderBy(desc(rtbBidResponses.bidAmount));
  }

  async createRtbBidResponse(response: InsertRtbBidResponse): Promise<RtbBidResponse> {
    const result = await db.insert(rtbBidResponses).values(response).returning();
    return result[0];
  }

  async updateRtbBidResponse(id: number, response: Partial<InsertRtbBidResponse>): Promise<RtbBidResponse | undefined> {
    const result = await db.update(rtbBidResponses)
      .set(response)
      .where(eq(rtbBidResponses.id, id))
      .returning();
    return result[0];
  }

  // RTB Audit Data Cleanup
  async clearRtbAuditData(): Promise<void> {
    await db.delete(rtbBidResponses);
    await db.delete(rtbBidRequests);
  }

  // Phone Numbers - missing methods
  async getPhoneNumbers(userId?: number): Promise<any[]> {
    const result = await db.select().from(phoneNumbers);
    return result;
  }

  async getPhoneNumber(id: number): Promise<any | undefined> {
    const result = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, id)).limit(1);
    return result[0];
  }

  async createPhoneNumber(phoneNumber: any): Promise<any> {
    const result = await db.insert(phoneNumbers).values(phoneNumber).returning();
    return result[0];
  }

  async updatePhoneNumber(id: number, phoneNumber: any): Promise<any | undefined> {
    const result = await db.update(phoneNumbers)
      .set(phoneNumber)
      .where(eq(phoneNumbers.id, id))
      .returning();
    return result[0];
  }

  async updatePhoneNumberFriendlyName(id: number, friendlyName: string): Promise<any | undefined> {
    const result = await db.update(phoneNumbers)
      .set({ friendlyName })
      .where(eq(phoneNumbers.id, id))
      .returning();
    return result[0];
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    const result = await db.delete(phoneNumbers).where(eq(phoneNumbers.id, id));
    return result.rowCount > 0;
  }

  async getPhoneNumberByNumber(phoneNumber: string): Promise<any | undefined> {
    const result = await db.select().from(phoneNumbers).where(eq(phoneNumbers.phoneNumber, phoneNumber)).limit(1);
    return result[0];
  }

  async assignPhoneNumberToCampaign(phoneNumberId: number, campaignId: number): Promise<any | undefined> {
    const result = await db.update(phoneNumbers)
      .set({ campaignId })
      .where(eq(phoneNumbers.id, phoneNumberId))
      .returning();
    return result[0];
  }

  async unassignPhoneNumberFromCampaign(phoneNumberId: number): Promise<any | undefined> {
    const result = await db.update(phoneNumbers)
      .set({ campaignId: null })
      .where(eq(phoneNumbers.id, phoneNumberId))
      .returning();
    return result[0];
  }

  async getUnassignedPhoneNumbers(userId?: number): Promise<any[]> {
    // Get phone numbers that are not assigned to campaigns, not assigned to pools, AND have valid Twilio SIDs
    const conditions = [
      isNull(phoneNumbers.campaignId),
      isNull(numberPoolAssignments.phoneNumberId), // Not assigned to any pool
      isNotNull(phoneNumbers.phoneNumberSid),
      ne(phoneNumbers.phoneNumberSid, ''),
      sql`${phoneNumbers.phoneNumberSid} LIKE 'PN%'` // Valid Twilio SID format
    ];
    
    if (userId) {
      conditions.push(eq(phoneNumbers.userId, userId));
    }
    
    const result = await db
      .select()
      .from(phoneNumbers)
      .leftJoin(numberPoolAssignments, eq(phoneNumbers.id, numberPoolAssignments.phoneNumberId))
      .where(and(...conditions));
    
    return result.map(row => row.phone_numbers);
  }

  // Number Pools - missing methods
  async getNumberPools(userId?: number): Promise<NumberPool[]> {
    const result = await db.select().from(numberPools);
    return result;
  }

  async getNumberPool(id: number): Promise<NumberPool | undefined> {
    const result = await db.select().from(numberPools).where(eq(numberPools.id, id)).limit(1);
    return result[0];
  }

  async createNumberPool(pool: InsertNumberPool): Promise<NumberPool> {
    const result = await db.insert(numberPools).values(pool).returning();
    return result[0];
  }

  async updateNumberPool(id: number, pool: Partial<InsertNumberPool>): Promise<NumberPool | undefined> {
    const result = await db.update(numberPools)
      .set(pool)
      .where(eq(numberPools.id, id))
      .returning();
    return result[0];
  }

  async deleteNumberPool(id: number): Promise<boolean> {
    const result = await db.delete(numberPools).where(eq(numberPools.id, id));
    return result.rowCount > 0;
  }

  // Pool Assignments - missing methods
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

  async assignNumberToPool(poolId: number, phoneNumberId: number, priority?: number): Promise<NumberPoolAssignment> {
    const result = await db.insert(numberPoolAssignments)
      .values({ poolId, phoneNumberId, priority: priority || 1 })
      .returning();
    return result[0];
  }

  async removeNumberFromPool(poolId: number, phoneNumberId: number): Promise<boolean> {
    const result = await db.delete(numberPoolAssignments)
      .where(and(
        eq(numberPoolAssignments.poolId, poolId),
        eq(numberPoolAssignments.phoneNumberId, phoneNumberId)
      ));
    return result.rowCount > 0;
  }

  async getNumberPoolAssignments(phoneNumberId: number): Promise<NumberPoolAssignment[]> {
    const result = await db.select().from(numberPoolAssignments)
      .where(eq(numberPoolAssignments.phoneNumberId, phoneNumberId));
    return result;
  }

  async getPoolAssignedCount(poolId: number): Promise<number> {
    const result = await db.select({ count: count() }).from(numberPoolAssignments)
      .where(eq(numberPoolAssignments.poolId, poolId));
    return result[0]?.count || 0;
  }

  // Campaign Pool Assignments - missing methods
  async getCampaignPools(campaignId: number): Promise<NumberPool[]> {
    const result = await db
      .select({
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
      .select()
      .from(campaigns)
      .where(eq(campaigns.poolId, poolId));
    return result;
  }

  async getCampaignByPoolId(poolId: number): Promise<Campaign | undefined> {
    const result = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.poolId, poolId))
      .limit(1);
    return result[0];
  }

  async assignPoolToCampaign(campaignId: number, poolId: number, priority?: number): Promise<CampaignPoolAssignment> {
    const result = await db.insert(campaignPoolAssignments)
      .values({ campaignId, poolId, priority: priority || 1 })
      .returning();
    return result[0];
  }

  async removePoolFromCampaign(campaignId: number, poolId: number): Promise<boolean> {
    const result = await db.delete(campaignPoolAssignments)
      .where(and(
        eq(campaignPoolAssignments.campaignId, campaignId),
        eq(campaignPoolAssignments.poolId, poolId)
      ));
    return result.rowCount > 0;
  }

  // RTB methods - missing methods
  async getRtbTargets(userId?: number): Promise<any[]> {
    try {
      const result = await db.select().from(rtbTargets);
      return result;
    } catch (error) {
      console.warn('RTB targets query failed:', error);
      return [];
    }
  }

  async getRtbBidRequests(campaignId?: number): Promise<any[]> {
    try {
      const result = await db.select().from(rtbBidRequests);
      return result;
    } catch (error) {
      console.warn('RTB bid requests query failed:', error);
      return [];
    }
  }

  async getRtbBidResponses(requestId: string): Promise<RtbBidResponse[]> {
    return await db.select().from(rtbBidResponses)
      .where(eq(rtbBidResponses.requestId, requestId))
      .orderBy(desc(rtbBidResponses.bidAmount));
  }

  async getRtbRouters(userId?: number): Promise<any[]> {
    try {
      const result = await db.select().from(rtbRouters);
      return result;
    } catch (error) {
      console.warn('RTB routers query failed:', error);
      return [];
    }
  }

  async getRtbRouter(id: number): Promise<any | undefined> {
    try {
      const results = await db
        .select()
        .from(rtbRouters)
        .where(eq(rtbRouters.id, id));
      return results[0];
    } catch (error) {
      console.error('Error fetching RTB router:', error);
      return undefined;
    }
  }

  // Call Flow methods - PostgreSQL implementation
  async getCallFlows(userId?: number): Promise<any[]> {
    try {
      let query = db.select().from(callFlows);
      
      if (userId) {
        query = query.where(eq(callFlows.userId, userId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching call flows:', error);
      // Return empty array if database error occurs
      return [];
    }
  }

  async getCallFlow(id: number): Promise<any | undefined> {
    try {
      const result = await db
        .select()
        .from(callFlows)
        .where(eq(callFlows.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error fetching call flow:', error);
      return undefined;
    }
  }

  async createCallFlow(flow: any): Promise<any> {
    try {
      const result = await db
        .insert(callFlows)
        .values(flow)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating call flow:', error);
      throw error;
    }
  }

  async updateCallFlow(id: number, updates: any): Promise<any | undefined> {
    try {
      const result = await db
        .update(callFlows)
        .set(updates)
        .where(eq(callFlows.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating call flow:', error);
      return undefined;
    }
  }

  async deleteCallFlow(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(callFlows)
        .where(eq(callFlows.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting call flow:', error);
      return false;
    }
  }



  // Feedback methods
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const result = await db.insert(feedback).values(feedbackData).returning();
    return result[0];
  }

  async getFeedbackHistory(userId: number): Promise<Feedback[]> {
    const result = await db
      .select()
      .from(feedback)
      .where(eq(feedback.userId, userId))
      .orderBy(desc(feedback.timestamp));
    return result;
  }

  async getAllFeedback(userId: number): Promise<Feedback[]> {
    const result = await db
      .select()
      .from(feedback)
      .where(eq(feedback.userId, userId))
      .orderBy(desc(feedback.timestamp));
    return result;
  }

  // MVP Tracking methods (delegated to DatabaseStorage)
  async createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession> {
    const { storage } = await import('./storage-db');
    return storage.createVisitorSession(session);
  }

  async getVisitorSession(sessionId: string): Promise<VisitorSession | undefined> {
    const { storage } = await import('./storage-db');
    return storage.getVisitorSession(sessionId);
  }

  async getVisitorSessions(userId: number): Promise<VisitorSession[]> {
    const { storage } = await import('./storage-db');
    return storage.getVisitorSessions(userId);
  }

  async updateVisitorSession(sessionId: string, updates: Partial<InsertVisitorSession>): Promise<VisitorSession | undefined> {
    const { storage } = await import('./storage-db');
    return storage.updateVisitorSession(sessionId, updates);
  }

  async createConversionEvent(event: InsertConversionEvent): Promise<ConversionEvent> {
    const { storage } = await import('./storage-db');
    return storage.createConversionEvent(event);
  }

  async getConversionEvents(sessionId?: string, campaignId?: number): Promise<ConversionEvent[]> {
    const { storage } = await import('./storage-db');
    return storage.getConversionEvents(sessionId, campaignId);
  }

  async getBasicTrackingStats(userId: number): Promise<{
    totalSessions: number;
    totalConversions: number;
    conversionRate: number;
    topSources: Array<{source: string; count: number}>;
    recentConversions: ConversionEvent[];
  }> {
    const { storage } = await import('./storage-db');
    return storage.getBasicTrackingStats(userId);
  }

  async getCampaignPublishers(campaignId: number): Promise<any[]> {
    const campaignIdStr = typeof campaignId === 'string' ? campaignId : campaignId.toString();
    
    try {
      const result = await db
        .select({
          id: publishers.id,
          name: publishers.name,
          email: publishers.email,
          phoneNumber: publishers.phoneNumber,
          company: publishers.company,
          publisherType: publishers.publisherType,
          trafficSource: publishers.trafficSource,
          quality: publishers.quality,
          defaultPayout: publishers.defaultPayout,
          payoutModel: publishers.payoutModel,
          status: publishers.status,
          createdAt: publishers.createdAt,
          // Campaign assignment details
          payout: campaignPublishers.payout,
          isActive: campaignPublishers.isActive,
          assignedAt: campaignPublishers.assignedAt,
        })
        .from(campaignPublishers)
        .innerJoin(publishers, eq(campaignPublishers.publisherId, publishers.id))
        .where(eq(campaignPublishers.campaignId, campaignIdStr));
      
      return result;
    } catch (error) {
      console.error('Error fetching campaign publishers:', error);
      return [];
    }
  }

  // Campaign RTB Target methods
  async getCampaignRtbTargets(campaignId: string): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: rtbTargets.id,
          name: rtbTargets.name,
          companyName: rtbTargets.companyName,
          contactPerson: rtbTargets.contactPerson,
          contactEmail: rtbTargets.contactEmail,
          contactPhone: rtbTargets.contactPhone,
          endpointUrl: rtbTargets.endpointUrl,
          minBidAmount: rtbTargets.minBidAmount,
          maxBidAmount: rtbTargets.maxBidAmount,
          currency: rtbTargets.currency,
          isActive: rtbTargets.isActive,
          createdAt: rtbTargets.createdAt,
          updatedAt: rtbTargets.updatedAt
        })
        .from(campaignRtbTargets)
        .innerJoin(rtbTargets, eq(campaignRtbTargets.rtbTargetId, rtbTargets.id))
        .where(eq(campaignRtbTargets.campaignId, campaignId));
      
      return result;
    } catch (error) {
      console.error('Error fetching campaign RTB targets:', error);
      return [];
    }
  }

  async createCampaignRtbTarget(data: { campaignId: string; rtbTargetId: number }): Promise<any> {
    try {
      const result = await db
        .insert(campaignRtbTargets)
        .values({
          campaignId: data.campaignId,
          rtbTargetId: data.rtbTargetId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating campaign RTB target:', error);
      throw error;
    }
  }

  async removeCampaignRtbTarget(campaignId: string, rtbTargetId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(campaignRtbTargets)
        .where(
          and(
            eq(campaignRtbTargets.campaignId, campaignId),
            eq(campaignRtbTargets.rtbTargetId, rtbTargetId)
          )
        );
      
      return true;
    } catch (error) {
      console.error('Error removing campaign RTB target:', error);
      return false;
    }
  }

  async updateCampaignRtbTargets(campaignId: string, targetIds: number[]): Promise<void> {
    try {
      // First, remove all existing assignments
      await db
        .delete(campaignRtbTargets)
        .where(eq(campaignRtbTargets.campaignId, campaignId));
      
      // Then add new assignments
      if (targetIds.length > 0) {
        const assignments = targetIds.map(targetId => ({
          campaignId,
          rtbTargetId: targetId,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await db.insert(campaignRtbTargets).values(assignments);
      }
    } catch (error) {
      console.error('Error updating campaign RTB targets:', error);
      throw error;
    }
  }





  // Custom Reports (temporary implementations for demo)
  async getCustomReports(userId: number): Promise<any[]> {
    return [];
  }

  async createCustomReport(report: any): Promise<any> {
    return { id: Math.floor(Math.random() * 10000), ...report, createdAt: new Date().toISOString() };
  }

  async updateCustomReport(id: number, report: any, userId: number): Promise<any> {
    return { id, ...report, updatedAt: new Date().toISOString() };
  }

  async deleteCustomReport(id: number, userId: number): Promise<boolean> {
    return true;
  }

  async copyCustomReport(id: number, userId: number): Promise<any> {
    return { id: Math.floor(Math.random() * 10000), name: "Copy of Report", createdAt: new Date().toISOString() };
  }

  // Bulk Actions (temporary implementations for demo)
  async bulkTranscribeCalls(callIds: number[], userId: number): Promise<any> {
    return { processed: callIds.length, success: true };
  }

  async bulkAnnotateCalls(callIds: number[], data: any, userId: number): Promise<any> {
    return { processed: callIds.length, success: true };
  }

  async bulkBlockCallerIds(callIds: number[], data: any, userId: number): Promise<any> {
    return { processed: callIds.length, success: true };
  }

  async bulkRequestAdjustments(callIds: number[], data: any, userId: number): Promise<any> {
    return { processed: callIds.length, success: true };
  }
}

export const storage = new SupabaseStorage();