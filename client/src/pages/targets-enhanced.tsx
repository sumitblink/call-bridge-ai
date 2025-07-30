import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Phone, Globe, Users, TrendingUp, Edit, Trash2, Clock, Settings, Target as TargetIcon, Info, Zap, Shield, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import type { Target, Buyer } from "@shared/schema";

// Enhanced target form schema matching RTB Target structure
const enhancedTargetFormSchema = z.object({
  // Basic Info Section
  name: z.string().min(1, "Target name is required"),
  buyerId: z.number().min(1, "Buyer selection is required"),
  type: z.enum(["Number", "SIP", "Endpoint"]).default("Number"),
  destination: z.string().min(1, "Destination is required"),
  
  // Connection Settings
  connectionTimeout: z.number().min(1).max(300).default(30),
  disableRecording: z.boolean().default(false),
  timeZone: z.string().default("UTC"),
  hoursOfOperation: z.string().default("Always Open"),
  
  // Cap Settings
  callTo: z.enum(["Conversion", "Call", "Revenue"]).default("Conversion"),
  globalCallCap: z.number().min(0).optional(),
  monthlyCap: z.number().min(0).optional(),
  dailyCap: z.number().min(0).optional(),
  hourlyCap: z.number().min(0).optional(),
  
  // Concurrency Settings
  maxConcurrency: z.number().min(0).optional(),
  hourlyConcurrency: z.number().min(0).optional(),
  
  // Duplicate Restrictions
  restrictDuplicates: z.enum(["Buyer Settings (Do not Restrict)", "Block", "Route to Fallback"]).default("Buyer Settings (Do not Restrict)"),
  
  // Predictive Routing
  estimatedRevenue: z.enum(["Use Campaign Setting", "Use Estimated Revenue"]).default("Use Campaign Setting"),
  priorityRank: z.number().min(0).max(100).default(50),
  
  // Shareable Tags
  overrideShareableTags: z.boolean().default(false),
  
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

type EnhancedTargetFormData = z.infer<typeof enhancedTargetFormSchema>;

export default function EnhancedTargets() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  // Fetch targets
  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['/api/targets'],
  });

  // Fetch buyers for dropdown
  const { data: buyers = [], isLoading: buyersLoading } = useQuery({
    queryKey: ['/api/buyers'],
  });

  // Create target mutation
  const createTargetMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/targets', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Target created",
        description: "The target has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create target",
        variant: "destructive",
      });
    },
  });

  // Update target mutation
  const updateTargetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/targets/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      setEditingTarget(null);
      form.reset();
      toast({
        title: "Target updated",
        description: "The target has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update target",
        variant: "destructive",
      });
    },
  });

  // Delete target mutation
  const deleteTargetMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/targets/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({
        title: "Target deleted",
        description: "The target has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete target",
        variant: "destructive",
      });
    },
  });

  // Enhanced form for creating/editing targets
  const form = useForm<EnhancedTargetFormData>({
    resolver: zodResolver(enhancedTargetFormSchema),
    defaultValues: {
      name: "",
      buyerId: 0,
      type: "Number",
      destination: "",
      connectionTimeout: 30,
      disableRecording: false,
      timeZone: "UTC",
      hoursOfOperation: "Always Open",
      callTo: "Conversion",
      globalCallCap: undefined,
      monthlyCap: undefined,
      dailyCap: undefined,
      hourlyCap: undefined,
      maxConcurrency: undefined,
      hourlyConcurrency: undefined,
      restrictDuplicates: "Buyer Settings (Do not Restrict)",
      estimatedRevenue: "Use Campaign Setting",
      priorityRank: 50,
      overrideShareableTags: false,
      status: "active",
    },
  });

  const onSubmit = (data: EnhancedTargetFormData) => {
    // Convert enhanced form data to our target data structure
    const targetData = {
      name: data.name,
      buyerId: data.buyerId,
      phoneNumber: data.type === "Number" ? data.destination : undefined,
      endpoint: data.type === "SIP" || data.type === "Endpoint" ? data.destination : undefined,
      priority: data.priorityRank,
      dailyCap: data.dailyCap,
      concurrencyLimit: data.maxConcurrency,
      status: data.status,
      userId: 2, // Add userId for database constraint
    };

    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, data: targetData });
    } else {
      createTargetMutation.mutate(targetData);
    }
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    form.reset({
      name: target.name || "",
      buyerId: target.buyerId || 0,
      type: "Number",
      destination: target.phoneNumber || target.endpoint || "",
      connectionTimeout: 30,
      disableRecording: false,
      timeZone: "UTC",
      hoursOfOperation: "Always Open",
      callTo: "Conversion",
      globalCallCap: undefined,
      monthlyCap: undefined,
      dailyCap: target.dailyCap || undefined,
      hourlyCap: undefined,
      maxConcurrency: target.concurrencyLimit || undefined,
      hourlyConcurrency: undefined,
      restrictDuplicates: "Buyer Settings (Do not Restrict)",
      estimatedRevenue: "Use Campaign Setting",
      priorityRank: target.priority || 50,
      overrideShareableTags: false,
      status: target.status || "active",
    });
  };

  const getBuyerName = (buyerId: number) => {
    const buyer = (buyers as Buyer[]).find((b: Buyer) => b.id === buyerId);
    return buyer?.companyName || buyer?.name || `Buyer ${buyerId}`;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Targets</h1>
            <p className="text-gray-600 mt-1">
              Manage individual routing endpoints and destinations under buyers
            </p>
          </div>
          <Dialog open={isCreateDialogOpen || !!editingTarget} onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingTarget(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Target
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5" />
                  {editingTarget ? "Edit Target" : "Create Target"}
                </DialogTitle>
                <DialogDescription>
                  Configure your target endpoint with comprehensive settings and controls
                </DialogDescription>
              </DialogHeader>
              
              <TooltipProvider>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="caps">Cap Settings</TabsTrigger>
                        <TabsTrigger value="concurrency">Concurrency</TabsTrigger>
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
                              Configure the target name, buyer assignment, and destination endpoint
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Target Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter target name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="buyerId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Buyer *</FormLabel>
                                    <Select 
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                      value={field.value?.toString() || ""}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select buyer" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {(buyers as Buyer[]).map((buyer: Buyer) => (
                                          <SelectItem key={buyer.id} value={buyer.id.toString()}>
                                            {buyer.companyName || buyer.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="Number">Number</SelectItem>
                                        <SelectItem value="SIP">SIP</SelectItem>
                                        <SelectItem value="Endpoint">Endpoint</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="destination"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Destination *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Phone number or endpoint" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="connectionTimeout"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Connection Timeout (seconds)</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 30)} />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum time to wait for connection (1-300 seconds)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="disableRecording"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Disable Recording</FormLabel>
                                      <FormDescription>
                                        Turn off call recording for this target
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
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Cap Settings Tab */}
                      <TabsContent value="caps" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Cap Settings
                            </CardTitle>
                            <CardDescription>
                              Configure call volume limits and capacity controls
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="callTo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cap On</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Conversion">Conversion</SelectItem>
                                      <SelectItem value="Call">Call</SelectItem>
                                      <SelectItem value="Revenue">Revenue</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="globalCallCap"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Global Call Cap</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Unlimited"
                                        value={field.value || ""} 
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum total calls across all time periods
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="monthlyCap"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Monthly Cap</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Unlimited"
                                        value={field.value || ""} 
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum calls per month
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="dailyCap"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Daily Cap</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Unlimited"
                                        value={field.value || ""} 
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum calls per day
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="hourlyCap"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Hourly Cap</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Unlimited"
                                        value={field.value || ""} 
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum calls per hour
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Concurrency Tab */}
                      <TabsContent value="concurrency" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Concurrency Settings
                            </CardTitle>
                            <CardDescription>
                              Control simultaneous call handling and capacity limits
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="maxConcurrency"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Concurrency</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Unlimited"
                                        value={field.value || ""} 
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum simultaneous calls
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="hourlyConcurrency"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Hourly Concurrency</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder="Unlimited"
                                        value={field.value || ""} 
                                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Maximum concurrent calls per hour
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Routing Tab */}
                      <TabsContent value="routing" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Routing Settings
                            </CardTitle>
                            <CardDescription>
                              Configure call routing behavior and duplicate handling
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="restrictDuplicates"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Restrict Duplicates</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Buyer Settings (Do not Restrict)">Buyer Settings (Do not Restrict)</SelectItem>
                                      <SelectItem value="Block">Block</SelectItem>
                                      <SelectItem value="Route to Fallback">Route to Fallback</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    How to handle duplicate calls from same caller
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="estimatedRevenue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Revenue</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Use Campaign Setting">Use Campaign Setting</SelectItem>
                                      <SelectItem value="Use Estimated Revenue">Use Estimated Revenue</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Revenue estimation method for predictive routing
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="priorityRank"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Priority Rank: {field.value}</FormLabel>
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
                                    Higher numbers = higher priority (0-100)
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Tags Tab */}
                      <TabsContent value="tags" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Shareable Tags
                            </CardTitle>
                            <CardDescription>
                              Configure tag sharing and override settings
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField
                              control={form.control}
                              name="overrideShareableTags"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Override Shareable Tags</FormLabel>
                                    <FormDescription>
                                      Override buyer's shareable tag settings for this target
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
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Target Status</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                      <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Current operational status of the target
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          setEditingTarget(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                      >
                        {createTargetMutation.isPending || updateTargetMutation.isPending
                          ? "Saving..." 
                          : editingTarget ? "Update Target" : "Create Target"
                        }
                      </Button>
                    </div>
                  </form>
                </Form>
              </TooltipProvider>
            </DialogContent>
          </Dialog>
        </div>

        {/* Targets Table */}
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Daily Cap</TableHead>
                <TableHead>Concurrency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targetsLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-4">
                    Loading targets...
                  </TableCell>
                </TableRow>
              ) : targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-4 text-gray-500">
                    No targets found. Create your first target to get started.
                  </TableCell>
                </TableRow>
              ) : (
                (targets as Target[]).map((target: Target) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell>
                      <Badge variant={target.phoneNumber ? "default" : "secondary"}>
                        {target.phoneNumber ? "Phone" : "Endpoint"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getBuyerName(target.buyerId)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {target.phoneNumber || target.endpoint}
                    </TableCell>
                    <TableCell>{target.priority || 50}</TableCell>
                    <TableCell>{target.dailyCap || "Unlimited"}</TableCell>
                    <TableCell>{target.concurrencyLimit || "Unlimited"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={target.status === "active" ? "default" : target.status === "inactive" ? "secondary" : "destructive"}
                      >
                        {target.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(target)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTargetMutation.mutate(target.id)}
                          disabled={deleteTargetMutation.isPending}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}