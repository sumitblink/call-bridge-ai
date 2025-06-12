import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Phone, Trash2, Settings, Search, Copy } from "lucide-react";

interface CampaignNumbersProps {
  campaignId: number;
}

export default function CampaignNumbers({ campaignId }: CampaignNumbersProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [searchArea, setSearchArea] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get campaign phone numbers
  const { data: campaignNumbers = [], isLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/phone-numbers`],
  });

  // Get available phone numbers for assignment
  const { data: availableNumbers = [] } = useQuery({
    queryKey: ["/api/phone-numbers/available"],
  });

  const assignNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      return await apiRequest(`/api/phone-numbers/${phoneNumberId}/assign`, "PATCH", {
        campaignId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Number Assigned",
        description: "Phone number has been assigned to this campaign.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/phone-numbers`] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers/available"] });
      setIsAssignDialogOpen(false);
      setSelectedNumberId("");
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign phone number to campaign.",
        variant: "destructive",
      });
    },
  });

  const unassignNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      return await apiRequest(`/api/phone-numbers/${phoneNumberId}/unassign`, "PATCH");
    },
    onSuccess: () => {
      toast({
        title: "Number Unassigned",
        description: "Phone number has been removed from this campaign.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/phone-numbers`] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers/available"] });
    },
    onError: (error: any) => {
      toast({
        title: "Unassignment Failed",
        description: error.message || "Failed to remove phone number from campaign.",
        variant: "destructive",
      });
    },
  });

  const searchNumbersMutation = useMutation({
    mutationFn: async (areaCode: string) => {
      return await apiRequest("/api/twilio/search-numbers", "POST", {
        areaCode,
        limit: 10,
      });
    },
    onSuccess: (data) => {
      setSearchResults(data.numbers || []);
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search for phone numbers.",
        variant: "destructive",
      });
    },
  });

  const purchaseNumberMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      return await apiRequest("/api/twilio/purchase-number", "POST", {
        phoneNumber,
        campaignId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Number Purchased",
        description: "Phone number has been purchased and assigned to this campaign.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/phone-numbers`] });
      setIsSearchDialogOpen(false);
      setSearchResults([]);
      setSearchArea("");
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase phone number.",
        variant: "destructive",
      });
    },
  });

  const handleAssignNumber = () => {
    if (!selectedNumberId) return;
    assignNumberMutation.mutate(parseInt(selectedNumberId));
  };

  const handleUnassignNumber = (phoneNumberId: number) => {
    unassignNumberMutation.mutate(phoneNumberId);
  };

  const handleSearchNumbers = () => {
    if (!searchArea) return;
    searchNumbersMutation.mutate(searchArea);
  };

  const handlePurchaseNumber = (phoneNumber: string) => {
    purchaseNumberMutation.mutate(phoneNumber);
  };

  const copyNumber = (phoneNumber: string) => {
    navigator.clipboard.writeText(phoneNumber);
    toast({
      title: "Copied",
      description: "Phone number copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Campaign Phone Numbers
          </h2>
          <p className="text-sm text-gray-500">
            Manage phone numbers assigned to this campaign for call tracking
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Assign Existing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Phone Number</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Select Phone Number</Label>
                  <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNumbers.map((number: any) => (
                        <SelectItem key={number.id} value={number.id.toString()}>
                          {number.phoneNumber} - {number.friendlyName || 'Unnamed'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssignNumber}
                    disabled={!selectedNumberId || assignNumberMutation.isPending}
                  >
                    Assign Number
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Purchase New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Search & Purchase Phone Numbers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter area code (e.g., 555)"
                    value={searchArea}
                    onChange={(e) => setSearchArea(e.target.value)}
                    maxLength={3}
                  />
                  <Button 
                    onClick={handleSearchNumbers}
                    disabled={!searchArea || searchNumbersMutation.isPending}
                  >
                    {searchNumbersMutation.isPending ? "Searching..." : "Search"}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <Label>Available Numbers</Label>
                    {searchResults.map((number: any, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{number.phoneNumber}</div>
                          <div className="text-sm text-gray-500">
                            {number.locality}, {number.region}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handlePurchaseNumber(number.phoneNumber)}
                          disabled={purchaseNumberMutation.isPending}
                        >
                          Purchase
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assigned Numbers */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Numbers</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignNumbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No phone numbers assigned
              </h3>
              <p className="text-gray-500 mb-4">
                Assign phone numbers to enable call tracking for this campaign
              </p>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Existing
                </Button>
                <Button onClick={() => setIsSearchDialogOpen(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Purchase New
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Friendly Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignNumbers.map((number: any) => (
                  <TableRow key={number.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{number.phoneNumber}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyNumber(number.phoneNumber)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{number.friendlyName || 'Unnamed'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {number.numberType || 'local'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={number.isActive ? "default" : "secondary"}>
                        {number.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>${number.monthlyFee || '1.00'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnassignNumber(number.id)}
                          disabled={unassignNumberMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Number Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Active Numbers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {campaignNumbers.filter((n: any) => n.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Numbers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {campaignNumbers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${campaignNumbers.reduce((sum: number, n: any) => sum + (parseFloat(n.monthlyFee) || 1), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}