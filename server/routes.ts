import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-db";
import { insertCampaignSchema, insertBuyerSchema, insertAgentSchema } from "@shared/schema";
import { twilioService } from "./twilio-service";
import { PixelService, type PixelMacroData, type PixelFireRequest } from "./pixel-service";
import { CallRouter } from "./call-routing";
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

  app.get('/api/campaigns/:id', async (req, res) => {
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
      const { To: toNumber, From: fromNumber, CallSid } = req.body;
      
      console.log(`[Webhook] Incoming call from ${fromNumber} to ${toNumber}, CallSid: ${CallSid}`);
      
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
          <Dial timeout="30" callerId="${fromNumber}">
            <Number statusCallback="https://${req.hostname}/api/webhooks/call-status">${selectedBuyer.phoneNumber}</Number>
          </Dial>
          <Say>The call could not be connected. Goodbye.</Say>
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
      
      // Log call status update
      await storage.createCallLog({
        callSid: CallSid,
        status: CallStatus,
        duration: CallDuration ? parseInt(CallDuration) : null,
        timestamp: new Date(),
        details: JSON.stringify(req.body)
      });
      
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('[Webhook] Error processing call status:', error);
      res.status(500).send('Error');
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

  const httpServer = createServer(app);
  return httpServer;
}