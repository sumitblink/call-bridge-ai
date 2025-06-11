CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"calls_handled" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_authentications" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" varchar(50) NOT NULL,
	"service" varchar(100) NOT NULL,
	"api_key" varchar(512),
	"secret_key" varchar(512),
	"access_token" varchar(512),
	"refresh_token" varchar(512),
	"token_expiry" timestamp,
	"config" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone_number" varchar,
	"endpoint" varchar,
	"status" varchar DEFAULT 'active',
	"priority" integer DEFAULT 1,
	"daily_cap" integer DEFAULT 100,
	"concurrency_limit" integer DEFAULT 5,
	"acceptance_rate" varchar DEFAULT '95%',
	"avg_response_time" integer DEFAULT 200,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" integer NOT NULL,
	"buyer_id" integer,
	"action" varchar(50) NOT NULL,
	"response" text,
	"response_time" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer,
	"buyer_id" integer,
	"call_sid" varchar(100),
	"from_number" varchar(20) NOT NULL,
	"to_number" varchar(20) NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) NOT NULL,
	"call_quality" varchar(20),
	"recording_url" varchar(512),
	"recording_sid" varchar(100),
	"recording_status" varchar(50),
	"recording_duration" integer,
	"transcription" text,
	"transcription_status" varchar(50),
	"cost" numeric(10, 4) DEFAULT '0.0000',
	"revenue" numeric(10, 4) DEFAULT '0.0000',
	"geo_location" varchar(100),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_buyers" (
	"campaign_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "campaign_buyers_campaign_id_buyer_id_pk" PRIMARY KEY("campaign_id","buyer_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"phone_number" varchar(20),
	"routing_type" varchar(50) DEFAULT 'round_robin' NOT NULL,
	"max_concurrent_calls" integer DEFAULT 5 NOT NULL,
	"call_cap" integer DEFAULT 100 NOT NULL,
	"geo_targeting" text[],
	"timezone_restriction" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"friendly_name" varchar(64),
	"phone_number_sid" varchar(100) NOT NULL,
	"account_sid" varchar(100) NOT NULL,
	"country" varchar(10) DEFAULT 'US' NOT NULL,
	"number_type" varchar(20) NOT NULL,
	"capabilities" text,
	"voice_url" varchar(512),
	"voice_method" varchar(10) DEFAULT 'POST',
	"status_callback" varchar(512),
	"campaign_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"monthly_fee" numeric(10, 4) DEFAULT '1.0000',
	"purchase_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "phone_numbers_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "platform_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"platform" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'disconnected' NOT NULL,
	"auth_id" integer,
	"config" text,
	"sync_enabled" boolean DEFAULT false NOT NULL,
	"last_sync" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"publisher_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"custom_payout" numeric(10, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"payout_type" text DEFAULT 'per_call' NOT NULL,
	"payout_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"min_call_duration" integer DEFAULT 0,
	"allowed_targets" text[],
	"tracking_settings" text,
	"total_calls" integer DEFAULT 0,
	"total_payout" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_pixels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"pixel_type" varchar(50) NOT NULL,
	"fire_on_event" varchar(50) NOT NULL,
	"code" text NOT NULL,
	"assigned_campaigns" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "url_parameters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"parameter" varchar(100) NOT NULL,
	"description" text,
	"value" varchar(256) NOT NULL,
	"campaign_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"password" text NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"url" varchar(512) NOT NULL,
	"events" text[] NOT NULL,
	"headers" text,
	"secret" varchar(256),
	"retry_count" integer DEFAULT 3 NOT NULL,
	"timeout" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_config_id" integer NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" text,
	"response" text,
	"status_code" integer,
	"attempt" integer DEFAULT 1 NOT NULL,
	"success" boolean NOT NULL,
	"error" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_buyers" ADD CONSTRAINT "campaign_buyers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_buyers" ADD CONSTRAINT "campaign_buyers_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_integrations" ADD CONSTRAINT "platform_integrations_auth_id_api_authentications_id_fk" FOREIGN KEY ("auth_id") REFERENCES "public"."api_authentications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_campaigns" ADD CONSTRAINT "publisher_campaigns_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_campaigns" ADD CONSTRAINT "publisher_campaigns_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publishers" ADD CONSTRAINT "publishers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "url_parameters" ADD CONSTRAINT "url_parameters_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_config_id_webhook_configs_id_fk" FOREIGN KEY ("webhook_config_id") REFERENCES "public"."webhook_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");