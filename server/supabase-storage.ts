import { eq, desc, count, sql } from 'drizzle-orm';
import { db } from './db';
import { campaigns, agents, calls, users, type Campaign, type InsertCampaign, type Agent, type InsertAgent, type Call, type InsertCall, type User, type InsertUser } from '@shared/schema';
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
    const result = await db.delete(campaigns).where(eq(campaigns.id, id)).returning();
    return result.length > 0;
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(desc(agents.createdAt));
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    return result[0];
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await db.insert(agents).values(agent).returning();
    return result[0];
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const result = await db.update(agents)
      .set(agent)
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
    const result = await db.insert(calls).values(call).returning();
    return result[0];
  }

  // Stats
  async getStats(): Promise<{
    activeCampaigns: number;
    totalCalls: number;
    successRate: string;
    activeAgents: number;
  }> {
    const [activeCampaignsResult] = await db
      .select({ count: count() })
      .from(campaigns)
      .where(eq(campaigns.status, 'active'));

    const [totalCallsResult] = await db
      .select({ count: count() })
      .from(calls);

    const [successfulCallsResult] = await db
      .select({ count: count() })
      .from(calls)
      .where(eq(calls.status, 'completed'));

    const [activeAgentsResult] = await db
      .select({ count: count() })
      .from(agents)
      .where(eq(agents.status, 'online'));

    const totalCalls = totalCallsResult.count;
    const successfulCalls = successfulCallsResult.count;
    const successRate = totalCalls > 0 
      ? ((successfulCalls / totalCalls) * 100).toFixed(1)
      : "0.0";

    return {
      activeCampaigns: activeCampaignsResult.count,
      totalCalls,
      successRate: `${successRate}%`,
      activeAgents: activeAgentsResult.count
    };
  }
}

export const storage = new SupabaseStorage();