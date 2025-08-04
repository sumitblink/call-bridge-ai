import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Play, Settings, Database, Phone, Activity, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function ApiTestingPage() {
  const [requestUrl, setRequestUrl] = useState('/api/auth/user');
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [requestHeaders, setRequestHeaders] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const { toast } = useToast();

  const baseUrl = window.location.origin;

  const predefinedEndpoints = {
    auth: [
      { name: 'Check Auth Status', method: 'GET', url: '/api/auth/user', body: '' },
      { name: 'Login', method: 'POST', url: '/api/auth/login', body: '{\n  "username": "admin",\n  "password": "password"\n}' },
      { name: 'Logout', method: 'POST', url: '/api/auth/logout', body: '' }
    ],
    campaigns: [
      { name: 'List Campaigns', method: 'GET', url: '/api/campaigns', body: '' },
      { name: 'Create Campaign', method: 'POST', url: '/api/campaigns', body: '{\n  "name": "Test Campaign",\n  "description": "API test campaign",\n  "phoneNumber": "+1234567890",\n  "routingType": "priority",\n  "status": "active",\n  "enableRtb": true\n}' }
    ],
    rtb: [
      { name: 'List RTB Targets', method: 'GET', url: '/api/rtb/targets', body: '' },
      { name: 'RTB Health Checks', method: 'GET', url: '/api/rtb/health-checks', body: '' },
      { name: 'Create RTB Target', method: 'POST', url: '/api/rtb/targets', body: '{\n  "name": "Test RTB Target",\n  "endpointUrl": "https://buyer.example.com/rtb/bid",\n  "httpMethod": "POST",\n  "minBidAmount": 10.00,\n  "maxBidAmount": 100.00,\n  "currency": "USD",\n  "timeoutMs": 5000,\n  "isActive": true\n}' },
      { name: 'RTB Bid Requests', method: 'GET', url: '/api/rtb/bid-requests?page=1&limit=50', body: '' }
    ],
    calls: [
      { name: 'List Calls', method: 'GET', url: '/api/calls?page=1&limit=25', body: '' },
      { name: 'RTB Auction Details', method: 'GET', url: '/api/rtb/auction-details?callId=123', body: '' }
    ],
    phone: [
      { name: 'List Phone Numbers', method: 'GET', url: '/api/phone-numbers', body: '' },
      { name: 'Search Available Numbers', method: 'GET', url: '/api/phone-numbers/search?country=US&numberType=local&areaCode=555&limit=10', body: '' }
    ],
    tracking: [
      { name: 'RedTrack Session', method: 'POST', url: '/api/tracking/redtrack/session', body: '{\n  "clickid": "rt_click_12345",\n  "campaign_id": "campaign_123",\n  "source": "google",\n  "medium": "cpc",\n  "timestamp": "2025-08-04T12:00:00Z"\n}' },
      { name: 'RedTrack Conversion', method: 'POST', url: '/api/tracking/redtrack/conversion', body: '{\n  "clickid": "rt_click_12345",\n  "eventType": "phone_click",\n  "phoneNumber": "+1234567890",\n  "conversionValue": 25.00\n}' }
    ]
  };

  const executeRequest = async () => {
    setLoading(true);
    setResponse('');
    setResponseStatus(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Parse custom headers if provided
      if (requestHeaders.trim()) {
        try {
          const customHeaders = JSON.parse(requestHeaders);
          Object.assign(headers, customHeaders);
        } catch (e) {
          toast({
            title: 'Invalid Headers',
            description: 'Headers must be valid JSON',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
      }

      const requestOptions: RequestInit = {
        method: requestMethod,
        headers,
        credentials: 'include' // Important for session cookies
      };

      if (requestMethod !== 'GET' && requestBody.trim()) {
        requestOptions.body = requestBody;
      }

      const fullUrl = `${baseUrl}${requestUrl}`;
      const startTime = Date.now();
      
      const res = await fetch(fullUrl, requestOptions);
      const endTime = Date.now();
      
      setResponseStatus(res.status);
      
      let responseText = '';
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        responseText = JSON.stringify(data, null, 2);
      } else {
        responseText = await res.text();
      }

      const responseInfo = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        responseTime: `${endTime - startTime}ms`,
        body: responseText
      };

      setResponse(JSON.stringify(responseInfo, null, 2));

      if (res.ok) {
        toast({
          title: 'Request Successful',
          description: `${res.status} ${res.statusText} (${endTime - startTime}ms)`
        });
      } else {
        toast({
          title: 'Request Failed',
          description: `${res.status} ${res.statusText}`,
          variant: 'destructive'
        });
      }

    } catch (error) {
      const errorResponse = {
        error: 'Network Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
      
      setResponse(JSON.stringify(errorResponse, null, 2));
      setResponseStatus(0);
      
      toast({
        title: 'Network Error',
        description: error instanceof Error ? error.message : 'Request failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPredefinedEndpoint = (endpoint: { name: string; method: string; url: string; body: string }) => {
    setRequestMethod(endpoint.method);
    setRequestUrl(endpoint.url);
    setRequestBody(endpoint.body);
    setRequestHeaders('');
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
    toast({
      title: 'Copied!',
      description: 'Response copied to clipboard'
    });
  };

  const copyAsCurl = () => {
    let curlCommand = `curl -X ${requestMethod} "${baseUrl}${requestUrl}"`;
    
    if (requestHeaders.trim()) {
      try {
        const headers = JSON.parse(requestHeaders);
        Object.entries(headers).forEach(([key, value]) => {
          curlCommand += ` \\\n  -H "${key}: ${value}"`;
        });
      } catch (e) {
        // Ignore invalid headers for curl generation
      }
    }
    
    curlCommand += ` \\\n  -H "Content-Type: application/json"`;
    curlCommand += ` \\\n  --cookie-jar cookies.txt \\\n  --cookie cookies.txt`;
    
    if (requestMethod !== 'GET' && requestBody.trim()) {
      curlCommand += ` \\\n  -d '${requestBody}'`;
    }

    navigator.clipboard.writeText(curlCommand);
    toast({
      title: 'Copied!',
      description: 'cURL command copied to clipboard'
    });
  };

  const getStatusBadgeVariant = (status: number | null) => {
    if (!status) return 'destructive';
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400 && status < 500) return 'secondary';
    if (status >= 500) return 'destructive';
    return 'outline';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">API Testing Console</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Configuration */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Configuration</CardTitle>
              <CardDescription>
                Configure and test API endpoints directly from the browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="method">Method</Label>
                  <Select value={requestMethod} onValueChange={setRequestMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    value={requestUrl}
                    onChange={(e) => setRequestUrl(e.target.value)}
                    placeholder="/api/endpoint"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="headers">Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  value={requestHeaders}
                  onChange={(e) => setRequestHeaders(e.target.value)}
                  placeholder='{"Authorization": "Bearer token"}'
                  rows={3}
                />
              </div>

              {requestMethod !== 'GET' && (
                <div>
                  <Label htmlFor="body">Request Body (JSON)</Label>
                  <Textarea
                    id="body"
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={6}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={executeRequest} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Executing...' : 'Execute Request'}
                </Button>
                <Button variant="outline" onClick={copyAsCurl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy as cURL
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Response */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Response
                  {responseStatus && (
                    <Badge variant={getStatusBadgeVariant(responseStatus)}>
                      {responseStatus}
                    </Badge>
                  )}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={copyResponse} disabled={!response}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80 w-full">
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                  {response || 'No response yet. Execute a request to see the result.'}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Predefined Endpoints */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Predefined Endpoints</CardTitle>
              <CardDescription>
                Quick access to common API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="auth" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="auth">
                    <Shield className="h-4 w-4 mr-1" />
                    Auth
                  </TabsTrigger>
                  <TabsTrigger value="campaigns">
                    <Database className="h-4 w-4 mr-1" />
                    Data
                  </TabsTrigger>
                  <TabsTrigger value="monitoring">
                    <Activity className="h-4 w-4 mr-1" />
                    RTB
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="auth" className="space-y-2">
                  {predefinedEndpoints.auth.map((endpoint, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => loadPredefinedEndpoint(endpoint)}
                    >
                      <Badge variant="outline" className="mr-2 text-xs">
                        {endpoint.method}
                      </Badge>
                      {endpoint.name}
                    </Button>
                  ))}
                </TabsContent>

                <TabsContent value="campaigns" className="space-y-2">
                  {[...predefinedEndpoints.campaigns, ...predefinedEndpoints.calls, ...predefinedEndpoints.phone].map((endpoint, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => loadPredefinedEndpoint(endpoint)}
                    >
                      <Badge variant="outline" className="mr-2 text-xs">
                        {endpoint.method}
                      </Badge>
                      {endpoint.name}
                    </Button>
                  ))}
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-2">
                  {[...predefinedEndpoints.rtb, ...predefinedEndpoints.tracking].map((endpoint, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => loadPredefinedEndpoint(endpoint)}
                    >
                      <Badge variant="outline" className="mr-2 text-xs">
                        {endpoint.method}
                      </Badge>
                      {endpoint.name}
                    </Button>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Testing Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Authentication:</strong> Start with the Login endpoint to establish a session</p>
              <p><strong>Sessions:</strong> Cookies are automatically handled between requests</p>
              <p><strong>RTB Testing:</strong> Use health checks to verify RTB target connectivity</p>
              <p><strong>Error Handling:</strong> Check response status and error messages for debugging</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ApiTestingPage;