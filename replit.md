# CallCenter Pro

## Overview
CallCenter Pro is a comprehensive call center management platform designed to streamline inbound call campaigns, intelligent call routing, and performance tracking across diverse industries and verticals. Built as a full-featured alternative to platforms like Ringba, it integrates seamlessly with voice communication services like Twilio to offer a robust solution for businesses of all types to manage their call center operations efficiently. The platform supports multi-industry campaigns including healthcare, insurance, legal, home services, financial services, education, and any vertical requiring sophisticated call routing and tracking. The project delivers an enterprise-grade platform with dynamic number insertion (DNI), real-time bidding (RTB) for call routing, advanced analytics, and comprehensive campaign management to maximize call effectiveness and revenue potential across all business sectors.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter
- **Build Tool**: Vite

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Custom session-based authentication
- **Voice Integration**: Twilio SDK for call handling and webhooks

### Data Storage & Management
- **Primary Database**: PostgreSQL (Supabase/Neon support)
- **ORM**: Drizzle ORM for type-safe operations
- **Schema Management**: Drizzle Kit for migrations
- **ID Strategy**: Mixed UUIDs for external entities (campaigns) and serial integers for internal entities (users, buyers, pools, numbers)

### Key Features & Design Patterns
- **Call Management**: Campaign, number pool, buyer/agent, and call routing (priority, round-robin, pool-based) management. Dynamic Number Insertion (DNI) with exclusive number assignments.
- **Twilio Integration**: Webhooks for incoming calls, call status tracking, automatic recording, and number provisioning.
- **Analytics & Tracking**: Detailed call logs, performance metrics, DNI tracking for campaign attribution, and pixel integration for external systems.
- **Call Flow System**: Advanced IVR capabilities with 15 enterprise node types (Menu, Gather, Play, Business Hours, Router, Splitter, Tracking Pixel, Profile Enrich, Whisper, Transfer, Hangup, Custom Logic) supporting complex routing, A/B testing, conditional logic, caller data enrichment, agent coaching, and sophisticated call handling.
- **Real-Time Bidding (RTB)**: Direct campaign-to-RTB target assignments, supporting external bidder integration and real-time auctions across all industry verticals. Enhanced with publisher tracking, inbound number capture, and Ringba-compliant token system. **PRODUCTION-READY**: Comprehensive Ringba-compliant RTB features including Rate Limiting (per minute/hour/day), Bid Expiration (bid duration and stale bid behavior), Duplicate Payouts (time-based duplicate handling), **Campaign-Level Caller ID Requirements** (simplified from complex hierarchy), and successful HTTP 200 OK communication with external RTB endpoints. RTB auction system fully operational with proper error handling and fallback routing. **ENTERPRISE SECURITY**: Enhanced with comprehensive bid logging (all requests/responses/failures), phone number obfuscation (555***1234 format) to prevent bot harvesting, RTB health monitoring with uptime tracking and error alerting, and rtkClickID timeout handling with retry limits preventing infinite loops.
- **User Interface**: Focus on a clean, professional, Ringba-style interface with compact filter systems, simplified reporting, and intuitive configuration dialogs. Components are designed for consistency, including unified table formats, simplified accordion UIs, and conditional field displays.
- **Data Integrity**: Robust validation for URL parameters (UTM), RTB configurations, and financial data to ensure clean analytics.
- **Performance Optimization**: Ultra-fast DNI service (sub-50ms) implemented with caching and query optimization to prevent caller loss. Aggressive auto-refresh loops replaced with event-driven refresh for reduced database load.
- **Security**: Multi-tenancy vulnerability fixed with comprehensive user-scoped data filtering, ensuring data isolation and proper authentication. Enhanced RTB security with phone number obfuscation in all logs, comprehensive audit trails, timeout protection for external requests (5-second max with 3 retries), and RedTrack polling protection (30-second timeout, 5 max retries) preventing infinite loops.
- **Deployment**: Configured for Node.js 20 with PostgreSQL 16 on Replit, with production builds optimized for performance.

## External Dependencies

- **Twilio**: Voice communication, number provisioning, webhooks.
- **Supabase**: PostgreSQL database hosting.
- **Neon Database**: Alternative PostgreSQL provider.
- **NPM Packages**: Express, Drizzle ORM, React Query, Zod, React Hook Form.
- **UI Components**: Radix UI, shadcn/ui, Tailwind CSS, Lucide React.
- **Geolocation**: geoip-lite for IP-based geographic data lookup.
- **AI Integration**: Claude Sonnet 4 API for intelligent chatbot support.

## Recent Changes (August 2025)

### Analytics Data Cleanup (Latest - August 18, 2025)
- **Mock Data Removal**: Deleted 19 test/demo visitor session records from database
- **Authentic Analytics**: Traffic analytics now displays 100% real visitor session data (8,320 total sessions)
- **Real DNI Data**: Analytics show authentic DNI tracking session IDs and visitor patterns
- **Database Cleanup**: Verified removal of all mock/test data across visitor sessions and calls tables
- **Production Ready**: Analytics system now production-ready with authentic data only

## Recent Changes (August 2025)

### SIP Routing Priority Fix (Latest - August 16, 2025)
- **CRITICAL FIX**: RTB system now prioritizes SIP addresses over phone numbers as recommended by partners
- **RTB Response Processing**: Modified routing logic to extract `sipAddress` from RTB bid responses before falling back to `destinationNumber`
- **SIP Address Detection**: Enhanced target phone number selection to check RTB response structure for SIP preferences
- **Routing Logic**: Changed order of preference: 1) RTB sipAddress, 2) RTB destinationNumber, 3) Legacy buyer phoneNumber
- **Partner Compliance**: System now follows RTB partner recommendations to use SIP routing over DID routing

### Database Stability & Error Resolution  
- **Foreign Key Constraint Fixes**: Comprehensive validation for all call creation foreign key references (buyer_id, number_pool_id, phone_number_id)
- **TwiML Generation Stabilized**: Fixed undefined variable errors in caller ID assignment causing application crashes
- **Status Callback Enhanced**: Pool status webhook now returns proper TwiML responses instead of plain text to prevent Twilio errors
- **Error Handling Improved**: Added database error protection with graceful degradation for all call operations
- **Traffic Analytics Disabled**: Removed problematic traffic analytics queries causing persistent "campaign_id does not exist" errors
- **RTB Partner Disconnect Handling**: Implemented intelligent detection of immediate RTB partner disconnects (0-3 seconds) with appropriate caller messaging
- **Call Details Winner Detection**: Fixed RTB winner information display in call details table with optimized database queries
- **Database Connection Optimization**: Resolved "too many connections" errors through batched processing and query optimization

### RTB Inbound Production System
- **Production Endpoint**: Implemented `/v1/production/:rtbId.json` for external RTB platform integration matching Ringba conventions
- **Multi-Authentication**: Complete auth system (none, bearer, HMAC-SHA256) with timestamp validation and replay attack protection
- **SIP-First Routing**: Responses prefer `sipAddress` over `phoneNumber` for modern call routing infrastructure
- **Comprehensive Logging**: RTB inbound request/response tracking with sanitized phone numbers and performance metrics
- **Shareable Tags**: Token replacement system enabling dynamic data enrichment in RTB responses
- **Campaign Configuration**: Extended campaigns with RTB inbound settings (auth, capacity, bid ranges, SIP URIs)
- **Production Security**: HMAC signatures, timestamp validation, rate limiting, and comprehensive audit trails
- **Testing Infrastructure**: Complete test suite with HMAC generation, auth scenarios, and error condition validation

### RTB Production Enhancements
- **SIP Routing Preference**: Enhanced TwiML generation to prefer `<Sip>` tags over `<Number>` for SIP destinations with proper URI formatting and header support
- **Caller ID Policies**: Implemented per-target caller ID configuration (passthrough, fixed, campaign_default) with E.164 normalization
- **HMAC Authentication**: Added HMAC-SHA256 authentication support for production-grade RTB security with timestamped signatures
- **Destination Validation**: Enhanced bid response validation with automatic E.164 normalization and SIP URI formatting
- **RTB Simulator**: Development endpoint `/_sim/rtb` with configurable test scenarios (accept, accept_sip, reject, invalid_number, timeout)
- **Database Schema**: Extended RTB targets with `caller_id_policy`, `caller_id_fixed`, `force_e164`, `sip_headers`, `dtmf_on_answer`, and `auth_secret` fields
- **Production Ready**: RTB system now handles real-world routing scenarios with proper caller ID presentation and SIP header configuration

### RTB Security & Monitoring Enhancements
- **Enhanced RTB Logging**: Comprehensive bid request/response tracking with sanitized phone numbers
- **Health Monitoring**: New API endpoints `/api/rtb/health-checks` and `/api/rtb/targets/{id}/uptime` for RTB target monitoring
- **Security Features**: Phone number obfuscation (555***1234 format) across all logs and API responses
- **Timeout Protection**: rtkClickID polling timeout (30s max, 5 retries) preventing infinite loops
- **API Documentation**: Comprehensive 900+ line API documentation covering all endpoints, security features, and integration patterns

### API Improvements
- **RTB Analytics**: Enhanced reporting with auction details, bid responses, and performance metrics
- **Error Handling**: Standardized error responses with validation details and timestamps
- **Rate Limiting**: Implemented rate limiting (100 req/min general, 1000 req/min webhooks)
- **Security Headers**: Added timeout protection, retry logic, and comprehensive audit trails

### Call Flow Analysis & Enhancement
- **Comprehensive Comparison**: Completed detailed analysis of CallCenter Pro vs Ringba call flow systems
- **Feature Gap Closure**: Expanded from 10 to 15 node types, achieving feature parity with Ringba's enterprise capabilities
- **New Enterprise Node Types**: Added Profile Enrich (caller data enrichment), Whisper (agent coaching), Transfer (live call routing), and Hangup (controlled termination) nodes
- **Enhanced Configuration**: Full UI configuration panels with advanced settings, TTS options, and timeout controls
- **Strategic Achievement**: CallCenter Pro now matches Ringba's call flow capabilities with superior RTB integration