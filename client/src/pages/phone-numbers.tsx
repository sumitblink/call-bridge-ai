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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Phone, Search, Trash2, Settings, Download, Plus, Users, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNumberPoolSchema, type NumberPool } from "@shared/schema";


interface PhoneNumber {
  id: number;
  phoneNumber: string;
  friendlyName: string;
  country: string;
  numberType: string;
  status: string;
  campaignId?: number;
  monthlyFee: number;
  purchaseDate: string;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
}

interface TwilioNumber {
  phoneNumber: string;
  friendlyName: string;
  region: string;
  isoCountry: string;
  capabilities: {
    voice?: boolean;
    SMS?: boolean;
    MMS?: boolean;
  };
}

export default function PhoneNumbersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("owned");
  const [isCreatePoolDialogOpen, setIsCreatePoolDialogOpen] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [searchParams, setSearchParams] = useState({
    country: 'US',
    numberType: 'local',
    areaCode: '',
    contains: '',
    limit: 20
  });
  const [searchResults, setSearchResults] = useState<TwilioNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, string>>({});
  const [purchasingNumbers, setPurchasingNumbers] = useState<Set<string>>(new Set());

  // Fetch phone numbers
  const { data: phoneNumbers = [], isLoading } = useQuery({
    queryKey: ['/api/phone-numbers'],
  });

  // Fetch unassigned phone numbers for pool creation
  const { data: unassignedNumbers = [], isLoading: isLoadingUnassigned } = useQuery({
    queryKey: ['/api/phone-numbers/unassigned'],
    enabled: isCreatePoolDialogOpen,
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Fetch number pools
  const { data: pools = [] } = useQuery<NumberPool[]>({
    queryKey: ["/api/number-pools"],
  });

  // Pool management mutations
  const createPoolMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/number-pools", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers/unassigned"] });
      setSelectedNumbers(new Set()); // Clear selected numbers
      setIsCreatePoolDialogOpen(false);
      toast({
        title: "Success",
        description: "Number pool created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create number pool",
        variant: "destructive",
      });
    },
  });

  const deletePoolMutation = useMutation({
    mutationFn: (poolId: number) => apiRequest(`/api/number-pools/${poolId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools"] });
      toast({
        title: "Success",
        description: "Number pool deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete number pool",
        variant: "destructive",
      });
    },
  });

  // Search available numbers
  const searchMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await apiRequest('/api/phone-numbers/search', 'POST', params);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setSearchResults(data.numbers || []);
        toast({
          title: "Search Complete",
          description: `Found ${data.numbers?.length || 0} available numbers`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search numbers",
        variant: "destructive",
      });
    },
  });

  // Purchase number mutation
  const purchaseMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await apiRequest('/api/phone-numbers/purchase', 'POST', params);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      setActiveTab("owned");
      setSearchResults([]);
      toast({
        title: "Number Purchased",
        description: "Phone number purchased successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to purchase number",
        variant: "destructive",
      });
    },
  });

  // Assign to campaign mutation
  const assignMutation = useMutation({
    mutationFn: async ({ phoneNumberId, campaignId }: { phoneNumberId: number; campaignId: number }) => {
      const response = await apiRequest(`/api/phone-numbers/${phoneNumberId}/assign-campaign`, 'POST', { campaignId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Assignment Updated",
        description: "Phone number campaign assignment updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign campaign",
        variant: "destructive",
      });
    },
  });

  // Delete number mutation
  const deleteMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await apiRequest(`/api/phone-numbers/${phoneNumberId}`, 'DELETE');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Number Released",
        description: "Phone number released successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Release Failed",
        description: error instanceof Error ? error.message : "Failed to release number",
        variant: "destructive",
      });
    },
  });

  // Import existing Twilio numbers mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/phone-numbers/import', 'POST');
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Import Complete",
        description: data.message || `Imported ${data.imported || 0} numbers successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import numbers from Twilio",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setIsSearching(true);
    searchMutation.mutate(searchParams, {
      onSettled: () => setIsSearching(false),
    });
  };

  const handlePurchase = (number: TwilioNumber, campaignId?: number) => {
    // Add this number to purchasing state
    setPurchasingNumbers(prev => new Set(prev).add(number.phoneNumber));
    
    purchaseMutation.mutate({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      country: searchParams.country,
      numberType: searchParams.numberType,
      campaignId,
    }, {
      onSettled: () => {
        // Remove from purchasing state when done (success or error)
        setPurchasingNumbers(prev => {
          const newSet = new Set(prev);
          newSet.delete(number.phoneNumber);
          return newSet;
        });
      }
    });
  };

  const getCampaignName = (campaignId?: number) => {
    if (!campaignId) return 'Unassigned';
    const campaign = campaigns.find((c: Campaign) => c.id === campaignId);
    return campaign?.name || 'Unknown Campaign';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Phone Numbers</h1>
          <Button 
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {importMutation.isPending ? 'Importing...' : 'Import from Twilio'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="owned" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Owned Numbers
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buy Numbers
            </TabsTrigger>
            <TabsTrigger value="pools" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Number Pools
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pool Assignments
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Live Calls
            </TabsTrigger>
          </TabsList>

          {/* Owned Numbers Tab */}
          <TabsContent value="owned" className="space-y-4">
            {phoneNumbers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Phone Numbers</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't purchased any phone numbers yet.
                  </p>
                  <Button onClick={() => setActiveTab("search")}>
                    Buy Your First Number
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {phoneNumbers.map((number: PhoneNumber) => (
                  <Card key={number.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {number.friendlyName}
                            <Badge variant={number.status === 'active' ? 'default' : 'secondary'}>
                              {number.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{number.phoneNumber}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {number.numberType} • {number.country}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="text-sm font-medium">Campaign Assignment</Label>
                          <div className="mt-1">
                            <Select
                              value={number.campaignId?.toString() || "unassigned"}
                              onValueChange={(campaignId) => {
                                if (campaignId && campaignId !== "unassigned") {
                                  assignMutation.mutate({
                                    phoneNumberId: number.id,
                                    campaignId: parseInt(campaignId),
                                  });
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={getCampaignName(number.campaignId)} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {campaigns.map((campaign: Campaign) => (
                                  <SelectItem key={campaign.id} value={campaign.id.toString()}>
                                    {campaign.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Monthly Fee</Label>
                          <div className="mt-1 text-lg font-semibold">${number.monthlyFee}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          Purchased: {new Date(number.purchaseDate).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(number.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Release
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Search Numbers Tab */}
          <TabsContent value="search" className="space-y-6">
            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle>Search Available Numbers</CardTitle>
                <CardDescription>
                  Find and purchase phone numbers for your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={searchParams.country} onValueChange={(value) => 
                      setSearchParams(prev => ({ ...prev, country: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numberType">Number Type</Label>
                    <Select value={searchParams.numberType} onValueChange={(value) => 
                      setSearchParams(prev => ({ ...prev, numberType: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="toll-free">Toll-Free</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaCode">Area Code (optional)</Label>
                    <Input
                      id="areaCode"
                      placeholder="e.g., 415"
                      value={searchParams.areaCode}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, areaCode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contains">Contains (optional)</Label>
                    <Input
                      id="contains"
                      placeholder="e.g., 555"
                      value={searchParams.contains}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, contains: e.target.value }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? 'Searching...' : 'Search Available Numbers'}
                </Button>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Numbers ({searchResults.length})</CardTitle>
                  <CardDescription>
                    Click "Purchase" to buy a number and optionally assign it to a campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {searchResults.map((number) => (
                      <div key={number.phoneNumber} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-lg">{number.friendlyName}</div>
                            <div className="text-sm text-muted-foreground">
                              {number.phoneNumber} • {number.region}
                            </div>
                            <div className="flex gap-1 mt-2">
                              {number.capabilities.voice && <Badge variant="outline">Voice</Badge>}
                              {number.capabilities.SMS && <Badge variant="secondary">SMS</Badge>}
                              {number.capabilities.MMS && <Badge variant="secondary">MMS</Badge>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-col gap-2">
                              <Select 
                                value={selectedCampaigns[number.phoneNumber] || ""}
                                onValueChange={(campaignId) => {
                                  setSelectedCampaigns(prev => ({
                                    ...prev,
                                    [number.phoneNumber]: campaignId
                                  }));
                                }}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select campaign (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No campaign</SelectItem>
                                  {campaigns.map((campaign: Campaign) => (
                                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                                      {campaign.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => {
                                  const selectedCampaign = selectedCampaigns[number.phoneNumber];
                                  const campaignId = selectedCampaign === "none" || !selectedCampaign ? undefined : parseInt(selectedCampaign);
                                  handlePurchase(number, campaignId);
                                }}
                                disabled={purchasingNumbers.has(number.phoneNumber)}
                                className="w-48"
                              >
                                {purchasingNumbers.has(number.phoneNumber) ? "Purchasing..." : "Purchase Number"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="webhooks">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Testing</CardTitle>
                <CardDescription>
                  Test live call handling and routing functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Webhook Status */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Webhook Endpoints</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Voice URL:</span>
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

                  {/* Test Webhook Button */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Test Webhook Connection</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Verify that webhook endpoints are properly configured and accessible
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          const response = await apiRequest('/api/webhooks/twilio/test');
                          toast({
                            title: "Webhook Test Successful",
                            description: "All webhook endpoints are configured correctly",
                          });
                        } catch (error) {
                          toast({
                            title: "Webhook Test Failed",
                            description: "There was an issue with the webhook configuration",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="outline"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Test Webhook Endpoints
                    </Button>
                  </div>

                  {/* Live Call Status */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Live Call Handling Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Phone numbers configured:</span>
                        <Badge variant="outline">{phoneNumbers?.length || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Active campaigns:</span>
                        <Badge variant="outline">{campaigns?.filter((c: Campaign) => c.status === 'active').length || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Webhook status:</span>
                        <Badge variant="secondary">Ready</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="font-semibold mb-3">How Live Call Routing Works</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mt-0.5">1</div>
                        <span>Customer calls your tracking number</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mt-0.5">2</div>
                        <span>System identifies campaign and available buyers</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mt-0.5">3</div>
                        <span>Call is routed to highest priority buyer with capacity</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mt-0.5">4</div>
                        <span>Call metrics and logs are recorded automatically</span>
                      </div>
                    </div>
                  </div>

                  {/* Production call management interface */}
                  <div className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Call metrics and logs are recorded automatically when calls are routed through your purchased numbers.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Number Pools Tab */}
          <TabsContent value="pools" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Number Pools</h3>
              <Dialog open={isCreatePoolDialogOpen} onOpenChange={setIsCreatePoolDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Pool
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Number Pool from Existing Numbers</DialogTitle>
                    <DialogDescription>
                      Create a pool using your existing {Array.isArray(phoneNumbers) ? phoneNumbers.length : 0} phone numbers. Select which numbers to include in this pool.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="poolName">Pool Name</Label>
                      <Input 
                        id="poolName" 
                        placeholder="e.g., 'Marketing Campaign Pool' or 'US Local Numbers'" 
                      />
                    </div>
                    
                    <div>
                      <Label>Select Phone Numbers ({selectedNumbers.size} selected)</Label>
                      <div className="mt-2 border rounded-lg p-4 max-h-60 overflow-y-auto">
                        {isLoadingUnassigned ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            <p>Loading available numbers...</p>
                          </div>
                        ) : Array.isArray(unassignedNumbers) && unassignedNumbers.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 pb-2 border-b">
                              <Checkbox
                                id="selectAll"
                                checked={selectedNumbers.size === unassignedNumbers.length}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedNumbers(new Set(unassignedNumbers.map((n: any) => n.id)));
                                  } else {
                                    setSelectedNumbers(new Set());
                                  }
                                }}
                              />
                              <Label htmlFor="selectAll" className="font-medium">
                                Select All ({unassignedNumbers.length} available numbers)
                              </Label>
                            </div>
                            {unassignedNumbers.map((number: any) => (
                              <div key={number.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`number-${number.id}`}
                                  checked={selectedNumbers.has(number.id)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedNumbers);
                                    if (checked) {
                                      newSelected.add(number.id);
                                    } else {
                                      newSelected.delete(number.id);
                                    }
                                    setSelectedNumbers(newSelected);
                                  }}
                                />
                                <Label htmlFor={`number-${number.id}`} className="flex-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono">{number.phoneNumber}</span>
                                    <div className="flex gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {number.country}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {number.numberType}
                                      </Badge>
                                    </div>
                                  </div>
                                  {number.friendlyName && (
                                    <div className="text-sm text-muted-foreground">
                                      {number.friendlyName}
                                    </div>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No unassigned phone numbers available.</p>
                            <p className="text-sm mt-1">All your numbers are already assigned to pools, or you need to purchase new numbers.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="idleLimit">Idle Limit (seconds)</Label>
                        <Input 
                          id="idleLimit" 
                          type="number" 
                          placeholder="300" 
                          defaultValue="300"
                        />
                      </div>
                      <div>
                        <Label htmlFor="closedBrowserDelay">Browser Delay (seconds)</Label>
                        <Input 
                          id="closedBrowserDelay" 
                          type="number" 
                          placeholder="60" 
                          defaultValue="60"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="prefix">Number Prefix (optional)</Label>
                      <Input 
                        id="prefix" 
                        placeholder="e.g., +1800, +1855" 
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        disabled={selectedNumbers.size === 0}
                        onClick={() => {
                          const poolName = (document.getElementById('poolName') as HTMLInputElement)?.value;
                          const idleLimit = parseInt((document.getElementById('idleLimit') as HTMLInputElement)?.value || '300');
                          const closedBrowserDelay = parseInt((document.getElementById('closedBrowserDelay') as HTMLInputElement)?.value || '60');
                          const prefix = (document.getElementById('prefix') as HTMLInputElement)?.value || null;
                          
                          if (!poolName) {
                            toast({
                              title: "Pool name required",
                              description: "Please enter a name for your pool",
                              variant: "destructive",
                            });
                            return;
                          }

                          createPoolMutation.mutate({
                            name: poolName,
                            poolSize: selectedNumbers.size,
                            idleLimit,
                            closedBrowserDelay,
                            prefix,
                            isActive: true,
                            selectedNumbers: Array.from(selectedNumbers)
                          });
                        }}
                      >
                        Create Pool ({selectedNumbers.size} numbers)
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreatePoolDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {pools.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Number Pools</h3>
                    <p className="text-muted-foreground mb-4">
                      Create pools to organize your phone numbers by geography, campaign, or routing rules.
                    </p>
                    <Button onClick={() => setIsCreatePoolDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Pool
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                pools.map((pool: NumberPool) => (
                  <Card key={pool.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5" />
                            {pool.name}
                          </CardTitle>
                          <CardDescription>
                            {pool.country} • {pool.numberType} • Pool Size: {pool.poolSize}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={pool.isActive ? "default" : "secondary"}>
                            {pool.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/number-pools/${pool.id}`}>
                              <Settings className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the pool "${pool.name}"? This will unassign all numbers from the pool.`)) {
                                deletePoolMutation.mutate(pool.id);
                              }
                            }}
                            disabled={deletePoolMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-muted-foreground">Idle Limit:</span>
                          <p className="font-medium">{pool.idleLimit}s</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Browser Delay:</span>
                          <p className="font-medium">{pool.closedBrowserDelay}s</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prefix:</span>
                          <p className="font-medium">{pool.prefix || 'None'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/number-pools/${pool.id}`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Pool
                          </a>
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Click to edit pool settings and manage numbers
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Pool Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pool Assignments</h3>
            </div>
            
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Pool Assignment Management</h3>
                <p className="text-muted-foreground mb-4">
                  Assign your purchased phone numbers to specific pools for organized routing and management.
                </p>
                <p className="text-sm text-muted-foreground">
                  This feature will be available once you have both phone numbers and pools created.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}