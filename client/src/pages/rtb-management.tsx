import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { EnhancedRTBTargetDialog } from "@/components/rtb/EnhancedRTBTargetDialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Target, Activity, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Play, TestTube, Zap, Users, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Schema definitions
const rtbRouterSchema = z.object({
  name: z.string().min(1, "Router name is required"),
  description: z.string().optional(),
  biddingTimeoutMs: z.number().min(1000, "Timeout must be at least 1000ms").max(30000, "Timeout cannot exceed 30000ms"),
  minBiddersRequired: z.number().min(1, "Must require at least 1 bidder").max(10, "Cannot require more than 10 bidders"),
  enablePredictiveRouting: z.boolean(),
  revenueType: z.enum(["per_call", "per_minute", "cpa", "cpl"]),
  conversionTracking: z.boolean(),
  isActive: z.boolean(),
});

const rtbTargetSchema = z.object({
  name: z.string().min(1, "Target name is required"),
  buyerId: z.number().min(1, "Buyer is required"),
  endpointUrl: z.string().url("Valid endpoint URL is required"),
  timeoutMs: z.number().min(1000, "Timeout must be at least 1000ms").max(30000, "Timeout cannot exceed 30000ms"),
  connectionTimeout: z.number().min(1000, "Connection timeout must be at least 1000ms").max(30000, "Connection timeout cannot exceed 30000ms"),
  authMethod: z.enum(["none", "api_key", "bearer", "basic"]),
  authToken: z.string().optional(),
  timezone: z.string(),
  isActive: z.boolean(),
  maxConcurrentCalls: z.number().min(1, "Must allow at least 1 concurrent call").max(100, "Cannot exceed 100 concurrent calls"),
  dailyCap: z.number().min(1, "Daily cap must be at least 1").max(10000, "Daily cap cannot exceed 10000"),
  hourlyCap: z.number().min(1, "Hourly cap must be at least 1").max(1000, "Hourly cap cannot exceed 1000"),
  monthlyCap: z.number().min(1, "Monthly cap must be at least 1").max(100000, "Monthly cap cannot exceed 100000"),
  minBidAmount: z.number().min(0, "Minimum bid cannot be negative"),
  maxBidAmount: z.number().min(0, "Maximum bid cannot be negative"),
  currency: z.string().length(3, "Currency must be 3 characters"),
});

type RtbRouter = {
  id: number;
  name: string;
  description?: string;
  biddingTimeoutMs: number;
  minBiddersRequired: number;
  enablePredictiveRouting: boolean;
  revenueType: string;
  conversionTracking: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RtbTarget = {
  id: number;
  name: string;
  buyerId: number;
  endpointUrl: string;
  timeoutMs: number;
  connectionTimeout: number;
  authMethod: string;
  authToken?: string;
  timezone: string;
  isActive: boolean;
  maxConcurrentCalls: number;
  dailyCap: number;
  hourlyCap: number;
  monthlyCap: number;
  minBidAmount: number;
  maxBidAmount: number;
  currency: string;
  totalPings: number;
  successfulBids: number;
  wonCalls: number;
  createdAt: string;
  updatedAt: string;
};

type RtbBidRequest = {
  id: number;
  requestId: string;
  campaignId: number;
  callerId?: string;
  callStartTime: string;
  totalTargetsPinged: number;
  successfulResponses: number;
  winningBidAmount?: number;
  winningTargetId?: number;
  totalResponseTimeMs?: number;
  createdAt: string;
};

// RTB Routers Component
const RTBRoutersTab = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRouter, setEditingRouter] = useState<RtbRouter | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['/api/rtb/routers'],
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['/api/rtb/targets'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rtbRouterSchema>) => {
      const response = await fetch('/api/rtb/routers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create RTB router');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/routers'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "RTB router created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof rtbRouterSchema>> }) => {
      const response = await fetch(`/api/rtb/routers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update RTB router');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/routers'] });
      setEditingRouter(null);
      toast({ title: "Success", description: "RTB router updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/rtb/routers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete RTB router');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/routers'] });
      toast({ title: "Success", description: "RTB router deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof rtbRouterSchema>>({
    resolver: zodResolver(rtbRouterSchema),
    defaultValues: {
      name: "",
      description: "",
      biddingTimeoutMs: 3000,
      minBiddersRequired: 1,
      enablePredictiveRouting: false,
      revenueType: "per_call",
      conversionTracking: false,
      isActive: true,
    },
  });

  const onSubmit = (data: z.infer<typeof rtbRouterSchema>) => {
    if (editingRouter) {
      updateMutation.mutate({ id: editingRouter.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (router: RtbRouter) => {
    setEditingRouter(router);
    form.reset({
      name: router.name,
      description: router.description || "",
      biddingTimeoutMs: router.biddingTimeoutMs,
      minBiddersRequired: router.minBiddersRequired,
      enablePredictiveRouting: router.enablePredictiveRouting,
      revenueType: router.revenueType as "per_call" | "per_minute" | "cpa" | "cpl",
      conversionTracking: router.conversionTracking,
      isActive: router.isActive,
    });
  };

  const handleCloseDialog = () => {
    console.log('Closing dialog, setting state to false');
    setIsCreateDialogOpen(false);
    setEditingRouter(null);
    form.reset();
  };

  const getTargetsCount = (routerId: number) => {
    // This would need to be implemented with router assignments
    return 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">RTB Routers</h3>
          <p className="text-sm text-muted-foreground">
            Manage your real-time bidding router configurations
          </p>
        </div>
        <Button onClick={() => {
          console.log('Create Router button clicked, setting state to true');
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Router
        </Button>
        
        <Dialog open={isCreateDialogOpen || !!editingRouter} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRouter ? "Edit RTB Router" : "Create RTB Router"}
              </DialogTitle>
              <DialogDescription>
                Configure a new RTB router to manage bidding targets and auction settings.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Router Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Insurance RTB Router" {...field} />
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
                        <Textarea placeholder="Optional description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="biddingTimeoutMs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bidding Timeout (ms)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="3000" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minBiddersRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Bidders Required</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="revenueType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select revenue type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="per_call">Per Call</SelectItem>
                          <SelectItem value="per_minute">Per Minute</SelectItem>
                          <SelectItem value="cpa">Cost Per Acquisition</SelectItem>
                          <SelectItem value="cpl">Cost Per Lead</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enablePredictiveRouting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Predictive Routing</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Use machine learning to optimize routing decisions
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conversionTracking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Conversion Tracking</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Track conversion rates and optimize performance
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this router for live bidding
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Router"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active RTB Routers</CardTitle>
          <CardDescription>
            Manage your real-time bidding router configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Timeout</TableHead>
                <TableHead>Revenue Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!Array.isArray(routers) || routers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No RTB routers found. Create your first router to get started.
                  </TableCell>
                </TableRow>
              ) : (
                routers.map((router: RtbRouter) => (
                  <TableRow key={router.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{router.name}</div>
                        {router.description && (
                          <div className="text-sm text-muted-foreground">{router.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getTargetsCount(router.id)} targets
                      </Badge>
                    </TableCell>
                    <TableCell>{router.biddingTimeoutMs}ms</TableCell>
                    <TableCell className="capitalize">{router.revenueType.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={router.isActive ? "default" : "secondary"}>
                        {router.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(router)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(router.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// RTB Targets Component
const RTBTargetsTab = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<RtbTarget | null>(null);
  const [testingTarget, setTestingTarget] = useState<RtbTarget | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['/api/rtb/targets'],
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ['/api/buyers'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rtbTargetSchema>) => {
      const response = await fetch('/api/rtb/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create RTB target');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "RTB target created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof rtbTargetSchema>> }) => {
      const response = await fetch(`/api/rtb/targets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update RTB target');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      setEditingTarget(null);
      toast({ title: "Success", description: "RTB target updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/rtb/targets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete RTB target');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      toast({ title: "Success", description: "RTB target deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (target: RtbTarget) => {
      // Simulate a test bid request
      const testPayload = {
        requestId: `test_${Date.now()}`,
        campaignId: 1,
        callerId: '+1234567890',
        callStartTime: new Date().toISOString(),
        timeout: target.timeoutMs,
        minBid: target.minBidAmount,
        maxBid: target.maxBidAmount,
        currency: target.currency
      };

      const response = await fetch(target.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(target.authMethod === 'api_key' && target.authToken ? { 'X-API-Key': target.authToken } : {}),
          ...(target.authMethod === 'bearer' && target.authToken ? { 'Authorization': `Bearer ${target.authToken}` } : {}),
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Test Successful", 
        description: `Target responded with bid: $${data.bidAmount || 'N/A'}` 
      });
      setTestingTarget(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Test Failed", 
        description: error.message,
        variant: "destructive" 
      });
      setTestingTarget(null);
    },
  });

  const form = useForm<z.infer<typeof rtbTargetSchema>>({
    resolver: zodResolver(rtbTargetSchema),
    defaultValues: {
      name: "",
      buyerId: 0,
      endpointUrl: "",
      timeoutMs: 3000,
      connectionTimeout: 5000,
      authMethod: "none",
      authToken: "",
      timezone: "UTC",
      isActive: true,
      maxConcurrentCalls: 10,
      dailyCap: 100,
      hourlyCap: 10,
      monthlyCap: 3000,
      minBidAmount: 0,
      maxBidAmount: 100,
      currency: "USD",
    },
  });

  const onSubmit = (data: z.infer<typeof rtbTargetSchema>) => {
    if (editingTarget) {
      updateMutation.mutate({ id: editingTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (target: RtbTarget) => {
    setEditingTarget(target);
    form.reset({
      name: target.name,
      buyerId: target.buyerId,
      endpointUrl: target.endpointUrl,
      timeoutMs: target.timeoutMs,
      connectionTimeout: target.connectionTimeout,
      authMethod: target.authMethod as "none" | "api_key" | "bearer" | "basic",
      authToken: target.authToken || "",
      timezone: target.timezone,
      isActive: target.isActive,
      maxConcurrentCalls: target.maxConcurrentCalls,
      dailyCap: target.dailyCap,
      hourlyCap: target.hourlyCap,
      monthlyCap: target.monthlyCap,
      minBidAmount: target.minBidAmount,
      maxBidAmount: target.maxBidAmount,
      currency: target.currency,
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTarget(null);
    form.reset();
  };

  const handleTest = (target: RtbTarget) => {
    setTestingTarget(target);
    testMutation.mutate(target);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">RTB Targets</h3>
          <p className="text-sm text-muted-foreground">
            Manage bidding targets and their endpoint configurations
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Ring Tree Target
        </Button>
        
        <EnhancedRTBTargetDialog
          open={isCreateDialogOpen || !!editingTarget}
          onOpenChange={(open) => {
            if (!open) handleCloseDialog();
          }}
          onSubmit={onSubmit}
          buyers={buyers}
          editingTarget={editingTarget}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RTB Targets</CardTitle>
          <CardDescription>
            Manage your bidding targets and endpoint configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Live</TableHead>
                <TableHead>Hour</TableHead>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(targets) && targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No RTB targets found. Create your first target to get started.
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(targets) && targets.map((target: RtbTarget) => {
                  const buyer = Array.isArray(buyers) ? buyers.find((b: any) => b.id === target.buyerId) : null;
                  return (
                    <TableRow key={target.id}>
                      <TableCell>
                        <div className="font-medium">{target.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Sub ID: {target.subId || 'None'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2"
                          >
                            {buyer?.name || 'Unknown Buyer'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {target.type || 'Number'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm truncate max-w-[200px]">
                          {target.number || target.endpointUrl}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {target.isActive ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            {target.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-center">
                          <div className="font-medium">{target.wonCalls || 0}</div>
                          <div className="text-muted-foreground text-xs">calls</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-center">
                          <div className="font-medium">{target.totalPings || 0}</div>
                          <div className="text-muted-foreground text-xs">total</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTest(target)}
                            disabled={testMutation.isPending && testingTarget?.id === target.id}
                            className="h-8 w-8 p-0"
                          >
                            <TestTube className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(target)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(target.id)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// RTB Analytics Component
const RTBAnalyticsTab = () => {
  const { data: bidRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/rtb/bid-requests'],
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['/api/rtb/targets'],
  });

  if (requestsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const totalRequests = bidRequests?.length || 0;
  const successfulRequests = bidRequests?.filter((req: RtbBidRequest) => req.winningBidAmount && req.winningBidAmount > 0).length || 0;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  const avgBidAmount = bidRequests?.length > 0 
    ? bidRequests
        .filter((req: RtbBidRequest) => req.winningBidAmount && req.winningBidAmount > 0)
        .reduce((sum: number, req: RtbBidRequest) => sum + (req.winningBidAmount || 0), 0) / successfulRequests
    : 0;
  const avgResponseTime = bidRequests?.length > 0
    ? bidRequests
        .filter((req: RtbBidRequest) => req.totalResponseTimeMs)
        .reduce((sum: number, req: RtbBidRequest) => sum + (req.totalResponseTimeMs || 0), 0) / bidRequests.filter((req: RtbBidRequest) => req.totalResponseTimeMs).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">RTB Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Monitor performance metrics and bidding activity
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Bid requests processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Successful bid auctions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Bid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgBidAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average winning bid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Average auction time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Target Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Target Performance</CardTitle>
          <CardDescription>
            Performance metrics for each RTB target
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Total Pings</TableHead>
                <TableHead>Successful Bids</TableHead>
                <TableHead>Won Calls</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No targets found.
                  </TableCell>
                </TableRow>
              ) : (
                targets?.map((target: RtbTarget) => {
                  const winRate = target.totalPings > 0 ? (target.wonCalls / target.totalPings) * 100 : 0;
                  return (
                    <TableRow key={target.id}>
                      <TableCell>
                        <div className="font-medium">{target.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${typeof target.minBidAmount === 'number' ? target.minBidAmount.toFixed(2) : parseFloat(target.minBidAmount || '0').toFixed(2)} - 
                          ${typeof target.maxBidAmount === 'number' ? target.maxBidAmount.toFixed(2) : parseFloat(target.maxBidAmount || '0').toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{target.totalPings.toLocaleString()}</TableCell>
                      <TableCell>{target.successfulBids.toLocaleString()}</TableCell>
                      <TableCell>{target.wonCalls.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {winRate.toFixed(1)}%
                          {winRate > 10 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={target.isActive ? "default" : "secondary"}>
                          {target.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Bid Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bid Requests</CardTitle>
          <CardDescription>
            Latest RTB auction activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Targets Pinged</TableHead>
                <TableHead>Winning Bid</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bidRequests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No bid requests found.
                  </TableCell>
                </TableRow>
              ) : (
                bidRequests?.slice(0, 10).map((request: RtbBidRequest) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{request.requestId}</div>
                    </TableCell>
                    <TableCell>
                      Campaign {request.campaignId}
                    </TableCell>
                    <TableCell>
                      {request.callerId || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {request.successfulResponses}/{request.totalTargetsPinged}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.winningBidAmount ? (
                        <div className="text-green-600 font-medium">
                          ${typeof request.winningBidAmount === 'number' ? request.winningBidAmount.toFixed(2) : parseFloat(request.winningBidAmount || '0').toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No bid</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.totalResponseTimeMs ? `${request.totalResponseTimeMs}ms` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Main RTB Management Component
export default function RTBManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for seeding sample data
  const seedDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/rtb/seed-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to create sample data');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sample Data Created",
        description: `Successfully created RTB sample data: ${data.data.targetsCreated} targets, ${data.data.bidRequestsCreated} bid requests`,
      });
      // Invalidate all RTB queries to refresh the interface
      queryClient.invalidateQueries({ queryKey: ['/api/rtb'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Sample Data",
        description: error.message || "Failed to create sample RTB data",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">RTB Management</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedDataMutation.mutate()}
              disabled={seedDataMutation.isPending}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {seedDataMutation.isPending ? 'Creating...' : 'Seed Test Data'}
            </Button>
            <Badge variant="outline">Real-Time Bidding</Badge>
          </div>
        </div>
        
        <Tabs defaultValue="routers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="routers" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              RTB Routers
            </TabsTrigger>
            <TabsTrigger value="targets" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              RTB Targets
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="routers">
            <RTBRoutersTab />
          </TabsContent>
          
          <TabsContent value="targets">
            <RTBTargetsTab />
          </TabsContent>
          
          <TabsContent value="analytics">
            <RTBAnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}