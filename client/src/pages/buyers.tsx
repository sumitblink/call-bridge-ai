import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBuyerSchema, type Buyer, type InsertBuyer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Edit2, Plus, Phone, Mail, Globe, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function BuyerCard({ buyer, onEdit, onDelete }: { 
  buyer: Buyer; 
  onEdit: (buyer: Buyer) => void;
  onDelete: (id: number) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-100 text-red-800';
    if (priority <= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{buyer.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(buyer.status)}>
              {buyer.status}
            </Badge>
            <Badge className={getPriorityColor(buyer.priority)}>
              Priority {buyer.priority}
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {buyer.email}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {buyer.phoneNumber}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Daily Cap:</span>
            <div className="text-lg font-semibold">{buyer.dailyCap}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Concurrency:</span>
            <div className="text-lg font-semibold">{buyer.concurrencyLimit}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Acceptance Rate:</span>
            <div className="text-lg font-semibold flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {buyer.acceptanceRate}%
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Response Time:</span>
            <div className="text-lg font-semibold">{buyer.avgResponseTime}ms</div>
          </div>
        </div>
        
        {buyer.endpoint && (
          <div className="mt-4 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Webhook Endpoint
            </span>
            <div className="text-xs font-mono text-gray-800 truncate">{buyer.endpoint}</div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onEdit(buyer)}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(buyer.id)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BuyerForm({ 
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

  const form = useForm<InsertBuyer>({
    resolver: zodResolver(insertBuyerSchema),
    defaultValues: {
      name: buyer?.name || "",
      email: buyer?.email || "",
      phoneNumber: buyer?.phoneNumber || "",
      endpoint: buyer?.endpoint || "",
      status: buyer?.status || "active",
      priority: buyer?.priority || 1,
      dailyCap: buyer?.dailyCap || 50,
      concurrencyLimit: buyer?.concurrencyLimit || 3,
      acceptanceRate: buyer?.acceptanceRate || "0.00",
      avgResponseTime: buyer?.avgResponseTime || 0,
    },
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (data: InsertBuyer) => {
      const response = await apiRequest("/api/buyers", {
        method: "POST",
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
    mutationFn: async (data: InsertBuyer) => {
      const response = await apiRequest(`/api/buyers/${buyer!.id}`, {
        method: "PATCH",
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

  const onSubmit = (data: InsertBuyer) => {
    if (buyer) {
      updateBuyerMutation.mutate(data);
    } else {
      createBuyerMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{buyer ? "Edit Buyer" : "Create New Buyer"}</DialogTitle>
          <DialogDescription>
            Configure buyer details and routing preferences
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buyer Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter buyer name" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="buyer@example.com" />
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
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1234567890" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook Endpoint (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://api.buyer.com/webhook" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1" 
                        max="10"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        {...field} 
                        type="number" 
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="concurrencyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concurrency Limit</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="avgResponseTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avg Response Time (ms)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
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
                {buyer ? "Update Buyer" : "Create Buyer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Buyers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: buyers, isLoading } = useQuery({
    queryKey: ["/api/buyers"],
  });

  const deleteBuyerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/buyers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete buyer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      toast({ title: "Success", description: "Buyer deleted successfully" });
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
    if (confirm("Are you sure you want to delete this buyer?")) {
      deleteBuyerMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setEditingBuyer(undefined);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyer Management</h1>
          <p className="text-muted-foreground">Manage your call buyers and routing preferences</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Buyer
        </Button>
      </div>

      {buyers && buyers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buyers.map((buyer: Buyer) => (
            <BuyerCard
              key={buyer.id}
              buyer={buyer}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No buyers found</div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Buyer
          </Button>
        </div>
      )}

      <BuyerForm
        buyer={editingBuyer}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}