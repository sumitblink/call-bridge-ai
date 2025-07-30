import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBuyerSchema, type Buyer, type InsertBuyer } from "@shared/schema";
import { Trash2, Edit2, Plus, Building2, Info, Settings, Shield, Users, TrendingUp, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function BuyerRow({ buyer, onEdit, onDelete }: { 
  buyer: Buyer; 
  onEdit: (buyer: Buyer) => void;
  onDelete: (id: number) => void;
}) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBuyerTypeColor = (type: string | null) => {
    switch (type) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'rtb_enabled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{buyer?.companyName || buyer?.name}</span>
          <span className="text-sm text-gray-500">ID: {buyer?.id}</span>
          {buyer?.name && buyer?.companyName && (
            <span className="text-xs text-gray-400">Sub ID: {buyer?.name}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            {buyer?.allowPauseTargets && <Badge variant="outline" className="text-xs">Pause</Badge>}
            {buyer?.allowSetTargetCaps && <Badge variant="outline" className="text-xs">Caps</Badge>}
            {buyer?.allowDisputeConversions && <Badge variant="outline" className="text-xs">Dispute</Badge>}
            {buyer?.enableRevenueRecovery && <Badge variant="outline" className="text-xs">Revenue</Badge>}
          </div>
          {buyer?.restrictDuplicates && (
            <span className="text-xs text-gray-500">Restrict Duplicates</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge className={getStatusColor(buyer?.status)}>
            {buyer?.status || 'Active'}
          </Badge>
          <Badge className={getBuyerTypeColor(buyer?.buyerType)}>
            {buyer?.buyerType === 'rtb_enabled' ? 'RTB' : buyer?.buyerType?.charAt(0).toUpperCase() + buyer?.buyerType?.slice(1) || 'Standard'}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(buyer)}
            className="h-8 w-8 p-0"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(buyer.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function EnhancedBuyerForm({ 
  buyer, 
  open, 
  onOpenChange 
}: { 
  buyer?: Buyer; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertBuyerSchema),
    defaultValues: {
      companyName: buyer?.companyName || "",
      name: buyer?.name || "", // Sub ID field  
      allowPauseTargets: buyer?.allowPauseTargets || false,
      allowSetTargetCaps: buyer?.allowSetTargetCaps || false,
      allowDisputeConversions: buyer?.allowDisputeConversions || false,
      enableRevenueRecovery: buyer?.enableRevenueRecovery || false,
      restrictDuplicates: buyer?.restrictDuplicates || false,
      duplicateTimeWindow: buyer?.duplicateTimeWindow || 3600,
      enablePredictiveRouting: buyer?.enablePredictiveRouting || false,
      estimatedRevenuePerCall: buyer?.estimatedRevenuePerCall || 50,
      shareableTags: buyer?.shareableTags || [],
      status: buyer?.status || "active" as const,
      buyerType: buyer?.buyerType || "standard",
      description: buyer?.description || "",
    },
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create buyer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBuyerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/buyers/${buyer!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update buyer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer updated successfully" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (buyer) {
      updateBuyerMutation.mutate(data);
    } else {
      createBuyerMutation.mutate(data);
    }
  };

  // Reset form when buyer changes
  useEffect(() => {
    if (buyer && open) {
      form.reset({
        companyName: buyer.companyName || "",
        name: buyer.name || "",
        allowPauseTargets: buyer.allowPauseTargets || false,
        allowSetTargetCaps: buyer.allowSetTargetCaps || false,
        allowDisputeConversions: buyer.allowDisputeConversions || false,
        enableRevenueRecovery: buyer.enableRevenueRecovery || false,
        restrictDuplicates: buyer.restrictDuplicates || false,
        duplicateTimeWindow: buyer.duplicateTimeWindow || 3600,
        enablePredictiveRouting: buyer.enablePredictiveRouting || false,
        estimatedRevenuePerCall: buyer.estimatedRevenuePerCall || 50,
        shareableTags: buyer.shareableTags || [],
        status: buyer.status || "active",
        buyerType: buyer.buyerType || "standard",
        description: buyer.description || "",
      });
    }
  }, [buyer, open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {buyer ? "Edit Buyer" : "Create Buyer"}
          </DialogTitle>
          <DialogDescription>
            Configure your buyer organization with comprehensive settings and controls
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                  <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
                  <TabsTrigger value="routing">Routing</TabsTrigger>
                  <TabsTrigger value="tags">Tags</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Basic Information
                      </CardTitle>
                      <CardDescription>
                        Configure buyer company details and contact information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter company name" {...field} />
                              </FormControl>
                              <FormDescription>
                                Primary company or organization name
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sub ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Optional sub identifier" {...field} />
                              </FormControl>
                              <FormDescription>
                                Optional secondary identifier or division
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of the buyer" {...field} />
                            </FormControl>
                            <FormDescription>
                              Optional description or notes about this buyer
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="buyerType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Buyer Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select buyer type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                  <SelectItem value="rtb_enabled">RTB Enabled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Classification for routing and features
                              </FormDescription>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="paused">Paused</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Current operational status
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Permissions Tab */}
                <TabsContent value="permissions" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Buyer Permissions
                      </CardTitle>
                      <CardDescription>
                        Configure what actions this buyer is allowed to perform
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="allowPauseTargets"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Allow Buyer To Pause Targets</FormLabel>
                              <FormDescription>
                                Permit this buyer to pause/unpause their assigned targets
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

                      <FormField
                        control={form.control}
                        name="allowSetTargetCaps"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Set Target Caps</FormLabel>
                              <FormDescription>
                                Allow buyer to modify daily and hourly call caps on their targets
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

                      <FormField
                        control={form.control}
                        name="allowDisputeConversions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Dispute Call Conversions</FormLabel>
                              <FormDescription>
                                Enable buyer to dispute conversion status and quality scores
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

                      <FormField
                        control={form.control}
                        name="enableRevenueRecovery"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Limit Revenue</FormLabel>
                              <FormDescription>
                                Apply revenue limits and recovery mechanisms for this buyer
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
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Duplicates Tab */}
                <TabsContent value="duplicates" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Duplicate Restrictions
                      </CardTitle>
                      <CardDescription>
                        Configure how duplicate calls from same callers are handled
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="restrictDuplicates"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Restrict Duplicates</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="false">Do Not Restrict</SelectItem>
                                <SelectItem value="true">Restrict</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Whether to restrict duplicate calls from the same phone number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("restrictDuplicates") && (
                        <FormField
                          control={form.control}
                          name="duplicateTimeWindow"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duplicate Time Window (seconds)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 3600)} 
                                />
                              </FormControl>
                              <FormDescription>
                                Time window in seconds to check for duplicate calls (default: 3600 = 1 hour)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Routing Tab */}
                <TabsContent value="routing" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Predictive Routing
                      </CardTitle>
                      <CardDescription>
                        Configure intelligent routing and revenue optimization settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="enablePredictiveRouting"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable Predictive Routing</FormLabel>
                              <FormDescription>
                                Use AI-powered routing to optimize call placement and revenue
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

                      {form.watch("enablePredictiveRouting") && (
                        <FormField
                          control={form.control}
                          name="estimatedRevenuePerCall"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Priority Queue: {field.value}</FormLabel>
                              <FormControl>
                                <Slider
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  className="w-full"
                                />
                              </FormControl>
                              <FormDescription>
                                Priority level for routing decisions (0-100, higher = more priority)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tags Tab */}
                <TabsContent value="tags" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Shareable Tags
                      </CardTitle>
                      <CardDescription>
                        Configure tag sharing and data exchange settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-medium">Shareable Tags</h4>
                            <p className="text-sm text-gray-500">Enable sharing of call data and tags with this buyer</p>
                          </div>
                          <Switch />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium">Override</h4>
                            <p className="text-sm text-gray-500">Override campaign-level tag sharing settings</p>
                          </div>
                          <Switch />
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-medium mb-2">Shareable Tags Information</h4>
                        <p>When enabled, this buyer can access shared tags from call data, including UTM parameters, campaign information, and custom tracking data. Override allows buyer-specific tag sharing rules that supersede campaign settings.</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createBuyerMutation.isPending || updateBuyerMutation.isPending}
                >
                  {createBuyerMutation.isPending || updateBuyerMutation.isPending
                    ? "Saving..." 
                    : buyer ? "Update Buyer" : "Create Buyer"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

export default function EnhancedBuyers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [buyerToDelete, setBuyerToDelete] = useState<number | null>(null);

  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ["/api/buyers"],
  });

  const deleteBuyerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/buyers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete buyer");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer deleted successfully" });
      setDeleteDialogOpen(false);
      setBuyerToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (buyer: Buyer) => {
    setEditingBuyer(buyer);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setBuyerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (buyerToDelete) {
      deleteBuyerMutation.mutate(buyerToDelete);
    }
  };

  const handleCreateNew = () => {
    setEditingBuyer(null);
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Buyers</h1>
            <p className="text-gray-600 mt-1">
              Manage buyer organizations and configure routing permissions
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Buyer
          </Button>
        </div>

        {/* Buyers Table */}
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company & Sub ID</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead>Status & Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading buyers...
                  </TableCell>
                </TableRow>
              ) : buyers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                    No buyers found. Create your first buyer to get started.
                  </TableCell>
                </TableRow>
              ) : (
                (buyers as Buyer[]).map((buyer: Buyer) => (
                  <BuyerRow 
                    key={buyer.id} 
                    buyer={buyer} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <EnhancedBuyerForm
          buyer={editingBuyer}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the buyer and remove them from all campaigns. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Buyer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}