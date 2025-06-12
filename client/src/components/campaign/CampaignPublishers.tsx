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
import { Plus, Trash2, Settings, DollarSign, Users, TrendingUp } from "lucide-react";

interface CampaignPublishersProps {
  campaignId: number;
}

export default function CampaignPublishers({ campaignId }: CampaignPublishersProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPublisherId, setSelectedPublisherId] = useState("");
  const [customPayout, setCustomPayout] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get campaign publishers
  const { data: campaignPublishers = [], isLoading: isPublishersLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/publishers`],
  });

  // Get all publishers for assignment
  const { data: allPublishers = [] } = useQuery({
    queryKey: ["/api/publishers"],
  });

  const addPublisherMutation = useMutation({
    mutationFn: async ({ publisherId, customPayout }: { publisherId: number; customPayout?: string }) => {
      return await apiRequest(`/api/campaigns/${campaignId}/publishers`, "POST", {
        publisherId,
        customPayout,
      });
    },
    onSuccess: () => {
      toast({
        title: "Publisher Added",
        description: "Publisher has been assigned to this campaign.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/publishers`] });
      setIsAddDialogOpen(false);
      setSelectedPublisherId("");
      setCustomPayout("");
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign publisher to campaign.",
        variant: "destructive",
      });
    },
  });

  const removePublisherMutation = useMutation({
    mutationFn: async (publisherId: number) => {
      return await apiRequest(`/api/campaigns/${campaignId}/publishers/${publisherId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Publisher Removed",
        description: "Publisher has been removed from this campaign.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}/publishers`] });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove publisher from campaign.",
        variant: "destructive",
      });
    },
  });

  const handleAddPublisher = () => {
    if (!selectedPublisherId) return;
    
    addPublisherMutation.mutate({
      publisherId: parseInt(selectedPublisherId),
      customPayout: customPayout || undefined,
    });
  };

  const handleRemovePublisher = (publisherId: number) => {
    removePublisherMutation.mutate(publisherId);
  };

  const availablePublishers = allPublishers.filter(
    (publisher: any) => !campaignPublishers.some((cp: any) => cp.id === publisher.id)
  );

  if (isPublishersLoading) {
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
            Campaign Publishers
          </h2>
          <p className="text-sm text-gray-500">
            Manage publishers and payout settings for this campaign
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Publisher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Publisher to Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publisher">Select Publisher</Label>
                <Select value={selectedPublisherId} onValueChange={setSelectedPublisherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a publisher" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePublishers.map((publisher: any) => (
                      <SelectItem key={publisher.id} value={publisher.id.toString()}>
                        {publisher.name} - {publisher.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customPayout">Custom Payout (Optional)</Label>
                <Input
                  id="customPayout"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customPayout}
                  onChange={(e) => setCustomPayout(e.target.value)}
                  placeholder="Leave empty for default campaign payout"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddPublisher}
                  disabled={!selectedPublisherId || addPublisherMutation.isPending}
                >
                  Add Publisher
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Publishers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Publishers</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignPublishers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No publishers assigned
              </h3>
              <p className="text-gray-500 mb-4">
                Add publishers to this campaign to start distributing traffic
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Publisher
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignPublishers.map((publisher: any) => (
                  <TableRow key={publisher.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{publisher.name}</div>
                        <div className="text-sm text-gray-500">ID: {publisher.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{publisher.email}</div>
                        <div className="text-gray-500">{publisher.website}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={publisher.status === "active" ? "default" : "secondary"}>
                        {publisher.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        <span className="font-medium">
                          {publisher.customPayout || publisher.defaultPayout || '25.00'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
                          <span>{publisher.totalCalls || 0} calls</span>
                        </div>
                        <div className="text-gray-500">
                          ${(publisher.totalRevenue || 0).toFixed(2)} revenue
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemovePublisher(publisher.id)}
                          disabled={removePublisherMutation.isPending}
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

      {/* Publisher Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Active Publishers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {campaignPublishers.filter((p: any) => p.status !== 'inactive').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {campaignPublishers.reduce((sum: number, p: any) => sum + (p.totalCalls || 0), 0)}
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
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${campaignPublishers.reduce((sum: number, p: any) => sum + (p.totalRevenue || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Default Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Payout Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="defaultPayout">Default Payout Amount</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">$</span>
                  <Input
                    id="defaultPayout"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="25.00"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payoutType">Payout Type</Label>
                <Select defaultValue="per_call">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_call">Per Call</SelectItem>
                    <SelectItem value="per_minute">Per Minute</SelectItem>
                    <SelectItem value="per_conversion">Per Conversion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button>
                Save Default Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}