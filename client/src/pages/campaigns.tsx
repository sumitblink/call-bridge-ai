import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Play, Pause, BarChart3, Users, Phone } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCampaignSchema, type Campaign, type InsertCampaign, type Buyer } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DatabaseStatus } from "@/components/DatabaseStatus";

const campaignFormSchema = insertCampaignSchema.extend({
  name: insertCampaignSchema.shape.name.min(1, "Name is required"),
  description: insertCampaignSchema.shape.description.optional(),
}).omit({
  userId: true, // Remove userId from client-side validation since it's added server-side
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

function BuyerCount({ campaignId }: { campaignId: number }) {
  const { data: campaignBuyers, isLoading, error } = useQuery<Buyer[]>({
    queryKey: ["campaigns", campaignId, "buyers"],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/buyers`);
      if (!response.ok) throw new Error('Failed to fetch buyers');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) return <span className="text-gray-400">Loading...</span>;
  if (error) return <span className="text-red-400">Error loading buyers</span>;
  
  const count = campaignBuyers?.length || 0;
  const buyerNames = campaignBuyers?.map((buyer: any) => buyer.name).join(", ") || "None";
  
  return (
    <div className="text-sm">
      <span className={count > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
        {count} {count === 1 ? "buyer" : "buyers"}
      </span>
      {count > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          {buyerNames}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign, onEdit, onDelete }: { 
  campaign: Campaign; 
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
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
            <div className="mt-1"><BuyerCount campaignId={campaign.id} /></div>
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

          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onDelete(campaign)}
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
  const [selectedBuyers, setSelectedBuyers] = useState<number[]>([]);

  // Fetch buyers for selection
  const { data: availableBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Fetch current campaign buyers if editing
  const { data: campaignBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/campaigns", campaign?.id, "buyers"],
    enabled: !!campaign?.id,
  });

  const form = useForm<CampaignFormData>({
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

  // Initialize selected buyers when campaign buyers are loaded
  useEffect(() => {
    if (campaignBuyers) {
      setSelectedBuyers(campaignBuyers.map(buyer => buyer.id));
    }
  }, [campaignBuyers]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const response = await apiRequest("/api/campaigns", "POST", data);
      return response.json();
    },
    onSuccess: async (result) => {
      // Assign buyers after campaign creation
      if (selectedBuyers.length > 0) {
        await assignBuyers(result.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      console.error("Create mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const response = await apiRequest(`/api/campaigns/${campaign!.id}`, "PATCH", data);
      return response.json();
    },
    onSuccess: async (result) => {
      // Update buyer assignments after campaign update
      await assignBuyers(campaign!.id);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] }); // Invalidate all campaign buyer queries
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

  const onSubmit = async (data: CampaignFormData) => {
    if (campaign) {
      updateMutation.mutate(data as InsertCampaign);
    } else {
      createMutation.mutate(data as InsertCampaign);
    }
  };

  // Handle buyer assignment after campaign creation/update
  const assignBuyers = async (campaignId: number) => {
    // Get current campaign buyers
    const currentBuyers = campaignBuyers?.map(b => b.id) || [];
    
    // Add new buyers
    const buyersToAdd = selectedBuyers.filter(id => !currentBuyers.includes(id));
    const buyersToRemove = currentBuyers.filter(id => !selectedBuyers.includes(id));

    console.log("Buyers to add:", buyersToAdd);
    console.log("Buyers to remove:", buyersToRemove);

    // Add buyers
    for (const buyerId of buyersToAdd) {
      try {
        console.log(`Adding buyer ${buyerId} to campaign ${campaignId}`);
        const response = await apiRequest(`/api/campaigns/${campaignId}/buyers`, "POST", { buyerId, priority: 1 });
        const result = await response.json();
        console.log("Add buyer result:", result);
      } catch (error) {
        console.error("Failed to add buyer:", error);
      }
    }

    // Remove buyers  
    for (const buyerId of buyersToRemove) {
      try {
        console.log(`Removing buyer ${buyerId} from campaign ${campaignId}`);
        const response = await apiRequest(`/api/campaigns/${campaignId}/buyers/${buyerId}`, "DELETE");
        const result = await response.json();
        console.log("Remove buyer result:", result);
      } catch (error) {
        console.error("Failed to remove buyer:", error);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
    queryClient.invalidateQueries({ queryKey: ["campaigns"] }); // Invalidate all campaign buyer queries
  };

  const toggleBuyer = (buyerId: number) => {
    setSelectedBuyers(prev => 
      prev.includes(buyerId) 
        ? prev.filter(id => id !== buyerId)
        : [...prev, buyerId]
    );
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

        {/* Buyer Selection Section */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Assign Buyers</label>
            <p className="text-sm text-gray-500">Select buyers to receive calls from this campaign</p>
          </div>
          
          {availableBuyers && availableBuyers.length > 0 ? (
            <div className="grid gap-2">
              {availableBuyers.map((buyer) => (
                <div key={buyer.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    id={`buyer-${buyer.id}`}
                    checked={selectedBuyers.includes(buyer.id)}
                    onChange={() => toggleBuyer(buyer.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor={`buyer-${buyer.id}`} className="text-sm font-medium cursor-pointer">
                      {buyer.name}
                    </label>
                    <p className="text-xs text-gray-500">{buyer.email}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {buyer.acceptanceRate} acceptance
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 p-4 border rounded-lg text-center">
              No buyers available. Create buyers first to assign them to campaigns.
            </div>
          )}
        </div>

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to handle opening dialog from header button
  const openNewCampaignDialog = () => {
    setEditingCampaign(undefined);
    setIsDialogOpen(true);
  };

  // Make the function available globally for header button
  React.useEffect(() => {
    (window as any).openNewCampaignDialog = openNewCampaignDialog;
    return () => {
      delete (window as any).openNewCampaignDialog;
    };
  }, []);

  const { data: campaigns, isLoading, error } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete campaign");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] }); // Invalidate all campaign buyer queries
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

  const testCallMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/test-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger call');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Call triggered successfully",
        description: `Test call initiated with SID: ${data.callSid}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error triggering call",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsDialogOpen(true);
  };

  const handleDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (campaignToDelete) {
      deleteMutation.mutate(campaignToDelete.id);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setCampaignToDelete(null);
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingCampaign(undefined);
  };

  const handleFormCancel = () => {
    setIsDialogOpen(false);
    setEditingCampaign(undefined);
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
      <div className="p-6 space-y-6">
        {/* Header with Test Call Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-muted-foreground">Manage your call center campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => testCallMutation.mutate()}
              disabled={testCallMutation.isPending}
              variant="outline"
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              {testCallMutation.isPending ? (
                <>
                  <Phone className="h-4 w-4 mr-2 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Test Call
                </>
              )}
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
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
            <div className="flex-1 overflow-y-auto pr-2">
              <CampaignForm
                campaign={editingCampaign}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          </DialogContent>
        </Dialog>

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
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone and will remove all associated data including calls, buyers, and tracking settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Campaign"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
