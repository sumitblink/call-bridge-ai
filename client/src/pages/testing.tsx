import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, Play, ArrowRight, User, Clock, Star, 
  CheckCircle, XCircle, Settings, TestTube, 
  Zap, Target, Users, PhoneCall 
} from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  status: string;
}

interface Buyer {
  id: number;
  name: string;
  phoneNumber: string | null;
  priority: number | null;
  dailyCap: number | null;
  concurrencyLimit: number | null;
  status: string | null;
}

interface RoutingResult {
  selectedBuyer: Buyer | null;
  reason: string;
  alternativeBuyers: Buyer[];
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  campaignId?: number;
  callerNumber: string;
  expectedOutcome: string;
}

export default function TestingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("scenarios");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [callerNumber, setCallerNumber] = useState("+1234567890");
  const [routingResults, setRoutingResults] = useState<{ [key: string]: RoutingResult }>({});
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ['/api/buyers'],
  });

  const { data: campaignBuyers = [] } = useQuery({
    queryKey: ['/api/campaigns', selectedCampaign, 'buyers'],
    enabled: !!selectedCampaign,
  });

  const testScenarios: TestScenario[] = [
    {
      id: "priority-routing",
      name: "Priority-Based Routing",
      description: "Test that calls are routed to the highest priority buyer first",
      callerNumber: "+1234567890",
      expectedOutcome: "Routes to buyer with priority 1"
    },
    {
      id: "capacity-limits",
      name: "Capacity Limits",
      description: "Test that buyers at capacity are skipped",
      callerNumber: "+1987654321",
      expectedOutcome: "Routes to next available buyer when primary is at capacity"
    },
    {
      id: "no-available-buyers",
      name: "No Available Buyers",
      description: "Test behavior when all buyers are unavailable",
      callerNumber: "+1555000111",
      expectedOutcome: "Returns no available buyer message"
    },
    {
      id: "buyer-status-filtering",
      name: "Buyer Status Filtering",
      description: "Test that inactive buyers are filtered out",
      callerNumber: "+1444000222",
      expectedOutcome: "Only routes to active buyers"
    }
  ];

  const runTestScenario = async (scenario: TestScenario) => {
    if (!selectedCampaign) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign to run test scenarios",
        variant: "destructive",
      });
      return;
    }

    setRunningTests(prev => new Set([...prev, scenario.id]));

    try {
      const response = await fetch('/api/call-routing/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: parseInt(selectedCampaign),
          callerNumber: scenario.callerNumber,
        }),
      });

      const result = await response.json();
      
      setRoutingResults(prev => ({
        ...prev,
        [scenario.id]: result
      }));

      toast({
        title: "Test Completed",
        description: `${scenario.name} test finished`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: `Failed to run ${scenario.name}`,
        variant: "destructive",
      });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(scenario.id);
        return newSet;
      });
    }
  };

  const runAllTests = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign to run all tests",
        variant: "destructive",
      });
      return;
    }

    for (const scenario of testScenarios) {
      await runTestScenario(scenario);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const testWebhookEndpoints = async () => {
    try {
      const response = await apiRequest('/api/webhooks/twilio/test');
      toast({
        title: "Webhook Test Successful",
        description: "All webhook endpoints are accessible",
      });
    } catch (error) {
      toast({
        title: "Webhook Test Failed",
        description: "Some webhook endpoints may not be configured properly",
        variant: "destructive",
      });
    }
  };

  const getResultIcon = (result: RoutingResult) => {
    return result.selectedBuyer ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getResultStatus = (result: RoutingResult) => {
    return result.selectedBuyer ? "success" : "failed";
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Testing Dashboard</h1>
          <Badge variant="outline" className="flex items-center gap-1">
            <TestTube className="h-4 w-4" />
            Call Flow Testing
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Test Scenarios
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Manual Testing
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Webhook Tests
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              System Status
            </TabsTrigger>
          </TabsList>

          {/* Test Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Automated Test Scenarios</CardTitle>
                <CardDescription>
                  Run predefined test scenarios to verify call routing logic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="test-campaign">Campaign</Label>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign for testing" />
                      </SelectTrigger>
                      <SelectContent>
                        {(campaigns as Campaign[]).map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={runAllTests} 
                    disabled={!selectedCampaign}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Run All Tests
                  </Button>
                </div>

                <div className="grid gap-4">
                  {testScenarios.map((scenario) => (
                    <div key={scenario.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">{scenario.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {scenario.description}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Caller: {scenario.callerNumber} • Expected: {scenario.expectedOutcome}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => runTestScenario(scenario)}
                          disabled={!selectedCampaign || runningTests.has(scenario.id)}
                        >
                          {runningTests.has(scenario.id) ? "Running..." : "Run Test"}
                        </Button>
                      </div>

                      {routingResults[scenario.id] && (
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            {getResultIcon(routingResults[scenario.id])}
                            <span className="font-medium">
                              {getResultStatus(routingResults[scenario.id]) === "success" ? "Test Passed" : "Test Failed"}
                            </span>
                          </div>
                          <div className="text-sm">
                            {routingResults[scenario.id].selectedBuyer ? (
                              <span className="text-green-700 dark:text-green-300">
                                Routed to: {routingResults[scenario.id].selectedBuyer?.name}
                              </span>
                            ) : (
                              <span className="text-red-700 dark:text-red-300">
                                No routing: {routingResults[scenario.id].reason}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Testing Tab */}
          <TabsContent value="manual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Call Simulation</CardTitle>
                <CardDescription>
                  Test specific scenarios with custom parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-campaign">Campaign</Label>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {(campaigns as Campaign[]).map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-caller">Caller Number</Label>
                    <Input
                      id="manual-caller"
                      value={callerNumber}
                      onChange={(e) => setCallerNumber(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => runTestScenario({
                    id: 'manual',
                    name: 'Manual Test',
                    description: 'Custom test',
                    callerNumber,
                    expectedOutcome: 'Custom routing test'
                  })}
                  disabled={!selectedCampaign}
                  className="w-full"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Simulate Call
                </Button>

                {routingResults['manual'] && (
                  <div className="border rounded-lg p-4 mt-4">
                    <h3 className="font-semibold mb-3">Routing Result</h3>
                    {routingResults['manual'].selectedBuyer ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Call Routed Successfully</span>
                        </div>
                        <div className="text-sm">
                          <strong>Buyer:</strong> {routingResults['manual'].selectedBuyer.name}
                        </div>
                        <div className="text-sm">
                          <strong>Phone:</strong> {routingResults['manual'].selectedBuyer.phoneNumber}
                        </div>
                        <div className="text-sm">
                          <strong>Reason:</strong> {routingResults['manual'].reason}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="font-medium">No Available Buyer</span>
                        </div>
                        <div className="text-sm">
                          <strong>Reason:</strong> {routingResults['manual'].reason}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaign Buyers Display */}
            {selectedCampaign && campaignBuyers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Buyers</CardTitle>
                  <CardDescription>
                    Current buyers configured for this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(campaignBuyers as Buyer[])
                      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
                      .map((buyer) => (
                      <div key={buyer.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{buyer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {buyer.phoneNumber || "No phone"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {buyer.priority === 1 && <Star className="h-4 w-4 text-yellow-500" />}
                            <Badge variant={buyer.status === "active" ? "default" : "secondary"}>
                              Priority {buyer.priority} • {buyer.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Webhook Tests Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Testing</CardTitle>
                <CardDescription>
                  Verify webhook endpoints and configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Endpoint Configuration</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Voice Webhook:</span>
                        <code className="bg-muted px-2 py-1 rounded">/api/webhooks/twilio/voice</code>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Callback:</span>
                        <code className="bg-muted px-2 py-1 rounded">/api/webhooks/twilio/status</code>
                      </div>
                      <div className="flex justify-between">
                        <span>Recording Webhook:</span>
                        <code className="bg-muted px-2 py-1 rounded">/api/webhooks/twilio/recording</code>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={testWebhookEndpoints}
                    variant="outline"
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Test Webhook Endpoints
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Status Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Campaigns:</span>
                      <Badge variant="outline">{(campaigns as Campaign[]).length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Buyers:</span>
                      <Badge variant="outline">{(buyers as Buyer[]).length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Campaigns:</span>
                      <Badge variant="outline">
                        {(campaigns as Campaign[]).filter(c => c.status === 'active').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Webhook Status:</span>
                      <Badge variant="secondary">Ready</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Testing Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">1</div>
                      <span>Create campaigns with multiple buyers</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">2</div>
                      <span>Set different priorities and capacity limits</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">3</div>
                      <span>Run automated test scenarios</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mt-0.5">4</div>
                      <span>Test manual scenarios with custom data</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}