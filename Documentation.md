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
9. [Twilio Integration](#twilio-integration)
10. [API Documentation](#api-documentation)
11. [Database Schema](#database-schema)
12. [Setup and Configuration](#setup-and-configuration)
13. [Testing Guide](#testing-guide)
14. [Troubleshooting](#troubleshooting)

---

## Overview

CallCenter Pro is a sophisticated call center management platform designed for businesses that need intelligent call routing, campaign management, and real-time bidding capabilities. The system combines modern web technologies with enterprise-grade telephony integration to provide a comprehensive solution for call center operations.

### Key Capabilities

- **Intelligent Call Routing**: Priority-based, round-robin, and pool-based routing algorithms
- **Campaign Management**: Create and manage call campaigns with multiple routing strategies
- **Dynamic Number Insertion (DNI)**: Track campaign performance with dynamic phone number assignment
- **Real-Time Bidding (RTB)**: Enterprise-level auction system for call distribution
- **Number Pool Management**: Exclusive number assignment with conflict prevention
- **Twilio Integration**: Full voice communication capabilities with webhooks
- **Analytics & Reporting**: Comprehensive performance tracking and metrics

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

The Real-Time Bidding system enables auction-based call distribution, allowing multiple buyers to compete for incoming calls in real-time.

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
- Twilio account with API credentials
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

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Session
SESSION_SECRET=your_session_secret

# Optional
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Twilio Configuration

1. **Account Setup**
   - Create Twilio account
   - Get Account SID and Auth Token
   - Purchase phone numbers

2. **Webhook Configuration**
   - Set voice webhook URL in phone number configuration
   - Configure status callback URLs
   - Enable call recording (optional)

3. **Number Provisioning**
   - Search available numbers
   - Purchase numbers for campaigns
   - Configure webhook URLs

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

## Conclusion

CallCenter Pro provides a comprehensive solution for modern call center operations with advanced features like RTB auctions, DNI tracking, and intelligent call routing. The system is designed to scale with your business needs while maintaining high performance and reliability.

For additional support or feature requests, please refer to the project repository or contact the development team.

---

*Last Updated: July 14, 2025*
*Version: 1.0.0*