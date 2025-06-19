import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign, NumberPool } from "@shared/schema";

interface PoolAssignmentDialogProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PoolAssignmentDialog({ 
  campaign, 
  isOpen, 
  onClose, 
  onSuccess 
}: PoolAssignmentDialogProps) {
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available pools (not already assigned to this campaign)
  const { data: availablePools, isLoading } = useQuery<NumberPool[]>({
    queryKey: ["/api/number-pools", "available", campaign.id],
    queryFn: async () => {
      const response = await fetch(`/api/number-pools?available=true&excludeCampaign=${campaign.id}`);
      if (!response.ok) throw new Error("Failed to fetch available pools");
      return response.json();
    },
    enabled: isOpen,
  });

  // Mutation to assign pool to campaign
  const assignPoolMutation = useMutation({
    mutationFn: async (poolId: number) => {
      const response = await apiRequest(`/api/campaigns/${campaign.id}/assign-pool`, "POST", { poolId });
      if (!response.ok) {
        throw new Error("Failed to assign pool to campaign");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pool assigned to campaign successfully",
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

  const handleAssign = () => {
    if (selectedPoolId) {
      assignPoolMutation.mutate(parseInt(selectedPoolId));
    }
  };

  const selectedPool = availablePools?.find(pool => pool.id.toString() === selectedPoolId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Number Pool to Campaign</DialogTitle>
          <DialogDescription>
            Select a number pool to assign to "{campaign.name}" for dynamic number insertion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{campaign.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Phone:</span>
                <span className="font-medium">{campaign.phoneNumber || "Not assigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                  {campaign.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pool Selection */}
          <div>
            <h3 className="text-lg font-medium mb-3">Select Pool to Assign</h3>
            
            {isLoading ? (
              <div className="text-center py-8">Loading available pools...</div>
            ) : !availablePools || availablePools.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Available Pools</h3>
                  <p className="text-muted-foreground mb-4">
                    All existing pools are already assigned to other campaigns or there are no pools created yet.
                  </p>
                  <Button variant="outline" onClick={onClose}>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Pools
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <RadioGroup value={selectedPoolId} onValueChange={setSelectedPoolId}>
                <div className="space-y-3">
                  {availablePools.map((pool) => (
                    <div key={pool.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={pool.id.toString()} id={pool.id.toString()} />
                      <Label htmlFor={pool.id.toString()} className="flex-1 cursor-pointer">
                        <Card className="hover:bg-gray-50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge variant={pool.isActive ? "default" : "secondary"}>
                                    {pool.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <h4 className="font-semibold">{pool.name}</h4>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Size</p>
                                    <p className="font-medium">{pool.poolSize} numbers</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-medium">{pool.numberType || "Mixed"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Country</p>
                                    <p className="font-medium">{pool.country || "US"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Available</p>
                                    <p className="font-medium text-green-600">Ready</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          {/* Selected Pool Preview */}
          {selectedPool && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Assignment Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>"{selectedPool.name}"</strong> will be assigned to <strong>"{campaign.name}"</strong>
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    This will enable dynamic number insertion with {selectedPool.poolSize} available numbers.
                  </p>
                </div>
                
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Pool capacity:</span> {selectedPool.poolSize} numbers</p>
                  <p><span className="text-muted-foreground">Number type:</span> {selectedPool.numberType || "Mixed"}</p>
                  <p><span className="text-muted-foreground">Routing strategy:</span> Round Robin</p>
                  <p><span className="text-muted-foreground">Geographic focus:</span> {selectedPool.country || "US"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedPoolId || assignPoolMutation.isPending}
            >
              {assignPoolMutation.isPending ? "Assigning..." : "Assign Pool"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}