import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Phone, Plus, Settings, BarChart3, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  status: string;
  phoneNumber: string | null;
}

interface TrunkConfig {
  id: string;
  friendlyName: string;
  domainName: string;
  secure: boolean;
  cnam_lookup_enabled: boolean;
  origination_url: string;
}

interface PoolStats {
  totalNumbers: number;
  availableNumbers: number;
  assignedNumbers: number;
  utilizationRate: number;
  activeAssignments: {
    sessionId: string;
    phoneNumber: string;
    assignedAt: string;
    expiresAt: string;
    utmData?: Record<string, string>;
  }[];
}

interface NumberPoolForm {
  campaignId: number;
  trunkConfig: {
    friendlyName: string;
    domainName: string;
    secure: boolean;
    cnamLookupEnabled: boolean;
  };
  numberProvisioning: {
    count: number;
    areaCode: string;
  };
}

export default function NumberPoolsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [poolForm, setPoolForm] = useState<NumberPoolForm>({
    campaignId: 0,
    trunkConfig: {
      friendlyName: "",
      domainName: "",
      secure: true,
      cnamLookupEnabled: true
    },
    numberProvisioning: {
      count: 10,
      areaCode: ""
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading, error: campaignsError } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    refetchInterval: 30000
  });

  // Fetch pool statistics for selected campaign
  const { data: poolStats, isLoading: statsLoading, error: statsError } = useQuery<PoolStats>({
    queryKey: ['/api/campaigns', selectedCampaign, 'pool-stats'],
    enabled: !!selectedCampaign,
    refetchInterval: 10000
  });

  // Create trunk mutation
  const createTrunkMutation = useMutation({
    mutationFn: async (data: { campaignId: number; trunkConfig: any }) => {
      const response = await fetch(`/api/campaigns/${data.campaignId}/trunk/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.trunkConfig)
      });
      if (!response.ok) throw new Error('Failed to create trunk');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trunk Created",
        description: `SIP trunk "${data.trunk.friendlyName}" created successfully`
      });
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create trunk",
        variant: "destructive"
      });
    }
  });

  // Provision numbers mutation
  const provisionNumbersMutation = useMutation({
    mutationFn: async (data: { campaignId: number; trunkSid: string; count: number; areaCode?: string }) => {
      const response = await fetch(`/api/campaigns/${data.campaignId}/trunk/provision-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trunkSid: data.trunkSid,
          count: data.count,
          areaCode: data.areaCode
        })
      });
      if (!response.ok) throw new Error('Failed to provision numbers');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Numbers Provisioned",
        description: `Successfully provisioned ${data.count} phone numbers`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', selectedCampaign, 'pool-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to provision numbers",
        variant: "destructive"
      });
    }
  });

  const handleCreateTrunk = () => {
    if (!poolForm.campaignId) {
      toast({
        title: "Error",
        description: "Please select a campaign",
        variant: "destructive"
      });
      return;
    }

    const campaign = campaigns.find(c => c.id === poolForm.campaignId);
    if (!campaign) return;

    const trunkConfig = {
      ...poolForm.trunkConfig,
      friendlyName: poolForm.trunkConfig.friendlyName || `${campaign.name} Trunk`,
      domainName: poolForm.trunkConfig.domainName || `campaign-${poolForm.campaignId}.replit.app`
    };

    createTrunkMutation.mutate({
      campaignId: poolForm.campaignId,
      trunkConfig
    });
  };

  const handleProvisionNumbers = (trunkSid: string) => {
    if (!selectedCampaign) return;

    provisionNumbersMutation.mutate({
      campaignId: selectedCampaign,
      trunkSid,
      count: poolForm.numberProvisioning.count,
      areaCode: poolForm.numberProvisioning.areaCode
    });
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    return phoneNumber.replace(/^\+1/, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUtmString = (utmData?: Record<string, string>) => {
    if (!utmData) return 'No UTM data';
    const params = Object.entries(utmData)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    return params || 'No UTM data';
  };

  if (campaignsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Number Pools</h1>
            <p className="text-gray-600">Manage Twilio Elastic SIP Trunks and number pools for campaign tracking</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
          <p className="text-gray-500 mb-4">Create a campaign first to set up number pools.</p>
          <Button asChild>
            <a href="/campaigns">Create Campaign</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Number Pools</h1>
          <p className="text-gray-600">Manage Twilio Elastic SIP Trunks and number pools for campaign tracking</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Pool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Number Pool</DialogTitle>
              <DialogDescription>
                Set up a new SIP trunk and provision phone numbers for campaign tracking
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="campaign">Campaign</Label>
                <Select
                  value={poolForm.campaignId.toString()}
                  onValueChange={(value) => setPoolForm(prev => ({ ...prev, campaignId: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id.toString()}>
                        {campaign.name}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="friendlyName">Trunk Name</Label>
                  <Input
                    id="friendlyName"
                    placeholder="e.g., Summer Campaign Trunk"
                    value={poolForm.trunkConfig.friendlyName}
                    onChange={(e) => setPoolForm(prev => ({
                      ...prev,
                      trunkConfig: { ...prev.trunkConfig, friendlyName: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="domainName">Domain Name</Label>
                  <Input
                    id="domainName"
                    placeholder="e.g., campaign-7.replit.app"
                    value={poolForm.trunkConfig.domainName}
                    onChange={(e) => setPoolForm(prev => ({
                      ...prev,
                      trunkConfig: { ...prev.trunkConfig, domainName: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numberCount">Number Count</Label>
                  <Input
                    id="numberCount"
                    type="number"
                    min="1"
                    max="100"
                    value={poolForm.numberProvisioning.count}
                    onChange={(e) => setPoolForm(prev => ({
                      ...prev,
                      numberProvisioning: { ...prev.numberProvisioning, count: parseInt(e.target.value) || 10 }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="areaCode">Area Code (Optional)</Label>
                  <Input
                    id="areaCode"
                    placeholder="e.g., 212"
                    value={poolForm.numberProvisioning.areaCode}
                    onChange={(e) => setPoolForm(prev => ({
                      ...prev,
                      numberProvisioning: { ...prev.numberProvisioning, areaCode: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={poolForm.trunkConfig.secure}
                    onChange={(e) => setPoolForm(prev => ({
                      ...prev,
                      trunkConfig: { ...prev.trunkConfig, secure: e.target.checked }
                    }))}
                  />
                  <span>Secure (TLS)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={poolForm.trunkConfig.cnamLookupEnabled}
                    onChange={(e) => setPoolForm(prev => ({
                      ...prev,
                      trunkConfig: { ...prev.trunkConfig, cnamLookupEnabled: e.target.checked }
                    }))}
                  />
                  <span>CNAM Lookup</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTrunk}
                  disabled={createTrunkMutation.isPending}
                >
                  {createTrunkMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Pool'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Campaigns
            </CardTitle>
            <CardDescription>Select a campaign to manage its number pool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCampaign === campaign.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCampaign(campaign.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{campaign.name}</h3>
                      <p className="text-sm text-gray-500">
                        {campaign.phoneNumber || 'No phone number'}
                      </p>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pool Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Pool Statistics
              </div>
              {selectedCampaign && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ 
                    queryKey: ['/api/campaigns', selectedCampaign, 'pool-stats'] 
                  })}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              {selectedCampaign 
                ? `Number pool statistics for ${campaigns.find(c => c.id === selectedCampaign)?.name}`
                : 'Select a campaign to view pool statistics'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCampaign ? (
              <div className="text-center py-8 text-gray-500">
                Select a campaign from the left to view its number pool statistics
              </div>
            ) : statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : statsError ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No number pool found for this campaign. Create a pool to get started.
                </AlertDescription>
              </Alert>
            ) : poolStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{poolStats.totalNumbers}</div>
                    <div className="text-sm text-gray-500">Total Numbers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{poolStats.availableNumbers}</div>
                    <div className="text-sm text-gray-500">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{poolStats.assignedNumbers}</div>
                    <div className="text-sm text-gray-500">Assigned</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Pool Utilization</span>
                    <span className="text-sm text-gray-500">{poolStats.utilizationRate}%</span>
                  </div>
                  <Progress value={poolStats.utilizationRate} className="h-2" />
                </div>

                {poolStats.activeAssignments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Active Assignments</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {poolStats.activeAssignments.map((assignment, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{formatPhoneNumber(assignment.phoneNumber)}</div>
                              <div className="text-sm text-gray-500">
                                Session: {assignment.sessionId}
                              </div>
                              <div className="text-xs text-gray-400">
                                {getUtmString(assignment.utmData)}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div>Assigned: {formatDateTime(assignment.assignedAt)}</div>
                              <div>Expires: {formatDateTime(assignment.expiresAt)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Integration Code */}
      {selectedCampaign && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Integration Code</CardTitle>
            <CardDescription>
              Add this JavaScript code to your landing pages to enable dynamic number insertion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="html" className="w-full">
              <TabsList>
                <TabsTrigger value="html">HTML Integration</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript SDK</TabsTrigger>
                <TabsTrigger value="api">API Endpoint</TabsTrigger>
              </TabsList>
              
              <TabsContent value="html" className="mt-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`<!-- Add this to your HTML where you want phone numbers to appear -->
<span data-tracking-phone data-format="formatted">Loading...</span>
<a href="tel:+1234567890" data-tracking-phone data-format="raw">Call Now</a>

<!-- Add this script before closing </body> tag -->
<script src="https://${window.location.host}/api/campaigns/${selectedCampaign}/tracking-sdk.js"></script>`}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="javascript" className="mt-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`// Manual JavaScript integration
CampaignTracker.assignTrackingNumber(function(error, assignment) {
  if (error) {
    console.error('Failed to get tracking number:', error);
    return;
  }
  
  console.log('Tracking number assigned:', assignment);
  // Update your page with assignment.formattedNumber
});

// Update specific elements
CampaignTracker.updatePhoneNumbers('[data-phone]');`}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="api" className="mt-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`// Direct API call
POST /api/campaigns/${selectedCampaign}/assign-tracking-number

{
  "sessionId": "session_123",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "summer_sale",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://google.com"
}`}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}