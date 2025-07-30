import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Phone, Globe, Edit, Trash2, Settings, Target as TargetIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { insertTargetSchema } from "@shared/schema";
import type { Target, Buyer } from "@shared/schema";

export default function Targets() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  // Fetch targets
  const { data: targets = [], isLoading: targetsLoading } = useQuery<Target[]>({
    queryKey: ['/api/targets'],
  });

  // Fetch buyers for dropdown
  const { data: buyers = [], isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ['/api/buyers'],
  });

  // Form setup with timezone and hours of operation in Basic tab
  const form = useForm<z.infer<typeof insertTargetSchema>>({
    resolver: zodResolver(insertTargetSchema),
    defaultValues: {
      userId: 2, // Add userId to defaults
      name: "",
      buyerId: 0,
      phoneNumber: "",
      endpoint: "",
      timeZone: "EST",
      hoursOfOperation: "Always Open",
      status: "active",
    },
  });

  // Mutations
  const createTargetMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/targets', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      form.reset();
      setIsCreateDialogOpen(false);
      toast({ title: "Target created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create target", variant: "destructive" });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/targets/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      form.reset();
      setEditingTarget(null);
      toast({ title: "Target updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update target", variant: "destructive" });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/targets/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/targets'] });
      toast({ title: "Target deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete target", variant: "destructive" });
    },
  });

  // Event handlers
  const onSubmit = (data: z.infer<typeof insertTargetSchema>) => {
    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, ...data });
    } else {
      createTargetMutation.mutate(data);
    }
  };

  const handleEdit = (target: Target) => {
    setEditingTarget(target);
    form.reset({
      name: target.name || "",
      buyerId: target.buyerId || 0,
      phoneNumber: target.phoneNumber || "",
      endpoint: target.endpoint || "",
      timeZone: target.timeZone || "EST",
      hoursOfOperation: target.hoursOfOperation || "Always Open",
      status: target.status || "active",
    });
  };

  const getBuyerName = (buyerId: number) => {
    const buyer = buyers.find((b: any) => b.id === buyerId);
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
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
                              <TargetIcon className="h-4 w-4" />
                              Basic Information
                            </CardTitle>
                            <CardDescription>
                              Configure the target name, buyer assignment, and destination endpoint
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Target Name & Buyer */}
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Target Name <span className="text-red-500">*</span></FormLabel>
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
                                    <FormLabel>Buyer <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select buyer" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {buyers.map((buyer: any) => (
                                          <SelectItem key={buyer.id} value={buyer.id.toString()}>
                                            {buyer.companyName || buyer.name || `Buyer ${buyer.id}`}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Type & Destination */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <Select defaultValue="Number">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Number">Number</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Destination <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                      <Input placeholder="Phone number or endpoint" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Connection Timeout & Disable Recording */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Connection Timeout (seconds)</label>
                                <Input type="number" defaultValue="30" />
                                <p className="text-xs text-gray-500">Maximum time to wait for connection (1-300 seconds)</p>
                              </div>
                              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <label className="text-sm font-medium">Disable Recording</label>
                                  <p className="text-xs text-gray-500">Turn off call recording for this target</p>
                                </div>
                                <Switch />
                              </div>
                            </div>

                            {/* TIMEZONE AND HOURS OF OPERATION FIELDS - HIGHLY VISIBLE */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                              <FormField
                                control={form.control}
                                name="timeZone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-lg font-semibold text-blue-800">Time Zone <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="border-2 border-blue-300">
                                          <SelectValue placeholder="Select Timezone" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                                        <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                                        <SelectItem value="CST">Central Time (CST)</SelectItem>
                                        <SelectItem value="MST">Mountain Time (MST)</SelectItem>
                                        <SelectItem value="UTC">UTC</SelectItem>
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
                                    <FormLabel className="text-lg font-semibold text-blue-800">Hours of Operation <span className="text-red-500">*</span></FormLabel>
                                    <div className="flex items-center space-x-2 border-2 border-blue-300 rounded p-2">
                                      <Switch
                                        checked={field.value === "Always Open"}
                                        onCheckedChange={(checked) => field.onChange(checked ? "Always Open" : "Business Hours")}
                                      />
                                      <span className="text-sm font-medium">{field.value || "Always Open"}</span>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>


                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Other tabs with placeholder content */}
                      <TabsContent value="caps" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Cap Settings
                            </CardTitle>
                            <CardDescription>
                              Configure call capacity limits and concurrency controls
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p>Cap settings coming soon...</p>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="concurrency" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Concurrency Settings</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p>Concurrency settings coming soon...</p>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="routing" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Routing Settings</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p>Routing settings coming soon...</p>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="tags" className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Tags Settings</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p>Tags settings coming soon...</p>
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
                        {editingTarget ? "Update Target" : "Create Target"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TooltipProvider>
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
                <TableHead>Time Zone</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No targets found. Create your first target to get started.
                  </TableCell>
                </TableRow>
              ) : (
                targets.map((target: any) => (
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
                      <span className="text-sm">{target.timeZone || "EST"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{target.hoursOfOperation || "Always Open"}</span>
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