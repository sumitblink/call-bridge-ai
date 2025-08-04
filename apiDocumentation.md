# CallCenter Pro API Documentation

## Overview

This document provides comprehensive API documentation for the CallCenter Pro system, covering all endpoints for campaign management, call routing, RTB auctions, DNI tracking, health monitoring, and system integration.

## Base URL
```
https://call-center-ringba.replit.app/api
```

## Authentication Credentials
```
Email: sumit@blinkdigital.in
Password: demo1234
```

## Authentication

All API requests require session-based authentication. Login to establish a session, then use session cookies for subsequent requests.

### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "sumit@blinkdigital.in",
  "password": "demo1234"
}
```

**cURL:**
```bash
curl -X POST https://call-center-ringba.replit.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sumit@blinkdigital.in", "password": "demo1234"}' \
  -c cookies.txt
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 2,
    "email": "sumit@blinkdigital.in",
    "firstName": null,
    "lastName": null
  }
}
```

### Check Authentication Status
```http
GET /api/auth/user
```

**cURL:**
```bash
curl -X GET https://call-center-ringba.replit.app/api/auth/user \
  -b cookies.txt
```

**Response (Authenticated):**
```json
{
  "id": 2,
  "username": "sumit",
  "email": "sumit@blinkdigital.in",
  "firstName": null,
  "lastName": null,
  "profileImageUrl": null
}
```

**Response (Not Authenticated):**
```json
{
  "message": "Unauthorized"
}
```

### Logout
```http
POST /api/logout
```

**cURL:**
```bash
curl -X POST https://call-center-ringba.replit.app/api/logout \
  -b cookies.txt
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

## Campaign Management

### List Campaigns
```http
GET /api/campaigns
```

**cURL:**
```bash
curl -X GET https://call-center-ringba.replit.app/api/campaigns \
  -b cookies.txt
```

**Response:**
```json
[
  {
    "id": "campaign_uuid",
    "name": "Summer Campaign",
    "description": "Q2 lead generation",
    "phoneNumber": "+1234567890",
    "routingType": "priority",
    "status": "active",
    "enableRtb": true,
    "rtbId": "abc123def456",
    "minBiddersRequired": 2,
    "biddingTimeoutMs": 3000,
    "callerIdRequired": true,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Create Campaign
```http
POST /api/campaigns
Content-Type: application/json

{
  "name": "New Campaign",
  "description": "Campaign description",
  "phoneNumber": "+1234567890",
  "routingType": "priority",
  "status": "active",
  "enableRtb": true,
  "minBiddersRequired": 2,
  "biddingTimeoutMs": 3000,
  "callerIdRequired": false
}
```

**cURL:**
```bash
curl -X POST https://call-center-ringba.replit.app/api/campaigns \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "New Campaign",
    "description": "Campaign description",
    "phoneNumber": "+1234567890",
    "routingType": "priority",
    "status": "active",
    "enableRtb": true,
    "minBiddersRequired": 2,
    "biddingTimeoutMs": 3000,
    "callerIdRequired": false
  }'
```

### Update Campaign
```http
PUT /api/campaigns/{id}
Content-Type: application/json

{
  "name": "Updated Campaign",
  "status": "paused",
  "enableRtb": false
}
```

### Delete Campaign
```http
DELETE /api/campaigns/{id}
```

### Campaign RTB Configuration
```http
PUT /api/campaigns/{id}/rtb-config
Content-Type: application/json

{
  "enableRtb": true,
  "minBiddersRequired": 3,
  "biddingTimeoutMs": 5000,
  "callerIdRequired": true
}
```

## RTB (Real-Time Bidding) Management

### List RTB Targets
```http
GET /api/rtb/targets
```

**cURL:**
```bash
curl -X GET https://call-center-ringba.replit.app/api/rtb/targets \
  -b cookies.txt
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Premium Buyer Network",
    "endpointUrl": "https://buyer.example.com/rtb/bid",
    "httpMethod": "POST",
    "contentType": "application/json",
    "authMethod": "bearer",
    "authToken": "bearer_token_here",
    "minBidAmount": 5.00,
    "maxBidAmount": 50.00,
    "currency": "USD",
    "timeoutMs": 3000,
    "isActive": true,
    "states": ["CA", "NY", "TX"],
    "excludedStates": ["AL"],
    "zipCodes": ["90210", "10001"],
    "excludedZipCodes": ["12345"]
  }
]
```

### Create RTB Target
```http
POST /api/rtb/targets
Content-Type: application/json

{
  "name": "New RTB Target",
  "endpointUrl": "https://buyer.example.com/rtb/bid",
  "httpMethod": "POST",
  "contentType": "application/json",
  "authMethod": "bearer",
  "authToken": "bearer_token_here",
  "minBidAmount": 10.00,
  "maxBidAmount": 100.00,
  "currency": "USD",
  "timeoutMs": 5000,
  "isActive": true,
  "states": ["CA", "NY"],
  "excludedStates": [],
  "zipCodes": [],
  "excludedZipCodes": [],
  "bidAmountPath": "$.bid.amount",
  "destinationNumberPath": "$.destination.phone",
  "currencyPath": "$.bid.currency",
  "durationPath": "$.requirements.duration",
  "acceptancePath": "$.accepted"
}
```

**cURL:**
```bash
curl -X POST https://call-center-ringba.replit.app/api/rtb/targets \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "New RTB Target",
    "endpointUrl": "https://buyer.example.com/rtb/bid",
    "httpMethod": "POST",
    "contentType": "application/json",
    "authMethod": "bearer",
    "authToken": "bearer_token_here",
    "minBidAmount": 10.00,
    "maxBidAmount": 100.00,
    "currency": "USD",
    "timeoutMs": 5000,
    "isActive": true,
    "states": ["CA", "NY"],
    "excludedStates": [],
    "zipCodes": [],
    "excludedZipCodes": [],
    "bidAmountPath": "$.bid.amount",
    "destinationNumberPath": "$.destination.phone",
    "currencyPath": "$.bid.currency",
    "durationPath": "$.requirements.duration",
    "acceptancePath": "$.accepted"
  }'
```

### Update RTB Target
```http
PUT /api/rtb/targets/{id}
Content-Type: application/json

{
  "name": "Updated RTB Target",
  "isActive": false,
  "minBidAmount": 15.00
}
```

### Delete RTB Target
```http
DELETE /api/rtb/targets/{id}
```

## RTB Health Monitoring & Security

### Perform Health Checks
```http
GET /api/rtb/health-checks
```

**cURL:**
```bash
curl -X GET https://call-center-ringba.replit.app/api/rtb/health-checks \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-08-04T12:00:00Z",
  "totalTargets": 5,
  "healthyTargets": 4,
  "unhealthyTargets": 1,
  "results": [
    {
      "targetId": 1,
      "targetName": "Premium Buyer Network",
      "endpointUrl": "https://buyer.example.com/rtb/bid",
      "healthy": true,
      "responseTime": 245,
      "error": null,
      "lastChecked": "2025-08-04T12:00:00Z"
    },
    {
      "targetId": 2,
      "targetName": "Secondary Network",
      "endpointUrl": "https://backup.example.com/rtb/bid",
      "healthy": false,
      "responseTime": 5000,
      "error": "HTTP 500",
      "lastChecked": "2025-08-04T12:00:00Z"
    }
  ]
}
```

### Get Target Uptime Statistics
```http
GET /api/rtb/targets/{targetId}/uptime?hours=24
```

**cURL:**
```bash
curl -X GET "https://call-center-ringba.replit.app/api/rtb/targets/1/uptime?hours=24" \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "targetId": 1,
  "period": "24 hours",
  "uptime": 98.5,
  "totalChecks": 144,
  "timestamp": "2025-08-04T12:00:00Z"
}
```

## Campaign RTB Target Assignments

### Get Campaign RTB Targets
```http
GET /api/campaigns/{campaignId}/rtb-targets
```

**Response:**
```json
[
  {
    "campaignId": "campaign_uuid",
    "rtbTargetId": 1,
    "targetName": "Premium Buyer Network",
    "isActive": true,
    "createdAt": "2025-08-04T10:00:00Z"
  }
]
```

### Update Campaign RTB Target Assignments
```http
PUT /api/campaigns/{campaignId}/rtb-targets
Content-Type: application/json

{
  "assignments": [
    {
      "targetId": 1,
      "priority": 1,
      "isActive": true
    },
    {
      "targetId": 2,
      "priority": 2,
      "isActive": true
    }
  ]
}
```

## RTB Analytics & Reporting

### Get RTB Bid Requests
```http
GET /api/rtb/bid-requests?page=1&limit=50&campaignId=campaign_uuid
```

**cURL:**
```bash
curl -X GET "https://call-center-ringba.replit.app/api/rtb/bid-requests?page=1&limit=50&campaignId=campaign_uuid" \
  -b cookies.txt
```

**Response:**
```json
{
  "bidRequests": [
    {
      "id": 1,
      "requestId": "req_12345",
      "campaignId": "campaign_uuid",
      "callerId": "555***1234",
      "callerState": "CA",
      "callerZip": "90210",
      "callStartTime": "2025-08-04T12:00:00Z",
      "totalTargetsPinged": 3,
      "successfulResponses": 2,
      "winningBidAmount": 25.50,
      "winningTargetId": 1,
      "biddingCompletedAt": "2025-08-04T12:00:03Z",
      "totalResponseTimeMs": 1247
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Get RTB Bid Responses
```http
GET /api/rtb/bid-responses?requestId=req_12345
```

**Response:**
```json
[
  {
    "id": 1,
    "requestId": "req_12345",
    "rtbTargetId": 1,
    "targetName": "Premium Buyer Network",
    "bidAmount": 25.50,
    "bidCurrency": "USD",
    "destinationNumber": "555***9876",
    "responseTimeMs": 456,
    "responseStatus": "success",
    "isValid": true,
    "isWinningBid": true,
    "rejectionReason": null
  },
  {
    "id": 2,
    "requestId": "req_12345",
    "rtbTargetId": 2,
    "targetName": "Secondary Network",
    "bidAmount": 20.00,
    "bidCurrency": "USD",
    "destinationNumber": "555***5432",
    "responseTimeMs": 1247,
    "responseStatus": "success",
    "isValid": true,
    "isWinningBid": false,
    "rejectionReason": null
  }
]
```

### Get RTB Auction Details
```http
GET /api/rtb/auction-details?callId=123&limit=100
```

**Response:**
```json
[
  {
    "id": 1,
    "callId": 123,
    "auctionId": "auction_1754290000_abc123",
    "rtbTargetId": 1,
    "targetName": "Premium Buyer Network",
    "bidAmount": "25.50",
    "auctionStatus": "won",
    "responseTimeMs": 456,
    "destinationNumber": "555***9876",
    "isWinner": true,
    "rejectionReason": null,
    "createdAt": "2025-08-04T12:00:00Z"
  }
]
```

## Buyer Management

### List Buyers
```http
GET /api/buyers
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "companyName": "Acme Corp",
    "email": "john@acme.com",
    "phoneNumber": "555***1234",
    "priority": 1,
    "maxConcurrentCalls": 5,
    "isActive": true,
    "operatingHours": {
      "monday": {"start": "09:00", "end": "17:00"},
      "tuesday": {"start": "09:00", "end": "17:00"}
    }
  }
]
```

### Create Buyer
```http
POST /api/buyers
Content-Type: application/json

{
  "name": "Jane Smith",
  "companyName": "Smith Solutions",
  "email": "jane@smith.com",
  "phoneNumber": "+1234567890",
  "priority": 2,
  "maxConcurrentCalls": 3,
  "isActive": true,
  "operatingHours": {
    "monday": {"start": "08:00", "end": "18:00"}
  }
}
```

### Get Buyer Financial Statistics
```http
GET /api/buyers/stats
```

**Response:**
```json
[
  {
    "id": 1,
    "companyName": "Acme Corp",
    "totalCalls": 150,
    "hourRevenue": 125.50,
    "dayRevenue": 2500.00,
    "monthRevenue": 15000.00,
    "totalRevenue": 45000.00
  }
]
```

## Call Management

### List Calls with Pagination
```http
GET /api/calls?page=1&limit=25
```

**cURL:**
```bash
curl -X GET "https://call-center-ringba.replit.app/api/calls?page=1&limit=25" \
  -b cookies.txt
```

**Response:**
```json
{
  "calls": [
    {
      "id": 1,
      "callSid": "CA1234567890abcdef",
      "campaignId": "campaign_uuid",
      "buyerId": 1,
      "buyerName": "John Doe",
      "phoneNumber": "555***1234",
      "callerNumber": "555***9876",
      "status": "completed",
      "duration": 180,
      "revenue": 25.50,
      "routingMethod": "rtb",
      "rtbRequestId": "req_12345",
      "winningBidAmount": 25.50,
      "createdAt": "2025-08-04T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 500,
    "totalPages": 20,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Get Call Details
```http
GET /api/calls/{id}
```

### Update Call
```http
PUT /api/calls/{id}
Content-Type: application/json

{
  "status": "completed",
  "duration": 180,
  "revenue": 30.00
}
```

## Phone Number Management

### List Phone Numbers
```http
GET /api/phone-numbers
```

**Response:**
```json
[
  {
    "id": 1,
    "phoneNumber": "+1234567890",
    "friendlyName": "Main Campaign Line",
    "phoneNumberSid": "PN1234567890abcdef",
    "campaignId": "campaign_uuid",
    "isActive": true,
    "monthlyFee": "1.0000",
    "capabilities": {
      "voice": true,
      "SMS": false,
      "MMS": false
    }
  }
]
```

### Search Available Numbers
```http
GET /api/phone-numbers/search?country=US&numberType=local&areaCode=555&limit=10
```

**cURL:**
```bash
curl -X GET "https://call-center-ringba.replit.app/api/phone-numbers/search?country=US&numberType=local&areaCode=555&limit=10" \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "numbers": [
    {
      "phoneNumber": "+15551234567",
      "friendlyName": "+15551234567",
      "region": "CA",
      "isoCountry": "US",
      "capabilities": {
        "voice": true,
        "SMS": true,
        "MMS": false
      }
    }
  ],
  "searchParams": {
    "country": "US",
    "numberType": "local",
    "areaCode": "555",
    "limit": 10
  }
}
```

### Purchase Phone Number
```http
POST /api/phone-numbers/purchase
Content-Type: application/json

{
  "phoneNumber": "+15551234567",
  "friendlyName": "New Campaign Line",
  "campaignId": "campaign_uuid"
}
```

**cURL:**
```bash
curl -X POST https://call-center-ringba.replit.app/api/phone-numbers/purchase \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "phoneNumber": "+15551234567",
    "friendlyName": "New Campaign Line",
    "campaignId": "campaign_uuid"
  }'
```

### Assign Number to Campaign
```http
POST /api/phone-numbers/{id}/assign-campaign
Content-Type: application/json

{
  "campaignId": "campaign_uuid"
}
```

## Number Pool Management

### List Number Pools
```http
GET /api/number-pools
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Summer Campaign Pool",
    "description": "Pool for Q2 campaigns",
    "isActive": true,
    "numbersCount": 10,
    "assignedNumbers": [
      {
        "id": 1,
        "phoneNumber": "+1234567890",
        "isActive": true
      }
    ]
  }
]
```

### Create Number Pool
```http
POST /api/number-pools
Content-Type: application/json

{
  "name": "New Pool",
  "description": "Description for new pool",
  "isActive": true
}
```

## Call Flow Management

### List Call Flows
```http
GET /api/call-flows
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main IVR Flow",
    "description": "Primary call routing flow",
    "campaignId": "campaign_uuid",
    "status": "active",
    "isActive": true,
    "flowDefinition": {
      "startNodeId": "menu_1",
      "nodes": [
        {
          "id": "menu_1",
          "type": "Menu",
          "name": "Main Menu",
          "config": {
            "message": "Press 1 for sales, 2 for support",
            "options": [
              {"digit": "1", "action": "route_sales"},
              {"digit": "2", "action": "route_support"}
            ]
          }
        }
      ]
    }
  }
]
```

### Create Call Flow
```http
POST /api/call-flows
Content-Type: application/json

{
  "name": "New Call Flow",
  "description": "Description",
  "campaignId": "campaign_uuid",
  "status": "draft",
  "flowDefinition": {
    "startNodeId": "menu_1",
    "nodes": []
  }
}
```

## RedTrack Integration

### Track Session
```http
POST /api/tracking/redtrack/session
Content-Type: application/json

{
  "clickid": "rt_click_12345",
  "campaign_id": "campaign_123",
  "offer_id": "offer_456",
  "source": "google",
  "medium": "cpc",
  "timestamp": "2025-08-04T12:00:00Z",
  "url": "https://landing.example.com",
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0..."
}
```

### Track Conversion
```http
POST /api/tracking/redtrack/conversion
Content-Type: application/json

{
  "clickid": "rt_click_12345",
  "campaign_id": "campaign_123",
  "offer_id": "offer_456",
  "eventType": "phone_click",
  "phoneNumber": "+1234567890",
  "conversionValue": 25.00,
  "userAgent": "Mozilla/5.0...",
  "url": "https://landing.example.com"
}
```

### Track Call Quality
```http
POST /api/tracking/redtrack/quality
Content-Type: application/json

{
  "clickid": "rt_click_12345",
  "conversionType": "ConvertedCall",
  "duration": 180,
  "answered": true,
  "converted": true,
  "revenue": 50.00,
  "sessionId": "session_12345"
}
```

## Webhooks

### Twilio Voice Webhook
```http
POST /api/webhooks/voice
Content-Type: application/x-www-form-urlencoded

To=+1234567890&From=+0987654321&CallSid=CA1234567890abcdef&CallerState=CA&CallerZip=90210
```

### Pool-based Voice Webhook
```http
POST /api/webhooks/pool/{poolId}/voice
Content-Type: application/x-www-form-urlencoded

To=+1234567890&From=+0987654321&CallSid=CA1234567890abcdef&CallerState=CA&CallerZip=90210
```

### Call Status Webhook
```http
POST /api/webhooks/call-status
Content-Type: application/x-www-form-urlencoded

CallSid=CA1234567890abcdef&CallStatus=completed&CallDuration=180&Duration=180
```

### Dial Status Webhook
```http
POST /api/webhooks/dial-status
Content-Type: application/x-www-form-urlencoded

CallSid=CA1234567890abcdef&DialCallStatus=completed&DialCallDuration=180
```

## Call Control

### Transfer Call
```http
POST /api/calls/{callSid}/transfer
Content-Type: application/json

{
  "targetNumber": "+1234567890"
}
```

### Hold/Resume Call
```http
POST /api/calls/{callSid}/hold
POST /api/calls/{callSid}/resume
```

### Mute/Unmute Call
```http
POST /api/calls/{callSid}/mute
POST /api/calls/{callSid}/unmute
```

### Recording Controls
```http
POST /api/calls/{callSid}/recording/start
POST /api/calls/{callSid}/recording/stop
Content-Type: application/json

{
  "recordingSid": "RE1234567890abcdef"
}
```

## Tracking Pixels

### List Tracking Pixels
```http
GET /api/tracking-pixels
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "RedTrack Conversion Pixel",
    "url": "https://domain.redtrack.io/postback?clickid=[tag:User:clickid]&sum=[Call:ConversionPayout]",
    "isActive": true,
    "fireOn": ["call_completed", "conversion"],
    "createdAt": "2025-08-04T10:00:00Z"
  }
]
```

### Create Tracking Pixel
```http
POST /api/tracking-pixels
Content-Type: application/json

{
  "name": "New Tracking Pixel",
  "url": "https://example.com/track?id=[tag:User:clickid]&value=[Call:ConversionPayout]",
  "isActive": true,
  "fireOn": ["call_completed"]
}
```

## Visitor Sessions & Analytics

### List Visitor Sessions
```http
GET /api/visitor-sessions?page=1&limit=50
```

**Response:**
```json
{
  "sessions": [
    {
      "id": 1,
      "sessionId": "session_12345",
      "ipAddress": "192.***.***.123",
      "userAgent": "Mozilla/5.0...",
      "utmSource": "google",
      "utmMedium": "cpc",
      "utmCampaign": "summer_sale",
      "redtrackData": {
        "clickid": "rt_click_12345",
        "campaign_id": "campaign_123"
      },
      "createdAt": "2025-08-04T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 200
  }
}
```

### Get Conversion Events
```http
GET /api/conversion-events?sessionId=session_12345
```

**Response:**
```json
[
  {
    "id": 1,
    "sessionId": "session_12345",
    "eventType": "phone_click",
    "eventValue": 25.00,
    "phoneNumber": "555***1234",
    "metadata": {
      "clickid": "rt_click_12345",
      "campaign_id": "campaign_123",
      "redtrack_attribution": true
    },
    "createdAt": "2025-08-04T12:00:00Z"
  }
]
```

## Enhanced Reporting & Analytics

### RTB Performance Report
```http
GET /api/reports/rtb-performance?startDate=2025-08-01&endDate=2025-08-04&campaignId=campaign_uuid
```

**Response:**
```json
{
  "summary": {
    "totalAuctions": 500,
    "successfulAuctions": 450,
    "averageBidAmount": 22.50,
    "totalRevenue": 10125.00,
    "averageResponseTime": 1250
  },
  "targetPerformance": [
    {
      "targetId": 1,
      "targetName": "Premium Buyer Network",
      "totalBids": 200,
      "winningBids": 120,
      "winRate": 60.0,
      "averageBid": 25.50,
      "averageResponseTime": 456
    }
  ]
}
```

### Call Analytics Report
```http
GET /api/reports/call-analytics?startDate=2025-08-01&endDate=2025-08-04&groupBy=campaign
```

**Response:**
```json
{
  "summary": {
    "totalCalls": 1000,
    "completedCalls": 850,
    "averageDuration": 145,
    "totalRevenue": 21250.00,
    "conversionRate": 15.5
  },
  "groupedData": [
    {
      "groupKey": "Summer Campaign",
      "totalCalls": 500,
      "completedCalls": 425,
      "revenue": 10625.00,
      "averageDuration": 160
    }
  ]
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Resource not found",
  "details": "Campaign with ID 'invalid_id' not found",
  "code": "RESOURCE_NOT_FOUND",
  "timestamp": "2025-08-04T12:00:00Z"
}
```

### Validation Error Response
```json
{
  "error": "Validation failed",
  "details": {
    "phoneNumber": "Invalid phone number format",
    "bidAmount": "Must be greater than 0"
  },
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-08-04T12:00:00Z"
}
```

## Rate Limiting

API requests are rate limited to prevent abuse:
- 100 requests per minute for general endpoints
- 1000 requests per minute for webhook endpoints
- 10 requests per minute for health check endpoints

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1754291040
```

## Security Features

### Phone Number Obfuscation
All phone numbers in API responses are automatically obfuscated for security:
- Original: `+1234567890`
- Obfuscated: `555***1234`

### RTB Audit Logging
All RTB bid requests and responses are comprehensively logged with:
- Sanitized phone numbers
- Complete request/response bodies
- Response times and error details
- Auction summaries and winner selection

### Request Timeout Protection
All external API calls include timeout protection:
- Default timeout: 5 seconds
- Maximum retries: 3
- Exponential backoff for retry delays

## Webhook Security

### Twilio Webhook Validation
Incoming webhooks from Twilio should be validated using the provided signature header and your Twilio Auth Token.

### Authentication Requirements
- All management endpoints require session authentication
- Webhook endpoints accept unauthenticated requests but validate signatures
- RedTrack tracking endpoints accept unauthenticated requests for external integration

## API Versioning

Current API version: `v1`

Version information is included in response headers:
```
X-API-Version: v1
X-Service-Version: 1.0.0
```

## Complete cURL Testing Guide

### Authentication Flow
```bash
# 1. Login and save session cookies
curl -X POST https://call-center-ringba.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}' \
  -c cookies.txt

# 2. Verify authentication
curl -X GET https://call-center-ringba.replit.app/api/auth/user \
  -b cookies.txt

# 3. Logout when done
curl -X POST https://call-center-ringba.replit.app/api/auth/logout \
  -b cookies.txt
```

### Campaign Management
```bash
# List all campaigns
curl -X GET https://call-center-ringba.replit.app/api/campaigns \
  -b cookies.txt

# Create new campaign
curl -X POST https://call-center-ringba.replit.app/api/campaigns \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Test Campaign",
    "description": "API test campaign",
    "phoneNumber": "+1234567890",
    "routingType": "priority",
    "status": "active",
    "enableRtb": true
  }'

# Update campaign
curl -X PUT https://call-center-ringba.replit.app/api/campaigns/CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "paused"}'
```

### RTB Management
```bash
# List RTB targets
curl -X GET https://call-center-ringba.replit.app/api/rtb/targets \
  -b cookies.txt

# Create RTB target
curl -X POST https://call-center-ringba.replit.app/api/rtb/targets \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Test RTB Target",
    "endpointUrl": "https://buyer.example.com/rtb/bid",
    "httpMethod": "POST",
    "minBidAmount": 10.00,
    "maxBidAmount": 100.00,
    "currency": "USD",
    "timeoutMs": 5000,
    "isActive": true
  }'

# Check RTB health
curl -X GET https://call-center-ringba.replit.app/api/rtb/health-checks \
  -b cookies.txt

# Get target uptime
curl -X GET "https://call-center-ringba.replit.app/api/rtb/targets/1/uptime?hours=24" \
  -b cookies.txt
```

### Call Analytics
```bash
# List calls with pagination
curl -X GET "https://call-center-ringba.replit.app/api/calls?page=1&limit=25" \
  -b cookies.txt

# Get RTB bid requests
curl -X GET "https://call-center-ringba.replit.app/api/rtb/bid-requests?page=1&limit=50" \
  -b cookies.txt

# Get RTB auction details
curl -X GET "https://call-center-ringba.replit.app/api/rtb/auction-details?callId=123" \
  -b cookies.txt
```

### Phone Number Management
```bash
# List phone numbers
curl -X GET https://call-center-ringba.replit.app/api/phone-numbers \
  -b cookies.txt

# Search available numbers
curl -X GET "https://call-center-ringba.replit.app/api/phone-numbers/search?country=US&numberType=local&areaCode=555&limit=10" \
  -b cookies.txt

# Purchase phone number
curl -X POST https://call-center-ringba.replit.app/api/phone-numbers/purchase \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "phoneNumber": "+15551234567",
    "friendlyName": "Test Line",
    "campaignId": "CAMPAIGN_ID"
  }'
```

### RedTrack Integration
```bash
# Track session (no authentication required)
curl -X POST https://call-center-ringba.replit.app/api/tracking/redtrack/session \
  -H "Content-Type: application/json" \
  -d '{
    "clickid": "rt_click_12345",
    "campaign_id": "campaign_123",
    "source": "google",
    "medium": "cpc",
    "timestamp": "2025-08-04T12:00:00Z"
  }'

# Track conversion
curl -X POST https://call-center-ringba.replit.app/api/tracking/redtrack/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "clickid": "rt_click_12345",
    "eventType": "phone_click",
    "phoneNumber": "+1234567890",
    "conversionValue": 25.00
  }'
```

### Testing DNI (Dynamic Number Insertion)
```bash
# Ultra-fast DNI request
curl -X POST https://call-center-ringba.replit.app/api/dni/ultra-fast \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "VALID_CAMPAIGN_ID",
    "sessionId": "test_session_123",
    "userAgent": "curl/7.68.0",
    "utmSource": "google",
    "utmMedium": "cpc"
  }'
```

### Error Testing
```bash
# Test authentication required
curl -X GET https://call-center-ringba.replit.app/api/campaigns
# Should return 401 Unauthorized

# Test invalid campaign ID
curl -X GET https://call-center-ringba.replit.app/api/campaigns/invalid-id \
  -b cookies.txt
# Should return 404 Not Found

# Test validation error
curl -X POST https://call-center-ringba.replit.app/api/campaigns \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": ""}'
# Should return 400 Validation Error
```

## Support

For API support and integration assistance:
- Email: api-support@callcenterpro.com
- Documentation: https://docs.callcenterpro.com
- Status Page: https://status.callcenterpro.com