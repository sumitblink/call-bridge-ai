import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Play, Pause, BarChart3, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCampaignSchema, type Campaign, type InsertCampaign, type Buyer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseStatus } from "@/components/DatabaseStatus";

const campaignFormSchema = insertCampaignSchema.extend({
  name: insertCampaignSchema.shape.name.min(1, "Name is required"),
  description: insertCampaignSchema.shape.description.optional(),
});

function BuyerCount({ campaignId }: { campaignId: number }) {
  const { data: campaignBuyers, isLoading } = useQuery<Buyer[]>({
    queryKey: ["/api/campaigns", campaignId, "buyers"],
  });

  if (isLoading) return <span className="text-gray-400">Loading...</span>;
  
  const count = campaignBuyers?.length || 0;
  return (
    <span className={count > 0 ? "text-green-600" : "text-gray-500"}>
      {count} {count === 1 ? "buyer" : "buyers"}
    </span>
  );
}

function CampaignCard({ campaign, onEdit, onDelete, onManageBuyers }: { 
  campaign: Campaign; 
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: number) => void;
  onManageBuyers: (campaignId: number) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Campaign status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const canToggleStatus = (status: string) => {
    return status === "active" || status === "paused" || status === "draft";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <CardDescription className="mt-1">
              {campaign.description || "No description provided"}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Phone Number:</span>
            <div className="font-medium">{campaign.phoneNumber || "Not set"}</div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Call Cap:</span>
            <div className="font-medium">{campaign.callCap} calls/day</div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Routing:</span>
            <div className="font-medium">{campaign.routingType.replace('_', ' ')}</div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Assigned Buyers:</span>
            <div className="font-medium">
              <BuyerCount campaignId={campaign.id} />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canToggleStatus(campaign.status) && (
            <Button
              size="sm"
              variant={campaign.status === "active" ? "outline" : "default"}
              onClick={() => 
                updateStatusMutation.mutate(
                  campaign.status === "active" ? "paused" : "active"
                )
              }
              disabled={updateStatusMutation.isPending}
            >
              {campaign.status === "active" ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(campaign)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => onManageBuyers(campaign.id)}>
            <Users className="w-4 h-4 mr-1" />
            Buyers
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onDelete(campaign.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignForm({ 
  campaign, 
  onSuccess, 
  onCancel 
}: { 
  campaign?: Campaign; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertCampaign>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: campaign?.name || "",
      description: campaign?.description || "",
      phoneNumber: campaign?.phoneNumber || "",
      routingType: campaign?.routingType || "round_robin",
      maxConcurrentCalls: campaign?.maxConcurrentCalls || 5,
      callCap: campaign?.callCap || 100,
      status: campaign?.status || "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create campaign");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const response = await fetch(`/api/campaigns/${campaign!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update campaign");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCampaign) => {
    if (campaign) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter campaign name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter campaign description (optional)" 
                  {...field} 
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Phone Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder="+1-555-123-4567" 
                  {...field} 
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-gray-500">
                This is the number customers will call to reach this campaign
              </p>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="routingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Routing Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select routing type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="priority_based">Priority Based</SelectItem>
                    <SelectItem value="weighted">Weighted</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxConcurrentCalls"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Concurrent Calls</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="100"
                    {...field} 
                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="callCap"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Daily Call Cap</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="100"
                  {...field} 
                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
              <p className="text-sm text-gray-500">
                Maximum number of calls this campaign can handle per day
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : campaign ? "Update Campaign" : "Create Campaign"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Campaigns() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | undefined>();
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading, error } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete campaign");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingCampaign(undefined);
  };

  const handleFormCancel = () => {
    setIsDialogOpen(false);
    setEditingCampaign(undefined);
  };

  const handleManageBuyers = (campaignId: number) => {
    setSelectedCampaignId(campaignId);
    setBuyerDialogOpen(true);
  };

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-muted-foreground">Manage your call center campaigns</p>
        </div>
        <DatabaseStatus 
          isConnected={false} 
          error={error instanceof Error ? error.message : "Connection failed"}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] })}
        />
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-muted-foreground">Manage your call center campaigns</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCampaign(undefined)}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
              </DialogTitle>
              <DialogDescription>
                {editingCampaign 
                  ? "Update the campaign details below." 
                  : "Fill in the details to create a new campaign."
                }
              </DialogDescription>
            </DialogHeader>
            <CampaignForm
              campaign={editingCampaign}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !campaigns || (Array.isArray(campaigns) && campaigns.length === 0) ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first campaign to get started with call center management.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns && Array.isArray(campaigns) && campaigns.map((campaign: Campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageBuyers={handleManageBuyers}
            />
          ))}
        </div>
      )}

      {/* Buyer Management Dialog */}
      <BuyerManagementDialog
        campaignId={selectedCampaignId}
        open={buyerDialogOpen}
        onOpenChange={setBuyerDialogOpen}
      />
      </div>
    </Layout>
  );
}



function BuyerManagementDialog({ 
  campaignId, 
  open, 
  onOpenChange 
}: { 
  campaignId: number | undefined; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availableBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
    enabled: open,
  });

  const { data: campaignBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/campaigns", campaignId, "buyers"],
    enabled: open && !!campaignId,
  });

  const addBuyerMutation = useMutation({
    mutationFn: async ({ buyerId, priority }: { buyerId: number; priority: number }) => {
      const response = await fetch(`/api/campaigns/${campaignId}/buyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId, priority }),
      });
      if (!response.ok) throw new Error("Failed to add buyer");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "buyers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: "Buyer added to campaign successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add buyer to campaign",
        variant: "destructive",
      });
    },
  });

  const removeBuyerMutation = useMutation({
    mutationFn: async (buyerId: number) => {
      const response = await fetch(`/api/campaigns/${campaignId}/buyers/${buyerId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to remove buyer: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "buyers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: "Buyer removed from campaign successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Remove buyer error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove buyer from campaign",
        variant: "destructive",
      });
    },
  });

  const handleAddBuyer = (buyerId: number) => {
    addBuyerMutation.mutate({ buyerId, priority: 1 });
  };

  const handleRemoveBuyer = (buyerId: number) => {
    removeBuyerMutation.mutate(buyerId);
  };

  const assignedBuyerIds = new Set(campaignBuyers?.map(b => b.id) || []);
  const unassignedBuyers = availableBuyers?.filter(buyer => !assignedBuyerIds.has(buyer.id)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Campaign Buyers</DialogTitle>
          <DialogDescription>
            Add or remove buyers from this campaign. Buyers will receive calls based on their priority.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assigned Buyers */}
          <div>
            <h3 className="text-sm font-medium mb-3">Assigned Buyers ({campaignBuyers?.length || 0})</h3>
            {campaignBuyers && campaignBuyers.length > 0 ? (
              <div className="space-y-2">
                {campaignBuyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{buyer.name}</div>
                      <div className="text-sm text-gray-500">{buyer.email}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveBuyer(buyer.id)}
                      disabled={removeBuyerMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No buyers assigned to this campaign</p>
            )}
          </div>

          {/* Available Buyers */}
          <div>
            <h3 className="text-sm font-medium mb-3">Available Buyers ({unassignedBuyers.length})</h3>
            {unassignedBuyers.length > 0 ? (
              <div className="space-y-2">
                {unassignedBuyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{buyer.name}</div>
                      <div className="text-sm text-gray-500">{buyer.email}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddBuyer(buyer.id)}
                      disabled={addBuyerMutation.isPending}
                    >
                      Add to Campaign
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">All available buyers are already assigned</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}