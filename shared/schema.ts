import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, json, index } from "drizzle-orm/pg-core";
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
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  routingType: varchar("routing_type", { length: 50 }).default("round_robin").notNull(), // round_robin, priority, geo, time_based
  maxConcurrentCalls: integer("max_concurrent_calls").default(5).notNull(),
  callCap: integer("call_cap").default(100).notNull(), // daily call cap
  geoTargeting: text("geo_targeting").array(), // array of allowed states/countries
  timeZoneRestriction: varchar("timezone_restriction", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const buyers = pgTable("buyers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  endpoint: varchar("endpoint", { length: 512 }), // webhook endpoint for ping/post
  status: varchar("status", { length: 50 }).default("active").notNull(),
  priority: integer("priority").default(1).notNull(), // routing priority
  dailyCap: integer("daily_cap").default(50).notNull(),
  concurrencyLimit: integer("concurrency_limit").default(3).notNull(),
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  avgResponseTime: integer("avg_response_time").default(0).notNull(), // in milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignBuyers = pgTable("campaign_buyers", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id).notNull(),
  buyerId: integer("buyer_id").references(() => buyers.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  buyerId: integer("buyer_id").references(() => buyers.id),
  callSid: varchar("call_sid", { length: 100 }).notNull(),
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

// Keep agents table for backward compatibility
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  callsHandled: integer("calls_handled").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
});

export const insertCampaignBuyerSchema = createInsertSchema(campaignBuyers).omit({
  id: true,
  createdAt: true,
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
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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

// Publishers (Traffic Sources) table
export const publishers = pgTable('publishers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  status: text('status').notNull().default('active'), // 'active', 'paused', 'suspended'
  payoutType: text('payout_type').notNull().default('per_call'), // 'per_call', 'per_minute', 'revenue_share'
  payoutAmount: decimal('payout_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  minCallDuration: integer('min_call_duration').default(0), // seconds
  allowedTargets: text('allowed_targets').array(), // campaign IDs they can send traffic to
  trackingSettings: text('tracking_settings'), // custom tracking parameters as JSON string
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