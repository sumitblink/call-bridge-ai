import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Settings, Phone, BarChart3, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { NumberPool, PhoneNumber } from "@shared/schema";
import NumberPoolManager from "@/components/NumberPoolManager";

// Schema for pool form
const poolFormSchema = z.object({
  name: z.string().min(1, "Pool name is required"),
  poolSize: z.number().min(1, "Pool size must be at least 1"),
  country: z.string().optional(),
  numberType: z.enum(['local', 'toll-free']).optional(),
  prefix: z.string().optional(),
  closedBrowserDelay: z.number().optional(),
  idleLimit: z.number().optional(),
  isActive: z.boolean().default(true),
});

type PoolFormData = z.infer<typeof poolFormSchema>;

function PoolCard({ pool, onEdit, onDelete, onManageNumbers }: {
  pool: NumberPool;
  onEdit: (pool: NumberPool) => void;
  onDelete: (pool: NumberPool) => void;
  onManageNumbers: (pool: NumberPool) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Badge 
                variant={pool.isActive ? 'default' : 'secondary'}
                className={pool.isActive ? 'bg-green-100 text-green-800' : ''}
              >
                {pool.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <h3 className="text-lg font-semibold">{pool.name}</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-500 mb-1">Pool Size</p>
                <p className="font-bold text-lg">{pool.poolSize}</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 mb-1">Type</p>
                <p className="font-bold">{pool.numberType || 'Mixed'}</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 mb-1">Country</p>
                <p className="font-bold">{pool.country || 'US'}</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 mb-1">Prefix</p>
                <p className="font-bold">{pool.prefix || 'Any'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageNumbers(pool)}
            >
              <Phone className="h-4 w-4 mr-1" />
              Numbers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(pool)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(pool)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PoolForm({ pool, onSuccess }: { 
  pool?: NumberPool; 
  onSuccess: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PoolFormData>({
    resolver: zodResolver(poolFormSchema),
    defaultValues: {
      name: pool?.name || "",
      poolSize: pool?.poolSize || 10,
      country: pool?.country || "US",
      numberType: (pool?.numberType as 'local' | 'toll-free') || 'local',
      prefix: pool?.prefix || "",
      closedBrowserDelay: pool?.closedBrowserDelay || 0,
      idleLimit: pool?.idleLimit || 0,
      isActive: pool?.isActive !== false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PoolFormData) => {
      const url = pool ? `/api/number-pools/${pool.id}` : "/api/number-pools";
      const method = pool ? "PUT" : "POST";
      
      const response = await apiRequest(url, method, data);
      if (!response.ok) {
        throw new Error(`Failed to ${pool ? 'update' : 'create'} pool`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools"] });
      toast({
        title: "Success",
        description: `Pool ${pool ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PoolFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pool Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter pool name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="poolSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pool Size</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="10" 
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="numberType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="toll-free">Toll-Free</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="US" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prefix (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., +1800" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="closedBrowserDelay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Closed Browser Delay (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
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
            name="idleLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idle Limit (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : pool ? "Update Pool" : "Create Pool"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function NumberPools() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<NumberPool | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poolToDelete, setPoolToDelete] = useState<NumberPool | null>(null);
  const [managingPool, setManagingPool] = useState<NumberPool | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pools, isLoading, error } = useQuery<NumberPool[]>({
    queryKey: ["/api/number-pools"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/number-pools/${id}`, "DELETE");
      if (!response.ok) {
        throw new Error("Failed to delete pool");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools"] });
      toast({
        title: "Success",
        description: "Pool deleted successfully",
      });
      setDeleteDialogOpen(false);
      setPoolToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (pool: NumberPool) => {
    setEditingPool(pool);
    setIsDialogOpen(true);
  };

  const handleDelete = (pool: NumberPool) => {
    setPoolToDelete(pool);
    setDeleteDialogOpen(true);
  };

  const handleManageNumbers = (pool: NumberPool) => {
    setManagingPool(pool);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPool(null);
  };

  if (error) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Error loading pools</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "Failed to load pools"}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/number-pools"] })}>
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Number Pools</h1>
            <p className="text-muted-foreground">
              Manage phone number pools for dynamic number insertion and call routing.
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Pool
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pools?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active number pools
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Numbers</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pools?.reduce((sum, pool) => sum + (pool.poolSize || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Combined pool capacity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Pools</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pools?.filter(pool => pool.isActive).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pools List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !pools || pools.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pools yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first number pool to enable dynamic number insertion.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Pool
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onManageNumbers={handleManageNumbers}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Pool Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPool ? "Edit Pool" : "Create New Pool"}
              </DialogTitle>
              <DialogDescription>
                {editingPool 
                  ? "Update pool configuration and settings."
                  : "Create a new number pool for dynamic number insertion."
                }
              </DialogDescription>
            </DialogHeader>
            <PoolForm
              pool={editingPool || undefined}
              onSuccess={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Pool</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{poolToDelete?.name}"? This action cannot be undone.
                All numbers in this pool will be unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => poolToDelete && deleteMutation.mutate(poolToDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Number Pool Manager Dialog */}
        {managingPool && (
          <NumberPoolManager
            pool={managingPool}
            isOpen={!!managingPool}
            onClose={() => setManagingPool(null)}
          />
        )}
      </div>
    </Layout>
  );
}