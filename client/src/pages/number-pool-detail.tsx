import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Settings, Phone, Plus, Edit2, Trash2, BarChart3, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { NumberPool } from "@shared/schema";

export default function NumberPoolDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditPoolDialogOpen, setIsEditPoolDialogOpen] = useState(false);
  const [isAddNumberDialogOpen, setIsAddNumberDialogOpen] = useState(false);

  // Fetch pool details
  const { data: pool, isLoading: poolLoading } = useQuery<NumberPool>({
    queryKey: ["/api/number-pools", id],
    queryFn: async () => {
      const response = await fetch(`/api/number-pools/${id}`);
      if (!response.ok) throw new Error("Failed to fetch pool details");
      return response.json();
    },
  });

  // Fetch pool numbers
  const { data: poolNumbers, isLoading: numbersLoading } = useQuery({
    queryKey: ["/api/number-pools", id, "numbers"],
    queryFn: async () => {
      const response = await fetch(`/api/number-pools/${id}/numbers`);
      if (!response.ok) throw new Error("Failed to fetch pool numbers");
      return response.json();
    },
  });

  // Fetch available numbers for assignment
  const { data: availableNumbers } = useQuery({
    queryKey: ["/api/phone-numbers/available"],
    queryFn: async () => {
      const response = await fetch("/api/phone-numbers/available");
      if (!response.ok) throw new Error("Failed to fetch available numbers");
      return response.json();
    },
  });

  // Update pool mutation
  const updatePoolMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest(`/api/number-pools/${id}`, "PUT", updates);
      if (!response.ok) {
        throw new Error("Failed to update pool");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", id] });
      toast({
        title: "Success",
        description: "Pool updated successfully",
      });
      setIsEditPoolDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign number to pool mutation
  const assignNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await apiRequest(`/api/number-pools/${id}/assign-number`, "POST", {
        phoneNumberId,
        priority: 1,
      });
      if (!response.ok) {
        throw new Error("Failed to assign number to pool");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", id, "numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", id] });
      toast({
        title: "Success",
        description: "Number added to pool",
      });
      setIsAddNumberDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove number from pool mutation
  const removeNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await apiRequest(`/api/number-pools/${id}/numbers/${phoneNumberId}`, "DELETE");
      if (!response.ok) {
        throw new Error("Failed to remove number from pool");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", id, "numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", id] });
      toast({
        title: "Success",
        description: "Number removed from pool",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle number status mutation
  const toggleNumberMutation = useMutation({
    mutationFn: async ({ numberId, isActive }: { numberId: number; isActive: boolean }) => {
      const response = await apiRequest(`/api/phone-numbers/${numberId}`, "PATCH", { isActive });
      if (!response.ok) {
        throw new Error("Failed to update number status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", id, "numbers"] });
      toast({
        title: "Success",
        description: "Number status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateUtilization = () => {
    if (!poolNumbers || poolNumbers.length === 0) return 0;
    const activeCount = poolNumbers.filter((num: any) => num.isActive).length;
    return Math.round((activeCount / poolNumbers.length) * 100);
  };

  if (poolLoading || numbersLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Pool Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested number pool could not be found.</p>
        <Button asChild>
          <Link href="/phone-numbers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Phone Numbers
          </Link>
        </Button>
      </div>
    );
  }

  const utilization = calculateUtilization();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/phone-numbers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{pool.name}</h1>
            <p className="text-muted-foreground">
              {pool.country} • {pool.numberType} • Pool Size: {pool.poolSize}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isEditPoolDialogOpen} onOpenChange={setIsEditPoolDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Edit Pool
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Pool Settings</DialogTitle>
                <DialogDescription>
                  Update the configuration for {pool.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="poolName">Pool Name</Label>
                  <Input
                    id="poolName"
                    defaultValue={pool.name}
                    placeholder="Enter pool name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closedBrowserDelay">Closed Browser Delay (seconds)</Label>
                  <Input
                    id="closedBrowserDelay"
                    type="number"
                    defaultValue={pool.closedBrowserDelay}
                    placeholder="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idleLimit">Idle Limit (seconds)</Label>
                  <Input
                    id="idleLimit"
                    type="number"
                    defaultValue={pool.idleLimit}
                    placeholder="300"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    defaultChecked={pool.isActive}
                  />
                  <Label htmlFor="isActive">Pool Active</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditPoolDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const poolName = (document.getElementById('poolName') as HTMLInputElement).value;
                      const closedBrowserDelay = parseInt((document.getElementById('closedBrowserDelay') as HTMLInputElement).value);
                      const idleLimit = parseInt((document.getElementById('idleLimit') as HTMLInputElement).value);
                      const isActive = (document.getElementById('isActive') as HTMLInputElement).checked;
                      
                      updatePoolMutation.mutate({
                        name: poolName,
                        closedBrowserDelay,
                        idleLimit,
                        isActive,
                      });
                    }}
                    disabled={updatePoolMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pool Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Numbers</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{poolNumbers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available in pool
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Numbers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {poolNumbers?.filter((num: any) => num.isActive).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilization}%</div>
            <Progress value={utilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Status</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              <Badge variant={pool.isActive ? "default" : "secondary"}>
                {pool.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Pool configuration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pool Numbers Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Pool Numbers ({poolNumbers?.length || 0})</CardTitle>
            <CardDescription>
              Manage phone numbers assigned to this pool
            </CardDescription>
          </div>
          <Dialog open={isAddNumberDialogOpen} onOpenChange={setIsAddNumberDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Number
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Number to Pool</DialogTitle>
                <DialogDescription>
                  Select an available phone number to add to this pool
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableNumbers && availableNumbers.length > 0 ? (
                  <div className="space-y-2">
                    {availableNumbers.map((number: any) => (
                      <div key={number.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{number.phoneNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {number.friendlyName || number.country} • {number.numberType}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => assignNumberMutation.mutate(number.id)}
                          disabled={assignNumberMutation.isPending}
                        >
                          Add to Pool
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Available Numbers</h3>
                    <p className="text-muted-foreground mb-4">
                      All your phone numbers are already assigned to campaigns or pools.
                    </p>
                    <Button variant="outline" asChild>
                      <Link href="/phone-numbers">Purchase More Numbers</Link>
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {poolNumbers && poolNumbers.length > 0 ? (
            <div className="space-y-2">
              {poolNumbers.map((number: any) => (
                <div key={number.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{number.phoneNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {number.friendlyName || number.country} • {number.numberType}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={number.isActive ? "default" : "secondary"}>
                      {number.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNumberMutation.mutate({ 
                        numberId: number.id, 
                        isActive: !number.isActive 
                      })}
                      disabled={toggleNumberMutation.isPending}
                    >
                      {number.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove ${number.phoneNumber} from this pool?`)) {
                          removeNumberMutation.mutate(number.id);
                        }
                      }}
                      disabled={removeNumberMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Numbers in Pool</h3>
              <p className="text-muted-foreground mb-4">
                Add phone numbers to this pool to enable dynamic number insertion.
              </p>
              <Button onClick={() => setIsAddNumberDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}