# CallCenter Pro - Replit Markdown

## Overview

CallCenter Pro is a comprehensive call center management platform built with React, Express.js, and PostgreSQL. The system enables businesses to manage inbound call campaigns, route calls to buyers/agents, track performance metrics, and integrate with external services like Twilio for voice communications.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for fast development and building

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Custom session-based authentication system
- **Voice Integration**: Twilio SDK for call handling and webhooks

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Supabase
- **ORM**: Drizzle ORM for type-safe database operations
- **Session Storage**: PostgreSQL sessions table
- **Schema Management**: Drizzle Kit for migrations

## Key Components

### Call Management System
- **Campaign Management**: Create and manage call campaigns with phone number assignments
- **Call Routing**: Intelligent routing system supporting priority-based, round-robin, and pool-based routing
- **Number Pool Management**: Dynamic number insertion (DNI) with exclusive number assignments
- **Buyer/Agent Management**: Configure buyers and agents with capacity limits and priorities

### Twilio Integration
- **Voice Webhooks**: Handle incoming calls at `/api/webhooks/voice`
- **Call Status Tracking**: Monitor call progress and completion
- **Recording Management**: Automatic call recording with URL generation
- **Number Provisioning**: Search and purchase phone numbers through Twilio API

### Campaign Routing Types
- **Direct Routing**: Single phone number per campaign
- **Pool-based Routing**: Dynamic number assignment from managed pools
- **Priority-based Selection**: Route calls based on buyer/agent priority levels
- **Capacity Management**: Respect concurrent call limits per buyer/agent

### Analytics and Tracking
- **Call Logs**: Detailed tracking of all call routing decisions
- **Performance Metrics**: Campaign statistics, success rates, and buyer performance
- **DNI Tracking**: Dynamic number insertion for campaign attribution
- **Pixel Integration**: Postback pixels for external system integration

## Data Flow

### Incoming Call Flow
1. **Call Received**: Twilio webhook hits `/api/webhooks/voice` endpoint
2. **Campaign Lookup**: System identifies campaign by phone number or pool assignment
3. **Buyer Selection**: CallRouter selects best available buyer using priority and capacity rules
4. **Call Connection**: TwiML response connects caller to selected buyer
5. **Call Tracking**: Real-time status updates and recording management

### Campaign Setup Flow
1. **Campaign Creation**: Define routing type (direct or pool-based)
2. **Number Assignment**: Either assign direct number or connect to number pool
3. **Buyer Configuration**: Add buyers with priorities and capacity limits
4. **Webhook Setup**: Configure Twilio webhooks for assigned numbers

### Pool Management Flow
1. **Pool Creation**: Create number pools with unique names per user
2. **Number Assignment**: Assign numbers exclusively to one pool (prevents conflicts)
3. **Campaign Assignment**: Connect campaigns to pools for dynamic routing
4. **Webhook Updates**: Automatically configure pool-based webhook URLs

## External Dependencies

### Core Services
- **Twilio**: Voice communication, number provisioning, and webhooks
- **Supabase**: PostgreSQL database hosting
- **Neon Database**: Alternative PostgreSQL provider support

### NPM Packages
- **Express**: Web framework
- **Drizzle ORM**: Database operations
- **React Query**: Client-side data fetching
- **Zod**: Runtime type validation
- **React Hook Form**: Form management

### UI Components
- **Radix UI**: Headless UI components
- **shadcn/ui**: Pre-built component library
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Development**: `npm run dev` on port 5000
- **Production Build**: Vite build + esbuild for server bundling
- **Autoscale**: Configured for automatic scaling on deployment

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `SESSION_SECRET`: Session encryption key

### Database Management
- **Schema**: Defined in `shared/schema.ts`
- **Migrations**: Managed through Drizzle Kit
- **Connection**: Neon serverless PostgreSQL client

## Recent Changes
- July 15, 2025: **CLAUDE AI INTEGRATION** - Implemented intelligent AI chatbot powered by Claude for user support and project assistance
  - Integrated Claude Sonnet 4 API for intelligent responses about CallCenter Pro features and functionality
  - Created comprehensive ChatbotService with project context awareness and file search capabilities
  - Enhanced feedback page with "Powered by Claude" branding and improved user experience
  - AI provides contextual answers about campaigns, RTB system, call routing, and project progress
  - Responses use simple, non-technical language suitable for business users
  - All conversations stored as feedback for continuous system improvement
  - Fallback to basic responses if Claude API unavailable
- July 15, 2025: **DOCUMENTATION UPDATE** - Updated comprehensive help documentation and RTB analytics improvements
  - Enhanced RTB analytics to display target names instead of generic IDs (e.g., "Premium Bid" instead of "Target 18")
  - Added new RTB system tab to in-app help documentation with detailed explanations
  - Updated main documentation with security section highlighting multi-tenancy improvements
  - Added RTB analytics enhancements and recent improvements section
  - **TWILIO INTEGRATION UPDATE**: Updated documentation to reflect managed Twilio service
    - Users no longer need to create or configure Twilio accounts
    - Phone numbers are provisioned and managed automatically by the system
    - All webhooks and voice configurations are handled internally
    - Updated both in-app help and main documentation to reflect managed service model
- July 15, 2025: **CRITICAL SECURITY FIX** - Resolved multi-tenancy vulnerability and implemented comprehensive user-scoped data filtering
  - Fixed critical security issue where users could access other accounts' campaigns, buyers, RTB targets, and calls
  - Added proper authentication requirements (`requireAuth`) to all sensitive endpoints
  - Implemented user ID filtering in storage layer for: campaigns, buyers, RTB targets, RTB routers, and calls
  - Enhanced campaign-buyer relationship endpoints with ownership validation
  - Updated storage interface methods to support user-scoped data access
  - All endpoints now properly filter data to only show resources belonging to the authenticated user
  - Created comprehensive security test suite to verify authentication and data isolation
  - System now properly enforces multi-tenant security across all user-accessible resources
  - **REMOVED DANGEROUS DATABASE OPERATIONS** - Eliminated database clearing functionality from settings page and API endpoints
  - Removed standalone "Website Tracking" page since DNI functionality is integrated within campaigns
  - Simplified settings page to show only system information and status (no destructive operations)
- July 14, 2025: Created comprehensive API documentation covering all system endpoints and integration methods
  - Added complete API reference with request/response examples for all major endpoints
  - Documented authentication flow, error handling, and rate limiting
  - Included RTB system APIs with template variables and JSONPath parsing
  - Added DNI tracking APIs with session management and attribution
  - Provided SDK examples for JavaScript and Python integration
  - Covered webhook integration for Twilio and RTB systems
- July 14, 2025: Fixed RTB Target form by removing misleading "Number" field since destination comes from bid responses
  - Removed static "Number" and "Type" fields from RTB Target creation form
  - Eliminated confusion between static destination numbers and dynamic bid response destinations
  - RTB system now correctly uses destination numbers from external bidder responses (not static form fields)
  - Simplified form validation and removed unnecessary phone number requirements
  - Fixed architectural issue where users incorrectly assumed they needed to provide destination numbers
  - Removed "Buyer" column from RTB Targets table since RTB targets are now standalone entities
  - Updated table display to show "External Endpoint" type and endpoint URLs for clarity
- July 14, 2025: Completed RTB Target architectural simplification by removing buyer dependency
  - Removed buyer_id foreign key from rtb_targets table as it was misleading since RTB routing bypasses internal buyers
  - Added dedicated contact information fields: company_name, contact_person, contact_email, contact_phone
  - Updated Enhanced RTB Target Dialog to use contact information instead of buyer selection
  - Simplified RTB Target creation form by removing confusing buyer association
  - RTB Targets are now standalone entities with their own contact details for external bidders
  - This change makes the RTB system more intuitive: external bidders provide their own routing destinations
- July 7, 2025: Successfully implemented external destination routing for RTB winning bidders
  - Fixed RTB routing logic to use external bidder destination numbers instead of internal buyer phone numbers
  - Updated both webhook endpoints (/api/webhooks/voice and /api/webhooks/pool/{poolId}/voice) with external routing
  - Created virtual buyer objects with destinationNumber from winning bid responses  
  - Enhanced console logging to show "Routing to EXTERNAL: [destinationNumber]" for clarity
  - Successfully tested external routing: calls now route to +1800555EXTERNAL from winning bidders
  - RTB system now properly routes calls to external insurance companies, lead buyers, and partners
- July 7, 2025: Fixed RTB test bidding endpoint and achieved full RTB system operational status
  - Fixed test bidding endpoint parameter mapping (minBid/maxBid vs minBidAmount/maxBidAmount)
  - Resolved RTB auction failures due to invalid bid amounts below minimum thresholds
  - Enhanced RTB router deletion with proper foreign key constraint handling and detailed error messages
  - Verified RTB system working end-to-end: auction → winner selection → call routing to external destinations
  - Successfully demonstrated RTB winning bids ($4.51 vs $2.74) with proper destination routing (+917208280595)
  - RTB system now fully operational with complete bidding, routing, and management functionality
- July 7, 2025: Successfully implemented complete RTB target assignment system and live bidding functionality
  - Built comprehensive target assignment interface in router edit dialog with checkboxes and priority controls
  - Created working test bidding endpoint for external RTB target validation and testing
  - Fixed bid response validation and handling for proper RTB auction processing
  - Successfully demonstrated live RTB bidding with winning bid selection and call routing
  - RTB system now fully operational with real-time bidding, winner selection, and live call routing to winning buyers
- July 7, 2025: Implemented comprehensive RTB target deletion and fixed router assignments
  - Fixed RTB target deletion to properly handle foreign key constraints (router assignments)
  - Added "Clear All" button for bulk RTB target deletion with user confirmation
  - Created `/api/rtb/targets/clear-all` endpoint for safe bulk operations
  - Fixed RTB system requiring targets to be assigned to routers for bidding
  - Enhanced RTB management UI with improved deletion workflow and error handling
- July 7, 2025: Enhanced RTB Target form UX and prevented duplicate submissions
  - Fixed auto-population of phone numbers when buyer is selected in RTB Target creation
  - Moved bid amount fields (Min/Max Bid Amount, Currency) to Basic tab for easier access
  - Added form submission protection to prevent duplicate RTB targets from double-clicking
  - Enhanced form validation with proper number inputs and currency selection
  - Improved user experience with loading states and disabled buttons during submission
- July 3, 2025: Implemented enterprise-level RTB ID system
  - Added `rtb_id` VARCHAR(32) UNIQUE column to campaigns table for external RTB operations
  - Built RTB ID generation service with crypto-secure 32-character hexadecimal IDs
  - Updated RTB service to use RTB IDs for external bid requests while keeping numeric IDs for internal operations
  - Auto-generates RTB IDs when RTB is enabled on campaigns (create or update)
  - Added admin RTB ID lookup endpoint for debugging and support (`/api/internal/campaigns/rtb-lookup/{rtbId}`)
  - Enhanced phone number dropdown with availability status indicators (Available/Campaign/Pool assignments)
  - Dual-ID architecture: numeric campaign IDs for database operations, hex RTB IDs for external bidders
- July 3, 2025: Fixed critical campaign editing bug and completed RTB integration
  - Fixed campaign form to properly update existing campaigns instead of creating duplicates
  - Added separate create vs update mutations with proper HTTP methods (POST vs PUT)
  - Implemented RTB toggle switch and router dropdown in campaign forms
  - Added RTB status badges throughout campaign interface (cards and table views)
  - Enhanced form validation requiring RTB router selection when RTB is enabled
  - Campaign editing now properly preserves existing data while allowing RTB configuration changes
- July 1, 2025: Implemented comprehensive Real-Time Bidding (RTB) system
  - Created complete 5-table RTB database schema with proper foreign key relationships
  - Added RTB columns to campaigns table (rtb_router_id, enable_rtb) for campaign-level RTB control
  - Implemented full RTB storage layer with CRUD operations for all RTB entities
  - Created RTB API endpoints for managing targets, routers, assignments, and bid tracking
  - Built RTB service with auction logic, bid request/response handling, and performance metrics
  - All RTB tables successfully created: rtb_targets, rtb_routers, rtb_router_assignments, rtb_bid_requests, rtb_bid_responses
  - System now supports enterprise-level real-time call auction functionality
- June 30, 2025: Implemented automatic campaign validation and status management
  - Fixed campaign status validation to automatically pause campaigns when last buyer is removed
  - Enhanced cache invalidation for real-time status updates in frontend
  - Prevents active campaigns from operating without proper buyer configuration
  - Ensures data integrity in call routing by maintaining valid campaign states
- June 26, 2025: Completed DNI system implementation and resolved route conflicts
  - Fixed conflicting route handlers preventing tracking tag functionality
  - Successfully integrated Call Tracking Tags with Dynamic Number Insertion
  - Verified external website integration with CORS support
  - Confirmed pool-based number assignment working correctly
  - All tracking tag features now operational including JavaScript generation

## Changelog
- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.