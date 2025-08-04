import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Code, Database, Shield, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function ApiDocumentationPage() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Code snippet copied to clipboard'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Code className="h-6 w-6" />
        <h1 className="text-2xl font-bold">API Documentation</h1>
        <Badge variant="outline">REST API v1</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>CallCenter Pro API</CardTitle>
              <CardDescription>
                Complete REST API documentation with examples and authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[800px] w-full">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Base URL</h3>
                    <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                      https://call-center-ringba.replit.app/api
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">Login Credentials</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <div>Email: sumit@blinkdigital.in</div>
                          <div>Password: demo1234</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">Login Endpoint</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">POST /api/login</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "email": "sumit@blinkdigital.in",
  "password": "demo1234"
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Response</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <pre className="text-xs overflow-x-auto">{`{
  "message": "Login successful",
  "user": {
    "id": 2,
    "email": "sumit@blinkdigital.in",
    "firstName": null,
    "lastName": null
  }
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">cURL Example</h4>
                        <div className="bg-muted p-3 rounded-lg relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(`curl -X POST https://call-center-ringba.replit.app/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "sumit@blinkdigital.in", "password": "demo1234"}' \\
  -c cookies.txt`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <pre className="text-xs overflow-x-auto pr-8">{`curl -X POST https://call-center-ringba.replit.app/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "sumit@blinkdigital.in", "password": "demo1234"}' \\
  -c cookies.txt`}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Campaign Management</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">List Campaigns</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/campaigns</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mb-2"
                            onClick={() => copyToClipboard(`curl -X GET https://call-center-ringba.replit.app/api/campaigns -b cookies.txt`)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy cURL
                          </Button>
                          <pre className="text-xs overflow-x-auto">{`[
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
]`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Create Campaign</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">POST /api/campaigns</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mb-2"
                            onClick={() => copyToClipboard(`curl -X POST https://call-center-ringba.replit.app/api/campaigns \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
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
  }'`)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy cURL
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">RTB Management</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">List RTB Targets</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/rtb/targets</div>
                          <pre className="text-xs overflow-x-auto">{`[
  {
    "id": 1,
    "name": "Premium Buyer Network",
    "endpointUrl": "https://buyer.example.com/rtb/bid",
    "httpMethod": "POST",
    "contentType": "application/json",
    "authMethod": "bearer",
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
]`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">RTB Health Checks</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/rtb/health-checks</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "healthChecks": [
    {
      "targetId": 1,
      "targetName": "Premium Buyer Network",
      "endpointUrl": "https://buyer.example.com/rtb/bid",
      "status": "healthy",
      "lastCheckAt": "2025-08-04T12:00:00Z",
      "responseTimeMs": 234,
      "uptime": 99.5,
      "totalChecks": 144
    }
  ],
  "summary": {
    "totalTargets": 5,
    "healthyTargets": 4,
    "unhealthyTargets": 1,
    "averageResponseTime": 287,
    "overallUptime": 98.2
  }
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">RTB Bid Requests</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/rtb/bid-requests?page=1&limit=50</div>
                          <pre className="text-xs overflow-x-auto">{`{
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
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">RTB Auction Details</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/rtb/auction-details?callId=123</div>
                          <pre className="text-xs overflow-x-auto">{`[
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
]`}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Call Management</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">List Calls</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/calls?page=1&limit=25</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "calls": [
    {
      "id": 1,
      "callSid": "CA1234567890abcdef",
      "campaignId": "campaign_uuid",
      "from": "555***1234",
      "to": "555***5678",
      "status": "completed",
      "direction": "inbound",
      "duration": 120,
      "startTime": "2025-08-04T12:00:00Z",
      "endTime": "2025-08-04T12:02:00Z",
      "recordingUrl": "https://recordings.example.com/call1.mp3"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 500,
    "totalPages": 20
  }
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Call Control Actions</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                          <div><span className="font-mono">POST /api/calls/:callSid/transfer</span> - Transfer call to another number</div>
                          <div><span className="font-mono">POST /api/calls/:callSid/hold</span> - Put call on hold</div>
                          <div><span className="font-mono">POST /api/calls/:callSid/resume</span> - Resume held call</div>
                          <div><span className="font-mono">POST /api/calls/:callSid/mute</span> - Mute participant</div>
                          <div><span className="font-mono">POST /api/calls/:callSid/unmute</span> - Unmute participant</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Phone Number Management</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">List Phone Numbers</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/phone-numbers</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Search Available Numbers</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">POST /api/phone-numbers/search</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "country": "US",
  "numberType": "local",
  "areaCode": "555",
  "limit": 10
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Purchase Number</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">POST /api/phone-numbers/purchase</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "phoneNumber": "+15551234567",
  "friendlyName": "Campaign Main Line"
}`}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Tracking & Analytics</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">RedTrack Session Tracking</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">POST /api/tracking/redtrack/session</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "clickid": "rt_click_12345",
  "campaign_id": "campaign_123",
  "source": "google",
  "medium": "cpc",
  "timestamp": "2025-08-04T12:00:00Z"
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">RedTrack Conversion Tracking</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">POST /api/tracking/redtrack/conversion</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "clickid": "rt_click_12345",
  "eventType": "phone_click",
  "phoneNumber": "+1234567890",
  "conversionValue": 25.00
}`}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Platform Statistics</h4>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="font-mono text-sm mb-2">GET /api/stats/historical</div>
                          <pre className="text-xs overflow-x-auto">{`{
  "activeCampaigns": 15,
  "totalCalls": 1250,
  "avgCallDuration": 180,
  "conversionRate": 23.5,
  "totalRevenue": 15750.00,
  "rtbAuctionVolume": 850,
  "avgBidAmount": 18.50
}`}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Security & Rate Limiting</h3>
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <ul className="space-y-1">
                        <li>• <strong>Authentication:</strong> Session-based with secure cookies</li>
                        <li>• <strong>Rate Limiting:</strong> 100 req/min general, 1000 req/min webhooks</li>
                        <li>• <strong>Phone Obfuscation:</strong> All logs use 555***1234 format</li>
                        <li>• <strong>Timeout Protection:</strong> 5-second max with retry logic</li>
                        <li>• <strong>Audit Trails:</strong> Complete request/response logging</li>
                        <li>• <strong>Data Validation:</strong> Zod schema validation on all inputs</li>
                        <li>• <strong>Error Handling:</strong> Standardized error responses with timestamps</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Response Codes & Error Handling</h3>
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <ul className="space-y-1">
                        <li>• <strong>200 OK:</strong> Successful request with data</li>
                        <li>• <strong>201 Created:</strong> Resource successfully created</li>
                        <li>• <strong>400 Bad Request:</strong> Validation errors or malformed request</li>
                        <li>• <strong>401 Unauthorized:</strong> Authentication required or failed</li>
                        <li>• <strong>403 Forbidden:</strong> Insufficient permissions</li>
                        <li>• <strong>404 Not Found:</strong> Resource not found</li>
                        <li>• <strong>429 Too Many Requests:</strong> Rate limit exceeded</li>
                        <li>• <strong>500 Internal Server Error:</strong> Server-side error</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                <span>Authentication</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4" />
                <span>Campaign Management</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                <span>RTB & Bidding</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Code className="h-4 w-4" />
                <span>Call Control</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Response Formats</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Success:</strong> HTTP 200 with JSON response</p>
              <p><strong>Authentication:</strong> HTTP 401 Unauthorized</p>
              <p><strong>Validation:</strong> HTTP 400 with error details</p>
              <p><strong>Server Error:</strong> HTTP 500 with error message</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integration Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Session Management:</strong> Use cookies for authentication persistence</p>
              <p><strong>Error Handling:</strong> All endpoints return standardized error responses</p>
              <p><strong>Rate Limits:</strong> Respect rate limiting headers in responses</p>
              <p><strong>Timeouts:</strong> Set appropriate timeouts for API calls</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ApiDocumentationPage;