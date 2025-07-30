import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Phone, Globe, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Target, Buyer } from "@shared/schema";

// Form schema for target creation/editing
const targetFormSchema = z.object({
  name: z.string().min(1, "Target name is required"),
  buyerId: z.number().min(1, "Buyer selection is required"),
  phoneNumber: z.string().optional(),
  endpoint: z.string().url("Invalid endpoint URL").optional().or(z.literal("")),
  priority: z.number().min(1).max(10).optional(),
  dailyCap: z.number().min(0).optional(),
  concurrencyLimit: z.number().min(1).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

type TargetFormData = z.infer<typeof targetFormSchema>;

export default function TargetsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const { toast } = useToast();

  // Fetch targets
  const { data: targets = [], isLoading: targetsLoading } = useQuery<Target[]>({
    queryKey: ["/api/targets"],
  });

  // Fetch buyers for the dropdown
  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  // Create target mutation
  const createTargetMutation = useMutation({
    mutationFn: (data: TargetFormData) => apiRequest("/api/targets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Target created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create target", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update target mutation
  const updateTargetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TargetFormData> }) =>
      apiRequest(`/api/targets/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      setEditingTarget(null);
      toast({ title: "Target updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update target", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete target mutation
  const deleteTargetMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/targets/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({ title: "Target deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete target", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Form for creating/editing targets
  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      name: "",
      buyerId: 0,
      phoneNumber: "",
      endpoint: "",
      priority: 1,
      dailyCap: 100,
      concurrencyLimit: 1,
      status: "active",
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
      name: target.name,
      buyerId: target.buyerId,
      phoneNumber: target.phoneNumber || "",
      endpoint: target.endpoint || "",
      priority: target.priority,
      dailyCap: target.dailyCap,
      concurrencyLimit: target.concurrencyLimit,
      status: target.status as "active" | "inactive" | "suspended",
    });
  };

  const getBuyerName = (buyerId: number) => {
    const buyer = buyers.find(b => b.id === buyerId);
    return buyer ? buyer.name : `Buyer ${buyerId}`;
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
    return <div className="p-6">Loading targets...</div>;
  }

  return (
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTarget ? "Edit Target" : "Create New Target"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Endpoint, Agent Smith" {...field} />
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
                        <FormLabel>Buyer</FormLabel>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endpoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Endpoint</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com/webhook" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="10"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dailyCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Cap</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="concurrencyLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Concurrency</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
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
                    {editingTarget ? "Update Target" : "Create Target"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {targets.map((target) => (
          <Card key={target.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{target.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {getBuyerName(target.buyerId)}
                  </p>
                </div>
                <Badge className={getStatusColor(target.status)}>
                  {target.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {target.phoneNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{target.phoneNumber}</span>
                </div>
              )}
              
              {target.endpoint && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{target.endpoint}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Priority:</span>
                  <span className="ml-1 font-medium">{target.priority}</span>
                </div>
                <div>
                  <span className="text-gray-500">Daily Cap:</span>
                  <span className="ml-1 font-medium">{target.dailyCap}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(target)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTargetMutation.mutate(target.id)}
                  disabled={deleteTargetMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {targets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No targets yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first target to start routing calls to specific endpoints
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Target
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}