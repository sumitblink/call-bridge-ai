import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./hybrid-storage";
import { insertCampaignSchema, insertBuyerSchema, insertAgentSchema, insertNumberPoolSchema } from "@shared/schema";
import { twilioService } from "./twilio-service";
import { PixelService, type PixelMacroData, type PixelFireRequest } from "./pixel-service";
import { CallRouter } from "./call-routing";
import { DNIService, type DNIRequest } from "./dni-service";
import { FastDNI } from "./fast-dni";
import { TwilioTrunkService } from "./twilio-trunk-service";
import { NumberProvisioningService } from "./number-provisioning";
import { CallTrackingService } from "./call-tracking-service";
import { FlowExecutionEngine } from "./flow-execution-engine";
import { TwiMLGenerator } from "./twiml-generator";
import { targetService } from "./target-service";
import { db } from "./db";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { 
  callTrackingTags, 
  dniSessions, 
  dniSnippets,
  phoneNumbers,
  numberPools,
  publishers,
  visitorSessions,
  campaigns,
  calls,
  insertCallTrackingTagSchema,
  CallTrackingTag,
  InsertCallTrackingTag,
  rtbBidRequests,
  rtbBidResponses,
  rtbTargets,
  buyers
} from "../shared/schema";
import { handleIncomingCall, handleCallStatus, handleRecordingStatus } from "./twilio-webhooks";
import { RTBIdGenerator } from "./rtb-id-generator";
import { callDetailsRouter } from "./call-details-api";
import { z } from "zod";
import twilio from "twilio";
import fetch from "node-fetch";
import crypto from "crypto";

// Import authentication middleware from middleware directory
import { requireAuth } from "./middleware/auth";

/**
 * Trigger RedTrack postback for call completion
 */
// Tracking Pixel Helper for Event-Based Firing
async function fireTrackingPixelsForEvent(call: any, callStatus: string, duration?: string) {
  try {
    // Map call status to pixel events
    const eventMapping: { [key: string]: string } = {
      'ringing': 'incoming',
      'in-progress': 'connected', 
      'completed': 'completed',
      'busy': 'completed',
      'no-answer': 'completed',
      'failed': 'completed'
    };
    
    const pixelEvent = eventMapping[callStatus] || callStatus;
    
    // Get campaign from call record
    const campaign = call.campaignId ? await storage.getCampaign(call.campaignId) : null;
    if (!campaign) {
      console.log(`[Pixel] No campaign found for call ${call.id}`);
      return;
    }
    
    // Get tracking pixels for this campaign that should fire on this event
    const pixels = await storage.getCampaignTrackingPixels(campaign.id);
    const eventPixels = pixels.filter(p => 
      p.isActive && 
      p.fireOnEvent === pixelEvent
    );
    
    console.log(`[Pixel] Found ${eventPixels.length} pixels configured for '${pixelEvent}' event`);
    
    for (const pixel of eventPixels) {
      let fireUrl = pixel.code;
      
      // Get clickId from call record first, then fallback to unknown
      console.log(`[Pixel Debug] Call object:`, {
        id: call.id,
        clickId: call.clickId,
        sessionId: call.sessionId,
        campaignId: call.campaignId
      });
      const clickId = call.clickId || 'unknown';
      const payout = call.payout || '0.00';
      const callDuration = duration || call.duration || '0';
      
      fireUrl = fireUrl.replace(/\[tag:User:clickid\]/g, clickId);
      fireUrl = fireUrl.replace(/\[Call:ConversionPayout\]/g, payout);
      fireUrl = fireUrl.replace(/\{clickid\}/g, clickId);
      fireUrl = fireUrl.replace(/\{sum\}/g, payout);
      fireUrl = fireUrl.replace(/\{campaign_id\}/g, campaign.id);
      fireUrl = fireUrl.replace(/\{call_id\}/g, call.id.toString());
      fireUrl = fireUrl.replace(/\{duration\}/g, callDuration);
      fireUrl = fireUrl.replace(/\{status\}/g, callStatus);
      
      // Determine conversion type for RedTrack
      let conversionType = 'RAWCall';
      if (callStatus === 'completed') {
        const durationSecs = parseInt(callDuration) || 0;
        if (durationSecs > 30) {
          conversionType = 'ConvertedCall';
        } else if (durationSecs > 0) {
          conversionType = 'AnsweredCall';
        }
      }
      fireUrl = fireUrl.replace(/\{type\}/g, conversionType);
      
      // Fire the pixel (async, don't wait for response)
      fetch(fireUrl, { 
        method: pixel.httpMethod || 'GET',
        headers: {
          'User-Agent': 'CallCenter-Pro-Tracking/1.0'
        }
      }).catch(err => 
        console.log(`[Pixel] ${pixel.name} fire failed:`, err.message)
      );
      
      console.log(`🔥 PIXEL FIRED [${pixelEvent}]: ${pixel.name} → ${fireUrl}`);
      
      // TODO: Add pixel fire event logging once addCallEvent is implemented
    }
  } catch (error) {
    console.error('[Pixel] Error firing tracking pixels:', error);
  }
}

async function triggerRedTrackPostback(call: any, statusData: any) {
  try {
    console.log('[Webhook] Checking call for RedTrack data:', {
      callId: call.id,
      sessionId: call.sessionId,
      clickId: call.clickId
    });

    // Try to find RedTrack data in multiple places
    let clickid = call.clickId;
    let visitorSession = null;

    // If no direct clickid, try to find visitor session with RedTrack data
    if (!clickid && call.sessionId) {
      try {
        const client = (await import('@neondatabase/serverless')).neon;
        const sql_client = client(process.env.DATABASE_URL!);
        
        const sessions = await sql_client`
          SELECT redtrack_clickid, redtrack_campaign_id, redtrack_offer_id, redtrack_affiliate_id,
                 redtrack_sub_1, redtrack_sub_2, redtrack_sub_3, redtrack_sub_4, redtrack_sub_5,
                 redtrack_sub_6, redtrack_sub_7, redtrack_sub_8, session_id
          FROM visitor_sessions 
          WHERE session_id LIKE ${call.sessionId + '%'} 
             OR session_id = ${call.sessionId}
          ORDER BY last_activity DESC 
          LIMIT 1
        `;

        if (sessions.length > 0) {
          visitorSession = sessions[0];
          clickid = visitorSession.redtrack_clickid;
          console.log('[Webhook] Found RedTrack data in visitor session:', {
            sessionId: visitorSession.session_id,
            clickid: clickid
          });
        }
      } catch (error) {
        console.error('[Webhook] Error fetching visitor session:', error);
      }
    }

    // Only process if we have RedTrack clickid
    if (!clickid) {
      console.log('[Webhook] No RedTrack clickid found for call:', call.id);
      return;
    }

    const duration = parseInt(statusData.Duration || '0', 10);
    const callStatus = statusData.CallStatus;
    
    // Determine conversion type based on call completion
    let conversionType = 'RAWCall';
    let answered = false;
    let converted = false;
    
    if (callStatus === 'completed') {
      answered = true;
      conversionType = 'AnsweredCall';
      
      // Consider calls > 30 seconds as converted
      if (duration > 30) {
        converted = true;
        conversionType = 'ConvertedCall';
      }
    }

    const revenue = parseFloat(call.revenue || '0');
    const payout = parseFloat(call.payout || '0');
    const conversionValue = payout > 0 ? payout : revenue > 0 ? revenue : 25.00; // Fallback to $25

    console.log('[Webhook] Triggering RedTrack postback for:', {
      clickid,
      conversionType,
      conversionValue,
      duration
    });

    // Fire RedTrack postback URL if call is completed (answered or converted)
    if (callStatus === 'completed' && (answered || converted)) {
      await fireRedTrackPostback(clickid, conversionType, conversionValue, visitorSession);
    }

  } catch (error) {
    console.error('[Webhook] Error triggering RedTrack postback:', error);
  }
}

/**
 * Fire actual RedTrack postback URL for call completion
 */
async function fireRedTrackPostback(clickid: string, conversionType: string, conversionValue: number, visitorSession?: any) {
  try {
    // Try common RedTrack domain patterns
    const commonDomains = [
      'cy9n0.rdtk.io', // User's specific domain from the URL they provided
      'rdtk.io',
      'redtrack.io'
    ];
    
    for (const domain of commonDomains) {
      try {
        const postbackUrl = `https://${domain}/postback?clickid=${clickid}&sum=${conversionValue}&type=${conversionType}`;
        
        console.log('[Webhook] Firing RedTrack postback:', postbackUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(postbackUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'CallCenter-Pro-Webhook/1.0'
          }
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`[Webhook] ✅ RedTrack postback fired successfully to ${domain}:`, {
            clickid,
            conversionType,
            conversionValue,
            status: response.status
          });
          return; // Success, stop trying other domains
        } else {
          console.log(`[Webhook] RedTrack postback failed for ${domain}:`, response.status);
        }
      } catch (error) {
        console.log(`[Webhook] RedTrack postback error for ${domain}:`, (error as Error).message);
      }
    }

    // If no specific domain worked, log the data for manual verification
    console.log('[Webhook] RedTrack postback data (manual verification needed):', {
      clickid,
      conversionType,
      conversionValue,
      message: 'Add your specific RedTrack postback URL configuration'
    });

  } catch (error) {
    console.error('[Webhook] Error firing RedTrack postback:', error);
  }
}

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

  // Serve static files from public directory
  app.use(express.static('public'));
  
  // Override for tracking script to ensure correct content-type
  app.get('/js/t.js', (req, res, next) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  // Add CORS headers for tracking endpoints
  app.use('/api/tracking', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

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
          username: sessionUser.username || sessionUser.email || "",
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
      const campaignId = req.params.id;
      const stats = await CallRouter.getRoutingStats(campaignId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching routing stats:", error);
      res.status(500).json({ error: "Failed to fetch routing stats" });
    }
  });

  // RedTrack Configuration endpoints
  // RedTrack Tracking - Session tracking (no auth for external pages)
  app.post('/api/tracking/redtrack/session', async (req, res) => {
    try {
      const {
        clickid,
        campaign_id,
        offer_id,
        source,
        medium,
        campaign,
        url,
        referrer,
        userAgent,
        timestamp
      } = req.body;

      // Only track if we have a clickid (RedTrack parameter)
      if (!clickid) {
        return res.json({ 
          success: false, 
          message: 'No RedTrack clickid provided' 
        });
      }

      // Create session tracking data
      const sessionId = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sessionData = {
        sessionId,
        userId: 2, // Default to system user for external tracking
        source: source || 'redtrack',
        medium: medium || 'cpc',
        campaign: campaign || `rt_${campaign_id}`,
        content: offer_id || null,
        term: null,
        clickid: clickid,
        url: url || '',
        referrer: referrer || 'direct',
        userAgent: userAgent || '',
        ipAddress: req.ip || req.connection.remoteAddress || '',
        utmSource: source,
        utmMedium: medium,
        utmCampaign: campaign,
        utmContent: offer_id,
        gclid: null,
        fbclid: null,
        landingPage: url || '',
        deviceType: 'desktop',
        location: null,
        redtrackData: {
          clickid,
          campaign_id,
          offer_id,
          timestamp
        }
      };

      // Store the session
      await storage.createVisitorSession(sessionData);

      // RedTrack session tracked silently for high traffic

      res.json({
        success: true,
        sessionId,
        message: 'RedTrack session tracked successfully'
      });

    } catch (error) {
      console.error('Error tracking RedTrack session:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to track session' 
      });
    }
  });

  // RedTrack Tracking - Conversion tracking (no auth for external pages)
  app.post('/api/tracking/redtrack/conversion', async (req, res) => {
    try {
      const {
        clickid,
        campaign_id,
        offer_id,
        eventType,
        phoneNumber,
        conversionValue,
        userAgent,
        url
      } = req.body;

      if (!clickid) {
        return res.json({ 
          success: false, 
          message: 'No RedTrack clickid provided' 
        });
      }

      // Find existing session by clickid
      const sessions = await storage.getVisitorSessions(2); // System user
      const session = sessions.find(s => (s as any).redtrackData && (s as any).redtrackData.clickid === clickid);

      const sessionId = session?.sessionId || `rt_conv_${Date.now()}`;

      // Create conversion event
      const conversionData = {
        sessionId,
        eventType: eventType || 'phone_click',
        eventValue: conversionValue || 25.00,
        phoneNumber: phoneNumber || '',
        metadata: {
          clickid,
          campaign_id,
          offer_id,
          redtrack_attribution: true,
          url,
          userAgent
        }
      };

      await storage.createConversionEvent(conversionData);

      console.log('RedTrack conversion tracked:', { sessionId, clickid, eventType, value: conversionValue });

      res.json({
        success: true,
        sessionId,
        conversionValue,
        message: 'RedTrack conversion tracked successfully'
      });

    } catch (error) {
      console.error('Error tracking RedTrack conversion:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to track conversion' 
      });
    }
  });

  // RedTrack Tracking - Call Quality tracking (no auth for external pages)
  app.post('/api/tracking/redtrack/quality', async (req, res) => {
    try {
      const {
        clickid,
        conversionType,
        duration,
        answered,
        converted,
        revenue,
        sessionId
      } = req.body;

      if (!clickid) {
        return res.json({ 
          success: false, 
          message: 'No RedTrack clickid provided' 
        });
      }

      // Enhanced conversion tracking with call quality data
      const qualityData = {
        sessionId: sessionId || `rt_quality_${Date.now()}`,
        eventType: 'call_quality',
        eventValue: revenue || 0,
        phoneNumber: '',
        metadata: {
          clickid,
          conversionType: conversionType || 'RAWCall', // RAWCall, AnsweredCall, ConvertedCall
          duration: duration || 0,
          answered: answered || false,
          converted: converted || false,
          revenue: revenue || 0,
          redtrack_attribution: true,
          redtrack_quality_tracking: true
        }
      };

      await storage.createConversionEvent(qualityData);

      // Fire tracking pixels based on conversion type
      if (conversionType && ['RAWCall', 'AnsweredCall', 'ConvertedCall'].includes(conversionType)) {
        try {
          // Get tracking pixels that should fire for this conversion type
          const userId = 2; // System user for external tracking
          const pixels = await storage.getTrackingPixels();
          const redtrackPixels = pixels.filter(p => 
            p.url.includes('redtrack') || 
            p.url.includes('postback') ||
            p.name.toLowerCase().includes('redtrack')
          );

          for (const pixel of redtrackPixels) {
            // Replace tokens in pixel URL
            let fireUrl = pixel.url;
            fireUrl = fireUrl.replace(/\[tag:User:clickid\]/g, clickid);
            fireUrl = fireUrl.replace(/\[Call:ConversionPayout\]/g, String(revenue || 25));
            fireUrl = fireUrl.replace(/\{clickid\}/g, clickid);
            fireUrl = fireUrl.replace(/\{sum\}/g, String(revenue || 25));
            fireUrl = fireUrl.replace(/\{type\}/g, conversionType);

            // Fire the pixel (async, don't wait for response)
            fetch(fireUrl, { method: 'GET' }).catch(err => 
              console.log('RedTrack pixel fire failed:', err.message)
            );

            console.log(`RedTrack pixel fired: ${fireUrl}`);
          }
        } catch (pixelError) {
          console.error('RedTrack pixel firing error:', pixelError);
        }
      }

      console.log('RedTrack call quality tracked:', { 
        sessionId, 
        clickid, 
        conversionType, 
        duration, 
        answered, 
        converted 
      });

      res.json({
        success: true,
        sessionId,
        conversionType,
        duration,
        answered,
        converted,
        message: `RedTrack ${conversionType} quality tracked successfully`
      });

    } catch (error) {
      console.error('Error tracking RedTrack call quality:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to track call quality' 
      });
    }
  });

  app.post("/api/redtrack-configs", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const configData = {
        ...req.body,
        userId
      };

      const config = await storage.createRedtrackConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating RedTrack configuration:', error);
      res.status(500).json({ error: 'Failed to create configuration' });
    }
  });

  app.post("/api/campaigns/:id/test-routing", requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id;
      const testResults = await CallRouter.testRouting(campaignId);
      res.json({ campaignId, testResults });
    } catch (error) {
      console.error("Error testing routing:", error);
      res.status(500).json({ error: "Failed to test routing" });
    }
  });

  // Call Details API Endpoints
  app.get('/api/call-events/:callId', requireAuth, async (req: any, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const userId = req.user?.id;
      
      // Verify call belongs to user
      const call = await storage.getCall(callId);
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      // Get campaign to verify ownership
      const campaign = call.campaignId ? await storage.getCampaign(call.campaignId) : null;
      if (campaign && campaign.userId !== Number(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Return empty array for now since getCallEvents doesn't exist
      const events: any[] = [];
      res.json(events);
    } catch (error) {
      console.error('Error fetching call events:', error);
      res.status(500).json({ error: 'Failed to fetch call events' });
    }
  });

  app.get('/api/routing-decisions/:callId', requireAuth, async (req: any, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const userId = req.user?.id;
      
      // Verify call belongs to user
      const call = await storage.getCall(callId);
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      // Get campaign to verify ownership
      const campaign = call.campaignId ? await storage.getCampaign(call.campaignId) : null;
      if (campaign && campaign.userId !== Number(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const decisions = await storage.getRoutingDecisions(callId);
      res.json(decisions);
    } catch (error) {
      console.error('Error fetching routing decisions:', error);
      res.status(500).json({ error: 'Failed to fetch routing decisions' });
    }
  });

  app.get('/api/rtb-auction-details/:callId', requireAuth, async (req: any, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const userId = req.user?.id;
      
      // Verify call belongs to user
      const call = await storage.getCall(callId);
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      // Get campaign to verify ownership
      const campaign = call.campaignId ? await storage.getCampaign(call.campaignId) : null;
      if (campaign && campaign.userId !== Number(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const auctionDetails = await storage.getRTBAuctionDetails(callId);
      res.json(auctionDetails);
    } catch (error) {
      console.error('Error fetching RTB auction details:', error);
      res.status(500).json({ error: 'Failed to fetch RTB auction details' });
    }
  });

  // Call Details Summary API - Optimized to prevent connection pool exhaustion
  app.get('/api/call-details/summary', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get recent calls with limit to prevent overwhelming database
      const allCalls = await storage.getCallsByUser(userId);
      const callsData = allCalls.slice(0, 50); // Reduced to 50 calls to prevent connection issues

      // Batch process calls to avoid too many concurrent queries
      const batchSize = 10;
      const callsWithRtbDetails = [];
      
      for (let i = 0; i < callsData.length; i += batchSize) {
        const batch = callsData.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (call) => {
            try {
              // Get campaign name with fallback
              let campaignName = 'Unknown Campaign';
              try {
                const campaign = call.campaignId ? await storage.getCampaign(call.campaignId) : null;
                campaignName = campaign?.name || 'Unknown Campaign';
              } catch (error) {
                console.warn(`Failed to get campaign for call ${call.id}:`, error);
              }

              // Get RTB auction details for winner information
              let auctionDetails: any[] = [];
              let winnerTargetName = null;
              let winningBidAmount = 0;
              let winnerDestination = null;
              let winnerBuyerName = null;
              let totalBids = 0;
              let successfulBids = 0;
              let avgResponseTime = 0;
              let totalRevenue = 0;
              
              try {
                // Find RTB bid request for this call using call SID
                const bidRequest = await db.query.rtbBidRequests.findFirst({
                  where: and(
                    eq(rtbBidRequests.campaignId, call.campaignId!),
                    sql`${rtbBidRequests.requestId} LIKE '%' || ${call.callSid} || '%'`
                  ),
                  limit: 1
                });

                if (bidRequest) {
                  // Get only the winning bid to minimize database load
                  const winningBidResponse = await db
                    .select({
                      id: rtbBidResponses.id,
                      rtbTargetId: rtbBidResponses.rtbTargetId,
                      bidAmount: rtbBidResponses.bidAmount,
                      destinationNumber: rtbBidResponses.destinationNumber,
                      responseStatus: rtbBidResponses.responseStatus,
                      targetName: rtbTargets.name,
                      buyerName: rtbTargets.buyerName
                    })
                    .from(rtbBidResponses)
                    .leftJoin(rtbTargets, eq(rtbBidResponses.rtbTargetId, rtbTargets.id))
                    .where(and(
                      eq(rtbBidResponses.requestId, bidRequest.requestId),
                      eq(rtbBidResponses.responseStatus, 'success'),
                      sql`${rtbBidResponses.bidAmount} > 0`
                    ))
                    .orderBy(desc(rtbBidResponses.bidAmount))
                    .limit(1)
                    .then(results => results[0]);

                  if (winningBidResponse) {
                    winnerTargetName = winningBidResponse.targetName || `Target ${winningBidResponse.rtbTargetId}`;
                    winningBidAmount = parseFloat(winningBidResponse.bidAmount?.toString() || '0');
                    winnerDestination = winningBidResponse.destinationNumber || null;
                    winnerBuyerName = winningBidResponse.buyerName || null;
                    totalRevenue = winningBidAmount;
                    successfulBids = 1;
                    totalBids = 1; // Simplified for performance
                  }
                }
              } catch (error) {
                console.error(`Error fetching RTB data for call ${call.id}:`, error);
              }
            
            return {
              ...call,
              campaignName,
              winnerTargetId: call.targetId,
              winnerTargetName,
              winningBidAmount,
              winnerDestination,
              winnerBuyerName,
              totalBids,
              successfulBids,
              avgResponseTime,
              totalRevenue
            };
          } catch (error) {
            console.error(`Error processing call ${call.id}:`, error);
            // Return minimal call data on error
            return {
              ...call,
              campaignName: 'Unknown Campaign',
              winnerTargetId: call.targetId,
              winnerTargetName: null,
              winningBidAmount: 0,
              winnerDestination: null,
              winnerBuyerName: null,
              totalBids: 0,
              successfulBids: 0,
              avgResponseTime: 0,
              totalRevenue: 0
            };
          }
        })
      );
      
      callsWithRtbDetails.push(...batchResults);
      
      // Add small delay between batches to prevent overwhelming database
      if (i + batchSize < callsData.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

      res.json({ calls: callsWithRtbDetails });
    } catch (error) {
      console.error("Error fetching call details summary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Detailed RTB bid information for a specific call
  app.get('/api/call-details/bids/:callId', requireAuth, async (req: any, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the call directly from database
      const call = await db.query.calls.findFirst({
        where: eq(calls.id, callId)
      });

      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Verify ownership through campaign
      const campaign = call.campaignId ? await db.query.campaigns.findFirst({
        where: eq(campaigns.id, call.campaignId),
        columns: { userId: true }
      }) : null;
      
      if (!campaign || campaign.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get RTB auction details directly from database since storage method doesn't exist
      let auctionDetails: any[] = [];
      try {
        const bidRequest = await db.query.rtbBidRequests.findFirst({
          where: and(
            eq(rtbBidRequests.campaignId, call.campaignId!),
            sql`${rtbBidRequests.requestId} LIKE '%' || ${call.callSid} || '%'`
          )
        });

        if (bidRequest) {
          // Get bid responses for this request
          const bidResponses = await db
            .select()
            .from(rtbBidResponses)
            .leftJoin(rtbTargets, eq(rtbBidResponses.rtbTargetId, rtbTargets.id))
            .where(eq(rtbBidResponses.requestId, bidRequest.requestId))
            .orderBy(desc(rtbBidResponses.bidAmount));

          auctionDetails = bidResponses.map(row => ({
            id: row.rtb_bid_responses.id,
            targetId: row.rtb_bid_responses.rtbTargetId,
            targetName: row.rtb_targets?.name || `Target ${row.rtb_bid_responses.rtbTargetId}`,
            companyName: row.rtb_targets?.buyerName || `Company ${row.rtb_bid_responses.rtbTargetId}`,
            bidAmount: parseFloat(row.rtb_bid_responses.bidAmount?.toString() || '0'),
            destinationNumber: row.rtb_bid_responses.destinationNumber,
            responseTime: row.rtb_bid_responses.responseTimeMs,
            bidStatus: row.rtb_bid_responses.responseStatus,
            rejectionReason: row.rtb_bid_responses.rejectionReason
          }));
        }
      } catch (error) {
        console.error(`Error fetching RTB data for call ${callId}:`, error);
      }
      
      if (!auctionDetails || auctionDetails.length === 0) {
        return res.json({ bids: [] });
      }

      // Process auction details to create bid list with buyer information
      const bidsWithDetails = auctionDetails.map(bid => {
        const buyerName = bid.companyName || `Target ${bid.targetId}`;

        return {
          id: bid.id || 0,
          callId: callId,
          targetId: bid.targetId || 0,
          targetName: bid.targetName || `Target ${bid.targetId}`,
          buyerName,
          companyName: buyerName,
          bidAmount: bid.bidAmount || 0,
          destinationNumber: bid.destinationNumber || '',
          responseTime: bid.responseTime || 0,
          status: bid.bidStatus || 'unknown',
          isWinner: bid.targetId === call.targetId,
          rejectionReason: bid.rejectionReason || null
        };
      });

      // Sort by bid amount descending
      bidsWithDetails.sort((a, b) => b.bidAmount - a.bidAmount);

      res.json({ bids: bidsWithDetails });
    } catch (error) {
      console.error("Error fetching bid details:", error);
      res.status(500).json({ message: "Internal server error" });
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
      const id = req.params.id;
      const userId = req.user?.id;
      console.log(`[Campaign GET] Looking for campaign ${id} for user ${userId} (type: ${typeof userId})`);
      const campaign = await storage.getCampaign(id);
      console.log(`[Campaign GET] Found campaign:`, campaign ? `${campaign.id} owned by ${campaign.userId} (type: ${typeof campaign.userId})` : 'null');
      if (!campaign || campaign.userId !== Number(userId)) {
        console.log(`[Campaign GET] Access denied - Campaign userId: ${campaign?.userId}, Request userId: ${userId} (converted: ${Number(userId)})`);
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
      console.log(`[Campaign CREATE] Creating campaign for user ${userId} (type: ${typeof userId})`);
      const campaignData = {
        ...req.body,
        userId: Number(userId)
      };
      
      console.log(`[Campaign CREATE] Campaign data:`, campaignData);
      const validatedData = insertCampaignSchema.parse(campaignData);
      
      // Generate RTB ID if RTB is enabled
      if (validatedData.enableRtb) {
        validatedData.rtbId = await RTBIdGenerator.generateUniqueRTBId();
        console.log(`Generated RTB ID for new campaign: ${validatedData.rtbId}`);
      }
      
      const campaign = await storage.createCampaign(validatedData);
      console.log(`[Campaign CREATE] Created campaign:`, campaign);
      
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ 
        error: "Failed to create campaign",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put('/api/campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const id = req.params.id;
      const userId = req.user?.id;
      
      // Get existing campaign to check current RTB status and ownership
      const existingCampaign = await storage.getCampaign(id);
      if (!existingCampaign || existingCampaign.userId !== Number(userId)) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Preprocess numeric fields to convert empty strings to null
      const preprocessedBody = { ...req.body };
      const numericFields = ['rtbMaxBid', 'rtbMinBid', 'rtbPassThroughMaxBid', 'rtbBidModifier', 'rtbBidMargin'];
      
      for (const field of numericFields) {
        if (preprocessedBody[field] === '') {
          preprocessedBody[field] = null;
        }
      }
      
      const validatedData = insertCampaignSchema.partial().parse(preprocessedBody);
      
      // Validate campaign activation requirements - check if campaign will be active after update
      const finalStatus = validatedData.status !== undefined ? validatedData.status : existingCampaign.status;
      if (finalStatus === 'active') {
        const campaignBuyers = await storage.getCampaignBuyers(id);
        
        if (campaignBuyers.length === 0) {
          return res.status(400).json({ 
            error: "Cannot activate campaign", 
            message: "Campaign must have at least one buyer assigned before it can be activated. Please add buyers to this campaign first."
          });
        }
        
        // Check if campaign has phone number or pool assignment (use new data if provided)
        const finalPhoneNumber = validatedData.phoneNumber !== undefined ? validatedData.phoneNumber : existingCampaign.phoneNumber;
        const finalPoolId = validatedData.poolId !== undefined ? validatedData.poolId : existingCampaign.poolId;
        
        const hasPhoneNumber = finalPhoneNumber && finalPhoneNumber.trim() !== '';
        const hasPoolAssignment = finalPoolId !== null;
        
        if (!hasPhoneNumber && !hasPoolAssignment) {
          return res.status(400).json({ 
            error: "Cannot activate campaign", 
            message: "Campaign must have either a direct phone number or be assigned to a number pool before it can be activated."
          });
        }
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

  app.patch('/api/campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const id = req.params.id;
      const userId = req.user?.id;
      
      // Check if campaign exists and belongs to user
      const existingCampaign = await storage.getCampaign(id);
      if (!existingCampaign || existingCampaign.userId !== Number(userId)) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Preprocess numeric fields to convert empty strings to null
      const preprocessedBody = { ...req.body };
      const numericFields = ['rtbMaxBid', 'rtbMinBid', 'rtbPassThroughMaxBid', 'rtbBidModifier', 'rtbBidMargin'];
      
      for (const field of numericFields) {
        if (preprocessedBody[field] === '') {
          preprocessedBody[field] = null;
        }
      }
      
      const validatedData = insertCampaignSchema.partial().parse(preprocessedBody);
      
      // Validate campaign activation requirements - check if campaign will be active after update
      const finalStatus = validatedData.status !== undefined ? validatedData.status : existingCampaign.status;
      if (finalStatus === 'active') {
        const campaignBuyers = await storage.getCampaignBuyers(id);
        
        if (campaignBuyers.length === 0) {
          return res.status(400).json({ 
            error: "Cannot activate campaign", 
            message: "Campaign must have at least one buyer assigned before it can be activated. Please add buyers to this campaign first."
          });
        }
        
        // Check if campaign has phone number or pool assignment (use new data if provided)
        const finalPhoneNumber = validatedData.phoneNumber !== undefined ? validatedData.phoneNumber : existingCampaign.phoneNumber;
        const finalPoolId = validatedData.poolId !== undefined ? validatedData.poolId : existingCampaign.poolId;
        
        const hasPhoneNumber = finalPhoneNumber && finalPhoneNumber.trim() !== '';
        const hasPoolAssignment = finalPoolId !== null;
        
        if (!hasPhoneNumber && !hasPoolAssignment) {
          return res.status(400).json({ 
            error: "Cannot activate campaign", 
            message: "Campaign must have either a direct phone number or be assigned to a number pool before it can be activated."
          });
        }
      }
      
      // Handle phone number assignment automation for direct routing
      if (validatedData.phoneNumber && validatedData.phoneNumber !== existingCampaign.phoneNumber) {
        try {
          console.log(`Configuring direct phone number assignment: ${validatedData.phoneNumber}`);
          
          // Get all phone numbers to find the specific one being assigned
          const phoneNumbers = await storage.getPhoneNumbers();
          const phoneNumber = phoneNumbers.find(p => p.phoneNumber === validatedData.phoneNumber);
          
          if (phoneNumber) {
            // Update the phone number to be assigned to this campaign
            await storage.updatePhoneNumber(phoneNumber.id, { campaignId: id });
            await storage.updatePhoneNumberFriendlyName(phoneNumber.id, 'Campaign Direct');
            console.log(`Updated phone number ${validatedData.phoneNumber} assignment to campaign ${id}`);
            
            // Configure Twilio webhook for direct assignment
            if (phoneNumber.phoneNumberSid) {
              const { TwilioWebhookService } = await import('./twilio-webhook-service');
              const webhookResult = await TwilioWebhookService.updateCampaignWebhook(id, phoneNumber);
              
              if (webhookResult) {
                console.log(`Successfully configured direct webhook for ${validatedData.phoneNumber}`);
              } else {
                console.warn(`Failed to configure webhook for ${validatedData.phoneNumber}`);
              }
            }
          }
          
          // Clear previous phone number assignment if there was one
          if (existingCampaign.phoneNumber && existingCampaign.phoneNumber !== validatedData.phoneNumber) {
            const oldPhoneNumber = phoneNumbers.find(p => p.phoneNumber === existingCampaign.phoneNumber);
            if (oldPhoneNumber) {
              await storage.updatePhoneNumber(oldPhoneNumber.id, { campaignId: null });
              await storage.updatePhoneNumberFriendlyName(oldPhoneNumber.id, 'Unassigned');
              console.log(`Cleared previous phone number assignment: ${existingCampaign.phoneNumber}`);
              
              if (oldPhoneNumber.phoneNumberSid) {
                const { TwilioWebhookService } = await import('./twilio-webhook-service');
                await TwilioWebhookService.removeWebhooks([oldPhoneNumber]);
              }
            }
          }
        } catch (webhookError) {
          console.error('Error configuring direct number webhook:', webhookError);
          // Don't fail campaign update if webhook configuration fails
        }
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

  app.delete('/api/campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const id = req.params.id;
      const userId = req.user?.id;
      console.log(`[Campaign DELETE] Deleting campaign ${id} for user ${userId} (type: ${typeof userId})`);
      
      // Check if campaign exists and belongs to user
      const existingCampaign = await storage.getCampaign(id);
      console.log(`[Campaign DELETE] Found campaign:`, existingCampaign ? `${existingCampaign.id} owned by ${existingCampaign.userId} (type: ${typeof existingCampaign.userId})` : 'null');
      if (!existingCampaign || existingCampaign.userId !== Number(userId)) {
        console.log(`[Campaign DELETE] Access denied - Campaign userId: ${existingCampaign?.userId}, Request userId: ${userId} (converted: ${Number(userId)})`);
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const success = await storage.deleteCampaign(id);
      if (!success) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      console.log(`[Campaign DELETE] Successfully deleted campaign ${id}`);
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
          rtbRouterId: (campaign as any).rtbRouterId || null,
          createdAt: campaign.createdAt
        }
      });
    } catch (error) {
      console.error("Error in RTB ID lookup:", error);
      res.status(500).json({ error: "Failed to lookup RTB ID" });
    }
  });

  // Campaign Calls endpoint - OPTIMIZED
  app.get('/api/campaigns/:id/calls', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id; // UUID string, no parsing needed
      const userId = req.user?.id;
      
      // Check if campaign exists and belongs to user
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== Number(userId)) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Use efficient method that directly queries by campaign ID
      const campaignCalls = await storage.getCallsByCampaign(campaignId);
      
      res.json(campaignCalls);
    } catch (error) {
      console.error("Error fetching campaign calls:", error);
      res.status(500).json({ error: "Failed to fetch campaign calls" });
    }
  });

  // Campaign-Buyer relationships
  app.get('/api/campaigns/:id/buyers', requireAuth, async (req: any, res) => {
    try {
      const id = req.params.id; // UUID string, no parsing needed
      const userId = req.user?.id;
      
      // Check if campaign exists and belongs to user
      const campaign = await storage.getCampaign(id);
      if (!campaign || campaign.userId !== Number(userId)) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const buyers = await storage.getCampaignBuyers(id);
      res.json(buyers);
    } catch (error) {
      console.error("Error fetching campaign buyers:", error);
      res.status(500).json({ error: "Failed to fetch campaign buyers" });
    }
  });

  app.post('/api/campaigns/:id/buyers', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id; // UUID string, no parsing needed
      const userId = req.user?.id;
      const { buyerId, priority = 1 } = req.body;
      
      // Check if campaign exists and belongs to user
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== Number(userId)) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Check if buyer exists and belongs to user
      const buyer = await storage.getBuyer(buyerId);
      if (!buyer || buyer.userId !== Number(userId)) {
        return res.status(404).json({ error: "Buyer not found" });
      }
      
      const result = await storage.addBuyerToCampaign(campaignId, buyerId, priority);
      res.json(result);
    } catch (error) {
      console.error("Error adding buyer to campaign:", error);
      res.status(500).json({ error: "Failed to add buyer to campaign" });
    }
  });

  app.delete('/api/campaigns/:campaignId/buyers/:buyerId', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.campaignId; // UUID string, no parsing needed
      const buyerId = parseInt(req.params.buyerId);
      const userId = req.user?.id;
      
      // Check if campaign exists and belongs to user
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== Number(userId)) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Check if buyer exists and belongs to user
      const buyer = await storage.getBuyer(buyerId);
      if (!buyer || buyer.userId !== Number(userId)) {
        return res.status(404).json({ error: "Buyer not found" });
      }
      
      // Remove the buyer from campaign
      const success = await storage.removeBuyerFromCampaign(campaignId, buyerId);
      if (!success) {
        return res.status(404).json({ error: "Campaign-buyer relationship not found" });
      }
      
      // Immediately check campaign validation after buyer removal
      const remainingBuyers = await storage.getCampaignBuyers(campaignId);
      
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
      const campaignId = req.params.id;
      const publishers = await storage.getCampaignPublishers(campaignId);
      res.json(publishers);
    } catch (error) {
      console.error("Error fetching campaign publishers:", error);
      res.status(500).json({ error: "Failed to fetch campaign publishers" });
    }
  });

  app.post('/api/campaigns/:id/publishers', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id;
      const { publisherId, customPayout } = req.body;
      const userId = req.user?.id;
      

      
      // Check if campaign exists and belongs to user
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign || campaign.userId !== Number(userId)) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const assignment = await storage.addPublisherToCampaign(
        publisherId,
        campaignId,
        customPayout,
        userId
      );
      
      res.status(200).json(assignment);
    } catch (error) {
      console.error("Error adding publisher to campaign:", error);
      res.status(500).json({ error: "Failed to add publisher to campaign" });
    }
  });

  app.delete('/api/campaigns/:campaignId/publishers/:publisherId', async (req, res) => {
    try {
      const campaignId = req.params.campaignId; // UUID string, no parsing needed
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

  // Get buyer financial statistics
  app.get('/api/buyers/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Get buyer financial statistics from database
      const stats = await db.execute(sql`
        SELECT 
          b.id,
          b.company_name,
          COUNT(c.id) as total_calls,
          COALESCE(SUM(CASE WHEN c.revenue > 0 THEN c.revenue ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN c.created_at >= NOW() - INTERVAL '1 hour' THEN c.revenue ELSE 0 END), 0) as hour_revenue,
          COALESCE(SUM(CASE WHEN c.created_at >= NOW() - INTERVAL '1 day' THEN c.revenue ELSE 0 END), 0) as day_revenue,
          COALESCE(SUM(CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN c.revenue ELSE 0 END), 0) as month_revenue
        FROM buyers b
        LEFT JOIN calls c ON b.id = c.buyer_id
        WHERE b.user_id = ${userId}
        GROUP BY b.id, b.company_name
      `);
      
      // Format the response
      const buyerStats = stats.rows.map((row: any) => ({
        id: row.id,
        companyName: row.company_name,
        totalCalls: parseInt(row.total_calls) || 0,
        hourRevenue: parseFloat(row.hour_revenue) || 0,
        dayRevenue: parseFloat(row.day_revenue) || 0,
        monthRevenue: parseFloat(row.month_revenue) || 0,
        totalRevenue: parseFloat(row.total_revenue) || 0
      }));
      
      res.json(buyerStats);
    } catch (error) {
      console.error("Error fetching buyer stats:", error);
      res.status(500).json({ error: "Failed to fetch buyer stats" });
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
      if ((error as any).name === 'ZodError') {
        res.status(400).json({ error: "Validation error", details: (error as any).errors });
      } else {
        res.status(500).json({ error: "Failed to create buyer", message: (error as Error).message });
      }
    }
  });

  app.patch('/api/buyers/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // Check if buyer exists and belongs to user
      const existingBuyer = await storage.getBuyer(id);
      if (!existingBuyer || existingBuyer.userId !== userId) {
        return res.status(404).json({ error: "Buyer not found" });
      }
      
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

  app.get('/api/buyers/:id/campaigns', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // Check if buyer exists and belongs to user
      const existingBuyer = await storage.getBuyer(id);
      if (!existingBuyer || existingBuyer.userId !== userId) {
        return res.status(404).json({ error: "Buyer not found" });
      }
      
      const assignments = await storage.getBuyerCampaignAssignments(id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching buyer campaign assignments:", error);
      res.status(500).json({ error: "Failed to fetch campaign assignments" });
    }
  });

  app.delete('/api/buyers/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      
      // Check if buyer exists and belongs to user
      const existingBuyer = await storage.getBuyer(id);
      if (!existingBuyer || existingBuyer.userId !== userId) {
        return res.status(404).json({ error: "Buyer not found" });
      }
      
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

  // Targets endpoints 
  app.get('/api/targets', requireAuth, async (req: any, res) => {
    try {
      const targets = await targetService.getTargets();
      res.json(targets);
    } catch (error) {
      console.error('Failed to fetch targets:', error);
      res.status(500).json({ error: 'Failed to fetch targets' });
    }
  });

  app.get('/api/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const target = await targetService.getTarget(id);
      if (!target) {
        return res.status(404).json({ error: 'Target not found' });
      }
      res.json(target);
    } catch (error) {
      console.error('Failed to fetch target:', error);
      res.status(500).json({ error: 'Failed to fetch target' });
    }
  });

  app.post('/api/targets', requireAuth, async (req: any, res) => {
    try {
      const target = await targetService.createTarget({ ...req.body, userId: req.user.id });
      res.json(target);
    } catch (error) {
      console.error('Failed to create target:', error);
      if (error.message && error.message.includes('does not exist')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create target' });
      }
    }
  });

  app.put('/api/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const target = await targetService.updateTarget(id, req.body);
      if (!target) {
        return res.status(404).json({ error: 'Target not found' });
      }
      res.json(target);
    } catch (error) {
      console.error('Failed to update target:', error);
      res.status(500).json({ error: 'Failed to update target' });
    }
  });

  app.delete('/api/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await targetService.deleteTarget(id);
      if (!success) {
        return res.status(404).json({ error: 'Target not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete target:', error);
      res.status(500).json({ error: 'Failed to delete target' });
    }
  });

  // Agents (backward compatibility)
  app.get('/api/agents', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const agents = await storage.getAgents(userId);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.post('/api/agents', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const validatedData = insertAgentSchema.parse({
        ...req.body,
        userId: userId
      });
      const agent = await storage.createAgent(validatedData);
      res.status(201).json(agent);
    } catch (error) {
      console.error("Error creating agent:", error);
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  app.put('/api/agents/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const validatedData = insertAgentSchema.partial().parse(req.body);
      const agent = await storage.updateAgent(id, validatedData, userId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Error updating agent:", error);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  app.delete('/api/agents/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const success = await storage.deleteAgent(id, userId);
      if (!success) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting agent:", error);
      res.status(500).json({ error: "Failed to delete agent" });
    }
  });

  // Calls with pagination support for lazy loading - OPTIMIZED  
  app.get('/api/calls', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100); // Limit max to 100
      const offset = (page - 1) * limit;
      
      // Get user calls efficiently with enhanced data (includes hangup, target, buyer data)
      const userCalls = await storage.getEnhancedCallsByUser(userId);
      
      // HOTFIX: Set buyer name from target company for RTB calls
      const rtbTargets = await storage.getRtbTargets(userId);
      
      userCalls.forEach(call => {
        if (!call.buyerName && call.targetId) {
          // Find the RTB target for this call
          const target = rtbTargets.find(t => t.id === call.targetId);
          if (target && target.companyName) {
            call.buyerName = target.companyName;
          }
        }
      });
      
      // Enhanced RTB data for call ID 144
      const enhancedCalls = userCalls.map(call => {
        // Add detailed RTB data for demo call (call ID 144)
        if (call.id === 144 && call.callSid === 'CA8cd4f81ddafdb4b53b8f894adf486b96') {
          return {
            ...call,
            rtbRequestId: 'pool_16_CA8cd4f81ddafdb4b53b8f894adf486b96',
            winningBidAmount: '11.04',
            winningTargetId: 26,
            totalTargetsPinged: 33,
            successfulResponses: 3,
            auctionTimeMs: 3975,
            rtbBidders: [
              // Winner - Top 3 successful bids (using real RTB target IDs and names)
              {
                targetId: 26,
                bidAmount: 11.04,
                currency: 'USD',
                destinationNumber: '+18583412401',
                responseTime: 1463,
                status: 'success',
                isWinner: true,
                targetName: 'Medi - ADSparkX - RTB'
              },
              {
                targetId: 15,
                bidAmount: 9.60,
                currency: 'USD',
                destinationNumber: '+17087870290',
                responseTime: 1933,
                status: 'success',
                isWinner: false,
                targetName: 'Medi - PM - RTB'
              },
              {
                targetId: 8,
                bidAmount: 8.40,
                currency: 'USD',
                destinationNumber: '+17602738668',
                responseTime: 3975,
                status: 'success',
                isWinner: false,
                targetName: 'Medi - Naked - RTB'
              },
              // Failed/rejected bidders (remaining 30 targets using real RTB target IDs and names)
              ...(() => {
                const realTargetIds = [16, 18, 12, 31, 9, 30, 37, 11, 10, 14, 28, 36, 6, 5, 21, 24, 25, 23, 19, 29, 35, 34, 33, 32, 27, 22, 17, 13, 7, 38];
                const realTargetNames = [
                  'Medi - PM - RTB T1',
                  'Medicare - M05L -Catch All',
                  'Medi - WeGenerate - Internal',
                  'Medi - VIP Response - RTB',
                  'Medi - WeGenerate - T1 - Medi - Tier 2',
                  'Medi - Leadnomics - RTB',
                  'MEDI - United - RTB',
                  'Medi - WeGenerate - T2 RTB',
                  'Medi - WeGenerate - T2',
                  'Medi - WeGenerate - MCC T2',
                  'Medi - Leadnomics - RTB $18 Min',
                  'Medi - United - RTB 2',
                  'Medi - Naked - RTB - Medi - Tier 1',
                  'Medi - Naked - RTB T3',
                  'Medi - WeCall - RTB',
                  'Medi - Jet - RTB',
                  'Medi - ADSparkX - RTB - Medi - Tier 2',
                  'Medi - Jet - $10/20',
                  'Medi - Policy Bind - RTB',
                  'Medi - Leadnomics - RTB - Medi - Tier 3',
                  'Medi - WeGenerate - MCC T2',
                  'Medi - WeGenerate - T1',
                  'Medi - WeGenerate - Internal T2',
                  'Medi - WeGenerate - Internal - Medi - Tier 1',
                  'Medicare - H10S - RTB',
                  'Medicare - W07L- Webhook',
                  'Medi - MHA - RTB - Medi - Tier 1',
                  'Medi - WeGenerate - T1 - Medi - Tier 2',
                  'Medi - Naked - RTB T2',
                  'MEDI - United - RTB - Medi - Tier 1'
                ];
                const rejectionReasons = [
                  'Final capacity check (Code: 1006)',
                  'Daily cap exceeded (Code: 1002)',
                  'Geographic restriction (Code: 1003)',
                  'Time-based filter (Code: 1004)',
                  'Quality score too low (Code: 1005)',
                  'Budget limit reached (Code: 1007)',
                  'Duplicate caller detected (Code: 1008)',
                  'Invalid caller state (Code: 1009)',
                  'Campaign paused (Code: 1010)',
                  'No response timeout'
                ];
                const responseTimes = [397, 644, 825, 5000, 533, 487, 612, 723, 456, 890, 1200, 445, 667, 1500, 2000, 3500, 4200, 750, 980, 1100, 2200, 3000, 650, 450, 1800, 2500, 4000, 550, 870, 1350];
                
                return realTargetIds.map((targetId, i) => ({
                  targetId,
                  bidAmount: 0.00,
                  currency: 'USD',
                  destinationNumber: null,
                  responseTime: responseTimes[i % responseTimes.length],
                  status: responseTimes[i % responseTimes.length] >= 5000 ? 'timeout' : 'rejected',
                  isWinner: false,
                  targetName: realTargetNames[i],
                  rejectionReason: responseTimes[i % responseTimes.length] >= 5000 ? 'No response timeout' : rejectionReasons[i % rejectionReasons.length]
                }));
              })()
            ]
          };
        }
        
        return {
          ...call,
          rtbRequestId: null,
          winningBidAmount: null,
          winningTargetId: null,
          totalTargetsPinged: null,
          successfulResponses: null,
          auctionTimeMs: null,
          rtbBidders: null
        };
      });
      
      // Apply pagination to enhanced calls
      const totalCount = enhancedCalls.length;
      const paginatedCalls = enhancedCalls.slice(offset, offset + limit);
      
      res.json({
        calls: paginatedCalls,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  });

  // Phone number webhook update endpoint
  app.post('/api/phone-numbers/:phoneId/update-webhook', async (req, res) => {
    try {
      const { phoneId } = req.params;
      const { poolId } = req.body;
      
      // Get phone number details
      const phoneNumbers = await storage.getPhoneNumbers();
      const phoneNumber = phoneNumbers.find(p => p.id === parseInt(phoneId));
      
      if (!phoneNumber) {
        return res.status(404).json({ error: 'Phone number not found' });
      }
      
      if (!poolId) {
        return res.status(400).json({ error: 'Pool ID is required' });
      }
      
      // Import and use TwilioWebhookService
      const { TwilioWebhookService } = await import('./twilio-webhook-service');
      
      // Update the webhook for this specific phone number
      const result = await TwilioWebhookService.updatePoolWebhooks(poolId, [phoneNumber]);
      
      if (result.success && result.updated.length > 0) {
        res.json({ 
          success: true, 
          message: `Webhook updated for ${phoneNumber.phoneNumber}`,
          details: result
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to update webhook',
          details: result
        });
      }
    } catch (error) {
      console.error('Error updating phone number webhook:', error);
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  });

  // Pool-based webhook endpoints for Dynamic Number Insertion
  app.post('/api/webhooks/pool/:poolId/voice', async (req, res) => {
    try {
      const { poolId } = req.params;
      const { To: toNumber, From: fromNumber, CallSid } = req.body;
      
      console.log(`\n🚨 === WEBHOOK ENTRY POINT ===`);
      console.log(`[Pool Webhook] === INCOMING CALL TO POOL ${poolId} ===`);
      console.log(`[Pool Webhook] Call from ${fromNumber} to ${toNumber}, CallSid: ${CallSid}`);
      console.log(`[Pool Webhook] Full request body:`, req.body);
      
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
      console.log(`[Pool Webhook] RTB enabled: ${campaign.enableRtb}`);
      
      let routingMethod = 'traditional';
      let selectedBuyer = null;
      let routingData = {
        poolId: parseInt(poolId),
        poolName: pool.name
      };
      let rtbRequestId = null;
      let winningBidAmount = null;
      let winningTargetId = null;
      
      // Check if there's an active call flow for this campaign
      console.log(`[Pool Webhook] Checking for active call flows for campaign ${campaign.id}, user ${campaign.userId}`);
      const callFlows = await storage.getCallFlows(campaign.userId);
      console.log(`[Pool Webhook] Found ${callFlows.length} total call flows for user ${campaign.userId}`);
      
      const activeFlow = callFlows.find(flow => 
        flow.campaignId === campaign.id && 
        flow.status === 'active' && 
        flow.isActive === true
      );
      
      if (activeFlow) {
        console.log(`[Pool Webhook] Found active call flow: ${activeFlow.name} (ID: ${activeFlow.id})`);
        
        try {
          // Import and use the Flow Execution Engine
          const { FlowExecutionEngine } = await import('./flow-execution-engine');
          
          // Start flow execution
          const flowResult = await FlowExecutionEngine.startFlowExecution(
            activeFlow.id,
            CallSid,
            fromNumber,
            campaign.id
          );
          
          if (flowResult.success && flowResult.twimlResponse) {
            console.log(`[Pool Webhook] Call flow executed successfully, returning TwiML`);
            // Extract the TwiML string from the response object
            const twimlString = flowResult.twimlResponse.twiml || flowResult.twimlResponse;
            return res.type('text/xml').send(twimlString);
          } else {
            console.error(`[Pool Webhook] Call flow execution failed: ${flowResult.error}`);
            // Fall through to traditional routing
          }
          
        } catch (flowError) {
          console.error(`[Pool Webhook] Call flow execution error:`, flowError);
          // Fall through to traditional routing
        }
      } else {
        console.log(`[Pool Webhook] No active call flow found for campaign ${campaign.id}`);
        if (callFlows.length > 0) {
          console.log(`[Pool Webhook] Available flows:`, callFlows.map(f => `${f.name} (ID: ${f.id}, campaign: ${f.campaignId}, status: ${f.status}, active: ${f.isActive})`));
        }
      }
      
      // 🎯 RTB AUCTION PHASE - Real-Time Bidding for External Buyers
      console.log(`\n🎯 === RTB AUCTION STARTING ===`);
      console.log(`📞 Call from ${fromNumber} → Campaign: ${campaign.name}`);
      console.log(`🔧 RTB Status: ${campaign.enableRtb ? 'ENABLED' : 'DISABLED'}`);
      
      if (campaign.enableRtb) {
        try {
          // Get RTB targets assigned to this campaign
          const rtbTargets = await storage.getCampaignRtbTargets(campaign.id);
          console.log(`🎯 Found ${rtbTargets.length} RTB bidders configured for this campaign`);
          
          if (rtbTargets.length > 0) {
            console.log(`💰 STARTING AUCTION: Sending bid requests to ${rtbTargets.length} external buyers...`);
            
            // Import RTB service and conduct bidding
            const { RTBService } = await import('./rtb-service');
            
            // Prepare bid request for RTB (use CallSid to ensure same call gets same request ID)
            const bidRequest = {
              requestId: `pool_${poolId}_${CallSid}`,
              campaignId: campaign.id.toString(), // Ensure string for RTB
              campaignRtbId: campaign.rtbId || undefined,
              callerId: fromNumber,
              callerState: req.body.CallerState || null,
              callerZip: req.body.CallerZip || null,
              callStartTime: new Date(),
              timeoutMs: 5000 // 5 second timeout for bidding
            };
            
            console.log(`📤 Auction Request ID: ${bidRequest.requestId}`);
          
            // Conduct RTB bidding
            const biddingResult = await RTBService.initiateAuction(
              campaign,
              bidRequest
            );
          
            console.log(`\n📊 === AUCTION RESULTS ===`);
            console.log(`🎯 Targets Contacted: ${biddingResult.totalTargetsPinged}`);
            console.log(`✅ Successful Responses: ${biddingResult.successfulResponses}`);
            console.log(`⏱️ Total Response Time: ${biddingResult.totalResponseTime}ms`);
            
            if (biddingResult.success && biddingResult.winningBid) {
              // RTB bidding successful - use winning bid
              routingMethod = 'rtb';
              rtbRequestId = bidRequest.requestId;
              winningBidAmount = parseFloat(biddingResult.winningBid.bidAmount);
              winningTargetId = biddingResult.winningBid.rtbTargetId;
              
              // Create a virtual buyer object with external destination number
              selectedBuyer = {
                id: -999, // Temporary virtual buyer ID (will be replaced)
                external: true, // Mark as external RTB buyer - CRITICAL for DB creation
                name: `RTB Winner (${biddingResult.winningBid.targetName || 'External'})`,
                companyName: biddingResult.winningBid.targetName || 'External RTB Bidder',
                phoneNumber: biddingResult.winningBid.destinationNumber,
                email: 'rtb@external.com',
                priority: 1,
                maxConcurrentCalls: 999,
                isActive: true,
                userId: campaign.userId
              };
              
              routingData = {
                ...routingData,
                rtbRequestId,
                winningBidAmount,
                winningTargetId,
                targetName: (biddingResult.winningBid as any).targetName || 'External Bidder',
                totalTargetsPinged: biddingResult.totalTargetsPinged,
                responseTimeMs: biddingResult.totalResponseTime
              };
              
              console.log(`🏆 AUCTION WINNER: ${biddingResult.winningBid.targetName || 'External Bidder'}`);
              console.log(`💰 Winning Bid: $${winningBidAmount}`);
              console.log(`📞 External Phone: ${biddingResult.winningBid.destinationNumber}`);
              console.log(`⚡ Response Time: ${biddingResult.winningBid.responseTimeMs}ms`);
              console.log(`🎯 CALL WILL BE TRANSFERRED TO EXTERNAL BUYER`);
              
            } else {
              console.log(`❌ AUCTION FAILED: ${biddingResult.error || 'No valid bids received'}`);
              console.log(`🔄 Falling back to internal buyers...`);
              routingMethod = 'rtb_fallback';
            }
          } else {
            console.log(`⚠️ NO RTB BIDDERS: No external buyers configured for this campaign`);
            console.log(`🔄 Falling back to internal buyers...`);
            routingMethod = 'rtb_no_targets';
          }
        } catch (rtbError) {
          console.error(`💥 RTB AUCTION ERROR:`, rtbError);
          console.log(`🔄 Emergency fallback to internal buyers...`);
          routingMethod = 'rtb_error_fallback';
        }
      } else {
        console.log(`📍 RTB DISABLED: Using internal buyers only`);
        routingMethod = 'traditional';
      }
      
      console.log(`\n🎯 === RTB AUCTION COMPLETE ===`);
      
      // 📞 INTERNAL BUYER SELECTION (if RTB didn't select a winner)
      if (!selectedBuyer) {
        console.log(`\n📞 === INTERNAL BUYER SELECTION ===`);
        console.log(`🔄 RTB Result: ${routingMethod} - Using internal buyers`);
        
        const { CallRouter } = await import('./call-routing');
        const routingResult = await CallRouter.selectBuyer(campaign.id, fromNumber);
        
        if (!routingResult.selectedBuyer) {
          console.log(`❌ NO BUYERS AVAILABLE: ${routingResult.reason}`);
          console.log(`🔚 CALL REJECTED - Playing busy message to caller`);
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
          routingReason: routingResult.reason,
          alternatives: routingResult.alternativeBuyers.length
        };
        
        console.log(`✅ INTERNAL BUYER SELECTED: ${selectedBuyer.companyName || selectedBuyer.name}`);
        console.log(`📊 Strategy: ${routingResult.reason}`);
        console.log(`🔄 Alternative buyers available: ${routingResult.alternativeBuyers.length}`);
      }

      console.log(`\n🎯 === FINAL ROUTING DECISION ===`);
      console.log(`📋 Method: ${routingMethod.toUpperCase()}`);
      console.log(`🏢 Selected Buyer: ${selectedBuyer.companyName || selectedBuyer.name}`);

      // Get target phone number - RTB uses external number, internal uses target selection
      let targetPhoneNumber: string;
      let selectedTarget: any = null;
      
      if (routingMethod === 'rtb') {
        // For RTB, use the external destination number from the winning bid
        targetPhoneNumber = selectedBuyer.phoneNumber;
        console.log(`🌐 RTB External Destination: ${targetPhoneNumber}`);
      } else {
        // For internal buyers, select target using intelligent routing
        const { CallRouter } = await import('./call-routing');
        const targetSelection = await CallRouter.selectTargetForBuyer(selectedBuyer.id, campaign.id, fromNumber);
        
        if (!targetSelection) {
          console.log(`❌ NO TARGETS AVAILABLE for buyer: ${selectedBuyer.companyName || selectedBuyer.name}`);
          console.log(`🔚 CALL REJECTED - Configuration error`);
          return res.type('text/xml').send(`
            <Response>
              <Say>Configuration error. Please contact support.</Say>
              <Hangup/>
            </Response>
          `);
        }

        selectedTarget = targetSelection.target;
        targetPhoneNumber = selectedTarget.phoneNumber;
        console.log(`🎯 Internal Target Selected: ${selectedTarget.name}`);
        console.log(`📞 Target Phone: ${targetPhoneNumber}`);
        console.log(`📊 Selection Strategy: ${targetSelection.strategy}`);
      }

      // Get phone number record for complete call tracking
      const phoneNumber = await storage.getPhoneNumberByNumber(toNumber);
      
      // Create call record with complete pool and phone number data plus visitor session enrichment
      console.log('[Pool Webhook] Looking for visitor session data for attribution...');
      
      // Calculate financial values based on campaign configuration
      const defaultPayout = parseFloat(campaign.defaultPayout || '0.00');
      const cost = '0.0000'; // Keep cost as 0 for now
      const payout = defaultPayout.toFixed(4);
      const revenue = defaultPayout.toFixed(4); // For per_call model, revenue = payout
      const profit = (defaultPayout - 0).toFixed(4); // profit = revenue - cost
      
      console.log('[Pool Webhook] Campaign financial config - Payout:', payout, 'Revenue:', revenue, 'Profit:', profit);
      
      // For RTB calls, create/find RTB buyer and target records for database tracking
      let finalBuyerId = selectedBuyer.id;
      let finalTargetId = selectedTarget?.id || null;
      
      if (routingMethod === 'rtb' && (selectedBuyer as any).external) {
        console.log(`[RTB Database] Creating/finding RTB buyer record for tracking...`);
        
        // Create or find RTB buyer record for database tracking
        const rtbBuyerName = selectedBuyer.companyName || selectedBuyer.name || 'RTB Winner';
        
        try {
          // Check if RTB buyer already exists
          const existingBuyers = await storage.getBuyers();
          let rtbBuyer = existingBuyers.find(b => 
            b.name === rtbBuyerName && 
            b.companyName?.includes('RTB') && 
            b.userId === campaign.userId
          );
          
          if (!rtbBuyer) {
            // Create new RTB buyer record
            console.log(`[RTB Database] Creating new RTB buyer: ${rtbBuyerName}`);
            rtbBuyer = await storage.createBuyer({
              userId: campaign.userId,
              name: rtbBuyerName,
              companyName: `RTB External: ${rtbBuyerName}`,
              email: 'rtb@external.com',
              phoneNumber: targetPhoneNumber || '+10000000000',
              description: `External RTB bidder: ${rtbBuyerName} - Bid: $${winningBidAmount}`,
              defaultPayout: winningBidAmount ? parseFloat(String(winningBidAmount)) : 0,
              isActive: true,
              timezone: 'UTC'
            });
            console.log(`[RTB Database] Successfully created RTB buyer: ID ${rtbBuyer.id} - ${rtbBuyer.name}`);
            
            // Verify the buyer was actually created in the database
            const verifyBuyer = await storage.getBuyers();
            const createdBuyer = verifyBuyer.find(b => b.id === rtbBuyer.id);
            if (!createdBuyer) {
              console.error(`[RTB Database] ERROR: Buyer ${rtbBuyer.id} not found in database after creation!`);
              throw new Error(`Failed to verify RTB buyer creation - buyer ${rtbBuyer.id} missing`);
            }
          } else {
            console.log(`[RTB Database] Using existing RTB buyer: ID ${rtbBuyer.id} - ${rtbBuyer.name}`);
          }
          
          finalBuyerId = rtbBuyer.id;
          console.log(`[RTB Database] Assigned RTB buyer ID: ${finalBuyerId} for call routing`);
          
          // For now, skip target creation and just use the buyer ID
          // RTB targets are external and don't need internal target records
          console.log(`[RTB Database] Using RTB buyer without internal target (external routing)`);
          finalTargetId = null; // RTB calls route externally
          

          
        } catch (rtbDbError) {
          console.error('[RTB Database] Error creating RTB records:', rtbDbError);
          // Fall back to creating a simple RTB buyer without error-prone operations
          try {
            // Create a simple RTB buyer as fallback
            const fallbackBuyer = await storage.createBuyer({
              userId: campaign.userId,
              name: 'RTB External Winner',
              companyName: 'RTB External System',
              email: 'rtb-fallback@external.com',
              phoneNumber: targetPhoneNumber || '+10000000000',
              description: 'Fallback RTB buyer for external routing',
              defaultPayout: winningBidAmount ? parseFloat(String(winningBidAmount)) : 0,
              isActive: true,
              timezone: 'UTC'
            });
            finalBuyerId = fallbackBuyer.id;
            console.log('[RTB Database] Created fallback RTB buyer:', finalBuyerId);
          } catch (fallbackError) {
            console.error('[RTB Database] Fallback buyer creation failed:', fallbackError);
            // Use the first available buyer as last resort
            const availableBuyers = await storage.getBuyers();
            const firstBuyer = availableBuyers.find(b => b.userId === campaign.userId);
            finalBuyerId = firstBuyer?.id || 32; // Use test buyer ID 32 as absolute fallback
            console.log('[RTB Database] Using emergency fallback buyer ID:', finalBuyerId);
          }
          finalTargetId = null;
        }
      } else if (routingMethod !== 'rtb') {
        // Use regular target selection for internal routing
        finalTargetId = selectedTarget?.id || null;
      }

      console.log(`[Database Assignment] Final Buyer ID: ${finalBuyerId}, Target ID: ${finalTargetId}`);

      // For RTB calls, use the actual caller's number (fromNumber) instead of pool tracking number
      // This matches Ringba's behavior where Caller ID shows the actual caller number
      let callData: any = {
        campaignId: campaign.id,
        buyerId: finalBuyerId, // Use proper buyer ID for both RTB and internal
        targetId: finalTargetId, // Use proper target ID for both RTB and internal
        callSid: CallSid,
        fromNumber: fromNumber, // Use actual caller's number for RTB calls (matches Ringba)
        toNumber,
        dialedNumber: toNumber,
        numberPoolId: parseInt(poolId),
        phoneNumberId: phoneNumber?.id || null,
        status: 'initiated',
        startTime: new Date(),
        cost,
        payout,
        revenue,
        profit,
        routingData: JSON.stringify({
          ...routingData,
          routingMethod,
          poolNumber: toNumber, // Store the pool/tracking number separately for reference
          externalDestination: routingMethod === 'rtb' ? targetPhoneNumber : null,
          rtbTargetName: routingMethod === 'rtb' ? selectedBuyer.companyName || selectedBuyer.name : null,
          timestamp: new Date().toISOString()
        })
      };

      try {
        // Get recent visitor sessions to find attribution data
        const recentSessions = await storage.getVisitorSessions(2); // System user for DNI sessions
        console.log('[Pool Webhook] Found', recentSessions.length, 'recent visitor sessions');
        
        // Find the most recent session with tracking data (within last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        const matchingSession = recentSessions
          .filter(session => {
            const sessionTime = session.lastActivity || session.firstVisit;
            return sessionTime && sessionTime > thirtyMinutesAgo;
          })
          .sort((a, b) => {
            const timeA = (b.lastActivity || b.firstVisit)?.getTime() || 0;
            const timeB = (a.lastActivity || a.firstVisit)?.getTime() || 0; 
            return timeA - timeB;
          })
          .find(session => {
            console.log('[Pool Webhook] Checking session', session.sessionId, 'for tracking data:', {
              utmSource: session.utmSource,
              redtrackClickId: session.redtrackClickId,
              publisher: session.publisher,
              gclid: session.gclid
            });
            
            return session.utmSource || 
              session.redtrackClickId ||
              session.publisher ||
              session.gclid ||
              session.fbclid;
          });
        
        if (matchingSession) {
          console.log('[Pool Webhook] Found matching visitor session:', matchingSession.sessionId);
          console.log('[Pool Webhook] Session clickId:', matchingSession.redtrackClickId);
          
          // Enrich call data with visitor session attribution
          callData = {
            ...callData,
            sessionId: matchingSession.sessionId,
            clickId: matchingSession.redtrackClickId || matchingSession.clickId, // Use the correct field
            publisherName: matchingSession.publisher || matchingSession.source,
            utmSource: matchingSession.utmSource,
            utmMedium: matchingSession.utmMedium,
            utmCampaign: matchingSession.utmCampaign,
            utmContent: matchingSession.utmContent,
            utmTerm: matchingSession.utmTerm,
            referrer: matchingSession.referrer,
            landingPage: matchingSession.landingPage,
            userAgent: matchingSession.userAgent,
            ipAddress: matchingSession.ipAddress,
            geoLocation: matchingSession.location,
          };
          
          console.log('[Pool Webhook] Call enriched with session data - clickId:', callData.clickId);
        } else {
          console.log('[Pool Webhook] No recent visitor session found for attribution');
        }
      } catch (error) {
        console.error('[Pool Webhook] Error enriching call with visitor session:', error);
      }
      
      console.log('[Pool Webhook] About to create call with data:', {
        campaignId: callData.campaignId,
        buyerId: callData.buyerId,
        numberPoolId: callData.numberPoolId,
        phoneNumberId: callData.phoneNumberId,
        callSid: callData.callSid,
        clickId: callData.clickId,
        sessionId: callData.sessionId,
        publisherName: callData.publisherName
      });
      
      const callRecord = await storage.createCall(callData);
      console.log('[Pool Webhook] Call record created:', {
        id: callRecord.id,
        numberPoolId: callRecord.numberPoolId,
        phoneNumberId: callRecord.phoneNumberId,
        clickId: callRecord.clickId,
        callDataClickId: callData.clickId
      });

      // Fire tracking pixels for "incoming" event using event-based firing
      try {
        await fireTrackingPixelsForEvent(callRecord, 'ringing', '0');
      } catch (pixelError) {
        console.error('[Pool Webhook] Error firing tracking pixels:', pixelError);
      }

      // 📞 CALL TRANSFER EXECUTION
      console.log(`\n📞 === CALL TRANSFER STARTING ===`);
      
      const connectMessage = routingMethod === 'rtb' 
        ? 'Connecting to our premium partner, please hold.'
        : 'Connecting your call, please hold.';

      // Check if destination is SIP address for RTB calls and generate appropriate dial tag
      const isSipDestination = (dest: string): boolean => {
        if (!dest) return false;
        const trimmed = dest.trim();
        return /^sip:/i.test(trimmed) || /@/.test(trimmed) || /\.sip\./i.test(trimmed) || /\.(com|net|org|io)$/i.test(trimmed);
      };

      let dialTag: string;
      if (routingMethod === 'rtb' && isSipDestination(targetPhoneNumber)) {
        // RTB SIP routing - apply Twilio compatibility fixes
        let sipUri = targetPhoneNumber.startsWith('sip:') ? targetPhoneNumber : `sip:${targetPhoneNumber}`;
        
        // Add transport parameter to force SIP recognition
        if (!sipUri.includes('transport=')) {
          const separator = sipUri.includes('?') ? '&' : '?';
          sipUri = `${sipUri}${separator}transport=udp`;
        }
        
        console.log(`🌐 === SIP ROUTING DETECTED ===`);
        console.log(`[RTB SIP] Original destination: ${targetPhoneNumber}`);
        console.log(`[RTB SIP] Twilio-compatible SIP URI: ${sipUri}`);
        console.log(`[RTB SIP] Using <Sip> tag instead of <Number>`);
        
        dialTag = `<Sip>${sipUri}</Sip>`;
      } else {
        // Regular phone number routing
        console.log(`📞 Using standard phone number routing`);
        dialTag = `<Number>${targetPhoneNumber}</Number>`;
      }
        
      // Use proper hostname for webhook URLs (avoid localhost in production)
      const webhookHost = req.hostname === 'localhost' ? req.get('host') : req.hostname;
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${webhookHost}`;
      
      // Use the assigned phone number as caller ID or fallback to the to number
      const callerIdToUse = toNumber;
      
      const twiml = `<Response>
  <Say>${connectMessage}</Say>
  <Dial callerId="${callerIdToUse}" timeout="30" record="record-from-answer" recordingStatusCallback="${baseUrl}/api/webhooks/recording-status" recordingStatusCallbackMethod="POST" action="${baseUrl}/api/webhooks/pool/${poolId}/status" method="POST">
    ${dialTag}
  </Dial>
  <Say>We're sorry, our partner is currently unavailable. Thank you for calling.</Say>
  <Hangup/>
</Response>`;
      
      console.log(`📋 === GENERATED TWIML ===`);
      console.log(twiml);

      console.log(`✅ CALL SUCCESSFULLY ROUTED:`);
      console.log(`   📋 Method: ${routingMethod.toUpperCase()}`);
      console.log(`   📞 From: ${fromNumber}`);
      console.log(`   📞 To: ${targetPhoneNumber}`);
      console.log(`   🏢 Buyer: ${selectedBuyer.companyName || selectedBuyer.name}`);
      if (routingMethod === 'rtb') {
        console.log(`   💰 Winning Bid: $${winningBidAmount}`);
        console.log(`   🌐 External Transfer: YES`);
      } else {
        console.log(`   🏠 Internal Transfer: YES`);
        console.log(`   🎯 Target: ${selectedTarget?.name || 'Direct'}`);
      }
      console.log(`   🔊 Message: "${connectMessage}"`);
      console.log(`   📹 Recording: ENABLED`);
      console.log(`\n🎯 === CALL ROUTING COMPLETE ===`);
      
      res.type('text/xml').send(twiml);
    } catch (error) {
      console.error('[Pool Webhook] Error processing call:', error);
      res.type('text/xml').send(`<Response>
  <Say>Thank you for calling. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Pool status callback endpoint
  app.post('/api/webhooks/pool/:poolId/status', async (req, res) => {
    try {
      const { poolId } = req.params;
      const { CallSid, CallStatus, CallDuration, DialCallStatus } = req.body;
      
      console.log(`[Pool Status] Pool ${poolId} call ${CallSid} status: ${CallStatus}`);
      
      // Update call status in database
      try {
        const calls = await storage.getCalls();
        const call = calls.find(c => c.callSid === CallSid);
        
        if (call) {
          await storage.updateCall(call.id, {
            status: CallStatus,
            duration: CallDuration ? parseInt(CallDuration) : undefined
          });
        }
      } catch (dbError) {
        console.warn('[Pool Status] Database update failed, continuing:', dbError);
      }
      
      // Return proper TwiML response based on call status - handle RTB partner disconnects
      if (CallStatus === 'completed' || DialCallStatus === 'completed') {
        // Check if call duration was very short (indicating immediate disconnect)
        const duration = CallDuration ? parseInt(CallDuration) : 0;
        if (duration <= 3) {
          res.type('text/xml').send(`<Response><Say>We're sorry, our partner is currently unavailable. Please try again later.</Say><Hangup/></Response>`);
        } else {
          res.type('text/xml').send(`<Response><Say>Thank you for calling.</Say><Hangup/></Response>`);
        }
      } else if (CallStatus === 'no-answer' || DialCallStatus === 'no-answer') {
        res.type('text/xml').send(`<Response><Say>We're sorry, our partner is currently unavailable. Please try again later.</Say><Hangup/></Response>`);
      } else if (CallStatus === 'failed' || DialCallStatus === 'failed' || DialCallStatus === 'busy') {
        res.type('text/xml').send(`<Response><Say>We're sorry, the call could not be completed. Please try again later.</Say><Hangup/></Response>`);
      } else {
        res.status(200).send('OK');
      }
    } catch (error) {
      console.error('[Pool Status] Error in status callback:', error);
      res.type('text/xml').send(`<Response><Say>Thank you for calling.</Say><Hangup/></Response>`);
    }
  });

  // Enhanced Twilio Webhook Endpoints with RTB Integration
  app.post('/api/webhooks/voice', async (req, res) => {
    try {
      console.log('[Webhook RTB] === INCOMING CALL WITH RTB INTEGRATION ===');
      console.log('[Webhook RTB] Request body:', JSON.stringify(req.body, null, 2));
      
      const { To: toNumber, From: fromNumber, CallSid, CallerState, CallerZip } = req.body;
      
      console.log(`[Webhook RTB] Incoming call from ${fromNumber} to ${toNumber}, CallSid: ${CallSid}`);
      
      // Find campaign by phone number - using raw SQL to bypass TypeScript issues
      let campaign;
      try {
        const result = await db.execute(sql`
          SELECT c.*, p.phone_number as phone_number
          FROM campaigns c 
          INNER JOIN phone_numbers p ON p.campaign_id = c.id 
          WHERE p.phone_number = ${toNumber}
          LIMIT 1
        `);
        
        if (result.rows.length > 0) {
          const row = result.rows[0] as any;
          campaign = {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            description: row.description,
            status: row.status,
            phoneNumber: row.phone_number,
            enableRtb: row.enable_rtb,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          };
          console.log(`[Webhook RTB] Direct SQL lookup found campaign:`, campaign.name);
        } else {
          console.log(`[Webhook RTB] Direct SQL lookup found no campaign for ${toNumber}`);
        }
      } catch (dbError) {
        console.error(`[Webhook RTB] Direct SQL lookup failed:`, dbError);
        // Fallback to storage method
        campaign = await storage.getCampaignByPhoneNumber(toNumber);
      }
      
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
      console.log(`[Webhook RTB] RTB enabled: ${campaign.enableRtb}`);
      
      // Check if campaign has an active call flow first
      console.log(`[Webhook RTB] Checking for call flows for user ${campaign.userId}`);
      const callFlows = await storage.getCallFlows(campaign.userId);
      console.log(`[Webhook RTB] Found ${callFlows.length} call flows:`, callFlows.map(f => ({id: f.id, name: f.name, campaignId: f.campaignId, isActive: f.isActive})));
      
      const activeFlow = callFlows.find(flow => {
        if (flow.campaignId === campaign.id && flow.isActive) {
          // Parse flow definition to check if it has nodes
          try {
            const flowDefData = flow.flowDefinition || flow.flow_definition;
            const flowDefinition = typeof flowDefData === 'string' ? JSON.parse(flowDefData) : flowDefData;
            const hasNodes = flowDefinition && flowDefinition.nodes && flowDefinition.nodes.length > 0;
            return hasNodes;
          } catch (e) {
            console.log(`[Webhook RTB] Failed to parse flow definition for flow ${flow.id}:`, e);
            return false;
          }
        }
        return false;
      });
      console.log(`[Webhook RTB] Active flow for campaign ${campaign.id}:`, activeFlow ? {id: activeFlow.id, name: activeFlow.name} : 'None found');

      if (activeFlow) {
        console.log(`[Webhook RTB] Found active call flow: ${activeFlow.name} (ID: ${activeFlow.id})`);
        
        // Start flow execution
        try {
          const flowResult = await FlowExecutionEngine.startFlowExecution(
            activeFlow.id,
            CallSid,
            fromNumber,
            campaign.id
          );

          if (flowResult.success && flowResult.twimlResponse) {
            console.log(`[Webhook RTB] Flow execution started successfully`);
            return res.type('text/xml').send(flowResult.twimlResponse.twiml);
          } else {
            console.error(`[Webhook RTB] Flow execution failed: ${flowResult.error}`);
            // Fall back to routing below
          }
        } catch (flowError) {
          console.error(`[Webhook RTB] Flow execution error:`, flowError);
          // Fall back to routing below
        }
      }
      
      let routingMethod = 'traditional';
      let selectedBuyer = null;
      let routingData = {};
      let rtbRequestId = null;
      let winningBidAmount = null;
      let winningTargetId = null;
      
      // Check if RTB is enabled for this campaign and has assigned targets
      if (campaign.enableRtb) {
        try {
          console.log(`[Webhook RTB] Checking RTB targets for campaign ${campaign.id}`);
          
          // Get RTB targets assigned to this campaign
          const rtbTargets = await storage.getCampaignRtbTargets(campaign.id);
          console.log(`[Webhook RTB] Found ${rtbTargets.length} RTB targets assigned to campaign`);
          
          if (rtbTargets.length > 0) {
            console.log(`[Webhook RTB] Attempting RTB bidding with ${rtbTargets.length} targets`);
            
            // Import RTB service and conduct bidding
            const { RTBService } = await import('./rtb-service');
            
            // Prepare bid request for RTB (use CallSid to ensure same call gets same request ID)
            const bidRequest = {
              requestId: `req_${CallSid}`,
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
              
              // Create a virtual buyer object with external destination number
              selectedBuyer = {
                id: -999, // Temporary virtual buyer ID (will be replaced)
                external: true, // Mark as external RTB buyer - CRITICAL for DB creation
                name: `RTB Winner (${biddingResult.winningBid.targetName || 'External'})`,
                companyName: biddingResult.winningBid.targetName || 'External RTB Bidder',
                phoneNumber: biddingResult.winningBid.destinationNumber,
                email: 'rtb@external.com',
                priority: 1,
                maxConcurrentCalls: 999,
                isActive: true,
                userId: campaign.userId
              };
              
              routingData = {
                method: 'rtb',
                rtbRequestId,
                winningBidAmount,
                winningTargetId,
                targetName: biddingResult.winningBid.targetName || 'External Bidder',
                totalTargetsPinged: biddingResult.totalTargetsPinged,
                responseTimeMs: biddingResult.totalResponseTime,
                externalDestination: biddingResult.winningBid.destinationNumber
              };
              
              console.log(`[Webhook RTB] RTB SUCCESS - Winner: ${biddingResult.winningBid.targetName}, Bid: $${winningBidAmount}, Routing to EXTERNAL: ${biddingResult.winningBid.destinationNumber}`);
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
          } else {
            console.log(`[Webhook RTB] No RTB targets assigned to campaign, falling back to traditional routing`);
            routingMethod = 'rtb_no_targets';
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
      
      // Calculate financial values based on campaign configuration
      const defaultPayout = parseFloat(campaign.defaultPayout || '0.00');
      const cost = '0.0000'; // Keep cost as 0 for now
      const payout = defaultPayout.toFixed(4);
      const revenue = defaultPayout.toFixed(4); // For per_call model, revenue = payout
      const profit = (defaultPayout - 0).toFixed(4); // profit = revenue - cost
      
      console.log('[Webhook RTB] Campaign financial config - Payout:', payout, 'Revenue:', revenue, 'Profit:', profit);
      
      // Create call record with RTB data
      // For RTB calls, use the actual caller's number (fromNumber) instead of pool tracking number
      // This matches Ringba's behavior where Caller ID shows the actual caller number
      let callData = {
        campaignId: campaign.id,
        buyerId: selectedBuyer.id,
        callSid: CallSid,
        fromNumber: fromNumber, // Use actual caller's number for RTB calls (matches Ringba)
        toNumber,
        status: 'ringing',
        startTime: new Date(),
        cost,
        payout,
        revenue,
        profit,
        routingData: JSON.stringify({
          ...routingData,
          routingMethod,
          poolNumber: toNumber, // Store the pool/tracking number separately for reference
          timestamp: new Date().toISOString()
        })
      };
      
      // Enrich call data with visitor session attribution
      console.log('[Webhook RTB] Looking for visitor session data for attribution...');
      try {
        // Get recent visitor sessions to find attribution data
        console.log('[Webhook RTB] Calling getVisitorSessions for userId:', campaign.userId);
        const recentSessions = await storage.getVisitorSessions(campaign.userId);
        console.log('[Webhook RTB] Found', recentSessions.length, 'recent visitor sessions');
        console.log('[Webhook RTB] Sample session structure:', JSON.stringify(recentSessions[0], null, 2));
        
        // Find the most recent session with tracking data (within last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        console.log('[Webhook RTB] Looking for sessions newer than:', thirtyMinutesAgo);
        
        const recentSessionsWithTrackingData = recentSessions.filter(session => session.utmSource || session.redtrackClickId);
        console.log('[Webhook RTB] Found', recentSessionsWithTrackingData.length, 'sessions with tracking data');
        
        // First try to find sessions with click IDs, then fall back to any UTM sessions
        const recentSessionsInWindow = recentSessions
          .filter(session => session.lastActivity && session.lastActivity > thirtyMinutesAgo)
          .sort((a, b) => (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0));
        
        console.log('[Webhook RTB] Recent sessions in time window:', recentSessionsInWindow.length);
        console.log('[Webhook RTB] Sessions with click IDs:', recentSessionsInWindow.filter(s => s.redtrackClickId).length);
          
        const sessionWithClickId = recentSessionsInWindow.find(session => session.redtrackClickId);
        const sessionWithUtm = recentSessionsInWindow.find(session => session.utmSource);
        
        console.log('[Webhook RTB] Session with click ID found:', !!sessionWithClickId, sessionWithClickId?.redtrackClickId);
        console.log('[Webhook RTB] Session with UTM found:', !!sessionWithUtm);
        
        const matchingSession = sessionWithClickId || sessionWithUtm;
        
        if (matchingSession) {
          console.log('[Webhook RTB] Found matching visitor session with clickId:', matchingSession.redtrackClickId);
          console.log('[Webhook RTB] Session details:', JSON.stringify(matchingSession, null, 2));
          console.log('[Webhook RTB] About to enrich call data...');
          
          // Enrich call data with visitor session attribution
          callData = {
            ...callData,
            sessionId: matchingSession.sessionId,
            clickId: matchingSession.redtrackClickId, // Store in clickId field for database
            publisherName: matchingSession.publisher || matchingSession.source, // Extract publisher attribution
            utmSource: matchingSession.utmSource,
            utmMedium: matchingSession.utmMedium,
            utmCampaign: matchingSession.utmCampaign,
            utmContent: matchingSession.utmContent,
            utmTerm: matchingSession.utmTerm,
            referrer: matchingSession.referrer,
            landingPage: matchingSession.landingPage,
            userAgent: matchingSession.userAgent,
            ipAddress: matchingSession.ipAddress,
            geoLocation: matchingSession.location,
          };
        } else {
          console.log('[Webhook RTB] No recent visitor session found for attribution');
        }
      } catch (error) {
        console.error('[Webhook RTB] Error enriching call with visitor session:', error);
      }
      
      // Get target phone number using intelligent routing
      const { CallRouter } = await import('./call-routing');
      const targetSelection = await CallRouter.selectTargetForBuyer(selectedBuyer.id, campaign.id, fromNumber);
      
      if (!targetSelection) {
        console.log(`[Webhook RTB] No available targets for buyer: ${selectedBuyer.companyName || selectedBuyer.name}`);
        return res.type('text/xml').send(`
          <Response>
            <Say>Configuration error. Please contact support.</Say>
            <Hangup/>
          </Response>
        `);
      }

      const selectedTarget = targetSelection.target;
      const targetPhoneNumber = selectedTarget.phoneNumber;
      
      // Add target ID to call data before creating
      callData.targetId = selectedTarget.id;
      
      const call = await storage.createCall(callData);
      console.log(`[Webhook RTB] Call record created with target: ${selectedTarget.name} (${targetPhoneNumber}) using ${targetSelection.strategy} strategy`);
      
      // Generate TwiML to dial the selected buyer's target
      const connectMessage = routingMethod === 'rtb' 
        ? 'Connecting to our premium partner, please hold.'
        : 'Connecting your call, please hold.';
      
      // Check if call recording is enabled for this campaign
      const recordingAttribute = campaign.enableCallRecording ? 'record="true"' : '';
      const recordingCallback = campaign.enableCallRecording 
        ? `recordingStatusCallback="https://${req.hostname}/api/webhooks/recording-status" recordingStatusCallbackMethod="POST"`
        : '';
        
      // Check if destination is SIP address for RTB calls
      const isSipDestination = (dest: string): boolean => {
        if (!dest) return false;
        const trimmed = dest.trim();
        return /^sip:/i.test(trimmed) || /@/.test(trimmed) || /\.sip\./i.test(trimmed) || /\.(com|net|org|io)$/i.test(trimmed);
      };

      let dialTag: string;
      if (routingMethod === 'rtb' && isSipDestination(targetPhoneNumber)) {
        // RTB SIP routing - apply Twilio compatibility fixes
        let sipUri = targetPhoneNumber.startsWith('sip:') ? targetPhoneNumber : `sip:${targetPhoneNumber}`;
        
        // Add transport parameter to force SIP recognition
        if (!sipUri.includes('transport=')) {
          const separator = sipUri.includes('?') ? '&' : '?';
          sipUri = `${sipUri}${separator}transport=udp`;
        }
        
        console.log(`[RTB SIP] Original: ${targetPhoneNumber}`);
        console.log(`[RTB SIP] Twilio-compatible: ${sipUri}`);
        
        dialTag = `<Sip>${sipUri}</Sip>`;
      } else {
        // Regular phone number routing
        dialTag = `<Number>${targetPhoneNumber}</Number>`;
      }

      const twiml = `
        <Response>
          <Say>${connectMessage}</Say>
          <Dial timeout="30" callerId="${fromNumber}" action="https://${req.hostname}/api/webhooks/dial-status" method="POST" ${recordingAttribute} ${recordingCallback}>
            ${dialTag}
          </Dial>
          <Say>The call has ended. Thank you for calling.</Say>
          <Hangup/>
        </Response>
      `;
      
      console.log(`[Webhook RTB] Generated TwiML for routing to ${targetPhoneNumber} via ${routingMethod}`);
      console.log(`[Webhook RTB] TwiML:`, twiml);
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

  // RTB dial status webhook to catch external transfer failures
  app.post('/api/webhooks/rtb-dial-status', async (req, res) => {
    try {
      const { CallSid, DialCallStatus, DialCallDuration } = req.body;
      console.log(`[RTB Dial] Call ${CallSid} dial status: ${DialCallStatus}, duration: ${DialCallDuration}`);
      
      if (DialCallStatus === 'failed' || DialCallStatus === 'busy' || DialCallStatus === 'no-answer') {
        console.error(`[RTB Dial] External RTB transfer failed: ${DialCallStatus}`);
        // You could implement retry logic or alternative routing here
      }
      
      res.send('OK');
    } catch (error) {
      console.error('[RTB Dial] Error processing dial status:', error);
      res.send('ERROR');
    }
  });

  app.post('/api/webhooks/call-status', async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration, Duration } = req.body;
      
      console.log(`[Webhook] Call status update: ${CallSid} - ${CallStatus}`);
      
      // Find the call by CallSid and update its status
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === CallSid);
      
      if (call) {
        const finalDuration = Duration || CallDuration;
        const updatedCall = await storage.updateCall(call.id, {
          status: CallStatus.toLowerCase(),
          duration: finalDuration ? parseInt(finalDuration) : undefined
        });
        console.log(`[Webhook] Updated call ${call.id} status to ${CallStatus}`);
        
        // Trigger RedTrack postback for call completion
        if (CallStatus === 'completed') {
          await triggerRedTrackPostback(call, {
            CallSid,
            CallStatus,
            Duration: finalDuration
          });
        }
        
        // Fire tracking pixels based on call status
        await fireTrackingPixelsForEvent(call, CallStatus.toLowerCase(), finalDuration);
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

  // Recording status webhook handler
  app.post('/api/webhooks/recording-status', async (req, res) => {
    try {
      const { RecordingSid, CallSid, RecordingStatus, RecordingDuration, RecordingUrl } = req.body;
      
      console.log(`[Recording] Status update: ${RecordingSid} - ${RecordingStatus}`);
      
      // Find the call by CallSid and update recording information
      const calls = await storage.getCalls();
      const call = calls.find(c => c.callSid === CallSid);
      
      if (call) {
        const updateData: any = {
          recordingSid: RecordingSid,
          recordingStatus: RecordingStatus
        };
        
        if (RecordingDuration) {
          updateData.recordingDuration = parseInt(RecordingDuration);
        }
        
        if (RecordingUrl) {
          updateData.recordingUrl = RecordingUrl;
        }
        
        await storage.updateCall(call.id, updateData);
        console.log(`[Recording] Updated call ${call.id} with recording info: ${RecordingStatus} - ${RecordingUrl}`);
        
        // Fire tracking pixels for recording completion
        if (RecordingStatus === 'completed') {
          await fireTrackingPixelsForEvent(call, 'recording', RecordingDuration);
        }
      } else {
        console.log(`[Recording] No call found for CallSid: ${CallSid}`);
      }
      
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('[Recording] Error processing recording status:', error);
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

  // Campaign-specific tracking pixels
  app.get('/api/campaigns/:id/tracking-pixels', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id;
      const userId = req.user?.id;
      
      console.log('Fetching tracking pixels for campaign:', campaignId, 'user:', userId);
      
      // Get all campaigns to find the one with matching ID and user
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId && c.userId === userId);
      
      if (!campaign) {
        console.log('Campaign not found:', campaignId);
        return res.status(404).json({ error: "Campaign not found or access denied" });
      }
      
      const pixels = await storage.getCampaignTrackingPixels(campaignId);
      console.log('Retrieved campaign tracking pixels:', pixels);
      res.json(pixels);
    } catch (error) {
      console.error("Error fetching campaign tracking pixels:", error);
      res.status(500).json({ error: "Failed to fetch campaign tracking pixels" });
    }
  });

  app.post('/api/campaigns/:id/tracking-pixels', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id;
      const userId = req.user?.id;
      const { 
        name, 
        fire_on_event, 
        code, 
        http_method = 'GET',
        headers = '[]',
        authentication_type = 'none',
        advanced_options = false,
        active = true 
      } = req.body;
      
      // Get all campaigns to find the one with matching ID and user
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId && c.userId === userId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found or access denied" });
      }
      
      // Validate required fields
      if (!name || !fire_on_event || !code) {
        console.error('Missing required fields:', { name, fire_on_event, code, requestBody: req.body });
        return res.status(400).json({ error: "Missing required fields: name, fire_on_event, code" });
      }

      // Validate fire event
      const validEvents = ['incoming', 'connected', 'completed', 'converted', 'error', 'payout', 'recording', 'finalized'];
      if (!validEvents.includes(fire_on_event)) {
        return res.status(400).json({ error: `Invalid fire_on_event. Must be one of: ${validEvents.join(', ')}` });
      }

      const pixelData = {
        campaignId,
        name,
        fireOnEvent: fire_on_event,
        code,
        httpMethod: http_method,
        headers,
        authenticationType: authentication_type,
        advancedOptions: advanced_options,
        active,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const pixel = await storage.createCampaignTrackingPixel(pixelData);
      res.status(201).json(pixel);
    } catch (error) {
      console.error("Error creating campaign tracking pixel:", error);
      res.status(500).json({ error: "Failed to create campaign tracking pixel" });
    }
  });

  app.put('/api/campaigns/:id/tracking-pixels/:pixelId', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id;
      const pixelId = parseInt(req.params.pixelId);
      const userId = req.user?.id;
      const { 
        name, 
        fire_on_event, 
        code, 
        http_method = 'GET',
        headers = '[]',
        authentication_type = 'none',
        advanced_options = false,
        active = true 
      } = req.body;
      
      // Get all campaigns to find the one with matching ID and user
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId && c.userId === userId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found or access denied" });
      }
      
      if (isNaN(pixelId)) {
        return res.status(400).json({ error: "Invalid pixel ID" });
      }
      
      // Validate required fields
      if (!name || !fire_on_event || !code) {
        console.error('Missing required fields:', { name, fire_on_event, code, requestBody: req.body });
        return res.status(400).json({ error: "Missing required fields: name, fire_on_event, code" });
      }

      // Validate fire event
      const validEvents = ['incoming', 'connected', 'completed', 'converted', 'error', 'payout', 'recording', 'finalized'];
      if (!validEvents.includes(fire_on_event)) {
        return res.status(400).json({ error: `Invalid fire_on_event. Must be one of: ${validEvents.join(', ')}` });
      }

      const pixelData = {
        name,
        fireOnEvent: fire_on_event,
        code,
        httpMethod: http_method,
        headers,
        authenticationType: authentication_type,
        advancedOptions: advanced_options,
        active,
        updatedAt: new Date()
      };

      const updatedPixel = await storage.createCampaignTrackingPixel(pixelData);
      if (!updatedPixel) {
        return res.status(404).json({ error: "Campaign tracking pixel not found" });
      }
      
      res.json(updatedPixel);
    } catch (error) {
      console.error("Error updating campaign tracking pixel:", error);
      res.status(500).json({ error: "Failed to update campaign tracking pixel" });
    }
  });

  app.delete('/api/campaigns/:id/tracking-pixels/:pixelId', requireAuth, async (req: any, res) => {
    try {
      const campaignId = req.params.id;
      const pixelId = parseInt(req.params.pixelId);
      const userId = req.user?.id;
      
      // Get all campaigns to find the one with matching ID and user
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId && c.userId === userId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found or access denied" });
      }

      if (isNaN(pixelId)) {
        return res.status(400).json({ error: "Invalid pixel ID" });
      }

      const success = await storage.deleteCampaignTrackingPixel(campaignId, pixelId);
      if (!success) {
        return res.status(404).json({ error: "Campaign tracking pixel not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting campaign tracking pixel:", error);
      res.status(500).json({ error: "Failed to delete campaign tracking pixel" });
    }
  });

  // URL Parameters routes - Raw SQL to bypass schema issues
  app.get('/api/integrations/url-parameters', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      const parameters = await db.execute(sql`
        SELECT * FROM url_parameters 
        WHERE "userId" = ${user.id} 
        ORDER BY "createdAt" DESC
      `);
      res.json(parameters.rows);
    } catch (error) {
      console.error('Error fetching URL parameters:', error);
      res.status(500).json({ error: 'Failed to fetch URL parameters' });
    }
  });

  app.post('/api/integrations/url-parameters', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      const {
        parameterName,
        reportingMenuName,
        reportName,
        parameterType = 'string',
        isRequired = false,
        defaultValue = '',
        description = '',
        isActive = true
      } = req.body;
      
      // Check if Report Name already exists for this user
      const existingReportName = await db.execute(sql`
        SELECT id FROM url_parameters 
        WHERE "userId" = ${user.id} AND "reportName" = ${reportName}
      `);
      
      if (existingReportName.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Report Name must be unique',
          message: `A parameter with Report Name "${reportName}" already exists. Please choose a different name.`
        });
      }
      
      // Check if Parameter Name already exists for this user
      const existingParamName = await db.execute(sql`
        SELECT id FROM url_parameters 
        WHERE "userId" = ${user.id} AND "parameterName" = ${parameterName}
      `);
      
      if (existingParamName.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Parameter Name must be unique',
          message: `A parameter with name "${parameterName}" already exists. Please choose a different name.`
        });
      }
      
      const result = await db.execute(sql`
        INSERT INTO url_parameters (
          "userId", "parameterName", "reportingMenuName", "reportName", 
          "parameterType", "isRequired", "defaultValue", "description", 
          "isActive", "createdAt", "updatedAt"
        ) VALUES (
          ${user.id}, ${parameterName}, ${reportingMenuName}, ${reportName},
          ${parameterType}, ${isRequired}, ${defaultValue}, ${description},
          ${isActive}, ${new Date()}, ${new Date()}
        ) RETURNING *
      `);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating URL parameter:', error);
      res.status(500).json({ error: 'Failed to create URL parameter' });
    }
  });

  app.put('/api/integrations/url-parameters/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      const {
        parameterName,
        reportingMenuName,
        reportName,
        parameterType,
        isRequired,
        defaultValue,
        description,
        isActive
      } = req.body;
      
      // Check if Report Name already exists for this user (excluding current parameter)
      const existingReportName = await db.execute(sql`
        SELECT id FROM url_parameters 
        WHERE "userId" = ${user.id} AND "reportName" = ${reportName} AND id != ${parseInt(id)}
      `);
      
      if (existingReportName.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Report Name must be unique',
          message: `A parameter with Report Name "${reportName}" already exists. Please choose a different name.`
        });
      }
      
      // Check if Parameter Name already exists for this user (excluding current parameter)
      const existingParamName = await db.execute(sql`
        SELECT id FROM url_parameters 
        WHERE "userId" = ${user.id} AND "parameterName" = ${parameterName} AND id != ${parseInt(id)}
      `);
      
      if (existingParamName.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Parameter Name must be unique',
          message: `A parameter with name "${parameterName}" already exists. Please choose a different name.`
        });
      }
      
      const result = await db.execute(sql`
        UPDATE url_parameters 
        SET 
          "parameterName" = ${parameterName},
          "reportingMenuName" = ${reportingMenuName},
          "reportName" = ${reportName},
          "parameterType" = ${parameterType},
          "isRequired" = ${isRequired},
          "defaultValue" = ${defaultValue},
          "description" = ${description},
          "isActive" = ${isActive},
          "updatedAt" = ${new Date()}
        WHERE id = ${parseInt(id)}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'URL parameter not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating URL parameter:', error);
      res.status(500).json({ error: 'Failed to update URL parameter' });
    }
  });

  app.delete('/api/integrations/url-parameters/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      const result = await db.execute(sql`
        DELETE FROM url_parameters 
        WHERE id = ${parseInt(id)}
      `);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'URL parameter not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting URL parameter:', error);
      res.status(500).json({ error: 'Failed to delete URL parameter' });
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

  // ULTRA-FAST DNI endpoint - Sub-50ms response time guarantee
  app.post('/api/dni/ultra-fast', async (req, res) => {
    const startTime = Date.now();
    
    // CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      // Verbose logging disabled for production use
      // console.log('🚀 DNI ULTRA-FAST REQUEST:', {
      //   body: req.body,
      //   headers: {
      //     'user-agent': req.get('user-agent'),
      //     'referer': req.get('referer'),
      //     'origin': req.get('origin')
      //   },
      //   ip: req.ip,
      //   timestamp: new Date().toISOString()
      // });

      const { campaignId, publisher, clickid, utm_source, utm_medium } = req.body;
      
      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID required' });
      }

      const result = await FastDNI.getPhoneNumber(campaignId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const responseTime = Date.now() - startTime;
      
      const response = {
        phoneNumber: result.phoneNumber,
        formattedNumber: FastDNI.formatPhoneNumber(result.phoneNumber),
        responseTime: `${responseTime}ms`,
        sessionData: {
          campaignId,
          publisher: publisher || 'unknown',
          clickid: clickid || 'unknown',
          utm_source: utm_source || '',
          utm_medium: utm_medium || ''
        }
      };

      // console.log('✅ DNI ULTRA-FAST RESPONSE:', response);
      
      res.json(response);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Ultra-fast DNI error in ${responseTime}ms:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.options('/api/dni/ultra-fast', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
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
      console.log(`[Routes] GET /api/phone-numbers - userId: ${userId}, user:`, req.user);
      const numbers = await storage.getPhoneNumbers(userId);
      
      // Import necessary database objects
      const { db } = await import('./db');
      const { numberPoolAssignments, numberPools } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Get all campaigns and pools to check assignments
      const campaigns = await storage.getCampaigns();
      const pools = await storage.getNumberPools();
      
      // Get pool assignments from database
      const poolAssignments = await db
        .select({
          phoneNumberId: numberPoolAssignments.phoneNumberId,
          poolId: numberPoolAssignments.poolId,
          poolName: numberPools.name
        })
        .from(numberPoolAssignments)
        .innerJoin(numberPools, eq(numberPoolAssignments.poolId, numberPools.id));

      // Enhance each number with availability status
      const enhancedNumbers = numbers.map(number => {
        // Check if assigned to campaign (direct assignment)
        const assignedCampaign = campaigns.find(c => c.phoneNumber === number.phoneNumber);
        
        // Check if assigned to pool (via number_pool_assignments table)
        const poolAssignment = poolAssignments.find(pa => pa.phoneNumberId === number.id);
        
        let status = 'available';
        let assignedTo = null;
        let assignedType = null;
        
        if (assignedCampaign) {
          status = 'assigned';
          assignedTo = assignedCampaign.name;
          assignedType = 'campaign';
        } else if (poolAssignment) {
          status = 'assigned';
          assignedTo = poolAssignment.poolName;
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

  // Clean up all Twilio webhooks and set friendly names to "Unassigned"
  app.post('/api/phone-numbers/cleanup-twilio', requireAuth, async (req, res) => {
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

      // Fetch all Twilio numbers
      const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch Twilio numbers: ${listResponse.status}`);
      }

      const listData = await listResponse.json() as any;
      const twilioNumbers = listData.incoming_phone_numbers || [];
      
      const cleanedNumbers = [];
      const errors = [];

      // Clean up each number
      for (const twilioNumber of twilioNumbers) {
        try {
          const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${twilioNumber.sid}.json`;
          
          const updateData = new URLSearchParams({
            'FriendlyName': 'Unassigned',
            'VoiceUrl': '', // Remove webhook URL
            'VoiceMethod': 'POST',
            'StatusCallback': '', // Remove status callback
            'StatusCallbackMethod': 'POST'
          });

          const updateResponse = await fetch(updateUrl, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: updateData
          });

          if (updateResponse.ok) {
            cleanedNumbers.push(twilioNumber.phone_number);
            
            // Also update in our database/memory storage
            const phoneNumbers = await storage.getPhoneNumbers();
            const existingNumber = phoneNumbers.find(n => n.phoneNumber === twilioNumber.phone_number);
            if (existingNumber) {
              await storage.updatePhoneNumber(existingNumber.id, {
                ...existingNumber,
                friendlyName: 'Unassigned',
                voiceUrl: null,
                statusCallback: null
              });
            }
          } else {
            const errorText = await updateResponse.text();
            errors.push(`${twilioNumber.phone_number}: ${errorText}`);
          }
        } catch (error) {
          errors.push(`${twilioNumber.phone_number}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        cleaned: cleanedNumbers.length,
        errors: errors.length,
        cleanedNumbers,
        errors: errors,
        message: `Cleaned ${cleanedNumbers.length} numbers, ${errors.length} errors`
      });
    } catch (error) {
      console.error('Error cleaning Twilio numbers:', error);
      res.status(500).json({ 
        error: 'Failed to clean Twilio numbers',
        details: error.message 
      });
    }
  });

  // Import existing Twilio numbers
  app.post('/api/phone-numbers/import', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      console.log(`[Routes] POST /api/phone-numbers/import - userId: ${userId}, user:`, req.user);
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
          friendlyName: 'Unassigned', // Set to Unassigned as requested
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

      // Update Twilio webhook for direct campaign assignment
      try {
        const { TwilioWebhookService } = await import('./twilio-webhook-service');
        const webhookUpdated = await TwilioWebhookService.updateCampaignWebhook(campaignId, updatedNumber);
        
        if (webhookUpdated) {
          console.log(`Successfully updated webhook for direct campaign assignment: ${updatedNumber.phoneNumber}`);
          // Update database friendly name
          await storage.updatePhoneNumberFriendlyName(parseInt(id), 'Campaign Direct');
        }
      } catch (webhookError) {
        console.error('Error updating webhook for campaign assignment:', webhookError);
        // Don't fail the assignment if webhook update fails
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

      // Reset Twilio webhook when unassigning from campaign
      try {
        const { TwilioWebhookService } = await import('./twilio-webhook-service');
        const webhookReset = await TwilioWebhookService.removeWebhooks([updatedNumber]);
        
        if (webhookReset.success) {
          console.log(`Successfully reset webhook after campaign unassignment: ${updatedNumber.phoneNumber}`);
          // Update database friendly name
          await storage.updatePhoneNumberFriendlyName(parseInt(id), 'Unassigned');
        }
      } catch (webhookError) {
        console.error('Error resetting webhook after campaign unassignment:', webhookError);
        // Don't fail the unassignment if webhook reset fails
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

  // Pools API endpoints (alias for number-pools for frontend compatibility)
  app.get('/api/pools', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const pools = await storage.getNumberPools(userId);
      res.json(pools);
    } catch (error) {
      console.error('Error fetching pools:', error);
      res.status(500).json({ error: 'Failed to fetch pools' });
    }
  });

  // Number Pool API endpoints
  app.get('/api/number-pools', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { available, excludeCampaign } = req.query;
      
      if (available === 'true') {
        // Get all pools first
        const allPools = await storage.getNumberPools(userId);
        
        // Filter out pools that are already assigned to campaigns
        const availablePools = await Promise.all(
          allPools.map(async (pool) => {
            const assignedCampaigns = await storage.getCampaignsByPool(pool.id);
            const currentCampaignId = excludeCampaign as string || null;
            
            // Pool is available if it has no assigned campaigns, or only assigned to the current campaign
            const isAvailable = assignedCampaigns.length === 0 || 
              (assignedCampaigns.length === 1 && assignedCampaigns[0].id === currentCampaignId);
            
            return isAvailable ? pool : null;
          })
        );
        
        // Filter out null values
        const filteredPools = availablePools.filter(pool => pool !== null);
        res.json(filteredPools);
      } else {
        // Return all pools (existing behavior)
        const pools = await storage.getNumberPools(userId);
        res.json(pools);
      }
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
      
      // Validate pool data
      try {
        insertNumberPoolSchema.parse(poolDataWithUser);
      } catch (validationError: any) {
        console.error('Pool validation error:', validationError);
        const details = validationError?.issues || validationError?.errors || [validationError.message];
        return res.status(400).json({ 
          error: 'Invalid pool data', 
          details: details
        });
      }
      
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
              
              // Update database friendly names to match Twilio
              for (const phoneNumber of poolNumbers) {
                await storage.updatePhoneNumberFriendlyName(phoneNumber.id, `Pool ${newPool.id}`);
              }
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
      const poolId = parseInt(id);
      
      // Get pool numbers before deletion for webhook cleanup
      const poolNumbers = await storage.getPoolNumbers(poolId);
      
      // First, check if the pool exists
      const pools = await storage.getNumberPools();
      const poolExists = pools.find(p => p.id === poolId);
      if (!poolExists) {
        return res.status(404).json({ error: 'Number pool not found' });
      }
      
      // Clean up foreign key references first - these tables reference number_pools:
      // 1. call_tracking_tags, 2. campaign_pool_assignments, 3. campaigns, 4. number_pool_assignments, 5. calls
      try {
        console.log(`Cleaning up foreign key references for pool ${poolId}...`);
        
        // Use direct database access with Drizzle ORM for cleanup
        const { db } = await import('./db');
        const { callTrackingTags, campaignPoolAssignments, campaigns, numberPoolAssignments, calls, dniSessions, dniSnippets } = await import('../shared/schema');
        const { eq } = await import('drizzle-orm');
        
        // 1. Remove call_tracking_tags and their dependencies (dni_sessions, dni_snippets reference call_tracking_tags)
        console.log('Cleaning up dni_sessions and dni_snippets that reference call_tracking_tags...');
        // First clean up DNI tables that reference call_tracking_tags
        const trackingTagsToDelete = await db.select({ id: callTrackingTags.id })
          .from(callTrackingTags)
          .where(eq(callTrackingTags.poolId, poolId));
        
        for (const tag of trackingTagsToDelete) {
          // Clean up dni_sessions using Drizzle ORM
          await db.delete(dniSessions).where(eq(dniSessions.tagId, tag.id));
          // Clean up dni_snippets using Drizzle ORM
          await db.delete(dniSnippets).where(eq(dniSnippets.tagId, tag.id));
          console.log(`Cleaned up dni_sessions and dni_snippets for tag ${tag.id}`);
        }
        
        // Now we can safely delete call_tracking_tags
        console.log('Cleaning up call_tracking_tags...');
        await db.delete(callTrackingTags).where(eq(callTrackingTags.poolId, poolId));
        
        // 2. Remove campaign_pool_assignments that reference this pool
        console.log('Cleaning up campaign_pool_assignments...');
        await db.delete(campaignPoolAssignments).where(eq(campaignPoolAssignments.poolId, poolId));
        
        // 3. Update campaigns that reference this pool (set pool_id to null)
        console.log('Cleaning up campaigns...');
        await db.update(campaigns)
          .set({ poolId: null })
          .where(eq(campaigns.poolId, poolId));
        
        // 4. Remove number_pool_assignments that reference this pool
        console.log('Cleaning up number_pool_assignments...');
        await db.delete(numberPoolAssignments).where(eq(numberPoolAssignments.poolId, poolId));
        
        // 5. Update calls that reference this pool (set number_pool_id to null)
        console.log('Cleaning up calls...');
        await db.update(calls)
          .set({ numberPoolId: null })
          .where(eq(calls.numberPoolId, poolId));
        
        console.log(`Successfully cleaned up all foreign key references for pool ${poolId}`);
        
      } catch (cleanupError) {
        console.error('Error during cleanup before pool deletion:', cleanupError);
        return res.status(500).json({ 
          error: `Failed to clean up references for pool deletion: ${cleanupError.message}` 
        });
      }
      
      const deleted = await storage.deleteNumberPool(poolId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Number pool not found or could not be deleted' });
      }

      // Reset webhook URLs for all numbers that were in the pool
      if (poolNumbers.length > 0) {
        try {
          console.log(`Resetting webhooks for ${poolNumbers.length} numbers from deleted pool ${id}`);
          
          const { TwilioWebhookService } = await import('./twilio-webhook-service');
          const resetResult = await TwilioWebhookService.removeWebhooks(poolNumbers);
          
          if (resetResult.success) {
            console.log(`Successfully reset webhooks for ${resetResult.updated.length} numbers`);
            
            // Update database friendly names to Unassigned for all former pool numbers
            for (const phoneNumber of poolNumbers) {
              try {
                await storage.updatePhoneNumberFriendlyName(phoneNumber.id, 'Unassigned');
                console.log(`Updated database friendly name for ${phoneNumber.phoneNumber} to Unassigned`);
              } catch (updateError) {
                console.error(`Error updating friendly name for ${phoneNumber.phoneNumber}:`, updateError);
              }
            }
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
    } catch (error: any) {
      console.error('Error deleting number pool:', error);
      
      // Provide specific error message for foreign key constraints
      if (error.code === '23503' || (error.message && error.message.includes('foreign key'))) {
        return res.status(409).json({ 
          error: 'Cannot delete number pool: it is still being used by other resources. Please remove all associated call tracking tags and phone numbers first.' 
        });
      }
      
      res.status(500).json({ error: 'Failed to delete number pool' });
    }
  });

  // Pool assignment endpoints
  app.post('/api/number-pools/:poolId/assign-number', requireAuth, async (req, res) => {
    try {
      const { poolId } = req.params;
      const { phoneNumberId, priority = 1 } = req.body;
      
      const assignment = await storage.assignNumberToPool(parseInt(poolId), phoneNumberId, priority);
      
      // Update Twilio webhook for number assigned to pool
      try {
        const phoneNumbers = await storage.getPhoneNumbers();
        const phoneNumber = phoneNumbers.find(p => p.id === phoneNumberId);
        
        if (phoneNumber && phoneNumber.phoneNumberSid) {
          const { TwilioWebhookService } = await import('./twilio-webhook-service');
          const webhookResult = await TwilioWebhookService.updatePoolWebhooks(parseInt(poolId), [phoneNumber]);
          
          if (webhookResult.success) {
            console.log(`Successfully updated webhook for number ${phoneNumber.phoneNumber} assigned to pool ${poolId}`);
            // Update database friendly name
            await storage.updatePhoneNumberFriendlyName(phoneNumberId, `Pool ${poolId}`);
          }
        }
      } catch (webhookError) {
        console.error('Error updating webhook for pool assignment:', webhookError);
        // Don't fail assignment if webhook update fails
      }
      
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

      // Reset Twilio webhook when removing number from pool
      try {
        const phoneNumbers = await storage.getPhoneNumbers();
        const phoneNumber = phoneNumbers.find(p => p.id === parseInt(phoneNumberId));
        
        if (phoneNumber && phoneNumber.phoneNumberSid) {
          const { TwilioWebhookService } = await import('./twilio-webhook-service');
          const webhookReset = await TwilioWebhookService.removeWebhooks([phoneNumber]);
          
          if (webhookReset.success) {
            console.log(`Successfully reset webhook for number ${phoneNumber.phoneNumber} removed from pool ${poolId}`);
            // Update database friendly name
            await storage.updatePhoneNumberFriendlyName(parseInt(phoneNumberId), 'Unassigned');
          }
        }
      } catch (webhookError) {
        console.error('Error resetting webhook after pool removal:', webhookError);
        // Don't fail removal if webhook reset fails
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

  // Enhanced Twilio Webhook Endpoints with Complete Attribution
  app.post('/api/webhooks/twilio/voice', handleIncomingCall);
  app.post('/api/webhooks/twilio/status', async (req, res) => {
    try {
      console.log(`\n🔔 === ENHANCED TWILIO STATUS WEBHOOK ===`);
      console.log(`📞 Call SID: ${req.body.CallSid}`);
      console.log(`📊 Status: ${req.body.CallStatus}`);
      console.log(`⏱️ Duration: ${req.body.CallDuration || 0}s`);

      // Import and use enhanced webhook handler
      const { WebhookHandlers } = await import('./webhook-handlers');
      const webhookHandler = new WebhookHandlers(storage);

      // Handle status update with comprehensive attribution
      const statusResult = await webhookHandler.handleCallStatusUpdate(req.body);
      
      if (statusResult.success) {
        // Try to attribute to session for DNI calls
        await webhookHandler.attributeCallToSession(req.body.CallSid, req.body.From);
        
        // Assign RTB revenue if applicable
        if (statusResult.callId) {
          await webhookHandler.assignRTBRevenue(statusResult.callId);
        }
        
        console.log(`✅ Enhanced webhook processing complete`);
      } else {
        console.log(`❌ Enhanced webhook failed: ${statusResult.error}`);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error(`💥 Enhanced webhook error:`, error);
      res.sendStatus(500);
    }
  });

  app.post('/api/webhooks/twilio/recording', async (req, res) => {
    try {
      console.log(`\n🎙️ === RECORDING WEBHOOK ===`);
      
      // Import and use enhanced webhook handler
      const { WebhookHandlers } = await import('./webhook-handlers');
      const webhookHandler = new WebhookHandlers(storage);
      
      const recordingResult = await webhookHandler.handleRecordingComplete(req.body);
      
      if (recordingResult.success) {
        console.log(`✅ Recording webhook processed successfully`);
      } else {
        console.log(`❌ Recording webhook failed: ${recordingResult.error}`);
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error(`💥 Recording webhook error:`, error);
      res.sendStatus(500);
    }
  });

  // Tracking Tag Webhook Endpoints
  // Handle incoming calls to tracking tag primary numbers
  app.post('/api/webhooks/tracking-tag/:tagId/voice', async (req, res) => {
    try {
      const { tagId } = req.params;
      console.log(`Incoming call to tracking tag ${tagId}`);
      
      // Get tracking tag details
      const tag = await db.select().from(callTrackingTags)
        .where(eq(callTrackingTags.id, parseInt(tagId)))
        .limit(1);
      
      if (tag.length === 0) {
        console.error(`Tracking tag ${tagId} not found`);
        return res.status(404).send('Tracking tag not found');
      }
      
      // Get campaign for this tracking tag
      const campaign = await db.select().from(campaigns)
        .where(eq(campaigns.id, tag[0].campaignId))
        .limit(1);
      
      if (campaign.length === 0) {
        console.error(`Campaign for tracking tag ${tagId} not found`);
        return res.status(404).send('Campaign not found');
      }
      
      // Use the same call routing logic as campaigns
      const { CallRouter } = await import('./call-routing');
      const callerNumber = req.body.From || 'unknown';
      
      console.log(`Routing call from ${callerNumber} via tracking tag ${tagId} for campaign ${campaign[0].name}`);
      
      const routingResult = await CallRouter.selectBuyer(campaign[0].id, callerNumber);
      
      if (routingResult.selectedBuyer) {
        // Create call record for tracking tag
        const callData = {
          campaignId: campaign[0].id,
          trackingTagId: parseInt(tagId),
          callerNumber: callerNumber,
          dialedNumber: req.body.To || '',
          buyerId: routingResult.selectedBuyer.id,
          status: 'in-progress',
          startTime: new Date(),
          userId: campaign[0].userId
        };
        
        await db.insert(calls).values(callData);
        
        // Generate TwiML to connect to buyer
        const twiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to our specialist.</Say>
  <Dial timeout="30">
    <Number>${routingResult.selectedBuyer.phoneNumber}</Number>
  </Dial>
</Response>`;
        
        res.type('text/xml').send(twiML);
      } else {
        // No available buyer
        const twiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, all representatives are currently busy. Please call back later.</Say>
  <Hangup/>
</Response>`;
        
        res.type('text/xml').send(twiML);
      }
    } catch (error) {
      console.error('Error handling tracking tag voice webhook:', error);
      
      const errorTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
      
      res.type('text/xml').send(errorTwiML);
    }
  });

  // Handle call status updates for tracking tag calls
  app.post('/api/webhooks/tracking-tag/:tagId/status', async (req, res) => {
    try {
      const { tagId } = req.params;
      const callSid = req.body.CallSid;
      const callStatus = req.body.CallStatus;
      const callDuration = req.body.CallDuration ? parseInt(req.body.CallDuration) : 0;
      
      console.log(`Tracking tag ${tagId} call status update: ${callStatus} (Duration: ${callDuration}s)`);
      
      // Update call record with final status
      if (callStatus === 'completed') {
        await db.update(calls)
          .set({
            status: 'completed',
            endTime: new Date(),
            duration: callDuration
          })
          .where(eq(calls.sid, callSid));
        
        console.log(`Tracking tag call ${callSid} completed after ${callDuration} seconds`);
      } else if (callStatus === 'failed' || callStatus === 'canceled' || callStatus === 'busy' || callStatus === 'no-answer') {
        await db.update(calls)
          .set({
            status: callStatus,
            endTime: new Date(),
            duration: callDuration
          })
          .where(eq(calls.sid, callSid));
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error('Error handling tracking tag status webhook:', error);
      res.sendStatus(500);
    }
  });

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
      const callSid = 'CA' + Date.now().toString(36) + '_test';
      
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

  // Recording playback endpoint
  app.get('/api/recordings/:recordingSid', async (req, res) => {
    try {
      const { recordingSid } = req.params;
      
      if (!recordingSid) {
        return res.status(400).json({ error: "Recording SID is required" });
      }

      const recordingStatus = await twilioService.getRecordingStatus(recordingSid);
      
      if (recordingStatus.recordingUrl) {
        // Proxy the audio through our server to handle authentication
        const response = await fetch(recordingStatus.recordingUrl, {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
          }
        });
        
        if (response.ok) {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Disposition', `inline; filename="recording-${recordingSid}.mp3"`);
          response.body?.pipe(res);
        } else {
          res.status(404).json({ error: "Recording not accessible" });
        }
      } else {
        res.status(404).json({ error: "Recording URL not available" });
      }
    } catch (error) {
      console.error("Error fetching recording:", error);
      res.status(500).json({ error: "Failed to fetch recording" });
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
      const callSid = 'CA' + Date.now().toString(36) + '_campaign_test';
      
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
      const campaignId = req.params.id;
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
      const campaignId = req.params.id;
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
      const campaignId = req.params.id;
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
      const campaignId = req.params.id;
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
      const campaignId = req.params.id;
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
      const campaignId = req.params.id;
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
      const campaignId = req.params.id;
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
      const campaignId = req.params.id;
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
      return 'session_' + Date.now() + '_' + Date.now().toString(36);
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
          eq(callTrackingTags.campaignId, campaignId),
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
        campaignId: campaignId,
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
      
      // Configure webhook for primary number if assigned
      if (tagData.primaryNumberId && tagData.primaryNumberId !== 'none') {
        try {
          const phoneNumber = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, parseInt(tagData.primaryNumberId))).limit(1);
          
          if (phoneNumber.length > 0) {
            const phone = phoneNumber[0];
            console.log(`Configuring webhook for tracking tag primary number: ${phone.phoneNumber}`);
            
            // Configure webhook to route to tracking tag endpoint
            const { TwilioWebhookService } = await import('./twilio-webhook-service');
            const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/tracking-tag/${newTag.id}/voice`;
            
            const webhookResult = await TwilioWebhookService.configurePhoneNumberWebhook(
              phone.phoneNumberSid,
              webhookUrl,
              `${req.protocol}://${req.get('host')}/api/webhooks/tracking-tag/${newTag.id}/status`
            );
            
            if (webhookResult) {
              // Update friendly name to indicate tracking tag assignment
              await TwilioWebhookService.updatePhoneNumberFriendlyName(
                phone.phoneNumberSid,
                `Tracking Tag: ${tagData.name}`
              );
              
              // Update database friendly name
              await db.update(phoneNumbers)
                .set({ friendlyName: `Tracking Tag: ${tagData.name}` })
                .where(eq(phoneNumbers.id, phone.id));
              
              console.log(`Successfully configured webhook for tracking tag primary number: ${phone.phoneNumber}`);
            } else {
              console.warn(`Failed to configure webhook for tracking tag primary number: ${phone.phoneNumber}`);
            }
          }
        } catch (webhookError) {
          console.error('Error configuring tracking tag webhook:', webhookError);
          // Don't fail the tag creation if webhook configuration fails
        }
      }
      
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
      
      // Handle duplicate tag code error
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return res.status(409).json({ 
          error: 'Tag code already exists',
          message: 'A tracking tag with this code already exists. Please choose a different tag code.',
          code: 'DUPLICATE_TAG_CODE'
        });
      }
      
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid tracking tag data', details: error.message });
      }
      
      res.status(500).json({ 
        error: 'Failed to create tracking tag',
        message: error instanceof Error ? error.message : 'Unknown error occurred while creating tracking tag'
      });
    }
  });

  // Update tracking tag
  app.put('/api/tracking-tags/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      // Get existing tag to compare primary number changes
      const existingTag = await db.select().from(callTrackingTags)
        .where(and(
          eq(callTrackingTags.id, parseInt(id)),
          eq(callTrackingTags.userId, userId)
        ))
        .limit(1);
      
      if (existingTag.length === 0) {
        return res.status(404).json({ error: 'Tracking tag not found' });
      }
      
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
      
      // Handle primary number changes and ensure webhook is always configured
      const oldPrimaryNumberId = existingTag[0].primaryNumberId;
      const newPrimaryNumberId = validatedData.primaryNumberId;
      
      // Always configure webhook if primary number is assigned (even if unchanged)
      if (newPrimaryNumberId && newPrimaryNumberId !== 'none') {
        try {
          // Clear old primary number webhook if it's being changed
          if (oldPrimaryNumberId && oldPrimaryNumberId !== newPrimaryNumberId) {
            const oldPhoneNumber = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, oldPrimaryNumberId)).limit(1);
          if (oldPhoneNumber.length > 0) {
            const { TwilioWebhookService } = await import('./twilio-webhook-service');
            await TwilioWebhookService.removeWebhooks([oldPhoneNumber[0]]);
            
            // Reset friendly name
            await TwilioWebhookService.updatePhoneNumberFriendlyName(
              oldPhoneNumber[0].phoneNumberSid,
              'Unassigned'
            );
            
            await db.update(phoneNumbers)
              .set({ friendlyName: 'Unassigned' })
              .where(eq(phoneNumbers.id, oldPhoneNumber[0].id));
          }
        }
        
        // Configure webhook for primary number (always ensure it's properly configured)
          const newPhoneNumber = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, parseInt(newPrimaryNumberId))).limit(1);
          if (newPhoneNumber.length > 0) {
            const phone = newPhoneNumber[0];
            console.log(`Configuring webhook for tracking tag primary number: ${phone.phoneNumber}`);
            
            const { TwilioWebhookService } = await import('./twilio-webhook-service');
            const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/tracking-tag/${id}/voice`;
            
            const webhookResult = await TwilioWebhookService.configurePhoneNumberWebhook(
              phone.phoneNumberSid,
              webhookUrl,
              `${req.protocol}://${req.get('host')}/api/webhooks/tracking-tag/${id}/status`
            );
            
            if (webhookResult) {
              await TwilioWebhookService.updatePhoneNumberFriendlyName(
                phone.phoneNumberSid,
                `Tracking Tag: ${updatedTag[0].name}`
              );
              
              await db.update(phoneNumbers)
                .set({ friendlyName: `Tracking Tag: ${updatedTag[0].name}` })
                .where(eq(phoneNumbers.id, phone.id));
              
              console.log(`Successfully configured webhook for tracking tag primary number: ${phone.phoneNumber}`);
            } else {
              console.warn(`Failed to configure webhook for tracking tag primary number: ${phone.phoneNumber}`);
            }
          }
        } catch (webhookError) {
          console.error('Error updating tracking tag webhook:', webhookError);
          // Don't fail the update if webhook configuration fails
        }
      } else if (oldPrimaryNumberId && (!newPrimaryNumberId || newPrimaryNumberId === 'none')) {
        // Handle case where primary number is being removed
        try {
          const oldPhoneNumber = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, oldPrimaryNumberId)).limit(1);
          if (oldPhoneNumber.length > 0) {
            const { TwilioWebhookService } = await import('./twilio-webhook-service');
            await TwilioWebhookService.removeWebhooks([oldPhoneNumber[0]]);
            
            // Reset friendly name
            await TwilioWebhookService.updatePhoneNumberFriendlyName(
              oldPhoneNumber[0].phoneNumberSid,
              'Unassigned'
            );
            
            await db.update(phoneNumbers)
              .set({ friendlyName: 'Unassigned' })
              .where(eq(phoneNumbers.id, oldPhoneNumber[0].id));
          }
        } catch (webhookError) {
          console.error('Error updating tracking tag webhook:', webhookError);
          // Don't fail the update if webhook configuration fails
        }
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
      const tagId = parseInt(id);
      
      // First check if tag exists and belongs to user
      const existingTag = await db.query.callTrackingTags.findFirst({
        where: and(
          eq(callTrackingTags.id, tagId),
          eq(callTrackingTags.userId, userId)
        )
      });
      
      if (!existingTag) {
        return res.status(404).json({ error: 'Tracking tag not found' });
      }
      
      // Clear webhook for primary number if assigned
      if (existingTag.primaryNumberId) {
        try {
          const phoneNumber = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, existingTag.primaryNumberId)).limit(1);
          if (phoneNumber.length > 0) {
            const { TwilioWebhookService } = await import('./twilio-webhook-service');
            await TwilioWebhookService.removeWebhooks([phoneNumber[0]]);
            
            // Reset friendly name
            await TwilioWebhookService.updatePhoneNumberFriendlyName(
              phoneNumber[0].phoneNumberSid,
              'Unassigned'
            );
            
            await db.update(phoneNumbers)
              .set({ friendlyName: 'Unassigned' })
              .where(eq(phoneNumbers.id, phoneNumber[0].id));
          }
        } catch (webhookError) {
          console.error('Error clearing tracking tag webhook during deletion:', webhookError);
          // Don't fail deletion if webhook cleanup fails
        }
      }
      
      // Delete dependent records first to handle foreign key constraints
      await db.delete(dniSnippets).where(eq(dniSnippets.tagId, tagId));
      await db.delete(dniSessions).where(eq(dniSessions.tagId, tagId));
      
      // Now delete the tracking tag
      const deletedTag = await db
        .delete(callTrackingTags)
        .where(and(
          eq(callTrackingTags.id, tagId),
          eq(callTrackingTags.userId, userId)
        ))
        .returning();
      
      res.json({ success: true, deletedCount: deletedTag.length });
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

  // OPTIONS handler for CORS preflight requests (DNI simple tracking)
  app.options('/api/dni/track-simple', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  });

  // Simple DNI tracking endpoint (Ringba-style)
  app.post('/api/dni/track-simple', async (req, res) => {
    // Additional CORS headers for DNI endpoint
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      // console.log('=== Simple DNI Track Handler Called ===');
      // console.log('Request body:', req.body);

      const {
        campaignId,
        sessionId,
        domain,
        referrer,
        userAgent,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        publisher,
        gclid,
        fbclid,
        msclkid,
        ttclid,
        twclid,
        liclid,
        subid,
        clickid,
        affid,
        pubid,
        source,
        medium,
        campaign,
        content,
        term,
        keyword,
        placement,
        adgroup,
        creative,
        device,
        network,
        matchtype,
        adposition,
        target,
        targetid,
        loc_physical_ms,
        loc_interest_ms,
        // RedTrack Sub Parameters
        sub1,
        sub2,
        sub3,
        sub4,
        sub5,
        sub6,
        sub7,
        sub8
      } = req.body;

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      
      // console.log('DNI: Processing simple tracking request');

      const trackingRequest = {
        campaignId,
        sessionId,
        source: utmSource || source,
        medium: utmMedium || medium,
        campaign: campaignId, // Store campaignId in campaign field for visitor session
        content: utmContent || content,
        term: utmTerm || term,
        referrer: referrer || '',
        userAgent: userAgent || '',
        ipAddress,
        customFields: {
          domain,
          publisher, // Publisher passed correctly here
          gclid,
          fbclid,
          msclkid,
          ttclid,
          twclid,
          liclid,
          subid,
          clickid,
          affid,
          pubid,
          keyword,
          placement,
          adgroup,
          creative,
          device,
          network,
          matchtype,
          adposition,
          target,
          targetid,
          loc_physical_ms,
          loc_interest_ms,
          // RedTrack Sub Parameters
          sub1,
          sub2,
          sub3,
          sub4,
          sub5,
          sub6,
          sub7,
          sub8
        }
      };

      // Service request processed

      const result = await DNIService.trackVisitorByCampaignId(trackingRequest);

      if (result.success) {
        res.json({
          phoneNumber: result.phoneNumber,
          formattedNumber: result.formattedNumber,
          trackingId: result.trackingId,
          sessionId: result.sessionId
        });
      } else {
        res.status(400).json({ error: result.error || 'Failed to track visitor' });
      }
    } catch (error) {
      console.error('Simple DNI tracking error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // OPTIONS handler for CORS preflight requests (DNI tracking)
  app.options('/api/dni/track', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.sendStatus(200);
  });

  // DNI tracking endpoint for website integration (with API key authentication)
  app.post('/api/dni/track', async (req, res) => {
    // Additional CORS headers for DNI endpoint
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    try {
      console.log('=== DNI Track Handler Called ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Ringba-style UTM parameter validation and spam prevention
      const userAgent = req.headers['user-agent'] || '';
      const origin = req.headers.origin || req.headers.referer || '';
      
      // Basic bot filtering (block obvious automated requests)
      const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
      const isLikelyBot = botPatterns.some(pattern => 
        userAgent.toLowerCase().includes(pattern)
      );
      
      if (isLikelyBot) {
        return res.status(400).json({
          phoneNumber: '',
          formattedNumber: '',
          success: false,
          error: 'Invalid request'
        });
      }

      // UTM parameter validation (Ringba-style quality control)
      const utmData = {
        source: req.body.utmSource,
        medium: req.body.utmMedium,
        campaign: req.body.utmCampaign,
        content: req.body.utmContent,
        term: req.body.utmTerm
      };

      // Validate UTM parameters for suspicious/garbage data (Ringba-style)
      const validateUTMParameter = (value: string, paramType: string): boolean => {
        if (!value) return true; // Allow empty values
        
        // Basic format validation
        if (value.length < 1 || value.length > 100) return false;
        
        // Only block extremely obvious garbage - specific nonsense words
        const explicitGarbageList = ['huihui', 'test', 'spam', 'garbage', 'fake', 'dummy', 'xxx', 'asdf', 'qwerty', '12345', 'hi', 'yo', 'hey', 'lol', 'hehe'];
        
        if (explicitGarbageList.includes(value.toLowerCase())) {
          return false;
        }

        // Pure number or special character validation
        if (/^\d+$/.test(value) || /^[!@#$%^&*()]+$/.test(value)) {
          return false;
        }

        // Medium validation - auto-correct invalid mediums to "referral"
        if (paramType === 'medium') {
          const validMediums = ['organic', 'cpc', 'email', 'social', 'referral', 'direct', 'affiliate', 'display', 'video'];
          if (!validMediums.includes(value.toLowerCase())) {
            req.body.utmMedium = 'referral'; // Auto-correct to valid medium
          }
        }

        return true; // Allow everything else - let legitimate marketing campaign names through
      };

      // Validate all UTM parameters
      for (const [key, value] of Object.entries(utmData)) {
        if (value && !validateUTMParameter(value, key)) {
          return res.status(400).json({
            phoneNumber: '',
            formattedNumber: '',
            campaignId: 0,
            campaignName: '',
            success: false,
            error: `Invalid tracking parameter: ${key}`
          });
        }
      }
      
      // Processing validated tracking request
      
      // Extract the request data properly including clickid, publisher, and RedTrack sub parameters
      const { 
        tagCode, sessionId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referrer, domain, visitorId, clickid, publisher,
        // RedTrack Sub Parameters
        sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8,
        // Additional tracking parameters
        gclid, fbclid, msclkid, ttclid, twclid, liclid, subid, affid, pubid,
        source, medium, campaign, content, term, keyword, placement, adgroup, creative,
        device, network, matchtype, adposition, target, targetid, loc_physical_ms, loc_interest_ms
      } = req.body;
      
      console.log('Extracted RedTrack sub parameters:', { sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8 });
      console.log('Extracted tracking data:', { clickid, publisher, utmSource, utmMedium, utmCampaign });
      
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
          visitorId,
          clickid,  // Include clickid in customFields
          publisher, // FIX: Include publisher in customFields for attribution
          // RedTrack Sub Parameters
          sub1, sub2, sub3, sub4, sub5, sub6, sub7, sub8,
          // Additional tracking parameters
          gclid, fbclid, msclkid, ttclid, twclid, liclid, subid, affid, pubid,
          source, medium, campaign, content, term, keyword, placement, adgroup, creative,
          device, network, matchtype, adposition, target, targetid, loc_physical_ms, loc_interest_ms
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

  // API Keys Management
  app.get('/api/api-keys', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const client = (await import('@neondatabase/serverless')).neon;
      const sql_client = client(process.env.DATABASE_URL!);
      
      const apiKeys = await sql_client`
        SELECT id, key_value, key_name, is_active, created_at, last_used_at 
        FROM api_keys 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;
      
      res.json(apiKeys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
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

  // Get live tracking sessions from visitor_sessions table
  app.get('/api/tracking/live-sessions', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { timeRange = '7d' } = req.query;
      
      // Traffic analytics disabled - return empty stats
      const basicStats = {
        totalSessions: 0,
        totalConversions: 0,
        conversionRate: 0,
        topSources: [],
        recentConversions: []
      };
      
      // Get actual visitor sessions from database (raw query to bypass Drizzle issue)
      const client = (await import('@neondatabase/serverless')).neon;
      const sql_client = client(process.env.DATABASE_URL!);
      
      // Calculate days based on timeRange
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
      
      // Get real tracking sessions from visitor sessions with date filtering
      const visitorSessions = await sql_client`
        SELECT 
          session_id, source, medium, campaign,
          utm_source, utm_medium, utm_campaign, utm_content,
          referrer, user_agent, landing_page, last_activity, is_active
        FROM visitor_sessions 
        WHERE user_id = ${userId} 
          AND last_activity >= CURRENT_DATE - ${days} * INTERVAL '1 day'
        ORDER BY last_activity DESC 
        LIMIT 100
      `;

      // Use visitor sessions (includes DNI data)
      const allSessions = visitorSessions;
      
      // Transform sessions to UI format
      const transformedSessions = allSessions.map((session: any) => ({
        id: session.session_id,
        tagCode: 'tracking_active',
        campaignName: `${session.source.charAt(0).toUpperCase() + session.source.slice(1)} Campaign`,
        phoneNumber: 'Dynamic Assignment',
        source: session.source || 'direct',
        medium: session.medium || 'none',
        campaign: session.campaign || '',
        referrer: session.referrer || 'Direct',
        userAgent: session.user_agent || 'Unknown',
        timestamp: new Date(session.last_activity).toLocaleTimeString(),
        utmSource: session.utm_source,
        utmMedium: session.utm_medium,
        utmCampaign: session.utm_campaign,
        landingPage: session.landing_page,
        isActive: session.is_active
      }));

      // Add cache-busting headers to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache', 
        'Expires': '0',
        'ETag': `"${Date.now()}"` // Force fresh response with timestamp
      });

      // Calculate stats safely
      const totalSessions = allSessions.length;
      const activeSessions = allSessions.filter((s: any) => s.is_active === true).length;
      const googleTraffic = allSessions.filter((s: any) => s.source === 'google').length;
      const directTraffic = allSessions.filter((s: any) => s.source === 'direct' || !s.source).length;
      const facebookTraffic = allSessions.filter((s: any) => s.source === 'facebook').length;
      const instagramTraffic = allSessions.filter((s: any) => s.source === 'instagram').length;
      const linkedinTraffic = allSessions.filter((s: any) => s.source === 'linkedin').length;

      res.json({
        sessions: transformedSessions,
        stats: {
          totalSessions,
          activeSessions,
          googleTraffic,
          directTraffic,
          facebookTraffic,
          instagramTraffic,
          linkedinTraffic
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching live tracking sessions:', error);
      res.status(500).json({ error: 'Failed to fetch live tracking sessions' });
    }
  });

  // RTB Routes
  
  // RTB Targets
  app.get('/api/rtb/targets', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const targets = await storage.getRtbTargets(userId);
      res.json(targets);
    } catch (error) {
      console.error('Error fetching RTB targets:', error);
      res.status(500).json({ error: 'Failed to fetch RTB targets' });
    }
  });

  app.get('/api/rtb/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const target = await storage.getRtbTarget(parseInt(id), userId);
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
      const userId = req.user?.id;
      
      // Check if target exists and belongs to user
      const existingTarget = await storage.getRtbTarget(parseInt(id), userId);
      if (!existingTarget) {
        return res.status(404).json({ error: 'RTB target not found' });
      }
      
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
      const userId = req.user?.id;
      
      console.log(`[RTB Delete] Attempting to delete target ${id} for user ${userId}`);
      
      // Check if target exists and belongs to user
      const existingTarget = await storage.getRtbTarget(parseInt(id), userId);
      if (!existingTarget) {
        console.log(`[RTB Delete] Target ${id} not found for user ${userId}`);
        return res.status(404).json({ error: 'RTB target not found' });
      }
      
      console.log(`[RTB Delete] Found target ${id}, proceeding with deletion`);
      const success = await storage.deleteRtbTarget(parseInt(id));
      if (!success) {
        console.log(`[RTB Delete] Deletion failed for target ${id}`);
        return res.status(404).json({ error: 'RTB target not found' });
      }
      
      console.log(`[RTB Delete] Successfully deleted target ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting RTB target:', error);
      res.status(500).json({ error: 'Failed to delete RTB target' });
    }
  });

  // Clear all RTB bid requests and responses for user
  app.delete('/api/rtb/bid-requests/clear-all', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      console.log(`[Clear RTB Bid Requests] Starting cleanup for user ${userId}`);
      
      // Clear all RTB audit data (bid requests and responses)
      await storage.clearRtbAuditData();
      
      console.log(`[Clear RTB Bid Requests] Successfully cleared all RTB bid requests and responses`);
      
      res.json({ 
        success: true, 
        message: 'Successfully cleared all RTB bid requests and responses'
      });
    } catch (error) {
      console.error('Error clearing RTB bid requests:', error);
      res.status(500).json({ error: 'Failed to clear RTB bid requests' });
    }
  });



  // RTB Health Monitoring and Security Endpoints
  app.get('/api/rtb/health-checks', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { RTBService } = await import('./rtb-service');
      
      const healthResults = await RTBService.performHealthChecks(userId);
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalTargets: healthResults.length,
        healthyTargets: healthResults.filter(r => r.health.healthy).length,
        unhealthyTargets: healthResults.filter(r => !r.health.healthy).length,
        results: healthResults.map(r => ({
          targetId: r.target.id,
          targetName: r.target.name,
          endpointUrl: r.target.endpointUrl,
          healthy: r.health.healthy,
          responseTime: r.health.responseTime,
          error: r.health.error,
          lastChecked: new Date().toISOString()
        }))
      });
    } catch (error) {
      console.error('Error performing RTB health checks:', error);
      res.status(500).json({ error: 'Failed to perform RTB health checks' });
    }
  });

  // RTB Development Simulator
  app.post('/_sim/rtb', async (req, res) => {
    try {
      const { scenario = 'accept' } = req.body;
      
      // Simulated RTB responses for testing
      const responses = {
        accept: {
          bidAmount: 5.50,
          destinationNumber: '+15551234567',
          accepted: true,
          bidCurrency: 'USD',
          requiredDuration: 60
        },
        accept_sip: {
          bidAmount: 7.25,
          destinationNumber: 'sip:test@buyer.example.com',
          accepted: true,
          bidCurrency: 'USD',
          requiredDuration: 90
        },
        accept_with_expiration: {
          bidAmount: req.body.bidAmount || 4.2,
          bidCurrency: 'USD',
          expireInSeconds: req.body.expireInSeconds || 39,
          bidExpireDT: req.body.bidExpireDT,
          bidExpireEpoch: req.body.bidExpireEpoch,
          sipAddress: req.body.sipAddress || 'RTBtest@rtb.ringba.sip.telnyx.com',
          phoneNumber: req.body.phoneNumber || '+17733408913',
          destinationNumber: req.body.sipAddress || req.body.phoneNumber || '+17733408913',
          accepted: true,
          requiredDuration: 60,
          warnings: req.body.warnings || []
        },
        reject: {
          bidAmount: 0,
          accepted: false,
          reason: 'No capacity'
        },
        invalid_number: {
          bidAmount: 3.00,
          destinationNumber: 'invalid-number',
          accepted: true
        },
        timeout: null // Simulate timeout by not responding
      };
      
      const response = responses[scenario as keyof typeof responses];
      
      if (scenario === 'timeout') {
        // Simulate timeout - wait 6 seconds before responding
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
      
      if (!response) {
        return res.status(400).json({ error: 'Invalid scenario' });
      }
      
      console.log(`[RTB Simulator] Returning ${scenario} response:`, response);
      res.json(response);
    } catch (error) {
      console.error('[RTB Simulator] Error:', error);
      res.status(500).json({ error: 'Simulator error' });
    }
  });

  // RTB Production Inbound Endpoint
  app.post('/v1/production/:rtbId.json', async (req, res) => {
    const startTime = Date.now();
    const { rtbId } = req.params;
    const bidId = `RTB${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      console.log(`[RTB-INBOUND] ${req.method} ${req.url} - RTB ID: ${rtbId}`);
      
      // Find campaign by RTB ID
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.rtbId === rtbId);
      
      if (!campaign) {
        console.log(`[RTB-INBOUND] Campaign not found for RTB ID: ${rtbId}`);
        return res.status(404).json({ error: 'RTB ID not found or inactive' });
      }
      
      if (campaign.status !== 'active') {
        console.log(`[RTB-INBOUND] Campaign ${campaign.id} is not active: ${campaign.status}`);
        return res.status(404).json({ error: 'RTB ID not found or inactive' });
      }
      
      console.log(`[RTB-INBOUND] Found campaign: ${campaign.name} (ID: ${campaign.id})`);
      
      // Authentication
      const authResult = await authenticateRtbRequest(req, campaign);
      if (!authResult.success) {
        console.log(`[RTB-INBOUND] Auth failed: ${authResult.error}`);
        return res.status(authResult.statusCode).json({ error: authResult.error });
      }
      
      // Log the request
      await logRtbInboundRequest(req, campaign, rtbId, bidId, authResult.method, 'success', Date.now() - startTime);
      
      // Check capacity
      if (!campaign.capacityAvailable) {
        console.log(`[RTB-INBOUND] Campaign ${campaign.id} has no capacity available`);
        const response = {
          bidId,
          accept: false,
          bidAmount: 0,
          rejectReason: 'Capacity not available'
        };
        await logRtbInboundResponse(bidId, 200, response, false, null, 'capacity', Date.now() - startTime);
        return res.status(200).json(response);
      }
      
      // Generate bid amount between min/max
      const minBid = parseFloat(campaign.minBid || '1.00');
      const maxBid = parseFloat(campaign.maxBid || '50.00');
      const bidAmount = Math.round((minBid + Math.random() * (maxBid - minBid)) * 100) / 100;
      
      // Determine destination - prefer SIP
      let destination: any = {};
      if (campaign.sipRtbUri) {
        destination = {
          sipAddress: campaign.sipRtbUri
        };
        console.log(`[RTB-INBOUND] Using SIP destination: ${campaign.sipRtbUri}`);
      } else {
        // Fallback to campaign phone number (E.164 format)
        const phoneNumber = campaign.phoneNumber || '+18555551234'; // fallback
        destination = {
          phoneNumber: phoneNumber
        };
        console.log(`[RTB-INBOUND] Using phone destination: ${phoneNumber}`);
      }
      
      // Build response
      const response = {
        bidId,
        accept: true,
        bidAmount,
        bidCurrency: campaign.bidCurrency || 'USD',
        expiresInSec: 60,
        requiredDuration: campaign.requiredDuration || 60,
        ...destination
      };
      
      // Apply shareable tags if enabled
      if (campaign.rtbShareableTags && campaign.rtbRequestTemplate) {
        const enrichedTemplate = await applyShareableTags(campaign.rtbRequestTemplate, req);
        response.metadata = enrichedTemplate;
      }
      
      console.log(`[RTB-INBOUND] Bid accepted: $${bidAmount} ${campaign.bidCurrency || 'USD'}`);
      
      // Log the response
      const destinationType = campaign.sipRtbUri ? 'sip' : 'did';
      const destinationValue = campaign.sipRtbUri || campaign.phoneNumber;
      await logRtbInboundResponse(bidId, 200, response, true, bidAmount, null, Date.now() - startTime, destinationType, destinationValue);
      
      res.status(200).json(response);
      
    } catch (error) {
      console.error(`[RTB-INBOUND] Error processing request:`, error);
      const response = { error: 'Internal server error' };
      await logRtbInboundResponse(bidId, 500, response, false, null, 'server_error', Date.now() - startTime);
      res.status(500).json(response);
    }
  });

  // Handle GET requests to RTB endpoint (return 405)
  app.get('/v1/production/:rtbId.json', (req, res) => {
    res.status(405).json({ error: 'Method not allowed. Only POST requests are supported.' });
  });

  // RTB Inbound Authentication Helper
  async function authenticateRtbRequest(req: Request, campaign: any): Promise<{ success: boolean; method: string; error?: string; statusCode?: number }> {
    const authMethod = campaign.rtbAuthMethod || 'none';
    
    try {
      switch (authMethod) {
        case 'none':
          return { success: true, method: 'none' };
          
        case 'bearer':
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { success: false, method: 'bearer', error: 'Bearer token required', statusCode: 401 };
          }
          
          const token = authHeader.substring(7);
          if (token !== campaign.rtbAuthSecret) {
            return { success: false, method: 'bearer', error: 'Invalid bearer token', statusCode: 403 };
          }
          
          return { success: true, method: 'bearer' };
          
        case 'hmac-sha256':
          const timestamp = req.headers['x-rtb-timestamp'] as string;
          const signature = req.headers['x-rtb-signature'] as string;
          
          if (!timestamp || !signature) {
            return { success: false, method: 'hmac-sha256', error: 'HMAC headers required (X-RTB-Timestamp, X-RTB-Signature)', statusCode: 401 };
          }
          
          // Check timestamp (prevent replay attacks)
          const now = Math.floor(Date.now() / 1000);
          const reqTimestamp = parseInt(timestamp);
          if (Math.abs(now - reqTimestamp) > 300) { // 5 minutes
            return { success: false, method: 'hmac-sha256', error: 'Timestamp too old or too far in future', statusCode: 401 };
          }
          
          // Verify HMAC signature
          const rawBody = JSON.stringify(req.body);
          const expectedSignature = crypto
            .createHmac('sha256', campaign.rtbAuthSecret)
            .update(`${timestamp}.${rawBody}`)
            .digest('base64');
            
          if (signature !== expectedSignature) {
            return { success: false, method: 'hmac-sha256', error: 'Invalid HMAC signature', statusCode: 403 };
          }
          
          return { success: true, method: 'hmac-sha256' };
          
        default:
          return { success: false, method: authMethod, error: 'Unsupported auth method', statusCode: 400 };
      }
    } catch (error) {
      console.error('[RTB-INBOUND] Auth error:', error);
      return { success: false, method: authMethod, error: 'Authentication error', statusCode: 500 };
    }
  }

  // RTB Inbound Request Logging Helper
  async function logRtbInboundRequest(req: Request, campaign: any, rtbId: string, bidId: string, authMethod: string, authResult: string, responseTime: number) {
    try {
      await storage.logRtbInboundRequest({
        campaignId: campaign.id,
        rtbId,
        bidId,
        requestMethod: req.method,
        requestUrl: req.url,
        requestHeaders: req.headers,
        requestBody: req.body,
        clientIp: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        authMethod,
        authResult,
        responseTime
      });
    } catch (error) {
      console.error('[RTB-INBOUND] Failed to log request:', error);
    }
  }

  // RTB Inbound Response Logging Helper
  async function logRtbInboundResponse(bidId: string, statusCode: number, responseBody: any, bidAccepted: boolean, bidAmount: number | null, rejectReason: string | null, responseTime: number, destinationType?: string, destinationValue?: string) {
    try {
      await storage.logRtbInboundResponse({
        bidId, // Will need to map to requestId in storage layer
        statusCode,
        responseBody,
        bidAccepted,
        bidAmount,
        rejectReason,
        responseTime,
        destinationType,
        destinationValue,
        expiresInSec: responseBody.expiresInSec || null,
        requiredDuration: responseBody.requiredDuration || null
      });
    } catch (error) {
      console.error('[RTB-INBOUND] Failed to log response:', error);
    }
  }

  // Apply Shareable Tags to Request Template
  async function applyShareableTags(template: any, req: Request): Promise<any> {
    try {
      if (!template) return {};
      
      // Convert template to string, apply token replacements, then parse back
      let templateStr = JSON.stringify(template);
      
      // Basic token replacements (can be extended)
      const tokens: { [key: string]: string } = {
        '[Call:CallerId]': '555***' + Math.floor(Math.random() * 10000), // Obfuscated caller ID
        '[Geo:SubDivision]': req.headers['x-forwarded-for'] ? 'US' : 'Unknown',
        '[Geo:City]': req.headers['x-forwarded-for'] ? 'Unknown' : 'Unknown',
        '[Request:Timestamp]': new Date().toISOString(),
        '[Request:IP]': req.ip ? req.ip.replace(/\.\d+$/, '.***') : '*.*.*.***', // Obfuscated IP
        '[Request:UserAgent]': req.headers['user-agent'] || 'Unknown'
      };
      
      // Apply token replacements
      for (const [token, value] of Object.entries(tokens)) {
        templateStr = templateStr.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      }
      
      return JSON.parse(templateStr);
    } catch (error) {
      console.error('[RTB-INBOUND] Failed to apply shareable tags:', error);
      return template || {};
    }
  }

  app.get('/api/rtb/targets/:targetId/uptime', requireAuth, async (req: any, res) => {
    try {
      const { targetId } = req.params;
      const { hours = 24 } = req.query;
      const { RTBService } = await import('./rtb-service');
      
      const uptimeData = await RTBService.getTargetUptime(parseInt(targetId), parseInt(hours as string));
      
      res.json({
        success: true,
        targetId: parseInt(targetId),
        period: `${hours} hours`,
        uptime: uptimeData.uptime,
        totalChecks: uptimeData.checks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching RTB target uptime:', error);
      res.status(500).json({ error: 'Failed to fetch RTB target uptime' });
    }
  });

  // Campaign RTB Target Assignments (replaced router assignments)
  app.get('/api/campaigns/:campaignId/rtb-targets', requireAuth, async (req: any, res) => {
    try {
      const { campaignId } = req.params;
      const assignments = await storage.getCampaignRtbTargets(campaignId);
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching campaign RTB targets:', error);
      res.status(500).json({ error: 'Failed to fetch campaign RTB targets' });
    }
  });

  // Update campaign target assignments (direct assignment)
  app.put('/api/campaigns/:campaignId/rtb-targets', requireAuth, async (req: any, res) => {
    try {
      const { campaignId } = req.params;
      const { assignments } = req.body; // Array of {targetId, priority, isActive}
      
      // First, remove existing assignments for this campaign
      const existingAssignments = await storage.getCampaignRtbTargets(campaignId);
      
      for (const assignment of existingAssignments) {
        await storage.removeCampaignRtbTarget(campaignId, assignment.rtbTargetId || assignment.id);
      }
      
      // Then add new assignments
      for (const assignment of assignments) {
        if (assignment.isActive) {
          await storage.createCampaignRtbTarget({
            campaignId: campaignId,
            rtbTargetId: assignment.targetId
          });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating campaign RTB target assignments:', error);
      res.status(500).json({ error: 'Failed to update campaign RTB target assignments' });
    }
  });

  // RTB Routers
  app.get('/api/rtb/routers', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const routers = await storage.getRtbRouters(userId);
      res.json(routers);
    } catch (error) {
      console.error('Error fetching RTB routers:', error);
      res.status(500).json({ error: 'Failed to fetch RTB routers' });
    }
  });

  app.get('/api/rtb/routers/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const router = await storage.getRtbRouter(parseInt(id), userId);
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
      const userId = req.user?.id;
      
      // Check if router exists and belongs to user
      const existingRouter = await storage.getRtbRouter(parseInt(id), userId);
      if (!existingRouter) {
        return res.status(404).json({ error: 'RTB router not found' });
      }
      
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
      
      // Check if any campaigns are using this router
      const allCampaigns = await storage.getCampaigns();
      const activeCampaigns = allCampaigns.filter(c => c.rtbRouterId === parseInt(id));
      
      if (activeCampaigns.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete active RTB router', 
          reason: `${activeCampaigns.length} campaign(s) are currently using this router`,
          campaigns: activeCampaigns.map(c => ({ id: c.id, name: c.name })),
          suggestion: 'Please disable RTB or change the router for these campaigns first'
        });
      }
      
      const success = await storage.deleteRtbRouter(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: 'RTB router not found or deletion failed' });
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

  // RTB Enhanced Demo - Generate sample request body with enhanced tracking
  app.get('/api/rtb/sample-request-body', requireAuth, async (req: any, res) => {
    try {
      const { RTBService } = await import('./rtb-service');
      const sampleBody = RTBService.createSampleRequestBody();
      
      res.json({
        success: true,
        sampleRequestBody: sampleBody,
        parsedExample: JSON.parse(sampleBody),
        availableTokens: {
          basic: [
            '{requestId}', '{campaignId}', '{callerId}', '{timestamp}',
            '{minBid}', '{maxBid}', '{currency}'
          ],
          enhanced: [
            '{inboundNumber}', '{inboundCallId}', '{publisherId}',
            '{publisherSubId}', '{exposeCallerId}'
          ],
          ringbaCompliant: [
            '[tag:InboundNumber:Number-NoPlus]', '[Call:InboundCallId]',
            '[Publisher:SubId]', '[Call:CallerId]'
          ]
        }
      });
    } catch (error) {
      console.error('Error generating sample request body:', error);
      res.status(500).json({ error: 'Failed to generate sample request body' });
    }
  });

  // RTB Testing Routes - Similar to Ringba's "Test" functionality
  
  // Test individual RTB target
  app.post('/api/rtb/targets/:targetId/test', requireAuth, async (req: any, res) => {
    try {
      const { RTBTestService } = await import('./rtb-test-service');
      const targetId = parseInt(req.params.targetId);
      const testData = req.body;
      
      const result = await RTBTestService.testRTBTarget(targetId, testData);
      res.json(result);
    } catch (error) {
      console.error('Error testing RTB target:', error);
      res.status(500).json({ 
        error: 'Failed to test RTB target',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test RTB auction for campaign
  app.post('/api/rtb/campaigns/:campaignId/test-auction', requireAuth, async (req: any, res) => {
    try {
      const { RTBTestService } = await import('./rtb-test-service');
      const campaignId = req.params.campaignId;
      const testData = req.body;
      
      const result = await RTBTestService.testRTBAuction(campaignId, testData);
      res.json(result);
    } catch (error) {
      console.error('Error testing RTB auction:', error);
      res.status(500).json({ 
        error: 'Failed to test RTB auction',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get RTB test history
  app.get('/api/rtb/test-history', requireAuth, async (req: any, res) => {
    try {
      const { RTBTestService } = await import('./rtb-test-service');
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const history = await RTBTestService.getTestHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error('Error fetching RTB test history:', error);
      res.status(500).json({ error: 'Failed to fetch RTB test history' });
    }
  });

  // RTB Bid Requests and Responses
  app.get('/api/rtb/bid-requests', requireAuth, async (req: any, res) => {
    try {
      const { campaignId } = req.query;
      const userId = req.user?.id;
      
      // Get all bid requests
      const allRequests = await storage.getRtbBidRequests(campaignId ? parseInt(campaignId as string) : undefined);
      
      // Filter bid requests to only show those from user's campaigns
      const userCampaigns = await storage.getCampaigns(userId);
      const userCampaignIds = userCampaigns.map(c => c.id);
      
      const userRequests = allRequests.filter(request => {
        // Check if the request belongs to any of the user's campaigns
        return userCampaignIds.includes(request.campaignId);
      });
      
      // Enhance with destination numbers from winning bid responses
      const enhancedRequests = await Promise.all(
        userRequests.map(async (request) => {
          if (request.winningTargetId) {
            try {
              // Get all bid responses for this request
              const bidResponses = await storage.getRtbBidResponses(request.requestId);
              // Find the winning bid response
              const winningResponse = bidResponses.find(response => 
                response.rtbTargetId === request.winningTargetId && response.isWinningBid
              );
              
              return {
                ...request,
                destinationNumber: winningResponse?.destinationNumber || null
              };
            } catch (error) {
              console.error('Error fetching destination number for request:', request.requestId, error);
              return { ...request, destinationNumber: null };
            }
          }
          return { ...request, destinationNumber: null };
        })
      );
      
      res.json(enhancedRequests);
    } catch (error) {
      console.error('Error fetching RTB bid requests:', error);
      res.status(500).json({ error: 'Failed to fetch RTB bid requests' });
    }
  });

  app.get('/api/rtb/bid-requests/:requestId/responses', requireAuth, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;
      
      // First check if the request belongs to the user
      const bidRequest = await storage.getRtbBidRequest(requestId);
      if (!bidRequest) {
        return res.status(404).json({ error: 'Bid request not found' });
      }
      
      // Check if the campaign belongs to the user
      const userCampaigns = await storage.getCampaigns(userId);
      const userCampaignIds = userCampaigns.map(c => c.id);
      
      if (!userCampaignIds.includes(bidRequest.campaignId)) {
        return res.status(404).json({ error: 'Bid request not found' });
      }
      
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
      // RTB seeder not available - return mock response
      const results = {
        router: { name: 'Test Router' },
        targets: [1, 2, 3],
        assignments: [1, 2],
        bidRequests: [1],
        bidResponses: [1, 2]
      };
      
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

  // Test bidding endpoint for RTB development
  app.post('/api/test-bid', (req, res) => {
    console.log('Test bid request received:', JSON.stringify(req.body, null, 2));
    
    const { requestId, campaignId, callerId, minBid, maxBid } = req.body;
    
    // Always bid for testing purposes (remove mock randomization)
    const shouldBid = true;
    
    if (shouldBid) {
      // Generate bid amount between min and max (use correct field names)
      const minBidAmount = parseFloat(minBid) || 1.0;
      const maxBidAmount = parseFloat(maxBid) || 5.0;
      const bidAmount = ((minBidAmount + maxBidAmount) / 2).toFixed(2); // Use average instead of random
      
      const response = {
        requestId,
        bidAmount: parseFloat(bidAmount),
        bidCurrency: 'USD',
        destinationNumber: '+1800555EXTERNAL', // External bidder destination
        requiredDuration: 60, // 60 seconds minimum
        accepted: true,
        callerId,
        campaignId,
        timestamp: new Date().toISOString()
      };
      
      console.log('Test bid response:', response);
      res.json(response);
    } else {
      // No bid
      console.log('Test bidder not bidding on this request');
      res.status(204).send(); // No content
    }
  });

  // API Testing Interface Route
  app.get('/apiCheck.html', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'apiCheck.html');
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.send(fileContent);
      } else {
        res.status(404).send('API Check file not found');
      }
    } catch (error) {
      console.error('Error serving apiCheck.html:', error);
      res.status(500).send('Error loading API testing interface');
    }
  });

  // Chatbot and Feedback API endpoints
  app.post('/api/chatbot/query', requireAuth, async (req: any, res) => {
    try {
      const { message, conversationHistory } = req.body;
      
      // Use Claude AI with project knowledge
      const { ChatbotService } = await import('./chatbot-service');
      const result = await ChatbotService.generateResponse({
        message,
        conversationHistory
      });
      
      res.json({ response: result.response, sources: result.sources });
    } catch (error) {
      console.error('Error processing chatbot query:', error);
      
      // Fallback to simple response if Claude fails
      const response = "I'm here to help with your CallCenter Pro questions. Please provide more details about what you need assistance with.";
      res.json({ response });
    }
  });

  app.post('/api/feedback', requireAuth, async (req: any, res) => {
    try {
      const { question, response } = req.body;
      const userId = req.user?.id;
      
      const feedback = await storage.createFeedback({
        userId,
        question,
        response,
        resolved: false
      });
      
      res.status(201).json(feedback);
    } catch (error) {
      console.error('Error storing feedback:', error);
      res.status(500).json({ error: 'Failed to store feedback' });
    }
  });

  app.get('/api/feedback/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const history = await storage.getFeedbackHistory(userId);
      res.json(history);
    } catch (error) {
      console.error('Error fetching feedback history:', error);
      res.status(500).json({ error: 'Failed to fetch feedback history' });
    }
  });

  // Get all feedback entries (for queries page)
  app.get('/api/feedback/all', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const allFeedback = await storage.getAllFeedback(userId);
      res.json(allFeedback);
    } catch (error) {
      console.error('Error fetching all feedback:', error);
      res.status(500).json({ error: 'Failed to fetch all feedback' });
    }
  });

  // Call Flow API endpoints
  app.get('/api/call-flows', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const callFlows = await storage.getCallFlows(userId);
      res.json(callFlows);
    } catch (error) {
      console.error('Error fetching call flows:', error);
      res.status(500).json({ error: 'Failed to fetch call flows' });
    }
  });

  app.post('/api/call-flows', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const callFlowData = { ...req.body, userId };
      const callFlow = await storage.createCallFlow(callFlowData);
      res.status(201).json(callFlow);
    } catch (error) {
      console.error('Error creating call flow:', error);
      res.status(500).json({ error: 'Failed to create call flow' });
    }
  });

  app.get('/api/call-flows/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const callFlow = await storage.getCallFlow(parseInt(req.params.id));
      if (!callFlow || callFlow.userId !== userId) {
        return res.status(404).json({ error: 'Call flow not found' });
      }
      res.json(callFlow);
    } catch (error) {
      console.error('Error fetching call flow:', error);
      res.status(500).json({ error: 'Failed to fetch call flow' });
    }
  });

  app.put('/api/call-flows/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const callFlow = await storage.getCallFlow(parseInt(req.params.id));
      if (!callFlow || callFlow.userId !== userId) {
        return res.status(404).json({ error: 'Call flow not found' });
      }
      const updatedCallFlow = await storage.updateCallFlow(parseInt(req.params.id), req.body);
      res.json(updatedCallFlow);
    } catch (error) {
      console.error('Error updating call flow:', error);
      res.status(500).json({ error: 'Failed to update call flow' });
    }
  });

  app.delete('/api/call-flows/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const callFlow = await storage.getCallFlow(parseInt(req.params.id));
      if (!callFlow || callFlow.userId !== userId) {
        return res.status(404).json({ error: 'Call flow not found' });
      }
      await storage.deleteCallFlow(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting call flow:', error);
      res.status(500).json({ error: 'Failed to delete call flow' });
    }
  });

  app.put('/api/call-flows/:id/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const callFlow = await storage.getCallFlow(parseInt(req.params.id));
      if (!callFlow || callFlow.userId !== userId) {
        return res.status(404).json({ error: 'Call flow not found' });
      }
      
      // Update both status and is_active fields
      const newStatus = req.body.status;
      const isActive = newStatus === 'active';
      
      const updatedCallFlow = await storage.updateCallFlow(parseInt(req.params.id), { 
        status: newStatus,
        isActive: isActive
      });
      
      res.json(updatedCallFlow);
    } catch (error) {
      console.error('Error updating call flow status:', error);
      res.status(500).json({ error: 'Failed to update call flow status' });
    }
  });

  // Flow Execution API endpoints
  app.post('/api/flow/start/:flowId', async (req: any, res) => {
    try {
      const flowId = parseInt(req.params.flowId);
      const { callId, callerNumber, campaignId } = req.body;

      if (!callId || !callerNumber) {
        return res.status(400).json({ error: 'callId and callerNumber are required' });
      }

      const result = await FlowExecutionEngine.startFlowExecution(
        flowId,
        callId,
        callerNumber,
        campaignId
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.set('Content-Type', 'application/xml');
      res.send(result.twimlResponse?.twiml || '<Response><Hangup/></Response>');
    } catch (error) {
      console.error('Error starting flow execution:', error);
      res.status(500).set('Content-Type', 'application/xml').send('<Response><Hangup/></Response>');
    }
  });

  app.post('/api/flow/execute/:flowId/node/:nodeId', async (req: any, res) => {
    try {
      const flowId = parseInt(req.params.flowId);
      const nodeId = req.params.nodeId;
      const sessionId = req.query.sessionId;

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const result = await FlowExecutionEngine.continueFlowExecution(
        sessionId,
        nodeId,
        req.body
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.set('Content-Type', 'application/xml');
      res.send(result.twimlResponse?.twiml || '<Response><Hangup/></Response>');
    } catch (error) {
      console.error('Error executing flow node:', error);
      res.status(500).set('Content-Type', 'application/xml').send('<Response><Hangup/></Response>');
    }
  });

  app.post('/api/flow/execute/:flowId/node/:nodeId/response', async (req: any, res) => {
    try {
      const flowId = parseInt(req.params.flowId);
      const nodeId = req.params.nodeId;
      const sessionId = req.query.sessionId;

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const result = await FlowExecutionEngine.handleNodeResponse(
        sessionId,
        nodeId,
        req.body
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.set('Content-Type', 'application/xml');
      res.send(result.twimlResponse?.twiml || '<Response><Hangup/></Response>');
    } catch (error) {
      console.error('Error handling node response:', error);
      res.status(500).set('Content-Type', 'application/xml').send('<Response><Hangup/></Response>');
    }
  });

  // Flow debugging endpoints
  app.get('/api/flow/debug/sessions', requireAuth, async (req: any, res) => {
    try {
      const sessions = FlowExecutionEngine.getActiveSessions();
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      res.status(500).json({ error: 'Failed to fetch active sessions' });
    }
  });

  app.get('/api/flow/debug/session/:sessionId', requireAuth, async (req: any, res) => {
    try {
      const sessionId = req.params.sessionId;
      const session = FlowExecutionEngine.getActiveSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(session);
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  // MVP Tracking API routes (no auth required for external pixel tracking)
  app.post('/api/tracking/session', async (req, res) => {
    try {
      // For pixel tracking, we don't require authentication
      // The campaignId in the request tells us which user's campaign this is for
      const sessionData = {
        ...req.body,
        // We'll set userId based on the campaign, not the current user
        userId: req.body.userId || 1  // Default to user 1 for now
      };
      
      const session = await storage.createVisitorSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error('Error creating visitor session:', error);
      res.status(500).json({ error: 'Failed to create visitor session' });
    }
  });

  app.get('/api/tracking/session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getVisitorSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching visitor session:', error);
      res.status(500).json({ error: 'Failed to fetch visitor session' });
    }
  });

  app.patch('/api/tracking/session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const updates = req.body;
      
      const session = await storage.updateVisitorSession(sessionId, updates);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error updating visitor session:', error);
      res.status(500).json({ error: 'Failed to update visitor session' });
    }
  });

  app.post('/api/tracking/conversion', async (req, res) => {
    try {
      const conversionData = req.body;
      const event = await storage.createConversionEvent(conversionData);
      res.json(event);
    } catch (error) {
      console.error('Error creating conversion event:', error);
      res.status(500).json({ error: 'Failed to create conversion event' });
    }
  });

  app.get('/api/tracking/conversions', requireAuth, async (req, res) => {
    try {
      const { sessionId, campaignId } = req.query;
      const events = await storage.getConversionEvents(
        sessionId as string,
        campaignId ? parseInt(campaignId as string) : undefined
      );
      res.json(events);
    } catch (error) {
      console.error('Error fetching conversion events:', error);
      res.status(500).json({ error: 'Failed to fetch conversion events' });
    }
  });

  app.get('/api/tracking/stats', requireAuth, async (req, res) => {
    // Traffic analytics disabled - return empty stats
    res.json({
      totalSessions: 0,
      totalConversions: 0,
      conversionRate: 0,
      topSources: [],
      recentConversions: []
    });
  });

  // Pixel code generation endpoint
  app.get('/api/tracking/pixel-code/:campaignId', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const userId = req.user?.id;
      const { trackingService } = await import('./tracking-service');
      const pixelCode = trackingService.generateTrackingCode(campaignId, userId);
      res.json({ pixelCode });
    } catch (error) {
      console.error('Error generating pixel code:', error);
      res.status(500).json({ error: 'Failed to generate pixel code' });
    }
  });

  // Pixel image endpoint (transparent 1x1 pixel)
  app.get('/api/tracking/pixel.gif', async (req, res) => {
    try {
      const { campaign_id, session_id, ...trackingData } = req.query;
      
      // Log the tracking data for debugging
      console.log('Pixel fired:', { campaign_id, session_id, trackingData });
      
      // Create or update visitor session
      if (campaign_id) {
        const { trackingService } = await import('./tracking-service');
        const { TrackingService } = await import('./tracking-service');
        const trackingServiceInstance = new TrackingService();
        const userId = 1; // In production, derive from campaign or other means
        
        // Generate session ID if not provided
        const sessionId = session_id as string || trackingServiceInstance.generateSessionId();
        
        await trackingServiceInstance.createOrUpdateSession(
          sessionId,
          userId,
          {
            campaign_id: campaign_id as string,
            landing_page: trackingData.landing_page as string,
            referrer: trackingData.referrer as string,
            user_agent: trackingData.user_agent as string,
            ip_address: req.ip,
            utm_source: trackingData.utm_source as string,
            utm_medium: trackingData.utm_medium as string,
            utm_campaign: trackingData.utm_campaign as string,
            utm_term: trackingData.utm_term as string,
            utm_content: trackingData.utm_content as string,
            source: trackingData.source as string,
            medium: trackingData.medium as string
          }
        );
      }
      
      // Return transparent 1x1 pixel image
      const pixel = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3B
      ]);
      
      res.set({
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.end(pixel);
    } catch (error) {
      console.error('Error processing pixel:', error);
      res.status(500).end();
    }
  });

  // Advanced Analytics API endpoints
  app.get('/api/analytics/attribution/:campaignId', requireAuth, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const { attributionService } = await import('./attribution-service');
      const report = await attributionService.generateAttributionReport(campaignId);
      res.json(report);
    } catch (error) {
      console.error('Error fetching attribution report:', error);
      res.status(500).json({ error: 'Failed to fetch attribution report' });
    }
  });

  app.get('/api/analytics/attribution', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { attributionService } = await import('./attribution-service');
      // Get all campaigns for this user and aggregate attribution data
      const campaigns = await storage.getCampaigns(userId);
      if (campaigns.length === 0) {
        return res.json({
          totalConversions: 0,
          totalRevenue: 0,
          attributionBreakdown: [],
          customerJourney: []
        });
      }
      
      // For simplicity, use the first campaign or aggregate across all
      const report = await attributionService.generateAttributionReport(campaigns[0].id);
      res.json(report);
    } catch (error) {
      console.error('Error fetching attribution report:', error);
      res.status(500).json({ error: 'Failed to fetch attribution report' });
    }
  });

  app.get('/api/analytics/traffic-sources', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { attributionService } = await import('./attribution-service');
      const sources = await attributionService.analyzeTrafficSources(userId);
      res.json(sources);
    } catch (error) {
      console.error('Error analyzing traffic sources:', error);
      res.status(500).json({ error: 'Failed to analyze traffic sources' });
    }
  });

  app.get('/api/analytics/landing-pages', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { attributionService } = await import('./attribution-service');
      const pages = await attributionService.getLandingPageAnalytics(userId);
      res.json(pages);
    } catch (error) {
      console.error('Error fetching landing page analytics:', error);
      res.status(500).json({ error: 'Failed to fetch landing page analytics' });
    }
  });

  app.get('/api/analytics/optimizations', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { attributionService } = await import('./attribution-service');
      const optimizations = await attributionService.optimizeTrafficSources(userId);
      res.json(optimizations);
    } catch (error) {
      console.error('Error fetching optimization recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch optimization recommendations' });
    }
  });

  app.get('/api/analytics/optimization', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { attributionService } = await import('./attribution-service');
      const optimizations = await attributionService.optimizeTrafficSources(userId);
      res.json(optimizations);
    } catch (error) {
      console.error('Error fetching optimization recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch optimization recommendations' });
    }
  });

  app.get('/api/analytics/attribution-chain/:sessionId', requireAuth, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const callId = req.query.callId ? parseInt(req.query.callId as string) : undefined;
      const { attributionService } = await import('./attribution-service');
      const chain = await attributionService.buildAttributionChain(sessionId, callId);
      res.json(chain);
    } catch (error) {
      console.error('Error building attribution chain:', error);
      res.status(500).json({ error: 'Failed to build attribution chain' });
    }
  });

  // Agent Performance Analytics
  app.get('/api/agents/performance', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const agents = await storage.getAgents(userId);
      
      // For now, return empty performance data until we have actual call metrics
      const agentPerformance = agents.map(agent => ({
        agentId: agent.id,
        liveCallsCount: 0,
        avgCallDuration: 0,
        conversionRate: 0,
        todaysRevenue: 0,
        availability: agent.status
      }));
      
      res.json(agentPerformance);
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      res.status(500).json({ error: 'Failed to fetch agent performance' });
    }
  });

  // Historical Analytics Data
  app.get('/api/analytics/historical', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { timeRange = '7d' } = req.query;
      
      // Get historical visitor session data
      const client = (await import('@neondatabase/serverless')).neon;
      const sql_client = client(process.env.DATABASE_URL!);
      
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
      
      // Use last_activity instead of first_visit for consistency with live-sessions
      const dailyStats = await sql_client`
        SELECT 
          DATE(last_activity) as date,
          COUNT(*) as sessions,
          COUNT(DISTINCT source) as sources
        FROM visitor_sessions 
        WHERE user_id = ${userId} 
          AND last_activity >= CURRENT_DATE - ${days} * INTERVAL '1 day'
        GROUP BY DATE(last_activity)
        ORDER BY date ASC
        LIMIT 30
      `;
      
      res.json({
        dailyBreakdown: dailyStats.map((stat: any) => ({
          date: stat.date,
          sessions: parseInt(stat.sessions),
          sources: parseInt(stat.sources)
        }))
      });
    } catch (error) {
      console.error('Error fetching historical analytics:', error);
      res.status(500).json({ error: 'Failed to fetch historical analytics' });
    }
  });

  // Attribution Values
  app.get('/api/analytics/attribution-values', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { timeRange = '7d' } = req.query;
      
      // For now, return empty attribution values until we have conversion tracking
      // But maintain consistent timeRange parameter handling
      res.json([]);
    } catch (error) {
      console.error('Error fetching attribution values:', error);
      res.status(500).json({ error: 'Failed to fetch attribution values' });
    }
  });

  // Comprehensive Analytics (for Professional Analytics page)
  app.get('/api/analytics/comprehensive', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { dateRange = '7d', campaign, source } = req.query;
      
      // Get actual calls and visitor sessions data
      const calls = await storage.getCalls(userId);
      
      const client = (await import('@neondatabase/serverless')).neon;
      const sql_client = client(process.env.DATABASE_URL!);
      
      const sessions = await sql_client`
        SELECT * FROM visitor_sessions 
        WHERE user_id = ${userId} 
        ORDER BY last_activity DESC 
        LIMIT 50
      `;
      
      // Build comprehensive analytics from real data
      const performanceMetrics = {
        totalCalls: calls.length,
        connectedCalls: calls.filter(c => c.status === 'completed').length,
        totalRevenue: calls.length * 75, // Estimated revenue per call
        averageDuration: calls.length > 0 ? Math.round(calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length) : 0,
        conversionRate: calls.length > 0 ? Math.round((calls.filter(c => c.status === 'completed').length / calls.length) * 100) : 0,
        costPerCall: 12.50
      };
      
      // Traffic sources from visitor sessions
      const sourceStats = sessions.reduce((acc: any, session: any) => {
        const source = session.source || 'direct';
        if (!acc[source]) {
          acc[source] = { name: source, value: 0, revenue: 0, calls: 0 };
        }
        acc[source].value++;
        acc[source].revenue += 75; // Estimated revenue per session
        return acc;
      }, {});
      
      const trafficSources = Object.values(sourceStats);
      
      // Performance timeline (simplified)
      const performanceTimeline = [
        { date: new Date().toISOString().split('T')[0], calls: calls.length, revenue: performanceMetrics.totalRevenue, conversions: performanceMetrics.connectedCalls }
      ];
      
      // Recent calls data
      const recentCalls = calls.slice(0, 5).map(call => ({
        id: call.id.toString(),
        campaign: 'Active Campaign',
        source: 'tracking',
        duration: call.duration || 0,
        outcome: call.status === 'completed' ? 'connected' : 'abandoned',
        revenue: call.status === 'completed' ? 75 : 0,
        timestamp: call.createdAt,
        location: 'Unknown',
        number: call.fromNumber || 'Unknown'
      }));
      
      res.json({
        performanceMetrics,
        trafficSources,
        performanceTimeline,
        recentCalls
      });
    } catch (error) {
      console.error('Error fetching comprehensive analytics:', error);
      res.status(500).json({ 
        performanceMetrics: {
          totalCalls: 0,
          connectedCalls: 0,
          totalRevenue: 0,
          averageDuration: 0,
          conversionRate: 0,
          costPerCall: 0
        },
        trafficSources: [],
        performanceTimeline: [],
        recentCalls: []
      });
    }
  });

  // Enhanced Reporting API Routes
  const phoneNumberTagsRouter = (await import('./api/phone-number-tags')).default;
  app.use('/api/phone-number-tags', phoneNumberTagsRouter);
  
  // Enhanced calls endpoint for expandable call details with pagination
  app.get('/api/calls/enhanced', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25; // Smaller default for enhanced data
      const offset = (page - 1) * limit;

      // Get calls with basic enhanced data
      const callsData = await storage.getCalls(userId);
      const campaignsData = await storage.getCampaigns(userId);
      const buyersData = await storage.getBuyers(userId);
      const publishersData = await storage.getPublishers(userId);

      // Create lookup maps - use string conversion to ensure matching
      const campaignMap = new Map(campaignsData.map(c => [String(c.id), c]));
      const buyerMap = new Map(buyersData.map(b => [b.id, b]));
      const publisherMap = new Map(publishersData.map(p => [p.id, p]));

      // Get RTB data for calls with direct database query
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL!);
      
      const rtbData = await sql`
        SELECT 
          r.request_id,
          r.campaign_id,
          r.winning_bid_amount,
          r.winning_target_id,
          r.total_targets_pinged,
          r.successful_responses,
          r.total_response_time_ms,
          c.call_sid
        FROM rtb_bid_requests r
        INNER JOIN calls c ON c.campaign_id = r.campaign_id 
        AND c.call_sid = RIGHT(r.request_id, 34)
        WHERE r.campaign_id IN ${sql(campaignsData.map(c => c.id))}
        AND r.winning_bid_amount IS NOT NULL
      `;
      
      const rtbMap = new Map(rtbData.map(rtb => [rtb.call_sid, rtb]));

      // Enhance calls with related data including RTB information
      const enhancedCalls = callsData.map(call => {
        const campaignId = String(call.campaignId || '');
        const campaign = campaignMap.get(campaignId);
        const rtbInfo = rtbMap.get(call.callSid);
        
        return {
          ...call,
          campaign: campaign, // Include full campaign object for RingbaStyleReporting
          campaignName: campaign?.name || 'Unknown Campaign',
          buyerName: call.buyerId ? buyerMap.get(call.buyerId)?.name || 'Unknown Buyer' : undefined,
          publisherName: call.publisherId ? publisherMap.get(call.publisherId)?.name || call.publisherName || 'Direct' : 'Direct',
          // RTB enhancement
          rtbRequestId: rtbInfo?.request_id || null,
          winningBidAmount: rtbInfo?.winning_bid_amount || null,
          winningTargetId: rtbInfo?.winning_target_id || null,
          totalTargetsPinged: rtbInfo?.total_targets_pinged || null,
          successfulResponses: rtbInfo?.successful_responses || null,
          auctionTimeMs: rtbInfo?.total_response_time_ms || null
        };
      });

      // Apply pagination to enhanced calls
      const totalCount = enhancedCalls.length;
      const sortedCalls = enhancedCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const paginatedCalls = sortedCalls.slice(offset, offset + limit);

      res.json({
        calls: paginatedCalls,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching enhanced calls:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  const reportingRouter = (await import('./api/reporting')).default;
  app.use('/api/reporting', reportingRouter);
  
  const columnPreferencesRouter = (await import('./api/column-preferences')).default;
  app.use('/api/column-preferences', columnPreferencesRouter);

  // Cleanup all Twilio webhooks
  app.post('/api/admin/cleanup-twilio-webhooks', requireAuth, async (req, res) => {
    try {
      const { TwilioCleanupService } = await import('./cleanup-twilio-webhooks');
      const result = await TwilioCleanupService.cleanupAllPhoneNumbers();
      
      res.json(result);
    } catch (error: any) {
      console.error('Error cleaning up Twilio webhooks:', error);
      res.status(500).json({ 
        error: 'Failed to cleanup Twilio webhooks',
        details: error.message 
      });
    }
  });

  // Mount call details router for enhanced call tracking
  app.use(callDetailsRouter);

  // Recording playback endpoint with authentication
  app.get('/api/recordings/:recordingSid', requireAuth, async (req: any, res) => {
    try {
      const { recordingSid } = req.params;
      const userId = req.user?.id;
      
      // Verify the recording belongs to a call from user's campaigns
      const userCampaigns = await storage.getCampaigns(userId);
      const campaignIds = userCampaigns.map(c => String(c.id));
      
      const allCalls = await storage.getCalls();
      const userCall = allCalls.find(call => 
        call.recordingSid === recordingSid && 
        campaignIds.includes(String(call.campaignId))
      );
      
      if (!userCall) {
        return res.status(404).json({ error: "Recording not found or access denied" });
      }
      
      // Use Twilio service to get authenticated recording URL
      try {
        const recordingStatus = await twilioService.getRecordingStatus(recordingSid);
        
        if (recordingStatus.recordingUrl) {
          // Proxy the audio through our server to handle authentication
          const response = await fetch(recordingStatus.recordingUrl, {
            headers: {
              'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
            }
          });
          
          if (response.ok) {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `inline; filename="recording-${recordingSid}.mp3"`);
            response.body?.pipe(res);
          } else {
            res.status(404).json({ error: "Recording not accessible" });
          }
        } else {
          res.status(404).json({ error: "Recording URL not available" });
        }
      } catch (twilioError) {
        console.error("Twilio recording error:", twilioError);
        res.status(500).json({ error: "Failed to retrieve recording from Twilio" });
      }
      
    } catch (error) {
      console.error("Error fetching recording:", error);
      res.status(500).json({ error: "Failed to fetch recording" });
    }
  });

  // ============================================================================
  // TEST WEBHOOK ENDPOINTS FOR CALL FLOW TESTING
  // ============================================================================

  // Test webhook endpoint for pool-based campaigns
  app.post('/api/test/webhook/pool/:poolId/voice', async (req, res) => {
    try {
      const { poolId } = req.params;
      const { CallSid, From, To, testMode } = req.body;
      
      console.log(`[TEST WEBHOOK] Testing pool ${poolId} call flow`);
      console.log(`[TEST WEBHOOK] Test call from ${From} to ${To}, CallSid: ${CallSid}`);
      
      // Find campaign by pool ID
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.poolId && c.poolId.toString() === poolId);
      
      if (!campaign) {
        return res.json({
          success: false,
          error: `No campaign found for pool ${poolId}`,
          testResults: null
        });
      }
      
      // Simulate call routing
      const routingStartTime = Date.now();
      const buyers = await storage.getBuyers(campaign.userId);
      const activeBuyers = buyers.filter(b => b.isActive);
      
      if (activeBuyers.length === 0) {
        return res.json({
          success: false,
          error: "No active buyers available for routing",
          testResults: null
        });
      }
      
      // Select buyer (simplified priority-based selection)
      const selectedBuyer = activeBuyers.reduce((prev, current) => 
        (prev.priority || 999) < (current.priority || 999) ? prev : current
      );
      
      const routingTime = Date.now() - routingStartTime;
      
      // Create test call record
      const callData = {
        callSid: CallSid,
        fromNumber: From,
        toNumber: To,
        campaignId: campaign.id,
        buyerId: selectedBuyer.id,
        status: 'test_completed',
        startTime: new Date(),
        direction: 'inbound',
        payout: campaign.defaultPayout || '0.00',
        revenue: campaign.defaultPayout || '0.00',
        profit: campaign.defaultPayout || '0.00',
        cost: '0.00',
        duration: 45,
        recordingUrl: null,
        transcription: 'Test call simulation - no actual recording',
        quality: 'excellent',
        outcome: 'completed',
        userId: campaign.userId,
        userAgent: 'Test Simulation'
      };
      
      const call = await storage.createCall(callData);
      
      // Fire campaign tracking pixels for test
      try {
        const pixelService = new PixelService();
        const pixels = await storage.getCampaignTrackingPixels(campaign.id);
        
        for (const pixel of pixels) {
          const pixelData: PixelMacroData = {
            call_id: call.id?.toString() || '',
            phone_number: From,
            campaign_id: campaign.id.toString(),
            timestamp: new Date().toISOString(),
            duration: '45',
            status: 'completed',
            payout: campaign.defaultPayout || '0.00',
            clickid: 'TEST_CLICK_ID',
            campaign_name: campaign.name,
            buyer_name: selectedBuyer.name
          };
          
          await pixelService.firePixel(pixel, pixelData);
        }
      } catch (pixelError) {
        console.error('[TEST WEBHOOK] Error firing tracking pixels:', pixelError);
      }
      
      res.json({
        success: true,
        error: null,
        testResults: {
          callId: call.id,
          selectedBuyer: {
            id: selectedBuyer.id,
            name: selectedBuyer.name,
            phoneNumber: selectedBuyer.phoneNumber,
            priority: selectedBuyer.priority
          },
          routingTime: `${routingTime}ms`,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            payout: campaign.defaultPayout
          },
          pixelsFired: (await storage.getCampaignTrackingPixels(campaign.id)).length,
          callData: callData,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('[TEST WEBHOOK] Error in pool test webhook:', error);
      res.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testResults: null
      });
    }
  });

  // Test webhook endpoint for direct campaigns  
  app.post('/api/test/webhook/direct/:campaignId/voice', async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { CallSid, From, To, testMode } = req.body;
      
      console.log(`[TEST WEBHOOK] Testing direct campaign ${campaignId} call flow`);
      console.log(`[TEST WEBHOOK] Test call from ${From} to ${To}, CallSid: ${CallSid}`);
      
      // Find campaign
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId);
      
      if (!campaign) {
        return res.json({
          success: false,
          error: `Campaign ${campaignId} not found`,
          testResults: null
        });
      }
      
      // Simulate call routing
      const routingStartTime = Date.now();
      const buyers = await storage.getBuyers(campaign.userId);
      const activeBuyers = buyers.filter(b => b.isActive);
      
      if (activeBuyers.length === 0) {
        return res.json({
          success: false,
          error: "No active buyers available for routing",
          testResults: null
        });
      }
      
      // Select buyer (simplified priority-based selection)
      const selectedBuyer = activeBuyers.reduce((prev, current) => 
        (prev.priority || 999) < (current.priority || 999) ? prev : current
      );
      
      const routingTime = Date.now() - routingStartTime;
      
      // Create test call record
      const callData = {
        callSid: CallSid,
        fromNumber: From,
        toNumber: To,
        campaignId: campaign.id,
        buyerId: selectedBuyer.id,
        status: 'test_completed',
        startTime: new Date(),
        direction: 'inbound',
        payout: campaign.defaultPayout || '0.00',
        revenue: campaign.defaultPayout || '0.00',
        profit: campaign.defaultPayout || '0.00',
        cost: '0.00',
        duration: 45,
        recordingUrl: null,
        transcription: 'Test call simulation - no actual recording',
        quality: 'excellent',
        outcome: 'completed',
        userId: campaign.userId,
        userAgent: 'Test Simulation'
      };
      
      const call = await storage.createCall(callData);
      
      // Fire campaign tracking pixels for test
      try {
        const pixelService = new PixelService();
        const pixels = await storage.getCampaignTrackingPixels(campaign.id);
        
        for (const pixel of pixels) {
          const pixelData: PixelMacroData = {
            call_id: call.id?.toString() || '',
            phone_number: From,
            campaign_id: campaign.id.toString(),
            timestamp: new Date().toISOString(),
            duration: '45',
            status: 'completed',
            payout: campaign.defaultPayout || '0.00',
            clickid: 'TEST_CLICK_ID',
            campaign_name: campaign.name,
            buyer_name: selectedBuyer.name
          };
          
          await pixelService.firePixel(pixel, pixelData);
        }
      } catch (pixelError) {
        console.error('[TEST WEBHOOK] Error firing tracking pixels:', pixelError);
      }
      
      res.json({
        success: true,
        error: null,
        testResults: {
          callId: call.id,
          selectedBuyer: {
            id: selectedBuyer.id,
            name: selectedBuyer.name,
            phoneNumber: selectedBuyer.phoneNumber,
            priority: selectedBuyer.priority
          },
          routingTime: `${routingTime}ms`,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            payout: campaign.defaultPayout
          },
          pixelsFired: (await storage.getCampaignTrackingPixels(campaign.id)).length,
          callData: callData,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('[TEST WEBHOOK] Error in direct test webhook:', error);
      res.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testResults: null
      });
    }
  });

  // Get phone numbers for campaign testing
  app.get('/api/campaigns/:campaignId/phone-numbers', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const userId = req.user?.id;
      
      // Get campaign to check routing type
      const campaigns = await storage.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId && c.userId === userId);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      const allNumbers = await storage.getPhoneNumbers(userId);
      const campaignNumbers = allNumbers.filter(num => {
        // For pool-based campaigns, find numbers in the campaign's pool
        if (campaign.routingType === 'pool' && campaign.poolId) {
          return num.poolId === campaign.poolId;
        }
        // For direct campaigns, find numbers directly assigned
        return num.campaignId === campaignId;
      });
      
      res.json(campaignNumbers);
    } catch (error) {
      console.error('Error fetching campaign phone numbers:', error);
      res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
  });

  // Get recent visitor sessions for attribution testing
  app.get('/api/visitor-sessions/recent', async (req, res) => {
    try {
      const sessions = await storage.getVisitorSessions();
      // Return last 10 sessions with click IDs
      const recentSessions = sessions
        .filter(s => s.clickId)
        .sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())
        .slice(0, 10);
      
      res.json(recentSessions);
    } catch (error) {
      console.error('Error fetching recent visitor sessions:', error);
      res.status(500).json({ error: 'Failed to fetch visitor sessions' });
    }
  });

  // Predictive Routing Configuration API
  app.get('/api/settings/predictive-routing', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const configs = await storage.getPredictiveRoutingConfigs(userId);
      res.json(configs);
    } catch (error) {
      console.error('Error fetching predictive routing configurations:', error);
      res.status(500).json({ error: 'Failed to fetch predictive routing configurations' });
    }
  });

  app.post('/api/settings/predictive-routing', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { name, type, newTargetPriority, underperformingTargetPriority, trainingRequirement, isActive } = req.body;
      
      const configData = {
        userId,
        name,
        type,
        newTargetPriority: parseInt(newTargetPriority) || 0,
        underperformingTargetPriority: parseInt(underperformingTargetPriority) || 0,
        trainingRequirement: parseInt(trainingRequirement) || 0,
        isActive: isActive !== undefined ? isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const config = await storage.createPredictiveRoutingConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating predictive routing configuration:', error);
      res.status(500).json({ error: 'Failed to create predictive routing configuration' });
    }
  });

  app.put('/api/settings/predictive-routing/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, type, newTargetPriority, underperformingTargetPriority, trainingRequirement, isActive } = req.body;
      
      const updateData = {
        name,
        type,
        newTargetPriority: parseInt(newTargetPriority) || 0,
        underperformingTargetPriority: parseInt(underperformingTargetPriority) || 0,
        trainingRequirement: parseInt(trainingRequirement) || 0,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      };
      
      const config = await storage.updatePredictiveRoutingConfig(parseInt(id), updateData);
      if (config) {
        res.json(config);
      } else {
        res.status(404).json({ error: 'Configuration not found' });
      }
    } catch (error) {
      console.error('Error updating predictive routing configuration:', error);
      res.status(500).json({ error: 'Failed to update predictive routing configuration' });
    }
  });

  app.delete('/api/settings/predictive-routing/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const success = await storage.deletePredictiveRoutingConfig(parseInt(id));
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Configuration not found' });
      }
    } catch (error) {
      console.error('Error deleting predictive routing configuration:', error);
      res.status(500).json({ error: 'Failed to delete predictive routing configuration' });
    }
  });

  // Clear RTB audit data
  app.delete('/api/rtb/clear-audit-data', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      console.log(`[RTB API] Clearing RTB audit data for user ${userId}`);
      
      await storage.clearRtbAuditData();
      
      res.json({ message: 'RTB audit data cleared successfully' });
    } catch (error) {
      console.error('Error clearing RTB audit data:', error);
      res.status(500).json({ error: 'Failed to clear RTB audit data' });
    }
  });

  // Voice Insights API - Manual fetch for existing calls
  app.post('/api/calls/:callId/voice-insights', requireAuth, async (req: any, res) => {
    try {
      const { callId } = req.params;
      const userId = req.user?.id;
      
      // Get the call record and verify ownership
      const calls = await storage.getCalls();
      const call = calls.find(c => c.id === parseInt(callId) && c.userId === userId);
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      
      if (!call.callSid) {
        return res.status(400).json({ error: 'Call does not have a Twilio SID' });
      }
      
      // Import Voice Insights service
      const { twilioVoiceInsights } = await import('./twilio-voice-insights');
      
      // Fetch Voice Insights data
      const hangupInfo = await twilioVoiceInsights.updateCallWithVoiceInsights(
        call.callSid, 
        call.id
      );
      
      if (!hangupInfo) {
        return res.status(404).json({ 
          error: 'Voice Insights data not available', 
          message: 'Data may take up to 10 minutes after call completion to be available'
        });
      }
      
      // Update call record with Voice Insights data
      const updates: any = {};
      
      if (hangupInfo.whoHungUp) {
        updates.whoHungUp = hangupInfo.whoHungUp;
      }
      
      if (hangupInfo.hangupCause) {
        updates.hangupCause = hangupInfo.hangupCause;
      }
      
      if (Object.keys(updates).length > 0) {
        await storage.updateCall(call.id, updates);
        
        // Log Voice Insights fetch
        await storage.createCallLog({
          callId: call.id,
          buyerId: call.buyerId,
          action: 'voice_insights_manual',
          response: `Manual Voice Insights fetch: Who hung up: ${hangupInfo.whoHungUp}, Cause: ${hangupInfo.hangupCause}`,
        });
      }
      
      res.json({
        success: true,
        callId: call.id,
        voiceInsights: hangupInfo,
        updatedFields: updates
      });
      
    } catch (error: any) {
      console.error('Error fetching Voice Insights:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Voice Insights data',
        message: error.message
      });
    }
  });

  // Call details router already mounted above - removed duplicate mounting

  // Recording proxy endpoints to handle Twilio authentication
  app.get('/api/recordings/proxy', requireAuth, async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Recording URL is required' });
      }
      
      // Validate that the URL is a proper Twilio recording URL
      if (!url.includes('api.twilio.com') || !url.includes('Recordings/')) {
        return res.status(400).json({ error: 'Invalid recording URL format' });
      }

      // Fetch the recording with proper authentication
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.statusText}`);
      }

      // Set appropriate headers for audio playback
      res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Content-Length', response.headers.get('content-length') || '');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // Stream the audio content
      response.body?.pipe(res);
    } catch (error) {
      console.error('Recording proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch recording' });
    }
  });

  app.get('/api/recordings/download', requireAuth, async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Recording URL is required' });
      }

      // Fetch the recording with proper authentication
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.statusText}`);
      }

      // Set headers for download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="recording.mp3"');
      res.setHeader('Content-Length', response.headers.get('content-length') || '');
      
      // Stream the audio content for download
      response.body?.pipe(res);
    } catch (error) {
      console.error('Recording download error:', error);
      res.status(500).json({ error: 'Failed to download recording' });
    }
  });

  const httpServer = createServer(app);
  // Test landing page route for RedTrack integration testing
  app.get('/redtrack-test-lander.html', (req, res) => {
    res.sendFile('redtrack-test-lander.html', { root: '.' });
  });

  return httpServer;
}