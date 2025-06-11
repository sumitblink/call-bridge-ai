import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Plus, Search, Trash2, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PhoneNumber {
  id: number;
  phoneNumber: string;
  friendlyName: string;
  country: string;
  numberType: string;
  campaignId?: number;
  isActive: boolean;
  monthlyFee: string;
  purchaseDate: string;
}

interface Campaign {
  id: number;
  name: string;
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
  const [searchDialog, setSearchDialog] = useState(false);
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

  // Fetch campaigns for assignment
  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Search available numbers
  const searchMutation = useMutation({
    mutationFn: async (params: any) => {
      return await apiRequest('/api/phone-numbers/search', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (data) => {
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
      return await apiRequest('/api/phone-numbers/purchase', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      setSearchDialog(false);
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
      return await apiRequest(`/api/phone-numbers/${phoneNumberId}/assign-campaign`, {
        method: 'POST',
        body: JSON.stringify({ campaignId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Assignment Updated",
        description: "Phone number assigned to campaign",
      });
    },
  });

  // Delete number mutation
  const deleteMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      return await apiRequest(`/api/phone-numbers/${phoneNumberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Number Released",
        description: "Phone number released successfully",
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Phone Numbers</h1>
              <p className="text-muted-foreground">Manage your Twilio phone numbers</p>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Phone Numbers</h1>
            <p className="text-muted-foreground">Manage your Twilio phone numbers</p>
          </div>
          <Dialog open={searchDialog} onOpenChange={setSearchDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Buy Number
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Purchase Phone Number</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Search Form */}
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
                    placeholder="e.g., 1234"
                    value={searchParams.contains}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, contains: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleSearch} disabled={isSearching} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? "Searching..." : "Search Available Numbers"}
              </Button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Available Numbers ({searchResults.length})</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {searchResults.map((number) => (
                      <Card key={number.phoneNumber} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-mono text-lg">{number.phoneNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {number.region} • {number.isoCountry}
                            </div>
                            <div className="flex gap-1">
                              {number.capabilities.voice && <Badge variant="secondary">Voice</Badge>}
                              {number.capabilities.SMS && <Badge variant="secondary">SMS</Badge>}
                              {number.capabilities.MMS && <Badge variant="secondary">MMS</Badge>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {campaigns.length > 0 ? (
                              <Select onValueChange={(campaignId) => 
                                handlePurchase(number, campaignId ? parseInt(campaignId) : undefined)
                              }>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Assign to campaign" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No campaign</SelectItem>
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
                            <Button
                              onClick={() => handlePurchase(number)}
                              disabled={purchaseMutation.isPending}
                              className="w-full"
                            >
                              Buy Number ($1.00/month)
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Owned Numbers */}
      {phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Phone Numbers</h3>
            <p className="text-muted-foreground mb-4">
              You haven't purchased any phone numbers yet. Buy your first number to start receiving calls.
            </p>
            <Dialog open={searchDialog} onOpenChange={setSearchDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Buy Your First Number
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {phoneNumbers.map((number: PhoneNumber) => (
            <Card key={number.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono text-xl">{number.phoneNumber}</CardTitle>
                    <CardDescription>{number.friendlyName}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={number.isActive ? "default" : "secondary"}>
                      {number.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{number.numberType}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium">Campaign Assignment</Label>
                    <div className="mt-1">
                      <Select
                        value={number.campaignId?.toString() || ""}
                        onValueChange={(campaignId) => {
                          if (campaignId) {
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
                          <SelectItem value="">Unassigned</SelectItem>
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
      </div>
    </Layout>
  );
}