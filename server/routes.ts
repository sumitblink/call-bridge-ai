import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-db";
import { insertCampaignSchema, insertBuyerSchema, insertAgentSchema } from "@shared/schema";
import { twilioService } from "./twilio-service";
import { PixelService, type PixelMacroData, type PixelFireRequest } from "./pixel-service";
import { CallRouter } from "./call-routing";
import { DNIService, type DNIRequest } from "./dni-service";
import { TwilioTrunkService } from "./twilio-trunk-service";
import { NumberProvisioningService } from "./number-provisioning";
import { CallTrackingService } from "./call-tracking-service";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  callTrackingTags, 
  dniSessions, 
  dniSnippets,
  phoneNumbers,
  numberPools,
  publishers,
  insertCallTrackingTagSchema,
  CallTrackingTag,
  InsertCallTrackingTag 
} from "../shared/schema";
import { handleIncomingCall, handleCallStatus, handleRecordingStatus } from "./twilio-webhooks";
import { RTBIdGenerator } from "./rtb-id-generator";
import { z } from "zod";
import twilio from "twilio";
import fetch from "node-fetch";

// Custom authentication middleware for session-based auth
const requireAuth = (req: any, res: Response, next: NextFunction) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessionUser;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware for custom auth
  const session = (await import('express-session')).default;
  const connectPg = (await import('connect-pg-simple')).default;
  const pgStore = connectPg(session);
  
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: 7 * 24 * 60 * 60, // 1 week
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
  }));

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const sessionUser = req.session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let userData = await storage.getUser(sessionUser.id);
      if (!userData) {
        userData = {
          id: sessionUser.id,
          email: sessionUser.email,
          firstName: sessionUser.firstName,
          lastName: sessionUser.lastName,
          profileImageUrl: sessionUser.profileImageUrl,
          password: "",
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Custom login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user in session
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      };

      res.json({ message: "Login successful", user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName 
      }});
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Custom signup endpoint
  app.post('/api/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create username from email
      const username = email.split('@')[0];

      // Create new user
      const newUser = await storage.createUser({
        username,
        email,
        password,
        firstName,
        lastName,
        profileImageUrl: null
      });

      // Store user in session
      (req.session as any).user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl
      };

      res.json({ message: "Account created successfully", user: { 
        id: newUser.id, 
        email: newUser.email, 
        firstName: newUser.firstName, 
        lastName: newUser.lastName 
      }});
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Logout endpoint
  app.post('/api/logout', async (req, res) => {
    req.session?.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Dashboard stats
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Dashboard stats with historical comparison
  app.get('/api/stats/historical', async (req, res) => {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get current stats
      const currentStats = await storage.getStats();
      
      // Get all calls for historical analysis
      const allCalls = await storage.getCalls();
      
      // Calculate weekly comparison
      const currentWeekCalls = allCalls.filter(call => 
        new Date(call.createdAt) >= oneWeekAgo
      );
      
      const previousWeekCalls = allCalls.filter(call => {
        const callDate = new Date(call.createdAt);
        return callDate >= twoWeeksAgo && callDate < oneWeekAgo;
      });
      
      // Calculate monthly comparison
      const currentMonthCalls = allCalls.filter(call => 
        new Date(call.createdAt) >= oneMonthAgo
      );
      
      const previousMonthCalls = allCalls.filter(call => {
        const callDate = new Date(call.createdAt);
        return callDate >= twoMonthsAgo && callDate < oneMonthAgo;
      });

      // Helper functions
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100 * 10) / 10; // Round to 1 decimal
      };

      const getSuccessRate = (calls: any[]) => {
        if (calls.length === 0) return 0;
        const successful = calls.filter(call => call.status === 'completed').length;
        return Math.round((successful / calls.length) * 100 * 10) / 10;
      };

      const formatChange = (change: number) => {
        const sign = change > 0 ? '+' : '';
        return `${sign}${change}%`;
      };

      const getChangeColor = (change: number) => {
        if (change > 0) return 'text-green-600';
        if (change < 0) return 'text-red-600';
        return 'text-gray-600';
      };

      // Calculate changes
      const callsWeeklyChange = calculateChange(currentWeekCalls.length, previousWeekCalls.length);
      const callsMonthlyChange = calculateChange(currentMonthCalls.length, previousMonthCalls.length);
      
      const currentWeekSuccessRate = getSuccessRate(currentWeekCalls);
      const previousWeekSuccessRate = getSuccessRate(previousWeekCalls);
      const successRateWeeklyChange = calculateChange(currentWeekSuccessRate, previousWeekSuccessRate);
      
      const currentMonthSuccessRate = getSuccessRate(currentMonthCalls);
      const previousMonthSuccessRate = getSuccessRate(previousMonthCalls);
      const successRateMonthlyChange = calculateChange(currentMonthSuccessRate, previousMonthSuccessRate);

      // Get campaigns for comparison
      const campaigns = await storage.getCampaigns();
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

      const enrichedStats = {
        ...currentStats,
        changes: {
          activeCampaigns: {
            value: activeCampaigns,
            change: formatChange(0), // Would need historical campaign data
            changeText: "no historical data",
            changeColor: "text-gray-600"
          },
          totalCalls: {
            value: currentStats.totalCalls,
            weeklyChange: formatChange(callsWeeklyChange),
            monthlyChange: formatChange(callsMonthlyChange),
            weeklyChangeText: "from last week",
            monthlyChangeText: "from last month",
            weeklyChangeColor: getChangeColor(callsWeeklyChange),
            monthlyChangeColor: getChangeColor(callsMonthlyChange)
          },
          successRate: {
            value: currentStats.successRate,
            weeklyChange: formatChange(successRateWeeklyChange),
            monthlyChange: formatChange(successRateMonthlyChange),
            weeklyChangeText: "from last week", 
            monthlyChangeText: "from last month",
            weeklyChangeColor: getChangeColor(successRateWeeklyChange),
            monthlyChangeColor: getChangeColor(successRateMonthlyChange)
          }
        },
        periods: {
          currentWeek: {
            calls: currentWeekCalls.length,
            successRate: currentWeekSuccessRate
          },
          previousWeek: {
            calls: previousWeekCalls.length,
            successRate: previousWeekSuccessRate
          },
          currentMonth: {
            calls: currentMonthCalls.length,
            successRate: currentMonthSuccessRate
          },
          previousMonth: {
            calls: previousMonthCalls.length,
            successRate: previousMonthSuccessRate
          }
        }
      };

      res.json(enrichedStats);
    } catch (error) {
      console.error("Error fetching historical stats:", error);
      res.status(500).json({ error: "Failed to fetch historical stats" });
    }
  });

  // Call routing stats and testing endpoints
  app.get("/api/campaigns/:id/routing-stats", requireAuth, async (req: any, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const stats = await CallRouter.getRoutingStats(campaignId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching routing stats:", error);
      res.status(500).json({ error: "Failed to fetch routing stats" });
    }
  });

  app.post("/api/campaigns/:id/test-routing", requireAuth, async (req: any, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const testResults = await CallRouter.testRouting(campaignId);
      res.json({ campaignId, testResults });
    } catch (error) {
      console.error("Error testing routing:", error);
      res.status(500).json({ error: "Failed to test routing" });
    }
  });

  // Campaigns
  app.get('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get('/api/campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const campaignData = {
        ...req.body,
        userId: Number(userId)
      };
      
      const validatedData = insertCampaignSchema.parse(campaignData);
      
      // Generate RTB ID if RTB is enabled
      if (validatedData.enableRtb) {
        validatedData.rtbId = await RTBIdGenerator.generateUniqueRTBId();
        console.log(`Generated RTB ID for new campaign: ${validatedData.rtbId}`);
      }
      
      const campaign = await storage.createCampaign(validatedData);
      
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ 
        error: "Failed to create campaign",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put('/api/campaigns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      
      // Get existing campaign to check current RTB status
      const existingCampaign = await storage.getCampaign(id);
      if (!existingCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Generate RTB ID if RTB is being enabled and campaign doesn't have one
      if (validatedData.enableRtb && !existingCampaign.rtbId) {
        validatedData.rtbId = await RTBIdGenerator.generateUniqueRTBId();
        console.log(`Generated RTB ID for campaign ${id}: ${validatedData.rtbId}`);
      }
      
      const campaign = await storage.updateCampaign(id, validatedData);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.patch('/api/campaigns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(id, validatedData);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCampaign(id);
      if (!success) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Admin endpoint for RTB ID lookup (for debugging and support)
  app.get('/api/internal/campaigns/rtb-lookup/:rtbId', requireAuth, async (req, res) => {
    try {
      const { rtbId } = req.params;
      
      // Validate RTB ID format
      if (!RTBIdGenerator.isValidRTBId(rtbId)) {
        return res.status(400).json({ error: "Invalid RTB ID format" });
      }
      
      const campaign = await RTBIdGenerator.getCampaignByRTBId(rtbId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found for RTB ID" });
      }
      
      // Log the lookup for audit purposes
      console.log(`RTB ID lookup: ${rtbId} -> Campaign ${campaign.id} (${campaign.name})`);
      
      res.json({
        rtbId,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          enableRtb: campaign.enableRtb,
          rtbRouterId: campaign.rtbRouterId,
          createdAt: campaign.createdAt
        }
      });
    } catch (error) {
      console.error("Error in RTB ID lookup:", error);
      res.status(500).json({ error: "Failed to lookup RTB ID" });
    }
  });

  // Campaign-Buyer relationships
  app.get('/api/campaigns/:id/buyers', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const buyers = await storage.getCampaignBuyers(id);
      res.json(buyers);
    } catch (error) {
      console.error("Error fetching campaign buyers:", error);
      res.status(500).json({ error: "Failed to fetch campaign buyers" });
    }
  });

  app.post('/api/campaigns/:id/buyers', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { buyerId, priority = 1 } = req.body;
      const result = await storage.addBuyerToCampaign(campaignId, buyerId, priority);
      res.json(result);
    } catch (error) {
      console.error("Error adding buyer to campaign:", error);
      res.status(500).json({ error: "Failed to add buyer to campaign" });
    }
  });

  app.delete('/api/campaigns/:campaignId/buyers/:buyerId', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const buyerId = parseInt(req.params.buyerId);
      
      // Remove the buyer from campaign
      const success = await storage.removeBuyerFromCampaign(campaignId, buyerId);
      if (!success) {
        return res.status(404).json({ error: "Campaign-buyer relationship not found" });
      }
      
      // Immediately check campaign validation after buyer removal
      const remainingBuyers = await storage.getCampaignBuyers(campaignId);
      const campaign = await storage.getCampaign(campaignId);
      
      if (remainingBuyers.length === 0 && campaign && campaign.status === 'active') {
        await storage.updateCampaign(campaignId, { status: 'paused' });
        console.log(`Campaign ${campaignId} automatically paused - no buyers remaining`);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing buyer from campaign:", error);
      res.status(500).json({ error: "Failed to remove buyer from campaign" });
    }
  });

  // Campaign-Publisher relationships
  app.get('/api/campaigns/:id/publishers', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const publishers = await storage.getCampaignPublishers(campaignId);
      res.json(publishers);
    } catch (error) {
      console.error("Error fetching campaign publishers:", error);
      res.status(500).json({ error: "Failed to fetch campaign publishers" });
    }
  });

  app.post('/api/campaigns/:id/publishers', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { publisherId, customPayout } = req.body;
      
      const assignment = await storage.addPublisherToCampaign(
        publisherId,
        campaignId,
        customPayout
      );
      
      res.status(200).json(assignment);
    } catch (error) {
      console.error("Error adding publisher to campaign:", error);
      res.status(500).json({ error: "Failed to add publisher to campaign" });
    }
  });

  app.delete('/api/campaigns/:campaignId/publishers/:publisherId', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const publisherId = parseInt(req.params.publisherId);
      const success = await storage.removePublisherFromCampaign(publisherId, campaignId);
      if (!success) {
        return res.status(404).json({ error: "Campaign-publisher relationship not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing publisher from campaign:", error);
      res.status(500).json({ error: "Failed to remove publisher from campaign" });
    }
  });

  // Buyers
  app.get('/api/buyers', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const buyers = await storage.getBuyers(userId);
      res.json(buyers);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      res.status(500).json({ error: "Failed to fetch buyers" });
    }
  });

  app.post('/api/buyers', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      console.log("Creating buyer for user:", userId);
      console.log("Request body:", req.body);
      
      const validatedData = insertBuyerSchema.parse({...req.body, userId});
      console.log("Validated data:", validatedData);
      
      const buyer = await storage.createBuyer(validatedData);
      console.log("Created buyer:", buyer);
      res.status(201).json(buyer);
    } catch (error) {
      console.error("Error creating buyer:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create buyer", message: error.message });
      }
    }
  });

  app.patch('/api/buyers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBuyerSchema.partial().parse(req.body);
      const buyer = await storage.updateBuyer(id, validatedData);
      if (!buyer) {
        return res.status(404).json({ error: "Buyer not found" });
      }
      res.json(buyer);
    } catch (error) {
      console.error("Error updating buyer:", error);
      res.status(500).json({ error: "Failed to update buyer" });
    }
  });

  app.get('/api/buyers/:id/campaigns', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignments = await storage.getBuyerCampaignAssignments(id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching buyer campaign assignments:", error);
      res.status(500).json({ error: "Failed to fetch campaign assignments" });
    }
  });

  app.delete('/api/buyers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBuyer(id);
      if (!success) {
        return res.status(404).json({ error: "Buyer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting buyer:", error);
      res.status(500).json({ error: "Failed to delete buyer" });
    }
  });

  // Agents (backward compatibility)
  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.post('/api/agents', async (req, res) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      console.error("Error creating agent:", error);
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  app.put('/api/agents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAgentSchema.partial().parse(req.body);
      const agent = await storage.updateAgent(id, validatedData);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  app.delete('/api/agents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAgent(id);
      if (!success) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ error: "Failed to delete agent" });
    }
  });

  // Calls
  app.get('/api/calls', async (req, res) => {
    try {
      const calls = await storage.getCalls();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  });

  // Pool-based webhook endpoints for Dynamic Number Insertion
  app.post('/api/webhooks/pool/:poolId/voice', async (req, res) => {
    try {
      const { poolId } = req.params;
      const { To: toNumber, From: fromNumber, CallSid } = req.body;
      
      console.log(`[Pool Webhook] === INCOMING CALL TO POOL ${poolId} ===`);
      console.log(`[Pool Webhook] Call from ${fromNumber} to ${toNumber}, CallSid: ${CallSid}`);
      
      // Find the pool and associated campaign
      const pool = await storage.getNumberPool(parseInt(poolId));
      if (!pool) {
        console.log(`[Pool Webhook] Pool ${poolId} not found`);
        return res.type('text/xml').send(`
          <Response>
            <Say>This number is not properly configured.</Say>
            <Hangup/>
          </Response>
        `);
      }

      // Find campaign using this pool
      const campaign = await storage.getCampaignByPoolId(parseInt(poolId));
      if (!campaign) {
        console.log(`[Pool Webhook] No campaign found using pool ${poolId}`);
        return res.type('text/xml').send(`
          <Response>
            <Say>This number is not assigned to an active campaign.</Say>
            <Hangup/>
          </Response>
        `);
      }

      console.log(`[Pool Webhook] Found campaign: ${campaign.name} (ID: ${campaign.id}) using pool: ${pool.name}`);
      console.log(`[Pool Webhook] RTB enabled: ${campaign.enableRtb}, RTB Router ID: ${campaign.rtbRouterId}`);
      
      let routingMethod = 'traditional';
      let selectedBuyer = null;
      let routingData = {
        poolId: parseInt(poolId),
        poolName: pool.name
      };
      let rtbRequestId = null;
      let winningBidAmount = null;
      let winningTargetId = null;
      
      // Check if RTB is enabled for this campaign
      if (campaign.enableRtb && campaign.rtbRouterId) {
        try {
          console.log(`[Pool Webhook] Attempting RTB bidding for router ID: ${campaign.rtbRouterId}`);
          
          // Import RTB service and conduct bidding
          const { RTBService } = await import('./rtb-service');
          
          // Prepare bid request for RTB
          const bidRequest = {
            requestId: `pool_${poolId}_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            campaignId: campaign.id,
            campaignRtbId: campaign.rtbId || undefined, // Use RTB ID for external bid requests
            callerId: fromNumber,
            callerState: req.body.CallerState || null,
            callerZip: req.body.CallerZip || null,
            callStartTime: new Date(),
            timeoutMs: 5000 // 5 second timeout for bidding
          };
          
          console.log(`[Pool Webhook] Conducting bidding with request:`, bidRequest);
          
          // Conduct RTB bidding
          const biddingResult = await RTBService.initiateAuction(
            campaign,
            bidRequest
          );
          
          console.log(`[Pool Webhook] Bidding result:`, biddingResult);
          
          if (biddingResult.success && biddingResult.winningBid) {
            // RTB bidding successful - use winning bid
            routingMethod = 'rtb';
            rtbRequestId = bidRequest.requestId;
            winningBidAmount = parseFloat(biddingResult.winningBid.bidAmount);
            winningTargetId = biddingResult.winningBid.rtbTargetId;
            
            // Get the winning target to determine destination
            const winningTarget = await storage.getRtbTarget(winningTargetId);
            if (winningTarget) {
              // Use the target's buyer information for routing
              const targetBuyer = await storage.getBuyer(winningTarget.buyerId);
              if (targetBuyer && targetBuyer.phoneNumber) {
                selectedBuyer = targetBuyer;
                routingData = {
                  ...routingData,
                  method: 'rtb',
                  rtbRequestId,
                  winningBidAmount,
                  winningTargetId,
                  targetName: winningTarget.name,
                  totalTargetsPinged: biddingResult.totalTargetsPinged,
                  responseTimeMs: biddingResult.totalResponseTime
                };
                
                console.log(`[Pool Webhook] RTB SUCCESS - Winner: ${winningTarget.name}, Bid: $${winningBidAmount}, Routing to: ${targetBuyer.name} (${targetBuyer.phoneNumber})`);
              } else {
                console.log(`[Pool Webhook] RTB winner has no valid buyer phone number, falling back to traditional routing`);
                routingMethod = 'rtb_fallback';
              }
            } else {
              console.log(`[Pool Webhook] RTB winning target not found, falling back to traditional routing`);
              routingMethod = 'rtb_fallback';
            }
          } else {
            console.log(`[Pool Webhook] RTB bidding failed or no winning bid: ${biddingResult.error || 'Unknown reason'}`);
            routingMethod = 'rtb_fallback';
          }
        } catch (rtbError) {
          console.error(`[Pool Webhook] RTB bidding error:`, rtbError);
          routingMethod = 'rtb_error_fallback';
        }
      } else {
        console.log(`[Pool Webhook] RTB not enabled for campaign, using traditional routing`);
        routingMethod = 'traditional';
      }
      
      // Fallback to traditional routing if RTB failed or not enabled
      if (!selectedBuyer) {
        console.log(`[Pool Webhook] Using traditional CallRouter for buyer selection (method: ${routingMethod})`);
        
        const { CallRouter } = await import('./call-routing');
        const routingResult = await CallRouter.selectBuyer(campaign.id, fromNumber);
        
        if (!routingResult.selectedBuyer) {
          console.log(`[Pool Webhook] No buyers available: ${routingResult.reason}`);
          return res.type('text/xml').send(`
            <Response>
              <Say>All representatives are currently busy. Please try again later.</Say>
              <Hangup/>
            </Response>
          `);
        }
        
        selectedBuyer = routingResult.selectedBuyer;
        routingData = {
          ...routingData,
          method: routingMethod,
          routingReason: routingResult.reason,
          alternatives: routingResult.alternativeBuyers.length
        };
      }

      console.log(`[Pool Webhook] Final routing decision - Method: ${routingMethod}, Buyer: ${selectedBuyer.name} (${selectedBuyer.phoneNumber})`);

      // Create call record with RTB data
      const callData = {
        campaignId: campaign.id,
        buyerId: selectedBuyer.id,
        callSid: CallSid,
        fromNumber,
        toNumber,
        status: 'initiated',
        startTime: new Date(),
        routingData: JSON.stringify({
          ...routingData,
          routingMethod,
          timestamp: new Date().toISOString()
        })
      };
      
      // RTB data is stored in routingData JSON field above
      
      await storage.createCall(callData);

      // Generate TwiML to forward the call with appropriate messaging
      const connectMessage = routingMethod === 'rtb' 
        ? 'Connecting to our premium partner, please hold.'
        : 'Connecting your call, please hold.';
        
      const twiml = `
        <Response>
          <Say>${connectMessage}</Say>
          <Dial callerId="${toNumber}" timeout="30" record="record-from-answer" recordingStatusCallback="/api/webhooks/pool/${poolId}/status" action="/api/webhooks/pool/${poolId}/status" method="POST">
            <Number>${selectedBuyer.phoneNumber}</Number>
          </Dial>
          <Say>The call has ended. Thank you for calling.</Say>
          <Hangup/>
        </Response>
      `;

      console.log(`[Pool Webhook] Generated TwiML for routing to ${selectedBuyer.phoneNumber} via ${routingMethod}`);
      res.type('text/xml').send(twiml);
    } catch (error) {
      console.error('[Pool Webhook] Error processing call:', error);
      res.type('text/xml').send(`
        <Response>
          <Say>We're experiencing technical difficulties. Please try again later.</Say>
          <Hangup/>
        </Response>
      `);
    }
  });

  // Pool status callback endpoint
  app.post('/api/webhooks/pool/:poolId/status', async (req, res) => {
    try {
      const { poolId } = req.params;
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      console.log(`[Pool Status] Pool ${poolId} call ${CallSid} status: ${CallStatus}`);
      
      // Update call status in database
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === CallSid);
      
      if (call) {
        await storage.updateCall(call.id, {
          status: CallStatus,
          duration: CallDuration ? parseInt(CallDuration) : undefined
        });
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('[Pool Status] Error updating call status:', error);
      res.status(500).send('Error');
    }
  });

  // Enhanced Twilio Webhook Endpoints with RTB Integration
  app.post('/api/webhooks/voice', async (req, res) => {
    try {
      console.log('[Webhook RTB] === INCOMING CALL WITH RTB INTEGRATION ===');
      console.log('[Webhook RTB] Request body:', JSON.stringify(req.body, null, 2));
      
      const { To: toNumber, From: fromNumber, CallSid, CallerState, CallerZip } = req.body;
      
      console.log(`[Webhook RTB] Incoming call from ${fromNumber} to ${toNumber}, CallSid: ${CallSid}`);
      
      // Find campaign by phone number
      const campaign = await storage.getCampaignByPhoneNumber(toNumber);
      
      if (!campaign) {
        console.log(`[Webhook RTB] No campaign found for number ${toNumber}`);
        return res.type('text/xml').send(`
          <Response>
            <Say>Sorry, this number is not configured for call routing.</Say>
            <Hangup/>
          </Response>
        `);
      }

      console.log(`[Webhook RTB] Found campaign: ${campaign.name} (ID: ${campaign.id})`);
      console.log(`[Webhook RTB] RTB enabled: ${campaign.enableRtb}, RTB Router ID: ${campaign.rtbRouterId}`);
      
      let routingMethod = 'traditional';
      let selectedBuyer = null;
      let routingData = {};
      let rtbRequestId = null;
      let winningBidAmount = null;
      let winningTargetId = null;
      
      // Check if RTB is enabled for this campaign
      if (campaign.enableRtb && campaign.rtbRouterId) {
        try {
          console.log(`[Webhook RTB] Attempting RTB bidding for router ID: ${campaign.rtbRouterId}`);
          
          // Import RTB service and conduct bidding
          const { RTBService } = await import('./rtb-service');
          
          // Prepare bid request for RTB
          const bidRequest = {
            requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            campaignId: campaign.id,
            campaignRtbId: campaign.rtbId || undefined, // Use RTB ID for external bid requests
            callerId: fromNumber,
            callerState: CallerState || null,
            callerZip: CallerZip || null,
            callStartTime: new Date(),
            timeoutMs: 5000 // 5 second timeout for bidding
          };
          
          console.log(`[Webhook RTB] Conducting bidding with request:`, bidRequest);
          
          // Conduct RTB bidding
          const biddingResult = await RTBService.initiateAuction(
            campaign,
            bidRequest
          );
          
          console.log(`[Webhook RTB] Bidding result:`, biddingResult);
          
          if (biddingResult.success && biddingResult.winningBid) {
            // RTB bidding successful - use winning bid
            routingMethod = 'rtb';
            rtbRequestId = bidRequest.requestId;
            winningBidAmount = parseFloat(biddingResult.winningBid.bidAmount);
            winningTargetId = biddingResult.winningBid.rtbTargetId;
            
            // Get the winning target to determine destination
            const winningTarget = await storage.getRtbTarget(winningTargetId);
            if (winningTarget) {
              // Use the target's buyer information for routing
              const targetBuyer = await storage.getBuyer(winningTarget.buyerId);
              if (targetBuyer && targetBuyer.phoneNumber) {
                selectedBuyer = targetBuyer;
                routingData = {
                  method: 'rtb',
                  rtbRequestId,
                  winningBidAmount,
                  winningTargetId,
                  targetName: winningTarget.name,
                  totalTargetsPinged: biddingResult.totalTargetsPinged,
                  responseTimeMs: biddingResult.totalResponseTime
                };
                
                console.log(`[Webhook RTB] RTB SUCCESS - Winner: ${winningTarget.name}, Bid: $${winningBidAmount}, Routing to: ${targetBuyer.name} (${targetBuyer.phoneNumber})`);
              } else {
                console.log(`[Webhook RTB] RTB winner has no valid buyer phone number, falling back to traditional routing`);
                routingMethod = 'rtb_fallback';
              }
            } else {
              console.log(`[Webhook RTB] RTB winning target not found, falling back to traditional routing`);
              routingMethod = 'rtb_fallback';
            }
          } else {
            console.log(`[Webhook RTB] RTB bidding failed or no winning bid: ${biddingResult.error || 'Unknown reason'}`);
            routingMethod = 'rtb_fallback';
            routingData = {
              method: 'rtb_fallback',
              rtbAttempted: true,
              rtbFailureReason: biddingResult.error || 'No winning bid received',
              totalTargetsPinged: biddingResult.totalTargetsPinged || 0
            };
          }
        } catch (rtbError) {
          console.error(`[Webhook RTB] RTB bidding error:`, rtbError);
          routingMethod = 'rtb_error_fallback';
          routingData = {
            method: 'rtb_error_fallback',
            rtbAttempted: true,
            rtbError: rtbError instanceof Error ? rtbError.message : 'Unknown RTB error'
          };
        }
      } else {
        console.log(`[Webhook RTB] RTB not enabled for campaign, using traditional routing`);
        routingMethod = 'traditional';
      }
      
      // Fallback to traditional routing if RTB failed or not enabled
      if (!selectedBuyer) {
        console.log(`[Webhook RTB] Using traditional CallRouter for buyer selection (method: ${routingMethod})`);
        
        const { CallRouter } = await import('./call-routing');
        const routingResult = await CallRouter.selectBuyer(campaign.id, fromNumber);
        
        if (!routingResult.selectedBuyer) {
          console.log(`[Webhook RTB] No buyers available via traditional routing: ${routingResult.reason}`);
          return res.type('text/xml').send(`
            <Response>
              <Say>All representatives are currently busy. Please try again later.</Say>
              <Hangup/>
            </Response>
          `);
        }
        
        selectedBuyer = routingResult.selectedBuyer;
        
        // Merge traditional routing data
        routingData = {
          ...routingData,
          traditionalReason: routingResult.reason,
          alternativeBuyers: routingResult.alternativeBuyers.length
        };
        
        console.log(`[Webhook RTB] Traditional routing selected buyer: ${selectedBuyer.name} (${selectedBuyer.phoneNumber})`);
      }
      
      console.log(`[Webhook RTB] Final routing decision - Method: ${routingMethod}, Buyer: ${selectedBuyer.name}`);
      
      // Create call record with RTB data
      const callData = {
        campaignId: campaign.id,
        buyerId: selectedBuyer.id,
        callSid: CallSid,
        fromNumber,
        toNumber,
        status: 'ringing',
        startTime: new Date(),
        routingData: JSON.stringify({
          ...routingData,
          routingMethod,
          timestamp: new Date().toISOString()
        })
      };
      
      // RTB data is stored in routingData JSON field above
      
      await storage.createCall(callData);
      
      // Generate TwiML to dial the selected buyer
      const connectMessage = routingMethod === 'rtb' 
        ? 'Connecting to our premium partner, please hold.'
        : 'Connecting your call, please hold.';
        
      const twiml = `
        <Response>
          <Say>${connectMessage}</Say>
          <Dial timeout="30" callerId="${fromNumber}" action="https://${req.hostname}/api/webhooks/dial-status" method="POST">
            <Number>${selectedBuyer.phoneNumber}</Number>
          </Dial>
          <Say>The call has ended. Thank you for calling.</Say>
          <Hangup/>
        </Response>
      `;
      
      console.log(`[Webhook RTB] Generated TwiML for routing to ${selectedBuyer.phoneNumber}`);
      res.type('text/xml').send(twiml);
      
    } catch (error) {
      console.error('[Webhook] Error processing voice webhook:', error);
      res.type('text/xml').send(`
        <Response>
          <Say>An error occurred. Please try again later.</Say>
          <Hangup/>
        </Response>
      `);
    }
  });

  app.post('/api/webhooks/call-status', async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      console.log(`[Webhook] Call status update: ${CallSid} - ${CallStatus}`);
      
      // Find the call by CallSid and update its status
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === CallSid);
      
      if (call) {
        await storage.updateCall(call.id, {
          status: CallStatus.toLowerCase(),
          duration: CallDuration ? parseInt(CallDuration) : undefined
        });
        console.log(`[Webhook] Updated call ${call.id} status to ${CallStatus}`);
      }
      
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('[Webhook] Error processing call status:', error);
      res.status(500).send('Error');
    }
  });

  app.post('/api/webhooks/dial-status', async (req, res) => {
    try {
      const { CallSid, DialCallStatus, DialCallDuration } = req.body;
      
      console.log(`[Webhook] Dial status update: ${CallSid} - ${DialCallStatus}`);
      
      // Find the call by CallSid and update its status
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === CallSid);
      
      if (call) {
        let finalStatus = DialCallStatus?.toLowerCase() || 'completed';
        if (finalStatus === 'no-answer') finalStatus = 'no_answer';
        
        await storage.updateCall(call.id, {
          status: finalStatus,
          duration: DialCallDuration ? parseInt(DialCallDuration) : undefined
        });
        console.log(`[Webhook] Updated call ${call.id} dial status to ${finalStatus}`);
      }
      
      // Always return empty TwiML to end the call cleanly
      res.type('text/xml').send('<Response></Response>');
      
    } catch (error) {
      console.error('[Webhook] Error processing dial status:', error);
      res.type('text/xml').send('<Response></Response>');
    }
  });

  // Campaign phone number lookup endpoint
  app.get('/api/campaigns/by-phone/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const campaign = await storage.getCampaignByPhoneNumber(phoneNumber);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found for this phone number' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Error finding campaign by phone number:', error);
      res.status(500).json({ error: 'Failed to find campaign' });
    }
  });

  // Call Control API
  app.post('/api/calls/:callSid/transfer', async (req, res) => {
    try {
      const { callSid } = req.params;
      const { targetNumber } = req.body;

      if (!targetNumber) {
        return res.status(400).json({ error: "Target number is required" });
      }

      console.log(`Transferring call ${callSid} to ${targetNumber}`);
      
      // Find the call record to get the actual ID
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === callSid);
      
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // In a real implementation, you would use Twilio's API to transfer the call
      // For now, we'll simulate the transfer and log the action
      await storage.createCallLog({
        callId: call.id,
        action: 'transfer',
        response: `Call transferred to ${targetNumber}`,
        responseTime: 200
      });

      res.json({ 
        success: true, 
        message: `Call ${callSid} transfer initiated to ${targetNumber}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error transferring call:", error);
      res.status(500).json({ error: "Failed to transfer call" });
    }
  });

  app.post('/api/calls/:callSid/hold', async (req, res) => {
    try {
      const { callSid } = req.params;
      
      console.log(`Placing call ${callSid} on hold`);
      
      // Find the call record to get the actual ID
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === callSid);
      
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      await storage.createCallLog({
        callId: call.id,
        action: 'hold',
        response: 'Call placed on hold',
        responseTime: 150
      });

      res.json({ 
        success: true, 
        message: `Call ${callSid} placed on hold`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error holding call:", error);
      res.status(500).json({ error: "Failed to hold call" });
    }
  });

  app.post('/api/calls/:callSid/resume', async (req, res) => {
    try {
      const { callSid } = req.params;
      
      console.log(`Resuming call ${callSid}`);
      
      await storage.createCallLog({
        callId: parseInt(callSid.replace('CA', '')),
        action: 'resume',
        response: 'Call resumed',
        responseTime: 120
      });

      res.json({ 
        success: true, 
        message: `Call ${callSid} resumed`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error resuming call:", error);
      res.status(500).json({ error: "Failed to resume call" });
    }
  });

  app.post('/api/calls/:callSid/mute', async (req, res) => {
    try {
      const { callSid } = req.params;
      
      console.log(`Muting call ${callSid}`);
      
      // Find the call record to get the actual ID
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === callSid);
      
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      await storage.createCallLog({
        callId: call.id,
        action: 'mute',
        response: 'Call muted',
        responseTime: 100
      });

      res.json({ 
        success: true, 
        message: `Call ${callSid} muted`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error muting call:", error);
      res.status(500).json({ error: "Failed to mute call" });
    }
  });

  app.post('/api/calls/:callSid/unmute', async (req, res) => {
    try {
      const { callSid } = req.params;
      
      console.log(`Unmuting call ${callSid}`);
      
      // Find the call record to get the actual ID
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === callSid);
      
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      await storage.createCallLog({
        callId: call.id,
        action: 'unmute',
        response: 'Call unmuted',
        responseTime: 110
      });

      res.json({ 
        success: true, 
        message: `Call ${callSid} unmuted`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error unmuting call:", error);
      res.status(500).json({ error: "Failed to unmute call" });
    }
  });

  app.post('/api/calls/:callSid/recording/start', async (req, res) => {
    try {
      const { callSid } = req.params;
      
      console.log(`Starting recording for call ${callSid}`);
      
      // Find the call record to get the actual ID
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === callSid);
      
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      await storage.createCallLog({
        callId: call.id,
        action: 'start_recording',
        response: 'Recording started',
        responseTime: 180
      });

      res.json({ 
        success: true, 
        message: `Recording started for call ${callSid}`,
        recordingSid: `RE${Date.now()}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      res.status(500).json({ error: "Failed to start recording" });
    }
  });

  app.post('/api/calls/:callSid/recording/stop', async (req, res) => {
    try {
      const { callSid } = req.params;
      const { recordingSid } = req.body;
      
      console.log(`Stopping recording ${recordingSid} for call ${callSid}`);
      
      // Find the call record to get the actual ID
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === callSid);
      
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      await storage.createCallLog({
        callId: call.id,
        action: 'stop_recording',
        response: `Recording ${recordingSid} stopped`,
        responseTime: 160
      });

      res.json({ 
        success: true, 
        message: `Recording stopped for call ${callSid}`,
        recordingSid,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error stopping recording:", error);
      res.status(500).json({ error: "Failed to stop recording" });
    }
  });

  app.post('/api/conference/create', async (req, res) => {
    try {
      const { participants } = req.body;

      if (!participants || participants.length < 2) {
        return res.status(400).json({ error: "At least 2 participants required for conference" });
      }

      console.log(`Creating conference with participants:`, participants);
      
      const conferenceSid = `CF${Date.now()}`;
      
      res.json({ 
        success: true, 
        message: `Conference created with ${participants.length} participants`,
        conferenceSid,
        participants,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating conference:", error);
      res.status(500).json({ error: "Failed to create conference" });
    }
  });

  // Tracking Pixels API
  app.get('/api/integrations/pixels', async (req, res) => {
    try {
      const pixels = await storage.getTrackingPixels();
      res.json(pixels);
    } catch (error) {
      console.error("Error fetching tracking pixels:", error);
      res.status(500).json({ error: "Failed to fetch tracking pixels" });
    }
  });

  app.post('/api/integrations/pixels', async (req, res) => {
    try {
      const { name, pixelType, fireOnEvent, code, assignedCampaigns, isActive } = req.body;
      
      // Validate required fields
      if (!name || !pixelType || !fireOnEvent || !code) {
        return res.status(400).json({ error: "Missing required fields: name, pixelType, fireOnEvent, code" });
      }

      // Validate pixel type
      if (!['postback', 'image', 'javascript'].includes(pixelType)) {
        return res.status(400).json({ error: "Invalid pixelType. Must be: postback, image, or javascript" });
      }

      // Validate fire event
      const validEvents = ['incoming', 'connected', 'completed', 'converted', 'error', 'payout', 'recording', 'finalized'];
      if (!validEvents.includes(fireOnEvent)) {
        return res.status(400).json({ error: `Invalid fireOnEvent. Must be one of: ${validEvents.join(', ')}` });
      }

      const pixelData = {
        name,
        pixelType,
        fireOnEvent,
        code,
        assignedCampaigns: assignedCampaigns || [],
        isActive: isActive !== undefined ? isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const pixel = await storage.createTrackingPixel(pixelData);
      res.status(201).json(pixel);
    } catch (error) {
      console.error("Error creating tracking pixel:", error);
      res.status(500).json({ error: "Failed to create tracking pixel" });
    }
  });

  app.put('/api/integrations/pixels/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, pixelType, fireOnEvent, code, assignedCampaigns, isActive } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid pixel ID" });
      }

      // Validate pixel type if provided
      if (pixelType && !['postback', 'image', 'javascript'].includes(pixelType)) {
        return res.status(400).json({ error: "Invalid pixelType. Must be: postback, image, or javascript" });
      }

      // Validate fire event if provided
      if (fireOnEvent) {
        const validEvents = ['incoming', 'connected', 'completed', 'converted', 'error', 'payout', 'recording', 'finalized'];
        if (!validEvents.includes(fireOnEvent)) {
          return res.status(400).json({ error: `Invalid fireOnEvent. Must be one of: ${validEvents.join(', ')}` });
        }
      }

      const updateData = {
        ...(name && { name }),
        ...(pixelType && { pixelType }),
        ...(fireOnEvent && { fireOnEvent }),
        ...(code && { code }),
        ...(assignedCampaigns !== undefined && { assignedCampaigns }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      };

      const pixel = await storage.updateTrackingPixel(id, updateData);
      if (!pixel) {
        return res.status(404).json({ error: "Tracking pixel not found" });
      }
      res.json(pixel);
    } catch (error) {
      console.error("Error updating tracking pixel:", error);
      res.status(500).json({ error: "Failed to update tracking pixel" });
    }
  });

  app.delete('/api/integrations/pixels/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid pixel ID" });
      }

      const success = await storage.deleteTrackingPixel(id);
      if (!success) {
        return res.status(404).json({ error: "Tracking pixel not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tracking pixel:", error);
      res.status(500).json({ error: "Failed to delete tracking pixel" });
    }
  });

  // Pixel Testing API
  app.post('/api/pixels/test', async (req, res) => {
    try {
      const { pixelType, code, sampleData } = req.body;

      if (!pixelType || !code) {
        return res.status(400).json({ error: "Missing required fields: pixelType, code" });
      }

      // Use provided sample data or create default test data
      const testData: PixelMacroData = sampleData || {
        call_id: 'test_call_' + Date.now(),
        campaign_id: '1',
        phone_number: '+1234567890',
        timestamp: new Date().toISOString(),
        caller_id: '+1987654321',
        duration: '120',
        status: 'completed',
        buyer_id: '1',
        agent_id: '1',
        recording_url: 'https://example.com/recording.mp3',
        custom_field_1: 'test_value_1',
        custom_field_2: 'test_value_2',
        custom_field_3: 'test_value_3'
      };

      // Replace macros in the code
      const processedCode = PixelService.replaceMacros(code, testData);

      let result;
      switch (pixelType) {
        case 'postback':
          result = await PixelService.firePostbackPixel(processedCode);
          break;
        case 'image':
          result = await PixelService.fireImagePixel(processedCode);
          break;
        case 'javascript':
          result = PixelService.executeJavaScriptPixel(processedCode);
          break;
        default:
          return res.status(400).json({ error: "Invalid pixel type" });
      }

      res.json({
        success: result.success,
        processedCode,
        testData,
        result: result.response || { error: result.error },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error testing pixel:", error);
      res.status(500).json({ error: "Failed to test pixel" });
    }
  });

  // Pixel Fire API (for real-time firing during call events)
  app.post('/api/pixels/fire', async (req, res) => {
    try {
      const { pixelId, event, campaignId, macroData }: PixelFireRequest = req.body;

      if (!pixelId || !event || !campaignId || !macroData) {
        return res.status(400).json({ error: "Missing required fields: pixelId, event, campaignId, macroData" });
      }

      // Get pixel from storage
      const pixels = await storage.getTrackingPixels();
      const pixel = pixels.find(p => p.id === pixelId);

      if (!pixel) {
        return res.status(404).json({ error: "Pixel not found" });
      }

      if (!pixel.isActive) {
        return res.status(400).json({ error: "Pixel is not active" });
      }

      // Check if pixel should fire for this event
      const eventMapping = {
        'call_start': 'incoming',
        'call_complete': 'completed',
        'call_transfer': 'connected'
      };

      const mappedEvent = eventMapping[event] || event;
      if (pixel.fireOnEvent !== mappedEvent) {
        return res.json({ 
          success: true, 
          message: `Pixel not fired - configured for '${pixel.fireOnEvent}' events, received '${mappedEvent}'` 
        });
      }

      // Check if pixel is assigned to this campaign
      if (pixel.assignedCampaigns && pixel.assignedCampaigns.length > 0) {
        if (!pixel.assignedCampaigns.includes(campaignId.toString())) {
          return res.json({ 
            success: true, 
            message: "Pixel not fired - not assigned to this campaign" 
          });
        }
      }

      // Replace macros and fire the pixel
      const processedCode = PixelService.replaceMacros(pixel.code, macroData);
      const result = await PixelService.firePixel(pixel.pixelType as 'postback' | 'image' | 'javascript', processedCode);

      res.json({
        success: result.success,
        pixelName: pixel.name,
        pixelType: pixel.pixelType,
        event: mappedEvent,
        result: result.response || { error: result.error },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error firing pixel:", error);
      res.status(500).json({ error: "Failed to fire pixel" });
    }
  });

  // DNI (Dynamic Number Insertion) API
  app.get('/api/dni/tracking-number', async (req, res) => {
    // CORS headers for external domain access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      const request: DNIRequest = {
        campaignId: req.query.campaign_id ? parseInt(req.query.campaign_id as string) : undefined,
        campaignName: req.query.campaign_name as string,
        source: req.query.utm_source as string,
        medium: req.query.utm_medium as string,
        campaign: req.query.utm_campaign as string,
        content: req.query.utm_content as string,
        term: req.query.utm_term as string,
        gclid: req.query.gclid as string,
        fbclid: req.query.fbclid as string,
        referrer: req.query.referrer as string,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        sessionId: req.query.session_id as string,
        customFields: {}
      };

      // Add any custom fields that start with 'custom_'
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('custom_')) {
          request.customFields![key] = req.query[key] as string;
        }
      });

      const response = await DNIService.getTrackingNumber(request);
      res.json(response);
    } catch (error) {
      console.error('DNI API error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get tracking number',
        phoneNumber: '',
        formattedNumber: '',
        campaignId: 0,
        campaignName: '',
        trackingId: ''
      });
    }
  });

  // DNI JavaScript SDK endpoint
  app.get('/dni.js', async (req, res) => {
    try {
      const domain = req.get('host') || 'localhost:5000';
      const protocol = req.secure ? 'https' : 'http';
      const jsCode = DNIService.generateJavaScriptSDK(`${protocol}://${domain}`);
      
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(jsCode);
    } catch (error) {
      console.error('DNI SDK error:', error);
      res.status(500).type('text/javascript').send('console.error("DNI: Failed to load SDK");');
    }
  });

  // DNI Tracking Number Request (used by JavaScript SDK)
  app.get('/api/dni/tracking-number', async (req, res) => {
    try {
      const requestData: DNIRequest = {
        campaignId: req.query.campaign_id ? parseInt(req.query.campaign_id as string) : undefined,
        campaignName: req.query.campaign_name as string,
        source: req.query.source as string,
        medium: req.query.medium as string,
        campaign: req.query.campaign as string,
        content: req.query.content as string,
        term: req.query.term as string,
        gclid: req.query.gclid as string,
        fbclid: req.query.fbclid as string,
        referrer: req.query.referrer as string,
        userAgent: req.query.user_agent as string,
        ipAddress: req.ip,
        sessionId: req.query.session_id as string,
        customFields: {}
      };

      // Collect custom fields from query parameters
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('custom_')) {
          const fieldName = key.replace('custom_', '');
          if (!requestData.customFields) requestData.customFields = {};
          requestData.customFields[fieldName] = req.query[key] as string;
        }
      });

      const response = await DNIService.getTrackingNumber(requestData);
      res.json(response);
    } catch (error) {
      console.error('DNI tracking number error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get tracking number',
        phoneNumber: '',
        formattedNumber: '',
        campaignId: 0,
        campaignName: '',
        trackingId: ''
      });
    }
  });

  // DNI HTML snippet endpoint
  app.get('/api/dni/html-snippet', async (req, res) => {
    // CORS headers for external domain access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      const domain = req.get('host') || 'localhost:5000';
      const campaignId = parseInt(req.query.campaign_id as string);
      const campaignName = req.query.campaign_name as string || `Campaign ${campaignId}`;
      
      if (!campaignId) {
        return res.status(400).json({ error: 'campaign_id parameter required' });
      }

      const htmlSnippet = DNIService.generateHTMLSnippet(campaignId, campaignName, `https://${domain}`);
      res.json({
        success: true,
        htmlSnippet,
        campaignId,
        campaignName
      });
    } catch (error) {
      console.error('DNI HTML snippet error:', error);
      res.status(500).json({ error: 'Failed to generate HTML snippet' });
    }
  });

  // Test Twilio connection endpoint
  app.get('/api/test-twilio', requireAuth, async (req, res) => {
    try {
      const { twilioPhoneService } = await import('./twilio-phone-service');
      const testNumbers = await twilioPhoneService.searchAvailableNumbers({
        country: 'US',
        numberType: 'local',
        limit: 3
      });
      res.json({
        success: true,
        message: 'Twilio connection working',
        sampleNumbers: testNumbers.length,
        numbers: testNumbers
      });
    } catch (error) {
      console.error('Twilio test error:', error);
      res.status(500).json({ 
        error: 'Twilio test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Phone Numbers Management API
  app.get('/api/phone-numbers', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const numbers = await storage.getPhoneNumbers(userId);
      
      // Get all campaigns and pools to check assignments
      const campaigns = await storage.getCampaigns();
      const pools = await storage.getNumberPools();
      
      // Enhance each number with availability status
      const enhancedNumbers = numbers.map(number => {
        // Check if assigned to campaign
        const assignedCampaign = campaigns.find(c => c.phoneNumber === number.phoneNumber);
        
        // Check if assigned to pool
        const assignedPool = pools.find(p => 
          p.phoneNumbers && p.phoneNumbers.includes(number.phoneNumber)
        );
        
        let status = 'available';
        let assignedTo = null;
        let assignedType = null;
        
        if (assignedCampaign) {
          status = 'assigned';
          assignedTo = assignedCampaign.name;
          assignedType = 'campaign';
        } else if (assignedPool) {
          status = 'assigned';
          assignedTo = assignedPool.name;
          assignedType = 'pool';
        }
        
        return {
          ...number,
          status,
          assignedTo,
          assignedType
        };
      });
      
      res.json(enhancedNumbers);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
  });

  // Fetch unassigned phone numbers (not in any pool)
  app.get('/api/phone-numbers/unassigned', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      console.log(`Fetching unassigned numbers for user ${userId}`);
      
      const unassignedNumbers = await storage.getUnassignedPhoneNumbers(userId);
      console.log(`Found ${unassignedNumbers.length} unassigned numbers`);
      
      res.json(unassignedNumbers);
    } catch (error) {
      console.error('Error fetching unassigned phone numbers:', error);
      res.status(500).json({ error: 'Failed to fetch unassigned phone numbers' });
    }
  });

  // Import existing Twilio numbers
  app.post('/api/phone-numbers/import', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        return res.status(500).json({
          error: 'Twilio credentials not configured',
          details: 'Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables'
        });
      }

      // Fetch existing numbers from Twilio
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        
        // Check if it's an authentication error
        if (response.status === 401) {
          return res.status(401).json({
            error: 'Twilio authentication failed',
            details: 'Please verify your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your Twilio Console. This error often occurs with trial accounts or expired credentials.',
            code: 'TWILIO_AUTH_ERROR',
            suggestion: 'You can manually add phone numbers using the "Add Number" feature instead.'
          });
        }
        
        throw new Error(`Twilio API error: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      const twilioNumbers = data.incoming_phone_numbers || [];
      
      const importedNumbers = [];
      const skippedNumbers = [];

      for (const twilioNumber of twilioNumbers) {
        // Check if number already exists
        const existingNumbers = await storage.getPhoneNumbers();
        const existingNumber = existingNumbers.find(n => n.phoneNumber === twilioNumber.phone_number);
        if (existingNumber) {
          skippedNumbers.push(twilioNumber.phone_number);
          continue;
        }

        // Import the number
        const newNumber = await storage.createPhoneNumber({
          userId,
          phoneNumber: twilioNumber.phone_number,
          friendlyName: twilioNumber.friendly_name || `Imported ${twilioNumber.phone_number}`,
          phoneNumberSid: twilioNumber.sid,
          accountSid: twilioNumber.account_sid,
          country: 'US', // Default to US, can be enhanced later
          numberType: 'local', // Default type
          capabilities: JSON.stringify(twilioNumber.capabilities || {}),
          voiceUrl: twilioNumber.voice_url,
          voiceMethod: twilioNumber.voice_method,
          statusCallback: twilioNumber.status_callback,
          campaignId: null,
          isActive: true,
          monthlyFee: '1.0000' // Default fee
        });

        importedNumbers.push(newNumber);
      }

      res.json({
        success: true,
        imported: importedNumbers.length,
        skipped: skippedNumbers.length,
        importedNumbers,
        skippedNumbers,
        message: `Imported ${importedNumbers.length} numbers, skipped ${skippedNumbers.length} existing numbers`
      });
    } catch (error) {
      console.error('Error importing phone numbers:', error);
      res.status(500).json({ 
        error: 'Failed to import phone numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/phone-numbers/search', requireAuth, async (req, res) => {
    try {
      const { country = 'US', numberType = 'local', areaCode, contains, limit = 20 } = req.body;
      
      // Direct Twilio API call to avoid import issues
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!accountSid || !authToken) {
        return res.status(500).json({
          error: 'Twilio credentials not configured',
          details: 'Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables'
        });
      }

      // Map number types to Twilio API endpoints
      const typeMapping: Record<string, string> = {
        'local': 'Local',
        'toll-free': 'TollFree',
        'mobile': 'Local' // Mobile numbers are typically searched as Local in the US
      };

      const twilioType = typeMapping[numberType] || 'Local';
      const searchParams = new URLSearchParams({
        VoiceEnabled: 'true',
        PageSize: Math.min(limit, 50).toString()
      });

      if (areaCode) {
        searchParams.append('AreaCode', areaCode);
      }
      if (contains) {
        searchParams.append('Contains', contains);
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country.toUpperCase()}/${twilioType}.json?${searchParams}`;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Twilio API error:', response.status, errorText);
        return res.status(500).json({
          error: 'Failed to search phone numbers',
          details: `Twilio API returned ${response.status}: ${errorText}`
        });
      }

      const data = await response.json();
      const numbers = data.available_phone_numbers?.map((num: any) => ({
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name || num.phone_number,
        region: num.region || country,
        isoCountry: num.iso_country || country,
        capabilities: {
          voice: num.capabilities?.voice || false,
          SMS: num.capabilities?.sms || false,
          MMS: num.capabilities?.mms || false
        }
      })) || [];

      res.json({
        success: true,
        numbers,
        searchParams: { country, numberType, areaCode, contains, limit }
      });
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      res.status(500).json({ 
        error: 'Failed to search phone numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/phone-numbers/purchase', requireAuth, async (req, res) => {
    try {
      const { phoneNumber, friendlyName, campaignId } = req.body;
      const userId = req.user?.id;

      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      // Set up voice URL for the webhook
      const voiceUrl = `https://${req.hostname}/api/webhooks/twilio/voice`;
      const statusCallback = `https://${req.hostname}/api/webhooks/twilio/status`;

      const { twilioPhoneService } = await import('./twilio-phone-service');
      
      // Purchase the number from Twilio
      const twilioResult = await twilioPhoneService.purchasePhoneNumber({
        phoneNumber,
        voiceUrl,
        statusCallback,
        friendlyName: friendlyName || `Number ${phoneNumber}`
      });

      // Save to database
      const newNumber = await storage.createPhoneNumber({
        userId,
        phoneNumber: twilioResult.phoneNumber,
        friendlyName: twilioResult.friendlyName,
        phoneNumberSid: twilioResult.phoneNumberSid,
        accountSid: twilioResult.accountSid,
        country: req.body.country || 'US',
        numberType: req.body.numberType || 'local',
        capabilities: JSON.stringify(twilioResult.capabilities),
        voiceUrl: twilioResult.voiceUrl,
        voiceMethod: twilioResult.voiceMethod,
        statusCallback: twilioResult.statusCallback,
        campaignId: campaignId || null,
        isActive: true,
        monthlyFee: '1.0000'
      });

      res.json({
        success: true,
        phoneNumber: newNumber,
        twilioData: twilioResult
      });
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      res.status(500).json({ 
        error: 'Failed to purchase phone number',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/phone-numbers/:id/assign-campaign', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      const updatedNumber = await storage.assignPhoneNumberToCampaign(parseInt(id), campaignId);
      
      if (!updatedNumber) {
        return res.status(404).json({ error: 'Phone number not found' });
      }

      res.json({
        success: true,
        phoneNumber: updatedNumber
      });
    } catch (error) {
      console.error('Error assigning phone number to campaign:', error);
      res.status(500).json({ error: 'Failed to assign phone number to campaign' });
    }
  });

  app.post('/api/phone-numbers/:id/unassign-campaign', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const updatedNumber = await storage.unassignPhoneNumberFromCampaign(parseInt(id));
      
      if (!updatedNumber) {
        return res.status(404).json({ error: 'Phone number not found' });
      }

      res.json({
        success: true,
        phoneNumber: updatedNumber
      });
    } catch (error) {
      console.error('Error unassigning phone number from campaign:', error);
      res.status(500).json({ error: 'Failed to unassign phone number from campaign' });
    }
  });

  app.delete('/api/phone-numbers/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the phone number to release from Twilio
      const phoneNumber = await storage.getPhoneNumber(parseInt(id));
      if (!phoneNumber) {
        return res.status(404).json({ error: 'Phone number not found' });
      }

      // Release from Twilio
      try {
        const { twilioPhoneService } = await import('./twilio-phone-service');
        await twilioPhoneService.releasePhoneNumber(phoneNumber.phoneNumberSid);
      } catch (twilioError) {
        console.warn('Failed to release number from Twilio:', twilioError);
        // Continue with database deletion even if Twilio fails
      }

      // Delete from database
      const deleted = await storage.deletePhoneNumber(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Phone number not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting phone number:', error);
      res.status(500).json({ error: 'Failed to delete phone number' });
    }
  });

  // Number Pool API endpoints
  app.get('/api/number-pools', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const pools = await storage.getNumberPools(userId);
      res.json(pools);
    } catch (error) {
      console.error('Error fetching number pools:', error);
      res.status(500).json({ error: 'Failed to fetch number pools' });
    }
  });

  app.get('/api/number-pools/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const pool = await storage.getNumberPool(parseInt(id));
      
      if (!pool) {
        return res.status(404).json({ error: 'Number pool not found' });
      }

      // Get assigned numbers for this pool
      const numbers = await storage.getPoolNumbers(pool.id);
      
      res.json({
        ...pool,
        assignedNumbers: numbers
      });
    } catch (error) {
      console.error('Error fetching number pool:', error);
      res.status(500).json({ error: 'Failed to fetch number pool' });
    }
  });

  app.post('/api/number-pools', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { selectedNumbers, ...poolData } = req.body;
      const poolDataWithUser = { ...poolData, userId };
      
      // Create the pool first
      const newPool = await storage.createNumberPool(poolDataWithUser);
      
      // Initialize webhook result
      let updateResult = { success: false, updated: [], failed: [], errors: ['No webhook update attempted'] };
      
      // If selectedNumbers array is provided, assign those numbers to the pool
      if (selectedNumbers && Array.isArray(selectedNumbers) && selectedNumbers.length > 0) {
        console.log(`Assigning ${selectedNumbers.length} numbers to pool ${newPool.id}`);
        
        // Assign each selected number to the pool
        for (const phoneNumberId of selectedNumbers) {
          try {
            await storage.assignNumberToPool(newPool.id, phoneNumberId);
          } catch (assignError: any) {
            console.error(`Failed to assign number ${phoneNumberId} to pool ${newPool.id}:`, assignError);
            // Continue with other numbers even if one fails
          }
        }
        
        // Update pool size to match actual assigned numbers
        const assignedCount = await storage.getPoolAssignedCount(newPool.id);
        if (assignedCount !== newPool.poolSize) {
          await storage.updateNumberPool(newPool.id, { poolSize: assignedCount });
          newPool.poolSize = assignedCount;
        }

        // Update Twilio webhooks for all assigned numbers
        try {
          const poolNumbers = await storage.getPoolNumbers(newPool.id);
          if (poolNumbers.length > 0) {
            console.log(`Updating Twilio webhooks for ${poolNumbers.length} numbers in pool ${newPool.id}`);
            
            const { TwilioWebhookService } = await import('./twilio-webhook-service');
            updateResult = await TwilioWebhookService.updatePoolWebhooks(newPool.id, poolNumbers);
            
            if (updateResult.success) {
              console.log(`Successfully updated webhooks for ${updateResult.updated.length} numbers`);
            }
            
            if (updateResult.failed.length > 0) {
              console.warn(`Failed to update webhooks for ${updateResult.failed.length} numbers:`, updateResult.errors);
            }
          }
        } catch (webhookError) {
          console.error('Error updating Twilio webhooks:', webhookError);
          // Don't fail pool creation if webhook update fails
          updateResult = { success: false, updated: [], failed: [], errors: [webhookError.message] };
        }
      }
      
      res.json({
        ...newPool,
        webhookResult: updateResult
      });
    } catch (error: any) {
      console.error('Error creating number pool:', error);
      
      // Handle duplicate pool name error with specific message
      if (error.message && error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to create number pool' });
    }
  });

  app.put('/api/number-pools/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedPool = await storage.updateNumberPool(parseInt(id), req.body);
      
      if (!updatedPool) {
        return res.status(404).json({ error: 'Number pool not found' });
      }

      res.json(updatedPool);
    } catch (error) {
      console.error('Error updating number pool:', error);
      res.status(500).json({ error: 'Failed to update number pool' });
    }
  });

  app.delete('/api/number-pools/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get pool numbers before deletion for webhook cleanup
      const poolNumbers = await storage.getPoolNumbers(parseInt(id));
      
      const deleted = await storage.deleteNumberPool(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Number pool not found' });
      }

      // Reset webhook URLs for all numbers that were in the pool
      if (poolNumbers.length > 0) {
        try {
          console.log(`Resetting webhooks for ${poolNumbers.length} numbers from deleted pool ${id}`);
          
          const { TwilioWebhookService } = await import('./twilio-webhook-service');
          const resetResult = await TwilioWebhookService.resetNumbersToUnassigned(poolNumbers);
          
          if (resetResult.success) {
            console.log(`Successfully reset webhooks for ${resetResult.updated.length} numbers`);
          }
          
          if (resetResult.failed.length > 0) {
            console.warn(`Failed to reset webhooks for ${resetResult.failed.length} numbers:`, resetResult.errors);
          }
          
          res.json({ 
            success: true, 
            webhookReset: resetResult 
          });
        } catch (webhookError) {
          console.error('Error resetting webhooks:', webhookError);
          // Don't fail deletion if webhook reset fails
          res.json({ 
            success: true, 
            webhookResetError: 'Failed to reset webhooks, but pool was deleted successfully' 
          });
        }
      } else {
        res.json({ success: true });
      }
    } catch (error) {
      console.error('Error deleting number pool:', error);
      res.status(500).json({ error: 'Failed to delete number pool' });
    }
  });

  // Pool assignment endpoints
  app.post('/api/number-pools/:poolId/assign-number', requireAuth, async (req, res) => {
    try {
      const { poolId } = req.params;
      const { phoneNumberId, priority = 1 } = req.body;
      
      const assignment = await storage.assignNumberToPool(parseInt(poolId), phoneNumberId, priority);
      res.json(assignment);
    } catch (error: any) {
      console.error('Error assigning number to pool:', error);
      
      // Handle duplicate assignment error with specific message
      if (error.message && error.message.includes('already assigned to pool')) {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to assign number to pool' });
    }
  });

  app.delete('/api/number-pools/:poolId/numbers/:phoneNumberId', requireAuth, async (req, res) => {
    try {
      const { poolId, phoneNumberId } = req.params;
      const removed = await storage.removeNumberFromPool(parseInt(poolId), parseInt(phoneNumberId));
      
      if (!removed) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing number from pool:', error);
      res.status(500).json({ error: 'Failed to remove number from pool' });
    }
  });

  // Campaign pool assignment endpoints
  app.get('/api/campaigns/:campaignId/pools', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const assignedPools = await storage.getCampaignPools(parseInt(campaignId));
      
      console.log(`Fetching pools for campaign ${campaignId}:`, assignedPools);
      res.json(assignedPools || []);
    } catch (error) {
      console.error('Error fetching campaign pools:', error);
      res.status(500).json({ error: 'Failed to fetch campaign pools' });
    }
  });

  app.post('/api/campaigns/:campaignId/assign-pool', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { poolId, priority = 1 } = req.body;
      
      const assignment = await storage.assignPoolToCampaign(parseInt(campaignId), poolId, priority);
      res.json(assignment);
    } catch (error) {
      console.error('Error assigning pool to campaign:', error);
      res.status(500).json({ error: 'Failed to assign pool to campaign' });
    }
  });

  app.post('/api/campaigns/:campaignId/unassign-pool', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { poolId } = req.body;
      
      const removed = await storage.removePoolFromCampaign(parseInt(campaignId), poolId);
      
      if (!removed) {
        return res.status(404).json({ error: 'Pool assignment not found' });
      }

      res.json({ success: true, message: 'Pool unassigned from campaign successfully' });
    } catch (error) {
      console.error('Error unassigning pool from campaign:', error);
      res.status(500).json({ error: 'Failed to unassign pool from campaign' });
    }
  });

  app.delete('/api/campaigns/:campaignId/pools/:poolId', requireAuth, async (req, res) => {
    try {
      const { campaignId, poolId } = req.params;
      const removed = await storage.removePoolFromCampaign(parseInt(campaignId), parseInt(poolId));
      
      if (!removed) {
        return res.status(404).json({ error: 'Pool assignment not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing pool from campaign:', error);
      res.status(500).json({ error: 'Failed to remove pool from campaign' });
    }
  });

  // Campaign pool statistics endpoint
  app.get('/api/campaigns/:campaignId/pool-stats', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const campaign = await storage.getCampaign(parseInt(campaignId));
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Get pools assigned to this campaign
      const assignedPools = await storage.getCampaignPools(parseInt(campaignId));
      
      if (!assignedPools || assignedPools.length === 0) {
        return res.status(404).json({ error: 'No number pools assigned to this campaign' });
      }

      // Calculate aggregate statistics across all assigned pools
      let totalNumbers = 0;
      let availableNumbers = 0;
      let assignedNumbers = 0;

      for (const pool of assignedPools) {
        const poolNumbers = await storage.getPoolNumbers(pool.id);
        const poolSize = poolNumbers.length;
        
        totalNumbers += poolSize;
        availableNumbers += poolSize; // All numbers in pool are available for rotation
        assignedNumbers += poolSize; // All numbers are assigned to this campaign
      }

      const utilizationRate = totalNumbers > 0 ? Math.round((assignedNumbers / totalNumbers) * 100) : 0;

      res.json({
        totalNumbers,
        availableNumbers,
        assignedNumbers,
        utilizationRate,
        poolCount: assignedPools.length
      });
    } catch (error) {
      console.error('Error getting campaign pool stats:', error);
      res.status(500).json({ error: 'Failed to get campaign pool statistics' });
    }
  });

  // Admin routes - Clear database using direct SQL commands
  app.post('/api/admin/clear-database', requireAuth, async (req, res) => {
    try {
      console.log('Starting database clear operation...');
      
      let clearedCount = 0;
      const errors = [];
      
      // Clear in proper order to handle foreign key constraints
      const clearCommands = [
        'DELETE FROM call_logs',
        'DELETE FROM agent_calls', 
        'DELETE FROM agent_status_logs',
        'DELETE FROM calls',
        'DELETE FROM campaign_buyers',
        'DELETE FROM campaign_pool_assignments',
        'DELETE FROM number_pool_assignments',
        'DELETE FROM call_tracking_tags',
        'DELETE FROM dni_sessions',
        'DELETE FROM dni_snippets',
        'DELETE FROM number_pools',
        'DELETE FROM phone_numbers',
        'DELETE FROM buyers',
        'DELETE FROM agents',
        'DELETE FROM publishers',
        'DELETE FROM campaigns'
      ];
      
      // Execute deletions
      for (const command of clearCommands) {
        try {
          const result = await db.execute(sql.raw(command));
          clearedCount++;
          console.log(`Executed: ${command}`);
        } catch (error) {
          const errorMsg = `Failed to execute ${command}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.warn(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      // Reset sequences individually
      const sequences = [
        'campaigns_id_seq',
        'buyers_id_seq', 
        'agents_id_seq',
        'phone_numbers_id_seq', 
        'number_pools_id_seq',
        'calls_id_seq',
        'call_tracking_tags_id_seq',
        'publishers_id_seq'
      ];
      
      for (const seq of sequences) {
        try {
          await db.execute(sql.raw(`SELECT setval('${seq}', 1, false)`));
          console.log(`Reset sequence: ${seq}`);
        } catch (e) {
          console.log(`Sequence reset warning for ${seq}:`, e);
        }
      }

      console.log(`Database clear completed: ${clearedCount} operations, ${errors.length} errors`);
      
      res.json({
        success: true,
        message: 'Database cleared successfully - all data removed',
        clearedOperations: clearedCount,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error clearing database:', error);
      res.status(500).json({ 
        error: 'Failed to clear database',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Publisher routes
  app.get('/api/publishers', requireAuth, async (req, res) => {
    try {
      const publishers = await storage.getPublishers();
      res.json(publishers);
    } catch (error) {
      console.error('Error fetching publishers:', error);
      res.status(500).json({ error: 'Failed to fetch publishers' });
    }
  });

  app.get('/api/publishers/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const publisher = await storage.getPublisher(parseInt(id));
      
      if (!publisher) {
        return res.status(404).json({ error: 'Publisher not found' });
      }
      
      res.json(publisher);
    } catch (error) {
      console.error('Error fetching publisher:', error);
      res.status(500).json({ error: 'Failed to fetch publisher' });
    }
  });

  app.post('/api/publishers', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { insertPublisherSchema } = await import('@shared/schema');
      
      // Add userId to the request body before validation
      const dataWithUserId = {
        ...req.body,
        userId: user.id
      };
      
      const validatedData = insertPublisherSchema.parse(dataWithUserId);
      
      const newPublisher = await storage.createPublisher(validatedData);
      res.status(201).json(newPublisher);
    } catch (error) {
      console.error('Error creating publisher:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid publisher data', details: error.message });
      }
      res.status(500).json({ error: 'Failed to create publisher' });
    }
  });

  app.put('/api/publishers/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { insertPublisherSchema } = await import('@shared/schema');
      const validatedData = insertPublisherSchema.partial().parse(req.body);
      
      const updatedPublisher = await storage.updatePublisher(parseInt(id), validatedData);
      
      if (!updatedPublisher) {
        return res.status(404).json({ error: 'Publisher not found' });
      }
      
      res.json(updatedPublisher);
    } catch (error) {
      console.error('Error updating publisher:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid publisher data', details: error.message });
      }
      res.status(500).json({ error: 'Failed to update publisher' });
    }
  });

  app.delete('/api/publishers/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePublisher(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Publisher not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting publisher:', error);
      res.status(500).json({ error: 'Failed to delete publisher' });
    }
  });

  app.get('/api/publishers/:id/campaigns', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const campaigns = await storage.getPublisherCampaigns(parseInt(id));
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching publisher campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch publisher campaigns' });
    }
  });

  app.post('/api/publishers/:publisherId/campaigns/:campaignId', requireAuth, async (req, res) => {
    try {
      const { publisherId, campaignId } = req.params;
      const { customPayout } = req.body;
      
      const assignment = await storage.addPublisherToCampaign(
        parseInt(publisherId), 
        parseInt(campaignId), 
        customPayout
      );
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error assigning publisher to campaign:', error);
      res.status(500).json({ error: 'Failed to assign publisher to campaign' });
    }
  });

  app.delete('/api/publishers/:publisherId/campaigns/:campaignId', requireAuth, async (req, res) => {
    try {
      const { publisherId, campaignId } = req.params;
      
      const removed = await storage.removePublisherFromCampaign(
        parseInt(publisherId), 
        parseInt(campaignId)
      );
      
      if (!removed) {
        return res.status(404).json({ error: 'Publisher campaign assignment not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing publisher from campaign:', error);
      res.status(500).json({ error: 'Failed to remove publisher from campaign' });
    }
  });

  // Dynamic Number Insertion (DNI) API Endpoints
  // Removed conflicting /api/dni/track handler - using tracking tag compatible version later in file



  // Generate HTML snippet for integration
  app.get('/api/dni/snippet/:campaignId', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const domain = req.hostname;
      const snippet = DNIService.generateHTMLSnippet(campaignId, campaign.name, domain);
      
      res.json({
        campaignId,
        campaignName: campaign.name,
        htmlSnippet: snippet,
        jsLibraryUrl: `https://${domain}/dni.js`,
        apiEndpoint: `https://${domain}/api/dni/track`
      });
    } catch (error) {
      console.error('Error generating DNI snippet:', error);
      res.status(500).json({ error: 'Failed to generate DNI snippet' });
    }
  });

  // Twilio Webhook Endpoints for Live Call Handling
  // These endpoints handle incoming calls and route them to buyers
  app.post('/api/webhooks/twilio/voice', handleIncomingCall);
  app.post('/api/webhooks/twilio/status', handleCallStatus);
  app.post('/api/webhooks/twilio/recording', handleRecordingStatus);

  // Test webhook endpoint for development
  app.get('/api/webhooks/twilio/test', (req, res) => {
    res.json({
      success: true,
      message: 'Twilio webhook endpoints are configured',
      endpoints: {
        voice: '/api/webhooks/twilio/voice',
        status: '/api/webhooks/twilio/status',
        recording: '/api/webhooks/twilio/recording'
      }
    });
  });

  // Call routing test endpoint
  app.post('/api/call-routing/test', async (req, res) => {
    try {
      const { campaignId, callerNumber } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      // Import CallRouter for testing
      const { CallRouter } = await import('./call-routing');
      
      // Test the routing logic
      const routingResult = await CallRouter.selectBuyer(campaignId, callerNumber);
      
      res.json(routingResult);
    } catch (error) {
      console.error('Call routing test error:', error);
      res.status(500).json({
        selectedBuyer: null,
        reason: 'Error testing call routing: ' + (error instanceof Error ? error.message : 'Unknown error'),
        alternativeBuyers: []
      });
    }
  });

  // Simple test call endpoint for dashboard
  app.post('/api/test-call', async (req, res) => {
    try {
      // Set proper content type
      res.setHeader('Content-Type', 'application/json');
      
      console.log('[Test Call] Full request body:', req.body);
      console.log('[Test Call] Request headers:', req.headers['content-type']);
      
      const buyerNumber = req.body?.buyerNumber;
      console.log('[Test Call] Extracted buyer number:', buyerNumber);
      
      const targetNumber = buyerNumber && buyerNumber.trim() ? buyerNumber.trim() : '+15559876543';
      
      // Generate a test call SID for demonstration
      const callSid = 'CA' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Log the test call
      console.log(`[Test Call] Simulated test call initiated to ${targetNumber}:`, callSid);
      
      // Create a test call record
      const testCall = await storage.createCall({
        status: 'completed',
        fromNumber: '+15551234567',
        toNumber: targetNumber,
        campaignId: null,
        callSid: callSid,
        duration: 30,
        cost: '0.0150',
        revenue: '0.0000'
      });

      const response = {
        success: true,
        message: `Test call simulated successfully to ${targetNumber}`,
        callSid: callSid,
        callId: testCall.id,
        targetNumber: targetNumber
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Test call error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        error: 'Failed to simulate test call',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Campaign-specific test call endpoint
  app.post('/api/campaigns/test-call', async (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      const { campaignId, callerNumber } = req.body;
      
      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      // Get campaign details to find the campaign phone number
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const campaignPhoneNumber = campaign.phoneNumber || '+15551234567';
      const incomingCallerNumber = callerNumber || '+19876543210';

      console.log(`[Campaign Test Call] Simulating incoming call from ${incomingCallerNumber} to campaign number ${campaignPhoneNumber}`);
      
      // Check if campaign has buyers assigned
      const campaignBuyers = await storage.getCampaignBuyers(campaignId);
      console.log(`[Campaign Test Call] Found ${campaignBuyers.length} buyers for campaign ${campaignId}:`, 
        campaignBuyers.map(b => `${b.name} (ID: ${b.id}, Status: ${b.status}, Priority: ${b.priority})`));
      
      // Import CallRouter for actual routing logic
      const { CallRouter } = await import('./call-routing');
      
      // Use the actual call routing logic
      const routingResult = await CallRouter.selectBuyer(campaignId, incomingCallerNumber);
      
      console.log(`[Campaign Test Call] Routing result:`, {
        selectedBuyer: routingResult.selectedBuyer ? `${routingResult.selectedBuyer.name} (ID: ${routingResult.selectedBuyer.id})` : 'None',
        reason: routingResult.reason,
        alternativeBuyers: routingResult.alternativeBuyers.length
      });
      
      // Generate a test call SID
      const callSid = 'CA' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      if (routingResult.selectedBuyer) {
        // Create a call record showing incoming call routed to buyer
        const testCall = await storage.createCall({
          status: 'completed',
          fromNumber: incomingCallerNumber,
          toNumber: campaignPhoneNumber,
          campaignId: campaignId,
          buyerId: routingResult.selectedBuyer.id,
          callSid: callSid,
          duration: 30,
          cost: '0.0150',
          revenue: '0.0000'
        });

        // Create a call log for the routing decision
        await storage.createCallLog({
          callId: testCall.id,
          buyerId: routingResult.selectedBuyer.id,
          action: 'route',
          response: `Test call routed to ${routingResult.selectedBuyer.name}`,
        });

        console.log(`[Campaign Test Call] Incoming call routed to buyer: ${routingResult.selectedBuyer.name}`);
      } else {
        // Create a call record showing no buyer available for incoming call
        const testCall = await storage.createCall({
          status: 'failed',
          fromNumber: incomingCallerNumber,
          toNumber: campaignPhoneNumber,
          campaignId: campaignId,
          callSid: callSid,
          duration: 0,
          cost: '0.0000',
          revenue: '0.0000'
        });

        console.log(`[Campaign Test Call] No buyer available for incoming call: ${routingResult.reason}`);
      }
      
      const response = {
        success: true,
        campaignId: campaignId,
        callSid: callSid,
        selectedBuyer: routingResult.selectedBuyer,
        reason: routingResult.reason,
        alternativeBuyers: routingResult.alternativeBuyers
      };
      
      console.log('[Campaign Test Call] API Response:', JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error('Campaign test call error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        error: 'Failed to test campaign call routing',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Agent Routing & Management API
  app.get('/api/agents/dashboard', async (req, res) => {
    try {
      const { AgentRouter } = await import('./agent-routing');
      const dashboard = await AgentRouter.getAgentDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error('Agent dashboard error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch agent dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/agents/:id/status', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const { status, reason } = req.body;
      
      const { AgentRouter } = await import('./agent-routing');
      await AgentRouter.updateAgentStatus(agentId, status, reason);
      
      res.json({ success: true, message: 'Agent status updated' });
    } catch (error) {
      console.error('Agent status update error:', error);
      res.status(500).json({ 
        error: 'Failed to update agent status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/calls/:id/route', async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      const { campaignId, requiredSkills = [] } = req.body;
      
      const { AgentRouter } = await import('./agent-routing');
      const result = await AgentRouter.routeCall(callId, campaignId, requiredSkills);
      
      res.json(result);
    } catch (error) {
      console.error('Call routing error:', error);
      res.status(500).json({ 
        error: 'Failed to route call',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/calls/:id/complete', async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      const { disposition, rating, notes } = req.body;
      
      const { AgentRouter } = await import('./agent-routing');
      await AgentRouter.completeCall(callId, disposition, rating, notes);
      
      res.json({ success: true, message: 'Call completed successfully' });
    } catch (error) {
      console.error('Call completion error:', error);
      res.status(500).json({ 
        error: 'Failed to complete call',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/agents/:id/metrics', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const days = parseInt(req.query.days as string) || 30;
      
      const { AgentRouter } = await import('./agent-routing');
      const metrics = await AgentRouter.getAgentMetrics(agentId, days);
      
      res.json(metrics);
    } catch (error) {
      console.error('Agent metrics error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch agent metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/agents/:id/active-calls', async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const activeCalls = await storage.getAgentActiveCalls(agentId);
      res.json(activeCalls);
    } catch (error) {
      console.error('Agent active calls error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch agent active calls',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/agents/:agentId/campaigns/:campaignId', async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const campaignId = parseInt(req.params.campaignId);
      const { priority = 1 } = req.body;
      
      const assignment = await storage.assignAgentToCampaign(agentId, campaignId, priority);
      res.json(assignment);
    } catch (error) {
      console.error('Agent campaign assignment error:', error);
      res.status(500).json({ 
        error: 'Failed to assign agent to campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete('/api/agents/:agentId/campaigns/:campaignId', async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const campaignId = parseInt(req.params.campaignId);
      
      const success = await storage.removeAgentFromCampaign(agentId, campaignId);
      if (success) {
        res.json({ success: true, message: 'Agent removed from campaign' });
      } else {
        res.status(404).json({ error: 'Assignment not found' });
      }
    } catch (error) {
      console.error('Agent campaign removal error:', error);
      res.status(500).json({ 
        error: 'Failed to remove agent from campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Twilio Trunk Management API Routes
  app.post('/api/campaigns/:id/trunk/create', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { friendlyName, domainName, secure, cnamLookupEnabled } = req.body;

      const trunkConfig = await TwilioTrunkService.createTrunk(campaignId, {
        friendlyName,
        domainName,
        secure,
        cnam_lookup_enabled: cnamLookupEnabled
      });

      res.json({
        success: true,
        trunk: trunkConfig,
        message: 'SIP trunk created successfully'
      });
    } catch (error) {
      console.error('Error creating trunk:', error);
      res.status(500).json({ 
        error: 'Failed to create SIP trunk',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Number Provisioning API Routes
  app.post('/api/campaigns/:id/provision-numbers', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { quantity = 10, areaCode, numberType = 'local' } = req.body;

      const config = {
        campaignId,
        quantity: Math.min(quantity, 100), // Cap at 100 numbers
        areaCode,
        numberType,
        capabilities: {
          voice: true,
          sms: true
        }
      };

      const result = await NumberProvisioningService.provisionNumbers(config);

      if (result.success) {
        res.json({
          success: true,
          numbers: result.numbers,
          totalCost: result.totalCost,
          message: `Successfully provisioned ${result.numbers.length} phone numbers`
        });
      } else {
        res.status(400).json({
          error: 'Failed to provision numbers',
          details: result.error,
          failedNumbers: result.failedNumbers
        });
      }
    } catch (error) {
      console.error('Error provisioning numbers:', error);
      res.status(500).json({ 
        error: 'Failed to provision phone numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DNI (Dynamic Number Insertion) API endpoints
  app.get('/api/dni/number', async (req, res) => {
    // CORS headers for external domain access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      const request = req.query as any;
      const response = await DNIService.getTrackingNumber(request);
      res.json(response);
    } catch (error) {
      console.error('DNI service error:', error);
      res.status(500).json({
        phoneNumber: '',
        formattedNumber: '',
        campaignId: 0,
        campaignName: '',
        trackingId: '',
        success: false,
        error: 'Internal server error'
      });
    }
  });

  app.get('/api/dni/sdk/:campaignId', async (req, res) => {
    // CORS headers for external domain access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      const campaignId = parseInt(req.params.campaignId);
      const domain = req.get('host') || 'localhost:5000';
      const sdk = DNIService.generateJavaScriptSDK(domain);
      
      res.setHeader('Content-Type', 'application/javascript');
      res.send(sdk);
    } catch (error) {
      console.error('DNI SDK generation error:', error);
      res.status(500).send('// Error generating SDK');
    }
  });

  app.get('/api/dni/snippet/:campaignId', async (req, res) => {
    // CORS headers for external domain access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      const campaignId = parseInt(req.params.campaignId);
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const domain = req.get('host') || 'localhost:5000';
      const snippet = DNIService.generateHTMLSnippet(campaignId, campaign.name, domain);
      
      res.json({ snippet, success: true });
    } catch (error) {
      console.error('DNI snippet generation error:', error);
      res.status(500).json({ error: 'Failed to generate snippet' });
    }
  });

  app.get('/api/campaigns/:id/numbers', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const numbers = await storage.getCampaignByPhoneNumber(campaignId.toString());
      
      res.json({
        numbers: numbers ? [numbers] : [],
        success: true
      });
    } catch (error) {
      console.error('Error getting campaign numbers:', error);
      res.status(500).json({ 
        error: 'Failed to get campaign numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/numbers/search', requireAuth, async (req, res) => {
    try {
      const { quantity = 10, areaCode, numberType = 'local' } = req.query;

      const config = {
        quantity: Math.min(parseInt(quantity as string), 100),
        areaCode: areaCode as string,
        numberType: numberType as 'local' | 'toll-free',
        capabilities: {
          voice: true,
          sms: true
        }
      };

      const availableNumbers = await NumberProvisioningService.searchAvailableNumbers(config);
      const pricing = await NumberProvisioningService.getPricingInfo(config.numberType, config.areaCode);

      res.json({
        availableNumbers: availableNumbers.slice(0, config.quantity),
        pricing,
        success: true
      });
    } catch (error) {
      console.error('Error searching numbers:', error);
      res.status(500).json({ 
        error: 'Failed to search available numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete('/api/numbers/:sid/release', requireAuth, async (req, res) => {
    try {
      const { sid } = req.params;
      const result = await NumberProvisioningService.releaseNumbers([sid]);

      if (result.success) {
        res.json({
          success: true,
          message: 'Number released successfully'
        });
      } else {
        res.status(400).json({
          error: 'Failed to release number',
          details: result.failed
        });
      }
    } catch (error) {
      console.error('Error releasing number:', error);
      res.status(500).json({ 
        error: 'Failed to release phone number',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/campaigns/:id/trunk/provision-numbers', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { trunkSid, count = 10, areaCode } = req.body;

      if (!trunkSid) {
        return res.status(400).json({ error: 'Trunk SID is required' });
      }

      const phoneNumbers = await TwilioTrunkService.provisionNumbers(
        trunkSid,
        campaignId,
        count,
        areaCode
      );

      res.json({
        success: true,
        phoneNumbers,
        count: phoneNumbers.length,
        message: `Successfully provisioned ${phoneNumbers.length} phone numbers`
      });
    } catch (error) {
      console.error('Error provisioning numbers:', error);
      res.status(500).json({ 
        error: 'Failed to provision phone numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/campaigns/:id/assign-tracking-number', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { sessionId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, ipAddress, userAgent, referrer } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const utmData = {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm
      };

      const visitorData = {
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.get('User-Agent') || '',
        referrer
      };

      const assignment = await TwilioTrunkService.assignNumberFromPool(
        campaignId,
        sessionId,
        utmData,
        visitorData
      );

      if (!assignment) {
        return res.status(503).json({ 
          error: 'No available phone numbers in pool',
          message: 'All numbers are currently assigned. Please try again later.'
        });
      }

      res.json({
        success: true,
        assignment: {
          phoneNumber: assignment.phoneNumber,
          formattedNumber: assignment.phoneNumber.replace(/^\+1/, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
          sessionId: assignment.sessionId,
          campaignId: assignment.campaignId,
          assignedAt: assignment.assignedAt,
          expiresAt: assignment.expiresAt
        },
        trackingData: {
          utm: assignment.utmData,
          visitor: assignment.visitorData
        }
      });
    } catch (error) {
      console.error('Error assigning tracking number:', error);
      res.status(500).json({ 
        error: 'Failed to assign tracking number',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/campaigns/:id/pool-stats', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const stats = TwilioTrunkService.getPoolStats(campaignId);

      if (!stats) {
        return res.status(404).json({ error: 'No number pool found for this campaign' });
      }

      res.json({
        success: true,
        stats: {
          totalNumbers: stats.totalNumbers,
          availableNumbers: stats.availableNumbers,
          assignedNumbers: stats.assignedNumbers,
          utilizationRate: Math.round((stats.assignedNumbers / stats.totalNumbers) * 100),
          activeAssignments: stats.activeAssignments.map(assignment => ({
            sessionId: assignment.sessionId,
            phoneNumber: assignment.phoneNumber,
            assignedAt: assignment.assignedAt,
            expiresAt: assignment.expiresAt,
            utmData: assignment.utmData
          }))
        }
      });
    } catch (error) {
      console.error('Error getting pool stats:', error);
      res.status(500).json({ 
        error: 'Failed to get pool statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/campaigns/:id/release-number', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const released = await TwilioTrunkService.releaseNumber(campaignId, sessionId);

      if (!released) {
        return res.status(404).json({ error: 'Assignment not found or already released' });
      }

      res.json({
        success: true,
        message: 'Phone number released back to pool'
      });
    } catch (error) {
      console.error('Error releasing number:', error);
      res.status(500).json({ 
        error: 'Failed to release phone number',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Twilio Trunk Webhook for incoming calls
  app.post('/api/twilio/trunk/voice', async (req, res) => {
    try {
      const { CallSid, From, To, CallerName } = req.body;

      console.log('Trunk call received:', { CallSid, From, To, CallerName });

      const { twiml, assignment } = await TwilioTrunkService.handleTrunkCall(
        CallSid,
        From,
        To,
        CallerName
      );

      // Log call details for tracking
      if (assignment) {
        console.log('Call matched to tracking session:', {
          sessionId: assignment.sessionId,
          campaignId: assignment.campaignId,
          utmData: assignment.utmData
        });
      }

      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    } catch (error) {
      console.error('Error handling trunk call:', error);
      
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, we're experiencing technical difficulties. Please try again later.</Say>
          <Hangup/>
        </Response>`;
      
      res.set('Content-Type', 'text/xml');
      res.status(500).send(errorTwiml);
    }
  });

  // JavaScript SDK for tracking number assignment
  app.get('/api/campaigns/:id/tracking-sdk.js', async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).send('// Campaign not found');
      }

      const domain = req.get('host') || 'localhost:5000';
      
      const sdkCode = `
(function() {
  'use strict';
  
  // Campaign Tracking SDK for ${campaign.name}
  var CampaignTracker = {
    campaignId: ${campaignId},
    apiBase: 'https://${domain}/api',
    sessionId: null,
    trackingNumber: null,
    
    // Generate unique session ID
    generateSessionId: function() {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Extract UTM parameters from URL
    getUtmParameters: function() {
      var params = new URLSearchParams(window.location.search);
      return {
        utmSource: params.get('utm_source'),
        utmMedium: params.get('utm_medium'),
        utmCampaign: params.get('utm_campaign'),
        utmContent: params.get('utm_content'),
        utmTerm: params.get('utm_term')
      };
    },
    
    // Get visitor information
    getVisitorData: function() {
      return {
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        ipAddress: null // Will be detected server-side
      };
    },
    
    // Request tracking number assignment
    assignTrackingNumber: function(callback) {
      var self = this;
      if (!this.sessionId) {
        this.sessionId = this.generateSessionId();
      }
      
      var requestData = Object.assign({
        sessionId: this.sessionId
      }, this.getUtmParameters(), this.getVisitorData());
      
      fetch(this.apiBase + '/campaigns/' + this.campaignId + '/assign-tracking-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (data.success) {
          self.trackingNumber = data.assignment.phoneNumber;
          self.formattedNumber = data.assignment.formattedNumber;
          
          // Store in session storage
          sessionStorage.setItem('trackingSessionId', self.sessionId);
          sessionStorage.setItem('trackingNumber', self.trackingNumber);
          sessionStorage.setItem('formattedNumber', self.formattedNumber);
          
          if (callback) callback(null, data.assignment);
        } else {
          if (callback) callback(new Error(data.error || 'Failed to assign tracking number'));
        }
      })
      .catch(function(error) {
        if (callback) callback(error);
      });
    },
    
    // Update phone numbers on page
    updatePhoneNumbers: function(selector) {
      var self = this;
      selector = selector || '[data-tracking-phone]';
      
      this.assignTrackingNumber(function(error, assignment) {
        if (error) {
          console.error('Tracking number assignment failed:', error);
          return;
        }
        
        var elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
          var element = elements[i];
          var format = element.getAttribute('data-format') || 'formatted';
          
          if (format === 'raw') {
            element.textContent = assignment.phoneNumber;
          } else {
            element.textContent = assignment.formattedNumber;
          }
          
          // Update href for tel: links
          if (element.tagName === 'A' && element.href.indexOf('tel:') === 0) {
            element.href = 'tel:' + assignment.phoneNumber;
          }
        }
      });
    },
    
    // Initialize tracking
    init: function(options) {
      options = options || {};
      
      // Check for existing session
      var existingSessionId = sessionStorage.getItem('trackingSessionId');
      var existingNumber = sessionStorage.getItem('trackingNumber');
      var existingFormatted = sessionStorage.getItem('formattedNumber');
      
      if (existingSessionId && existingNumber) {
        this.sessionId = existingSessionId;
        this.trackingNumber = existingNumber;
        this.formattedNumber = existingFormatted;
        
        // Update page immediately with cached number
        if (options.autoUpdate !== false) {
          this.updatePhoneNumbers(options.selector);
        }
      } else {
        // Assign new tracking number
        if (options.autoUpdate !== false) {
          this.updatePhoneNumbers(options.selector);
        }
      }
    }
  };
  
  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      CampaignTracker.init();
    });
  } else {
    CampaignTracker.init();
  }
  
  // Expose to global scope
  window.CampaignTracker = CampaignTracker;
})();`;

      res.set('Content-Type', 'application/javascript');
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.send(sdkCode);
    } catch (error) {
      console.error('Error generating tracking SDK:', error);
      res.status(500).send('// Error generating tracking SDK');
    }
  });

  // Call Tracking Tags API Routes - DNI System
  
  // Get all tracking tags for a campaign
  app.get('/api/campaigns/:campaignId/tracking-tags', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = (req.user as any)?.id || 1;
      
      const tags = await db.select().from(callTrackingTags)
        .where(and(
          eq(callTrackingTags.campaignId, parseInt(campaignId)),
          eq(callTrackingTags.userId, userId),
          eq(callTrackingTags.isActive, true)
        ))
        .orderBy(desc(callTrackingTags.createdAt));
      
      // Manually fetch related data for each tag
      const tagsWithRelations = await Promise.all(tags.map(async (tag) => {
        let primaryNumber = null;
        let pool = null;
        let publisher = null;
        
        if (tag.primaryNumberId) {
          const phoneResult = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, tag.primaryNumberId));
          primaryNumber = phoneResult[0] || null;
        }
        
        if (tag.poolId) {
          const poolResult = await db.select().from(numberPools).where(eq(numberPools.id, tag.poolId));
          pool = poolResult[0] || null;
        }
        
        if (tag.publisherId) {
          const publisherResult = await db.select().from(publishers).where(eq(publishers.id, tag.publisherId));
          publisher = publisherResult[0] || null;
        }
        
        return {
          ...tag,
          primaryNumber,
          pool,
          publisher
        };
      }));
      
      res.json(tagsWithRelations);
    } catch (error) {
      console.error('Error fetching tracking tags:', error);
      res.status(500).json({ error: 'Failed to fetch tracking tags' });
    }
  });

  // Create new tracking tag
  app.post('/api/campaigns/:campaignId/tracking-tags', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user?.id;
      
      const tagData = {
        name: req.body.name,
        tagCode: req.body.tagCode,
        campaignId: parseInt(campaignId),
        userId: userId || 1,
        primaryNumberId: req.body.primaryNumberId || null,
        numberToReplace: req.body.numberToReplace || null,
        poolId: req.body.poolId || null,
        rotationStrategy: req.body.rotationStrategy || 'round_robin',
        publisherId: req.body.publisherId || null,
        captureUserData: req.body.captureUserData || false,
        sessionTimeout: req.body.sessionTimeout || 1800,
        stickyDuration: req.body.stickyDuration || 86400,
        isActive: true
      };
      
      const [newTag] = await db.insert(callTrackingTags).values([tagData]).returning();
      
      // Generate JavaScript code for the tag
      const domain = req.get('host') || 'localhost:5000';
      const jsCode = CallTrackingService.generateJavaScriptCode(
        tagData.tagCode,
        `http://${domain}`,
        tagData.numberToReplace || '',
        tagData.captureUserData
      );
      
      const htmlSnippet = CallTrackingService.generateHTMLSnippet(
        tagData.tagCode,
        tagData.numberToReplace || '',
        `http://${domain}`
      );
      
      // Save the generated snippet
      await db.insert(dniSnippets).values([{
        tagId: newTag.id,
        jsCode,
        htmlSnippet,
        domains: [domain],
        selectors: ['.tracking-number', '[data-tracking-number]']
      }]);
      
      res.json({
        success: true,
        tag: newTag,
        jsCode,
        htmlSnippet
      });
    } catch (error) {
      console.error('Error creating tracking tag:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid tracking tag data', details: error.message });
      }
      res.status(500).json({ error: 'Failed to create tracking tag' });
    }
  });

  // Update tracking tag
  app.put('/api/tracking-tags/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const validatedData = insertCallTrackingTagSchema.partial().parse(req.body);
      
      const updatedTag = await db
        .update(callTrackingTags)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(and(
          eq(callTrackingTags.id, parseInt(id)),
          eq(callTrackingTags.userId, userId)
        ))
        .returning();
      
      if (updatedTag.length === 0) {
        return res.status(404).json({ error: 'Tracking tag not found' });
      }
      
      res.json(updatedTag[0]);
    } catch (error) {
      console.error('Error updating tracking tag:', error);
      res.status(500).json({ error: 'Failed to update tracking tag' });
    }
  });

  // Delete tracking tag
  app.delete('/api/tracking-tags/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const deletedTag = await db
        .update(callTrackingTags)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(callTrackingTags.id, parseInt(id)),
          eq(callTrackingTags.userId, userId)
        ))
        .returning();
      
      if (deletedTag.length === 0) {
        return res.status(404).json({ error: 'Tracking tag not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting tracking tag:', error);
      res.status(500).json({ error: 'Failed to delete tracking tag' });
    }
  });

  // Get tracking tag code snippets
  app.get('/api/tracking-tags/:id/snippets', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const tag = await db.query.callTrackingTags.findFirst({
        where: and(
          eq(callTrackingTags.id, parseInt(id)),
          eq(callTrackingTags.userId, userId)
        )
      });
      
      if (!tag) {
        return res.status(404).json({ error: 'Tracking tag not found' });
      }
      
      const snippet = await db.query.dniSnippets.findFirst({
        where: eq(dniSnippets.tagId, parseInt(id))
      });
      
      if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found' });
      }
      
      res.json({
        jsCode: snippet.jsCode,
        htmlSnippet: snippet.htmlSnippet,
        tagCode: tag.tagCode
      });
    } catch (error) {
      console.error('Error fetching snippets:', error);
      res.status(500).json({ error: 'Failed to fetch snippets' });
    }
  });

  // DNI tracking endpoint for website integration (BEFORE auth middleware)
  app.post('/api/dni/track', async (req, res) => {
    // Additional CORS headers for DNI endpoint
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      console.log('=== DNI Track Handler Called ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Content-Type:', req.headers['content-type']);
      
      // Extract the request data properly
      const { tagCode, sessionId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referrer, domain, visitorId } = req.body;
      
      if (!tagCode) {
        return res.status(400).json({
          phoneNumber: '',
          formattedNumber: '',
          campaignId: 0,
          campaignName: '',
          trackingId: '',
          success: false,
          error: 'tagCode is required'
        });
      }
      
      const requestData: DNIRequest = {
        tagCode,
        sessionId,
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        content: utmContent,
        term: utmTerm,
        referrer,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        customFields: {
          domain,
          visitorId
        }
      };
      
      const response = await DNIService.getTrackingNumber(requestData);
      res.json(response);
    } catch (error) {
      console.error('DNI tracking error:', error);
      res.status(500).json({
        phoneNumber: '',
        formattedNumber: '',
        campaignId: 0,
        campaignName: '',
        trackingId: '',
        success: false,
        error: 'Failed to get tracking number'
      });
    }
  });

  // Handle OPTIONS preflight requests for DNI endpoints
  app.options('/api/dni/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.sendStatus(200);
  });

  // Get tracking tag analytics
  app.get('/api/tracking-tags/:id/analytics', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;
      const userId = req.user?.id;
      
      const tag = await db.query.callTrackingTags.findFirst({
        where: and(
          eq(callTrackingTags.id, parseInt(id)),
          eq(callTrackingTags.userId, userId)
        )
      });
      
      if (!tag) {
        return res.status(404).json({ error: 'Tracking tag not found' });
      }
      
      const analytics = await CallTrackingService.getTagAnalytics(parseInt(id), parseInt(days as string));
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // RTB Routes
  
  // RTB Targets
  app.get('/api/rtb/targets', requireAuth, async (req: any, res) => {
    try {
      const targets = await storage.getRtbTargets();
      res.json(targets);
    } catch (error) {
      console.error('Error fetching RTB targets:', error);
      res.status(500).json({ error: 'Failed to fetch RTB targets' });
    }
  });

  app.get('/api/rtb/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const target = await storage.getRtbTarget(parseInt(id));
      if (!target) {
        return res.status(404).json({ error: 'RTB target not found' });
      }
      res.json(target);
    } catch (error) {
      console.error('Error fetching RTB target:', error);
      res.status(500).json({ error: 'Failed to fetch RTB target' });
    }
  });

  app.post('/api/rtb/targets', requireAuth, async (req: any, res) => {
    try {
      const targetData = { ...req.body, userId: req.user.id };
      const target = await storage.createRtbTarget(targetData);
      res.status(201).json(target);
    } catch (error) {
      console.error('Error creating RTB target:', error);
      res.status(500).json({ error: 'Failed to create RTB target' });
    }
  });

  app.put('/api/rtb/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const target = await storage.updateRtbTarget(parseInt(id), req.body);
      if (!target) {
        return res.status(404).json({ error: 'RTB target not found' });
      }
      res.json(target);
    } catch (error) {
      console.error('Error updating RTB target:', error);
      res.status(500).json({ error: 'Failed to update RTB target' });
    }
  });

  app.delete('/api/rtb/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteRtbTarget(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: 'RTB target not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting RTB target:', error);
      res.status(500).json({ error: 'Failed to delete RTB target' });
    }
  });

  // Clear all RTB targets for user
  app.delete('/api/rtb/targets/clear-all', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get all targets for the user
      const targets = await storage.getRtbTargets();
      const userTargets = targets.filter(target => target.userId === userId);
      
      // Delete all user targets (this will also remove router assignments)
      for (const target of userTargets) {
        await storage.deleteRtbTarget(target.id);
      }
      
      res.json({ 
        success: true, 
        deletedCount: userTargets.length,
        message: `Deleted ${userTargets.length} RTB targets`
      });
    } catch (error) {
      console.error('Error clearing all RTB targets:', error);
      res.status(500).json({ error: 'Failed to clear RTB targets' });
    }
  });

  // RTB Routers
  app.get('/api/rtb/routers', requireAuth, async (req: any, res) => {
    try {
      const routers = await storage.getRtbRouters();
      res.json(routers);
    } catch (error) {
      console.error('Error fetching RTB routers:', error);
      res.status(500).json({ error: 'Failed to fetch RTB routers' });
    }
  });

  app.get('/api/rtb/routers/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const router = await storage.getRtbRouter(parseInt(id));
      if (!router) {
        return res.status(404).json({ error: 'RTB router not found' });
      }
      res.json(router);
    } catch (error) {
      console.error('Error fetching RTB router:', error);
      res.status(500).json({ error: 'Failed to fetch RTB router' });
    }
  });

  app.post('/api/rtb/routers', requireAuth, async (req: any, res) => {
    try {
      const routerData = { ...req.body, userId: req.user.id };
      const router = await storage.createRtbRouter(routerData);
      res.status(201).json(router);
    } catch (error) {
      console.error('Error creating RTB router:', error);
      res.status(500).json({ error: 'Failed to create RTB router' });
    }
  });

  app.put('/api/rtb/routers/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const router = await storage.updateRtbRouter(parseInt(id), req.body);
      if (!router) {
        return res.status(404).json({ error: 'RTB router not found' });
      }
      res.json(router);
    } catch (error) {
      console.error('Error updating RTB router:', error);
      res.status(500).json({ error: 'Failed to update RTB router' });
    }
  });

  app.delete('/api/rtb/routers/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteRtbRouter(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: 'RTB router not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting RTB router:', error);
      res.status(500).json({ error: 'Failed to delete RTB router' });
    }
  });

  // RTB Router Assignments
  app.get('/api/rtb/routers/:id/assignments', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const assignments = await storage.getRtbRouterAssignments(parseInt(id));
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching RTB router assignments:', error);
      res.status(500).json({ error: 'Failed to fetch RTB router assignments' });
    }
  });

  app.post('/api/rtb/routers/:routerId/targets/:targetId', requireAuth, async (req: any, res) => {
    try {
      const { routerId, targetId } = req.params;
      const assignment = await storage.createRtbRouterAssignment({
        rtbRouterId: parseInt(routerId),
        rtbTargetId: parseInt(targetId),
        priority: req.body.priority || 1,
        weight: req.body.weight || 100,
        isActive: req.body.isActive ?? true
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Error creating RTB router assignment:', error);
      res.status(500).json({ error: 'Failed to create RTB router assignment' });
    }
  });

  app.delete('/api/rtb/routers/:routerId/targets/:targetId', requireAuth, async (req: any, res) => {
    try {
      const { routerId, targetId } = req.params;
      const success = await storage.deleteRtbRouterAssignment(parseInt(routerId), parseInt(targetId));
      if (!success) {
        return res.status(404).json({ error: 'RTB router assignment not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting RTB router assignment:', error);
      res.status(500).json({ error: 'Failed to delete RTB router assignment' });
    }
  });

  // RTB Bid Requests and Responses
  app.get('/api/rtb/bid-requests', requireAuth, async (req: any, res) => {
    try {
      const { campaignId } = req.query;
      const requests = await storage.getRtbBidRequests(campaignId ? parseInt(campaignId as string) : undefined);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching RTB bid requests:', error);
      res.status(500).json({ error: 'Failed to fetch RTB bid requests' });
    }
  });

  app.get('/api/rtb/bid-requests/:requestId/responses', requireAuth, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const responses = await storage.getRtbBidResponses(requestId);
      res.json(responses);
    } catch (error) {
      console.error('Error fetching RTB bid responses:', error);
      res.status(500).json({ error: 'Failed to fetch RTB bid responses' });
    }
  });

  // RTB Seeding Endpoint (Admin/Development)
  app.post('/api/rtb/seed-data', requireAuth, async (req, res) => {
    try {
      console.log('Starting RTB data seeding...');
      const { RTBSeeder } = await import('./rtb-seeder');
      const results = await RTBSeeder.seedAll();
      
      res.json({
        success: true,
        message: 'RTB sample data created successfully',
        data: {
          router: results.router.name,
          targetsCreated: results.targets.length,
          assignmentsCreated: results.assignments.length,
          bidRequestsCreated: results.bidRequests.length,
          bidResponsesCreated: results.bidResponses.length
        }
      });
    } catch (error) {
      console.error('Error seeding RTB data:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to seed RTB data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}