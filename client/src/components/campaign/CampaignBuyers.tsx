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
import { Plus, Trash2, Settings, Phone, DollarSign, Users, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CampaignBuyersProps {
  campaignId: number;
}

export default function CampaignBuyers({ campaignId }: CampaignBuyersProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const [priority, setPriority] = useState("1");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get campaign buyers
  const { data: campaignBuyers = [], isLoading: isBuyersLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/buyers`],
  });

  // Get all buyers for assignment
  const { data: allBuyers = [] } = useQuery({
    queryKey: ["/api/buyers"],
  });

  const addBuyerMutation = useMutation({
    mutationFn: async ({ buyerId, priority }: { buyerId: number; priority: number }) => {
      return await apiRequest(`/api/campaigns/${campaignId}/buyers`, "POST", {
        buyerId,
        priority,
      });
    },
    onSuccess: () => {
      toast({
        title: "Buyer Added",
        description: "Buyer has been assigned to this campaign.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/buyers`] });
      setIsAddDialogOpen(false);
      setSelectedBuyerId("");
      setPriority("1");
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign buyer to campaign.",
        variant: "destructive",
      });
    },
  });

  const removeBuyerMutation = useMutation({
    mutationFn: async (buyerId: number) => {
      return await apiRequest(`/api/campaigns/${campaignId}/buyers/${buyerId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Buyer Removed",
        description: "Buyer has been removed from this campaign. Campaign status updated if needed.",
      });
      // Invalidate all campaign-related queries to ensure status updates
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/buyers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/validation`] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove buyer from campaign.",
        variant: "destructive",
      });
    },
  });

  const handleAddBuyer = () => {
    if (!selectedBuyerId) return;
    
    addBuyerMutation.mutate({
      buyerId: parseInt(selectedBuyerId),
      priority: parseInt(priority),
    });
  };

  const handleRemoveBuyer = (buyerId: number) => {
    removeBuyerMutation.mutate(buyerId);
  };

  const availableBuyers = allBuyers.filter(
    (buyer: any) => !campaignBuyers.some((cb: any) => cb.id === buyer.id)
  );

  if (isBuyersLoading) {
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
            Campaign Buyers & Routing
          </h2>
          <p className="text-sm text-gray-500">
            Manage buyers and routing priorities for this campaign
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Buyer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Buyer to Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="buyer">Select Buyer</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose a buyer to assign to this campaign<br/>
                          Each buyer has routing priority and capacity limits</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBuyers.map((buyer: any) => (
                      <SelectItem key={buyer.id} value={buyer.id.toString()}>
                        {buyer.name} - {buyer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Call routing priority (1=highest, 10=lowest)<br/>
                          Higher priority buyers receive calls first</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="1 = highest priority"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddBuyer}
                  disabled={!selectedBuyerId || addBuyerMutation.isPending}
                >
                  Add Buyer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Routing Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Routing Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignBuyers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No buyers assigned
              </h3>
              <p className="text-gray-500 mb-4">
                Add buyers to this campaign to start routing calls
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Buyer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daily Cap</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignBuyers
                  .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))
                  .map((buyer: any) => (
                    <TableRow key={buyer.id}>
                      <TableCell>
                        <Badge variant="outline">
                          #{buyer.priority || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{buyer.name}</div>
                          <div className="text-sm text-gray-500">ID: {buyer.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{buyer.email}</div>
                          <div className="text-gray-500">{buyer.phoneNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={buyer.status === "active" ? "default" : "secondary"}>
                          {buyer.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {buyer.dailyCap ? `${buyer.dailyCap} calls` : 'Unlimited'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveBuyer(buyer.id)}
                            disabled={removeBuyerMutation.isPending}
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

      {/* Routing Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Active Buyers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {campaignBuyers.filter((b: any) => b.status !== 'inactive').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Capacity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {campaignBuyers.reduce((sum: number, b: any) => sum + (b.dailyCap || 100), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Payout</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${(campaignBuyers.reduce((sum: number, b: any) => sum + (parseFloat(b.payout) || 0), 0) / Math.max(campaignBuyers.length, 1)).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}