import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-db";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCampaignSchema, insertBuyerSchema, insertAgentSchema } from "@shared/schema";
import { twilioService } from "./twilio-service";
import { PixelService, type PixelMacroData, type PixelFireRequest } from "./pixel-service";
import { z } from "zod";
import twilio from "twilio";
import fetch from "node-fetch";

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
          password: null,
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

  // Campaigns
  app.get('/api/campaigns', async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
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

  app.post('/api/campaigns', async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
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
  app.get('/api/buyers', async (req, res) => {
    try {
      const buyers = await storage.getBuyers();
      res.json(buyers);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      res.status(500).json({ error: "Failed to fetch buyers" });
    }
  });

  app.post('/api/buyers', async (req, res) => {
    try {
      const validatedData = insertBuyerSchema.parse(req.body);
      const buyer = await storage.createBuyer(validatedData);
      res.status(201).json(buyer);
    } catch (error) {
      console.error("Error creating buyer:", error);
      res.status(500).json({ error: "Failed to create buyer" });
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

  const httpServer = createServer(app);
  return httpServer;
}