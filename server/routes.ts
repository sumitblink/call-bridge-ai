import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./hybrid-storage";
import { insertCampaignSchema, insertBuyerSchema } from "@shared/schema";
import { z } from "zod";
import twilio from "twilio";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get all campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Get single campaign
  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  // Create new campaign
  app.post("/api/campaigns", async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Update campaign
  app.patch("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      // Validate the update data
      const updateData = req.body;
      if (updateData.status && !["active", "paused", "completed", "draft"].includes(updateData.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const campaign = await storage.updateCampaign(id, updateData);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const success = await storage.deleteCampaign(id);
      if (!success) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Get dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get all agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Get all calls
  app.get("/api/calls", async (req, res) => {
    try {
      const calls = await storage.getCalls();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Buyer Management Routes

  // Get all buyers
  app.get("/api/buyers", async (req, res) => {
    try {
      const buyers = await storage.getBuyers();
      res.json(buyers);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      res.status(500).json({ message: "Failed to fetch buyers" });
    }
  });

  // Get single buyer
  app.get("/api/buyers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid buyer ID" });
      }

      const buyer = await storage.getBuyer(id);
      if (!buyer) {
        return res.status(404).json({ message: "Buyer not found" });
      }

      res.json(buyer);
    } catch (error) {
      console.error("Error fetching buyer:", error);
      res.status(500).json({ message: "Failed to fetch buyer" });
    }
  });

  // Create new buyer
  app.post("/api/buyers", async (req, res) => {
    try {
      const validatedData = insertBuyerSchema.parse(req.body);
      const buyer = await storage.createBuyer(validatedData);
      res.status(201).json(buyer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid buyer data", 
          errors: error.errors 
        });
      }
      console.error("Error creating buyer:", error);
      res.status(500).json({ message: "Failed to create buyer" });
    }
  });

  // Update buyer
  app.patch("/api/buyers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid buyer ID" });
      }

      const validatedData = insertBuyerSchema.partial().parse(req.body);
      const buyer = await storage.updateBuyer(id, validatedData);
      
      if (!buyer) {
        return res.status(404).json({ message: "Buyer not found" });
      }

      res.json(buyer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid buyer data", 
          errors: error.errors 
        });
      }
      console.error("Error updating buyer:", error);
      res.status(500).json({ message: "Failed to update buyer" });
    }
  });

  // Delete buyer
  app.delete("/api/buyers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid buyer ID" });
      }

      const success = await storage.deleteBuyer(id);
      if (!success) {
        return res.status(404).json({ message: "Buyer not found" });
      }

      res.json({ message: "Buyer deleted successfully" });
    } catch (error) {
      console.error("Error deleting buyer:", error);
      res.status(500).json({ message: "Failed to delete buyer" });
    }
  });

  // Get buyers for a campaign
  app.get("/api/campaigns/:id/buyers", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const buyers = await storage.getCampaignBuyers(campaignId);
      res.json(buyers);
    } catch (error) {
      console.error("Error fetching campaign buyers:", error);
      res.status(500).json({ message: "Failed to fetch campaign buyers" });
    }
  });

  // Add buyer to campaign
  app.post("/api/campaigns/:id/buyers", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const { buyerId, priority = 1 } = req.body;
      if (!buyerId || isNaN(parseInt(buyerId))) {
        return res.status(400).json({ message: "Valid buyer ID is required" });
      }

      const campaignBuyer = await storage.addBuyerToCampaign(campaignId, parseInt(buyerId), priority);
      res.json(campaignBuyer);
    } catch (error) {
      console.error("Error adding buyer to campaign:", error);
      res.status(500).json({ message: "Failed to add buyer to campaign" });
    }
  });

  // Remove buyer from campaign
  app.delete("/api/campaigns/:id/buyers/:buyerId", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const buyerId = parseInt(req.params.buyerId);
      
      if (isNaN(campaignId) || isNaN(buyerId)) {
        return res.status(400).json({ message: "Invalid campaign or buyer ID" });
      }

      const success = await storage.removeBuyerFromCampaign(campaignId, buyerId);
      if (success) {
        res.json({ message: "Buyer removed from campaign successfully" });
      } else {
        res.status(404).json({ message: "Buyer not found in campaign" });
      }
    } catch (error) {
      console.error("Error removing buyer from campaign:", error);
      res.status(500).json({ message: "Failed to remove buyer from campaign" });
    }
  });

  // Enhanced Twilio webhook with ping/post routing
  app.post("/api/call/inbound", async (req, res) => {
    try {
      const { To: phoneNumber, From: fromNumber, CallSid: callSid } = req.body;
      
      if (!phoneNumber) {
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say("Invalid request. Goodbye.");
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
      }

      // Look up campaign by phone number
      const campaign = await storage.getCampaignByPhoneNumber(phoneNumber);
      const twiml = new twilio.twiml.VoiceResponse();
      
      if (campaign && campaign.status === 'active') {
        // Get active buyers for this campaign
        const buyers = await storage.pingBuyersForCall(campaign.id, {
          fromNumber,
          toNumber: phoneNumber,
          callSid
        });

        if (buyers.length > 0) {
          // Route to first available buyer (priority-based)
          const buyer = buyers[0];
          
          // Create call record
          await storage.createCall({
            campaignId: campaign.id,
            buyerId: buyer.id,
            callSid,
            fromNumber,
            toNumber: phoneNumber,
            status: 'ringing'
          });

          twiml.say("You are being connected");
          twiml.dial(buyer.phoneNumber);
        } else {
          twiml.say("No buyers available. Please try again later.");
          twiml.hangup();
        }
      } else {
        twiml.say("Campaign not found. Goodbye.");
        twiml.hangup();
      }
      
      res.type('text/xml').send(twiml.toString());
    } catch (error) {
      console.error("Error processing inbound call:", error);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("System error. Please try again later.");
      twiml.hangup();
      res.type('text/xml').send(twiml.toString());
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
