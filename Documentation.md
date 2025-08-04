# CallCenter Pro - Complete Documentation & Website Flow Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Complete Website Flow](#complete-website-flow)
3. [Authentication System](#authentication-system)
4. [Dashboard Overview](#dashboard-overview)
5. [Campaign Management](#campaign-management)
6. [Buyer/Target Management](#buyertarget-management)
7. [Number Pool Management](#number-pool-management)
8. [Call Flow System](#call-flow-system)
9. [RTB Management](#rtb-management)
10. [Enhanced Reporting](#enhanced-reporting)
11. [Dynamic Number Insertion (DNI)](#dynamic-number-insertion-dni)
12. [Integrations](#integrations)
13. [Phone Number Management](#phone-number-management)
14. [Settings & Configuration](#settings--configuration)
15. [AI Help System](#ai-help-system)
16. [Data Connections & Flow](#data-connections--flow)
17. [Technical Architecture](#technical-architecture)
18. [API Documentation](#api-documentation)
19. [Database Schema](#database-schema)
20. [Troubleshooting & Support](#troubleshooting--support)

---

## System Overview

CallCenter Pro is a comprehensive call center management platform designed as a Ringba alternative. It provides intelligent call routing, real-time bidding (RTB), campaign management, and advanced analytics for businesses managing inbound call operations.

### Core Capabilities
- **Multi-tenancy**: Complete user isolation with secure data access
- **Real-time bidding**: Auction-based call distribution with 33+ bidder support
- **Dynamic Number Insertion**: Campaign attribution through dynamic phone numbers
- **Advanced call flows**: Visual IVR builder with complex routing logic
- **Campaign management**: Complete lifecycle from creation to analytics
- **Twilio integration**: Full voice communication capabilities
- **Enhanced reporting**: Detailed analytics with RTB rejection reasons
- **AI-powered help**: Claude-based chatbot with project knowledge

---

## Complete Website Flow

### 1. Entry Points

**Login Page (`/login`)**
- **Purpose**: User authentication entry point
- **Features**: 
  - Username/password login
  - Session management
  - Redirect to dashboard after login
- **Flow**: Login → Dashboard (if authenticated) or Login page (if failed)

**Registration/Signup**
- **Note**: Currently uses demo accounts (username: `sumit`, password: `demo123`)
- **Flow**: Direct login → Dashboard

### 2. Main Navigation Structure

**Sidebar Navigation Components:**
```
├── Dashboard (/)
├── Campaigns (/campaigns)
├── Buyers (/buyers)
├── Number Pools (/pools)
├── Call Flows (/call-flows)
├── RTB Management (/rtb-management)
├── Enhanced Reporting (/enhanced-reporting)
├── DNI (/dni)
├── Integrations (/integrations)
├── Phone Numbers (/phone-numbers)
├── Settings (/settings)
└── Help (AI Chat overlay)
```

### 3. User Journey Flows

**A. Campaign Creation Flow:**
```
Dashboard → Campaigns → Create Campaign Button → Campaign Form → 
Configure Routing → Add Buyers → Set Numbers → Save → Campaign Dashboard
```

**B. RTB Setup Flow:**
```
RTB Management → Add RTB Target → Configure Endpoint → 
Test Bidding → Assign to Campaign → Monitor Analytics
```

**C. Call Analytics Flow:**
```
Enhanced Reporting → Filter Calls → Select Call → 
Expand Details → View RTB Analytics → See Rejection Reasons
```

**D. Number Pool Management Flow:**
```
Number Pools → Create Pool → Add Numbers → 
Assign to Campaign → Monitor Usage → Analytics
```

---

## Authentication System

### Login Process
1. **Access**: Navigate to `/login` or root `/`
2. **Credentials**: Enter username and password
3. **Validation**: Server validates against user database
4. **Session**: Express session created with PostgreSQL storage
5. **Redirect**: Automatic redirect to `/dashboard`

### Session Management
- **Storage**: PostgreSQL-backed session store
- **Duration**: Configurable session timeout
- **Security**: Secure cookies with HTTP-only flags
- **Multi-tenancy**: User ID scoped to all data operations

### Demo Accounts
- **Username**: `sumit`
- **Password**: `demo123`
- **User ID**: 2 (for database queries)

---

## Dashboard Overview

### Location: `/` or `/dashboard`

### Key Components

**1. Quick Stats Cards**
- **Active Campaigns**: Live campaign count
- **Total Calls Today**: Daily call volume
- **Success Rate**: Call routing success percentage  
- **Revenue**: Total revenue tracked

**2. Recent Activity Feed**
- **Recent Calls**: Latest incoming calls with status
- **Campaign Updates**: Recent campaign changes
- **System Alerts**: Important notifications

**3. Performance Charts**
- **Call Volume**: Hourly/daily call trends
- **Success Rates**: Routing performance over time
- **Revenue Tracking**: Financial performance metrics

**4. Quick Actions**
- **Create Campaign**: Direct link to campaign creation
- **View Reports**: Jump to enhanced reporting
- **Manage Numbers**: Access phone number management

### Data Sources
- **Calls Table**: Recent call data with status
- **Campaigns Table**: Active campaign statistics
- **Buyers Table**: Routing performance metrics
- **RTB Analytics**: Bidding performance data

---

## Campaign Management

### Location: `/campaigns`

### Campaign List View

**Table Columns:**
- **Campaign Name**: User-defined campaign identifier
- **Type**: Direct, Pool, or RTB routing
- **Status**: Active, Paused, Completed, Draft
- **Phone Number**: Associated tracking number
- **Buyers**: Count of assigned buyers/targets
- **Calls**: Total calls received
- **Success Rate**: Routing success percentage
- **Revenue**: Total revenue generated
- **Actions**: Edit, Delete, View Details

**Filter Options:**
- **Status Filter**: Active, Paused, All
- **Type Filter**: Direct, Pool, RTB
- **Date Range**: Custom date filtering
- **Search**: Campaign name search

### Campaign Creation/Edit Flow

**Step 1: Basic Information**
- **Campaign Name**: Required, unique identifier
- **Description**: Optional campaign description
- **Status**: Active, Paused, Draft selection
- **Routing Type**: Direct, Pool, or RTB selection

**Step 2: Phone Number Configuration**

**Direct Routing:**
- **Phone Number**: Select from available numbers
- **Webhook URL**: Automatic Twilio webhook setup

**Pool Routing:**
- **Number Pool**: Select from created pools
- **Pool Strategy**: Round-robin or priority-based
- **Exclusive Assignment**: Prevent number conflicts

**RTB Routing:**
- **RTB Targets**: Assign bidding endpoints
- **Auction Settings**: Timeout, minimum bid
- **Fallback Rules**: Default routing if no bids

**Step 3: Buyer Assignment**
- **Add Buyers**: Select from buyer database
- **Set Priority**: 1-10 priority ranking
- **Capacity Limits**: Concurrent call limits
- **Schedule**: Time-based routing rules

**Step 4: Advanced Settings**
- **Call Recording**: Enable/disable recording
- **Transcription**: Automatic transcription
- **Webhooks**: Custom webhook URLs
- **Tracking**: UTM and pixel tracking

### Campaign Validation Rules
- **At least one buyer**: Required for activation
- **Valid phone number**: Must be assigned and available
- **Webhook accessibility**: URLs must be reachable
- **Capacity limits**: Must be reasonable and valid

### Campaign Analytics Integration
- **Call Tracking**: All calls linked to campaign
- **Revenue Attribution**: Automatic revenue calculation
- **Performance Metrics**: Success rates, response times
- **RTB Analytics**: Bidding performance if applicable

---

## Buyer/Target Management

### Location: `/buyers`

### Buyer List View

**Table Display:**
- **Buyer Name**: Contact name or company
- **Company**: Business organization
- **Phone Number**: Primary contact number
- **Priority**: Routing priority (1-10)
- **Status**: Active, Inactive, Paused
- **Capacity**: Current/maximum concurrent calls
- **Success Rate**: Call acceptance percentage
- **Total Calls**: Historical call count
- **Revenue**: Total revenue generated

### Buyer Creation/Edit Process

**Basic Information:**
- **Name**: Buyer/agent name (required)
- **Company**: Organization name
- **Email**: Contact email address
- **Phone**: Primary phone number for routing

**Routing Configuration:**
- **Priority**: 1-10 ranking for routing order
- **Phone Number**: Destination for routed calls
- **Backup Number**: Fallback routing option
- **Status**: Active/Inactive toggle

**Capacity Management:**
- **Max Concurrent Calls**: Simultaneous call limit
- **Daily Call Cap**: Maximum calls per day
- **Hourly Limit**: Calls per hour restriction
- **Monthly Limit**: Monthly capacity setting

**Schedule Settings:**
- **Business Hours**: Operating time windows
- **Time Zone**: Local time zone setting
- **Holiday Schedule**: Non-working days
- **Break Times**: Unavailable periods

**Performance Tracking:**
- **Success Rate**: Call acceptance metrics
- **Average Handle Time**: Call duration tracking
- **Revenue Per Call**: Financial performance
- **Quality Scores**: Call quality ratings

### Buyer-Campaign Relationships
- **Campaign Assignment**: Multiple campaign support
- **Priority Per Campaign**: Campaign-specific priorities
- **Capacity Sharing**: Cross-campaign capacity management
- **Performance Isolation**: Campaign-specific metrics

---

## Number Pool Management

### Location: `/pools`

### Pool Overview

**Purpose**: Number pools provide dynamic phone number assignment for campaigns, ensuring exclusive number usage and preventing conflicts between campaigns.

### Pool List View

**Table Columns:**
- **Pool Name**: User-defined pool identifier
- **Phone Numbers**: Count of numbers in pool
- **Available**: Unassigned numbers count
- **Assigned**: Currently assigned numbers
- **Usage Rate**: Percentage utilization
- **Status**: Active, Inactive
- **Actions**: Edit, Delete, View Details

### Pool Creation Process

**Step 1: Basic Information**
- **Pool Name**: Required, unique identifier
- **Description**: Optional pool description
- **Country**: Geographic region for numbers
- **Status**: Active/Inactive toggle

**Step 2: Number Assignment**
- **Add Numbers**: Import phone numbers
- **Bulk Import**: CSV file upload support
- **Manual Entry**: Individual number addition
- **Validation**: Number format verification

**Step 3: Webhook Configuration**
- **Webhook URL**: Automatic setup for all numbers
- **Authentication**: Security token configuration
- **Fallback URL**: Backup webhook endpoint
- **Status Callbacks**: Call status tracking

### Pool Management Features

**Exclusive Assignment:**
- Numbers can only belong to one pool
- Automatic conflict detection
- Assignment tracking and history
- Release and reassignment support

**Dynamic Allocation:**
- Automatic number assignment to campaigns
- Round-robin or priority-based selection
- Real-time availability checking
- Instant webhook configuration

**Analytics and Tracking:**
- Number utilization metrics
- Performance per number
- Assignment history logs
- Revenue attribution per number

### Pool-Campaign Integration
- **Automatic Assignment**: Numbers assigned on campaign creation
- **Webhook Management**: Automatic Twilio webhook updates
- **Conflict Prevention**: System prevents duplicate assignments
- **Performance Tracking**: Individual number analytics

---

## Call Flow System

### Location: `/call-flows`

### System Overview

The Advanced Call Flow System provides a visual drag-and-drop interface for creating sophisticated Interactive Voice Response (IVR) systems and call routing logic.

### Flow Builder Interface

**Canvas Features:**
- **Grid Layout**: Professional alignment system
- **Zoom Controls**: Scale view for complex flows
- **Pan Navigation**: Navigate large flow diagrams
- **Connection Tools**: Visual connection editing
- **Node Palette**: Drag-and-drop node library

**Node Types Available:**

**1. Menu Node**
- **Purpose**: Present caller with options
- **Configuration**: 
  - Welcome message audio
  - Menu options (1-9)
  - Timeout handling
  - Invalid input responses
- **Connections**: Multiple outputs based on selections

**2. Gather Node**
- **Purpose**: Collect caller input (DTMF)
- **Configuration**:
  - Input prompt message
  - Expected input length
  - Timeout duration
  - Retry attempts
- **Outputs**: Success, timeout, invalid input

**3. Play Node**
- **Purpose**: Play audio message to caller
- **Configuration**:
  - Audio file or text-to-speech
  - Language selection
  - Voice settings
  - Playback controls
- **Flow**: Single output continuation

**4. Business Hours Node**
- **Purpose**: Route based on time/date
- **Configuration**:
  - Operating hours definition
  - Time zone settings
  - Holiday schedules
  - Weekend handling
- **Outputs**: Open, closed, holiday

**5. Router Node**
- **Purpose**: Conditional routing logic
- **Configuration**:
  - Routing conditions
  - Percentage-based distribution
  - Geographic routing
  - Caller data evaluation
- **Outputs**: Multiple conditional paths

**6. Splitter Node**
- **Purpose**: A/B testing and traffic distribution
- **Configuration**:
  - Traffic split percentages
  - Test duration settings
  - Conversion tracking
  - Statistical significance
- **Outputs**: Path A, Path B, Control

**7. Tracking Pixel Node**
- **Purpose**: External analytics integration
- **Configuration**:
  - Pixel URL configuration
  - Data parameter mapping
  - Authentication tokens
  - Event tracking
- **Flow**: Transparent pass-through

**8. Custom Logic Node**
- **Purpose**: Advanced conditional logic
- **Configuration**:
  - JavaScript code execution
  - API integrations
  - Database lookups
  - Custom variables
- **Outputs**: Dynamic based on logic

### Flow Configuration Process

**Step 1: Flow Creation**
- **Flow Name**: Unique identifier
- **Description**: Flow purpose description
- **Entry Point**: Initial node selection
- **Default Route**: Fallback routing

**Step 2: Node Placement**
- **Drag Nodes**: From palette to canvas
- **Position Nodes**: Arrange logical flow
- **Configure Properties**: Set node-specific options
- **Add Connections**: Link nodes together

**Step 3: Connection Management**
- **Visual Connections**: Drag between node ports
- **Connection Labels**: Descriptive path names
- **Condition Setting**: Path activation rules
- **Priority Orders**: Multiple path priorities

**Step 4: Testing and Validation**
- **Flow Simulation**: Test call paths
- **Logic Validation**: Verify routing rules
- **Audio Testing**: Verify message playback
- **End-to-End Testing**: Complete flow testing

### Flow Execution Engine

**Runtime Processing:**
- **Node Execution**: Sequential node processing
- **State Management**: Call state persistence
- **Variable Storage**: Dynamic data storage
- **Error Handling**: Graceful failure management

**Integration Points:**
- **Twilio Integration**: TwiML generation
- **Database Logging**: Call path tracking
- **Analytics**: Performance metrics
- **External APIs**: Third-party integrations

### Flow Analytics
- **Path Analytics**: Most/least used paths
- **Conversion Tracking**: Goal completion rates
- **Performance Metrics**: Response times per node
- **A/B Test Results**: Split testing outcomes

---

## RTB Management

### Location: `/rtb-management`

### RTB System Overview

The Real-Time Bidding system enables auction-based call distribution where multiple buyers bid in real-time for incoming calls.

### RTB Target Management

**RTB Target List View:**
- **Target Name**: Buyer/bidder identifier
- **Company**: Organization name
- **Endpoint URL**: Bidding API endpoint
- **Status**: Active, Inactive, Testing
- **Response Time**: Average bid response time
- **Success Rate**: Successful bid percentage
- **Win Rate**: Auction win percentage
- **Total Bids**: Historical bid count

### RTB Target Configuration

**Step 1: Basic Information**
- **Target Name**: Required identifier
- **Company Name**: Organization
- **Contact Email**: Support contact
- **Phone Number**: Contact information

**Step 2: Endpoint Configuration**
- **Endpoint URL**: HTTPS bidding endpoint
- **HTTP Method**: POST, GET, PUT support
- **Content Type**: JSON, XML, Form data
- **Authentication**: API keys, tokens, headers
- **Timeout**: Request timeout (default 5000ms)

**Step 3: Request Template**
- **Request Body**: JSON template with variables
- **Variable Substitution**: Dynamic data insertion
- **Custom Headers**: Authentication and metadata
- **Parameter Mapping**: URL parameter configuration

**Example Request Template:**
```json
{
  "requestId": "{requestId}",
  "campaignId": "{campaignId}",
  "callerId": "{callerId}",
  "callStartTime": "{callStartTime}",
  "geoLocation": {
    "state": "{callerState}",
    "zip": "{callerZip}"
  },
  "bidParams": {
    "minBid": "{minBid}",
    "maxBid": "{maxBid}",
    "currency": "USD"
  }
}
```

**Step 4: Response Parsing**
- **Bid Amount Path**: JSONPath to bid amount
- **Destination Path**: JSONPath to destination number
- **Acceptance Path**: JSONPath to acceptance flag
- **Currency Path**: JSONPath to currency code

**Example Response Parsing:**
```
Bid Amount: $.bidAmount or $.data.bid.amount
Destination: $.destinationNumber or $.routing.phone
Acceptance: $.accepted or $.data.accepted
Currency: $.currency or $.bid.currency
```

**Step 5: Capacity Management**
- **Max Concurrent**: Simultaneous call limit
- **Daily Cap**: Maximum daily calls
- **Hourly Limit**: Calls per hour limit
- **Bid Range**: Minimum/maximum bid amounts

### RTB Campaign Assignment

**Campaign-Target Linking:**
- **Direct Assignment**: Assign targets to campaigns
- **Priority Ordering**: Target bidding priority
- **Capacity Sharing**: Cross-campaign limits
- **Performance Tracking**: Campaign-specific metrics

### RTB Auction Process

**Auction Flow:**
1. **Incoming Call**: Twilio webhook triggers auction
2. **Campaign Lookup**: Identify RTB-enabled campaign
3. **Target Selection**: Get assigned RTB targets
4. **Parallel Bidding**: Send requests to all targets
5. **Response Collection**: Gather responses within timeout
6. **Bid Validation**: Verify amounts and acceptance
7. **Winner Selection**: Highest valid bid wins
8. **Call Routing**: Route to winning destination
9. **Analytics Logging**: Record auction results

**Auction Timeout Handling:**
- **Default Timeout**: 5000ms per bidder
- **Partial Results**: Accept available bids
- **Fallback Routing**: Default routing if no bids
- **Error Logging**: Track timeout and errors

### RTB Analytics Dashboard

**Auction Metrics:**
- **Total Auctions**: Count of bid requests
- **Success Rate**: Percentage with valid bids
- **Average Response Time**: Bidder response speed
- **Revenue Per Auction**: Average winning bid

**Bidder Performance:**
- **Individual Metrics**: Per-target statistics
- **Response Times**: Speed analysis
- **Win Rates**: Success percentages
- **Bid Amounts**: Bidding patterns

**Detailed Auction View:**
```
Auction Details:
- Request ID: pool_16_CA207902
- Campaign: Health Campaign
- Targets Pinged: 33
- Successful Bids: 0
- Failed Bids: 33
- Average Response Time: 1367ms
- Winner: No winner
- Fallback Route: Default buyer

Individual Bidder Results:
1. Medi - Naked - RTB T3 (ID: 5)
   - Bid: $0.00 USD
   - Response Time: 459ms (Fast)
   - Status: Success
   - Rejection: Final capacity check (Code: 1006)

2. Medi - RTB - Medi - Tier 1 (ID: 6)
   - Bid: $0.00 USD
   - Response Time: 644ms (Medium)
   - Status: Success
   - Rejection: Final capacity check (Code: 1006)

[... 31 more bidders with various rejection reasons ...]
```

**Rejection Reason Analysis:**
- **Code 1002**: Daily cap exceeded
- **Code 1003**: Geographic restriction
- **Code 1004**: Time-based filter
- **Code 1005**: Quality score too low
- **Code 1006**: Final capacity check
- **Code 1007**: Budget limit reached
- **Code 1008**: Duplicate caller detected
- **Code 1009**: Invalid caller state
- **Code 1010**: Campaign paused

---

## Enhanced Reporting

### Location: `/enhanced-reporting`

### Reporting Dashboard Overview

Enhanced Reporting provides comprehensive analytics for all call center operations with detailed drill-down capabilities.

### Main Reporting Views

**1. Call Activity Table**
- **Real-time Data**: Live call information
- **Filterable Columns**: All call attributes
- **Expandable Rows**: Detailed call information
- **Export Options**: CSV, PDF export capabilities

**Call Table Columns:**
- **Call ID**: Unique call identifier
- **Campaign**: Associated campaign name
- **Caller**: Phone number and location
- **Destination**: Routed phone number
- **Duration**: Call length in seconds
- **Status**: Call completion status
- **Revenue**: Associated revenue
- **Timestamp**: Call start time

**2. Advanced Filtering**
- **Date Range**: Custom date selection
- **Campaign Filter**: Specific campaign selection
- **Status Filter**: Call status filtering
- **Buyer Filter**: Destination buyer filtering
- **Location Filter**: Geographic filtering
- **Revenue Range**: Financial filtering

**3. Call Detail Expansion**

When expanding a call row, users see comprehensive tabs:

**Overview Tab:**
- **Call Information**: Basic call details
- **Campaign Details**: Associated campaign data
- **Routing Information**: How call was routed
- **Financial Data**: Revenue and cost information
- **Geographic Data**: Caller location details

**RTB Analytics Tab** (New Feature):
This tab shows detailed RTB auction analytics with:

**Auction Header:**
- **Request ID**: Unique auction identifier
- **Campaign Information**: Related campaign details
- **Timing Information**: Auction duration and timing

**Individual Bidder Results Table:**
```
Bidder | Bid Amount | Response Time | Destination | Status & Rejection Details | Winner
-------|------------|---------------|-------------|---------------------------|--------
Medi - Naked - RTB T3 | $0.00 USD | 459ms (Fast) | External Route | ✓ success - Final capacity check (Code: 1006) | #1
Medi - RTB - Medi - Tier 1 | $0.00 USD | 644ms (Medium) | External Route | ✓ success - Final capacity check (Code: 1006) | #2
Health Direct - Tier 1 | $0.00 USD | 825ms (Slow) | External Route | ✓ success - Daily cap exceeded (Code: 1002) | #3
[... 30 more bidders with various results ...]
```

**Auction Metrics Grid:**

*Timing Section:*
- **Call Start**: Timestamp of call initiation
- **Total Duration**: Complete auction time (3970ms)
- **Average Response**: Mean bidder response time (1367ms)

*Bid Statistics:*
- **Targets Pinged**: Total bidders contacted (33)
- **Successful Bids**: Valid responses received (0)
- **Failed Bids**: Rejected or failed responses (33)

*Auction Result:*
- **Winning Bid**: Highest accepted bid ($0.00)
- **Winner**: Winning bidder (No winner)
- **Destination**: Final routing destination (Not available)

**Recordings Tab:**
- **Audio Playback**: Integrated audio player
- **Transcription**: Automatic speech-to-text
- **Download Options**: Audio file downloads
- **Quality Metrics**: Audio quality indicators

**Technical Details Tab:**
- **Call Flow Path**: Routing decisions made
- **System Logs**: Technical call information
- **API Calls**: External integrations triggered
- **Performance Metrics**: Response times and latency

### Reporting Analytics

**Performance Metrics:**
- **Success Rates**: Call routing success percentages
- **Response Times**: Average routing speeds
- **Conversion Rates**: Call-to-outcome ratios
- **Revenue Analytics**: Financial performance tracking

**Trend Analysis:**
- **Hourly Patterns**: Call volume by hour
- **Daily Trends**: Performance over days
- **Campaign Comparison**: Cross-campaign analytics
- **Buyer Performance**: Individual buyer metrics

### Custom Report Generation

**Report Builder:**
- **Data Selection**: Choose metrics and dimensions
- **Filter Configuration**: Set reporting criteria
- **Visualization Options**: Charts and graphs
- **Scheduling**: Automated report generation
- **Export Formats**: PDF, CSV, Excel support

---

## Dynamic Number Insertion (DNI)

### Location: `/dni`

### DNI System Overview

Dynamic Number Insertion enables websites to display different tracking numbers based on traffic source, providing precise campaign attribution and ROI tracking.

### DNI Components

**1. Tracking Tags Management**

**Tag Creation Process:**
- **Tag Name**: Unique identifier for tracking
- **Campaign Association**: Link to specific campaigns
- **JavaScript Generation**: Automatic SDK code creation
- **Attribution Rules**: Source tracking configuration

**2. JavaScript SDK Integration**

**Generated Tracking Code:**
```javascript
<!-- CallCenter Pro DNI Tracking -->
<script>
(function() {
  const tagCode = 'campaign_landing_page_v2';
  const apiUrl = 'https://your-domain.com/api/dni/track';
  
  // Generate or retrieve session ID
  function generateSessionId() {
    let sessionId = localStorage.getItem('dni_session_id');
    if (!sessionId) {
      sessionId = 'dni_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dni_session_id', sessionId);
    }
    return sessionId;
  }
  
  // Capture UTM parameters
  function captureUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_content: urlParams.get('utm_content'),
      utm_term: urlParams.get('utm_term')
    };
  }
  
  // Track visitor and get phone number
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tagCode: tagCode,
      sessionId: generateSessionId(),
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      utmParams: captureUTMParams()
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success && data.phoneNumber) {
      // Replace phone numbers on page
      document.querySelectorAll('.phone-number, [data-dni="phone"]').forEach(el => {
        el.textContent = data.formattedNumber;
        el.href = 'tel:' + data.phoneNumber;
      });
      
      // Store for form submissions
      window.dniPhoneNumber = data.phoneNumber;
    }
  })
  .catch(error => {
    console.error('DNI tracking error:', error);
  });
})();
</script>
```

**3. HTML Implementation Examples**

**Basic Phone Number Replacement:**
```html
<!-- Static placeholder replaced dynamically -->
<span class="phone-number">+1-800-DEFAULT</span>

<!-- Data attribute targeting -->
<a href="tel:+18005551234" data-dni="phone">Call Now: +1-800-555-1234</a>

<!-- Multiple locations -->
<div class="header-phone phone-number">+1-800-DEFAULT</div>
<div class="footer-contact phone-number">+1-800-DEFAULT</div>
```

**Advanced Integration:**
```html
<!-- Form integration -->
<form id="lead-form">
  <input type="hidden" id="tracking-phone" name="phone_number" value="">
  <input type="text" name="customer_name" placeholder="Your Name">
  <input type="email" name="customer_email" placeholder="Your Email">
  <button type="submit">Call Me Back</button>
</form>

<script>
// Auto-populate form with tracking number
if (window.dniPhoneNumber) {
  document.getElementById('tracking-phone').value = window.dniPhoneNumber;
}
</script>
```

### DNI Analytics and Tracking

**Session Tracking:**
- **Session Persistence**: Cross-page visit tracking
- **Attribution Window**: Configurable attribution timeframe
- **Source Analysis**: Traffic source breakdown
- **Conversion Tracking**: Call-to-conversion attribution

**UTM Parameter Integration:**
- **Automatic Capture**: All UTM parameters saved
- **Campaign Attribution**: Link calls to specific campaigns
- **Source Tracking**: Detailed traffic source analysis
- **ROI Calculation**: Revenue attribution by source

**Performance Metrics:**
- **Number Utilization**: Usage rates per tracking number
- **Source Performance**: Conversion rates by traffic source
- **Geographic Analysis**: Performance by location
- **Time-based Analysis**: Performance by time periods

### DNI Configuration Options

**Number Pool Integration:**
- **Dynamic Assignment**: Numbers assigned from pools
- **Exclusive Usage**: Prevent number conflicts
- **Automatic Rotation**: Fresh numbers for campaigns
- **Geographic Matching**: Local numbers for regions

**Attribution Rules:**
- **First Touch**: Credit first interaction
- **Last Touch**: Credit final interaction
- **Linear**: Distribute credit evenly
- **Time Decay**: Weighted by recency

**Session Management:**
- **Session Duration**: Configurable timeout
- **Cross-domain Tracking**: Multi-site attribution
- **Cookie Management**: GDPR-compliant tracking
- **Local Storage**: Client-side persistence

---

## Integrations

### Location: `/integrations`

### Integration Dashboard Overview

The Integrations section provides connections to external systems, APIs, and services that enhance CallCenter Pro functionality.

### Available Integrations

**1. URL Parameters Integration**

**Purpose**: Capture and track URL parameters for attribution analysis

**Configuration:**
- **Parameter Name**: URL parameter to track (e.g., 'utm_source')
- **Display Name**: Human-readable name
- **Tracking Scope**: Campaign-specific or global
- **Data Type**: String, Number, Boolean
- **Default Value**: Fallback if parameter missing

**Common Parameters:**
```
UTM Parameters:
- utm_source: Traffic source identification
- utm_medium: Marketing medium (cpc, email, social)
- utm_campaign: Specific campaign name
- utm_content: Content variation identifier
- utm_term: Keyword or search term

Custom Parameters:
- ref: Referral code
- affiliate: Affiliate identifier
- promo: Promotional code
- landing: Landing page variation
```

**Usage in Analytics:**
- **Call Attribution**: Link calls to parameter values
- **Performance Analysis**: Compare performance by parameter
- **ROI Tracking**: Calculate returns by traffic source
- **Campaign Optimization**: Identify best-performing sources

**2. Webhook Integrations**

**Outbound Webhooks:**
- **Call Events**: Real-time call status updates
- **Campaign Events**: Campaign lifecycle notifications
- **RTB Events**: Auction results and bidding data
- **System Events**: Platform status and alerts

**Webhook Configuration:**
- **Endpoint URL**: Target system URL
- **Authentication**: API keys, tokens, signatures
- **Event Selection**: Choose events to send
- **Retry Logic**: Failed delivery handling
- **Payload Format**: JSON structure customization

**Example Webhook Payload:**
```json
{
  "event": "call_completed",
  "timestamp": "2025-08-04T12:30:45Z",
  "call": {
    "id": 140,
    "campaignId": "928a699e-e241-46ab-bc54-9f6779d38b32",
    "fromNumber": "+12129200892",
    "toNumber": "+18562813889",
    "duration": 125,
    "status": "completed",
    "revenue": "15.50",
    "attribution": {
      "utm_source": "google",
      "utm_campaign": "health_leads_2025"
    }
  }
}
```

**3. CRM Integrations**

**Supported CRMs:**
- **Salesforce**: Lead and opportunity management
- **HubSpot**: Contact and deal tracking
- **Pipedrive**: Sales pipeline integration
- **Custom APIs**: Generic webhook connections

**Integration Features:**
- **Lead Creation**: Automatic lead generation from calls
- **Contact Updates**: Sync call data with contacts
- **Activity Logging**: Record call activities
- **Deal Attribution**: Link calls to opportunities

**4. Analytics Integrations**

**Google Analytics:**
- **Event Tracking**: Call events in GA
- **Goal Configuration**: Call completion goals
- **Attribution Models**: Multi-touch attribution
- **Custom Dimensions**: Call metadata in GA

**Facebook Pixel:**
- **Conversion Tracking**: Call-based conversions
- **Audience Building**: Retargeting based on calls
- **Event Optimization**: Optimize for call events
- **CAPI Integration**: Server-side event tracking

### Integration Management

**Setup Process:**
1. **Select Integration**: Choose from available options
2. **Authentication**: Configure API credentials
3. **Event Selection**: Choose events to sync
4. **Field Mapping**: Map data fields between systems
5. **Testing**: Verify integration functionality
6. **Monitoring**: Track integration performance

**Integration Status Monitoring:**
- **Connection Health**: Real-time status checking
- **Event Delivery**: Success/failure tracking
- **Error Logging**: Detailed error information
- **Performance Metrics**: Response times and throughput

---

## Phone Number Management

### Location: `/phone-numbers`

### Phone Number Overview

Phone Number Management provides centralized control over all telephony assets, including Twilio integration, webhook configuration, and usage tracking.

### Number List View

**Table Columns:**
- **Phone Number**: Formatted number display
- **Country**: Geographic region/country code
- **Type**: Local, Toll-Free, Mobile
- **Status**: Active, Inactive, Suspended
- **Campaign**: Currently assigned campaign
- **Pool**: Associated number pool
- **Webhook URL**: Current webhook configuration
- **Usage**: Call volume and usage statistics

### Number Management Operations

**1. Number Provisioning**

**Twilio Integration:**
- **Search Available**: Find numbers by area code/country
- **Purchase Numbers**: Automatic Twilio provisioning
- **Number Types**: Local, toll-free, mobile options
- **Geographic Filtering**: Region-specific searches

**Bulk Operations:**
- **Bulk Purchase**: Multiple number acquisition
- **CSV Import**: Import existing number lists
- **Batch Configuration**: Mass webhook setup
- **Area Code Allocation**: Geographic number planning

**2. Webhook Configuration**

**Automatic Setup:**
- **Campaign Assignment**: Auto-configure webhooks
- **Pool Assignment**: Pool-based webhook management
- **URL Generation**: Dynamic webhook URL creation
- **Authentication**: Secure webhook endpoints

**Manual Configuration:**
- **Custom Webhooks**: Direct URL specification
- **Authentication Tokens**: Security configuration
- **Fallback URLs**: Backup webhook endpoints
- **Status Callbacks**: Call status tracking

**3. Number Assignment and Routing**

**Assignment Types:**
- **Direct Assignment**: Single campaign assignment
- **Pool Assignment**: Dynamic pool-based routing
- **Shared Assignment**: Multi-campaign usage
- **Reserved Numbers**: Dedicated special numbers

**Routing Configuration:**
- **Primary Destination**: Main routing target
- **Fallback Routing**: Backup destinations
- **Time-based Routing**: Schedule-based changes
- **Geographic Routing**: Location-based routing

### Number Analytics

**Usage Metrics:**
- **Call Volume**: Calls per number over time
- **Duration Statistics**: Average call lengths
- **Success Rates**: Connection success rates
- **Revenue Attribution**: Revenue per number

**Performance Analysis:**
- **Peak Usage**: High-traffic time identification
- **Geographic Performance**: Regional performance
- **Campaign Attribution**: Performance by campaign
- **Cost Analysis**: Cost per call and revenue

**Health Monitoring:**
- **Connection Quality**: Call quality metrics
- **Webhook Status**: Webhook delivery success
- **Error Rates**: Failed call percentages
- **Response Times**: System response performance

### Twilio Integration Details

**API Connection:**
- **Account Configuration**: Twilio account setup
- **Authentication**: API key management
- **Rate Limiting**: API usage optimization
- **Error Handling**: Failure recovery mechanisms

**Webhook Management:**
- **TwiML Response**: Dynamic call routing
- **Status Callbacks**: Real-time call updates
- **Recording Control**: Automatic recording setup
- **Transcription**: Speech-to-text integration

**Number Lifecycle:**
- **Provisioning**: New number acquisition
- **Configuration**: Webhook and routing setup
- **Monitoring**: Usage and performance tracking
- **Retirement**: Number release and cleanup

---

## Settings & Configuration

### Location: `/settings`

### Settings Overview

The Settings section provides comprehensive platform configuration options for users, campaigns, system integration, and security settings.

### User Profile Settings

**Account Information:**
- **Username**: Login identifier (read-only)
- **Email Address**: Contact email
- **First Name**: User first name
- **Last Name**: User last name
- **Profile Image**: Avatar upload
- **Time Zone**: Local time zone setting
- **Language**: Interface language preference

**Security Settings:**
- **Password Change**: Current and new password
- **Two-Factor Authentication**: TOTP setup
- **API Keys**: Personal API key management
- **Session Management**: Active session control
- **Login History**: Recent login tracking

### System Configuration

**Twilio Integration:**
- **Account SID**: Twilio account identifier
- **Auth Token**: Twilio authentication token
- **Phone Number**: Default Twilio number
- **Webhook URL**: Base webhook endpoint
- **Voice Settings**: Default voice and language
- **Recording Options**: Global recording settings

**Database Settings:**
- **Connection Status**: Database health check
- **Backup Schedule**: Automated backup configuration
- **Performance Metrics**: Query performance monitoring
- **Maintenance Windows**: Scheduled maintenance times

### Campaign Defaults

**Default Settings:**
- **Recording Enabled**: Global recording default
- **Transcription**: Automatic transcription default
- **Timeout Values**: Default timeout settings
- **Retry Attempts**: Failed call retry configuration
- **Quality Thresholds**: Call quality requirements

**RTB Configuration:**
- **Default Timeout**: RTB auction timeout
- **Minimum Bid**: Global minimum bid amount
- **Currency**: Default currency setting
- **Auction Rules**: Default auction behavior

### Notification Settings

**Email Notifications:**
- **Campaign Alerts**: Campaign status changes
- **System Alerts**: Platform notifications
- **Performance Reports**: Scheduled reports
- **Security Alerts**: Security-related notifications
- **Billing Alerts**: Usage and billing notifications

**Webhook Notifications:**
- **Real-time Events**: Live event streaming
- **Batch Updates**: Scheduled batch notifications
- **Error Alerts**: System error notifications
- **Performance Alerts**: Performance threshold alerts

### Integration Settings

**API Configuration:**
- **API Rate Limits**: Request throttling settings
- **Authentication**: API security configuration
- **Webhook Security**: Signature verification
- **CORS Settings**: Cross-origin request policies

**Third-party Integrations:**
- **CRM Settings**: External CRM configuration
- **Analytics**: Google Analytics integration
- **Monitoring**: External monitoring setup
- **Compliance**: GDPR and privacy settings

### Advanced Settings

**Performance Optimization:**
- **Caching Settings**: System cache configuration
- **Database Optimization**: Query optimization settings
- **CDN Configuration**: Content delivery network
- **Load Balancing**: Traffic distribution settings

**Security Configuration:**
- **Access Control**: IP restrictions and allowlists
- **Encryption Settings**: Data encryption configuration
- **Audit Logging**: Security event logging
- **Compliance**: Regulatory compliance settings

---

## AI Help System

### Location: Accessible via Help button in top navigation

### AI Assistant Overview

The AI Help System provides intelligent assistance powered by Claude Sonnet 4, offering project-specific knowledge, code search capabilities, and comprehensive support for all platform features.

### AI Assistant Features

**1. Project-Specific Knowledge**
- **Platform Expertise**: Deep understanding of CallCenter Pro
- **Feature Guidance**: Step-by-step feature explanations
- **Troubleshooting**: Intelligent problem resolution
- **Best Practices**: Optimization recommendations

**2. Code Search Integration**
- **File System Access**: Search through project codebase
- **Function Lookup**: Find specific functions and methods
- **Class Definitions**: Locate class implementations
- **Documentation Search**: Find relevant documentation

**3. Contextual Assistance**
- **Page-Specific Help**: Help relevant to current page
- **Feature Explanations**: Detailed feature descriptions
- **Configuration Guidance**: Setup and configuration help
- **Integration Support**: Third-party integration assistance

### AI Chat Interface

**Chat Features:**
- **Natural Language**: Conversational interaction style
- **Code Examples**: Practical implementation examples
- **Visual Explanations**: Step-by-step guidance
- **Multi-turn Conversations**: Context-aware discussions

**Query Types Supported:**
- **"How do I set up RTB bidding?"**
- **"What's causing my webhook failures?"**
- **"Show me how to create a call flow"**
- **"Find the campaign validation logic"**
- **"Explain the DNI tracking system"**

### AI Knowledge Base

**System Understanding:**
- **Architecture Knowledge**: Complete system architecture
- **Data Flow**: Understanding of data connections
- **API Endpoints**: Knowledge of all API routes
- **Database Schema**: Complete database understanding
- **Integration Points**: External system connections

**Feature Expertise:**
- **Campaign Management**: Complete workflow knowledge
- **RTB System**: Auction process and configuration
- **Call Flows**: Visual builder and execution
- **DNI System**: Tracking and attribution
- **Reporting**: Analytics and metrics

### AI-Powered Troubleshooting

**Automated Diagnostics:**
- **Error Analysis**: Intelligent error interpretation
- **Log Analysis**: System log examination
- **Performance Issues**: Performance bottleneck identification
- **Configuration Validation**: Settings verification

**Solution Recommendations:**
- **Step-by-step Fixes**: Detailed resolution steps
- **Code Examples**: Implementation examples
- **Alternative Approaches**: Multiple solution options
- **Prevention Tips**: Avoid future issues

---

## Data Connections & Flow

### System Data Architecture

### Core Data Entities

**1. Users**
- **Primary Key**: Integer ID (auto-increment)
- **Authentication**: Username/password with sessions
- **Multi-tenancy**: All data scoped by user ID
- **Session Storage**: PostgreSQL-backed sessions

**2. Campaigns**
- **Primary Key**: UUID for external references
- **Ownership**: Linked to user ID
- **Types**: Direct, Pool, RTB routing
- **Status**: Active, Paused, Completed, Draft

**3. Buyers/Targets**
- **Primary Key**: Integer ID (auto-increment)
- **Campaign Links**: Many-to-many with campaigns
- **Routing Priority**: 1-10 priority ranking
- **Capacity Limits**: Concurrent and daily caps

**4. Phone Numbers**
- **Primary Key**: Integer ID (auto-increment)
- **Twilio Integration**: SID and configuration
- **Assignment**: Campaign or pool exclusive assignment
- **Webhook URLs**: Dynamic configuration

**5. Number Pools**
- **Primary Key**: Integer ID (auto-increment)
- **Number Collection**: One-to-many with phone numbers
- **Exclusive Assignment**: Conflict prevention
- **Dynamic Allocation**: Campaign assignment

**6. Calls**
- **Primary Key**: Integer ID (auto-increment)
- **Twilio Integration**: Call SID linking
- **Campaign Attribution**: Campaign and buyer linking
- **Performance Data**: Duration, cost, revenue
- **Geographic Data**: Location and routing info

**7. RTB System**
- **RTB Targets**: External bidding endpoints
- **Bid Requests**: Auction initiation records
- **Bid Responses**: Individual bidder responses
- **Auction Results**: Winner selection and routing

**8. Call Flows**
- **Flow Definitions**: Visual flow configurations
- **Node Configurations**: Individual node settings
- **Execution Logs**: Runtime flow tracking
- **Performance Metrics**: Flow analytics

### Data Flow Patterns

**1. Call Processing Flow**
```
Incoming Call (Twilio) →
Webhook Processing →
Campaign Identification →
Routing Decision (Direct/Pool/RTB) →
Buyer Selection/RTB Auction →
Call Routing →
Status Tracking →
Analytics Recording
```

**2. RTB Auction Flow**
```
Call Received →
RTB Campaign Detected →
Target Selection →
Parallel Bid Requests →
Response Collection →
Bid Validation →
Winner Selection →
Call Routing →
Auction Analytics
```

**3. DNI Tracking Flow**
```
Website Visit →
JavaScript SDK Execution →
Session Tracking →
UTM Parameter Capture →
Phone Number Assignment →
Call Attribution →
Conversion Tracking →
ROI Calculation
```

**4. Campaign Management Flow**
```
Campaign Creation →
Buyer Assignment →
Number/Pool Assignment →
Webhook Configuration →
Status Activation →
Call Routing →
Performance Tracking →
Analytics and Reporting
```

### Database Connections

**Primary Database**: PostgreSQL
- **ORM**: Drizzle for type-safe operations
- **Migrations**: Drizzle Kit for schema management
- **Connection Pooling**: Optimized connection management
- **Session Storage**: Express sessions in PostgreSQL

**Hybrid Storage Pattern**:
- **Database First**: Primary data source
- **Memory Fallback**: Backup for database failures
- **Performance Optimization**: Query optimization and caching
- **Error Handling**: Graceful degradation

### API Data Flow

**1. Frontend to Backend**
```
React Components →
TanStack Query →
API Requests →
Express Routes →
Storage Layer →
Database Operations →
Response Formatting →
Frontend Updates
```

**2. External Integrations**
```
Twilio Webhooks →
Route Processing →
Data Validation →
Business Logic →
Database Updates →
Response Generation →
External Confirmations
```

**3. RTB External Communication**
```
Auction Trigger →
Bid Request Generation →
HTTP Requests to Bidders →
Response Collection →
Parsing and Validation →
Winner Selection →
Call Routing Execution
```

### Real-time Data Updates

**1. Call Status Updates**
- **Twilio Webhooks**: Real-time call status
- **Database Updates**: Status persistence
- **Frontend Notifications**: Live updates
- **Analytics Updates**: Performance metrics

**2. Campaign Monitoring**
- **Performance Metrics**: Real-time calculations
- **Capacity Tracking**: Live buyer availability
- **Error Monitoring**: System health tracking
- **Alert Generation**: Threshold-based alerts

### Data Security and Isolation

**Multi-tenancy Implementation**:
- **User ID Scoping**: All queries filtered by user
- **Session Validation**: Authenticated requests only
- **Data Isolation**: Complete user data separation
- **Security Testing**: Comprehensive vulnerability testing

**Data Encryption**:
- **Transit Security**: HTTPS for all communications
- **Session Security**: Secure cookie configuration
- **API Security**: Token-based authentication
- **Database Security**: Connection encryption

---

## Technical Architecture

### System Components

### Frontend Architecture

**React Application Structure:**
```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── reporting/      # Reporting-specific components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── pages/              # Page components
│   ├── dashboard.tsx   # Main dashboard
│   ├── campaigns.tsx   # Campaign management
│   ├── buyers.tsx      # Buyer management
│   └── [other pages]
├── lib/                # Utility libraries
│   ├── queryClient.ts  # React Query configuration
│   ├── utils.ts        # General utilities
│   └── validation.ts   # Form validation
└── hooks/              # Custom React hooks
    ├── use-toast.ts    # Toast notifications
    └── [other hooks]
```

**State Management:**
- **TanStack React Query**: Server state management
- **React Hooks**: Local component state
- **Form State**: React Hook Form with Zod validation
- **Global State**: Minimal global state with Context API

### Backend Architecture

**Express Application Structure:**
```
server/
├── routes.ts           # Main API route definitions
├── storage.ts          # Abstract storage interface
├── storage-db.ts       # Database storage implementation
├── hybrid-storage.ts   # Hybrid storage with fallback
├── rtb-service.ts      # RTB auction logic
├── dni-service.ts      # DNI tracking service
├── call-routing.ts     # Call routing algorithms
├── webhook-handlers.ts # Twilio webhook processing
└── index.ts           # Application entry point
```

**API Architecture:**
- **RESTful Design**: Standard HTTP methods and status codes
- **Route Organization**: Logical grouping by feature
- **Middleware Stack**: Authentication, logging, error handling
- **Request Validation**: Zod schema validation
- **Response Formatting**: Consistent JSON responses

### Database Architecture

**PostgreSQL Schema Design:**
```sql
-- Core entity tables
users (id, username, email, password_hash, created_at)
campaigns (id, user_id, name, type, status, settings, created_at)
buyers (id, user_id, name, company, phone, priority, capacity)
phone_numbers (id, user_id, phone_number, country, type, status)
number_pools (id, user_id, name, description, status)

-- Relationship tables
campaign_buyers (campaign_id, buyer_id, priority, capacity)
pool_numbers (pool_id, phone_number_id, assigned_at)

-- Call tracking
calls (id, campaign_id, buyer_id, call_sid, from_number, to_number, 
       duration, status, cost, revenue, created_at)

-- RTB system
rtb_targets (id, user_id, name, endpoint_url, config, status)
bid_requests (id, request_id, campaign_id, targets_pinged, created_at)
bid_responses (id, request_id, target_id, bid_amount, response_time, status)

-- DNI tracking
tracking_tags (id, user_id, tag_code, campaign_id, config)
dni_sessions (id, session_id, tag_code, utm_params, phone_number, created_at)

-- Call flows
call_flows (id, user_id, name, flow_definition, status)
flow_executions (id, call_id, flow_id, execution_path, created_at)
```

**Database Optimization:**
- **Indexes**: Strategic indexing for performance
- **Query Optimization**: Efficient query patterns
- **Connection Pooling**: Optimized connection management
- **Migrations**: Drizzle Kit for schema evolution

### Integration Architecture

**Twilio Integration:**
```
CallCenter Pro ←→ Twilio Voice API
├── Webhook Endpoints: Incoming call processing
├── API Calls: Outbound call initiation
├── TwiML Generation: Dynamic call routing
└── Status Callbacks: Real-time call updates
```

**External RTB Integration:**
```
RTB Auction Engine ←→ External Bidders
├── HTTP Requests: Bid request distribution
├── Response Processing: Bid response parsing
├── Timeout Handling: Graceful failure management
└── Winner Selection: Auction result processing
```

### Performance Architecture

**Caching Strategy:**
- **Memory Caching**: Frequently accessed data
- **Query Caching**: Database query results
- **Session Caching**: User session data
- **CDN Integration**: Static asset delivery

**Optimization Techniques:**
- **Query Optimization**: Efficient database queries
- **Connection Pooling**: Database connection management
- **Async Processing**: Non-blocking operations
- **Error Handling**: Graceful error recovery

### Security Architecture

**Authentication & Authorization:**
- **Session-based Authentication**: Express sessions with PostgreSQL
- **Multi-tenancy**: User ID scoping for all operations
- **API Security**: Token-based API authentication
- **Role-based Access**: Granular permission system

**Data Security:**
- **Encryption in Transit**: HTTPS for all communications
- **Secure Sessions**: HTTP-only secure cookies
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: ORM-based query protection

### Monitoring & Observability

**Logging System:**
- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Debug, Info, Warning, Error
- **Request Logging**: HTTP request/response tracking
- **Error Tracking**: Comprehensive error logging

**Performance Monitoring:**
- **Response Time Tracking**: API endpoint performance
- **Database Query Performance**: Query execution monitoring
- **Memory Usage**: Application memory tracking
- **External Service Monitoring**: Twilio API performance

---

## API Documentation

### API Overview

The CallCenter Pro API provides comprehensive RESTful endpoints for all platform functionality with consistent request/response patterns and robust error handling.

### Authentication

**Session-based Authentication:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "sumit",
  "password": "demo123"
}

Response:
{
  "success": true,
  "user": {
    "id": 2,
    "username": "sumit",
    "email": "sumit@blinkdigital.in"
  }
}
```

**Session Management:**
```http
GET /api/auth/user
Cookie: connect.sid=s%3A[session-id]

Response:
{
  "id": 2,
  "username": "sumit",
  "email": "sumit@blinkdigital.in"
}
```

### Core API Endpoints

### Campaign Management

**List Campaigns:**
```http
GET /api/campaigns
Authorization: Session-based

Response:
[
  {
    "id": "928a699e-e241-46ab-bc54-9f6779d38b32",
    "name": "Health Campaign",
    "type": "pool",
    "status": "active",
    "phoneNumber": "+18562813889",
    "buyersCount": 1,
    "callsCount": 5,
    "successRate": 80.0,
    "revenue": "125.50"
  }
]
```

**Create Campaign:**
```http
POST /api/campaigns
Content-Type: application/json

{
  "name": "New Health Campaign",
  "description": "Medicare lead generation",
  "type": "pool",
  "status": "active",
  "routingType": "pool",
  "poolId": 16,
  "callRoutingStrategy": "priority",
  "maxConcurrentCalls": 10,
  "callCap": 100
}

Response:
{
  "id": "new-campaign-uuid",
  "name": "New Health Campaign",
  "status": "active",
  "created": true
}
```

**Update Campaign:**
```http
PUT /api/campaigns/:id
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "status": "paused",
  "maxConcurrentCalls": 15
}

Response:
{
  "id": "campaign-uuid",
  "updated": true,
  "changes": ["name", "status", "maxConcurrentCalls"]
}
```

### Buyer Management

**List Buyers:**
```http
GET /api/buyers

Response:
[
  {
    "id": 32,
    "name": "Premium Buyer",
    "company": "Health Solutions Inc",
    "phone": "+18005551234",
    "priority": 8,
    "status": "active",
    "maxConcurrentCalls": 5,
    "currentCalls": 2,
    "successRate": 85.5,
    "totalCalls": 1250
  }
]
```

**Create Buyer:**
```http
POST /api/buyers
Content-Type: application/json

{
  "name": "New Buyer",
  "company": "Lead Generation Co",
  "phone": "+18005559999",
  "email": "contact@leadgen.com",
  "priority": 7,
  "maxConcurrentCalls": 3,
  "dailyCallCap": 50,
  "status": "active"
}

Response:
{
  "id": 33,
  "name": "New Buyer",
  "created": true
}
```

### Call Management

**List Calls:**
```http
GET /api/calls?limit=50&offset=0&status=completed

Response:
{
  "calls": [
    {
      "id": 140,
      "campaignId": "928a699e-e241-46ab-bc54-9f6779d38b32",
      "buyerId": 32,
      "callSid": "CA62900b63849fc3eaaaab5cd85e25e582",
      "fromNumber": "+12129200892",
      "toNumber": "+18562813889",
      "duration": 125,
      "status": "completed",
      "cost": "0.0850",
      "revenue": "15.50",
      "createdAt": "2025-08-04T12:30:45Z"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

**Get Call Details:**
```http
GET /api/calls/:id

Response:
{
  "id": 140,
  "campaignId": "928a699e-e241-46ab-bc54-9f6779d38b32",
  "buyerId": 32,
  "callSid": "CA62900b63849fc3eaaaab5cd85e25e582",
  "fromNumber": "+12129200892",
  "toNumber": "+18562813889",
  "duration": 125,
  "status": "completed",
  "callQuality": "excellent",
  "recordingUrl": "https://api.twilio.com/recording123",
  "transcription": "Call transcription text...",
  "cost": "0.0850",
  "revenue": "15.50",
  "geoLocation": "New York, NY",
  "campaign": {
    "name": "Health Campaign",
    "type": "pool"
  },
  "buyer": {
    "name": "Premium Buyer",
    "company": "Health Solutions Inc"
  }
}
```

### RTB Management

**List RTB Targets:**
```http
GET /api/rtb/targets

Response:
[
  {
    "id": 38,
    "name": "MEDI - United Health - Tier 1",
    "company": "United Health Solutions",
    "endpointUrl": "https://api.unitedhealth.com/rtb/bid",
    "status": "active",
    "responseTimeMs": 450,
    "successRate": 92.5,
    "winRate": 15.2,
    "totalBids": 1847
  }
]
```

**Create RTB Target:**
```http
POST /api/rtb/targets
Content-Type: application/json

{
  "name": "New RTB Target",
  "company": "Bidding Company",
  "endpointUrl": "https://api.bidder.com/bid",
  "requestMethod": "POST",
  "requestTemplate": {
    "requestId": "{requestId}",
    "campaignId": "{campaignId}",
    "callerId": "{callerId}",
    "bidParams": {
      "minBid": "{minBid}",
      "maxBid": "{maxBid}"
    }
  },
  "responseConfig": {
    "bidAmountPath": "bidAmount",
    "destinationNumberPath": "destinationNumber",
    "acceptancePath": "accepted"
  },
  "timeoutMs": 5000,
  "maxConcurrentCalls": 10
}

Response:
{
  "id": 39,
  "name": "New RTB Target",
  "created": true
}
```

**Get RTB Bid Requests:**
```http
GET /api/rtb/bid-requests?limit=20

Response:
[
  {
    "id": 44,
    "requestId": "pool_16_CA540901",
    "campaignId": "928a699e-e241-46ab-bc54-9f6779d38b32",
    "callStartTime": "2025-08-04T12:30:45Z",
    "totalTargets": 33,
    "successfulResponses": 0,
    "failedResponses": 33,
    "totalResponseTimeMs": 3970,
    "winningBid": null,
    "winningTarget": null
  }
]
```

**Get Bid Request Details:**
```http
GET /api/rtb/bid-requests/:requestId/responses

Response:
[
  {
    "id": 156,
    "requestId": "pool_16_CA540901",
    "rtbTargetId": 5,
    "bidAmount": "0.00",
    "destinationNumber": null,
    "responseTimeMs": 459,
    "responseStatus": "success",
    "isWinningBid": false,
    "errorMessage": null,
    "rejectionReason": "Final capacity check (Code: 1006)"
  }
]
```

### Number Pool Management

**List Number Pools:**
```http
GET /api/pools

Response:
[
  {
    "id": 16,
    "name": "Health Pool",
    "description": "Healthcare campaign numbers",
    "country": "US",
    "totalNumbers": 25,
    "availableNumbers": 18,
    "assignedNumbers": 7,
    "status": "active"
  }
]
```

**Create Number Pool:**
```http
POST /api/pools
Content-Type: application/json

{
  "name": "New Pool",
  "description": "Insurance campaign pool",
  "country": "US",
  "status": "active"
}

Response:
{
  "id": 17,
  "name": "New Pool",
  "created": true
}
```

### Phone Number Management

**List Phone Numbers:**
```http
GET /api/phone-numbers

Response:
[
  {
    "id": 41,
    "phoneNumber": "+18562813889",
    "country": "US",
    "type": "local",
    "status": "active",
    "campaignId": "928a699e-e241-46ab-bc54-9f6779d38b32",
    "poolId": 16,
    "webhookUrl": "https://your-domain.com/api/webhooks/twilio",
    "totalCalls": 5,
    "successRate": 80.0
  }
]
```

### DNI Management

**Create Tracking Tag:**
```http
POST /api/dni/tags
Content-Type: application/json

{
  "tagCode": "landing_page_v2",
  "campaignId": "928a699e-e241-46ab-bc54-9f6779d38b32",
  "description": "Main landing page tracking",
  "attributionWindow": 30,
  "status": "active"
}

Response:
{
  "id": 15,
  "tagCode": "landing_page_v2",
  "jsCode": "<script>/* Generated tracking code */</script>",
  "created": true
}
```

**Track DNI Session:**
```http
POST /api/dni/track
Content-Type: application/json

{
  "tagCode": "landing_page_v2",
  "sessionId": "dni_1725456789_abc123",
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0...",
  "url": "https://landingpage.com/health",
  "utmParams": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "health_leads_2025"
  }
}

Response:
{
  "success": true,
  "phoneNumber": "+18562813889",
  "formattedNumber": "+1 (856) 281-3889",
  "sessionTracked": true
}
```

### Analytics and Reporting

**Get Dashboard Stats:**
```http
GET /api/stats/dashboard

Response:
{
  "activeCampaigns": 1,
  "totalCalls": 5,
  "successRate": 80.0,
  "totalRevenue": "125.50",
  "recentCalls": [
    {
      "id": 140,
      "fromNumber": "+12129200892",
      "status": "completed",
      "duration": 125,
      "createdAt": "2025-08-04T12:30:45Z"
    }
  ]
}
```

**Get Historical Analytics:**
```http
GET /api/stats/historical?days=30

Response:
{
  "activeCampaigns": 1,
  "totalCalls": 5,
  "successRate": 80.0,
  "totalRevenue": "125.50",
  "averageDuration": 98,
  "callsByDay": [
    {
      "date": "2025-08-04",
      "calls": 5,
      "revenue": "125.50"
    }
  ],
  "topCampaigns": [
    {
      "campaignId": "928a699e-e241-46ab-bc54-9f6779d38b32",
      "name": "Health Campaign",
      "calls": 5,
      "revenue": "125.50"
    }
  ]
}
```

### Webhook Endpoints

**Twilio Call Webhook:**
```http
POST /api/webhooks/twilio
Content-Type: application/x-www-form-urlencoded

CallSid=CA123456789&From=%2B12129200892&To=%2B18562813889&CallStatus=ringing

Response:
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" record="true">
    <Number>+18005551234</Number>
  </Dial>
</Response>
```

**Call Status Webhook:**
```http
POST /api/webhooks/twilio/status
Content-Type: application/x-www-form-urlencoded

CallSid=CA123456789&CallStatus=completed&CallDuration=125

Response:
{
  "received": true,
  "callId": 140,
  "status": "completed"
}
```

### Error Handling

**Standard Error Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid campaign configuration",
    "details": {
      "field": "phoneNumber",
      "reason": "Phone number is already assigned to another campaign"
    }
  }
}
```

**Common Error Codes:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate assignment)
- `422 Unprocessable Entity`: Validation failed
- `500 Internal Server Error`: Server error

### Rate Limiting

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1725456789
```

**Rate Limit Response:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "retryAfter": 60
  }
}
```

---

## Database Schema

### Schema Overview

CallCenter Pro uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema is designed for multi-tenancy with user-scoped data access.

### Core Tables

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_image_url VARCHAR(500),
  time_zone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### Campaigns Table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'pool', 'rtb')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'paused', 'completed', 'draft')),
  routing_type VARCHAR(20) NOT NULL,
  phone_number VARCHAR(20),
  pool_id INTEGER REFERENCES number_pools(id),
  call_routing_strategy VARCHAR(20) DEFAULT 'priority',
  max_concurrent_calls INTEGER DEFAULT 10,
  call_cap INTEGER DEFAULT 100,
  call_timeout INTEGER DEFAULT 30,
  recording_enabled BOOLEAN DEFAULT true,
  transcription_enabled BOOLEAN DEFAULT false,
  webhook_url VARCHAR(500),
  tracking_pixel_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_pool_id ON campaigns(pool_id);
```

### Buyers Table
```sql
CREATE TABLE buyers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  backup_phone VARCHAR(20),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  max_concurrent_calls INTEGER DEFAULT 5,
  daily_call_cap INTEGER DEFAULT 100,
  hourly_call_cap INTEGER DEFAULT 20,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  business_hours JSONB DEFAULT '{}',
  time_zone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_buyers_user_id ON buyers(user_id);
CREATE INDEX idx_buyers_status ON buyers(status);
CREATE INDEX idx_buyers_priority ON buyers(priority);
```

### Campaign Buyers Relationship
```sql
CREATE TABLE campaign_buyers (
  id SERIAL PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  buyer_id INTEGER NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5,
  capacity_override INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, buyer_id)
);

-- Indexes
CREATE INDEX idx_campaign_buyers_campaign_id ON campaign_buyers(campaign_id);
CREATE INDEX idx_campaign_buyers_buyer_id ON campaign_buyers(buyer_id);
CREATE INDEX idx_campaign_buyers_priority ON campaign_buyers(priority);
```

### Number Pools Table
```sql
CREATE TABLE number_pools (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  country VARCHAR(3) DEFAULT 'US',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  webhook_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Indexes
CREATE INDEX idx_number_pools_user_id ON number_pools(user_id);
CREATE INDEX idx_number_pools_status ON number_pools(status);
```

### Phone Numbers Table
```sql
CREATE TABLE phone_numbers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  formatted_number VARCHAR(30),
  country VARCHAR(3) DEFAULT 'US',
  type VARCHAR(20) DEFAULT 'local' CHECK (type IN ('local', 'toll_free', 'mobile')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  twilio_sid VARCHAR(100),
  campaign_id UUID REFERENCES campaigns(id),
  pool_id INTEGER REFERENCES number_pools(id),
  webhook_url VARCHAR(500),
  voice_url VARCHAR(500),
  status_callback_url VARCHAR(500),
  purchased_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_phone_number ON phone_numbers(phone_number);
CREATE INDEX idx_phone_numbers_campaign_id ON phone_numbers(campaign_id);
CREATE INDEX idx_phone_numbers_pool_id ON phone_numbers(pool_id);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);
```

### Calls Table
```sql
CREATE TABLE calls (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  buyer_id INTEGER REFERENCES buyers(id),
  target_id INTEGER REFERENCES buyers(id), -- Same as buyer_id, for flexibility
  publisher_id INTEGER,
  publisher_name VARCHAR(255),
  publisher_sub_id VARCHAR(100),
  tracking_tag_id INTEGER,
  inbound_number VARCHAR(20),
  inbound_call_id VARCHAR(100),
  call_sid VARCHAR(100) UNIQUE NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  flow_execution_id INTEGER,
  ring_tree_id INTEGER,
  current_node_id INTEGER,
  flow_path JSONB,
  routing_attempts INTEGER DEFAULT 0,
  dialed_number VARCHAR(20),
  number_pool_id INTEGER REFERENCES number_pools(id),
  phone_number_id INTEGER REFERENCES phone_numbers(id),
  duration INTEGER DEFAULT 0, -- in seconds
  ring_time INTEGER DEFAULT 0,
  talk_time INTEGER DEFAULT 0,
  hold_time INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'initiated',
  disposition VARCHAR(50),
  hangup_cause VARCHAR(50),
  call_quality VARCHAR(20),
  connection_time TIMESTAMP,
  audio_quality JSONB,
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of_call_id INTEGER,
  cost DECIMAL(10,4) DEFAULT 0.0000,
  payout DECIMAL(10,4) DEFAULT 0.0000,
  revenue DECIMAL(10,4) DEFAULT 0.0000,
  profit DECIMAL(10,4) DEFAULT 0.0000,
  margin DECIMAL(5,2) DEFAULT 0.00,
  tags TEXT[],
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  referrer VARCHAR(500),
  landing_page VARCHAR(500),
  geo_location JSONB,
  user_agent TEXT,
  ip_address INET,
  recording_url VARCHAR(500),
  recording_sid VARCHAR(100),
  recording_status VARCHAR(20),
  recording_duration INTEGER,
  transcription TEXT,
  transcription_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_campaign_id ON calls(campaign_id);
CREATE INDEX idx_calls_buyer_id ON calls(buyer_id);
CREATE INDEX idx_calls_call_sid ON calls(call_sid);
CREATE INDEX idx_calls_from_number ON calls(from_number);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_utm_source ON calls(utm_source);
```

### RTB System Tables

### RTB Targets
```sql
CREATE TABLE rtb_targets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  endpoint_url VARCHAR(500) NOT NULL,
  request_method VARCHAR(10) DEFAULT 'POST',
  request_headers JSONB DEFAULT '{}',
  request_template JSONB NOT NULL,
  response_config JSONB NOT NULL,
  timeout_ms INTEGER DEFAULT 5000,
  max_concurrent_calls INTEGER DEFAULT 10,
  daily_call_cap INTEGER DEFAULT 1000,
  hourly_call_cap INTEGER DEFAULT 100,
  min_bid_amount DECIMAL(10,2) DEFAULT 0.00,
  max_bid_amount DECIMAL(10,2) DEFAULT 1000.00,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'testing')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_rtb_targets_user_id ON rtb_targets(user_id);
CREATE INDEX idx_rtb_targets_status ON rtb_targets(status);
```

### Campaign RTB Targets Relationship
```sql
CREATE TABLE campaign_rtb_targets (
  id SERIAL PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  rtb_target_id INTEGER NOT NULL REFERENCES rtb_targets(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 5,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, rtb_target_id)
);

-- Indexes
CREATE INDEX idx_campaign_rtb_targets_campaign_id ON campaign_rtb_targets(campaign_id);
CREATE INDEX idx_campaign_rtb_targets_rtb_target_id ON campaign_rtb_targets(rtb_target_id);
```

### RTB Bid Requests
```sql
CREATE TABLE rtb_bid_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id VARCHAR(100) UNIQUE NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  call_id INTEGER REFERENCES calls(id),
  call_start_time TIMESTAMP NOT NULL,
  caller_number VARCHAR(20),
  inbound_number VARCHAR(20),
  geo_location JSONB,
  utm_params JSONB,
  total_targets INTEGER DEFAULT 0,
  successful_responses INTEGER DEFAULT 0,
  failed_responses INTEGER DEFAULT 0,
  timeout_responses INTEGER DEFAULT 0,
  total_response_time_ms INTEGER DEFAULT 0,
  average_response_time_ms INTEGER DEFAULT 0,
  winning_bid_amount DECIMAL(10,2),
  winning_target_id INTEGER REFERENCES rtb_targets(id),
  winning_destination VARCHAR(20),
  auction_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_rtb_bid_requests_user_id ON rtb_bid_requests(user_id);
CREATE INDEX idx_rtb_bid_requests_request_id ON rtb_bid_requests(request_id);
CREATE INDEX idx_rtb_bid_requests_campaign_id ON rtb_bid_requests(campaign_id);
CREATE INDEX idx_rtb_bid_requests_call_id ON rtb_bid_requests(call_id);
CREATE INDEX idx_rtb_bid_requests_created_at ON rtb_bid_requests(created_at);
```

### RTB Bid Responses
```sql
CREATE TABLE rtb_bid_responses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bid_request_id INTEGER NOT NULL REFERENCES rtb_bid_requests(id) ON DELETE CASCADE,
  rtb_target_id INTEGER NOT NULL REFERENCES rtb_targets(id),
  request_sent_at TIMESTAMP NOT NULL,
  response_received_at TIMESTAMP,
  response_time_ms INTEGER,
  http_status_code INTEGER,
  response_status VARCHAR(20), -- 'success', 'timeout', 'error', 'rejected'
  bid_amount DECIMAL(10,2) DEFAULT 0.00,
  bid_currency VARCHAR(3) DEFAULT 'USD',
  destination_number VARCHAR(20),
  is_accepted BOOLEAN DEFAULT false,
  is_winning_bid BOOLEAN DEFAULT false,
  rejection_reason VARCHAR(255),
  error_message TEXT,
  raw_request TEXT,
  raw_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_rtb_bid_responses_user_id ON rtb_bid_responses(user_id);
CREATE INDEX idx_rtb_bid_responses_bid_request_id ON rtb_bid_responses(bid_request_id);
CREATE INDEX idx_rtb_bid_responses_rtb_target_id ON rtb_bid_responses(rtb_target_id);
CREATE INDEX idx_rtb_bid_responses_response_status ON rtb_bid_responses(response_status);
CREATE INDEX idx_rtb_bid_responses_is_winning_bid ON rtb_bid_responses(is_winning_bid);
```

### DNI System Tables

### Tracking Tags
```sql
CREATE TABLE tracking_tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_code VARCHAR(100) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  attribution_window INTEGER DEFAULT 30, -- days
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  js_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tag_code)
);

-- Indexes
CREATE INDEX idx_tracking_tags_user_id ON tracking_tags(user_id);
CREATE INDEX idx_tracking_tags_tag_code ON tracking_tags(tag_code);
CREATE INDEX idx_tracking_tags_campaign_id ON tracking_tags(campaign_id);
```

### DNI Sessions
```sql
CREATE TABLE dni_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  tracking_tag_id INTEGER NOT NULL REFERENCES tracking_tags(id),
  phone_number VARCHAR(20),
  phone_number_id INTEGER REFERENCES phone_numbers(id),
  referrer VARCHAR(500),
  landing_page VARCHAR(500),
  user_agent TEXT,
  ip_address INET,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  custom_params JSONB DEFAULT '{}',
  attribution_data JSONB DEFAULT '{}',
  first_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  page_views INTEGER DEFAULT 1,
  converted BOOLEAN DEFAULT false,
  conversion_time TIMESTAMP,
  call_id INTEGER REFERENCES calls(id)
);

-- Indexes
CREATE INDEX idx_dni_sessions_user_id ON dni_sessions(user_id);
CREATE INDEX idx_dni_sessions_session_id ON dni_sessions(session_id);
CREATE INDEX idx_dni_sessions_tracking_tag_id ON dni_sessions(tracking_tag_id);
CREATE INDEX idx_dni_sessions_phone_number ON dni_sessions(phone_number);
CREATE INDEX idx_dni_sessions_utm_source ON dni_sessions(utm_source);
CREATE INDEX idx_dni_sessions_first_visit ON dni_sessions(first_visit);
```

### Call Flow System Tables

### Call Flows
```sql
CREATE TABLE call_flows (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  flow_definition JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_call_flows_user_id ON call_flows(user_id);
CREATE INDEX idx_call_flows_status ON call_flows(status);
```

### Flow Executions
```sql
CREATE TABLE flow_executions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_id INTEGER NOT NULL REFERENCES calls(id),
  flow_id INTEGER NOT NULL REFERENCES call_flows(id),
  execution_path JSONB NOT NULL,
  current_node_id VARCHAR(100),
  variables JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'running',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_flow_executions_user_id ON flow_executions(user_id);
CREATE INDEX idx_flow_executions_call_id ON flow_executions(call_id);
CREATE INDEX idx_flow_executions_flow_id ON flow_executions(flow_id);
```

### Integration Tables

### URL Parameters
```sql
CREATE TABLE url_parameters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parameter_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  parameter_type VARCHAR(20) DEFAULT 'string',
  default_value VARCHAR(255),
  tracking_scope VARCHAR(20) DEFAULT 'global',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, parameter_name)
);

-- Indexes
CREATE INDEX idx_url_parameters_user_id ON url_parameters(user_id);
CREATE INDEX idx_url_parameters_parameter_name ON url_parameters(parameter_name);
```

### Session Management
```sql
CREATE TABLE session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Indexes
CREATE INDEX idx_session_expire ON session(expire);
```

### Data Relationships

### Key Relationships:
1. **Users** → All entities (multi-tenancy)
2. **Campaigns** → Buyers (many-to-many via campaign_buyers)
3. **Campaigns** → Phone Numbers (via direct assignment or pools)
4. **Campaigns** → RTB Targets (many-to-many via campaign_rtb_targets)
5. **Number Pools** → Phone Numbers (one-to-many)
6. **Calls** → Campaigns, Buyers, Phone Numbers (many-to-one)
7. **RTB Bid Requests** → RTB Bid Responses (one-to-many)
8. **DNI Sessions** → Tracking Tags, Phone Numbers, Calls

### Performance Considerations:
- **Indexes**: Strategic indexing on frequently queried columns
- **Partitioning**: Consider partitioning large tables like calls by date
- **Archiving**: Archive old call data to maintain performance
- **Query Optimization**: Use appropriate joins and avoid N+1 queries

---

## Troubleshooting & Support

### Common Issues and Solutions

### 1. Authentication Issues

**Problem**: "Unauthorized" errors or login failures
**Solutions:**
- **Check Credentials**: Verify username: `sumit`, password: `demo123`
- **Clear Cookies**: Clear browser cookies and try again
- **Session Timeout**: Re-login if session has expired
- **Database Connection**: Check PostgreSQL connection status

**Debug Steps:**
```bash
# Check database connection
curl -X GET http://localhost:5000/api/auth/user

# Expected response if not authenticated:
{"message":"Unauthorized"}

# Login again:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sumit","password":"demo123"}'
```

### 2. RTB Auction Issues

**Problem**: RTB auctions showing no bids or all rejections
**Common Causes:**
- **Target Configuration**: Incorrect endpoint URLs
- **Timeout Issues**: Bidders taking too long to respond
- **Authentication**: Invalid API keys or tokens
- **Network Issues**: Connectivity problems

**Diagnostic Steps:**
1. **Check Target Status**: Verify all RTB targets are active
2. **Test Endpoints**: Manually test bidder endpoints
3. **Review Logs**: Check application logs for errors
4. **Validate Templates**: Ensure request templates are valid JSON

**Sample Debug Request:**
```bash
# Test RTB target manually
curl -X POST https://api.bidder.com/bid \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test_123",
    "campaignId": "test_campaign",
    "callerId": "+12125551234",
    "callStartTime": "2025-08-04T12:30:45Z"
  }'
```

### 3. Call Routing Failures

**Problem**: Calls not routing to buyers or failing to connect
**Common Causes:**
- **Webhook Configuration**: Incorrect Twilio webhooks
- **Buyer Availability**: No available buyers
- **Phone Number Issues**: Invalid or unassigned numbers
- **Capacity Limits**: Buyers at capacity

**Debug Process:**
1. **Check Webhook URLs**: Verify Twilio webhook configuration
2. **Buyer Status**: Ensure buyers are active and available
3. **Phone Numbers**: Verify number assignment and webhooks
4. **Capacity Monitoring**: Check buyer concurrent call limits

**Webhook Testing:**
```bash
# Test webhook manually
curl -X POST http://localhost:5000/api/webhooks/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA123456789&From=%2B12125551234&To=%2B18005551234&CallStatus=ringing"
```

### 4. DNI Tracking Issues

**Problem**: Phone numbers not replacing on website or tracking not working
**Common Causes:**
- **JavaScript Errors**: Console errors preventing execution
- **CORS Issues**: Cross-origin request problems
- **Wrong Selectors**: Incorrect CSS selectors for replacement
- **Network Blocking**: Ad blockers or network restrictions

**Debug Steps:**
1. **Check Console**: Look for JavaScript errors in browser console
2. **Network Tab**: Verify API requests are being made
3. **Element Selection**: Confirm CSS selectors match elements
4. **Test Locally**: Test tracking code in isolated environment

**Debug JavaScript:**
```javascript
// Add to tracking code for debugging
fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(trackingData)
})
.then(response => {
  console.log('DNI Response Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('DNI Response Data:', data);
  // Phone number replacement logic
})
.catch(error => {
  console.error('DNI Tracking Error:', error);
});
```

### 5. Database Connection Issues

**Problem**: Database errors or connection failures
**Common Causes:**
- **Connection String**: Invalid DATABASE_URL
- **Network Issues**: Connectivity to database server
- **Credentials**: Invalid database credentials
- **Schema Issues**: Missing tables or columns

**Diagnostic Commands:**
```bash
# Check database environment variable
echo $DATABASE_URL

# Test database connection manually
psql $DATABASE_URL -c "SELECT NOW();"

# Check table existence
psql $DATABASE_URL -c "\dt"
```

### 6. Performance Issues

**Problem**: Slow response times or timeouts
**Common Causes:**
- **Database Queries**: Inefficient or missing indexes
- **External API Calls**: Slow third-party services
- **Memory Issues**: High memory usage
- **Network Latency**: Connectivity issues

**Performance Monitoring:**
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/calls

# Check database query performance
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM calls WHERE user_id = 2 LIMIT 10;"
```

### Error Code Reference

### HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict
- **422 Unprocessable Entity**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Application Error Codes
- **VALIDATION_ERROR**: Data validation failed
- **AUTHENTICATION_FAILED**: Invalid credentials
- **AUTHORIZATION_FAILED**: Insufficient permissions
- **RESOURCE_NOT_FOUND**: Requested resource missing
- **RESOURCE_CONFLICT**: Duplicate or conflicting resource
- **EXTERNAL_SERVICE_ERROR**: Third-party service failure
- **DATABASE_ERROR**: Database operation failed
- **NETWORK_ERROR**: Network connectivity issue

### RTB-Specific Error Codes
- **1002**: Daily cap exceeded
- **1003**: Geographic restriction
- **1004**: Time-based filter
- **1005**: Quality score too low
- **1006**: Final capacity check
- **1007**: Budget limit reached
- **1008**: Duplicate caller detected
- **1009**: Invalid caller state
- **1010**: Campaign paused

### Support Resources

### Logs and Monitoring
- **Application Logs**: Check server console for detailed error messages
- **Database Logs**: Monitor PostgreSQL logs for query issues
- **Twilio Logs**: Check Twilio console for webhook delivery status
- **Browser Console**: JavaScript errors and network requests

### Contact Information
- **Technical Support**: Use the AI Help system for immediate assistance
- **Documentation**: Refer to this comprehensive documentation
- **Code Repository**: Check the codebase for implementation details
- **Community**: Engage with other users for shared solutions

### Maintenance and Updates
- **Regular Backups**: Automated database backups
- **Security Updates**: Regular dependency updates
- **Performance Monitoring**: Continuous performance tracking
- **Feature Updates**: Regular platform enhancements

---

*This documentation is comprehensive and covers all aspects of the CallCenter Pro platform. For specific technical questions or issues not covered here, use the AI Help system for immediate assistance.*