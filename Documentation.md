# CallCenter Pro - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Features](#core-features)
4. [Campaign Management](#campaign-management)
5. [Call Routing System](#call-routing-system)
6. [Number Pool Management](#number-pool-management)
7. [Dynamic Number Insertion (DNI)](#dynamic-number-insertion-dni)
8. [Real-Time Bidding (RTB) System](#real-time-bidding-rtb-system)
9. [Advanced Call Flow System](#advanced-call-flow-system)
10. [Twilio Integration](#twilio-integration)
11. [API Documentation](#api-documentation)
12. [Database Schema](#database-schema)
13. [AI Help System](#ai-help-system)
14. [Security and Multi-Tenancy](#security-and-multi-tenancy)
15. [Setup and Configuration](#setup-and-configuration)
16. [Testing Guide](#testing-guide)
17. [Troubleshooting](#troubleshooting)
18. [Recent Updates](#recent-updates)

---

## Overview

CallCenter Pro is a production-ready, enterprise-grade call center management platform designed for businesses that need intelligent call routing, campaign management, and real-time bidding capabilities. The system combines modern web technologies with enterprise-grade telephony integration to provide a comprehensive solution for call center operations.

### Key Capabilities

- **Intelligent Call Routing**: Priority-based, round-robin, and pool-based routing algorithms
- **Campaign Management**: Create and manage call campaigns with multiple routing strategies
- **Dynamic Number Insertion (DNI)**: Track campaign performance with dynamic phone number assignment
- **Real-Time Bidding (RTB)**: Enterprise-level auction system for call distribution with live analytics
- **Advanced Call Flow System**: Visual flow builder with IVR, business hours, and traffic splitting
- **Number Pool Management**: Exclusive number assignment with conflict prevention
- **Twilio Integration**: Full voice communication capabilities with webhooks
- **Analytics & Reporting**: Comprehensive performance tracking with target name resolution
- **Multi-Tenant Security**: Complete user isolation with secure data access controls
- **AI-Powered Help System**: Claude-powered chatbot with project-specific knowledge and code search
- **Enterprise Features**: Production-ready with comprehensive security testing

### Target Users

- **Call Center Managers**: Optimize call routing and agent productivity
- **Marketing Teams**: Track campaign performance with DNI and attribution
- **Lead Generation Companies**: Distribute calls to buyers through RTB auctions
- **Insurance Companies**: Route calls to appropriate agents based on criteria
- **Sales Organizations**: Manage inbound leads and call distribution

---

## System Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- TanStack React Query for state management
- Wouter for client-side routing
- Vite for build and development

**Backend:**
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Express sessions with PostgreSQL storage
- Custom authentication system
- RESTful API architecture

**External Services:**
- Twilio for voice communications
- Supabase for PostgreSQL hosting
- Neon Database support

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utility functions
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Data access layer
│   ├── rtb-service.ts      # RTB auction logic
│   ├── dni-service.ts      # DNI functionality
│   └── call-routing.ts     # Call routing algorithms
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema definitions
└── migrations/             # Database migrations
```

---

## Core Features

### 1. Campaign Management

**Create and Configure Campaigns:**
- Define campaign name, description, and routing strategy
- Set phone numbers (direct or pool-based)
- Configure buyer/agent assignments
- Enable RTB for auction-based routing
- Set campaign status (active, paused, completed)

**Routing Types:**
- **Direct Routing**: Single phone number per campaign
- **Pool-based Routing**: Dynamic number assignment from managed pools
- **RTB Routing**: Real-time auction-based call distribution

### 2. Buyer/Agent Management

**Buyer Configuration:**
- Contact information and company details
- Phone numbers and routing priorities
- Capacity limits (concurrent calls, daily caps)
- Schedule and availability settings
- Performance tracking and metrics

**Agent Routing:**
- Skills-based routing
- Availability status management
- Call assignment and tracking
- Performance metrics and reporting

### 3. Call Tracking and Analytics

**Real-time Metrics:**
- Active campaigns and call volume
- Success rates and conversion tracking
- Response times and routing efficiency
- Revenue tracking and reporting

**Historical Analysis:**
- Campaign performance over time
- Buyer/agent productivity metrics
- Call outcome analysis
- ROI and cost-per-call calculations

---

## Campaign Management

### Creating a Campaign

1. **Basic Information**
   - Campaign name and description
   - Select routing type (Direct, Pool, RTB)
   - Set campaign status

2. **Phone Number Assignment**
   - **Direct**: Assign a specific phone number
   - **Pool**: Select from available number pools
   - **RTB**: Configure auction parameters

3. **Buyer Configuration**
   - Add buyers with contact information
   - Set routing priorities (1-10)
   - Configure capacity limits
   - Set schedule restrictions

4. **Advanced Settings**
   - Enable/disable call recording
   - Set timeout values
   - Configure webhook URLs
   - Enable tracking pixels

### Campaign Status Management

- **Active**: Campaign accepts and routes calls
- **Paused**: Campaign temporarily stopped
- **Completed**: Campaign finished and archived
- **Draft**: Campaign being configured

### Campaign Validation

The system automatically validates:
- At least one active buyer is assigned
- Phone numbers are properly configured
- Webhook URLs are accessible
- Capacity limits are reasonable

---

## Call Routing System

### Routing Algorithms

**1. Priority-Based Routing**
- Routes calls to highest priority available buyer
- Considers capacity limits and availability
- Fallback to lower priority buyers when needed

**2. Round-Robin Routing**
- Distributes calls evenly among available buyers
- Tracks last assignment for fair distribution
- Respects capacity limits and schedules

**3. Pool-Based Routing**
- Assigns tracking numbers dynamically from pools
- Prevents number conflicts between campaigns
- Supports campaign-specific number assignment

### Routing Decision Factors

- **Buyer Priority**: Higher priority buyers receive calls first
- **Availability**: Only route to available buyers
- **Capacity Limits**: Respect concurrent call limits
- **Schedule**: Honor time-based restrictions
- **Geographic**: Route based on caller location (optional)

### Routing Metrics

- **Success Rate**: Percentage of successfully routed calls
- **Average Response Time**: Time to connect calls
- **Buyer Utilization**: Capacity usage per buyer
- **Fallback Rate**: Calls routed to secondary buyers

---

## Number Pool Management

### Pool Concepts

**Number Pools** are collections of phone numbers that can be dynamically assigned to campaigns for tracking purposes. Each pool ensures exclusive number assignment to prevent conflicts.

### Pool Features

- **Exclusive Assignment**: Numbers can only belong to one pool
- **Dynamic Allocation**: Numbers assigned on-demand
- **Conflict Prevention**: System prevents duplicate assignments
- **Webhook Management**: Automatic webhook configuration

### Pool Management

**Creating Pools:**
1. Define pool name (unique per user)
2. Add phone numbers to the pool
3. Configure webhook settings
4. Set pool status (active/inactive)

**Number Assignment:**
- Numbers automatically assigned from available pool
- Exclusive assignment prevents conflicts
- Webhook URLs updated automatically
- Assignment tracking for analytics

**Pool Analytics:**
- Number utilization rates
- Assignment history
- Performance metrics per number
- Pool efficiency reporting

---

## Dynamic Number Insertion (DNI)

### DNI Overview

Dynamic Number Insertion allows websites to display different phone numbers based on traffic source, enabling precise campaign attribution and tracking.

### DNI Components

**1. Tracking Tags**
- Created for each campaign or traffic source
- Generate unique JavaScript code
- Track visitor sessions and attribution

**2. JavaScript SDK**
- Lightweight client-side tracking
- Automatic phone number replacement
- Session management and persistence

**3. Attribution Tracking**
- UTM parameter capture
- Referrer tracking
- Session-based attribution

### DNI Implementation

**Step 1: Create Tracking Tag**
```javascript
// Generated tracking code
<script>
(function() {
  const tagCode = 'campaign_landing_page';
  const apiUrl = 'https://your-domain.com/api/dni/track';
  
  // Track visitor and get phone number
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tagCode: tagCode,
      sessionId: generateSessionId(),
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      // UTM parameters automatically captured
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Replace phone numbers on page
      document.querySelectorAll('.phone-number').forEach(el => {
        el.textContent = data.formattedNumber;
      });
    }
  });
})();
</script>
```

**Step 2: HTML Integration**
```html
<!-- Phone number placeholder -->
<span class="phone-number">+1-800-DEFAULT</span>

<!-- Or direct integration -->
<div id="dynamic-phone">Loading...</div>
```

**Step 3: Attribution Tracking**
- Automatic UTM parameter capture
- Session persistence across page views
- Call attribution to original source

### DNI Analytics

- **Source Attribution**: Track calls by traffic source
- **Campaign Performance**: Measure conversion rates
- **Session Analysis**: Understand visitor behavior
- **ROI Calculation**: Cost per call and conversion

---

## Real-Time Bidding (RTB) System

### RTB Overview

The Real-Time Bidding system enables auction-based call distribution, allowing multiple buyers to compete for incoming calls in real-time. The system features comprehensive analytics with target name resolution for better tracking and reporting.

### Recent Improvements

**July 15, 2025:**
- **Enhanced Analytics**: RTB analytics now display target names instead of generic IDs
- **Improved User Experience**: Bid request details show meaningful target names like "Premium Bid" instead of "Target 18"
- **Better Tracking**: Winning target display uses actual target names for clearer reporting
- **Enhanced Visibility**: Individual bid responses show target names for better understanding

### RTB Components

**1. RTB Targets**
- External bidding endpoints
- Authentication and security
- Bid request/response handling
- Response parsing configuration

**2. RTB Routers**
- Auction orchestration
- Bidder management
- Timeout handling
- Winner selection

**3. Bid Requests**
- Standardized bid request format
- Template variable substitution
- Custom field support
- Multiple format support

**4. Bid Responses**
- Flexible response parsing
- JSONPath field extraction
- Validation and verification
- Winner determination

### RTB Configuration

**Creating RTB Targets:**

1. **Basic Information**
   - Target name and company details
   - Contact information
   - Endpoint URL and authentication

2. **Request Configuration**
   - HTTP method and content type
   - Request body template with variables
   - Authentication headers
   - Timeout settings

3. **Response Parsing**
   - JSONPath field mapping
   - Bid amount extraction
   - Destination number parsing
   - Acceptance verification

4. **Capacity Management**
   - Concurrent call limits
   - Daily/hourly/monthly caps
   - Bid amount ranges
   - Currency settings

### RTB Request Template Variables

The system supports dynamic variable substitution in request templates:

```json
{
  "requestId": "{requestId}",
  "campaignId": "{campaignId}",
  "callerId": "{callerId}",
  "callStartTime": "{callStartTime}",
  "bidParams": {
    "minBid": "{minBid}",
    "maxBid": "{maxBid}",
    "currency": "{currency}"
  },
  "location": {
    "state": "{callerState}",
    "zip": "{callerZip}"
  },
  "timestamp": "{timestamp}"
}
```

**Available Variables:**
- `{requestId}` - Unique request identifier
- `{campaignId}` - Campaign RTB ID
- `{callerId}` - Caller's phone number
- `{callStartTime}` - Call start timestamp
- `{minBid}` - Minimum bid amount
- `{maxBid}` - Maximum bid amount
- `{currency}` - Currency code
- `{callerState}` - Caller's state
- `{callerZip}` - Caller's ZIP code
- `{timestamp}` - Current timestamp
- `{isoTimestamp}` - ISO formatted timestamp

### RTB Response Parsing

The system supports multiple response formats through configurable JSONPath expressions:

**Standard Response Format:**
```json
{
  "bidAmount": 8.75,
  "destinationNumber": "+1800555BUYER",
  "accepted": true,
  "currency": "USD",
  "duration": 60
}
```

**Nested Response Format:**
```json
{
  "data": {
    "bid": {
      "amount": 8.75,
      "currency": "USD"
    },
    "routing": {
      "phone": "+1800555BUYER",
      "accepted": true
    },
    "requirements": {
      "duration": 60
    }
  }
}
```

**Response Field Mapping:**
- `bidAmountPath`: Extract bid amount (e.g., "bidAmount" or "data.bid.amount")
- `destinationNumberPath`: Extract destination phone (e.g., "destinationNumber" or "data.routing.phone")
- `acceptancePath`: Check bid acceptance (e.g., "accepted" or "data.routing.accepted")
- `currencyPath`: Extract currency (e.g., "currency" or "data.bid.currency")
- `durationPath`: Extract duration (e.g., "duration" or "data.requirements.duration")

### RTB Auction Process

1. **Incoming Call**: System receives call webhook
2. **Campaign Lookup**: Identify RTB-enabled campaign
3. **Bidder Selection**: Find assigned RTB targets
4. **Bid Requests**: Send parallel requests to all bidders
5. **Response Collection**: Gather responses within timeout
6. **Bid Validation**: Verify bid amounts and acceptance
7. **Winner Selection**: Choose highest valid bid
8. **Call Routing**: Route call to winning bidder
9. **Tracking**: Log auction results and metrics

### RTB Analytics

- **Auction Performance**: Win rates and response times
- **Bidder Analysis**: Performance metrics per target
- **Revenue Tracking**: Winning bid amounts and trends
- **System Metrics**: Timeout rates and errors

---

## Advanced Call Flow System

### Overview

The Advanced Call Flow System is a comprehensive visual flow builder that enables sophisticated call routing with enterprise-level features. This system supports complex Interactive Voice Response (IVR) scenarios, business hours management, traffic splitting, and comprehensive tracking integration.

### Key Features

**✓ Phase 1: Core Flow Management**
- Visual flow builder with drag-and-drop interface
- 8 specialized node types for different call scenarios
- Real-time flow execution with TwiML generation
- Session management for multi-step interactions

**✓ Phase 2: Live IVR Integration**
- Complete webhook-to-TwiML pipeline
- Live call flow execution with Twilio
- Session persistence across IVR interactions
- Response processing for user input

**✓ Phase 3: Advanced Enterprise Features**
- Enhanced business hours with holiday support
- Advanced traffic splitting with 4 distribution strategies
- Comprehensive tracking integration with pixel firing
- Production-ready advanced routing capabilities

### Node Types

#### 1. Start Node
- Entry point for all call flows
- Configurable with tracking pixels
- Custom session initialization

#### 2. IVR Menu Node
- Interactive voice response with multiple options
- DTMF input handling
- Timeout and retry logic
- Invalid input handling

#### 3. Gather Input Node
- Collect caller information (digits or speech)
- Validation patterns with regex support
- Configurable timeout and retry attempts
- Custom prompts and error messages

#### 4. Play Audio Node
- Text-to-speech or audio URL playback
- Voice selection and speed control
- Loop and repeat options
- Dynamic content with variables

#### 5. Business Hours Node (Enhanced Phase 3)
- Timezone-aware time calculations
- Holiday support with date-based exclusions
- Multiple time ranges per day (lunch breaks)
- Complex schedule management
- Fallback routing for closed hours

#### 6. Advanced Router Node
- Priority-based routing with capacity limits
- Round-robin distribution
- RTB integration for auction-based routing
- Failover and backup routing

#### 7. Traffic Splitter Node (Enhanced Phase 3)
- **Percentage Distribution**: Simple percentage-based splits
- **Weighted Distribution**: Performance-based routing with weights
- **Time-based Rules**: Hour ranges and day-of-week filters
- **Round Robin**: Equal distribution across targets
- Failover support and analytics tracking

#### 8. Tracking Pixel Node (Enhanced Phase 3)
- Pixel firing with template variables
- Analytics events for comprehensive tracking
- Custom parameter mapping
- HTTP timeout and error handling

### Phase 3 Advanced Features

#### Enhanced Business Hours Logic
```javascript
// Business hours configuration
{
  timezone: 'America/New_York',
  businessHours: {
    monday: {
      enabled: true,
      timeRanges: [
        { open: '09:00', close: '12:00' },  // Morning
        { open: '13:00', close: '17:00' }   // Afternoon
      ]
    }
  },
  holidays: [
    { date: '2025-12-25', enabled: true, name: 'Christmas' },
    { date: '2025-01-01', enabled: true, name: 'New Year' }
  ]
}
```

#### Advanced Traffic Splitting
```javascript
// Weighted distribution example
{
  strategy: 'weighted',
  splits: [
    { name: 'Premium Route', weight: 3, nodeId: 'premium' },
    { name: 'Standard Route', weight: 2, nodeId: 'standard' },
    { name: 'Budget Route', weight: 1, nodeId: 'budget' }
  ],
  enableFailover: true,
  enableAnalytics: true
}
```

#### Comprehensive Tracking Integration
```javascript
// Tracking pixel configuration
{
  pixelUrl: 'https://analytics.example.com/track',
  parameters: {
    campaign_id: '{campaign_id}',
    caller_number: '{caller_number}',
    session_id: '{session_id}',
    flow_id: '{flow_id}',
    timestamp: '{timestamp}'
  },
  customPixels: [
    {
      name: 'Conversion Pixel',
      url: 'https://conversion.example.com/pixel',
      parameters: { event: 'call_start', value: '1.00' }
    }
  ]
}
```

### Flow Configuration Interface

The system provides tabbed configuration interfaces for complex node settings:

- **Basic Tab**: Core functionality and primary settings
- **Advanced Tab**: Complex routing rules and failover options
- **Analytics Tab**: Tracking configuration and event selection
- **Validation Tab**: Input validation and error handling
- **Holidays Tab**: Holiday management and special schedules

### Flow Execution Engine

The Flow Execution Engine manages call flow state and coordinates between nodes:

1. **Session Management**: Tracks call state across multiple interactions
2. **Node Execution**: Processes each node type with specialized logic
3. **Response Processing**: Handles user input from gather operations
4. **Tracking Integration**: Fires pixels and analytics events
5. **Error Handling**: Manages failures and fallback scenarios

### TwiML Generation

The system generates production-ready TwiML for various scenarios:

```xml
<!-- IVR Menu Example -->
<Response>
  <Gather input="dtmf" timeout="10" numDigits="1">
    <Say>Press 1 for Sales, 2 for Support, or 3 for Billing</Say>
  </Gather>
  <Redirect>/api/flow/timeout</Redirect>
</Response>

<!-- Business Hours Example -->
<Response>
  <Say>We are currently closed. Please call back during business hours.</Say>
  <Hangup/>
</Response>

<!-- Traffic Splitting Example -->
<Response>
  <Dial timeout="30">
    <Number>+1800555PREMIUM</Number>
  </Dial>
</Response>
```

### Analytics and Tracking

The system provides comprehensive analytics for call flow performance:

- **Node Performance**: Execution times and success rates
- **Split Analytics**: Distribution effectiveness and performance
- **Pixel Tracking**: Conversion events and attribution
- **Session Analytics**: Flow completion rates and drop-off points
- **Business Hours Analytics**: Call volume patterns and peak times

### Integration with Campaign System

Call flows integrate seamlessly with the campaign management system:

- **Campaign Assignment**: Flows can be assigned to specific campaigns
- **Automatic Execution**: Flows execute when campaigns have active flows
- **Fallback Routing**: Traditional buyer routing when no flow is active
- **Performance Tracking**: Flow metrics integrated with campaign analytics

---

## Twilio Integration

### Webhook Configuration

The system handles incoming calls through Twilio webhooks:

**Voice Webhook URL:**
```
https://your-domain.com/api/webhooks/voice
```

**Pool-based Webhook URL:**
```
https://your-domain.com/api/webhooks/pool/{poolId}/voice
```

### Call Flow

1. **Incoming Call**: Twilio sends webhook to configured URL
2. **Campaign Identification**: Lookup campaign by phone number
3. **Routing Decision**: Select appropriate buyer/agent
4. **TwiML Response**: Generate call forwarding instructions
5. **Call Tracking**: Log call details and routing decisions
6. **Status Updates**: Track call progress and completion

### TwiML Generation

The system generates TwiML responses for call routing:

```xml
<Response>
  <Dial timeout="30" callerId="+1234567890">
    <Number>+1800555BUYER</Number>
  </Dial>
</Response>
```

### Call Recording

Automatic call recording with configurable settings:
- Recording enabled/disabled per campaign
- Transcription options
- Storage and retrieval
- Recording URL generation

### Number Provisioning

Search and purchase phone numbers through Twilio:
- Area code selection
- Number type (local, toll-free)
- Capability requirements (voice, SMS)
- Pricing and availability

---

## API Documentation

### Authentication

All API requests require session-based authentication:

```javascript
// Login request
POST /api/auth/login
{
  "username": "your_username",
  "password": "your_password"
}

// Check authentication status
GET /api/auth/user
```

### Core API Endpoints

**Campaigns:**
```
GET    /api/campaigns              # List campaigns
POST   /api/campaigns              # Create campaign
GET    /api/campaigns/{id}         # Get campaign details
PUT    /api/campaigns/{id}         # Update campaign
DELETE /api/campaigns/{id}         # Delete campaign
```

**Buyers:**
```
GET    /api/buyers                 # List buyers
POST   /api/buyers                 # Create buyer
GET    /api/buyers/{id}            # Get buyer details
PUT    /api/buyers/{id}            # Update buyer
DELETE /api/buyers/{id}            # Delete buyer
```

**Number Pools:**
```
GET    /api/pools                  # List pools
POST   /api/pools                  # Create pool
GET    /api/pools/{id}             # Get pool details
PUT    /api/pools/{id}             # Update pool
DELETE /api/pools/{id}             # Delete pool
```

**RTB System:**
```
GET    /api/rtb/targets            # List RTB targets
POST   /api/rtb/targets            # Create RTB target
GET    /api/rtb/routers            # List RTB routers
POST   /api/rtb/routers            # Create RTB router
GET    /api/rtb/bid-requests       # List bid requests
GET    /api/rtb/bid-responses      # List bid responses
```

**DNI System:**
```
POST   /api/dni/track              # Track DNI request
GET    /api/tracking-tags          # List tracking tags
POST   /api/tracking-tags          # Create tracking tag
```

**Analytics:**
```
GET    /api/stats/historical       # Historical statistics
GET    /api/stats/campaign/{id}    # Campaign-specific stats
GET    /api/calls                  # Call logs
```

### Webhook Endpoints

**Twilio Webhooks:**
```
POST   /api/webhooks/voice         # Voice webhook handler
POST   /api/webhooks/pool/{id}/voice # Pool-based voice handler
POST   /api/webhooks/status        # Call status updates
```

**RTB Webhooks:**
```
POST   /api/rtb/webhook/{id}       # RTB target webhook
```

---

## Database Schema

### Core Tables

**users**
- User authentication and profile information
- Session management and preferences

**campaigns**
- Campaign configuration and settings
- Routing type and RTB configuration
- Status and performance tracking

**buyers**
- Buyer/agent contact information
- Capacity limits and priorities
- Performance metrics

**phone_numbers**
- Phone number inventory
- Assignment tracking and status
- Twilio integration details

**number_pools**
- Pool definitions and configuration
- Exclusive number assignment
- Webhook management

**calls**
- Call tracking and logging
- Routing decisions and outcomes
- Performance metrics

### RTB Tables

**rtb_targets**
- External bidding endpoint configuration
- Authentication and parsing settings
- Capacity and limit management

**rtb_routers**
- Auction orchestration settings
- Bidder assignment and management
- Performance configuration

**rtb_router_assignments**
- Target-to-router assignments
- Priority and weight settings

**rtb_bid_requests**
- Bid request history and tracking
- Template and variable logging

**rtb_bid_responses**
- Bid response tracking and analysis
- Winner determination and metrics

### DNI Tables

**tracking_tags**
- DNI tag configuration and settings
- Campaign association and tracking

**tracking_sessions**
- Session tracking and attribution
- UTM parameter capture
- Conversion tracking

---

## Setup and Configuration

### Prerequisites

- Node.js 20 or higher
- PostgreSQL 16 or higher
- Twilio integration is managed by the system
- Supabase or Neon database (optional)

### Installation

1. **Clone Repository**
```bash
git clone <repository-url>
cd callcenter-pro
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database Setup**
```bash
# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

5. **Start Development Server**
```bash
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Twilio (Managed by System)
TWILIO_ACCOUNT_SID=system_managed
TWILIO_AUTH_TOKEN=system_managed

# Session
SESSION_SECRET=your_session_secret

# Note: Twilio credentials are managed by the system
# Users do not need to configure these variables
```

### Twilio Integration

**Managed Service:**
- Twilio integration is fully managed by the system
- Users do not need to create or configure Twilio accounts
- Phone numbers are provisioned and managed automatically
- All webhooks and voice configurations are handled internally

**How It Works:**
1. **Phone Number Assignment**
   - Choose from available phone numbers in the system
   - Numbers are assigned exclusively to your campaigns
   - Pool-based routing for dynamic number assignment

2. **Automatic Configuration**
   - Voice routing is configured automatically
   - Call tracking and recording managed seamlessly
   - Status callbacks handled internally

3. **Features Included**
   - Call recording and transcription
   - Real-time call status tracking
   - Automatic failover and redundancy
   - Geographic and toll-free number support

---

## AI Help System

### Overview

The AI Help System is a Claude-powered intelligent assistant integrated into the CallCenter Pro platform. It provides context-aware support and answers user questions about system features, functionality, and troubleshooting.

### Key Features

**Project-Specific Knowledge:**
- Comprehensive understanding of CallCenter Pro features and capabilities
- Real-time access to current system documentation and code
- Context-aware responses based on actual implementation
- Dynamic search through project files and configurations

**Intelligent Assistance:**
- Campaign management guidance
- RTB system explanations
- Call routing troubleshooting
- Feature usage instructions
- Technical problem resolution

### How It Works

**Knowledge Sources:**
1. **Documentation Files** - Reads current `Documentation.md` and `replit.md` files
2. **Code Search** - Searches through actual project code for specific implementations
3. **System Context** - Understands current project state and recent changes
4. **User Interactions** - Learns from conversation history to provide better responses

**Update Mechanism:**
- Knowledge updates automatically when documentation files are modified
- Code search provides real-time access to current implementations
- System stays current with project changes and new features
- Conversation history stored for continuous improvement

### Usage

**Accessing the Assistant:**
1. Navigate to the Help section in the main navigation
2. Type your question in the chat interface
3. Receive context-aware responses about your specific system

**Best Practices:**
- Ask specific questions about features you're using
- Mention error messages or issues you're experiencing
- Request guidance on complex configurations
- Use it for troubleshooting call routing or RTB issues

**Response Quality:**
- Provides accurate information based on actual code and documentation
- Uses simple, non-technical language suitable for business users
- Includes relevant examples and step-by-step instructions
- Fallback responses available if Claude API is unavailable

### Technical Implementation

**Architecture:**
- ChatbotService handles conversation processing
- File search capabilities for code analysis
- Project context injection for accurate responses
- Session management for conversation continuity

**Integration:**
- Powered by Claude Sonnet 4 for intelligent responses
- Integrated with project documentation system
- Connected to conversation storage for feedback
- Supports both technical and business user questions

---

## Testing Guide

### Unit Testing

Run unit tests for individual components:

```bash
npm run test
```

### Integration Testing

Test API endpoints and database operations:

```bash
npm run test:integration
```

### Phase Testing

The system includes comprehensive test scripts for each development phase:

**Phase 1 Testing:**
```bash
node test-flow-execution.js
```

**Phase 2 Testing:**
```bash
node test-phase2-integration.js
node test-live-ivr.js
```

**Phase 3 Testing:**
```bash
node test-phase3-advanced-features.js
```

### RTB Testing

Test real-time bidding functionality:

```bash
node test-advanced-rtb-system.js
```

### Security Testing

Validate multi-tenancy and security fixes:

```bash
node test-security-fixes.js
```

---

## Troubleshooting

### Common Issues

**Database Connection Issues:**
- Check `DATABASE_URL` environment variable
- Verify database server is running
- Ensure proper network connectivity

**Call Routing Problems:**
- Verify campaign status is active
- Check buyer configuration and capacity
- Review call logs for routing decisions

**RTB Auction Failures:**
- Validate RTB target endpoints
- Check bid timeout settings
- Review bid request/response logs

**Call Flow Execution Issues:**
- Verify flow definition is valid
- Check node configurations
- Review session tracking logs

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Support Resources

- **Documentation**: Complete system documentation
- **Test Scripts**: Comprehensive testing suite
- **Error Logs**: Detailed error tracking
- **Performance Monitoring**: Real-time system metrics

---

## Recent Updates

### July 17, 2025 - Call Flow Editor Enhancements

**✓ Enhanced Configuration Dialogs**
- Added comprehensive configuration dialogs for Action, Condition, and End node types
- Action nodes now support Route to Buyer, Hangup, Transfer Call, and Send to Voicemail with dynamic form fields
- Condition nodes support caller ID rules, time-based routing, and custom JavaScript conditions
- End nodes support hangup and message playback configurations
- All configuration dialogs provide proper form validation and user feedback

**✓ Interactive Connection Editing**
- Implemented inline connection label editing with "Click to edit" prompts
- Added keyboard support (Enter to save, Escape to cancel)
- Connection labels now show helpful prompts when empty
- Fixed node configuration dialog opening issues for all node types

**✓ Professional Interface Standards**
- Enhanced professional interface standards matching enterprise routing management systems
- Improved user experience with intuitive editing workflows
- All node types now have proper configuration capabilities
- Fixed UI consistency issues across all configuration dialogs

### July 16, 2025 - Phase 3 Complete: Advanced Features Implemented

**✓ Enhanced Business Hours Logic**
- Holiday support with date-based exclusions
- Multiple time ranges per day (lunch breaks, complex schedules)
- Timezone-aware calculations for global operations
- Holiday management with custom schedules

**✓ Advanced Traffic Splitting**
- 4 distribution strategies: percentage, weighted, time-based rules, round-robin
- Weighted distribution considers performance factors and success rates
- Time-based rules with hour ranges and day-of-week filters
- Failover support and detailed analytics tracking

**✓ Comprehensive Tracking Integration**
- Pixel firing with template variables ({campaign_id}, {session_id}, {timestamp})
- Analytics events for all node executions and flow interactions
- Custom pixel arrays for multiple tracking systems
- HTTP timeout and error handling for reliable tracking

**✓ Enhanced User Interface**
- Tabbed configuration interfaces for complex node settings
- Real-time preview of distribution strategies
- Advanced time-based rule builders
- Analytics configuration with event selection

**✓ Production-Ready Features**
- All Phase 3 features validated through comprehensive test suites
- Enterprise-level routing capabilities matching platforms like Ringba
- Complex business scenarios supported with sophisticated routing logic
- Comprehensive tracking integration for call attribution

### July 16, 2025 - Phase 2 Complete: Database Integration Resolved

**✓ Call Flow Database Integration**
- Fixed database table creation for call_flows with proper schema
- Resolved PostgreSQL persistence issues
- Database methods properly implemented with error handling
- Call flow CRUD operations fully operational

**✓ Live IVR Integration**
- Complete webhook-to-TwiML pipeline for real-time IVR execution
- Session management with UUID tracking for call state persistence
- Response processing pipeline for DTMF input and speech recognition
- Production-ready system supporting complete IVR experiences

### July 15, 2025 - Advanced Features and Security

**✓ Claude AI Integration**
- Intelligent AI chatbot powered by Claude Sonnet 4
- Project context awareness and file search capabilities
- Contextual answers about system features and functionality

**✓ Critical Security Fixes**
- Multi-tenancy vulnerability resolved
- User-scoped data filtering implemented
- Authentication requirements added to all sensitive endpoints
- Comprehensive security test suite created

**✓ RTB System Enhancements**
- External destination routing for winning bidders
- RTB target architectural simplification
- Advanced RTB analytics with target name resolution
- Enterprise-level RTB ID system with crypto-secure identifiers

### System Status

**Current Version**: Production-ready with Phase 3 complete
**Database**: PostgreSQL with 47 calls and 13 feedback records
**Security**: Multi-tenant with user-scoped data access
**Authentication**: Session-based (username: sumit, password: demo1)
**Features**: All enterprise-level routing capabilities implemented

The system now provides enterprise-grade call center management with sophisticated routing logic, comprehensive tracking integration, and production-ready advanced features matching industry-leading platforms.

---

## Conclusion

CallCenter Pro represents a complete, enterprise-grade call center management solution with advanced routing capabilities, comprehensive tracking integration, and production-ready features. The system has been developed through three major phases:

**Phase 1**: Core flow management and TwiML generation
**Phase 2**: Live IVR integration with database persistence
**Phase 3**: Advanced enterprise features with business hours, traffic splitting, and tracking

The platform is ready for production deployment with sophisticated routing logic, comprehensive analytics, and enterprise-level security. All features have been thoroughly tested and validated through comprehensive test suites.

For additional support, consult the testing scripts, API documentation, and troubleshooting sections provided in this documentation.
**Features**: All enterprise-level routing capabilities implemented

The system now provides enterprise-grade call center management with sophisticated routing logic, comprehensive tracking integration, and production-ready advanced features matching industry-leading platforms.

### End-to-End Testing

Test complete call flows:

```bash
npm run test:e2e
```

### Manual Testing

**Campaign Testing:**
1. Create test campaign with direct routing
2. Add test buyer with your phone number
3. Set up Twilio webhook pointing to your development server
4. Call the campaign phone number
5. Verify call routing to buyer phone number

**Pool Testing:**
1. Create number pool with test numbers
2. Create campaign with pool-based routing
3. Test dynamic number assignment
4. Verify exclusive number assignment

**RTB Testing:**
1. Create test RTB target with mock endpoint
2. Set up RTB router with test target
3. Create campaign with RTB routing
4. Test bid request/response flow
5. Verify winner selection and call routing

**DNI Testing:**
1. Create tracking tag for test campaign
2. Implement JavaScript code on test website
3. Visit website and verify number replacement
4. Test attribution tracking with UTM parameters

### Test Scripts

The project includes several test scripts:

```bash
# Test Twilio authentication
node test-twilio-simple.js

# Test advanced RTB system
node test-advanced-rtb-system.js

# Test pool assignment
node test-pool-assignment.js

# Test bidding server
node test-bidding-server.js
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Issues**
- Verify DATABASE_URL is correct
- Check database server is running
- Ensure proper network access

**2. Twilio Webhook Failures**
- Verify webhook URL is accessible
- Check Twilio credentials are correct
- Ensure HTTPS is used for production

**3. RTB Auction Failures**
- Verify RTB targets are properly configured
- Check endpoint URLs are accessible
- Validate request/response formats

**4. Call Routing Issues**
- Verify buyers have valid phone numbers
- Check capacity limits and availability
- Ensure campaign is active

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Log Analysis

Check logs for common patterns:

```bash
# Call routing logs
grep "Call routing" logs/app.log

# RTB auction logs
grep "RTB auction" logs/app.log

# DNI tracking logs
grep "DNI tracking" logs/app.log
```

### Performance Monitoring

Monitor key metrics:
- Database query performance
- API response times
- Twilio webhook latency
- RTB auction response times

---

## Support and Maintenance

### Regular Maintenance

**Daily:**
- Monitor call volume and routing success rates
- Check system logs for errors
- Verify Twilio webhook functionality

**Weekly:**
- Review campaign performance metrics
- Update buyer capacity limits as needed
- Check RTB target performance

**Monthly:**
- Database maintenance and optimization
- Security updates and patches
- Performance analysis and optimization

### Backup and Recovery

**Database Backups:**
- Automated daily backups
- Point-in-time recovery capability
- Disaster recovery procedures

**Configuration Backups:**
- Environment variable backups
- Campaign configuration exports
- RTB target configuration backups

### Scaling Considerations

**Horizontal Scaling:**
- Load balancer configuration
- Database connection pooling
- Session store scaling

**Vertical Scaling:**
- CPU and memory optimization
- Database performance tuning
- Caching strategies

---

## Security and Multi-Tenancy

### Security Overview

CallCenter Pro implements enterprise-grade security with comprehensive multi-tenant isolation to ensure data privacy and system integrity.

### Multi-Tenancy Security Features

**Data Isolation:**
- Complete user-scoped data filtering for all sensitive resources
- Foreign key relationships ensure data ownership integrity
- No cross-tenant data access possible through API endpoints
- Comprehensive authentication requirements on all sensitive endpoints

**Secured Resources:**
- Campaigns: User-specific with ownership validation
- Buyers: Isolated by user ID with proper filtering
- RTB Targets: User-scoped with secure access controls
- RTB Routers: User-specific with ownership validation
- Bid Requests: Filtered by user's campaigns only
- Call Logs: User-scoped with campaign-based filtering

### Security Improvements (July 15, 2025)

**CRITICAL SECURITY FIXES:**
- ✅ **Resolved multi-tenancy vulnerability**: Fixed critical security issue where users could access other accounts' data
- ✅ **Enhanced authentication**: Added proper `requireAuth` middleware to all sensitive endpoints
- ✅ **User-scoped filtering**: Implemented comprehensive user ID filtering in storage layer
- ✅ **Campaign-buyer relationships**: Added ownership validation for all campaign-buyer operations
- ✅ **Removed dangerous operations**: Eliminated database clearing functionality from user interface
- ✅ **Comprehensive testing**: Created security test suite to verify authentication and data isolation

**Security Test Coverage:**
- Authentication requirement verification for all endpoints
- User data isolation validation
- Campaign ownership enforcement
- Buyer access control validation
- RTB target security verification
- Call log access restrictions

### Authentication System

**Session Management:**
- Express sessions with PostgreSQL storage
- Secure session cookies with proper configuration
- Session timeout and cleanup mechanisms
- User authentication state management

**API Security:**
- All sensitive endpoints require authentication
- User context validation on every request
- SQL injection prevention through parameterized queries
- XSS protection through input sanitization

### Data Protection

**Database Security:**
- Encrypted connections to PostgreSQL
- Parameterized queries prevent SQL injection
- Foreign key constraints ensure data integrity
- User-scoped data access patterns

**Environment Security:**
- Secure environment variable management
- API key protection and rotation
- Twilio credential security
- Database connection security

### Compliance and Best Practices

**Data Privacy:**
- User data isolation and segregation
- Audit logging for data access
- Secure data transmission
- Privacy-by-design architecture

**Security Monitoring:**
- Failed authentication tracking
- Suspicious activity detection
- Error logging and monitoring
- Security event auditing

---

## Conclusion

CallCenter Pro provides a comprehensive solution for modern call center operations with advanced features like RTB auctions, DNI tracking, and intelligent call routing. The system is designed to scale with your business needs while maintaining high performance and reliability.

For additional support or feature requests, please refer to the project repository or contact the development team.

---

*Last Updated: July 15, 2025*
*Version: 1.1.0*
*Document Status: Complete - Updated with RTB Analytics and Security Improvements*