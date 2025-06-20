import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Phone, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { NumberPool, PhoneNumber } from "@shared/schema";

interface NumberPoolManagerProps {
  pool: NumberPool;
  isOpen: boolean;
  onClose: () => void;
}

export default function NumberPoolManager({ pool, isOpen, onClose }: NumberPoolManagerProps) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available phone numbers (not in any pool)
  const { data: availableNumbers, isLoading: availableLoading } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/phone-numbers", "available"],
    queryFn: async () => {
      const response = await fetch("/api/phone-numbers?available=true");
      if (!response.ok) throw new Error("Failed to fetch available numbers");
      return response.json();
    },
    enabled: isOpen,
  });

  // Fetch numbers already in this pool
  const { data: poolNumbers, isLoading: poolLoading } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/number-pools", pool.id, "numbers"],
    queryFn: async () => {
      const response = await fetch(`/api/number-pools/${pool.id}/numbers`);
      if (!response.ok) throw new Error("Failed to fetch pool numbers");
      return response.json();
    },
    enabled: isOpen,
  });

  // Mutation to add numbers to pool
  const addNumbersMutation = useMutation({
    mutationFn: async (phoneNumberIds: number[]) => {
      const results = [];
      let conflictErrors = [];
      
      for (const phoneNumberId of phoneNumberIds) {
        try {
          const response = await apiRequest(`/api/number-pools/${pool.id}/assign-number`, "POST", { phoneNumberId });
          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 409) {
              conflictErrors.push(errorData.error);
            } else {
              throw new Error(errorData.error || "Failed to add number to pool");
            }
          } else {
            results.push(await response.json());
          }
        } catch (error: any) {
          if (error.message.includes('already assigned to pool')) {
            conflictErrors.push(error.message);
          } else {
            throw error;
          }
        }
      }
      
      if (conflictErrors.length > 0) {
        throw new Error(`Some numbers couldn't be assigned:\n${conflictErrors.join('\n')}`);
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", pool.id, "numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      toast({
        title: "Success",
        description: `Added ${selectedNumbers.length} number(s) to pool`,
      });
      setSelectedNumbers([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to remove numbers from pool
  const removeNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await apiRequest(`/api/number-pools/${pool.id}/remove-number`, "POST", { phoneNumberId });
      if (!response.ok) {
        throw new Error("Failed to remove number from pool");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/number-pools", pool.id, "numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
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

  const handleSelectNumber = (numberId: number, checked: boolean) => {
    if (checked) {
      setSelectedNumbers(prev => [...prev, numberId]);
    } else {
      setSelectedNumbers(prev => prev.filter(id => id !== numberId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && availableNumbers) {
      setSelectedNumbers(availableNumbers.map(num => num.id));
    } else {
      setSelectedNumbers([]);
    }
  };

  const handleAddSelected = () => {
    if (selectedNumbers.length > 0) {
      addNumbersMutation.mutate(selectedNumbers);
    }
  };

  const currentCount = poolNumbers?.length || 0;
  const remainingSlots = pool.poolSize - currentCount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle>Manage Pool Numbers: {pool.name}</DialogTitle>
              <DialogDescription>
                Add or remove phone numbers from this pool. Pool capacity: {currentCount}/{pool.poolSize}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pool Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{currentCount}</div>
                <div className="text-sm text-muted-foreground">Numbers in Pool</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{remainingSlots}</div>
                <div className="text-sm text-muted-foreground">Available Slots</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{availableNumbers?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Unassigned Numbers</div>
              </CardContent>
            </Card>
          </div>

          {/* Numbers Currently in Pool */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Numbers in Pool ({currentCount})
            </h3>
            {poolLoading ? (
              <div className="text-center py-4">Loading pool numbers...</div>
            ) : !poolNumbers || poolNumbers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No numbers assigned to this pool yet
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poolNumbers.map((number) => (
                        <TableRow key={number.id}>
                          <TableCell className="font-medium">
                            {number.phoneNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {number.numberType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={number.isActive ? "default" : "secondary"}>
                              {number.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNumberMutation.mutate(number.id)}
                              disabled={removeNumberMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Available Numbers to Add */}
          {remainingSlots > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Available Numbers ({availableNumbers?.length || 0})
                </h3>
                {selectedNumbers.length > 0 && (
                  <Button 
                    onClick={handleAddSelected}
                    disabled={addNumbersMutation.isPending}
                  >
                    Add {selectedNumbers.length} Selected
                  </Button>
                )}
              </div>

              {availableLoading ? (
                <div className="text-center py-4">Loading available numbers...</div>
              ) : !availableNumbers || availableNumbers.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No unassigned numbers available. 
                    <Button variant="link" className="p-0 h-auto ml-1">
                      Purchase new numbers
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedNumbers.length === availableNumbers.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableNumbers.map((number) => (
                          <TableRow key={number.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedNumbers.includes(number.id)}
                                onCheckedChange={(checked) => 
                                  handleSelectNumber(number.id, checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {number.phoneNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {number.numberType}
                              </Badge>
                            </TableCell>
                            <TableCell>{number.country}</TableCell>
                            <TableCell>
                              <Badge variant={number.isActive ? "default" : "secondary"}>
                                {number.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {remainingSlots === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-lg font-medium text-orange-600 mb-2">Pool is Full</div>
                <p className="text-muted-foreground">
                  This pool has reached its maximum capacity of {pool.poolSize} numbers.
                  Remove some numbers or increase the pool size to add more.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}