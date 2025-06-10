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

  // Initialize data for a new user
  private initializeUserData(userId: string) {
    if (!this.userCampaigns.has(userId)) {
      // Create sample campaigns for new user
      const sampleCampaigns: Campaign[] = [
        {
          id: this.nextCampaignId++,
          userId,
          name: "Welcome Campaign",
          description: "Your first campaign to get started",
          status: "active",
          phoneNumber: "+1-555-" + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
          routingType: "round_robin",
          maxConcurrentCalls: 5,
          callCap: 100,
          geoTargeting: ["US", "CA"],
          timeZoneRestriction: "EST",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
      this.userCampaigns.set(userId, sampleCampaigns);

      // Create sample buyers for new user
      const sampleBuyers: Buyer[] = [
        {
          id: this.nextBuyerId++,
          userId,
          name: "Premium Lead Buyer",
          email: "buyer@example.com",
          phoneNumber: "+1-555-" + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
          endpoint: "https://webhook.example.com/leads",
          status: "active",
          priority: 1,
          dailyCap: 50,
          concurrencyLimit: 3,
          acceptanceRate: "85.50",
          avgResponseTime: 250,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
      this.userBuyers.set(userId, sampleBuyers);

      // Create sample calls for new user
      const sampleCalls: Call[] = [
        {
          id: this.nextCallId++,
          campaignId: sampleCampaigns[0].id,
          buyerId: sampleBuyers[0].id,
          callSid: "CA" + Math.random().toString(36).substr(2, 32),
          fromNumber: "+1-555-" + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
          toNumber: "+1-555-" + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
          duration: 180,
          status: "completed",
          callQuality: "good",
          recordingUrl: null,
          recordingSid: null,
          recordingStatus: null,
          recordingDuration: null,
          transcription: null,
          transcriptionStatus: null,
          cost: "0.0150",
          revenue: "5.00",
          geoLocation: "New York, NY",
          userAgent: "TwilioProxy/1.1",
          createdAt: new Date(Date.now() - Math.random() * 86400000),
          updatedAt: new Date(),
        },
        {
          id: this.nextCallId++,
          campaignId: sampleCampaigns[0].id,
          buyerId: sampleBuyers[0].id,
          callSid: "CA" + Math.random().toString(36).substr(2, 32),
          fromNumber: "+1-555-" + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
          toNumber: "+1-555-" + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
          duration: 95,
          status: "completed",
          callQuality: "excellent",
          recordingUrl: null,
          recordingSid: null,
          recordingStatus: null,
          recordingDuration: null,
          transcription: null,
          transcriptionStatus: null,
          cost: "0.0100",
          revenue: "3.50",
          geoLocation: "Los Angeles, CA",
          userAgent: "TwilioProxy/1.1",
          createdAt: new Date(Date.now() - Math.random() * 86400000),
          updatedAt: new Date(),
        }
      ];
      this.userCalls.set(userId, sampleCalls);

      // Create sample agents for new user
      const sampleAgents: Agent[] = [
        {
          id: this.nextAgentId++,
          name: "Customer Service Agent",
          email: "agent@yourcompany.com",
          status: "active",
          callsHandled: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
      this.userAgents.set(userId, sampleAgents);

      this.userCallLogs.set(userId, []);
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