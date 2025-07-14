# CallCenter Pro API Documentation

## Overview

This document provides comprehensive API documentation for the CallCenter Pro system, covering all endpoints for campaign management, call routing, RTB auctions, DNI tracking, and system integration.

## Base URL
```
https://your-domain.com/api
```

## Authentication

All API requests require session-based authentication. Login to establish a session, then use session cookies for subsequent requests.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com"
}
```

### Check Authentication Status
```http
GET /api/auth/user
```

### Logout
```http
POST /api/auth/logout
```

## Campaign Management

### List Campaigns
```http
GET /api/campaigns
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Summer Campaign",
    "description": "Q2 lead generation",
    "phoneNumber": "+1234567890",
    "routingType": "priority",
    "status": "active",
    "enableRtb": false,
    "rtbId": "abc123def456",
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
  "enableRtb": false
}
```

### Update Campaign
```http
PUT /api/campaigns/{id}
Content-Type: application/json

{
  "name": "Updated Campaign",
  "status": "paused"
}
```

### Delete Campaign
```http
DELETE /api/campaigns/{id}
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
    "phoneNumber": "+1234567890",
    "priority": 1,
    "maxConcurrentCalls": 5,
    "isActive": true
  }
]
```

### Create Buyer
```http
POST /api/buyers
Content-Type: application/json

{
  "name": "John Doe",
  "companyName": "Acme Corp",
  "email": "john@acme.com",
  "phoneNumber": "+1234567890",
  "priority": 1,
  "maxConcurrentCalls": 5,
  "isActive": true
}
```

### Add Buyer to Campaign
```http
POST /api/campaigns/{campaignId}/buyers
Content-Type: application/json

{
  "buyerId": 1,
  "priority": 1
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
    "phoneNumberSid": "PNxxxx",
    "friendlyName": "Campaign Line",
    "status": "assigned",
    "assignedTo": "campaign",
    "assignedId": 1
  }
]
```

### Search Available Numbers
```http
GET /api/phone-numbers/search?areaCode=212&type=local
```

### Purchase Phone Number
```http
POST /api/phone-numbers/purchase
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "friendlyName": "New Campaign Line"
}
```

## Number Pool Management

### List Number Pools
```http
GET /api/pools
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main Pool",
    "description": "Primary number pool",
    "isActive": true,
    "phoneNumbers": [
      {
        "id": 1,
        "phoneNumber": "+1234567890",
        "status": "assigned"
      }
    ]
  }
]
```

### Create Number Pool
```http
POST /api/pools
Content-Type: application/json

{
  "name": "New Pool",
  "description": "Pool description",
  "isActive": true
}
```

### Add Number to Pool
```http
POST /api/pools/{poolId}/numbers
Content-Type: application/json

{
  "phoneNumberId": 1
}
```

## Call Management

### List Calls
```http
GET /api/calls?page=1&limit=50
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
      "status": "completed",
      "duration": 120,
      "cost": 0.015,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
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
  "campaignId": 1,
  "buyerId": 1,
  "callerNumber": "+1234567890",
  "destinationNumber": "+1987654321",
  "status": "initiated"
}
```

## RTB (Real-Time Bidding) System

### List RTB Targets
```http
GET /api/rtb/targets
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Premium Buyer",
    "companyName": "Premium Corp",
    "contactEmail": "contact@premium.com",
    "endpointUrl": "https://api.premium.com/bid",
    "httpMethod": "POST",
    "requestBody": "{\"requestId\": \"{requestId}\", \"campaignId\": \"{campaignId}\"}",
    "bidAmountPath": "bidAmount",
    "destinationNumberPath": "destinationNumber",
    "acceptancePath": "accepted",
    "minBidAmount": 2.50,
    "maxBidAmount": 25.00,
    "currency": "USD",
    "isActive": true
  }
]
```

### Create RTB Target
```http
POST /api/rtb/targets
Content-Type: application/json

{
  "name": "Premium Buyer",
  "companyName": "Premium Corp",
  "contactEmail": "contact@premium.com",
  "endpointUrl": "https://api.premium.com/bid",
  "httpMethod": "POST",
  "requestBody": "{\"requestId\": \"{requestId}\", \"campaignId\": \"{campaignId}\"}",
  "bidAmountPath": "bidAmount",
  "destinationNumberPath": "destinationNumber",
  "acceptancePath": "accepted",
  "minBidAmount": 2.50,
  "maxBidAmount": 25.00,
  "currency": "USD",
  "isActive": true
}
```

### RTB Template Variables
The following variables can be used in RTB request body templates:
- `{requestId}` - Unique request identifier
- `{campaignId}` - Campaign ID
- `{callerId}` - Caller's phone number
- `{callStartTime}` - Call start timestamp
- `{minBid}` - Minimum bid amount
- `{maxBid}` - Maximum bid amount
- `{currency}` - Currency code
- `{timestamp}` - Current timestamp

### List RTB Routers
```http
GET /api/rtb/routers
```

### Create RTB Router
```http
POST /api/rtb/routers
Content-Type: application/json

{
  "name": "Main Router",
  "description": "Primary RTB router",
  "biddingTimeoutMs": 5000,
  "minBiddersRequired": 2,
  "enablePredictiveRouting": true,
  "isActive": true
}
```

### List Bid Requests
```http
GET /api/rtb/bid-requests
```

### List Bid Responses
```http
GET /api/rtb/bid-responses
```

## DNI (Dynamic Number Insertion) System

### Track DNI Request
```http
POST /api/dni/track
Content-Type: application/json

{
  "tagCode": "campaign_landing",
  "sessionId": "session_123",
  "domain": "example.com",
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0...",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "summer_sale"
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
  "trackingId": "dni_1_1642678800_abc123"
}
```

### List Tracking Tags
```http
GET /api/tracking-tags
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Landing Page Tag",
    "tagCode": "landing_page_2025",
    "campaignId": 1,
    "isActive": true,
    "javascriptCode": "<!-- Generated JS code -->"
  }
]
```

### Create Tracking Tag
```http
POST /api/tracking-tags
Content-Type: application/json

{
  "name": "Landing Page Tag",
  "tagCode": "landing_page_2025",
  "campaignId": 1,
  "isActive": true
}
```

## Statistics and Analytics

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
  "averageCallDuration": 180,
  "successRate": 0.85,
  "totalRevenue": 3750.00,
  "conversionRate": 0.12
}
```

### Get Campaign Statistics
```http
GET /api/stats/campaigns/{campaignId}?days=30
```

### Get Buyer Statistics
```http
GET /api/stats/buyers/{buyerId}?days=30
```

### Get Real-time Dashboard
```http
GET /api/stats/dashboard
```

## Webhook Integration

### Voice Webhook (Twilio)
```http
POST /api/webhooks/voice
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxxx&From=%2B1234567890&To=%2B1987654321&CallStatus=ringing
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
```

### Call Status Webhook
```http
POST /api/webhooks/status
Content-Type: application/x-www-form-urlencoded

CallSid=CAxxxx&CallStatus=completed&CallDuration=120
```

### RTB Target Webhook
```http
POST /api/rtb/webhook/{targetId}
Content-Type: application/json

{
  "requestId": "req_123456",
  "campaignId": "abc123def456",
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
  "currency": "USD"
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "Validation failed",
  "message": "Campaign name is required",
  "statusCode": 400
}
```

## SDK Examples

### JavaScript Example
```javascript
const api = {
  baseURL: 'https://your-domain.com/api',
  
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
  
  async getCampaigns() {
    return this.request('/campaigns');
  },
  
  async createCampaign(data) {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
```

### Python Example
```python
import requests

class CallCenterAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
    
    def get_campaigns(self):
        response = self.session.get(f"{self.base_url}/campaigns")
        return response.json()
    
    def create_campaign(self, data):
        response = self.session.post(
            f"{self.base_url}/campaigns",
            json=data
        )
        return response.json()
```

## Rate Limiting

- General API: 100 requests per minute
- DNI Tracking: 1000 requests per minute
- RTB Endpoints: 500 requests per minute

## Common Use Cases

### 1. Creating a Campaign with Direct Routing
```javascript
// Create campaign
const campaign = await api.createCampaign({
  name: "Summer Sale",
  phoneNumber: "+1234567890",
  routingType: "priority",
  status: "active"
});

// Add buyers
await api.request(`/campaigns/${campaign.id}/buyers`, {
  method: 'POST',
  body: JSON.stringify({
    buyerId: 1,
    priority: 1
  })
});
```

### 2. Setting up RTB Auction
```javascript
// Create RTB target
const target = await api.request('/rtb/targets', {
  method: 'POST',
  body: JSON.stringify({
    name: "Premium Buyer",
    endpointUrl: "https://buyer.com/bid",
    minBidAmount: 5.00,
    maxBidAmount: 50.00
  })
});

// Create RTB router
const router = await api.request('/rtb/routers', {
  method: 'POST',
  body: JSON.stringify({
    name: "Main Router",
    biddingTimeoutMs: 5000
  })
});

// Enable RTB on campaign
await api.request(`/campaigns/${campaignId}`, {
  method: 'PUT',
  body: JSON.stringify({
    enableRtb: true,
    rtbRouterId: router.id
  })
});
```

### 3. DNI Implementation
```javascript
// Create tracking tag
const tag = await api.request('/tracking-tags', {
  method: 'POST',
  body: JSON.stringify({
    name: "Landing Page",
    tagCode: "landing_2025",
    campaignId: 1
  })
});

// Track visitor
const trackingData = await api.request('/dni/track', {
  method: 'POST',
  body: JSON.stringify({
    tagCode: "landing_2025",
    sessionId: "session_123",
    utmSource: "google",
    utmMedium: "cpc"
  })
});

// Replace phone number on page
document.querySelector('.phone').textContent = trackingData.formattedNumber;
```

---

*Last Updated: July 14, 2025*
*API Version: 1.0.0*