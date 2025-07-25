import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBuyerSchema, type Buyer, type InsertBuyer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Edit2, Plus, Phone, Mail, Globe, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

function BuyerCard({ buyer, onEdit, onDelete }: { 
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

  const getPriorityColor = (priority: number | null) => {
    if (!priority || priority <= 2) return 'bg-red-100 text-red-800';
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
              {buyer.status || 'Unknown'}
            </Badge>
            <Badge className={getPriorityColor(buyer.priority)}>
              Priority {buyer.priority || 1}
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {buyer.email || 'No email'}
          </span>
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {buyer.phoneNumber || 'No phone'}
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

  // Reset form when buyer data changes (for editing)
  useEffect(() => {
    if (buyer && open) {
      form.reset({
        name: buyer.name || "",
        email: buyer.email || "",
        phoneNumber: buyer.phoneNumber || "",
        endpoint: buyer.endpoint || "",
        status: buyer.status || "active",
        priority: buyer.priority || 1,
        dailyCap: buyer.dailyCap || 50,
        concurrencyLimit: buyer.concurrencyLimit || 3,
        acceptanceRate: buyer.acceptanceRate || "0.00",
        avgResponseTime: buyer.avgResponseTime || 0,
      });
    } else if (!buyer && open) {
      // Reset to empty form for new buyer
      form.reset({
        name: "",
        email: "",
        phoneNumber: "",
        endpoint: "",
        status: "active",
        priority: 1,
        dailyCap: 50,
        concurrencyLimit: 3,
        acceptanceRate: "0.00",
        avgResponseTime: 0,
      });
    }
  }, [buyer, open, form]);

  const createBuyerMutation = useMutation({
    mutationFn: async (data: InsertBuyer) => {
      console.log("Creating buyer with data:", data);
      const response = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      console.log("Response status:", response.status);
      if (!response.ok) {
        const error = await response.json();
        console.error("Error response:", error);
        throw new Error(error.message || "Failed to create buyer");
      }
      const result = await response.json();
      console.log("Success response:", result);
      return result;
    },
    onSuccess: () => {
      // Invalidate all buyer-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      // Invalidate campaign buyer queries to update buyer info in campaigns
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/buyers') || key?.includes('/campaigns');
        }
      });
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
      // Invalidate all buyer-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      // Invalidate campaign buyer queries to update buyer info in campaigns
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/buyers') || key?.includes('/campaigns');
        }
      });
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
    console.log("Submitting buyer data:", data);
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
                    <div className="flex items-center gap-2">
                      <FormLabel>Buyer Name <span className="text-red-500">*</span></FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Name of the buyer or lead partner<br/>
                              This appears in call routing decisions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                    <Select onValueChange={field.onChange} value={field.value || "active"}>
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
                      <Input 
                        type="email" 
                        placeholder="buyer@example.com"
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
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
                    <div className="flex items-center gap-2">
                      <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Phone number where calls will be routed<br/>
                              Include country code for international numbers</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="+1234567890"
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
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
                    <Input {...field} value={field.value || ""} placeholder="https://api.buyer.com/webhook" />
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
                    <div className="flex items-center gap-2">
                      <FormLabel>Priority (1-10)</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Call routing priority (1=lowest, 10=highest)<br/>
                              Higher priority buyers receive calls first</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1" 
                        max="10"
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : parseInt(value) || 1);
                        }}
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
                    <div className="flex items-center gap-2">
                      <FormLabel>Daily Cap</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Maximum calls per day for this buyer<br/>
                              Prevents over-delivery and manages volume</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1"
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : parseInt(value) || 50);
                        }}
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
                        type="number" 
                        min="1"
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : parseInt(value) || 3);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
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
                        type="number" 
                        min="0"
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : parseInt(value) || 0);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [buyerToDelete, setBuyerToDelete] = useState<number | null>(null);
  const [campaignAssignments, setCampaignAssignments] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: buyers, isLoading } = useQuery({
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
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buyers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      // Clear all campaign-related cache to ensure fresh data
      queryClient.removeQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return (typeof key[0] === "string" && key[0].startsWith("/api/campaigns")) as boolean;
        }
      });
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

  const handleDelete = async (id: number) => {
    setBuyerToDelete(id);
    
    // Fetch campaign assignments for this buyer
    try {
      const response = await fetch(`/api/buyers/${id}/campaigns`);
      if (response.ok) {
        const assignments = await response.json();
        setCampaignAssignments(assignments);
      }
    } catch (error) {
      setCampaignAssignments([]);
    }
    
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (buyerToDelete) {
      deleteBuyerMutation.mutate(buyerToDelete);
      setDeleteDialogOpen(false);
      setBuyerToDelete(null);
    }
  };

  const handleCreate = () => {
    setEditingBuyer(undefined);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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

      {buyers && Array.isArray(buyers) && buyers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(buyers as Buyer[]).map((buyer: Buyer) => (
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>This will permanently delete the buyer and remove them from all campaigns. This action cannot be undone.</p>
                
                {campaignAssignments.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      ⚠️ This buyer is assigned to {campaignAssignments.length} campaign(s):
                    </div>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      {campaignAssignments.map((assignment, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="font-medium">{assignment.campaignName}</span>
                          {assignment.isActive && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                              Active
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
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