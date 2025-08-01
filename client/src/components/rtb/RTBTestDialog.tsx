import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, TestTube, Clock, CheckCircle, XCircle, DollarSign, Phone, Activity, Copy, AlertCircle } from "lucide-react";

interface RTBTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: {
    id: number;
    name: string;
    endpointUrl: string;
    timeoutMs: number;
  };
  campaignId?: string;
  mode: 'target' | 'auction';
}

interface TestResult {
  target?: any;
  testData?: any;
  requestBody?: any;
  results?: {
    ping?: any;
    post?: any;
  };
  campaign?: any;
  totalTargets?: number;
  successfulResponses?: number;
  winner?: any;
  allResults?: any[];
  timestamp?: string;
  error?: string;
}

export function RTBTestDialog({ open, onOpenChange, target, campaignId, mode }: RTBTestDialogProps) {
  const [testData, setTestData] = useState({
    callerId: '+15551234567',
    publisherId: 'test_publisher_001',
    publisherSubId: 'sub_001',
    callerState: 'CA',
    callerZip: '90210',
    callerAreaCode: '555',
    minBid: '10',
    maxBid: '50',
    customTags: {}
  });

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');
  const { toast } = useToast();

  const handleTest = async (testType: 'ping' | 'post' | 'auction') => {
    setIsLoading(true);
    setTestResult(null);

    try {
      let endpoint = '';
      let payload = {
        ...testData,
        minBid: parseFloat(testData.minBid),
        maxBid: parseFloat(testData.maxBid)
      };

      if (mode === 'target' && target) {
        endpoint = `/api/rtb/targets/${target.id}/test`;
      } else if (mode === 'auction' && campaignId) {
        endpoint = `/api/rtb/campaigns/${campaignId}/test-auction`;
      } else {
        throw new Error('Invalid test configuration');
      }

      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setTestResult(result);
      setActiveTab('results');
      
      toast({
        title: "Test Completed",
        description: `RTB ${testType} test completed successfully`
      });
    } catch (error) {
      console.error('RTB Test Error:', error);
      setTestResult({
        error: error instanceof Error ? error.message : 'Test failed'
      });
      setActiveTab('results');
      
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard"
    });
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            {mode === 'target' ? `Test RTB Target: ${target?.name}` : 'Test RTB Auction'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'target' 
              ? 'Test individual RTB target with ping and post requests'
              : 'Simulate a complete RTB auction with all assigned targets'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Test Setup</TabsTrigger>
            <TabsTrigger value="results" disabled={!testResult}>Results</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Call Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Call Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="callerId">Caller ID</Label>
                    <Input
                      id="callerId"
                      value={testData.callerId}
                      onChange={(e) => setTestData(prev => ({ ...prev, callerId: e.target.value }))}
                      placeholder="+15551234567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="callerState">Caller State</Label>
                    <Input
                      id="callerState"
                      value={testData.callerState}
                      onChange={(e) => setTestData(prev => ({ ...prev, callerState: e.target.value }))}
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="callerZip">Caller ZIP</Label>
                    <Input
                      id="callerZip"
                      value={testData.callerZip}
                      onChange={(e) => setTestData(prev => ({ ...prev, callerZip: e.target.value }))}
                      placeholder="90210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="callerAreaCode">Area Code</Label>
                    <Input
                      id="callerAreaCode"
                      value={testData.callerAreaCode}
                      onChange={(e) => setTestData(prev => ({ ...prev, callerAreaCode: e.target.value }))}
                      placeholder="555"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Publisher & Bidding Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Publisher & Bidding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="publisherId">Publisher ID</Label>
                    <Input
                      id="publisherId"
                      value={testData.publisherId}
                      onChange={(e) => setTestData(prev => ({ ...prev, publisherId: e.target.value }))}
                      placeholder="test_publisher_001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="publisherSubId">Publisher Sub ID</Label>
                    <Input
                      id="publisherSubId"
                      value={testData.publisherSubId}
                      onChange={(e) => setTestData(prev => ({ ...prev, publisherSubId: e.target.value }))}
                      placeholder="sub_001"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="minBid">Min Bid ($)</Label>
                      <Input
                        id="minBid"
                        type="number"
                        value={testData.minBid}
                        onChange={(e) => setTestData(prev => ({ ...prev, minBid: e.target.value }))}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxBid">Max Bid ($)</Label>
                      <Input
                        id="maxBid"
                        type="number"
                        value={testData.maxBid}
                        onChange={(e) => setTestData(prev => ({ ...prev, maxBid: e.target.value }))}
                        placeholder="50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Target Info */}
            {mode === 'target' && target && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Target Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Endpoint:</span>
                      <div className="font-mono text-xs break-all">{target.endpointUrl}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeout:</span>
                      <div>{target.timeoutMs}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <div>{target.name}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-3">
              {mode === 'target' ? (
                <>
                  <Button
                    onClick={() => handleTest('ping')}
                    disabled={isLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Test Ping (GET)
                  </Button>
                  <Button
                    onClick={() => handleTest('post')}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Test Post (POST)
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => handleTest('auction')}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Run Auction Test
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {testResult?.error ? (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Test Failed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-600">{testResult.error}</p>
                </CardContent>
              </Card>
            ) : testResult ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                {mode === 'auction' && testResult.campaign ? (
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{testResult.totalTargets}</div>
                        <div className="text-xs text-muted-foreground">Targets Tested</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{testResult.successfulResponses}</div>
                        <div className="text-xs text-muted-foreground">Successful Bids</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">
                          {testResult.winner ? formatCurrency(testResult.winner.results?.post?.bidAmount || 0) : '$0.00'}
                        </div>
                        <div className="text-xs text-muted-foreground">Winning Bid</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">
                          {testResult.winner ? testResult.winner.target?.name : 'No Winner'}
                        </div>
                        <div className="text-xs text-muted-foreground">Winner</div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                {/* Individual Results */}
                {mode === 'target' && testResult.results ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Ping Results */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Ping Test (GET)
                          {testResult.results.ping?.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge variant={testResult.results.ping?.success ? "default" : "destructive"}>
                            {testResult.results.ping?.status || 'Failed'} {testResult.results.ping?.statusText || ''}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Response Time:</span>
                          <span>{testResult.results.ping?.responseTime || 0}ms</span>
                        </div>
                        {testResult.results.ping?.body && (
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Response:</span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => copyToClipboard(testResult.results?.ping?.body || '')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">
                              {testResult.results.ping.body}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Post Results */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          Post Test (POST)
                          {testResult.results.post?.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge variant={testResult.results.post?.success ? "default" : "destructive"}>
                            {testResult.results.post?.status || 'Failed'} {testResult.results.post?.statusText || ''}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Response Time:</span>
                          <span>{testResult.results.post?.responseTime || 0}ms</span>
                        </div>
                        {testResult.results.post?.bidAmount && (
                          <div className="flex justify-between text-sm">
                            <span>Bid Amount:</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(testResult.results.post.bidAmount)}
                            </span>
                          </div>
                        )}
                        {testResult.results.post?.phoneNumber && (
                          <div className="flex justify-between text-sm">
                            <span>Phone Number:</span>
                            <span className="font-mono">{testResult.results.post.phoneNumber}</span>
                          </div>
                        )}
                        {testResult.results.post?.body && (
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Response:</span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => copyToClipboard(testResult.results?.post?.body || '')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 max-h-32 overflow-auto">
                              {testResult.results.post.body}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                {/* Auction Results */}
                {mode === 'auction' && testResult.allResults && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">All Target Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {testResult.allResults.map((result: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{result.target?.name}</div>
                              {result.error ? (
                                <Badge variant="destructive">Error</Badge>
                              ) : result.results?.post?.success ? (
                                <Badge>Success</Badge>
                              ) : (
                                <Badge variant="outline">Failed</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {result.results?.post?.bidAmount && (
                                <span className="font-bold text-green-600">
                                  {formatCurrency(result.results.post.bidAmount)}
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                {result.results?.post?.responseTime || 0}ms
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Request Data */}
                {testResult.requestBody && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        Request Body
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => copyToClipboard(JSON.stringify(testResult.requestBody, null, 2))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded max-h-40 overflow-auto">
                        {JSON.stringify(testResult.requestBody, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {activeTab === 'results' && (
            <Button onClick={() => setActiveTab('setup')}>
              Run Another Test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}