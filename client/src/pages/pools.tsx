import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Trash2, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNumberPoolSchema, type NumberPool } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface PoolFormData {
  name: string;
  country: string;
  numberType: "local" | "toll-free";
  poolSize: number;
  closedBrowserDelay: number;
  idleLimit: number;
  prefix?: string;
}

export default function PoolsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pools = [], isLoading } = useQuery<NumberPool[]>({
    queryKey: ["/api/number-pools"],
  });

  const createPoolMutation = useMutation({
    mutationFn: (data: PoolFormData) => apiRequest("/api/number-pools", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Number pool created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create number pool",
        variant: "destructive",
      });
    },
  });

  const deletePoolMutation = useMutation({
    mutationFn: (poolId: number) => apiRequest(`/api/number-pools/${poolId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools"] });
      toast({
        title: "Success",
        description: "Number pool deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete number pool",
        variant: "destructive",
      });
    },
  });

  const form = useForm<PoolFormData>({
    resolver: zodResolver(insertNumberPoolSchema),
    defaultValues: {
      name: "",
      country: "US",
      numberType: "local",
      poolSize: 5,
      closedBrowserDelay: 30,
      idleLimit: 300,
      prefix: "",
    },
  });

  const onSubmit = (data: PoolFormData) => {
    createPoolMutation.mutate(data);
  };

  const handleDeletePool = (poolId: number) => {
    if (confirm("Are you sure you want to delete this pool? This action cannot be undone.")) {
      deletePoolMutation.mutate(poolId);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading pools...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Number Pools</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Organize your phone numbers into pools for intelligent call routing
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Pool
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Number Pool</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pool Name</FormLabel>
                        <FormControl>
                          <Input placeholder="California Local Numbers" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                              <SelectItem value="GB">United Kingdom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectItem value="toll-free">Toll Free</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="poolSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pool Size</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
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
                          <FormLabel>Closed Browser Delay (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="30" 
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
                      name="idleLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Idle Limit (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="300" 
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
                    name="prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prefix (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="555" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                      disabled={createPoolMutation.isPending}
                    >
                      {createPoolMutation.isPending ? "Creating..." : "Create Pool"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {pools.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No number pools</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Create your first number pool to organize phone numbers for call routing
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Pool
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pools.map((pool: NumberPool) => (
              <Card key={pool.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pool.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // TODO: Open pool management dialog
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePool(pool.id)}
                        disabled={deletePoolMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {pool.country} • {pool.numberType === "toll-free" ? "Toll Free" : "Local"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pool Size</span>
                      <Badge variant="secondary">{pool.poolSize} numbers</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Browser Delay</span>
                      <span className="text-sm">{pool.closedBrowserDelay}s</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Idle Limit</span>
                      <span className="text-sm">{pool.idleLimit}s</span>
                    </div>

                    {pool.prefix && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Prefix</span>
                        <span className="text-sm font-mono">{pool.prefix}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                      <Badge variant={pool.isActive ? "default" : "secondary"}>
                        {pool.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}