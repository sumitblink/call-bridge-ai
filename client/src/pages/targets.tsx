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

// Ringba-style target form schema matching the screenshot
const targetFormSchema = z.object({
  // Basic Info Section
  name: z.string().min(1, "Target name is required"),
  buyerId: z.number().min(1, "Buyer selection is required"),
  type: z.string().default("Number"), // Number, SIP, etc.
  destination: z.string().min(1, "Destination is required"),
  
  // Connection Settings
  connectionTimeout: z.number().default(30),
  disableRecording: z.boolean().default(false),
  timeZone: z.string().default("Select Timezone"),
  hoursOfOperation: z.string().default("Always Open"),
  
  // Cap Settings
  callTo: z.string().default("Conversion"),
  globalCallCap: z.boolean().default(false),
  monthlyCap: z.boolean().default(false),
  dailyCap: z.boolean().default(false),
  hourlyCap: z.boolean().default(false),
  
  // Concurrency Settings
  maxConcurrency: z.boolean().default(false),
  hourlyConcurrency: z.boolean().default(false),
  
  // Duplicate Restrictions
  restrictDuplicates: z.string().default("Buyer Settings (Do not Restrict)"),
  
  // Predictive Routing
  estimatedRevenue: z.string().default("Use Campaign Setting"),
  priorityRank: z.number().default(50), // 0-100 slider
  
  // Shareable Tags
  overrideShareableTags: z.boolean().default(false),
  
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

type TargetFormData = z.infer<typeof targetFormSchema>;

export default function Targets() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  // Fetch targets
  const { data: targets = [], isLoading: targetsLoading, error: targetsError } = useQuery({
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

  // Form for creating/editing targets matching Ringba structure
  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      name: "",
      buyerId: 0,
      type: "Number",
      destination: "",
      connectionTimeout: 30,
      disableRecording: false,
      timeZone: "Select Timezone",
      hoursOfOperation: "Always Open",
      callTo: "Conversion",
      globalCallCap: false,
      monthlyCap: false,
      dailyCap: false,
      hourlyCap: false,
      maxConcurrency: false,
      hourlyConcurrency: false,
      restrictDuplicates: "Buyer Settings (Do not Restrict)",
      estimatedRevenue: "Use Campaign Setting",
      priorityRank: 50,
      overrideShareableTags: false,
      status: "active",
    },
  });

  const onSubmit = (data: TargetFormData) => {
    // Convert Ringba form data to our target data structure
    const targetData = {
      name: data.name,
      buyerId: data.buyerId,
      phoneNumber: data.type === "Number" ? data.destination : undefined,
      endpoint: data.type === "SIP" ? data.destination : undefined,
      priority: data.priorityRank,
      dailyCap: data.dailyCap ? 100 : undefined, // Set default when enabled
      concurrencyLimit: data.maxConcurrency ? 1 : undefined, // Set default when enabled
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
      timeZone: "Select Timezone",
      hoursOfOperation: "Always Open",
      callTo: "Conversion",
      globalCallCap: false,
      monthlyCap: false,
      dailyCap: false,
      hourlyCap: false,
      maxConcurrency: false,
      hourlyConcurrency: false,
      restrictDuplicates: "Buyer Settings (Do not Restrict)",
      estimatedRevenue: "Use Campaign Setting",
      priorityRank: target.priority || 50,
      overrideShareableTags: false,
      status: target.status as "active" | "inactive" | "suspended" || "active",
    });
  };

  const getBuyerName = (buyerId: number) => {
    const buyer = buyers.find(b => b.id === buyerId);
    return buyer ? (buyer.companyName || buyer.name) : `Buyer ${buyerId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "suspended": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (targetsLoading || buyersLoading) {
    return <Layout><div className="p-6">Loading targets...</div></Layout>;
  }

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
                            <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Required" {...field} />
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
                            <FormLabel>Buyer <span className="text-red-500">*</span></FormLabel>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select buyer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {buyers.filter(buyer => buyer.id).map((buyer) => (
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
                            <FormLabel>Type <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Number">Number</SelectItem>
                                <SelectItem value="SIP">SIP</SelectItem>
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
                            <FormLabel>Destination <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Required" {...field} />
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
                            <FormLabel>Connection Timeout <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="disableRecording"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Disable Recording <span className="text-red-500">*</span></FormLabel>
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="timeZone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Zone <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Select Timezone">Select Timezone</SelectItem>
                                <SelectItem value="EST">Eastern Time</SelectItem>
                                <SelectItem value="PST">Pacific Time</SelectItem>
                                <SelectItem value="CST">Central Time</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hoursOfOperation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hours of Operation <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Always Open">Always Open</SelectItem>
                                <SelectItem value="Business Hours">Business Hours</SelectItem>
                                <SelectItem value="Custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Cap Settings Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Cap Settings
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="callTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call to <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="max-w-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Conversion">Conversion</SelectItem>
                              <SelectItem value="Raw Call">Raw Call</SelectItem>
                              <SelectItem value="Answered Call">Answered Call</SelectItem>
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
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Global Call Cap</FormLabel>
                              <div className="text-xs text-gray-500">None</div>
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
                        name="monthlyCap"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Monthly Cap</FormLabel>
                              <div className="text-xs text-gray-500">None</div>
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dailyCap"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Daily Cap</FormLabel>
                              <div className="text-xs text-gray-500">None</div>
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
                        name="hourlyCap"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Hourly Cap</FormLabel>
                              <div className="text-xs text-gray-500">None</div>
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
                  </div>

                  {/* Concurrency Settings Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Concurrency Settings
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxConcurrency"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Max Concurrency</FormLabel>
                              <div className="text-xs text-gray-500">None</div>
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
                        name="hourlyConcurrency"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Hourly Concurrency</FormLabel>
                              <div className="text-xs text-gray-500">None</div>
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
                  </div>

                  {/* Restrict Duplicate Calls Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Restrict Duplicate Calls Settings</h3>
                    
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
                              <SelectItem value="Restrict by Phone">Restrict by Phone</SelectItem>
                              <SelectItem value="Restrict by IP">Restrict by IP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Predictive Routing Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Predictive Routing Settings</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="estimatedRevenue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Revenue</FormLabel>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm">Use Campaign Setting</Button>
                              <Button type="button" variant="outline" size="sm">Use Estimated Revenue</Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priorityRank"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority Rank</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={[field.value]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>0</span>
                                  <span className="font-medium">{field.value}</span>
                                  <span>100</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Shareable Tags */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Shareable Tags</h3>
                    
                    <FormField
                      control={form.control}
                      name="overrideShareableTags"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Override Shareable Tags</FormLabel>
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

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button type="button" variant="outline">Add Filter</Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingTarget(null);
                        form.reset();
                      }}
                    >
                      Close
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                    >
                      Create Target
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Targets List */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target Name</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Daily Cap</TableHead>
                <TableHead>Concurrency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No targets found. Create your first target to get started.
                  </TableCell>
                </TableRow>
              ) : (
                targets.map((target) => (
                  <TableRow key={target.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell>{getBuyerName(target.buyerId)}</TableCell>
                    <TableCell>
                      {target.phoneNumber ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="font-mono text-sm">{target.phoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {target.endpoint ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="text-sm truncate max-w-48" title={target.endpoint}>
                            {target.endpoint}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{target.priority || 1}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{target.dailyCap || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{target.concurrencyLimit || 1}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(target.status)}>
                        {target.status}
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