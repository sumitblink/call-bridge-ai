# CallCenter Pro - API Documentation

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Authentication APIs](#authentication-apis)
5. [Campaign APIs](#campaign-apis)
6. [Buyer APIs](#buyer-apis)
7. [Agent APIs](#agent-apis)
8. [Phone Number APIs](#phone-number-apis)
9. [Number Pool APIs](#number-pool-apis)
10. [Call APIs](#call-apis)
11. [RTB APIs](#rtb-apis)
12. [DNI APIs](#dni-apis)
13. [Tracking APIs](#tracking-apis)
14. [Statistics APIs](#statistics-apis)
15. [Webhook APIs](#webhook-apis)
16. [Twilio Integration APIs](#twilio-integration-apis)
17. [Publisher APIs](#publisher-apis)
18. [Platform Integration APIs](#platform-integration-apis)

---

## Authentication

All API endpoints require authentication via session cookies. The system uses Express sessions with PostgreSQL storage.

### Authentication Flow
1. Login via `/api/auth/login` to establish session
2. Session cookie is automatically managed by browser
3. All subsequent requests include session authentication
4. Logout via `/api/auth/logout` to terminate session

### Session Management
- Session timeout: 24 hours of inactivity
- Session storage: PostgreSQL sessions table
- Cross-origin support: Configured for development and production

---

## Error Handling

### Standard HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "statusCode": 400,
  "timestamp": "2025-07-14T17:30:00Z"
}
```

### Validation Errors
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

---

## Rate Limiting

### Current Limits
- General API: 100 requests per minute per IP
- DNI Tracking: 1000 requests per minute per IP
- RTB Endpoints: 500 requests per minute per IP
- Webhook Endpoints: No limit (trusted sources)

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642678800
```

---

## Authentication APIs

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Check Authentication Status
```http
GET /api/auth/user
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "isAuthenticated": true
}
```

### Logout
```http
POST /api/auth/logout
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## Campaign APIs

### List Campaigns
```http
GET /api/campaigns
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Summer Campaign",
    "description": "Q2 lead generation campaign",
    "phoneNumber": "+1234567890",
    "routingType": "priority",
    "status": "active",
    "poolId": null,
    "rtbRouterId": null,
    "enableRtb": false,
    "rtbId": null,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Campaign Details
```http
GET /api/campaigns/{id}
```

**Response:**
```json
{
  "id": 1,
  "userId": 1,
  "name": "Summer Campaign",
  "description": "Q2 lead generation campaign",
  "phoneNumber": "+1234567890",
  "routingType": "priority",
  "status": "active",
  "poolId": null,
  "rtbRouterId": null,
  "enableRtb": false,
  "rtbId": null,
  "buyers": [
    {
      "id": 1,
      "name": "John Doe",
      "phoneNumber": "+1987654321",
      "priority": 1
    }
  ],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### Create Campaign
```http
POST /api/campaigns
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "phoneNumber": "string",
  "routingType": "priority|round_robin|pool",
  "status": "active|paused|completed",
  "poolId": number,
  "rtbRouterId": number,
  "enableRtb": boolean
}
```

**Response:**
```json
{
  "id": 2,
  "userId": 1,
  "name": "Winter Campaign",
  "description": "Q4 lead generation campaign",
  "phoneNumber": "+1234567891",
  "routingType": "priority",
  "status": "active",
  "poolId": null,
  "rtbRouterId": null,
  "enableRtb": false,
  "rtbId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### Update Campaign
```http
PUT /api/campaigns/{id}
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "phoneNumber": "string",
  "routingType": "priority|round_robin|pool",
  "status": "active|paused|completed",
  "poolId": number,
  "rtbRouterId": number,
  "enableRtb": boolean
}
```

### Delete Campaign
```http
DELETE /api/campaigns/{id}
```

**Response:**
```json
{
  "message": "Campaign deleted successfully"
}
```

---

## Buyer APIs

### List Buyers
```http
GET /api/buyers
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "John Doe",
    "companyName": "Acme Corp",
    "email": "john@acme.com",
    "phoneNumber": "+1234567890",
    "priority": 1,
    "maxConcurrentCalls": 5,
    "dailyCallLimit": 100,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Buyer Details
```http
GET /api/buyers/{id}
```

### Create Buyer
```http
POST /api/buyers
Content-Type: application/json

{
  "name": "string",
  "companyName": "string",
  "email": "string",
  "phoneNumber": "string",
  "priority": number,
  "maxConcurrentCalls": number,
  "dailyCallLimit": number,
  "isActive": boolean
}
```

### Update Buyer
```http
PUT /api/buyers/{id}
Content-Type: application/json
```

### Delete Buyer
```http
DELETE /api/buyers/{id}
```

### Get Campaign Buyers
```http
GET /api/campaigns/{campaignId}/buyers
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "phoneNumber": "+1234567890",
    "priority": 1,
    "maxConcurrentCalls": 5,
    "isActive": true,
    "campaignBuyer": {
      "priority": 1,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
]
```

### Add Buyer to Campaign
```http
POST /api/campaigns/{campaignId}/buyers
Content-Type: application/json

{
  "buyerId": number,
  "priority": number
}
```

### Remove Buyer from Campaign
```http
DELETE /api/campaigns/{campaignId}/buyers/{buyerId}
```

---

## Agent APIs

### List Agents
```http
GET /api/agents
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Jane Smith",
    "email": "jane@company.com",
    "phoneNumber": "+1234567890",
    "skills": ["sales", "support"],
    "maxConcurrentCalls": 3,
    "priority": 1,
    "status": "available",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Agent Details
```http
GET /api/agents/{id}
```

### Create Agent
```http
POST /api/agents
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "phoneNumber": "string",
  "skills": ["string"],
  "maxConcurrentCalls": number,
  "priority": number,
  "status": "available|busy|offline",
  "isActive": boolean
}
```

### Update Agent Status
```http
PUT /api/agents/{id}/status
Content-Type: application/json

{
  "status": "available|busy|offline",
  "reason": "string"
}
```

### Get Agent Metrics
```http
GET /api/agents/{id}/metrics?days=30
```

**Response:**
```json
{
  "totalCalls": 150,
  "averageCallDuration": 240,
  "successRate": 0.85,
  "totalTalkTime": 36000,
  "callsPerDay": 5.0,
  "performance": {
    "rating": 4.5,
    "conversions": 45,
    "conversionRate": 0.30
  }
}
```

---

## Phone Number APIs

### List Phone Numbers
```http
GET /api/phone-numbers
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "phoneNumber": "+1234567890",
    "phoneNumberSid": "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "friendlyName": "Campaign Main Line",
    "status": "assigned",
    "assignedTo": "campaign",
    "assignedId": 1,
    "capabilities": ["voice", "sms"],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Phone Number Details
```http
GET /api/phone-numbers/{id}
```

### Create Phone Number
```http
POST /api/phone-numbers
Content-Type: application/json

{
  "phoneNumber": "string",
  "phoneNumberSid": "string",
  "friendlyName": "string",
  "capabilities": ["voice", "sms"]
}
```

### Update Phone Number
```http
PUT /api/phone-numbers/{id}
Content-Type: application/json

{
  "friendlyName": "string",
  "status": "available|assigned|suspended",
  "assignedTo": "campaign|pool",
  "assignedId": number
}
```

### Delete Phone Number
```http
DELETE /api/phone-numbers/{id}
```

### Search Available Numbers
```http
GET /api/phone-numbers/search?areaCode=212&type=local&limit=10
```

**Response:**
```json
{
  "availableNumbers": [
    {
      "phoneNumber": "+12125551234",
      "friendlyName": "New York Local",
      "locality": "New York",
      "region": "NY",
      "isoCountry": "US",
      "capabilities": ["voice", "sms"]
    }
  ]
}
```

### Purchase Phone Number
```http
POST /api/phone-numbers/purchase
Content-Type: application/json

{
  "phoneNumber": "string",
  "friendlyName": "string",
  "voiceUrl": "string",
  "statusCallback": "string"
}
```

---

## Number Pool APIs

### List Number Pools
```http
GET /api/pools
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Main Pool",
    "description": "Primary number pool for campaigns",
    "webhookUrl": "https://api.example.com/webhook",
    "isActive": true,
    "phoneNumbers": [
      {
        "id": 1,
        "phoneNumber": "+1234567890",
        "status": "assigned"
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Pool Details
```http
GET /api/pools/{id}
```

### Create Number Pool
```http
POST /api/pools
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "webhookUrl": "string",
  "isActive": boolean
}
```

### Update Number Pool
```http
PUT /api/pools/{id}
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "webhookUrl": "string",
  "isActive": boolean
}
```

### Delete Number Pool
```http
DELETE /api/pools/{id}
```

### Add Number to Pool
```http
POST /api/pools/{poolId}/numbers
Content-Type: application/json

{
  "phoneNumberId": number
}
```

### Remove Number from Pool
```http
DELETE /api/pools/{poolId}/numbers/{phoneNumberId}
```

### Get Pool Statistics
```http
GET /api/pools/{id}/stats
```

**Response:**
```json
{
  "totalNumbers": 50,
  "assignedNumbers": 35,
  "availableNumbers": 15,
  "utilizationRate": 0.70,
  "totalCalls": 1250,
  "averageCallsPerNumber": 25.0
}
```

---

## Call APIs

### List Calls
```http
GET /api/calls?page=1&limit=50&status=completed&campaignId=1
```

**Response:**
```json
{
  "calls": [
    {
      "id": 1,
      "campaignId": 1,
      "buyerId": 1,
      "callerNumber": "+1234567890",
      "destinationNumber": "+1987654321",
      "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "status": "completed",
      "duration": 120,
      "recordingUrl": "https://api.twilio.com/recording.mp3",
      "cost": 0.015,
      "direction": "inbound",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "pages": 25
  }
}
```

### Get Call Details
```http
GET /api/calls/{id}
```

### Create Call Record
```http
POST /api/calls
Content-Type: application/json

{
  "campaignId": number,
  "buyerId": number,
  "callerNumber": "string",
  "destinationNumber": "string",
  "callSid": "string",
  "status": "string",
  "direction": "inbound|outbound"
}
```

### Update Call
```http
PUT /api/calls/{id}
Content-Type: application/json

{
  "status": "string",
  "duration": number,
  "recordingUrl": "string",
  "cost": number,
  "hangupCause": "string"
}
```

### Get Call Logs
```http
GET /api/calls/{id}/logs
```

**Response:**
```json
[
  {
    "id": 1,
    "callId": 1,
    "event": "call_started",
    "message": "Call routing initiated",
    "metadata": {
      "routingType": "priority",
      "selectedBuyer": "John Doe"
    },
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Campaign Calls
```http
GET /api/campaigns/{campaignId}/calls
```

---

## RTB APIs

### List RTB Targets
```http
GET /api/rtb/targets
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Premium Buyer",
    "companyName": "Premium Corp",
    "contactPerson": "John Smith",
    "contactEmail": "john@premium.com",
    "contactPhone": "+1234567890",
    "endpointUrl": "https://api.premium.com/bid",
    "httpMethod": "POST",
    "contentType": "application/json",
    "requestBody": "{\"requestId\": \"{requestId}\", \"campaignId\": \"{campaignId}\"}",
    "authentication": "Bearer Token",
    "authToken": "secret_token",
    "timeoutMs": 5000,
    "connectionTimeout": 3000,
    "bidAmountPath": "bidAmount",
    "destinationNumberPath": "destinationNumber",
    "acceptancePath": "accepted",
    "currencyPath": "currency",
    "durationPath": "duration",
    "minBidAmount": 2.50,
    "maxBidAmount": 25.00,
    "currency": "USD",
    "timezone": "UTC",
    "isActive": true,
    "maxConcurrentCalls": 10,
    "dailyCap": 100,
    "hourlyCap": 20,
    "monthlyCap": 2000,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get RTB Target Details
```http
GET /api/rtb/targets/{id}
```

### Create RTB Target
```http
POST /api/rtb/targets
Content-Type: application/json

{
  "name": "string",
  "companyName": "string",
  "contactPerson": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "endpointUrl": "string",
  "httpMethod": "POST|GET|PUT|PATCH",
  "contentType": "string",
  "requestBody": "string",
  "authentication": "none|api_key|bearer|basic",
  "authToken": "string",
  "timeoutMs": number,
  "connectionTimeout": number,
  "bidAmountPath": "string",
  "destinationNumberPath": "string",
  "acceptancePath": "string",
  "currencyPath": "string",
  "durationPath": "string",
  "minBidAmount": number,
  "maxBidAmount": number,
  "currency": "string",
  "timezone": "string",
  "isActive": boolean,
  "maxConcurrentCalls": number,
  "dailyCap": number,
  "hourlyCap": number,
  "monthlyCap": number
}
```

### Update RTB Target
```http
PUT /api/rtb/targets/{id}
Content-Type: application/json
```

### Delete RTB Target
```http
DELETE /api/rtb/targets/{id}
```

### Clear All RTB Targets
```http
DELETE /api/rtb/targets/clear-all
```

### List RTB Routers
```http
GET /api/rtb/routers
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Main Router",
    "description": "Primary RTB router",
    "biddingTimeoutMs": 5000,
    "minBiddersRequired": 2,
    "enablePredictiveRouting": true,
    "revenueType": "per_call",
    "conversionTracking": true,
    "isActive": true,
    "assignedTargets": [
      {
        "id": 1,
        "name": "Premium Buyer",
        "priority": 1,
        "weight": 100
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Create RTB Router
```http
POST /api/rtb/routers
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "biddingTimeoutMs": number,
  "minBiddersRequired": number,
  "enablePredictiveRouting": boolean,
  "revenueType": "per_call|per_minute|cpa|cpl",
  "conversionTracking": boolean,
  "isActive": boolean
}
```

### Update RTB Router
```http
PUT /api/rtb/routers/{id}
Content-Type: application/json
```

### Delete RTB Router
```http
DELETE /api/rtb/routers/{id}
```

### Assign Target to Router
```http
POST /api/rtb/routers/{routerId}/targets
Content-Type: application/json

{
  "targetId": number,
  "priority": number,
  "weight": number
}
```

### Remove Target from Router
```http
DELETE /api/rtb/routers/{routerId}/targets/{targetId}
```

### List Bid Requests
```http
GET /api/rtb/bid-requests?page=1&limit=50
```

**Response:**
```json
{
  "bidRequests": [
    {
      "id": 1,
      "requestId": "req_123456",
      "campaignId": 1,
      "campaignRtbId": "a1b2c3d4e5f6g7h8i9j0",
      "callerId": "+1234567890",
      "callStartTime": "2025-01-01T00:00:00Z",
      "targetIds": [1, 2, 3],
      "auctionTimeoutMs": 5000,
      "minBid": 2.50,
      "maxBid": 25.00,
      "currency": "USD",
      "status": "completed",
      "winningBid": 8.75,
      "winningTargetId": 1,
      "totalResponseTime": 1250,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "pages": 10
  }
}
```

### List Bid Responses
```http
GET /api/rtb/bid-responses?bidRequestId=1
```

**Response:**
```json
[
  {
    "id": 1,
    "bidRequestId": 1,
    "targetId": 1,
    "bidAmount": 8.75,
    "currency": "USD",
    "destinationNumber": "+1987654321",
    "accepted": true,
    "responseTimeMs": 1250,
    "rawResponse": "{\"bidAmount\": 8.75, \"accepted\": true}",
    "isWinner": true,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Test RTB Target
```http
POST /api/rtb/targets/{id}/test
Content-Type: application/json

{
  "requestId": "test_123",
  "campaignId": 1,
  "callerId": "+1234567890",
  "minBid": 2.50,
  "maxBid": 25.00
}
```

---

## DNI APIs

### Track DNI Request
```http
POST /api/dni/track
Content-Type: application/json

{
  "tagCode": "string",
  "sessionId": "string",
  "domain": "string",
  "referrer": "string",
  "userAgent": "string",
  "utmSource": "string",
  "utmMedium": "string",
  "utmCampaign": "string",
  "utmContent": "string",
  "utmTerm": "string"
}
```

**Response:**
```json
{
  "success": true,
  "phoneNumber": "+1234567890",
  "formattedNumber": "(123) 456-7890",
  "campaignId": 1,
  "campaignName": "Summer Campaign",
  "trackingId": "dni_1_1642678800_abc123",
  "sessionId": "session_123456"
}
```

### Get DNI Analytics
```http
GET /api/dni/analytics?campaignId=1&days=30
```

**Response:**
```json
{
  "totalSessions": 1500,
  "uniqueVisitors": 1200,
  "totalCalls": 150,
  "conversionRate": 0.125,
  "topSources": [
    {
      "source": "google",
      "sessions": 800,
      "calls": 80,
      "conversionRate": 0.10
    }
  ],
  "topPages": [
    {
      "page": "/landing",
      "sessions": 600,
      "calls": 45,
      "conversionRate": 0.075
    }
  ]
}
```

---

## Tracking APIs

### List Tracking Tags
```http
GET /api/tracking-tags
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Landing Page Tag",
    "tagCode": "landing_page_2025",
    "campaignId": 1,
    "isActive": true,
    "trackingUrl": "https://api.example.com/dni/track",
    "javascriptCode": "<!-- Generated tracking code -->",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Create Tracking Tag
```http
POST /api/tracking-tags
Content-Type: application/json

{
  "name": "string",
  "tagCode": "string",
  "campaignId": number,
  "isActive": boolean
}
```

### Update Tracking Tag
```http
PUT /api/tracking-tags/{id}
Content-Type: application/json

{
  "name": "string",
  "tagCode": "string",
  "campaignId": number,
  "isActive": boolean
}
```

### Delete Tracking Tag
```http
DELETE /api/tracking-tags/{id}
```

### Get Tracking Sessions
```http
GET /api/tracking-sessions?tagId=1&page=1&limit=50
```

**Response:**
```json
{
  "sessions": [
    {
      "id": 1,
      "tagId": 1,
      "campaignId": 1,
      "trackingId": "dni_1_1642678800_abc123",
      "sessionId": "session_123456",
      "phoneNumberId": 1,
      "source": "google",
      "medium": "cpc",
      "campaign": "summer_sale",
      "content": "ad_variant_a",
      "term": "insurance quotes",
      "referrer": "https://google.com/search",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "pages": 30
  }
}
```

---

## Statistics APIs

### Get Historical Statistics
```http
GET /api/stats/historical?days=30
```

**Response:**
```json
{
  "activeCampaigns": 5,
  "totalCalls": 1250,
  "totalBuyers": 15,
  "totalAgents": 8,
  "averageCallDuration": 180,
  "successRate": 0.85,
  "totalRevenue": 3750.00,
  "costPerCall": 3.00,
  "conversionRate": 0.12,
  "topCampaigns": [
    {
      "id": 1,
      "name": "Summer Campaign",
      "calls": 450,
      "revenue": 1350.00
    }
  ]
}
```

### Get Campaign Statistics
```http
GET /api/stats/campaigns/{campaignId}?days=30
```

**Response:**
```json
{
  "campaignId": 1,
  "totalCalls": 450,
  "successfulCalls": 380,
  "failedCalls": 70,
  "averageCallDuration": 195,
  "totalRevenue": 1350.00,
  "costPerCall": 3.00,
  "conversionRate": 0.15,
  "topBuyers": [
    {
      "id": 1,
      "name": "John Doe",
      "calls": 150,
      "successRate": 0.90
    }
  ],
  "callsByHour": [
    {
      "hour": 9,
      "calls": 25,
      "successRate": 0.80
    }
  ]
}
```

### Get Buyer Statistics
```http
GET /api/stats/buyers/{buyerId}?days=30
```

**Response:**
```json
{
  "buyerId": 1,
  "totalCalls": 150,
  "successfulCalls": 135,
  "averageCallDuration": 210,
  "totalRevenue": 450.00,
  "conversionRate": 0.18,
  "performanceRating": 4.5,
  "campaigns": [
    {
      "id": 1,
      "name": "Summer Campaign",
      "calls": 100,
      "successRate": 0.85
    }
  ]
}
```

### Get Real-time Dashboard
```http
GET /api/stats/dashboard
```

**Response:**
```json
{
  "activeCalls": 12,
  "callsToday": 85,
  "successRateToday": 0.88,
  "revenueToday": 255.00,
  "topPerformers": [
    {
      "type": "buyer",
      "id": 1,
      "name": "John Doe",
      "metric": "calls",
      "value": 15
    }
  ],
  "systemHealth": {
    "status": "healthy",
    "responseTime": 125,
    "uptime": "99.9%"
  }
}
```

---

## Webhook APIs

### Voice Webhook (Direct Campaign)
```http
POST /api/webhooks/voice
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&
From=%2B1234567890&
To=%2B1987654321&
CallStatus=ringing&
Direction=inbound
```

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="+1234567890">
    <Number>+1987654321</Number>
  </Dial>
</Response>
```

### Pool Voice Webhook
```http
POST /api/webhooks/pool/{poolId}/voice
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&
From=%2B1234567890&
To=%2B1987654321&
CallStatus=ringing&
Direction=inbound
```

### Call Status Webhook
```http
POST /api/webhooks/status
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&
CallStatus=completed&
CallDuration=120&
RecordingUrl=https://api.twilio.com/recording.mp3
```

### RTB Target Webhook
```http
POST /api/rtb/webhook/{targetId}
Content-Type: application/json

{
  "requestId": "req_123456",
  "campaignId": "a1b2c3d4e5f6g7h8i9j0",
  "callerId": "+1234567890",
  "callStartTime": "2025-01-01T00:00:00Z",
  "minBid": 2.50,
  "maxBid": 25.00,
  "currency": "USD"
}
```

**Expected Response:**
```json
{
  "bidAmount": 8.75,
  "destinationNumber": "+1987654321",
  "accepted": true,
  "currency": "USD",
  "duration": 300
}
```

---

## Twilio Integration APIs

### Get Twilio Account Info
```http
GET /api/twilio/account
```

**Response:**
```json
{
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "friendlyName": "My Twilio Account",
  "status": "active",
  "type": "Full",
  "dateCreated": "2025-01-01T00:00:00Z",
  "dateUpdated": "2025-01-01T00:00:00Z"
}
```

### List Twilio Phone Numbers
```http
GET /api/twilio/phone-numbers
```

**Response:**
```json
{
  "phoneNumbers": [
    {
      "phoneNumber": "+1234567890",
      "phoneNumberSid": "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "friendlyName": "Campaign Line",
      "voiceUrl": "https://api.example.com/webhooks/voice",
      "statusCallback": "https://api.example.com/webhooks/status",
      "capabilities": {
        "voice": true,
        "sms": true,
        "mms": false
      }
    }
  ]
}
```

### Update Twilio Phone Number
```http
PUT /api/twilio/phone-numbers/{phoneNumberSid}
Content-Type: application/json

{
  "friendlyName": "string",
  "voiceUrl": "string",
  "statusCallback": "string",
  "voiceMethod": "POST|GET"
}
```

### Get Call Recording
```http
GET /api/twilio/recordings/{recordingSid}
```

**Response:**
```json
{
  "recordingSid": "RExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "dateCreated": "2025-01-01T00:00:00Z",
  "duration": 120,
  "channels": 1,
  "source": "DialVerb",
  "price": "-0.0025",
  "priceUnit": "USD",
  "status": "completed",
  "mediaUrl": "https://api.twilio.com/recording.mp3"
}
```

---

## Publisher APIs

### List Publishers
```http
GET /api/publishers
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Premium Publisher",
    "companyName": "Publisher Corp",
    "contactEmail": "contact@publisher.com",
    "contactPhone": "+1234567890",
    "payoutType": "per_call",
    "defaultPayout": 5.00,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Create Publisher
```http
POST /api/publishers
Content-Type: application/json

{
  "name": "string",
  "companyName": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "payoutType": "per_call|per_minute|cpa|cpl",
  "defaultPayout": number,
  "isActive": boolean
}
```

### Get Publisher Campaigns
```http
GET /api/publishers/{publisherId}/campaigns
```

**Response:**
```json
[
  {
    "campaignId": 1,
    "campaignName": "Summer Campaign",
    "customPayout": 6.00,
    "calls": 150,
    "revenue": 900.00,
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Add Publisher to Campaign
```http
POST /api/publishers/{publisherId}/campaigns
Content-Type: application/json

{
  "campaignId": number,
  "customPayout": number
}
```

---

## Platform Integration APIs

### List Platform Integrations
```http
GET /api/integrations
```

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "HubSpot CRM",
    "platform": "hubspot",
    "apiKey": "secret_key",
    "webhookUrl": "https://api.hubspot.com/webhook",
    "isActive": true,
    "lastSync": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

### Create Platform Integration
```http
POST /api/integrations
Content-Type: application/json

{
  "name": "string",
  "platform": "hubspot|salesforce|pipedrive|zapier",
  "apiKey": "string",
  "webhookUrl": "string",
  "isActive": boolean
}
```

### Sync Platform Data
```http
POST /api/integrations/{id}/sync
```

**Response:**
```json
{
  "success": true,
  "recordsSynced": 150,
  "lastSyncTime": "2025-01-01T00:00:00Z",
  "errors": []
}
```

---

## Response Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Campaign Name"
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Campaign name is required",
  "details": {
    "field": "name",
    "code": "REQUIRED"
  }
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "pages": 30,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## SDK Examples

### JavaScript SDK
```javascript
const CallCenterAPI = {
  baseURL: 'https://api.callcenter.com',
  
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Campaign methods
  async getCampaigns() {
    return this.request('/api/campaigns');
  },
  
  async createCampaign(data) {
    return this.request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // DNI tracking
  async trackDNI(data) {
    return this.request('/api/dni/track', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
```

### Python SDK
```python
import requests
import json

class CallCenterAPI:
    def __init__(self, base_url='https://api.callcenter.com'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def request(self, endpoint, method='GET', data=None):
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        response = self.session.request(
            method=method,
            url=url,
            headers=headers,
            json=data
        )
        
        response.raise_for_status()
        return response.json()
    
    def get_campaigns(self):
        return self.request('/api/campaigns')
    
    def create_campaign(self, data):
        return self.request('/api/campaigns', method='POST', data=data)
    
    def track_dni(self, data):
        return self.request('/api/dni/track', method='POST', data=data)
```

---

*Last Updated: July 14, 2025*
*API Version: 1.0.0*
*Documentation Version: 1.0.0*