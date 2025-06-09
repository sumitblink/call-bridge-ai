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
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
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
    // First delete all campaign-buyer relationships
    await db.delete(campaignBuyers).where(eq(campaignBuyers.campaignId, id));
    
    // Then delete the campaign
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
}

export const storage = new SupabaseStorage();