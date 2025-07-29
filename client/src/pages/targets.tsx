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
    queryFn: () => apiRequest('/api/targets') as Promise<Target[]>,
  });

  // Fetch buyers for the select dropdown
  const { data: buyers = [] } = useQuery({
    queryKey: ['/api/buyers'],
    queryFn: () => apiRequest('/api/buyers') as Promise<Buyer[]>,
  });

  // Enhanced targets with buyer names
  const enhancedTargets: EnhancedTarget[] = targets.map(target => ({
    ...target,
    buyerName: buyers.find(b => b.id === target.buyerId)?.name || 'Unknown Buyer'
  }));

  // Filter targets by selected buyer
  const filteredTargets = selectedBuyerId 
    ? enhancedTargets.filter(t => t.buyerId === selectedBuyerId)
    : enhancedTargets;

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      name: "",
      type: "call",
      destination: "",
      status: "active",
      rate: 0,
      estimatedRevenue: 0,
      useEstimatedRevenue: false,
      timeZone: "UTC",
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
    mutationFn: (data: TargetFormData) =>
      apiRequest('/api/targets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<TargetFormData> }) =>
      apiRequest(`/api/targets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
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
    mutationFn: (id: number) =>
      apiRequest(`/api/targets/${id}`, {
        method: 'DELETE',
      }),
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
    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, data });
    } else {
      createTargetMutation.mutate(data);
    }
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    form.reset({
      ...target,
      rate: parseFloat(target.rate || "0"),
      estimatedRevenue: parseFloat(target.estimatedRevenue || "0"),
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="buyerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyer</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select buyer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Target name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="conversion">Conversion</SelectItem>
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
                        <FormLabel>Destination</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Phone number or endpoint" />
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || 0}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Advanced Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxConcurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Concurrency</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                              value={field.value || 5}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityBump"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority Bump (-10 to +10)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="-10" 
                              max="10" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="enableMaxConcurrency"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Enable Max Concurrency</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enablePredictiveRouting"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel>Enable Predictive Routing</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
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