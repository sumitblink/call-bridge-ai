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
  
  // Phone & Routing
  phoneNumber: varchar("phone_number", { length: 20 }),
  poolId: integer("pool_id").references(() => numberPools.id), // assigned number pool
  routingType: varchar("routing_type", { length: 50 }).default("priority").notNull(), // priority, round_robin, geo, time_based, weighted
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