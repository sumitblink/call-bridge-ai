import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Phone, Play, CheckCircle, AlertCircle, Clock, Target, Zap, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CampaignTestCallFlowProps {
  campaignId: string;
  campaign: any;
}

interface TestCallRequest {
  phoneNumber: string;
  testerId?: string;
  callerId?: string;
}

interface TestCallResult {
  success: boolean;
  callId: string;
  routingDecision: {
    method: string;
    selectedBuyer: {
      id: number;
      name: string;
      phoneNumber: string;
      priority: number;
    };
    routingTime: number;
  };
  pixelsFired: Array<{
    name: string;
    url: string;
    success: boolean;
  }>;
  twimlResponse: string;
  callRecord: any;
}

export default function CampaignTestCallFlow({ campaignId, campaign }: CampaignTestCallFlowProps) {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");
  const [testResults, setTestResults] = useState<TestCallResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get phone numbers for this campaign
  const { data: phoneNumbers = [] } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/phone-numbers`],
    enabled: !!campaignId,
  });

  // Get recent visitor sessions for attribution testing
  const { data: visitorSessions = [] } = useQuery({
    queryKey: [`/api/visitor-sessions/recent`],
    enabled: !!campaignId,
  });

  // Test call mutation
  const testCallMutation = useMutation({
    mutationFn: async (testData: TestCallRequest) => {
      // Simulate webhook call to test the flow
      const webhookEndpoint = campaign.routingType === "pool" 
        ? `/api/test/webhook/pool/${campaign.poolId}/voice`
        : `/api/test/webhook/voice`;
      
      const response = await fetch(webhookEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          CallSid: `TEST_${Date.now()}`,
          From: testData.callerId || '+19143505196',
          To: testData.phoneNumber,
          CallStatus: 'ringing',
          Direction: 'inbound',
          testMode: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Test call failed: ${response.statusText}`);
      }
      
      return response.json() as Promise<TestCallResult>;
    },
    onSuccess: (result) => {
      setTestResults(result);
      toast({
        title: "Test Call Completed",
        description: `Call successfully routed to ${result.routingDecision.selectedBuyer.name}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/calls`] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Call Failed",
        description: error.message || "Failed to simulate call flow",
        variant: "destructive",
      });
    },
  });

  const handleTestCall = () => {
    if (!selectedPhoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please select a phone number to test",
        variant: "destructive",
      });
      return;
    }

    testCallMutation.mutate({
      phoneNumber: selectedPhoneNumber,
      callerId: '+19143505196' // Default test caller
    });
  };

  const availableNumbers = (phoneNumbers as any[]).filter((num: any) => 
    campaign.routingType === "pool" 
      ? num.poolId === campaign.poolId
      : num.campaignId === campaignId
  );

  const recentSession = (visitorSessions as any[]).find((session: any) => 
    session.campaignId === campaignId && session.clickId
  );

  return (
    <div className="space-y-6">
      {/* Test Call Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <span>Test Call Setup</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone Number Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Phone Number to Test
            </label>
            <Select value={selectedPhoneNumber} onValueChange={setSelectedPhoneNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a phone number from your campaign" />
              </SelectTrigger>
              <SelectContent>
                {availableNumbers.map((number: any) => (
                  <SelectItem key={number.id} value={number.phoneNumber}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono">{number.phoneNumber}</span>
                      <Badge variant="secondary" className="ml-2">
                        {campaign.routingType === "pool" ? "Pool" : "Direct"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableNumbers.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No phone numbers assigned to this campaign. Please assign numbers in the Settings or Pools tab.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Attribution Info */}
          {recentSession && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Recent Attribution Data Available
                </span>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div>Click ID: <span className="font-mono">{recentSession.clickId}</span></div>
                <div>Session: {recentSession.sessionId}</div>
                <div>Source: {recentSession.utmSource || 'Direct'}</div>
              </div>
            </div>
          )}

          {/* Test Button */}
          <Button 
            onClick={handleTestCall}
            disabled={!selectedPhoneNumber || testCallMutation.isPending}
            className="w-full"
            size="lg"
          >
            {testCallMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Testing Call Flow...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test Call Flow
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <div className="space-y-4">
          {/* Routing Decision */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Routing Decision</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Selected Buyer</div>
                  <div className="font-semibold">{testResults.routingDecision.selectedBuyer.name}</div>
                  <div className="text-sm text-gray-600 font-mono">
                    {testResults.routingDecision.selectedBuyer.phoneNumber}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Routing Method</div>
                  <Badge variant="outline">{testResults.routingDecision.method}</Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Response Time</div>
                  <div className="font-semibold">{testResults.routingDecision.routingTime}ms</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pixel Firing Results */}
          {testResults.pixelsFired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <span>Tracking Pixels Fired</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResults.pixelsFired.map((pixel, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{pixel.name}</div>
                        <div className="text-xs text-gray-500 font-mono break-all">
                          {pixel.url}
                        </div>
                      </div>
                      <Badge variant={pixel.success ? "default" : "destructive"}>
                        {pixel.success ? "Fired" : "Failed"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TwiML Response */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-purple-600" />
                <span>TwiML Response</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-x-auto">
                <code>{testResults.twimlResponse}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Call Record Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-indigo-600" />
                <span>Call Record Created</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Call ID</div>
                  <div className="font-mono">{testResults.callId}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Payout</div>
                  <div className="font-semibold">${testResults.callRecord?.payout || '0.00'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Revenue</div>
                  <div className="font-semibold">${testResults.callRecord?.revenue || '0.00'}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Click ID</div>
                  <div className="font-mono text-xs">{testResults.callRecord?.clickId || 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 text-center py-4">
            Test call history will appear here after running tests.
            Check Enhanced Reporting for all call records including test calls.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}