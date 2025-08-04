import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function ApiTestingPage() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const { toast } = useToast();

  const testAuthStatus = async () => {
    setLoading(true);
    setResponse('');
    setResponseStatus(null);

    try {
      const startTime = Date.now();
      const res = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include'
      });
      const endTime = Date.now();
      
      setResponseStatus(res.status);
      
      let responseData;
      try {
        responseData = await res.json();
      } catch {
        responseData = await res.text();
      }

      const responseInfo = {
        status: res.status,
        statusText: res.statusText,
        responseTime: `${endTime - startTime}ms`,
        body: responseData
      };

      setResponse(JSON.stringify(responseInfo, null, 2));

      toast({
        title: res.ok ? 'Request Successful' : 'Request Failed',
        description: `${res.status} ${res.statusText} (${endTime - startTime}ms)`,
        variant: res.ok ? 'default' : 'destructive'
      });

    } catch (error) {
      setResponse(JSON.stringify({
        error: 'Network Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, null, 2));
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
        <h1 className="text-2xl font-bold">API Test - Auth Status</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Authentication Status</CardTitle>
            <CardDescription>
              Simple test to check if the API auth endpoint is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm"><strong>Endpoint:</strong> GET /api/auth/user</p>
              <p className="text-sm"><strong>Expected:</strong> 401 Unauthorized (if not logged in)</p>
              <p className="text-sm"><strong>Login Credentials:</strong> email: sumit@blinkdigital.in, password: demo1234</p>
            </div>
            
            <Button onClick={testAuthStatus} disabled={loading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Testing...' : 'Test Auth Status'}
            </Button>
          </CardContent>
        </Card>

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
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-lg h-64 overflow-auto">
              {response || 'Click "Test Auth Status" to see the API response'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ApiTestingPage;