import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, ExternalLink, Code, Globe, Settings, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@shared/schema";

interface CampaignDNIConfigProps {
  campaign: Campaign;
}

export function CampaignDNIConfig({ campaign }: CampaignDNIConfigProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch assigned pool information
  const { data: poolInfo } = useQuery({
    queryKey: [`/api/pools/${campaign.poolId}`],
    enabled: !!campaign.poolId,
    retry: false,
  });

  // Fetch DNI snippet
  const { data: dniSnippet } = useQuery({
    queryKey: [`/api/dni/snippet/${campaign.id}`],
    retry: false,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const testDNIEndpoint = () => {
    const testUrl = `${window.location.origin}/api/dni/number?campaignId=${campaign.id}`;
    window.open(testUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pool">Pool Config</TabsTrigger>
          <TabsTrigger value="dni">DNI Setup</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Campaign Configuration Overview
              </CardTitle>
              <CardDescription>
                Current routing and DNI configuration for {campaign.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Routing Method</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {campaign.poolId ? (
                      <>
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          Pool-Based DNI
                        </Badge>
                        <span className="text-sm text-gray-600">Using number pool</span>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary">Direct Number</Badge>
                        <span className="text-sm text-gray-600">Single phone number</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Phone Assignment</Label>
                  <div className="mt-1">
                    {campaign.poolId ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          Pool: {poolInfo?.name} ({poolInfo?.poolSize} numbers)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">{campaign.phoneNumber || 'Not assigned'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-sm font-medium">DNI Status</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">JavaScript SDK Available</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">HTML Snippet Generated</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Endpoint</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pool" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Number Pool Configuration
              </CardTitle>
              <CardDescription>
                Manage pool assignment and rotation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.poolId ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-900">Assigned Pool</h4>
                      <Badge className="bg-blue-100 text-blue-800">{poolInfo?.name}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Pool Size:</span>
                        <span className="ml-2 font-medium">{poolInfo?.poolSize} numbers</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Country:</span>
                        <span className="ml-2 font-medium">{poolInfo?.country || 'US'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Idle Limit:</span>
                        <span className="ml-2 font-medium">{poolInfo?.idleLimit || 30} minutes</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Browser Delay:</span>
                        <span className="ml-2 font-medium">{poolInfo?.closedBrowserDelay || 5} minutes</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rotation Logic</Label>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      <p className="text-gray-700">
                        Numbers are assigned using round-robin rotation from the pool. 
                        Each visitor gets a unique number for their session duration.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pool Assigned</h3>
                  <p className="text-gray-600 mb-4">
                    This campaign uses a direct phone number. Assign a pool for advanced DNI features.
                  </p>
                  <Button variant="outline">
                    Assign Number Pool
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dni" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                DNI Integration Code
              </CardTitle>
              <CardDescription>
                Copy and paste these code snippets into your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">JavaScript SDK URL</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `${window.location.origin}/api/dni/sdk/${campaign.id}`,
                      'SDK URL'
                    )}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <Input
                  value={`${window.location.origin}/api/dni/sdk/${campaign.id}`}
                  readOnly
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">HTML Integration Snippet</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(dniSnippet?.snippet || '', 'HTML Snippet')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{dniSnippet?.snippet || 'Loading...'}</pre>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">API Endpoint</Label>
                <div className="space-y-2">
                  <Input
                    value={`${window.location.origin}/api/dni/number?campaignId=${campaign.id}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-600">
                    Add additional parameters: &source=google&medium=cpc&campaign=summer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                DNI Testing & Validation
              </CardTitle>
              <CardDescription>
                Test your DNI configuration and validate tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Button
                  onClick={testDNIEndpoint}
                  className="w-full"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test DNI API Endpoint
                </Button>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Test Scenarios</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Basic number request</span>
                        <Badge variant="outline">GET /api/dni/number?campaignId={campaign.id}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>With source tracking</span>
                        <Badge variant="outline">source=google&medium=cpc</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Geographic targeting</span>
                        <Badge variant="outline">geo=US&state=CA</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-2">Testing Checklist</h4>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>✓ DNI endpoint returns valid phone number</li>
                    <li>✓ Pool rotation works correctly</li>
                    <li>✓ Session tracking generates unique IDs</li>
                    <li>✓ Geographic targeting (if enabled)</li>
                    <li>✓ Source attribution parameters</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}