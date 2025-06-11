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
import { Phone, Search, Trash2, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [searchParams, setSearchParams] = useState({
    country: 'US',
    numberType: 'local',
    areaCode: '',
    contains: '',
    limit: 20
  });
  const [searchResults, setSearchResults] = useState<TwilioNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch phone numbers
  const { data: phoneNumbers = [], isLoading } = useQuery({
    queryKey: ['/api/phone-numbers'],
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
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

  const handleSearch = () => {
    setIsSearching(true);
    searchMutation.mutate(searchParams, {
      onSettled: () => setIsSearching(false),
    });
  };

  const handlePurchase = (number: TwilioNumber, campaignId?: number) => {
    purchaseMutation.mutate({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      country: searchParams.country,
      numberType: searchParams.numberType,
      campaignId,
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="owned" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Owned Numbers ({phoneNumbers.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buy Numbers
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
                            {campaigns.length > 0 ? (
                              <Select onValueChange={(campaignId) => 
                                handlePurchase(number, campaignId === "none" ? undefined : parseInt(campaignId))
                              }>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Assign to campaign" />
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
                            ) : (
                              <div className="text-center p-4 text-muted-foreground">
                                <p>You must create a campaign to use this number</p>
                                <Button variant="link" size="sm" asChild>
                                  <a href="/campaigns">Create Campaign</a>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}