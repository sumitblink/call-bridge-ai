import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTargetSchema, type Target, type InsertTarget, type Buyer } from "@shared/schema";
import { Plus, Edit, Trash2, Target as TargetIcon, User, Phone, DollarSign, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const targetFormSchema = insertTargetSchema.extend({
  buyerId: z.number().min(1, "Buyer is required"),
  name: z.string().min(1, "Target name is required"),
  destination: z.string().min(1, "Destination is required"),
  rate: z.number().min(0, "Rate must be positive").optional(),
  estimatedRevenue: z.number().min(0, "Estimated revenue must be positive").optional(),
});

type TargetFormData = z.infer<typeof targetFormSchema>;

interface EnhancedTarget extends Target {
  buyerName?: string;
}

export default function TargetsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch targets
  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['/api/targets'],
    queryFn: async () => {
      const response = await fetch('/api/targets');
      if (!response.ok) throw new Error('Failed to fetch targets');
      return response.json() as Promise<Target[]>;
    },
  });

  // Fetch buyers for the select dropdown
  const { data: buyersData, isLoading: buyersLoading, error: buyersError } = useQuery({
    queryKey: ['/api/buyers'],
    queryFn: async () => {
      const response = await fetch('/api/buyers');
      if (!response.ok) throw new Error('Failed to fetch buyers');
      return response.json() as Promise<Buyer[]>;
    },
  });

  // Ensure buyers is always an array
  const buyers = Array.isArray(buyersData) ? buyersData : [];

  // Enhanced targets with buyer names
  const enhancedTargets: EnhancedTarget[] = Array.isArray(targets) ? targets.map(target => ({
    ...target,
    buyerName: buyers.find(b => b.id === target.buyerId)?.name || 'Unknown Buyer'
  })) : [];

  // Filter targets by selected buyer
  const filteredTargets = selectedBuyerId 
    ? enhancedTargets.filter(t => t.buyerId === selectedBuyerId)
    : enhancedTargets;

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      name: "",
      subId: "",
      type: "number",
      destination: "",
      connectionTimeout: 30,
      disableRecording: false,
      timeZone: "UTC",
      hoursOfOperation: "basic",
      status: "active",
      rate: 0,
      estimatedRevenue: 0,
      useEstimatedRevenue: false,
      carrier: "conversion",
      globalCarrier: false,
      healthCalc: false,
      callCalc: false,
      hanifCalc: false,
      maxConcurrency: 5,
      enableMaxConcurrency: false,
      hourlyConcurrency: 10,
      enableHourlyConcurrency: false,
      restrictDuplicates: "do_not_restrict",
      restrictDuplicatesCallSetting: false,
      priorityBump: 0,
      enablePredictiveRouting: false,
      enableShareableTags: false,
      overrideShareableTags: false,
      enableTagRoutingFilters: false,
    },
  });

  // Create target mutation
  const createTargetMutation = useMutation({
    mutationFn: async (data: TargetFormData) => {
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create target');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({
        title: "Success",
        description: "Target created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
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
    mutationFn: async ({ id, data }: { id: number; data: Partial<TargetFormData> }) => {
      const response = await fetch(`/api/targets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update target');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({
        title: "Success",
        description: "Target updated successfully",
      });
      setEditingTarget(null);
      form.reset();
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
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/targets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete target');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({
        title: "Success",
        description: "Target deleted successfully",
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

  const onSubmit = (data: TargetFormData) => {
    const formattedData = {
      ...data,
      buyerId: data.buyerId || null, // Handle optional buyer
    };
    
    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, data: formattedData });
    } else {
      createTargetMutation.mutate(formattedData);
    }
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    form.reset({
      name: target.name || "",
      subId: target.subId || "",
      type: (target.type as "number" | "sip") || "number",
      destination: target.destination || "",
      connectionTimeout: target.connectionTimeout || 30,
      disableRecording: target.disableRecording || false,
      timeZone: target.timeZone || "UTC",
      hoursOfOperation: (target.hoursOfOperation as "basic" | "advanced") || "basic",
      status: target.status || "active",
      buyerId: target.buyerId,
      rate: typeof target.rate === 'string' ? parseFloat(target.rate) : target.rate || 0,
      estimatedRevenue: typeof target.estimatedRevenue === 'string' ? parseFloat(target.estimatedRevenue || "0") : target.estimatedRevenue || 0,
      useEstimatedRevenue: target.useEstimatedRevenue || false,
      carrier: target.carrier || "conversion",
      globalCarrier: target.globalCarrier || false,
      healthCalc: target.healthCalc || false,
      callCalc: target.callCalc || false,
      hanifCalc: target.hanifCalc || false,
      maxConcurrency: target.maxConcurrency || 5,
      enableMaxConcurrency: target.enableMaxConcurrency || false,
      hourlyConcurrency: target.hourlyConcurrency || 10,
      enableHourlyConcurrency: target.enableHourlyConcurrency || false,
      restrictDuplicates: (target.restrictDuplicates as "do_not_restrict" | "by_phone" | "by_caller_id" | "by_both") || "do_not_restrict",
      restrictDuplicatesCallSetting: target.restrictDuplicatesCallSetting || false,
      priorityBump: target.priorityBump || 0,
      enablePredictiveRouting: target.enablePredictiveRouting || false,
      enableShareableTags: target.enableShareableTags || false,
      overrideShareableTags: target.overrideShareableTags || false,
      enableTagRoutingFilters: target.enableTagRoutingFilters || false,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (target: Target) => {
    if (confirm(`Are you sure you want to delete target "${target.name}"?`)) {
      deleteTargetMutation.mutate(target.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      paused: "secondary",
      inactive: "destructive",
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || "default"}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      call: "default",
      lead: "secondary",
      conversion: "outline",
    } as const;
    return <Badge variant={variants[type as keyof typeof variants] || "default"}>{type}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TargetIcon className="h-8 w-8" />
            Target Management
          </h1>
          <p className="text-muted-foreground">
            Manage targets associated with buyers for website testing and call routing
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTarget(null); form.reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTarget ? "Edit Target" : "Create New Target"}
              </DialogTitle>
              <DialogDescription>
                Configure target settings for buyer routing and testing
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Basic Target Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target ID</label>
                      <Input 
                        value={editingTarget?.id ? `Target #${editingTarget.id}` : "Auto-generated"} 
                        disabled 
                        className="bg-muted"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter target name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter sub ID" />
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
                          <FormLabel>Buyer <span className="text-sm text-muted-foreground">(The Buyer that owns this target - optional)</span></FormLabel>
                          <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select buyer (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No buyer</SelectItem>
                              {buyers.map((buyer) => (
                                <SelectItem key={buyer.id} value={buyer.id.toString()}>
                                  {buyer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Type Selection with Tabs */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type <span className="text-sm text-muted-foreground">(Select either a phone number or SIP endpoint to route your calls to this target)</span></FormLabel>
                          <div className="flex space-x-1 border rounded-lg p-1 bg-muted">
                            <Button
                              type="button"
                              variant={field.value === "number" ? "default" : "ghost"}
                              className="flex-1"
                              onClick={() => field.onChange("number")}
                            >
                              Number
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "sip" ? "default" : "ghost"}
                              className="flex-1"
                              onClick={() => field.onChange("sip")}
                            >
                              SIP
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="destination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {form.watch("type") === "sip" ? "SIP Endpoint" : "Number"} *
                            {form.watch("type") === "number" && (
                              <span className="text-sm text-muted-foreground block">
                                Phone number should follow this format +(country code)(phonenumber)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder={form.watch("type") === "sip" ? "sip:user@domain.com" : "+1234567890"}
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Connection and Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="connectionTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Connection Timeout (seconds)
                            <span className="text-sm text-muted-foreground block">
                              If this target does not answer a call within the specified amount of seconds, the call will be re-routed. If the duration is set to 0, it will assume a default of 30 seconds.
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              max="300"
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value || 30}
                              placeholder="30"
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
                        <FormItem className="flex items-center space-x-2 pt-8">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Disable Recording</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Timezone */}
                  <FormField
                    control={form.control}
                    name="timeZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UTC">UTC - Coordinated Universal Time</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                            <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                            <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                            <SelectItem value="America/Anchorage">Alaska Time (AKST/AKDT)</SelectItem>
                            <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                            <SelectItem value="Europe/London">London Time (GMT/BST)</SelectItem>
                            <SelectItem value="Europe/Paris">Central European Time (CET/CEST)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Japan Time (JST)</SelectItem>
                            <SelectItem value="Australia/Sydney">Australian Eastern Time (AEST/AEDT)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hours of Operation */}
                  <FormField
                    control={form.control}
                    name="hoursOfOperation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours of Operation</FormLabel>
                        <div className="flex space-x-1 border rounded-lg p-1 bg-muted">
                          <Button
                            type="button"
                            variant={field.value === "basic" ? "default" : "ghost"}
                            className="flex-1"
                            onClick={() => field.onChange("basic")}
                          >
                            Basic
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "advanced" ? "default" : "ghost"}
                            className="flex-1"
                            onClick={() => field.onChange("advanced")}
                          >
                            Advanced
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cap Settings */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Cap Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="carrier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cap On</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Connection" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="connection">Connection</SelectItem>
                                <SelectItem value="conversion">Conversion</SelectItem>
                                <SelectItem value="answered">Answered</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="globalCarrier"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>Global Cap On</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="healthCalc"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>Monthly Cap On</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="callCalc"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>Daily Cap On</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hanifCalc"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel>Hourly Cap On</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="text-right text-sm text-muted-foreground">
                        <div>None</div>
                        <div>None</div>
                        <div>50 <Button variant="ghost" size="sm" className="ml-2 text-blue-600">ADVANCED</Button> <Button variant="ghost" size="sm" className="ml-1 text-blue-600">RESET</Button></div>
                        <div>None</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Concurrency Settings */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Concurrency Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="enableMaxConcurrency"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Max Concurrency On</FormLabel>
                          <div className="ml-auto">2</div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enableHourlyConcurrency"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Hourly Concurrency On</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Additional Settings from Screenshot */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Restrict Duplicate Call Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="restrictDuplicates"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restrict Duplicate</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Buyer Settings (Do not Restrict)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="do_not_restrict">Buyer Settings (Do not Restrict)</SelectItem>
                              <SelectItem value="by_phone">By Phone Number</SelectItem>
                              <SelectItem value="by_caller_id">By Caller ID</SelectItem>
                              <SelectItem value="by_both">By Phone & Caller ID</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Predictive Routing Settings */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Predictive Routing Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimatedRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Revenue</FormLabel>
                          <div className="flex space-x-1 border rounded-lg p-1 bg-muted">
                            <Button
                              type="button"
                              variant={field.value === "use_campaign" ? "default" : "ghost"}
                              className="flex-1 text-xs"
                              onClick={() => field.onChange("use_campaign")}
                            >
                              Use Campaign Setting
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "use_estimated" ? "default" : "ghost"}
                              className="flex-1 text-xs"
                              onClick={() => field.onChange("use_estimated")}
                            >
                              Use Estimated Revenue
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityBump"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority Bump</FormLabel>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="range"
                              min="-10"
                              max="10"
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-16">Default</span>
                            <span className="text-sm font-medium w-8">+0</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Shareable Tags */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Shareable Tags</h3>
                  
                  <FormField
                    control={form.control}
                    name="overrideShareableTags"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Override Shareable Tags On</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTargetMutation.isPending || updateTargetMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {(createTargetMutation.isPending || updateTargetMutation.isPending) 
                      ? "Saving..." 
                      : editingTarget ? "Update Target" : "Create Target"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by Buyer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Filter by Buyer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select onValueChange={(value) => setSelectedBuyerId(value === "all" ? null : parseInt(value))} value={selectedBuyerId?.toString() || "all"}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All buyers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buyers</SelectItem>
                {buyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id.toString()}>
                    {buyer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Showing {filteredTargets.length} of {enhancedTargets.length} targets
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {targetsLoading ? (
            <div>Loading targets...</div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-8">
              <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No targets found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedBuyerId ? "No targets for the selected buyer" : "Create your first target to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Concurrency</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTargets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell>{target.buyerName}</TableCell>
                    <TableCell>{getTypeBadge(target.type)}</TableCell>
                    <TableCell className="font-mono text-sm">{target.destination}</TableCell>
                    <TableCell>${parseFloat(target.rate || "0").toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(target.status)}</TableCell>
                    <TableCell>
                      {target.enableMaxConcurrency ? target.maxConcurrency : "Unlimited"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(target)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(target)}
                          disabled={deleteTargetMutation.isPending}
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
    </div>
  );
}