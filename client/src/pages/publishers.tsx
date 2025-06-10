import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, DollarSign, Target, Settings, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";

const publisherSchema = z.object({
  name: z.string().min(1, "Publisher name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  status: z.enum(["active", "paused", "suspended"]),
  payoutType: z.enum(["per_call", "per_minute", "revenue_share"]),
  payoutAmount: z.string().min(1, "Payout amount is required"),
  minCallDuration: z.string().default("0"),
  allowedTargets: z.string().optional(),
  trackingSettings: z.string().optional(),
});

type PublisherFormData = z.infer<typeof publisherSchema>;

interface Publisher {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  payoutType: string;
  payoutAmount: string;
  minCallDuration: number;
  allowedTargets?: string[];
  trackingSettings?: string;
  totalCalls: number;
  totalPayout: string;
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
}

export default function Publishers() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch publishers
  const { data: publishers = [], isLoading } = useQuery<Publisher[]>({
    queryKey: ["/api/publishers"],
  });

  // Fetch campaigns for assignment
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  // Create publisher mutation
  const createPublisher = useMutation({
    mutationFn: (data: PublisherFormData) => apiRequest("POST", "/api/publishers", {
      ...data,
      payoutAmount: parseFloat(data.payoutAmount),
      minCallDuration: parseInt(data.minCallDuration),
      allowedTargets: data.allowedTargets ? data.allowedTargets.split(",").map(t => t.trim()) : [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publishers"] });
      setIsCreateOpen(false);
      toast({ title: "Publisher created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create publisher", variant: "destructive" });
    },
  });

  // Update publisher mutation
  const updatePublisher = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PublisherFormData }) => 
      apiRequest("PUT", `/api/publishers/${id}`, {
        ...data,
        payoutAmount: parseFloat(data.payoutAmount),
        minCallDuration: parseInt(data.minCallDuration),
        allowedTargets: data.allowedTargets ? data.allowedTargets.split(",").map(t => t.trim()) : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publishers"] });
      setEditingPublisher(null);
      toast({ title: "Publisher updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update publisher", variant: "destructive" });
    },
  });

  // Delete publisher mutation
  const deletePublisher = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/publishers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/publishers"] });
      toast({ title: "Publisher deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete publisher", variant: "destructive" });
    },
  });

  const form = useForm<PublisherFormData>({
    resolver: zodResolver(publisherSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "active",
      payoutType: "per_call",
      payoutAmount: "0.00",
      minCallDuration: "0",
      allowedTargets: "",
      trackingSettings: "",
    },
  });

  const onSubmit = (data: PublisherFormData) => {
    if (editingPublisher) {
      updatePublisher.mutate({ id: editingPublisher.id, data });
    } else {
      createPublisher.mutate(data);
    }
  };

  const handleEdit = (publisher: Publisher) => {
    setEditingPublisher(publisher);
    form.reset({
      name: publisher.name,
      email: publisher.email,
      phone: publisher.phone || "",
      status: publisher.status as any,
      payoutType: publisher.payoutType as any,
      payoutAmount: publisher.payoutAmount,
      minCallDuration: publisher.minCallDuration.toString(),
      allowedTargets: publisher.allowedTargets?.join(", ") || "",
      trackingSettings: publisher.trackingSettings || "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this publisher?")) {
      deletePublisher.mutate(id);
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

  const getPayoutTypeLabel = (type: string) => {
    switch (type) {
      case "per_call": return "Per Call";
      case "per_minute": return "Per Minute";
      case "revenue_share": return "Revenue Share";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">Loading publishers...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Publishers</h1>
            <p className="text-muted-foreground">Manage traffic sources and affiliate partners</p>
          </div>
          <Dialog open={isCreateOpen || !!editingPublisher} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingPublisher(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Publisher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPublisher ? "Edit Publisher" : "Create New Publisher"}
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
                          <Input placeholder="+1-555-0123" {...field} />
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
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Payout Rules
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="payoutType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payout Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Target className="mr-2 h-4 w-4" />
                    Allowed Targets
                  </h3>
                  <FormField
                    control={form.control}
                    name="allowedTargets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign IDs (comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="1, 2, 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Tracking Settings
                  </h3>
                  <FormField
                    control={form.control}
                    name="trackingSettings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Parameters (JSON)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder='{"utm_source": "example", "custom_param": "value"}'
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateOpen(false);
                    setEditingPublisher(null);
                    form.reset();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPublisher.isPending || updatePublisher.isPending}>
                    {editingPublisher ? "Update" : "Create"} Publisher
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>

      <div className="grid gap-6">
        {publishers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No publishers found. Create your first publisher to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          publishers.map((publisher) => (
            <Card key={publisher.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {publisher.name}
                      <Badge className={getStatusColor(publisher.status)}>
                        {publisher.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{publisher.email}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(publisher)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Publisher</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{publisher.name}"? This action cannot be undone and will remove all associated campaign relationships.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deletePublisher.mutate(publisher.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payout</p>
                    <p className="text-lg font-semibold">
                      ${publisher.payoutAmount} {getPayoutTypeLabel(publisher.payoutType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <p className="text-lg font-semibold">{publisher.totalCalls}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Payout</p>
                    <p className="text-lg font-semibold">${publisher.totalPayout}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Min Duration</p>
                    <p className="text-lg font-semibold">{publisher.minCallDuration}s</p>
                  </div>
                </div>
                
                {publisher.allowedTargets && publisher.allowedTargets.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Allowed Targets</p>
                    <div className="flex flex-wrap gap-1">
                      {publisher.allowedTargets.map((target, idx) => (
                        <Badge key={idx} variant="secondary">Campaign {target}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {publisher.trackingSettings && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Tracking Settings</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {publisher.trackingSettings}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </Layout>
  );
}