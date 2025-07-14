import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, json, index, primaryKey } from "drizzle-orm/pg-core";
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
  id: serial("id").primaryKey(),
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
  payoutModel: varchar("payout_model", { length: 50 }).default("per_call"), // per_call, per_minute, per_conversion
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
  
  // RTB Integration
  rtbRouterId: integer("rtb_router_id"), // References rtb_routers.id, foreign key added later
  enableRtb: boolean("enable_rtb").default(false).notNull(),
  rtbId: varchar("rtb_id", { length: 32 }).unique(), // 32-character hexadecimal ID for external RTB operations
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const buyers = pgTable("buyers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phoneNumber: varchar("phone_number"),
  endpoint: varchar("endpoint"), // webhook endpoint for ping/post
  status: varchar("status").default("active"),
  priority: integer("priority").default(1),
  dailyCap: integer("daily_cap").default(100),
  concurrencyLimit: integer("concurrency_limit").default(5),
  acceptanceRate: varchar("acceptance_rate").default("95%"),
  avgResponseTime: integer("avg_response_time").default(200), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaignBuyers = pgTable("campaign_buyers", {
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  buyerId: integer("buyer_id").references(() => buyers.id).notNull(),
  priority: integer("priority").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.campaignId, table.buyerId] })
}));

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  buyerId: integer("buyer_id").references(() => buyers.id),
  callSid: varchar("call_sid", { length: 100 }),
  fromNumber: varchar("from_number", { length: 20 }).notNull(),
  toNumber: varchar("to_number", { length: 20 }).notNull(),
  duration: integer("duration").default(0).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // ringing, in_progress, completed, failed, busy, no_answer
  callQuality: varchar("call_quality", { length: 20 }), // good, poor, excellent
  recordingUrl: varchar("recording_url", { length: 512 }),
  recordingSid: varchar("recording_sid", { length: 100 }),
  recordingStatus: varchar("recording_status", { length: 50 }), // processing, completed, failed
  recordingDuration: integer("recording_duration"), // in seconds
  transcription: text("transcription"),
  transcriptionStatus: varchar("transcription_status", { length: 50 }), // pending, completed, failed
  cost: decimal("cost", { precision: 10, scale: 4 }).default("0.0000"),
  revenue: decimal("revenue", { precision: 10, scale: 4 }).default("0.0000"),
  geoLocation: varchar("geo_location", { length: 100 }),
  userAgent: text("user_agent"),
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
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
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

// Integration system tables
export const urlParameters = pgTable("url_parameters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  parameter: varchar("parameter", { length: 100 }).notNull(),
  description: text("description"),
  value: varchar("value", { length: 256 }).notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const trackingPixels = pgTable("tracking_pixels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  pixelType: varchar("pixel_type", { length: 50 }).notNull(), // 'postback', 'image', 'javascript'
  fireOnEvent: varchar("fire_on_event", { length: 50 }).notNull(), // 'incoming', 'connected', 'completed', 'converted', 'error', 'payout', 'recording', 'finalized'
  code: text("code").notNull(), // contains macros like {call_id}, {phone_number}, {timestamp}
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
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  
  // Tag Configuration
  name: varchar("name", { length: 256 }).notNull(), // Tag Name
  tagCode: varchar("tag_code", { length: 100 }).notNull().unique(), // Unique identifier for JS
  primaryNumberId: integer("primary_number_id").references(() => phoneNumbers.id), // Primary Publisher Number
  numberToReplace: varchar("number_to_replace", { length: 20 }), // Number to Replace
  
  // Pool Configuration
  poolId: integer("pool_id").references(() => numberPools.id), // Assigned pool for rotation
  rotationStrategy: varchar("rotation_strategy", { length: 50 }).default("round_robin").notNull(), // round_robin, sticky, random, priority
  
  // Publisher Assignment
  publisherId: integer("publisher_id").references(() => publishers.id), // Assigned publisher
  
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
  campaignId: integer("campaign_id").references(() => campaigns.id),
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
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  poolId: integer("pool_id").references(() => numberPools.id).notNull(),
  priority: integer("priority").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

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
}).extend({
  userId: z.number().optional(), // Made optional for client-side validation
  name: z.string().min(1, "Buyer name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  status: z.string().optional(),
  priority: z.number().optional(),
  dailyCap: z.number().optional(),
  concurrencyLimit: z.number().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  endpoint: z.string().url("Invalid endpoint URL").optional().or(z.literal("")),
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
  id: true,
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

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type Buyer = typeof buyers.$inferSelect;
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;

export type CampaignBuyer = typeof campaignBuyers.$inferSelect;
export type InsertCampaignBuyer = z.infer<typeof insertCampaignBuyerSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;

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

export type NumberPoolAssignment = typeof numberPoolAssignments.$inferSelect;
export type InsertNumberPoolAssignment = z.infer<typeof insertNumberPoolAssignmentSchema>;

export type CampaignPoolAssignment = typeof campaignPoolAssignments.$inferSelect;
export type InsertCampaignPoolAssignment = z.infer<typeof insertCampaignPoolAssignmentSchema>;

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;

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
  stickyDuration: z.number().min(3600).max(2592000).optional(),
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

// Publishers (Traffic Sources) table
export const publishers = pgTable('publishers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  status: text('status').notNull().default('active'), // 'active', 'paused', 'suspended'
  payoutType: text('payout_type').notNull().default('per_call'), // 'per_call', 'per_minute', 'revenue_share'
  payoutAmount: decimal('payout_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  minCallDuration: integer('min_call_duration').default(0), // seconds
  allowedTargets: text('allowed_targets').array(), // campaign IDs they can send traffic to
  enableTracking: boolean('enable_tracking').default(true), // simplified tracking toggle
  trackingSettings: text('tracking_settings'), // custom tracking parameters as JSON string
  customParameters: text('custom_parameters'), // custom JSON parameters for publisher integration
  totalCalls: integer('total_calls').default(0),
  totalPayout: decimal('total_payout', { precision: 10, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Publisher-Campaign relations
export const publisherCampaigns = pgTable('publisher_campaigns', {
  id: serial('id').primaryKey(),
  publisherId: integer('publisher_id').references(() => publishers.id).notNull(),
  campaignId: integer('campaign_id').references(() => campaigns.id).notNull(),
  customPayout: decimal('custom_payout', { precision: 10, scale: 2 }), // override default payout for this campaign
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
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
  rtbShareableTags: boolean("rtb_shareable_tags").default(false).notNull(),
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
  
  // Advanced Response Parsing Fields
  bidAmountPath: varchar("bid_amount_path", { length: 255 }),
  destinationNumberPath: varchar("destination_number_path", { length: 255 }),
  acceptancePath: varchar("acceptance_path", { length: 255 }),
  currencyPath: varchar("currency_path", { length: 255 }),
  durationPath: varchar("duration_path", { length: 255 }),
  
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

export const rtbRouterAssignments = pgTable("rtb_router_assignments", {
  id: serial("id").primaryKey(),
  rtbRouterId: integer("rtb_router_id").references(() => rtbRouters.id).notNull(),
  rtbTargetId: integer("rtb_target_id").references(() => rtbTargets.id).notNull(),
  
  // Assignment Configuration
  priority: integer("priority").default(1).notNull(),
  weight: integer("weight").default(100).notNull(), // for weighted distribution
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rtb_assignments_router").on(table.rtbRouterId),
  index("idx_rtb_assignments_target").on(table.rtbTargetId),
  index("idx_rtb_assignments_active").on(table.isActive),
  // Unique constraint to prevent duplicate assignments
  index("unique_router_target").on(table.rtbRouterId, table.rtbTargetId),
]);

export const rtbBidRequests = pgTable("rtb_bid_requests", {
  id: serial("id").primaryKey(),
  requestId: varchar("request_id", { length: 128 }).notNull().unique(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
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

export const insertPublisherSchema = createInsertSchema(publishers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPublisherCampaignSchema = createInsertSchema(publisherCampaigns).omit({
  id: true,
  createdAt: true,
});

export type Publisher = typeof publishers.$inferSelect;
export type InsertPublisher = z.infer<typeof insertPublisherSchema>;

export type PublisherCampaign = typeof publisherCampaigns.$inferSelect;
export type InsertPublisherCampaign = z.infer<typeof insertPublisherCampaignSchema>;

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

export const insertRtbRouterAssignmentSchema = createInsertSchema(rtbRouterAssignments).omit({
  id: true,
  assignedAt: true,
}).extend({
  priority: z.number().min(1).max(10).optional(),
  weight: z.number().min(1).max(1000).optional(),
});

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

export type RtbRouterAssignment = typeof rtbRouterAssignments.$inferSelect;
export type InsertRtbRouterAssignment = z.infer<typeof insertRtbRouterAssignmentSchema>;

export type RtbBidRequest = typeof rtbBidRequests.$inferSelect;
export type InsertRtbBidRequest = z.infer<typeof insertRtbBidRequestSchema>;

export type RtbBidResponse = typeof rtbBidResponses.$inferSelect;
export type InsertRtbBidResponse = z.infer<typeof insertRtbBidResponseSchema>;

// Database relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
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

// RTB Relations
export const rtbTargetsRelations = relations(rtbTargets, ({ one, many }) => ({
  user: one(users, {
    fields: [rtbTargets.userId],
    references: [users.id],
  }),
  routerAssignments: many(rtbRouterAssignments),
  bidResponses: many(rtbBidResponses),
}));

export const rtbRoutersRelations = relations(rtbRouters, ({ one, many }) => ({
  user: one(users, {
    fields: [rtbRouters.userId],
    references: [users.id],
  }),
  routerAssignments: many(rtbRouterAssignments),
  bidRequests: many(rtbBidRequests),
  campaigns: many(campaigns),
}));

export const rtbRouterAssignmentsRelations = relations(rtbRouterAssignments, ({ one }) => ({
  rtbRouter: one(rtbRouters, {
    fields: [rtbRouterAssignments.rtbRouterId],
    references: [rtbRouters.id],
  }),
  rtbTarget: one(rtbTargets, {
    fields: [rtbRouterAssignments.rtbTargetId],
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