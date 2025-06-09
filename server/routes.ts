import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./hybrid-storage";
import { insertCampaignSchema, insertBuyerSchema, insertAgentSchema } from "@shared/schema";
import { twilioService } from "./twilio-service";
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

  // Campaign phone number lookup
  app.get("/api/campaigns/phone/:phoneNumber", async (req, res) => {
    try {
      const phoneNumber = req.params.phoneNumber;
      const campaign = await storage.getCampaignByPhoneNumber(phoneNumber);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found for this phone number" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Error finding campaign by phone:", error);
      res.status(500).json({ message: "Failed to lookup campaign" });
    }
  });

  // Ping buyers for a campaign
  app.post("/api/campaigns/:id/ping", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }

      const callData = req.body;
      const buyers = await storage.pingBuyersForCall(campaignId, callData);
      
      res.json(buyers);
    } catch (error) {
      console.error("Error pinging buyers:", error);
      res.status(500).json({ message: "Failed to ping buyers" });
    }
  });

  // Post call to specific buyer
  app.post("/api/buyers/:id/post", async (req, res) => {
    try {
      const buyerId = parseInt(req.params.id);
      if (isNaN(buyerId)) {
        return res.status(400).json({ message: "Invalid buyer ID" });
      }

      const callData = req.body;
      const success = await storage.postCallToBuyer(buyerId, callData);
      
      res.json({ success, message: success ? "Call posted successfully" : "Failed to post call" });
    } catch (error) {
      console.error("Error posting call to buyer:", error);
      res.status(500).json({ message: "Failed to post call" });
    }
  });

  // Get call logs for a specific call
  app.get("/api/calls/:id/logs", async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      if (isNaN(callId)) {
        return res.status(400).json({ message: "Invalid call ID" });
      }

      const logs = await storage.getCallLogs(callId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching call logs:", error);
      res.status(500).json({ message: "Failed to fetch call logs" });
    }
  });

  // Create a new call
  app.post("/api/calls", async (req, res) => {
    try {
      const callData = req.body;
      const call = await storage.createCall(callData);
      res.status(201).json(call);
    } catch (error) {
      console.error("Error creating call:", error);
      res.status(500).json({ message: "Failed to create call" });
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

  // =============================================================================
  // AGENT ROUTES
  // =============================================================================

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

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  // Create new agent
  app.post("/api/agents", async (req, res) => {
    try {
      const validatedData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid agent data", 
          errors: error.errors 
        });
      }
      console.error("Error creating agent:", error);
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  // Update agent
  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }

      const validatedData = insertAgentSchema.partial().parse(req.body);
      const agent = await storage.updateAgent(id, validatedData);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid agent data", 
          errors: error.errors 
        });
      }
      console.error("Error updating agent:", error);
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  // =============================================================================
  // TWILIO CALL RECORDING API ENDPOINTS
  // =============================================================================

  // Start call recording
  app.post("/api/calls/:callSid/recording/start", async (req, res) => {
    try {
      const { callSid } = req.params;
      const result = await twilioService.enableCallRecording(callSid);
      res.json(result);
    } catch (error) {
      console.error("Error starting recording:", error);
      res.status(500).json({ error: "Failed to start recording" });
    }
  });

  // Stop call recording
  app.post("/api/calls/:callSid/recording/stop", async (req, res) => {
    try {
      const { callSid } = req.params;
      const { recordingSid } = req.body;
      const result = await twilioService.stopCallRecording(callSid, recordingSid);
      res.json(result);
    } catch (error) {
      console.error("Error stopping recording:", error);
      res.status(500).json({ error: "Failed to stop recording" });
    }
  });

  // Get recording status
  app.get("/api/recordings/:recordingSid/status", async (req, res) => {
    try {
      const { recordingSid } = req.params;
      const result = await twilioService.getRecordingStatus(recordingSid);
      res.json(result);
    } catch (error) {
      console.error("Error getting recording status:", error);
      res.status(500).json({ error: "Failed to get recording status" });
    }
  });

  // Transcribe recording
  app.post("/api/recordings/:recordingSid/transcribe", async (req, res) => {
    try {
      const { recordingSid } = req.params;
      const result = await twilioService.transcribeRecording(recordingSid);
      res.json(result);
    } catch (error) {
      console.error("Error transcribing recording:", error);
      res.status(500).json({ error: "Failed to transcribe recording" });
    }
  });

  // =============================================================================
  // TWILIO CALL CONTROL API ENDPOINTS
  // =============================================================================

  // Transfer call
  app.post("/api/calls/:callSid/transfer", async (req, res) => {
    try {
      const { callSid } = req.params;
      const { targetNumber } = req.body;
      const result = await twilioService.transferCall(callSid, targetNumber);
      res.json(result);
    } catch (error) {
      console.error("Error transferring call:", error);
      res.status(500).json({ error: "Failed to transfer call" });
    }
  });

  // Hold call
  app.post("/api/calls/:callSid/hold", async (req, res) => {
    try {
      const { callSid } = req.params;
      const result = await twilioService.holdCall(callSid);
      res.json(result);
    } catch (error) {
      console.error("Error holding call:", error);
      res.status(500).json({ error: "Failed to hold call" });
    }
  });

  // Resume call
  app.post("/api/calls/:callSid/resume", async (req, res) => {
    try {
      const { callSid } = req.params;
      const result = await twilioService.resumeCall(callSid);
      res.json(result);
    } catch (error) {
      console.error("Error resuming call:", error);
      res.status(500).json({ error: "Failed to resume call" });
    }
  });

  // Mute call
  app.post("/api/calls/:callSid/mute", async (req, res) => {
    try {
      const { callSid } = req.params;
      const result = await twilioService.muteCall(callSid);
      res.json(result);
    } catch (error) {
      console.error("Error muting call:", error);
      res.status(500).json({ error: "Failed to mute call" });
    }
  });

  // Unmute call
  app.post("/api/calls/:callSid/unmute", async (req, res) => {
    try {
      const { callSid } = req.params;
      const result = await twilioService.unmuteCall(callSid);
      res.json(result);
    } catch (error) {
      console.error("Error unmuting call:", error);
      res.status(500).json({ error: "Failed to unmute call" });
    }
  });

  // Create conference call
  app.post("/api/conference/create", async (req, res) => {
    try {
      const { participants } = req.body;
      const result = await twilioService.createConferenceCall(participants);
      res.json(result);
    } catch (error) {
      console.error("Error creating conference:", error);
      res.status(500).json({ error: "Failed to create conference call" });
    }
  });

  // =============================================================================
  // TWILIO IVR API ENDPOINTS
  // =============================================================================

  // Create IVR flow for campaign
  app.post("/api/campaigns/:campaignId/ivr", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { greeting, options } = req.body;
      const result = await twilioService.createIVRFlow(parseInt(campaignId), { greeting, options });
      res.json(result);
    } catch (error) {
      console.error("Error creating IVR flow:", error);
      res.status(500).json({ error: "Failed to create IVR flow" });
    }
  });

  // Handle IVR response
  app.post("/api/ivr/response", async (req, res) => {
    try {
      const { callSid, digit, flowSid } = req.body;
      const result = await twilioService.handleIVRResponse(callSid, digit, flowSid);
      
      // Generate TwiML response based on IVR action
      const twiml = new twilio.twiml.VoiceResponse();
      
      switch (result.action) {
        case 'transfer':
          twiml.dial(result.destination);
          break;
        case 'queue':
          twiml.enqueue(result.destination);
          break;
        case 'voicemail':
          twiml.say("Please leave a message after the beep.");
          twiml.record({ action: '/api/ivr/voicemail', maxLength: 30 });
          break;
        case 'operator':
          twiml.say("Connecting you to an operator.");
          twiml.dial(result.destination);
          break;
        case 'prompt':
          twiml.say(result.nextPrompt);
          twiml.gather({
            numDigits: 1,
            action: '/api/ivr/response'
          });
          break;
      }
      
      res.type('text/xml').send(twiml.toString());
    } catch (error) {
      console.error("Error handling IVR response:", error);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say("System error. Please try again later.");
      twiml.hangup();
      res.type('text/xml').send(twiml.toString());
    }
  });

  // Play IVR message
  app.post("/api/calls/:callSid/ivr/play", async (req, res) => {
    try {
      const { callSid } = req.params;
      const { message } = req.body;
      const result = await twilioService.playIVRMessage(callSid, message);
      res.json(result);
    } catch (error) {
      console.error("Error playing IVR message:", error);
      res.status(500).json({ error: "Failed to play IVR message" });
    }
  });

  // =============================================================================
  // TWILIO WEBHOOK HANDLERS
  // =============================================================================

  // Recording status callback
  app.post("/api/webhooks/recording-status", async (req, res) => {
    try {
      await twilioService.handleRecordingStatusCallback(req.body);
      res.status(200).send('OK');
    } catch (error) {
      console.error("Error handling recording status callback:", error);
      res.status(500).send('Error');
    }
  });

  // Call status callback
  app.post("/api/webhooks/call-status", async (req, res) => {
    try {
      await twilioService.handleCallStatusCallback(req.body);
      res.status(200).send('OK');
    } catch (error) {
      console.error("Error handling call status callback:", error);
      res.status(500).send('Error');
    }
  });

  // =============================================================================
  // INTEGRATIONS API ENDPOINTS
  // =============================================================================

  // URL Parameters endpoints
  app.get("/api/integrations/url-parameters", async (req, res) => {
    try {
      const result = await storage.getUrlParameters();
      res.json(result);
    } catch (error) {
      console.error("Error fetching URL parameters:", error);
      res.status(500).json({ error: "Failed to fetch URL parameters" });
    }
  });

  app.post("/api/integrations/url-parameters", async (req, res) => {
    try {
      const result = await storage.createUrlParameter(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating URL parameter:", error);
      res.status(500).json({ error: "Failed to create URL parameter" });
    }
  });

  // Tracking Pixels endpoints
  app.get("/api/integrations/pixels", async (req, res) => {
    try {
      const result = await storage.getTrackingPixels();
      res.json(result);
    } catch (error) {
      console.error("Error fetching tracking pixels:", error);
      res.status(500).json({ error: "Failed to fetch tracking pixels" });
    }
  });

  app.post("/api/integrations/pixels", async (req, res) => {
    try {
      const result = await storage.createTrackingPixel(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating tracking pixel:", error);
      res.status(500).json({ error: "Failed to create tracking pixel" });
    }
  });

  // Webhook Configs endpoints
  app.get("/api/integrations/webhooks", async (req, res) => {
    try {
      const result = await storage.getWebhookConfigs();
      res.json(result);
    } catch (error) {
      console.error("Error fetching webhook configs:", error);
      res.status(500).json({ error: "Failed to fetch webhook configs" });
    }
  });

  app.post("/api/integrations/webhooks", async (req, res) => {
    try {
      const result = await storage.createWebhookConfig(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating webhook config:", error);
      res.status(500).json({ error: "Failed to create webhook config" });
    }
  });

  // API Authentications endpoints
  app.get("/api/integrations/authentications", async (req, res) => {
    try {
      const result = await storage.getApiAuthentications();
      res.json(result);
    } catch (error) {
      console.error("Error fetching API authentications:", error);
      res.status(500).json({ error: "Failed to fetch API authentications" });
    }
  });

  app.post("/api/integrations/authentications", async (req, res) => {
    try {
      const result = await storage.createApiAuthentication(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating API authentication:", error);
      res.status(500).json({ error: "Failed to create API authentication" });
    }
  });

  // Platform Integrations endpoints
  app.get("/api/integrations/platforms", async (req, res) => {
    try {
      const result = await storage.getPlatformIntegrations();
      res.json(result);
    } catch (error) {
      console.error("Error fetching platform integrations:", error);
      res.status(500).json({ error: "Failed to fetch platform integrations" });
    }
  });

  app.post("/api/integrations/platforms", async (req, res) => {
    try {
      const result = await storage.createPlatformIntegration(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating platform integration:", error);
      res.status(500).json({ error: "Failed to create platform integration" });
    }
  });

  // =============================================================================
  // PUBLISHERS API ENDPOINTS
  // =============================================================================

  // Publishers endpoints
  app.get("/api/publishers", async (req, res) => {
    try {
      const result = await storage.getPublishers();
      res.json(result);
    } catch (error) {
      console.error("Error fetching publishers:", error);
      res.status(500).json({ error: "Failed to fetch publishers" });
    }
  });

  app.get("/api/publishers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.getPublisher(id);
      if (!result) {
        return res.status(404).json({ error: "Publisher not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching publisher:", error);
      res.status(500).json({ error: "Failed to fetch publisher" });
    }
  });

  app.post("/api/publishers", async (req, res) => {
    try {
      const result = await storage.createPublisher(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating publisher:", error);
      res.status(500).json({ error: "Failed to create publisher" });
    }
  });

  app.put("/api/publishers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.updatePublisher(id, req.body);
      if (!result) {
        return res.status(404).json({ error: "Publisher not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error updating publisher:", error);
      res.status(500).json({ error: "Failed to update publisher" });
    }
  });

  app.delete("/api/publishers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePublisher(id);
      if (!success) {
        return res.status(404).json({ error: "Publisher not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting publisher:", error);
      res.status(500).json({ error: "Failed to delete publisher" });
    }
  });

  // Publisher-Campaign relationships
  app.get("/api/publishers/:id/campaigns", async (req, res) => {
    try {
      const publisherId = parseInt(req.params.id);
      const result = await storage.getPublisherCampaigns(publisherId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching publisher campaigns:", error);
      res.status(500).json({ error: "Failed to fetch publisher campaigns" });
    }
  });

  app.post("/api/publishers/:publisherId/campaigns/:campaignId", async (req, res) => {
    try {
      const publisherId = parseInt(req.params.publisherId);
      const campaignId = parseInt(req.params.campaignId);
      const { customPayout } = req.body;
      const result = await storage.addPublisherToCampaign(publisherId, campaignId, customPayout);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error adding publisher to campaign:", error);
      res.status(500).json({ error: "Failed to add publisher to campaign" });
    }
  });

  app.delete("/api/publishers/:publisherId/campaigns/:campaignId", async (req, res) => {
    try {
      const publisherId = parseInt(req.params.publisherId);
      const campaignId = parseInt(req.params.campaignId);
      const success = await storage.removePublisherFromCampaign(publisherId, campaignId);
      if (!success) {
        return res.status(404).json({ error: "Publisher-campaign relationship not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing publisher from campaign:", error);
      res.status(500).json({ error: "Failed to remove publisher from campaign" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
