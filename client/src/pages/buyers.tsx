import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBuyerSchema, type Buyer, type InsertBuyer } from "@shared/schema";
import { Trash2, Edit2, Plus, Building2 } from "lucide-react";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function BuyerRow({ buyer, onEdit, onDelete }: { 
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

  const getBuyerTypeColor = (type: string | null) => {
    switch (type) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'rtb_enabled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{buyer?.companyName || buyer?.name}</span>
          <span className="text-sm text-gray-500">ID: {buyer?.id}</span>
          {buyer?.name && buyer?.companyName && (
            <span className="text-xs text-gray-400">Sub ID: {buyer?.name}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500">
            {buyer?.restrictDuplicates ? 'Restrict Duplicates' : 'Do Not Restrict'}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge className={getStatusColor(buyer?.status)}>
            {buyer?.status || 'active'}
          </Badge>
          <Badge className={getBuyerTypeColor(buyer?.buyerType)}>
            {buyer?.buyerType === 'rtb_enabled' ? 'RTB' : buyer?.buyerType?.charAt(0).toUpperCase() + buyer?.buyerType?.slice(1) || 'Standard'}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => onEdit(buyer)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(buyer.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
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

  const form = useForm({
    resolver: zodResolver(insertBuyerSchema),
    defaultValues: {
      companyName: buyer?.companyName || "", // Company Name is the primary field
      name: buyer?.name || "", // Sub ID field  
      allowPauseTargets: buyer?.allowPauseTargets || false,
      allowSetTargetCaps: buyer?.allowSetTargetCaps || false,
      allowDisputeConversions: buyer?.allowDisputeConversions || false,
      enableRevenueRecovery: buyer?.enableRevenueRecovery || false, // Limit Revenue
      restrictDuplicates: buyer?.restrictDuplicates || false, // Do Not Restrict by default
      duplicateTimeWindow: buyer?.duplicateTimeWindow || 3600,
      enablePredictiveRouting: buyer?.enablePredictiveRouting || false,
      estimatedRevenuePerCall: buyer?.estimatedRevenuePerCall || 50, // Priority Queue default
      shareableTags: buyer?.shareableTags || [],
      status: buyer?.status || "active" as const,
    },
  });

  const createBuyerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    mutationFn: async (data: any) => {
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

  const onSubmit = (data: any) => {
    if (buyer) {
      updateBuyerMutation.mutate(data);
    } else {
      createBuyerMutation.mutate(data);
    }
  };

  const timeZones = [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "Europe/London",
    "Europe/Paris", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-4 w-4" />
            {buyer ? "Edit Buyer" : "Create New Buyer"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Configure comprehensive buyer settings matching Ringba's platform standards.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Single form matching Ringba's exact layout */}
            <div className="space-y-6">

              {/* Company Name - Primary field like Ringba */}
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Company Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Enter company name" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sub ID field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Sub ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter Sub ID" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Permissions Section - Matching Ringba exactly */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="allowPauseTargets"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Allow Buyer To Pause Targets</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowSetTargetCaps"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Allow Buyer To Set Target Caps</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowDisputeConversions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Allow Buyer To Dispute Call Conversions</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enableRevenueRecovery"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Limit Revenue</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Restrict Duplicates Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="restrictDuplicates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Restrict Duplicates</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value === "restrict")} value={field.value ? "restrict" : "doNotRestrict"}>
                          <SelectTrigger className="w-48 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="doNotRestrict" className="text-sm">Do Not Restrict</SelectItem>
                            <SelectItem value="restrict" className="text-sm">Restrict</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Predictive Routing Settings */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="enablePredictiveRouting"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Predictive Routing Settings</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange(value === "enabled")} value={field.value ? "enabled" : "disabled"}>
                          <SelectTrigger className="w-64 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="disabled" className="text-sm">Use Campaign Setting</SelectItem>
                            <SelectItem value="enabled" className="text-sm">Use Estimated Revenue</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Priority Queue Slider */}
                <FormField
                  control={form.control}
                  name="estimatedRevenuePerCall"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm">Priority Queue</FormLabel>
                        <span className="text-xs text-gray-500">100</span>
                      </div>
                      <FormControl>
                        <div className="px-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={field.value || 50}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #10b981 0%, #10b981 ${field.value || 50}%, #e5e7eb ${field.value || 50}%, #e5e7eb 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0</span>
                            <span>50</span>
                            <span>100</span>
                          </div>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Shareable Tags Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="shareableTags"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm">Shareable Tags</FormLabel>
                      <FormControl>
                        <Switch 
                          checked={(field.value && field.value.length > 0) || false} 
                          onCheckedChange={(checked) => field.onChange(checked ? ["enabled"] : [])} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shareableTags"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm pl-6">Override Shareable Tags</FormLabel>
                      <FormControl>
                        <Switch 
                          checked={(field.value && field.value.includes("override")) || false}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current.filter(tag => tag !== "override"), "override"]);
                            } else {
                              field.onChange(current.filter(tag => tag !== "override"));
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-sm">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBuyerMutation.isPending || updateBuyerMutation.isPending}
                className="text-sm"
              >
                {createBuyerMutation.isPending || updateBuyerMutation.isPending ? "Saving..." : buyer ? "Update Buyer" : "Create Buyer"}
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | undefined>();
  const [buyerToDelete, setBuyerToDelete] = useState<number | null>(null);
  const [campaignAssignments, setCampaignAssignments] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: buyers, isLoading } = useQuery({
    queryKey: ["/api/buyers"],
    queryFn: async () => {
      const response = await fetch("/api/buyers");
      if (!response.ok) {
        throw new Error("Failed to fetch buyers");
      }
      return response.json();
    },
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
      // DELETE requests with 204 status have no content to parse
      return { success: true };
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

  const handleDelete = async (id: number) => {
    setBuyerToDelete(id);
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
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Buyer Management</h1>
              <p className="text-muted-foreground">Complete Ringba-style buyer configuration</p>
            </div>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Buyer
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Buyers</CardTitle>
              <CardDescription>Loading buyer data...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
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
            <p className="text-muted-foreground">Complete Ringba-style buyer configuration with all standard fields</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Buyer
          </Button>
        </div>

        {buyers && Array.isArray(buyers) && buyers.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Buyers</CardTitle>
              <CardDescription>Comprehensive buyer management with Ringba-standard fields</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company & Sub ID</TableHead>
                    <TableHead>Settings</TableHead>
                    <TableHead>Status & Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(buyers as Buyer[]).map((buyer: Buyer) => (
                    <BuyerRow
                      key={buyer.id}
                      buyer={buyer}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
              <AlertDialogDescription>
                This will permanently delete the buyer and remove them from all campaigns. This action cannot be undone.
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