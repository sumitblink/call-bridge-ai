import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, DollarSign, Target, Settings, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// JSON validation helper
const validateJsonString = (value: string | undefined) => {
  if (!value || value.trim() === "") return true;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const publisherSchema = z.object({
  name: z.string().min(1, "Publisher name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  status: z.enum(["active", "paused", "suspended"]),
  payoutType: z.enum(["per_call", "per_minute", "revenue_share"]),
  payoutAmount: z.number().min(0, "Payout amount must be positive").default(0),
  minCallDuration: z.number().min(0, "Duration must be positive").default(0),
  allowedTargets: z.array(z.string()).optional().default([]), // Campaign IDs are UUID strings
  enableTracking: z.boolean().default(true),
  trackingSettings: z.string().optional(),
  customParameters: z.string().optional(),
});

type PublisherFormData = z.infer<typeof publisherSchema>;

interface Publisher {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string; // Database field name
  status: string;
  payoutModel: string; // Database field name (not payoutType)
  defaultPayout: string; // Database field name (not payoutAmount)
  // Additional database fields
  company?: string;
  publisherType?: string;
  trafficSource?: string;
  quality?: string;
  currency?: string;
  callsGenerated: number;
  conversions: number;
  totalPayout: string;
  avgCallDuration: number;
  conversionRate: string;
  postbackUrl?: string;
  webhookUrl?: string;
  apiKey?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: string; // Campaign IDs are UUIDs (strings), not numbers
  name: string;
  status: string;
}

export default function Publishers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);

  // Fetch publishers
  const { data: publishers = [], isLoading, error } = useQuery<Publisher[]>({
    queryKey: ["/api/publishers"],
  });

  // Fetch campaigns for multi-select
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const form = useForm<PublisherFormData>({
    resolver: zodResolver(publisherSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
      payoutType: "per_call",
      payoutAmount: 0,
      minCallDuration: 0,
      allowedTargets: [],
      enableTracking: true,
      trackingSettings: "",
      customParameters: "",
    },
  });

  // Create publisher mutation
  const createPublisher = useMutation({
    mutationFn: async (data: PublisherFormData) => {
      // Step 1: Create the publisher
      const response = await apiRequest("/api/publishers", "POST", {
        name: data.name,
        email: data.email,
        phoneNumber: data.phone || null, // Map to database field
        status: data.status,
        payoutModel: data.payoutType, // Map to database field
        defaultPayout: data.payoutAmount.toString(), // Map to database field
      });
      const publisher = await response.json();
      
      // Step 2: Handle campaign assignments
      if (data.allowedTargets && data.allowedTargets.length > 0) {
        await Promise.all(
          data.allowedTargets.map(async (campaignId) => {
            try {
              await apiRequest(`/api/campaigns/${campaignId}/publishers`, "POST", {
                publisherId: publisher.id,
                customPayout: data.payoutAmount.toString() // Use publisher's default payout
              });
            } catch (error) {
              console.error(`Failed to assign publisher to campaign ${campaignId}:`, error);
            }
          })
        );
      }
      
      return publisher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publishers"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Publisher created successfully" });
    },
    onError: (error: any) => {
      console.error("Publisher creation error:", error);
      toast({ 
        title: "Failed to create publisher", 
        description: error.message || "Please check all required fields and try again.",
        variant: "destructive" 
      });
    },
  });

  // Update publisher mutation
  const updatePublisher = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PublisherFormData }) => {
      // Step 1: Update the publisher
      const response = await apiRequest(`/api/publishers/${id}`, "PUT", {
        name: data.name,
        email: data.email,
        phoneNumber: data.phone || null, // Map to database field
        status: data.status,
        payoutModel: data.payoutType, // Map to database field
        defaultPayout: data.payoutAmount.toString(), // Map to database field
      });
      const publisher = await response.json();
      
      // Step 2: Get current campaign assignments to compare
      const currentAssignments = new Set<string>();
      for (const campaign of campaigns) {
        try {
          const publishersResponse = await apiRequest(`/api/campaigns/${campaign.id}/publishers`, "GET");
          const campaignPublishers = await publishersResponse.json();
          if (campaignPublishers.some((p: any) => p.id === id)) {
            currentAssignments.add(campaign.id);
          }
        } catch (error) {
          console.error(`Failed to check publisher assignments for campaign ${campaign.id}:`, error);
        }
      }
      
      // Step 3: Handle campaign assignment changes
      const newAssignments = new Set(data.allowedTargets || []);
      
      // Remove assignments that are no longer selected
      for (const campaignId of currentAssignments) {
        if (!newAssignments.has(campaignId)) {
          try {
            await apiRequest(`/api/campaigns/${campaignId}/publishers/${id}`, "DELETE");
          } catch (error) {
            console.error(`Failed to remove publisher from campaign ${campaignId}:`, error);
          }
        }
      }
      
      // Add new assignments
      for (const campaignId of newAssignments) {
        if (!currentAssignments.has(campaignId)) {
          try {
            await apiRequest(`/api/campaigns/${campaignId}/publishers`, "POST", {
              publisherId: id,
              customPayout: data.payoutAmount.toString()
            });
          } catch (error) {
            console.error(`Failed to assign publisher to campaign ${campaignId}:`, error);
          }
        }
      }
      
      return publisher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publishers"] });
      setEditingPublisher(null);
      form.reset();
      toast({ title: "Publisher updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update publisher", variant: "destructive" });
    },
  });

  // Delete publisher mutation
  const deletePublisher = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/publishers/${id}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publishers"] });
      toast({ title: "Publisher deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete publisher", variant: "destructive" });
    },
  });

  const onSubmit = (data: PublisherFormData) => {
    console.log("Submitting publisher data:", data);
    console.log("Form errors:", form.formState.errors);
    
    if (editingPublisher) {
      updatePublisher.mutate({ id: editingPublisher.id, data });
    } else {
      createPublisher.mutate(data);
    }
  };

  const handleEdit = async (publisher: Publisher) => {
    // Map database fields to form fields
    const dbPublisher = publisher as any; // Cast to access database field names
    
    // Safely parse payout amount from defaultPayout field
    const payoutAmount = dbPublisher.defaultPayout ? parseFloat(dbPublisher.defaultPayout) : 0;
    const safePayoutAmount = isNaN(payoutAmount) ? 0 : payoutAmount;
    
    // Get current campaign assignments for this publisher
    const assignedCampaigns: string[] = [];
    for (const campaign of campaigns) {
      try {
        const publishersResponse = await apiRequest(`/api/campaigns/${campaign.id}/publishers`, "GET");
        const campaignPublishers = await publishersResponse.json();
        if (campaignPublishers.some((p: any) => p.id === publisher.id)) {
          assignedCampaigns.push(campaign.id);
        }
      } catch (error) {
        console.error(`Failed to check publisher assignments for campaign ${campaign.id}:`, error);
      }
    }
    
    console.log("Setting form data for edit:", {
      publisher,
      defaultPayout: dbPublisher.defaultPayout,
      payoutModel: dbPublisher.payoutModel,
      parsed: payoutAmount,
      safe: safePayoutAmount,
      assignedCampaigns
    });
    
    // Set form values BEFORE opening dialog to avoid reset issues
    form.reset({
      name: publisher.name,
      email: publisher.email,
      phone: dbPublisher.phoneNumber || "",
      status: publisher.status as "active" | "paused" | "suspended",
      payoutType: dbPublisher.payoutModel as "per_call" | "per_minute" | "revenue_share",
      payoutAmount: safePayoutAmount,
      minCallDuration: 0, // Not stored in publishers table
      allowedTargets: assignedCampaigns, // Load actual assignments
      enableTracking: true, // Default value
      trackingSettings: "",
      customParameters: "",
    });
    
    // Then open dialog
    setEditingPublisher(publisher);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this publisher?")) {
      deletePublisher.mutate(id);
    }
  };

  const getPayoutTypeLabel = (type: string) => {
    switch (type) {
      case "per_call": return "per call";
      case "per_minute": return "per minute";
      case "revenue_share": return "revenue share";
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "suspended": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Error loading publishers</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "Failed to load publishers"}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/publishers"] })}>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Publishers</h1>
            <p className="text-muted-foreground">
              Manage traffic sources and affiliate publishers for your campaigns.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Publisher
          </Button>
        </div>

        {/* Publishers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Publishers</CardTitle>
            <CardDescription>Manage your affiliate publishers and traffic sources</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : publishers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No publishers found</h3>
                <p className="text-gray-500 mb-4">Start by adding your first publisher to begin generating traffic</p>
                <Button onClick={() => setIsCreateOpen(true)}>
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
                    <TableHead>Targets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publishers.map((publisher) => (
                    <TableRow key={publisher.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{publisher.name}</span>
                          <span className="text-sm text-gray-500">ID: {publisher.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{publisher.email}</span>
                          {publisher.phoneNumber && (
                            <span className="text-xs text-gray-500">{publisher.phoneNumber}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(publisher.status)}>
                          {publisher.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">${publisher.defaultPayout}</span>
                          <span className="text-xs text-gray-500">{getPayoutTypeLabel(publisher.payoutModel)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center text-sm">
                            <span className="font-medium">{publisher.callsGenerated}</span>
                            <span className="text-gray-500 ml-1">calls</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <span>${publisher.totalPayout} total</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <span>{publisher.avgCallDuration}s avg</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {publisher.allowedTargets && publisher.allowedTargets.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {publisher.allowedTargets.slice(0, 2).map((targetId) => {
                              const campaign = campaigns.find(c => c.id === targetId);
                              return (
                                <Badge key={targetId} variant="secondary" className="text-xs">
                                  {campaign ? campaign.name : `Campaign ${targetId}`}
                                </Badge>
                              );
                            })}
                            {publisher.allowedTargets.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{publisher.allowedTargets.length - 2} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">All campaigns</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(publisher)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Publisher</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{publisher.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(publisher.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Publisher Dialog */}
        <Dialog 
          open={isCreateOpen || editingPublisher !== null} 
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingPublisher(null);
              // Only reset form to defaults when closing, not when switching between edit states
              form.reset({
                name: "",
                email: "",
                phone: "",
                status: "active",
                payoutType: "per_call",
                payoutAmount: 0,
                minCallDuration: 0,
                allowedTargets: [],
                enableTracking: true,
                trackingSettings: "",
                customParameters: "",
              });
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPublisher ? "Edit Publisher" : "Create Publisher"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" key={editingPublisher?.id || 'create'}>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-6 mt-6">
                    {/* Publisher Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Publisher Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Publisher Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter publisher name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="publisher@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="+1 (555) 123-4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} key={`status-${editingPublisher?.id || 'create'}`}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="paused">Paused</SelectItem>
                                  <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Payout Configuration */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Payout Configuration
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="payoutType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payout Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} key={`payoutType-${editingPublisher?.id || 'create'}`}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="per_call">Per Call</SelectItem>
                                  <SelectItem value="per_minute">Per Minute</SelectItem>
                                  <SelectItem value="revenue_share">Revenue Share</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="payoutAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payout Amount ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="minCallDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Duration (sec)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Campaign Targeting */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Target className="mr-2 h-4 w-4" />
                        Campaign Access
                      </h3>
                      <FormField
                        control={form.control}
                        name="allowedTargets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allowed Campaigns</FormLabel>
                            <FormDescription>
                              Select campaigns this publisher can access. Leave empty to allow all.
                            </FormDescription>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-3">
                              {campaigns.length === 0 ? (
                                <p className="text-sm text-muted-foreground col-span-2">
                                  No campaigns available. Publisher will have access to all campaigns by default.
                                </p>
                              ) : (
                                campaigns.map((campaign) => (
                                  <div key={campaign.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`campaign-${campaign.id}`}
                                      checked={field.value?.includes(campaign.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValue, campaign.id]);
                                        } else {
                                          field.onChange(currentValue.filter((id: string) => id !== campaign.id));
                                        }
                                      }}
                                    />
                                    <label 
                                      htmlFor={`campaign-${campaign.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      {campaign.name}
                                    </label>
                                  </div>
                                ))
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Tracking Toggle */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="enableTracking"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable Tracking</FormLabel>
                              <FormDescription>
                                Enable advanced tracking and attribution for this publisher
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Advanced Tracking Settings
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Configure custom tracking parameters and integration settings for advanced users.
                      </p>
                      
                      <FormField
                        control={form.control}
                        name="trackingSettings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tracking Parameters (JSON)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder='{"utm_source": "publisher_name", "click_id": "{click_id}", "sub_id": "{sub_id}"}'
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Define custom tracking tokens and URL parameters. Use standard UTM parameters or custom tracking tokens.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="customParameters"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Integration Parameters (JSON)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder='{"publisher_id": "PUB123", "source_type": "affiliate", "conversion_tracking": true}'
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Publisher-specific parameters for API integrations and custom tracking implementations.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingPublisher(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPublisher.isPending || updatePublisher.isPending}
                  >
                    {editingPublisher ? "Update" : "Create"} Publisher
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}