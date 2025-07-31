import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, json, index, primaryKey, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").notNull(),
  password: text("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // General Info
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  category: varchar("category", { length: 100 }), // Insurance, Solar, Education, etc.
  
  // Phone & Routing - Mutually Exclusive
  routingType: varchar("routing_type", { length: 20 }).default("direct").notNull(), // 'direct' or 'pool'
  phoneNumber: varchar("phone_number", { length: 20 }), // Used when routingType = 'direct'
  poolId: integer("pool_id").references(() => numberPools.id), // Used when routingType = 'pool'
  callRoutingStrategy: varchar("call_routing_strategy", { length: 50 }).default("priority").notNull(), // priority, round_robin, geo, time_based, weighted
  targetRoutingStrategy: varchar("target_routing_strategy", { length: 50 }).default("priority").notNull(), // priority, round_robin, least_busy, capacity_based
  maxConcurrentCalls: integer("max_concurrent_calls").default(5).notNull(),
  callCap: integer("call_cap").default(100).notNull(), // daily call cap
  
  // Geographic & Time Settings
  geoTargeting: text("geo_targeting").array(), // allowed states/countries
  timeZoneRestriction: varchar("timezone_restriction", { length: 100 }),
  operatingHours: json("operating_hours"), // {start: "09:00", end: "17:00", timezone: "EST", days: ["mon", "tue"]}
  
  // Spam & Quality Control
  spamFilterEnabled: boolean("spam_filter_enabled").default(true),
  duplicateCallWindow: integer("duplicate_call_window").default(24), // hours
  minCallDuration: integer("min_call_duration").default(30), // seconds
  maxCallDuration: integer("max_call_duration").default(1800), // seconds
  blockAnonymousCalls: boolean("block_anonymous_calls").default(false),
  allowInternational: boolean("allow_international").default(false),
  
  // Payout & Revenue
  defaultPayout: decimal("default_payout", { precision: 10, scale: 2 }).default("0.00"),
  payoutModel: varchar("payout_model", { length: 50 }).default("per_call"), // per_call, per_minute, per_conversion, revenue_share, profit_share
  revenueModel: varchar("revenue_model", { length: 50 }).default("per_call"),
  
  // Tracking & Analytics
  enableCallRecording: boolean("enable_call_recording").default(true),
  enableCallTranscription: boolean("enable_call_transcription").default(false),
  enableRealTimeBidding: boolean("enable_real_time_bidding").default(false),
  conversionTracking: boolean("conversion_tracking").default(false),
  
  // Advanced Settings
  customHeaders: json("custom_headers"), // for webhook requests
  integrationSettings: json("integration_settings"), // platform-specific configs
  urlParameters: json("url_parameters"), // tracking parameters
  
  // RTB Integration - Direct Target Assignment
  enableRtb: boolean("enable_rtb").default(false).notNull(),
  rtbId: varchar("rtb_id", { length: 32 }).unique(), // 32-character hexadecimal ID for external RTB operations
  
  // RTB Configuration (moved from routers)
  biddingTimeoutMs: integer("bidding_timeout_ms").default(3000),
  minBiddersRequired: integer("min_bidders_required").default(1),
  enablePredictiveRouting: boolean("enable_predictive_routing").default(false),
  revenueType: varchar("revenue_type", { length: 50 }).default("per_call"), // per_call, per_minute, cpa, cpl
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Buyers table - Complete Ringba-style buyer form fields
export const buyers = pgTable("buyers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Basic Information (Required)
  name: varchar("name", { length: 100 }).notNull(), // Buyer Name
  companyName: varchar("company_name", { length: 255 }), // Company Name
  email: varchar("email", { length: 255 }), // Contact Email
  phoneNumber: varchar("phone_number", { length: 20 }), // Contact Phone
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, paused, inactive
  description: text("description"), // Company Description
  
  // Account Settings
  buyerType: varchar("buyer_type", { length: 50 }).default("standard"), // standard, rtb_enabled, premium
  timeZone: varchar("time_zone", { length: 100 }).default("America/New_York"),
  
  // Permissions & Access Control
  allowPauseTargets: boolean("allow_pause_targets").default(false),
  allowSetTargetCaps: boolean("allow_set_target_caps").default(false),
  allowDisputeConversions: boolean("allow_dispute_conversions").default(false),
  
  // Call Routing Settings
  hoursOfOperation: json("hours_of_operation"), // {monday: {start: "09:00", end: "17:00"}, ...}
  geographicRestrictions: text("geographic_restrictions").array(), // ["US", "CA", "UK"]
  concurrencyLimit: integer("concurrency_limit").default(1),
  dailyCallCap: integer("daily_call_cap").default(100),
  monthlyCallCap: integer("monthly_call_cap").default(3000),
  
  // Revenue & Billing
  enableRevenueRecovery: boolean("enable_revenue_recovery").default(false),
  connectionThresholdToReroute: integer("connection_threshold_to_reroute").default(30), // seconds
  rerouteAttempts: integer("reroute_attempts").default(3),
  estimatedRevenuePerCall: decimal("estimated_revenue_per_call", { precision: 10, scale: 2 }).default("0.00"),
  
  // Priority for call routing
  priority: integer("priority").default(1).notNull(),
  
  // Duplicate Call Management
  restrictDuplicates: boolean("restrict_duplicates").default(true),
  duplicateTimeWindow: integer("duplicate_time_window").default(3600), // seconds (1 hour)
  
  // Advanced Features
  enablePredictiveRouting: boolean("enable_predictive_routing").default(false),
  enableRtbIntegration: boolean("enable_rtb_integration").default(false),
  shareableTags: text("shareable_tags").array(), // Data sharing configuration
  tcpaCompliant: boolean("tcpa_compliant").default(true),
  
  // API Integration
  webhookUrl: varchar("webhook_url", { length: 512 }),
  apiCredentials: json("api_credentials"), // {api_key: "", secret: ""}
  rtbId: varchar("rtb_id", { length: 100 }),
  sipSettings: json("sip_settings"), // VoIP configuration
  
  // Performance Metrics (calculated fields)
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }).default("0.00"), // percentage
  avgResponseTime: integer("avg_response_time").default(0), // milliseconds
  totalCallsReceived: integer("total_calls_received").default(0),
  totalCallsCompleted: integer("total_calls_completed").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Targets table - individual endpoints/destinations under buyers
export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  buyerId: integer("buyer_id").references(() => buyers.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  endpoint: varchar("endpoint", { length: 500 }), // Webhook URL for ping/post
  priority: integer("priority").default(1),
  dailyCap: integer("daily_cap").default(0), // 0 = unlimited
  concurrencyLimit: integer("concurrency_limit").default(1),
  acceptanceRate: varchar("acceptance_rate", { length: 10 }), // Stored as percentage string like "75.50"
  avgResponseTime: integer("avg_response_time"), // in milliseconds
  
  // Timezone and Hours of Operation - Ringba form fields
  timeZone: varchar("time_zone", { length: 100 }).default("EST"),
  hoursOfOperation: varchar("hours_of_operation", { length: 50 }).default("Always Open"),
  
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaign-Target relationships (renamed from campaign_buyers)
export const campaignTargets = pgTable("campaign_targets", {
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  targetId: integer("target_id").references(() => targets.id).notNull(),
  priority: integer("priority").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.campaignId, table.targetId] })
}));

// Keep legacy campaign_buyers for backwards compatibility temporarily
export const campaignBuyers = pgTable("campaign_buyers", {
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  buyerId: integer("buyer_id").references(() => buyers.id).notNull(),
  priority: integer("priority").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.campaignId, table.buyerId] })
}));

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  buyerId: integer("buyer_id").references(() => buyers.id), // Top-level buyer
  targetId: integer("target_id").references(() => targets.id), // Specific target/destination
  publisherId: integer("publisher_id").references(() => publishers.id), // Publisher/affiliate who generated the call
  publisherName: varchar("publisher_name", { length: 255 }), // Publisher name from DNI tracking
  trackingTagId: integer("tracking_tag_id").references(() => callTrackingTags.id), // Tracking tag that generated this call
  callSid: varchar("call_sid", { length: 100 }),
  fromNumber: varchar("from_number", { length: 20 }).notNull(),
  toNumber: varchar("to_number", { length: 20 }).notNull(),
  
  // Call Flow Tracking
  flowExecutionId: varchar("flow_execution_id", { length: 100 }), // UUID for tracking flow execution
  ringTreeId: varchar("ring_tree_id", { length: 100 }), // Ring tree identifier
  currentNodeId: varchar("current_node_id", { length: 100 }), // Current IVR node
  flowPath: json("flow_path").array(), // Array of nodes traversed
  routingAttempts: integer("routing_attempts").default(0), // Number of routing attempts
  dialedNumber: varchar("dialed_number", { length: 20 }), // The number that was actually dialed (from pool)
  numberPoolId: integer("number_pool_id").references(() => numberPools.id), // Pool used for this call
  phoneNumberId: integer("phone_number_id").references(() => phoneNumbers.id), // Specific number from pool
  
  // Call Details & Timing
  duration: integer("duration").default(0).notNull(),
  ringTime: integer("ring_time").default(0), // seconds before answered
  talkTime: integer("talk_time").default(0), // actual conversation time
  holdTime: integer("hold_time").default(0), // time on hold
  status: varchar("status", { length: 50 }).notNull(), // ringing, in_progress, completed, failed, busy, no_answer
  disposition: varchar("disposition", { length: 50 }), // connected, no_answer, busy, failed, voicemail
  hangupCause: varchar("hangup_cause", { length: 50 }), // caller_hangup, callee_hangup, timeout, error
  
  // Quality & Performance
  callQuality: varchar("call_quality", { length: 20 }), // excellent, good, fair, poor
  connectionTime: integer("connection_time"), // milliseconds to connect
  audioQuality: varchar("audio_quality", { length: 20 }), // excellent, good, poor
  isDuplicate: boolean("is_duplicate").default(false), // duplicate call detection
  duplicateOfCallId: integer("duplicate_of_call_id"),
  
  // Financial Tracking
  cost: decimal("cost", { precision: 10, scale: 4 }).default("0.0000"), // Actual cost (Twilio charges)
  payout: decimal("payout", { precision: 10, scale: 4 }).default("0.0000"), // Amount paid to publisher
  revenue: decimal("revenue", { precision: 10, scale: 4 }).default("0.0000"), // Revenue from buyer
  profit: decimal("profit", { precision: 10, scale: 4 }).default("0.0000"), // revenue - payout - cost
  margin: decimal("margin", { precision: 5, scale: 2 }).default("0.00"), // profit margin percentage
  
  // Attribution & Tracking
  tags: text("tags").array(), // Tags from the phone number used
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  referrer: text("referrer"),
  landingPage: text("landing_page"),
  
  // Geographic & Technical
  geoLocation: varchar("geo_location", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  country: varchar("country", { length: 10 }),
  zipCode: varchar("zip_code", { length: 20 }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  deviceType: varchar("device_type", { length: 50 }), // mobile, desktop, tablet
  
  // Hierarchical sub-tags for advanced filtering (RedTrack-style)
  sub1: varchar("sub1", { length: 255 }), // Product/service type
  sub2: varchar("sub2", { length: 255 }), // Geographic region
  sub3: varchar("sub3", { length: 255 }), // Device type 
  sub4: varchar("sub4", { length: 255 }), // Time of day
  sub5: varchar("sub5", { length: 255 }), // Lead quality/score
  clickId: varchar("click_id", { length: 255 }), // Platform-specific click ID
  userAgentParsed: json("user_agent_parsed"), // Parsed user agent data
  sessionId: varchar("session_id", { length: 255 }), // Session tracking ID
  adAccountId: varchar("ad_account_id", { length: 255 }), // Ad account identifier
  keyword: varchar("keyword", { length: 255 }), // Search keyword
  placement: varchar("placement", { length: 255 }), // Ad placement
  adGroup: varchar("ad_group", { length: 255 }), // Ad group name
  creativeId: varchar("creative_id", { length: 255 }), // Creative/ad ID
  
  // Recording & Transcription
  recordingUrl: varchar("recording_url", { length: 512 }),
  recordingSid: varchar("recording_sid", { length: 100 }),
  recordingStatus: varchar("recording_status", { length: 50 }), // processing, completed, failed
  recordingDuration: integer("recording_duration"), // in seconds
  transcription: text("transcription"),
  transcriptionStatus: varchar("transcription_status", { length: 50 }), // pending, completed, failed
  transcriptionConfidence: decimal("transcription_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  
  // Conversion & Revenue Tracking
  isConverted: boolean("is_converted").default(false),
  conversionType: varchar("conversion_type", { length: 50 }), // sale, lead, appointment, quote
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }),
  conversionTimestamp: timestamp("conversion_timestamp"),
  
  // System Fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  callId: integer("call_id").references(() => calls.id).notNull(),
  buyerId: integer("buyer_id").references(() => buyers.id),
  action: varchar("action", { length: 50 }).notNull(), // ping, post, accept, reject, timeout
  response: text("response"),
  responseTime: integer("response_time"), // in milliseconds
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Call Events for IVR flow tracking
export const callEvents = pgTable("call_events", {
  id: serial("id").primaryKey(),
  callId: integer("call_id").references(() => calls.id).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // node_enter, node_exit, ivr_input, routing_decision
  nodeId: varchar("node_id", { length: 100 }), // IVR node identifier
  nodeName: varchar("node_name", { length: 255 }), // Human-readable node name
  nodeType: varchar("node_type", { length: 50 }), // dial, gather, play, hangup, goto
  stepName: varchar("step_name", { length: 255 }), // Step description
  userInput: varchar("user_input", { length: 100 }), // DTMF input or speech
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  duration: integer("duration"), // time spent in this node (milliseconds)
  metadata: json("metadata"), // Additional event data
});

// Predictive Routing Configurations table
export const predictiveRoutingConfigs = pgTable("predictive_routing_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'basic', 'use_revenue', 'advanced'
  newTargetPriority: integer("new_target_priority").default(0).notNull(), // -10 to 10 scale
  underperformingTargetPriority: integer("underperforming_target_priority").default(0).notNull(), // -10 to 10 scale
  trainingRequirement: integer("training_requirement").default(0).notNull(), // -10 to 10 scale
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Phase 3: Routing Decisions table for comprehensive routing analytics
export const routingDecisions = pgTable("routing_decisions", {
  id: serial("id").primaryKey(),
  callId: integer("call_id").references(() => calls.id).notNull(),
  sequenceNumber: integer("sequence_number").notNull(), // Order of routing attempts
  targetType: varchar("target_type", { length: 20 }).notNull(), // 'buyer', 'rtb', 'voicemail', 'fallback'
  targetId: integer("target_id"), // Reference to buyer or RTB target
  targetName: varchar("target_name", { length: 100 }),
  priority: integer("priority"),
  weight: integer("weight"),
  reason: text("reason"), // Why this target was selected/rejected
  outcome: varchar("outcome", { length: 20 }).notNull(), // 'selected', 'attempted', 'failed', 'rejected', 'timeout'
  responseTime: integer("response_time"), // Response time in milliseconds
  bidAmount: varchar("bid_amount", { length: 20 }), // For RTB targets
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata"), // Additional routing metadata
});

// Phase 3: RTB Auction Details table for comprehensive auction tracking
export const rtbAuctionDetails = pgTable("rtb_auction_details", {
  id: serial("id").primaryKey(),
  callId: integer("call_id").references(() => calls.id).notNull(),
  auctionId: varchar("auction_id", { length: 100 }).notNull(), // Unique auction identifier
  targetId: integer("target_id").notNull(),
  targetName: varchar("target_name", { length: 100 }).notNull(),
  bidAmount: varchar("bid_amount", { length: 20 }).notNull(),
  bidStatus: varchar("bid_status", { length: 20 }).notNull(), // 'bid_received', 'won', 'failed'
  responseTime: integer("response_time").notNull(), // Response time in milliseconds
  destinationNumber: varchar("destination_number", { length: 20 }),
  isWinner: boolean("is_winner").default(false).notNull(),
  rejectionReason: text("rejection_reason"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata"), // Additional auction metadata
});



// Enhanced agents table for full call center functionality
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  extensionNumber: varchar("extension_number", { length: 10 }),
  status: varchar("status", { length: 50 }).default("offline").notNull(), // offline, available, busy, break, training
  currentCallId: integer("current_call_id").references(() => calls.id),
  skills: text("skills").array(), // Skills for routing: sales, support, technical, billing
  maxConcurrentCalls: integer("max_concurrent_calls").default(1).notNull(),
  priority: integer("priority").default(1).notNull(), // 1=highest, 10=lowest
  department: varchar("department", { length: 100 }),
  supervisorId: integer("supervisor_id"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  workSchedule: text("work_schedule"), // JSON: working hours and days
  
  // Performance metrics
  callsHandled: integer("calls_handled").default(0).notNull(),
  totalTalkTime: integer("total_talk_time").default(0).notNull(), // seconds
  averageCallDuration: integer("average_call_duration").default(0).notNull(), // seconds
  totalBreakTime: integer("total_break_time").default(0).notNull(), // seconds
  conversationRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"), // percentage
  customerSatisfaction: decimal("customer_satisfaction", { precision: 3, scale: 2 }).default("0.00"), // 1-5 rating
  
  // System tracking
  lastActivityAt: timestamp("last_activity_at"),
  lastCallAt: timestamp("last_call_at"),
  loginTime: timestamp("login_time"),
  isOnline: boolean("is_online").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agent-Campaign assignments for skill-based routing
export const agentCampaigns = pgTable("agent_campaigns", {
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  priority: integer("priority").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.campaignId] })
}));

// Agent status tracking for real-time monitoring
export const agentStatusLogs = pgTable("agent_status_logs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  reason: varchar("reason", { length: 200 }), // break_lunch, break_meeting, system_update, etc.
  duration: integer("duration"), // seconds in previous status
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Agent call assignments for tracking active calls
export const agentCalls = pgTable("agent_calls", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  callId: integer("call_id").references(() => calls.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  answeredAt: timestamp("answered_at"),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 50 }).default("assigned").notNull(), // assigned, answered, completed, missed
  notes: text("notes"),
  rating: integer("rating"), // 1-5 customer satisfaction rating
  disposition: varchar("disposition", { length: 100 }), // sale, no_sale, callback, busy, etc.
});

// URL Parameters table for custom parameter tracking configuration
export const urlParameters = pgTable("url_parameters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  parameterName: varchar("parameter_name", { length: 100 }).notNull(), // URL parameter key (e.g., 'clickid')
  reportingMenuName: varchar("reporting_menu_name", { length: 100 }).notNull(), // Display name in reports (e.g., 'User')
  reportName: varchar("report_name", { length: 100 }).notNull(), // Column name in reports (e.g., 'clickid')
  parameterType: varchar("parameter_type", { length: 50 }).default("string").notNull(), // string, integer, decimal
  isRequired: boolean("is_required").default(false),
  defaultValue: varchar("default_value", { length: 255 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trackingPixels = pgTable("tracking_pixels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  pixelType: varchar("pixel_type", { length: 50 }).notNull(), // 'postback', 'image', 'javascript'
  fireOnEvent: varchar("fire_on_event", { length: 50 }).notNull(), // 'incoming', 'connected', 'completed', 'converted', 'error', 'payout', 'recording', 'finalized'
  code: text("code").notNull(), // contains macros like {call_id}, {phone_number}, {timestamp}
  httpMethod: varchar("http_method", { length: 10 }).default("POST").notNull(), // 'GET', 'POST', 'PUT', 'PATCH'
  headers: text("headers").default("[]"), // JSON string of key-value pairs
  authenticationType: varchar("authentication_type", { length: 50 }).default("none"), // 'none', 'basic', 'bearer', 'api_key'
  assignedCampaigns: text("assigned_campaigns").array(), // array of campaign IDs
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookConfigs = pgTable("webhook_configs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  url: varchar("url", { length: 512 }).notNull(),
  events: text("events").array().notNull(), // call.started, call.answered, call.completed, etc.
  headers: text("headers"), // JSON string of headers
  secret: varchar("secret", { length: 256 }), // webhook signature secret
  retryCount: integer("retry_count").default(3).notNull(),
  timeout: integer("timeout").default(30).notNull(), // seconds
  isActive: boolean("is_active").default(true).notNull(),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Call Tracking Tags - DNI system for dynamic number insertion
export const callTrackingTags = pgTable("call_tracking_tags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  
  // Tag Configuration
  name: varchar("name", { length: 256 }).notNull(), // Tag Name
  tagCode: varchar("tag_code", { length: 100 }).notNull().unique(), // Unique identifier for JS
  primaryNumberId: integer("primary_number_id").references(() => phoneNumbers.id), // Primary Publisher Number
  numberToReplace: varchar("number_to_replace", { length: 20 }), // Number to Replace
  
  // Pool Configuration
  poolId: integer("pool_id").references(() => numberPools.id), // Assigned pool for rotation
  rotationStrategy: varchar("rotation_strategy", { length: 50 }).default("round_robin").notNull(), // round_robin, sticky, random, priority
  
  // Publisher Assignment
  publisherId: integer("publisher_id").references(() => publishers.id), // Assigned publisher (nullable for historical preservation)
  
  // User Data Collection
  captureUserData: boolean("capture_user_data").default(false).notNull(),
  trackingFields: json("tracking_fields"), // {ip: true, userAgent: true, referrer: true, utm: true}
  
  // Session Management
  sessionTimeout: integer("session_timeout").default(1800).notNull(), // 30 minutes in seconds
  stickyDuration: integer("sticky_duration").default(86400).notNull(), // 24 hours for sticky routing
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// DNI Sessions - Track visitor sessions and number assignments
export const dniSessions = pgTable("dni_sessions", {
  id: serial("id").primaryKey(),
  tagId: integer("tag_id").references(() => callTrackingTags.id).notNull(),
  sessionId: varchar("session_id", { length: 128 }).notNull(), // Browser session ID
  visitorId: varchar("visitor_id", { length: 128 }), // Persistent visitor ID
  
  // Assigned Number
  assignedNumberId: integer("assigned_number_id").references(() => phoneNumbers.id).notNull(),
  
  // Session Data
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  
  // Tracking
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  pageViews: integer("page_views").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// DNI JavaScript Snippets - Generated tracking codes
export const dniSnippets = pgTable("dni_snippets", {
  id: serial("id").primaryKey(),
  tagId: integer("tag_id").references(() => callTrackingTags.id).notNull(),
  
  // Code Generation
  jsCode: text("js_code").notNull(), // Generated JavaScript code
  htmlSnippet: text("html_snippet"), // HTML integration snippet
  version: varchar("version", { length: 10 }).default("1.0").notNull(),
  
  // Configuration
  domains: text("domains").array(), // Allowed domains
  selectors: text("selectors").array(), // CSS selectors to replace numbers
  customConfig: json("custom_config"), // Additional configuration
  
  // Analytics
  impressions: integer("impressions").default(0).notNull(),
  conversions: integer("conversions").default(0).notNull(),
  lastUsed: timestamp("last_used"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  webhookConfigId: integer("webhook_config_id").references(() => webhookConfigs.id).notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  payload: text("payload"), // JSON payload sent
  response: text("response"), // Response received
  statusCode: integer("status_code"),
  attempt: integer("attempt").default(1).notNull(),
  success: boolean("success").notNull(),
  error: text("error"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const apiAuthentications = pgTable("api_authentications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // api_key, oauth, basic_auth
  service: varchar("service", { length: 100 }).notNull(), // twilio, salesforce, hubspot, etc.
  apiKey: varchar("api_key", { length: 512 }),
  secretKey: varchar("secret_key", { length: 512 }),
  accessToken: varchar("access_token", { length: 512 }),
  refreshToken: varchar("refresh_token", { length: 512 }),
  tokenExpiry: timestamp("token_expiry"),
  config: text("config"), // JSON config for service-specific settings
  isActive: boolean("is_active").default(true).notNull(),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const platformIntegrations = pgTable("platform_integrations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  platform: varchar("platform", { length: 100 }).notNull(), // salesforce, hubspot, zapier, etc.
  type: varchar("type", { length: 50 }).notNull(), // crm, marketing, automation
  status: varchar("status", { length: 50 }).default("disconnected").notNull(), // connected, disconnected, error
  authId: integer("auth_id").references(() => apiAuthentications.id),
  config: text("config"), // JSON configuration
  syncEnabled: boolean("sync_enabled").default(false).notNull(),
  lastSync: timestamp("last_sync"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const phoneNumbers = pgTable("phone_numbers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  friendlyName: varchar("friendly_name", { length: 64 }),
  phoneNumberSid: varchar("phone_number_sid", { length: 100 }).notNull(),
  accountSid: varchar("account_sid", { length: 100 }).notNull(),
  country: varchar("country", { length: 10 }).default("US").notNull(),
  numberType: varchar("number_type", { length: 20 }).notNull(), // local, toll-free, mobile
  capabilities: text("capabilities"), // JSON object with voice, sms, mms capabilities
  voiceUrl: varchar("voice_url", { length: 512 }),
  voiceMethod: varchar("voice_method", { length: 10 }).default("POST"),
  statusCallback: varchar("status_callback", { length: 512 }),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  isActive: boolean("is_active").default(true).notNull(),
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 4 }).default("1.0000"),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Number Pools - Core pool system like Ringba
export const numberPools = pgTable("number_pools", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  country: varchar("country", { length: 10 }).default("US").notNull(),
  numberType: varchar("number_type", { length: 20 }).default("local").notNull(), // local, toll-free
  poolSize: integer("pool_size").notNull(),
  closedBrowserDelay: integer("closed_browser_delay").default(30).notNull(), // seconds
  idleLimit: integer("idle_limit").default(300).notNull(), // seconds
  prefix: varchar("prefix", { length: 10 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Number Pool Assignments - Link numbers to pools
export const numberPoolAssignments = pgTable("number_pool_assignments", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").references(() => numberPools.id).notNull(),
  phoneNumberId: integer("phone_number_id").references(() => phoneNumbers.id).notNull(),
  priority: integer("priority").default(1).notNull(), // order within pool
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  // Ensure each phone number is only in one pool at a time
  index("unique_phone_pool").on(table.phoneNumberId, table.poolId),
]);

// Campaign Pool Assignments - Link pools to campaigns
export const campaignPoolAssignments = pgTable("campaign_pool_assignments", {
  id: serial("id").primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  poolId: integer("pool_id").references(() => numberPools.id).notNull(),
  priority: integer("priority").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Phone Number Tags - Ringba-style tagging for pool numbers
export const phoneNumberTags = pgTable("phone_number_tags", {
  id: serial("id").primaryKey(),
  phoneNumberId: integer("phone_number_id").references(() => phoneNumbers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Tag Information
  tagName: varchar("tag_name", { length: 100 }).notNull(), // e.g., "google-ads", "facebook", "affiliate-123"
  tagCategory: varchar("tag_category", { length: 50 }), // traffic-source, publisher, campaign-type, geographic, quality
  tagValue: varchar("tag_value", { length: 255 }), // Additional value for the tag
  
  // Attribution Settings
  priority: integer("priority").default(1), // Priority for this tag in attribution
  isActive: boolean("is_active").default(true).notNull(),
  
  // Performance Tracking
  callCount: integer("call_count").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Ensure unique tag per phone number
  index("unique_phone_tag").on(table.phoneNumberId, table.tagName),
]);

// Publishers - For affiliate/traffic source management
export const publishers = pgTable("publishers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  company: varchar("company", { length: 256 }),
  
  // Publisher Type & Classification
  publisherType: varchar("publisher_type", { length: 50 }).default("affiliate"), // affiliate, network, direct, internal
  trafficSource: varchar("traffic_source", { length: 100 }), // google-ads, facebook, bing, organic, email
  quality: varchar("quality", { length: 20 }).default("standard"), // premium, standard, test, blocked
  
  // Financial Settings
  defaultPayout: decimal("default_payout", { precision: 10, scale: 2 }).default("0.00"),
  payoutModel: varchar("payout_model", { length: 50 }).default("per_call"), // per_call, per_minute, cpa, cpl, revenue_share
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // Performance Tracking
  callsGenerated: integer("calls_generated").default(0),
  conversions: integer("conversions").default(0),
  totalPayout: decimal("total_payout", { precision: 10, scale: 2 }).default("0.00"),
  avgCallDuration: integer("avg_call_duration").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),
  
  // Contact & Integration
  postbackUrl: varchar("postback_url", { length: 512 }), // For conversion tracking
  webhookUrl: varchar("webhook_url", { length: 512 }), // For real-time notifications
  apiKey: varchar("api_key", { length: 100 }), // For API access
  
  // Status & Controls
  status: varchar("status", { length: 20 }).default("active"), // active, paused, blocked, pending
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campaign Publisher Assignments - Link publishers to campaigns with specific payouts
export const campaignPublishers = pgTable("campaign_publishers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  publisherId: integer("publisher_id").references(() => publishers.id).notNull(),
  
  // Payout Configuration
  payout: decimal("payout", { precision: 10, scale: 2 }).notNull(),
  payoutModel: varchar("payout_model", { length: 50 }).default("per_call"),
  
  // Caps & Limits
  dailyCap: integer("daily_cap").default(100),
  monthlyCap: integer("monthly_cap").default(3000),
  
  // Performance Requirements
  minCallDuration: integer("min_call_duration").default(30), // seconds
  maxDuplicateRate: decimal("max_duplicate_rate", { precision: 5, scale: 2 }).default("10.00"), // percentage
  
  // Status & Tracking
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.campaignId, table.publisherId] })
}));

// User Column Preferences for Call Activity customization
export const userColumnPreferences = pgTable("user_column_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tableType: varchar("table_type", { length: 50 }).default("call_activity").notNull(), // call_activity, enhanced_reporting, etc.
  visibleColumns: text("visible_columns").array().notNull(), // Array of column IDs that are visible
  columnOrder: text("column_order").array(), // Custom column ordering
  columnWidths: json("column_widths"), // Column width preferences as JSON object
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Ensure one preference row per user per table type
  unique: primaryKey({ columns: [table.userId, table.tableType] })
}));

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuyerSchema = createInsertSchema(buyers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalCallsReceived: true,
  totalCallsCompleted: true,
}).extend({
  userId: z.number().optional(),
  // Basic Information
  name: z.string().optional(), // Sub ID field
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  status: z.enum(["active", "paused", "inactive"]).optional(),
  description: z.string().optional(),
  
  // Account Settings
  buyerType: z.enum(["standard", "rtb_enabled", "premium"]).optional(),
  timeZone: z.string().optional(),
  
  // Permissions
  allowPauseTargets: z.boolean().optional(),
  allowSetTargetCaps: z.boolean().optional(),
  allowDisputeConversions: z.boolean().optional(),
  
  // Call Routing Settings
  hoursOfOperation: z.any().optional(), // JSON object
  geographicRestrictions: z.array(z.string()).optional(),
  concurrencyLimit: z.number().min(1).max(50).optional(),
  dailyCallCap: z.number().min(1).max(10000).optional(),
  monthlyCallCap: z.number().min(1).max(100000).optional(),
  
  // Revenue & Billing
  enableRevenueRecovery: z.boolean().optional(),
  connectionThresholdToReroute: z.number().min(5).max(300).optional(),
  rerouteAttempts: z.number().min(1).max(10).optional(),
  estimatedRevenuePerCall: z.number().min(0).optional(),
  
  // Duplicate Call Management
  restrictDuplicates: z.boolean().optional(),
  duplicateTimeWindow: z.number().min(60).max(86400).optional(), // 1 minute to 24 hours
  
  // Advanced Features
  enablePredictiveRouting: z.boolean().optional(),
  enableRtbIntegration: z.boolean().optional(),
  shareableTags: z.array(z.string()).optional(),
  tcpaCompliant: z.boolean().optional(),
  
  // API Integration
  webhookUrl: z.string().url().optional().or(z.literal("")),
  apiCredentials: z.any().optional(), // JSON object
  rtbId: z.string().optional(),
  sipSettings: z.any().optional(), // JSON object
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().min(1, "User ID is required"),
  buyerId: z.number().min(1, "Buyer ID is required"),
  name: z.string().min(1, "Target name is required"),
  phoneNumber: z.string().optional(),
  endpoint: z.string().url("Invalid endpoint URL").optional().or(z.literal("")),
  priority: z.number().min(1).max(10).optional(),
  dailyCap: z.number().min(0).optional(),
  concurrencyLimit: z.number().min(1).optional(),
  timeZone: z.string().min(1, "Time zone is required"),
  hoursOfOperation: z.string().min(1, "Hours of operation is required"),
});

export const insertCampaignTargetSchema = createInsertSchema(campaignTargets).omit({
  createdAt: true,
}).extend({
  isActive: z.boolean().optional(),
});

export const insertCampaignBuyerSchema = createInsertSchema(campaignBuyers).omit({
  createdAt: true,
}).extend({
  isActive: z.boolean().optional(),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Agent name is required"),
  email: z.string().email("Valid email is required").min(1, "Email is required"),
  phoneNumber: z.string().optional(),
  extensionNumber: z.string().optional(),
  status: z.enum(["offline", "available", "busy", "break", "training"]).optional(),
  skills: z.array(z.string()).optional(),
  maxConcurrentCalls: z.number().min(1).max(10).optional(),
  priority: z.number().min(1).max(10).optional(),
  department: z.string().optional(),
  timezone: z.string().optional(),
  workSchedule: z.string().optional(),
});

export const insertAgentCampaignSchema = createInsertSchema(agentCampaigns).omit({
  createdAt: true,
});

export const insertAgentStatusLogSchema = createInsertSchema(agentStatusLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAgentCallSchema = createInsertSchema(agentCalls).omit({
  id: true,
  assignedAt: true,
});

export const insertNumberPoolSchema = createInsertSchema(numberPools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Pool name is required"),
  poolSize: z.number().min(1, "Pool size must be at least 1"),
  closedBrowserDelay: z.number().min(0).max(3600).optional(),
  idleLimit: z.number().min(0).max(3600).optional(),
  numberType: z.enum(["local", "toll-free"]).optional(),
  country: z.string().length(2).optional(),
});

export const insertNumberPoolAssignmentSchema = createInsertSchema(numberPoolAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertCampaignPoolAssignmentSchema = createInsertSchema(campaignPoolAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertUserColumnPreferencesSchema = createInsertSchema(userColumnPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  tableType: z.string().optional(),
  visibleColumns: z.array(z.string()).min(1, "At least one column must be visible"),
  columnOrder: z.array(z.string()).optional(),
  columnWidths: z.record(z.string(), z.number()).optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type Buyer = typeof buyers.$inferSelect;
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;

export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;

export type CampaignBuyer = typeof campaignBuyers.$inferSelect;
export type InsertCampaignBuyer = z.infer<typeof insertCampaignBuyerSchema>;

export type CampaignTarget = typeof campaignTargets.$inferSelect;
export type InsertCampaignTarget = z.infer<typeof insertCampaignTargetSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

// New table schemas and types
export const insertCallEventSchema = createInsertSchema(callEvents).omit({
  id: true,
  timestamp: true,
});
export type CallEvent = typeof callEvents.$inferSelect;
export type InsertCallEvent = z.infer<typeof insertCallEventSchema>;

export const insertRoutingDecisionSchema = createInsertSchema(routingDecisions).omit({
  id: true,
  timestamp: true,
});
export type RoutingDecision = typeof routingDecisions.$inferSelect;
export type InsertRoutingDecision = z.infer<typeof insertRoutingDecisionSchema>;

export const insertRtbAuctionDetailsSchema = createInsertSchema(rtbAuctionDetails).omit({
  id: true,
  timestamp: true,
});
export type RtbAuctionDetails = typeof rtbAuctionDetails.$inferSelect;
export type InsertRtbAuctionDetails = z.infer<typeof insertRtbAuctionDetailsSchema>;

export const insertPredictiveRoutingConfigSchema = createInsertSchema(predictiveRoutingConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type PredictiveRoutingConfig = typeof predictiveRoutingConfigs.$inferSelect;
export type InsertPredictiveRoutingConfig = z.infer<typeof insertPredictiveRoutingConfigSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type AgentCampaign = typeof agentCampaigns.$inferSelect;
export type InsertAgentCampaign = z.infer<typeof insertAgentCampaignSchema>;

export type AgentStatusLog = typeof agentStatusLogs.$inferSelect;
export type InsertAgentStatusLog = z.infer<typeof insertAgentStatusLogSchema>;

export type AgentCall = typeof agentCalls.$inferSelect;
export type InsertAgentCall = z.infer<typeof insertAgentCallSchema>;

export type NumberPool = typeof numberPools.$inferSelect;
export type InsertNumberPool = z.infer<typeof insertNumberPoolSchema>;

// URL Parameters schema and types
export const insertUrlParameterSchema = createInsertSchema(urlParameters).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true 
});

export type URLParameter = typeof urlParameters.$inferSelect;
export type InsertURLParameter = z.infer<typeof insertUrlParameterSchema>;

export type NumberPoolAssignment = typeof numberPoolAssignments.$inferSelect;
export type InsertNumberPoolAssignment = z.infer<typeof insertNumberPoolAssignmentSchema>;

export type CampaignPoolAssignment = typeof campaignPoolAssignments.$inferSelect;
export type InsertCampaignPoolAssignment = z.infer<typeof insertCampaignPoolAssignmentSchema>;

export type UserColumnPreferences = typeof userColumnPreferences.$inferSelect;
export type InsertUserColumnPreferences = z.infer<typeof insertUserColumnPreferencesSchema>;

// New table schemas
export const insertPhoneNumberTagSchema = createInsertSchema(phoneNumberTags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  tagName: z.string().min(1, "Tag name is required"),
  tagCategory: z.enum(["traffic-source", "publisher", "campaign-type", "geographic", "quality"]).optional(),
  priority: z.number().min(1).max(10).optional(),
});

export const insertPublisherSchema = createInsertSchema(publishers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Publisher name is required"),
  email: z.string().email("Invalid email format").optional(),
  publisherType: z.enum(["affiliate", "network", "direct", "internal"]).optional(),
  quality: z.enum(["premium", "standard", "test", "blocked"]).optional(),
  payoutModel: z.enum(["per_call", "per_minute", "cpa", "cpl", "revenue_share"]).optional(),
  status: z.enum(["active", "paused", "blocked", "pending"]).optional(),
});

export const insertCampaignPublisherSchema = createInsertSchema(campaignPublishers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  payout: z.number().min(0, "Payout must be positive"),
  payoutModel: z.enum(["per_call", "per_minute", "cpa", "cpl"]).optional(),
});

// Type definitions
export type PhoneNumberTag = typeof phoneNumberTags.$inferSelect;
export type InsertPhoneNumberTag = z.infer<typeof insertPhoneNumberTagSchema>;

export type Publisher = typeof publishers.$inferSelect;
export type InsertPublisher = z.infer<typeof insertPublisherSchema>;

export type CampaignPublisher = typeof campaignPublishers.$inferSelect;
export type InsertCampaignPublisher = z.infer<typeof insertCampaignPublisherSchema>;

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;

// Enhanced PhoneNumber type with assignment status information
export type EnhancedPhoneNumber = PhoneNumber & {
  status: 'available' | 'assigned';
  assignedTo?: string | null;
  assignedType?: 'campaign' | 'pool' | null;
};

// Call Tracking Tags schemas
export const insertCallTrackingTagSchema = createInsertSchema(callTrackingTags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Tag name is required"),
  tagCode: z.string().min(1, "Tag code is required").regex(/^[a-zA-Z0-9_-]+$/, "Tag code must contain only letters, numbers, underscores, and hyphens"),
  rotationStrategy: z.enum(["round_robin", "sticky", "random", "priority"]).optional(),
  sessionTimeout: z.number().min(60).max(86400).optional(),
  stickyDuration: z.number().min(60).max(2592000).optional(), // Min 1 minute instead of 1 hour for testing
});

export const insertDniSessionSchema = createInsertSchema(dniSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDniSnippetSchema = createInsertSchema(dniSnippets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CallTrackingTag = typeof callTrackingTags.$inferSelect;
export type InsertCallTrackingTag = z.infer<typeof insertCallTrackingTagSchema>;

export type DniSession = typeof dniSessions.$inferSelect;
export type InsertDniSession = z.infer<typeof insertDniSessionSchema>;

export type DniSnippet = typeof dniSnippets.$inferSelect;
export type InsertDniSnippet = z.infer<typeof insertDniSnippetSchema>;

// Removed duplicate publishers table - using the one defined above

// Call Flow System Tables
export const callFlows = pgTable("call_flows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  
  // Flow Configuration
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0").notNull(),
  
  // Flow Definition (JSON structure)
  flowDefinition: json("flow_definition").notNull(), // Complete flow structure
  
  // Flow Status & Settings
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, active, paused, archived
  isActive: boolean("is_active").default(false).notNull(),
  isTemplate: boolean("is_template").default(false).notNull(),
  templateCategory: varchar("template_category", { length: 100 }),
  
  // Performance Tracking
  totalExecutions: integer("total_executions").default(0).notNull(),
  successfulExecutions: integer("successful_executions").default(0).notNull(),
  failedExecutions: integer("failed_executions").default(0).notNull(),
  avgExecutionTime: integer("avg_execution_time").default(0).notNull(), // milliseconds
  
  // Metadata
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastExecuted: timestamp("last_executed"),
});

export const callFlowNodes = pgTable("call_flow_nodes", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").references(() => callFlows.id).notNull(),
  
  // Node Configuration
  nodeId: varchar("node_id", { length: 100 }).notNull(), // unique within flow
  nodeType: varchar("node_type", { length: 50 }).notNull(), // condition, action, trigger, end
  
  // Node Properties
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  
  // Node Definition
  config: json("config").notNull(), // node-specific configuration
  
  // Position for visual editor
  position: json("position"), // {x: number, y: number}
  
  // Execution tracking
  executionCount: integer("execution_count").default(0).notNull(),
  lastExecuted: timestamp("last_executed"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callFlowConnections = pgTable("call_flow_connections", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").references(() => callFlows.id).notNull(),
  
  // Connection Definition
  fromNodeId: varchar("from_node_id", { length: 100 }).notNull(),
  toNodeId: varchar("to_node_id", { length: 100 }).notNull(),
  
  // Connection Properties
  conditionType: varchar("condition_type", { length: 50 }), // success, failure, timeout, custom
  conditionValue: varchar("condition_value", { length: 256 }),
  
  // Connection styling for visual editor
  style: json("style"), // connection appearance
  
  // Execution tracking
  traversalCount: integer("traversal_count").default(0).notNull(),
  lastTraversed: timestamp("last_traversed"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callFlowExecutions = pgTable("call_flow_executions", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").references(() => callFlows.id).notNull(),
  callId: integer("call_id").references(() => calls.id),
  
  // Execution Details
  executionId: varchar("execution_id", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull(), // running, completed, failed, timeout
  
  // Execution Path
  startNodeId: varchar("start_node_id", { length: 100 }),
  currentNodeId: varchar("current_node_id", { length: 100 }),
  endNodeId: varchar("end_node_id", { length: 100 }),
  
  // Execution Context
  context: json("context"), // variables and state during execution
  inputData: json("input_data"), // initial data passed to flow
  outputData: json("output_data"), // final result data
  
  // Timing
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds
  
  // Error handling
  errorMessage: text("error_message"),
  errorNode: varchar("error_node", { length: 100 }),
  
  // Metadata
  executedBy: varchar("executed_by", { length: 100 }), // system, user, webhook
  triggerSource: varchar("trigger_source", { length: 100 }), // call, test, manual
});

export const callFlowVariables = pgTable("call_flow_variables", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").references(() => callFlows.id).notNull(),
  
  // Variable Definition
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // string, number, boolean, json, array
  
  // Variable Properties
  defaultValue: text("default_value"),
  description: text("description"),
  isRequired: boolean("is_required").default(false).notNull(),
  isGlobal: boolean("is_global").default(false).notNull(), // accessible across all flows
  
  // Validation
  validationRules: json("validation_rules"), // regex, min/max, enum values
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RTB (Real-Time Bidding) Tables
export const rtbTargets = pgTable("rtb_targets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Target Configuration
  name: varchar("name", { length: 256 }).notNull(),
  companyName: varchar("company_name", { length: 256 }),
  contactPerson: varchar("contact_person", { length: 256 }),
  contactEmail: varchar("contact_email", { length: 256 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  
  // Endpoint Configuration
  endpointUrl: varchar("endpoint_url", { length: 512 }).notNull(),
  httpMethod: varchar("http_method", { length: 10 }).default("POST").notNull(),
  contentType: varchar("content_type", { length: 100 }).default("application/json").notNull(),
  requestBody: text("request_body"),
  timeoutMs: integer("timeout_ms").default(3000).notNull(),
  connectionTimeout: integer("connection_timeout").default(5000).notNull(),
  
  // Authentication
  authMethod: varchar("auth_method", { length: 50 }).default("none").notNull(), // none, api_key, bearer, basic
  authToken: varchar("auth_token", { length: 512 }),
  authHeaders: json("auth_headers"), // jsonb for custom headers
  
  // Operational Settings
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  hoursOfOperation: json("hours_of_operation"), // jsonb: {monday: {start: "09:00", end: "17:00"}, ...}
  isActive: boolean("is_active").default(true).notNull(),
  
  // RTB Shareable Tags Configuration - NEW CRITICAL FIELDS
  rtbShareableTags: boolean("rtb_shareable_tags").default(false).notNull(),
  shareInboundCallId: boolean("share_inbound_call_id").default(false),
  exposeCallerId: boolean("expose_caller_id").default(false),
  rtbId: varchar("rtb_id", { length: 255 }),
  
  // Capacity Management
  maxConcurrentCalls: integer("max_concurrent_calls").default(10).notNull(),
  hourlyConcurrency: integer("hourly_concurrency").default(5).notNull(),
  dailyCap: integer("daily_cap").default(100).notNull(),
  hourlyCap: integer("hourly_cap").default(10).notNull(),
  monthlyCap: integer("monthly_cap").default(3000).notNull(),
  globalCallCap: integer("global_call_cap").default(10000).notNull(),
  
  // Sub ID Support for campaign segmentation
  subIdTracking: boolean("sub_id_tracking").default(false).notNull(),
  allowedSubIds: text("allowed_sub_ids").array(), // array of allowed sub IDs
  
  // Dynamic routing capabilities
  enableDynamicNumber: boolean("enable_dynamic_number").default(false).notNull(),
  enableDynamicSip: boolean("enable_dynamic_sip").default(false).notNull(),
  
  // RTB Shareable Tags
  sharedTagGroups: text("shared_tag_groups").array(), // group IDs for tag sharing
  
  // IVR Configuration
  enableIvr: boolean("enable_ivr").default(false).notNull(),
  ivrOptions: json("ivr_options"), // jsonb: {prompts: [], routing: {}}
  
  // Duplicate call handling
  restrictDuplicates: boolean("restrict_duplicates").default(false).notNull(),
  duplicateWindow: integer("duplicate_window").default(3600).notNull(), // seconds
  duplicateAction: varchar("duplicate_action", { length: 50 }).default("block").notNull(), // block, route_to_fallback, allow
  
  // Recording settings
  disableRecordings: boolean("disable_recordings").default(false).notNull(),
  
  // Bidding Configuration
  minBidAmount: decimal("min_bid_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  maxBidAmount: decimal("max_bid_amount", { precision: 10, scale: 2 }).default("100.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  // Phase 1: Advanced Bidding Features
  bidStrategy: varchar("bid_strategy", { length: 50 }).default("fixed").notNull(), // fixed, percentage, dynamic, auto
  bidFloor: decimal("bid_floor", { precision: 10, scale: 2 }), // minimum acceptable bid
  bidCeiling: decimal("bid_ceiling", { precision: 10, scale: 2 }), // maximum bid limit
  geoBidMultipliers: json("geo_bid_multipliers"), // {CA: 1.5, NY: 1.3, TX: 1.1}
  performanceBidAdjustment: boolean("performance_bid_adjustment").default(false).notNull(),
  
  // Auto-bidding settings
  targetConversionRate: decimal("target_conversion_rate", { precision: 5, scale: 2 }), // 0.00 to 100.00
  maxCostPerAcquisition: decimal("max_cost_per_acquisition", { precision: 10, scale: 2 }),
  bidAdjustmentFrequency: integer("bid_adjustment_frequency").default(3600).notNull(), // seconds
  enableAutoBidding: boolean("enable_auto_bidding").default(false).notNull(),
  
  // Phase 2: Geographic Targeting
  allowedStates: text("allowed_states").array(), // ['CA', 'NY', 'TX']
  blockedStates: text("blocked_states").array(), // ['AL', 'AK']
  allowedZipCodes: text("allowed_zip_codes").array(), // ['90210', '10001']
  blockedZipCodes: text("blocked_zip_codes").array(), // ['12345', '67890']
  allowedAreaCodes: text("allowed_area_codes").array(), // ['213', '310', '212']
  blockedAreaCodes: text("blocked_area_codes").array(), // ['555', '999']
  geoRadius: integer("geo_radius"), // mile radius for proximity targeting
  geoCenter: json("geo_center"), // {lat: 40.7128, lng: -74.0060, city: "New York", state: "NY"}
  enableGeoTargeting: boolean("enable_geo_targeting").default(false).notNull(),
  geoTargetingMode: varchar("geo_targeting_mode", { length: 20 }).default("inclusive").notNull(), // inclusive, exclusive
  
  // Phase 3: Advanced Filtering
  qualityScoreThreshold: integer("quality_score_threshold").default(0), // 0-100 minimum quality score
  enableCallerHistory: boolean("enable_caller_history").default(false).notNull(),
  callerHistoryDays: integer("caller_history_days").default(30), // days to look back
  maxCallsPerCaller: integer("max_calls_per_caller").default(0), // 0 = unlimited
  maxCallsPerCallerPeriod: varchar("max_calls_per_caller_period", { length: 10 }).default("day"), // day, week, month
  blockedCallerIds: text("blocked_caller_ids").array(), // ['1234567890', '0987654321']
  enableTimeBasedFiltering: boolean("enable_time_based_filtering").default(false).notNull(),
  allowedTimeRanges: json("allowed_time_ranges"), // [{start: "09:00", end: "17:00", timezone: "EST", days: ["mon", "tue"]}]
  blockedTimeRanges: json("blocked_time_ranges"), // [{start: "22:00", end: "06:00", timezone: "PST", days: ["sat", "sun"]}]
  enableCallDurationFiltering: boolean("enable_call_duration_filtering").default(false).notNull(),
  minCallDuration: integer("min_call_duration").default(0), // seconds
  maxCallDuration: integer("max_call_duration").default(0), // seconds, 0 = unlimited
  enableDeviceTypeFiltering: boolean("enable_device_type_filtering").default(false).notNull(),
  allowedDeviceTypes: text("allowed_device_types").array(), // ['mobile', 'landline', 'voip']
  blockedDeviceTypes: text("blocked_device_types").array(), // ['payphone', 'blocked']
  enableCustomFiltering: boolean("enable_custom_filtering").default(false).notNull(),
  customFilteringRules: json("custom_filtering_rules"), // Array of custom filter objects
  
  // Advanced Response Parsing Fields
  bidAmountPath: varchar("bid_amount_path", { length: 255 }),
  destinationNumberPath: varchar("destination_number_path", { length: 255 }),
  acceptancePath: varchar("acceptance_path", { length: 255 }),
  currencyPath: varchar("currency_path", { length: 255 }),
  durationPath: varchar("duration_path", { length: 255 }),
  
  // JavaScript Response Parser
  responseParserType: varchar("response_parser_type", { length: 50 }).default("json_path"), // json_path, javascript
  dynamicBidParser: text("dynamic_bid_parser"), // JavaScript code for dynamic bid amount parsing
  javascriptParser: text("javascript_parser"), // Custom JavaScript code for response parsing
  dynamicNumberParser: text("dynamic_number_parser"), // JavaScript code for dynamic number/SIP parsing
  
  // Revenue Settings - Ringba Compliance
  conversionSettings: varchar("conversion_settings", { length: 50 }).default("use_ring_tree"), // use_ring_tree, override
  minimumRevenueSettings: varchar("minimum_revenue_settings", { length: 50 }).default("use_ring_tree"), // use_ring_tree, override
  revenueType: varchar("revenue_type", { length: 50 }).default("dynamic"), // dynamic, static
  staticRevenueAmount: decimal("static_revenue_amount", { precision: 10, scale: 2 }).default("0.00"),
  failureRevenueAmount: decimal("failure_revenue_amount", { precision: 10, scale: 2 }).default("0.00"),
  convertOn: varchar("convert_on", { length: 100 }).default("Call Successfully Connected"), // Call Successfully Connected, Call Length, Postback/Webhook, Dialed
  startCallLengthOn: varchar("start_call_length_on", { length: 50 }).default("Incoming"), // Incoming, Dial, Connect
  callLengthValueType: varchar("call_length_value_type", { length: 50 }).default("Dynamic"), // Dynamic, Static
  maxDynamicDuration: integer("max_dynamic_duration").default(0), // seconds for dynamic max duration
  staticCallLength: integer("static_call_length").default(30), // seconds for static call length
  minimumRevenueAmount: decimal("minimum_revenue_amount", { precision: 10, scale: 2 }).default("20.00"),
  
  // Performance Tracking
  totalPings: integer("total_pings").default(0).notNull(),
  successfulBids: integer("successful_bids").default(0).notNull(),
  wonCalls: integer("won_calls").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rtb_targets_user").on(table.userId),
  index("idx_rtb_targets_active").on(table.isActive),
]);

export const rtbRouters = pgTable("rtb_routers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Router Configuration
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  biddingTimeoutMs: integer("bidding_timeout_ms").default(3000).notNull(),
  minBiddersRequired: integer("min_bidders_required").default(1).notNull(),
  enablePredictiveRouting: boolean("enable_predictive_routing").default(false).notNull(),
  
  // Business Logic
  revenueType: varchar("revenue_type", { length: 50 }).default("per_call").notNull(), // per_call, per_minute, cpa, cpl
  conversionTracking: boolean("conversion_tracking").default(false).notNull(),
  minRevenueAmount: decimal("min_revenue_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  useRingTreeSettings: boolean("use_ring_tree_settings").default(false).notNull(),
  
  // Error Handling Settings
  inheritFromRingTree: boolean("inherit_from_ring_tree").default(false).notNull(),
  errorHandlingMode: varchar("error_handling_mode", { length: 50 }).default("continue").notNull(), // continue, stop, fallback
  
  // Priority Bump Settings (-10 to +10 scale)
  priorityBumpEnabled: boolean("priority_bump_enabled").default(false).notNull(),
  priorityBumpValue: integer("priority_bump_value").default(0).notNull(), // -10 to +10
  
  // Predictive Routing Advanced Settings
  estimatedRevenue: decimal("estimated_revenue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  useEstimatedRevenue: boolean("use_estimated_revenue").default(false).notNull(),
  useCampaignSettings: boolean("use_campaign_settings").default(true).notNull(),
  
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rtb_routers_user").on(table.userId),
  index("idx_rtb_routers_active").on(table.isActive),
]);

// Direct Campaign-RTB Target Assignment (replaces router assignments)
export const campaignRtbTargets = pgTable("campaign_rtb_targets", {
  id: serial("id").primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  rtbTargetId: integer("rtb_target_id").references(() => rtbTargets.id).notNull(),
  
  // Assignment Configuration
  priority: integer("priority").default(1).notNull(),
  weight: integer("weight").default(100).notNull(), // for weighted distribution
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  index("idx_campaign_rtb_targets_campaign").on(table.campaignId),
  index("idx_campaign_rtb_targets_target").on(table.rtbTargetId),
  index("idx_campaign_rtb_targets_active").on(table.isActive),
  // Unique constraint to prevent duplicate assignments
  index("unique_campaign_target").on(table.campaignId, table.rtbTargetId),
]);

export const rtbBidRequests = pgTable("rtb_bid_requests", {
  id: serial("id").primaryKey(),
  requestId: varchar("request_id", { length: 128 }).notNull().unique(),
  campaignId: uuid("campaign_id").references(() => campaigns.id).notNull(),
  rtbRouterId: integer("rtb_router_id").references(() => rtbRouters.id).notNull(),
  
  // Call Information
  callerId: varchar("caller_id", { length: 20 }),
  callerState: varchar("caller_state", { length: 2 }),
  callerZip: varchar("caller_zip", { length: 10 }),
  callStartTime: timestamp("call_start_time").notNull(),
  
  // Request Configuration
  tags: json("tags"), // jsonb for flexible metadata
  timeoutMs: integer("timeout_ms").default(3000).notNull(),
  
  // Response Tracking
  totalTargetsPinged: integer("total_targets_pinged").default(0).notNull(),
  successfulResponses: integer("successful_responses").default(0).notNull(),
  
  // Auction Results
  winningBidAmount: decimal("winning_bid_amount", { precision: 10, scale: 2 }),
  winningTargetId: integer("winning_target_id").references(() => rtbTargets.id),
  
  // Performance Metrics
  requestSentAt: timestamp("request_sent_at").defaultNow().notNull(),
  biddingCompletedAt: timestamp("bidding_completed_at"),
  totalResponseTimeMs: integer("total_response_time_ms"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rtb_requests_campaign").on(table.campaignId),
  index("idx_rtb_requests_router").on(table.rtbRouterId),
  index("idx_rtb_requests_winner").on(table.winningTargetId),
  index("idx_rtb_requests_created").on(table.createdAt),
]);

export const rtbBidResponses = pgTable("rtb_bid_responses", {
  id: serial("id").primaryKey(),
  requestId: varchar("request_id", { length: 128 }).references(() => rtbBidRequests.requestId).notNull(),
  rtbTargetId: integer("rtb_target_id").references(() => rtbTargets.id).notNull(),
  
  // Bid Information
  bidAmount: decimal("bid_amount", { precision: 10, scale: 2 }).notNull(),
  bidCurrency: varchar("bid_currency", { length: 3 }).default("USD").notNull(),
  requiredDuration: integer("required_duration"), // minimum call duration required
  destinationNumber: varchar("destination_number", { length: 20 }).notNull(),
  
  // Response Tracking
  responseTimeMs: integer("response_time_ms").notNull(),
  responseStatus: varchar("response_status", { length: 50 }).notNull(), // success, timeout, error, invalid
  errorMessage: text("error_message"),
  rawResponse: json("raw_response"), // jsonb for full response storage
  
  // Bid Validation
  isValid: boolean("is_valid").default(true).notNull(),
  isWinningBid: boolean("is_winning_bid").default(false).notNull(),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rtb_responses_request").on(table.requestId),
  index("idx_rtb_responses_target").on(table.rtbTargetId),
  index("idx_rtb_responses_winning").on(table.isWinningBid),
  index("idx_rtb_responses_valid").on(table.isValid),
]);

// Removed duplicate - using the enhanced insertPublisherSchema defined earlier

// RTB Insert Schemas and Types
export const insertRtbTargetSchema = createInsertSchema(rtbTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Target name is required"),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  endpointUrl: z.string().url("Valid endpoint URL is required"),
  timeoutMs: z.number().min(1000).max(30000).optional(),
  connectionTimeout: z.number().min(1000).max(30000).optional(),
  authMethod: z.enum(["none", "api_key", "bearer", "basic"]).optional(),
  timezone: z.string().optional(),
  minBidAmount: z.number().min(0).optional(),
  maxBidAmount: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  
  // Phase 1: Advanced Bidding Features validation
  bidStrategy: z.enum(["fixed", "percentage", "dynamic", "auto"]).optional(),
  bidFloor: z.number().min(0).optional(),
  bidCeiling: z.number().min(0).optional(),
  geoBidMultipliers: z.record(z.string(), z.number().min(0.1).max(10)).optional(),
  performanceBidAdjustment: z.boolean().optional(),
  targetConversionRate: z.number().min(0).max(100).optional(),
  maxCostPerAcquisition: z.number().min(0).optional(),
  bidAdjustmentFrequency: z.number().min(300).max(86400).optional(),
  enableAutoBidding: z.boolean().optional(),
  
  // JavaScript Response Parser validation
  responseParserType: z.enum(["json_path", "javascript"]).optional(),
  dynamicBidParser: z.string().optional(),
  javascriptParser: z.string().optional(),
  dynamicNumberParser: z.string().optional(),
  
  // Call Length Configuration validation
  callLengthValueType: z.enum(["Dynamic", "Static"]).optional(),
  maxDynamicDuration: z.number().min(0).optional(),
  staticCallLength: z.number().min(1).optional(),
  
  // Phase 2: Geographic Targeting validation
  allowedStates: z.array(z.string().length(2)).optional(),
  blockedStates: z.array(z.string().length(2)).optional(),
  allowedZipCodes: z.array(z.string().min(5).max(10)).optional(),
  blockedZipCodes: z.array(z.string().min(5).max(10)).optional(),
  allowedAreaCodes: z.array(z.string().length(3)).optional(),
  blockedAreaCodes: z.array(z.string().length(3)).optional(),
  geoRadius: z.number().min(1).max(1000).optional(),
  geoCenter: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().optional(),
    state: z.string().length(2).optional(),
  }).optional(),
  enableGeoTargeting: z.boolean().optional(),
  geoTargetingMode: z.enum(["inclusive", "exclusive"]).optional(),
  
  // Phase 3: Advanced Filtering validation
  qualityScoreThreshold: z.number().min(0).max(100).optional(),
  enableCallerHistory: z.boolean().optional(),
  callerHistoryDays: z.number().min(1).max(365).optional(),
  maxCallsPerCaller: z.number().min(0).optional(),
  maxCallsPerCallerPeriod: z.enum(["day", "week", "month"]).optional(),
  blockedCallerIds: z.array(z.string().min(10).max(15)).optional(),
  enableTimeBasedFiltering: z.boolean().optional(),
  allowedTimeRanges: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().optional(),
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  })).optional(),
  blockedTimeRanges: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().optional(),
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  })).optional(),
  enableCallDurationFiltering: z.boolean().optional(),
  minCallDuration: z.number().min(0).optional(),
  maxCallDuration: z.number().min(0).optional(),
  enableDeviceTypeFiltering: z.boolean().optional(),
  allowedDeviceTypes: z.array(z.enum(["mobile", "landline", "voip", "payphone", "blocked"])).optional(),
  blockedDeviceTypes: z.array(z.enum(["mobile", "landline", "voip", "payphone", "blocked"])).optional(),
  enableCustomFiltering: z.boolean().optional(),
  customFilteringRules: z.array(z.object({
    name: z.string(),
    condition: z.string(),
    action: z.enum(["allow", "block", "adjust_bid"]),
    value: z.any().optional(),
  })).optional(),
});

export const insertRtbRouterSchema = createInsertSchema(rtbRouters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Router name is required"),
  biddingTimeoutMs: z.number().min(1000).max(30000).optional(),
  minBiddersRequired: z.number().min(1).max(10).optional(),
  revenueType: z.enum(["per_call", "per_minute", "cpa", "cpl"]).optional(),
});

// RTB Router Assignments removed - replaced with direct campaign-target assignments

export const insertRtbBidRequestSchema = createInsertSchema(rtbBidRequests).omit({
  id: true,
  createdAt: true,
  requestSentAt: true,
}).extend({
  requestId: z.string().min(1, "Request ID is required"),
  callStartTime: z.date(),
  timeoutMs: z.number().min(1000).max(30000).optional(),
});

export const insertRtbBidResponseSchema = createInsertSchema(rtbBidResponses).omit({
  id: true,
  createdAt: true,
}).extend({
  requestId: z.string().min(1, "Request ID is required"),
  bidAmount: z.number().min(0, "Bid amount must be positive"),
  bidCurrency: z.string().length(3).optional(),
  destinationNumber: z.string().min(1, "Destination number is required"),
  responseTimeMs: z.number().min(0),
  responseStatus: z.enum(["success", "timeout", "error", "invalid"]),
});

export type RtbTarget = typeof rtbTargets.$inferSelect;
export type InsertRtbTarget = z.infer<typeof insertRtbTargetSchema>;

export type RtbRouter = typeof rtbRouters.$inferSelect;
export type InsertRtbRouter = z.infer<typeof insertRtbRouterSchema>;

// RtbRouterAssignment types removed - replaced with CampaignRtbTarget

export type RtbBidRequest = typeof rtbBidRequests.$inferSelect;
export type InsertRtbBidRequest = z.infer<typeof insertRtbBidRequestSchema>;

export type RtbBidResponse = typeof rtbBidResponses.$inferSelect;
export type InsertRtbBidResponse = z.infer<typeof insertRtbBidResponseSchema>;

export const insertCampaignRtbTargetSchema = createInsertSchema(campaignRtbTargets).omit({
  id: true,
  assignedAt: true,
});

export type CampaignRtbTarget = typeof campaignRtbTargets.$inferSelect;
export type InsertCampaignRtbTarget = z.infer<typeof insertCampaignRtbTargetSchema>;

// Database relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  campaignBuyers: many(campaignBuyers),
  calls: many(calls),
  agents: many(agentCampaigns),
  phoneNumber: one(phoneNumbers, {
    fields: [campaigns.phoneNumber],
    references: [phoneNumbers.phoneNumber],
  }),
  pool: one(numberPools, {
    fields: [campaigns.poolId],
    references: [numberPools.id],
  }),
  callFlows: many(callFlows),
  campaignPublishers: many(campaignPublishers),
  dniSessions: many(dniSessions),
  visitorSessions: many(visitorSessions),
  rtbTargets: many(campaignRtbTargets),
  callTrackingTags: many(callTrackingTags),
}));

export const callTrackingTagsRelations = relations(callTrackingTags, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [callTrackingTags.campaignId],
    references: [campaigns.id],
  }),
  primaryNumber: one(phoneNumbers, {
    fields: [callTrackingTags.primaryNumberId],
    references: [phoneNumbers.id],
  }),
  pool: one(numberPools, {
    fields: [callTrackingTags.poolId],
    references: [numberPools.id],
  }),
  publisher: one(publishers, {
    fields: [callTrackingTags.publisherId],
    references: [publishers.id],
  }),
}));

export const phoneNumbersRelations = relations(phoneNumbers, ({ one, many }) => ({
  user: one(users, {
    fields: [phoneNumbers.userId],
    references: [users.id],
  }),
  callTrackingTags: many(callTrackingTags),
}));

export const numberPoolsRelations = relations(numberPools, ({ one, many }) => ({
  user: one(users, {
    fields: [numberPools.userId],
    references: [users.id],
  }),
  callTrackingTags: many(callTrackingTags),
}));

export const publishersRelations = relations(publishers, ({ one, many }) => ({
  user: one(users, {
    fields: [publishers.userId],
    references: [users.id],
  }),
  callTrackingTags: many(callTrackingTags),
}));

// Feedback table for AI chatbot interactions
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  question: text("question").notNull(),
  response: text("response").notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  timestamp: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;



// MVP Tracking Tables
export const visitorSessions = pgTable("visitor_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).unique().notNull(),
  userId: integer("user_id").references(() => users.id),
  
  // Session Info
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  
  // Attribution Data
  source: varchar("source", { length: 255 }), // google, facebook, direct
  medium: varchar("medium", { length: 255 }), // organic, cpc, email, social
  campaign: varchar("campaign", { length: 255 }), // campaign name
  publisher: varchar("publisher", { length: 255 }), // publisher/affiliate name
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  
  // RedTrack Integration
  redtrackClickId: varchar("redtrack_clickid", { length: 255 }),
  redtrackCampaignId: varchar("redtrack_campaign_id", { length: 100 }),
  redtrackOfferId: varchar("redtrack_offer_id", { length: 100 }),
  redtrackAffiliateId: varchar("redtrack_affiliate_id", { length: 100 }),
  redtrackSubId: varchar("redtrack_sub_id", { length: 100 }),
  redtrackVisitorId: varchar("redtrack_visitor_id", { length: 255 }),
  
  // Additional tracking fields
  gclid: varchar("gclid", { length: 255 }), // Google Click ID
  
  // Geographic data from IP lookup (Ringba-compliant)
  geoCountry: varchar("geo_country", { length: 100 }),
  geoCountryCode: varchar("geo_country_code", { length: 10 }),
  geoRegion: varchar("geo_region", { length: 10 }), // State code (NY, CA)
  geoRegionName: varchar("geo_region_name", { length: 100 }), // Full state name
  geoCity: varchar("geo_city", { length: 100 }),
  geoZipCode: varchar("geo_zip_code", { length: 20 }),
  geoLatitude: decimal("geo_latitude", { precision: 10, scale: 6 }),
  geoLongitude: decimal("geo_longitude", { precision: 10, scale: 6 }),
  geoTimezone: varchar("geo_timezone", { length: 50 }),
  fbclid: varchar("fbclid", { length: 255 }), // Facebook Click ID
  clickId: varchar("click_id", { length: 255 }), // Generic click ID
  location: varchar("location", { length: 255 }), // Geographic location
  
  // Landing Page
  landingPage: text("landing_page"),
  currentPage: text("current_page"),
  
  // Timestamps
  firstVisit: timestamp("first_visit").defaultNow().notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  
  // Tracking State
  isActive: boolean("is_active").default(true).notNull(),
  hasConverted: boolean("has_converted").default(false).notNull(),
});

// RedTrack Configuration Table
export const redtrackConfigs = pgTable("redtrack_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Configuration Details
  name: varchar("name", { length: 256 }).notNull(),
  domain: varchar("domain", { length: 512 }).notNull(), // RedTrack domain
  apiKey: varchar("api_key", { length: 512 }),
  
  // Postback Settings
  postbackUrl: varchar("postback_url", { length: 512 }).notNull(),
  conversionType: varchar("conversion_type", { length: 50 }).default("ConvertedCall").notNull(),
  
  // Default Values
  defaultRevenue: decimal("default_revenue", { precision: 10, scale: 2 }).default("20.00"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  lastUsed: timestamp("last_used"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversionEvents = pgTable("conversion_events", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).references(() => visitorSessions.sessionId).notNull(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  callId: integer("call_id").references(() => calls.id),
  
  // Conversion Details
  conversionType: varchar("conversion_type", { length: 50 }).default("call").notNull(), // call, form, chat
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  // Call-specific data
  callerNumber: varchar("caller_number", { length: 20 }),
  duration: integer("duration"), // call duration in seconds
  callStatus: varchar("call_status", { length: 50 }), // completed, missed, busy
  
  // Attribution
  attributionModel: varchar("attribution_model", { length: 50 }).default("last_touch").notNull(),
  
  // RedTrack Integration
  redtrackClickId: varchar("redtrack_clickid", { length: 255 }),
  redtrackPostbackSent: boolean("redtrack_postback_sent").default(false).notNull(),
  redtrackPostbackUrl: text("redtrack_postback_url"),
  redtrackPostbackResponse: text("redtrack_postback_response"),
  redtrackPostbackStatus: varchar("redtrack_postback_status", { length: 20 }), // success, failed, pending
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Pixel Data
  pixelsFired: boolean("pixels_fired").default(false).notNull(),
  pixelData: json("pixel_data"), // URLs and responses
});

// MVP Tracking Schemas
export const insertVisitorSessionSchema = createInsertSchema(visitorSessions).omit({
  id: true,
  firstVisit: true,
  lastActivity: true,
});

export const insertConversionEventSchema = createInsertSchema(conversionEvents).omit({
  id: true,
  createdAt: true,
});

export const insertRedtrackConfigSchema = createInsertSchema(redtrackConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
}).extend({
  userId: z.number().optional(),
  name: z.string().min(1, "Configuration name is required"),
  domain: z.string().url("Valid domain URL is required"),
  postbackUrl: z.string().url("Valid postback URL is required"),
  conversionType: z.string().optional(),
  defaultRevenue: z.number().min(0, "Revenue must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
});

export type VisitorSession = typeof visitorSessions.$inferSelect;
export type InsertVisitorSession = z.infer<typeof insertVisitorSessionSchema>;
export type ConversionEvent = typeof conversionEvents.$inferSelect;
export type InsertConversionEvent = z.infer<typeof insertConversionEventSchema>;
export type RedtrackConfig = typeof redtrackConfigs.$inferSelect;
export type InsertRedtrackConfig = z.infer<typeof insertRedtrackConfigSchema>;

// Call Flow Schemas
export const insertCallFlowSchema = createInsertSchema(callFlows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastExecuted: true,
  totalExecutions: true,
  successfulExecutions: true,
  failedExecutions: true,
  avgExecutionTime: true,
});

export const insertCallFlowNodeSchema = createInsertSchema(callFlowNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  executionCount: true,
  lastExecuted: true,
});

export const insertCallFlowConnectionSchema = createInsertSchema(callFlowConnections).omit({
  id: true,
  createdAt: true,
  traversalCount: true,
  lastTraversed: true,
});

export const insertCallFlowExecutionSchema = createInsertSchema(callFlowExecutions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  duration: true,
});

export const insertCallFlowVariableSchema = createInsertSchema(callFlowVariables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CallFlow = typeof callFlows.$inferSelect;
export type InsertCallFlow = z.infer<typeof insertCallFlowSchema>;

export type CallFlowNode = typeof callFlowNodes.$inferSelect;
export type InsertCallFlowNode = z.infer<typeof insertCallFlowNodeSchema>;

export type CallFlowConnection = typeof callFlowConnections.$inferSelect;
export type InsertCallFlowConnection = z.infer<typeof insertCallFlowConnectionSchema>;

export type CallFlowExecution = typeof callFlowExecutions.$inferSelect;
export type InsertCallFlowExecution = z.infer<typeof insertCallFlowExecutionSchema>;

export type CallFlowVariable = typeof callFlowVariables.$inferSelect;
export type InsertCallFlowVariable = z.infer<typeof insertCallFlowVariableSchema>;

// RTB Relations
export const rtbTargetsRelations = relations(rtbTargets, ({ one, many }) => ({
  user: one(users, {
    fields: [rtbTargets.userId],
    references: [users.id],
  }),
  campaignAssignments: many(campaignRtbTargets),
  bidResponses: many(rtbBidResponses),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));

// MVP Tracking Relations
export const visitorSessionsRelations = relations(visitorSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [visitorSessions.userId],
    references: [users.id],
  }),
  conversionEvents: many(conversionEvents),
}));

export const conversionEventsRelations = relations(conversionEvents, ({ one }) => ({
  session: one(visitorSessions, {
    fields: [conversionEvents.sessionId],
    references: [visitorSessions.sessionId],
  }),
  campaign: one(campaigns, {
    fields: [conversionEvents.campaignId],
    references: [campaigns.id],
  }),
  call: one(calls, {
    fields: [conversionEvents.callId],
    references: [calls.id],
  }),
}));

// Call Flow Relations
export const callFlowsRelations = relations(callFlows, ({ one, many }) => ({
  user: one(users, {
    fields: [callFlows.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [callFlows.campaignId],
    references: [campaigns.id],
  }),
  nodes: many(callFlowNodes),
  connections: many(callFlowConnections),
  executions: many(callFlowExecutions),
  variables: many(callFlowVariables),
}));

export const callFlowNodesRelations = relations(callFlowNodes, ({ one }) => ({
  flow: one(callFlows, {
    fields: [callFlowNodes.flowId],
    references: [callFlows.id],
  }),
}));

export const callFlowConnectionsRelations = relations(callFlowConnections, ({ one }) => ({
  flow: one(callFlows, {
    fields: [callFlowConnections.flowId],
    references: [callFlows.id],
  }),
}));

export const callFlowExecutionsRelations = relations(callFlowExecutions, ({ one }) => ({
  flow: one(callFlows, {
    fields: [callFlowExecutions.flowId],
    references: [callFlows.id],
  }),
  call: one(calls, {
    fields: [callFlowExecutions.callId],
    references: [calls.id],
  }),
}));

export const callFlowVariablesRelations = relations(callFlowVariables, ({ one }) => ({
  flow: one(callFlows, {
    fields: [callFlowVariables.flowId],
    references: [callFlows.id],
  }),
}));

export const rtbRoutersRelations = relations(rtbRouters, ({ one, many }) => ({
  user: one(users, {
    fields: [rtbRouters.userId],
    references: [users.id],
  }),
  bidRequests: many(rtbBidRequests),
}));

// New direct campaign-target relations
export const campaignRtbTargetsRelations = relations(campaignRtbTargets, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignRtbTargets.campaignId],
    references: [campaigns.id],
  }),
  rtbTarget: one(rtbTargets, {
    fields: [campaignRtbTargets.rtbTargetId],
    references: [rtbTargets.id],
  }),
}));

export const rtbBidRequestsRelations = relations(rtbBidRequests, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [rtbBidRequests.campaignId],
    references: [campaigns.id],
  }),
  rtbRouter: one(rtbRouters, {
    fields: [rtbBidRequests.rtbRouterId],
    references: [rtbRouters.id],
  }),
  winningTarget: one(rtbTargets, {
    fields: [rtbBidRequests.winningTargetId],
    references: [rtbTargets.id],
  }),
  bidResponses: many(rtbBidResponses),
}));

export const rtbBidResponsesRelations = relations(rtbBidResponses, ({ one }) => ({
  bidRequest: one(rtbBidRequests, {
    fields: [rtbBidResponses.requestId],
    references: [rtbBidRequests.requestId],
  }),
  rtbTarget: one(rtbTargets, {
    fields: [rtbBidResponses.rtbTargetId],
    references: [rtbTargets.id],
  }),
}));