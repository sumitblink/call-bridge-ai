import type { Campaign, Buyer, Call, Agent, CallLog } from "@shared/schema";

// Simple user-based storage to keep data separate for each user
class UserBasedStorage {
  private userCampaigns: Map<string, Campaign[]> = new Map();
  private userBuyers: Map<string, Buyer[]> = new Map();
  private userCalls: Map<string, Call[]> = new Map();
  private userAgents: Map<string, Agent[]> = new Map();
  private userCallLogs: Map<string, CallLog[]> = new Map();
  
  private nextCampaignId = 1;
  private nextBuyerId = 1;
  private nextCallId = 1;
  private nextAgentId = 1;
  private nextCallLogId = 1;

  // Initialize clean data structure for a new user
  private initializeUserData(userId: string) {
    if (!this.userCampaigns.has(userId)) {
      // Initialize empty arrays - no sample data for clean onboarding
      this.userCampaigns.set(userId, []);
      this.userBuyers.set(userId, []);
      this.userCalls.set(userId, []);
      this.userAgents.set(userId, []);
      this.userCallLogs.set(userId, []);
      
      console.log(`UserBasedStorage: Initialized clean data structure for user ${userId} - no sample data`);
    }
  }

  // Get user campaigns
  getUserCampaigns(userId: string): Campaign[] {
    this.initializeUserData(userId);
    return this.userCampaigns.get(userId) || [];
  }

  // Get user buyers
  getUserBuyers(userId: string): Buyer[] {
    this.initializeUserData(userId);
    return this.userBuyers.get(userId) || [];
  }

  // Get user calls
  getUserCalls(userId: string): Call[] {
    this.initializeUserData(userId);
    return this.userCalls.get(userId) || [];
  }

  // Get user agents
  getUserAgents(userId: string): Agent[] {
    this.initializeUserData(userId);
    return this.userAgents.get(userId) || [];
  }

  // Get user stats
  getUserStats(userId: string) {
    this.initializeUserData(userId);
    const campaigns = this.getUserCampaigns(userId);
    const calls = this.getUserCalls(userId);
    const agents = this.getUserAgents(userId);
    const buyers = this.getUserBuyers(userId);
    
    const completedCalls = calls.filter(c => c.status === 'completed');
    const successRate = calls.length > 0 ? ((completedCalls.length / calls.length) * 100).toFixed(1) : "0.0";
    const avgResponseTime = buyers.length > 0 ? Math.round(buyers.reduce((sum, b) => sum + b.avgResponseTime, 0) / buyers.length) : 0;

    return {
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalCalls: calls.length,
      successRate: successRate + "%",
      activeAgents: agents.filter(a => a.status === 'active').length,
      activeBuyers: buyers.filter(b => b.status === 'active').length,
      avgResponseTime
    };
  }

  // Add a new campaign for user
  addUserCampaign(userId: string, campaign: Omit<Campaign, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Campaign {
    this.initializeUserData(userId);
    const newCampaign: Campaign = {
      ...campaign,
      id: this.nextCampaignId++,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const userCampaigns = this.userCampaigns.get(userId) || [];
    userCampaigns.push(newCampaign);
    this.userCampaigns.set(userId, userCampaigns);
    
    return newCampaign;
  }

  // Add a new buyer for user
  addUserBuyer(userId: string, buyer: Omit<Buyer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Buyer {
    this.initializeUserData(userId);
    const newBuyer: Buyer = {
      ...buyer,
      id: this.nextBuyerId++,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const userBuyers = this.userBuyers.get(userId) || [];
    userBuyers.push(newBuyer);
    this.userBuyers.set(userId, userBuyers);
    
    return newBuyer;
  }
}

export const userStorage = new UserBasedStorage();