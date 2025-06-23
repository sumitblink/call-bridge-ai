import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, Plus, Trash2, Edit2, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { NumberPool } from "@shared/schema";

interface PoolNumberManagementProps {
  poolId: number;
  pool: NumberPool;
}

export default function PoolNumberManagement({ poolId, pool }: PoolNumberManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddNumberDialogOpen, setIsAddNumberDialogOpen] = useState(false);
  const [isEditNumberDialogOpen, setIsEditNumberDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<any>(null);

  // Fetch available numbers for assignment
  const { data: availableNumbers } = useQuery({
    queryKey: ["/api/phone-numbers/available"],
    queryFn: async () => {
      const response = await fetch("/api/phone-numbers/available");
      if (!response.ok) throw new Error("Failed to fetch available numbers");
      return response.json();
    },
  });

  // Fetch pool numbers
  const { data: poolNumbers, isLoading } = useQuery({
    queryKey: ["/api/number-pools", poolId, "numbers"],
    queryFn: async () => {
      const response = await fetch(`/api/number-pools/${poolId}/numbers`);
      if (!response.ok) throw new Error("Failed to fetch pool numbers");
      return response.json();
    },
  });

  // Mutation to assign number to pool
  const assignNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await apiRequest(`/api/number-pools/${poolId}/assign-number`, "POST", {
        phoneNumberId,
        priority: 1,
      });
      if (!response.ok) {
        throw new Error("Failed to assign number to pool");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", poolId, "numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", poolId] });
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

  // Mutation to remove number from pool
  const removeNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await apiRequest(`/api/number-pools/${poolId}/numbers/${phoneNumberId}`, "DELETE");
      if (!response.ok) {
        throw new Error("Failed to remove number from pool");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", poolId, "numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", poolId] });
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

  // Mutation to update number properties
  const updateNumberMutation = useMutation({
    mutationFn: async ({ numberId, updates }: { numberId: number; updates: any }) => {
      const response = await apiRequest(`/api/phone-numbers/${numberId}`, "PATCH", updates);
      if (!response.ok) {
        throw new Error("Failed to update number");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", poolId, "numbers"] });
      toast({
        title: "Success",
        description: "Number updated",
      });
      setIsEditNumberDialogOpen(false);
      setEditingNumber(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pool Numbers List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Pool Numbers ({poolNumbers?.length || 0})</CardTitle>
            <CardDescription>
              Numbers available in this pool for dynamic assignment
            </CardDescription>
          </div>
          <Dialog open={isAddNumberDialogOpen} onOpenChange={setIsAddNumberDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Number to Pool</DialogTitle>
                <DialogDescription>
                  Select an available phone number to add to this pool
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Available Numbers</h3>
                    <p className="text-muted-foreground mb-4">
                      All your phone numbers are already assigned to campaigns or pools.
                    </p>
                    <Button variant="outline" asChild>
                      <a href="/phone-numbers">Purchase More Numbers</a>
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
                      onClick={() => {
                        setEditingNumber(number);
                        setIsEditNumberDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
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

      {/* Edit Number Dialog */}
      <Dialog open={isEditNumberDialogOpen} onOpenChange={setIsEditNumberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Number</DialogTitle>
            <DialogDescription>
              Update the properties of {editingNumber?.phoneNumber}
            </DialogDescription>
          </DialogHeader>
          {editingNumber && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="friendlyName">Friendly Name</Label>
                <Input
                  id="friendlyName"
                  defaultValue={editingNumber.friendlyName || ""}
                  placeholder="Enter a friendly name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={editingNumber.isActive ? "active" : "inactive"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditNumberDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const friendlyName = document.getElementById('friendlyName') as HTMLInputElement;
                    const status = document.querySelector('[data-state="checked"]') as HTMLElement;
                    
                    updateNumberMutation.mutate({
                      numberId: editingNumber.id,
                      updates: {
                        friendlyName: friendlyName?.value || null,
                        isActive: status?.textContent === "Active"
                      }
                    });
                  }}
                  disabled={updateNumberMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}