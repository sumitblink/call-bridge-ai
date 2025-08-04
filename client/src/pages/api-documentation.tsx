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
              <ScrollArea className="h-96 w-full">
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
                    <h3 className="text-lg font-semibold mb-2">Core Endpoints</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Campaign Management</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                          <div><span className="font-mono">GET /api/campaigns</span> - List all campaigns</div>
                          <div><span className="font-mono">POST /api/campaigns</span> - Create campaign</div>
                          <div><span className="font-mono">PUT /api/campaigns/:id</span> - Update campaign</div>
                          <div><span className="font-mono">DELETE /api/campaigns/:id</span> - Delete campaign</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">RTB Management</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                          <div><span className="font-mono">GET /api/rtb/targets</span> - List RTB targets</div>
                          <div><span className="font-mono">POST /api/rtb/targets</span> - Create RTB target</div>
                          <div><span className="font-mono">GET /api/rtb/health-checks</span> - Health monitoring</div>
                          <div><span className="font-mono">GET /api/rtb/bid-requests</span> - Bid request logs</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Call Management</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                          <div><span className="font-mono">GET /api/calls</span> - List calls</div>
                          <div><span className="font-mono">GET /api/campaigns/:id/calls</span> - Campaign calls</div>
                          <div><span className="font-mono">POST /api/calls/:callSid/transfer</span> - Transfer call</div>
                          <div><span className="font-mono">POST /api/calls/:callSid/hold</span> - Hold call</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Phone Numbers</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                          <div><span className="font-mono">GET /api/phone-numbers</span> - List numbers</div>
                          <div><span className="font-mono">POST /api/phone-numbers/search</span> - Search available</div>
                          <div><span className="font-mono">POST /api/phone-numbers/purchase</span> - Purchase number</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium">Tracking & Analytics</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                          <div><span className="font-mono">POST /api/tracking/redtrack/session</span> - Track session</div>
                          <div><span className="font-mono">POST /api/tracking/redtrack/conversion</span> - Track conversion</div>
                          <div><span className="font-mono">GET /api/stats</span> - Platform statistics</div>
                          <div><span className="font-mono">GET /api/stats/historical</span> - Historical data</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Security Features</h3>
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <ul className="space-y-1">
                        <li>• Session-based authentication with cookies</li>
                        <li>• Phone number obfuscation (555***1234 format)</li>
                        <li>• Rate limiting (100 req/min general, 1000 req/min webhooks)</li>
                        <li>• Request timeout protection (5-second max with retries)</li>
                        <li>• Comprehensive audit trails for all RTB requests</li>
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