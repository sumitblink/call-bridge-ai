import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-db";
import { insertCampaignSchema, insertBuyerSchema, insertAgentSchema } from "@shared/schema";
import { twilioService } from "./twilio-service";
import { PixelService, type PixelMacroData, type PixelFireRequest } from "./pixel-service";
import { CallRouter } from "./call-routing";
import { DNIService, type DNIRequest } from "./dni-service";
import { handleIncomingCall, handleCallStatus, handleRecordingStatus } from "./twilio-webhooks";
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
      const success = await storage.removeBuyerFromCampaign(campaignId, buyerId);
      if (!success) {
        return res.status(404).json({ error: "Campaign-buyer relationship not found" });
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

  // Enhanced Twilio Webhook Endpoints for Multi-Number Support
  app.post('/api/webhooks/voice', async (req, res) => {
    try {
      console.log('[Webhook OLD] === INCOMING CALL ON OLD ENDPOINT ===');
      console.log('[Webhook OLD] Request body:', JSON.stringify(req.body, null, 2));
      
      const { To: toNumber, From: fromNumber, CallSid } = req.body;
      
      console.log(`[Webhook OLD] Incoming call from ${fromNumber} to ${toNumber}, CallSid: ${CallSid}`);
      
      // Find campaign by phone number
      const campaign = await storage.getCampaignByPhoneNumber(toNumber);
      
      if (!campaign) {
        console.log(`[Webhook] No campaign found for number ${toNumber}`);
        return res.type('text/xml').send(`
          <Response>
            <Say>Sorry, this number is not configured for call routing.</Say>
            <Hangup/>
          </Response>
        `);
      }

      console.log(`[Webhook] Found campaign: ${campaign.name} (ID: ${campaign.id})`);
      
      // Use priority-based routing to select the best buyer
      const routingResult = await CallRouter.selectBuyer(campaign.id, fromNumber);
      
      if (!routingResult.selectedBuyer) {
        console.log(`[Webhook] No buyers available: ${routingResult.reason}`);
        return res.type('text/xml').send(`
          <Response>
            <Say>All representatives are currently busy. Please try again later.</Say>
            <Hangup/>
          </Response>
        `);
      }

      const selectedBuyer = routingResult.selectedBuyer;
      
      console.log(`[Webhook] Routing call to buyer: ${selectedBuyer.name} (${selectedBuyer.phoneNumber})`);
      
      // Create call record
      await storage.createCall({
        campaignId: campaign.id,
        buyerId: selectedBuyer.id,
        callSid: CallSid,
        fromNumber,
        toNumber,
        status: 'ringing',
        startTime: new Date(),
      });

      // Generate TwiML to dial the buyer
      const twiml = `
        <Response>
          <Say>Connecting your call, please hold.</Say>
          <Dial timeout="30" callerId="${fromNumber}" action="https://${req.hostname}/api/webhooks/dial-status" method="POST">
            <Number>${selectedBuyer.phoneNumber}</Number>
          </Dial>
          <Say>The call has ended. Thank you for calling.</Say>
          <Hangup/>
        </Response>
      `;
      
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
      res.json(numbers);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      res.status(500).json({ error: 'Failed to fetch phone numbers' });
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
        throw new Error(`Twilio API error: ${response.status} ${error}`);
      }

      const data = await response.json() as any;
      const twilioNumbers = data.incoming_phone_numbers || [];
      
      const importedNumbers = [];
      const skippedNumbers = [];

      for (const twilioNumber of twilioNumbers) {
        // Check if number already exists
        const existingNumber = await storage.getPhoneNumberByNumber(twilioNumber.phone_number);
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

  // Admin routes
  app.post('/api/admin/clear-database', requireAuth, async (req, res) => {
    try {
      console.log('Starting database clear operation...');
      
      // Clear data using SQL to avoid foreign key constraint issues
      const { db } = await import('./db');
      
      const queries = [
        'DELETE FROM call_logs',
        'DELETE FROM calls', 
        'DELETE FROM campaign_buyers',
        'DELETE FROM campaign_publishers',
        'DELETE FROM buyers WHERE id != $1', // Keep current user's buyers
        'DELETE FROM campaigns WHERE id != $1', // Keep current user's campaigns  
        'DELETE FROM phone_numbers',
        'DELETE FROM agents',
        'DELETE FROM publishers',
        'DELETE FROM tracking_pixels',
        'DELETE FROM webhook_configs',
        'DELETE FROM api_authentications',
        'DELETE FROM platform_integrations',
        'DELETE FROM url_parameters'
      ];

      let clearedCount = 0;
      
      for (const query of queries) {
        try {
          if (query.includes('$1')) {
            // Skip user-specific data for now, just clear all
            const simpleQuery = query.replace(' WHERE id != $1', '');
            await db.execute(simpleQuery);
          } else {
            await db.execute(query);
          }
          clearedCount++;
        } catch (error) {
          console.warn(`Failed to execute query: ${query}`, error);
        }
      }

      console.log(`Database clear operation completed. Cleared ${clearedCount} tables.`);
      
      res.json({
        success: true,
        message: 'Database cleared successfully',
        clearedTables: clearedCount,
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
  app.post('/api/dni/track', async (req, res) => {
    try {
      const requestData: DNIRequest = {
        campaignId: req.body.campaignId,
        campaignName: req.body.campaignName,
        source: req.body.source,
        medium: req.body.medium,
        campaign: req.body.campaign,
        content: req.body.content,
        term: req.body.term,
        gclid: req.body.gclid,
        fbclid: req.body.fbclid,
        referrer: req.body.referrer,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        sessionId: req.body.sessionId,
        customFields: req.body.customFields
      };

      const response = await DNIService.getTrackingNumber(requestData);
      res.json(response);
    } catch (error) {
      console.error('DNI tracking error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        phoneNumber: '',
        formattedNumber: '',
        campaignId: 0,
        campaignName: '',
        trackingId: ''
      });
    }
  });



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

  const httpServer = createServer(app);
  return httpServer;
}