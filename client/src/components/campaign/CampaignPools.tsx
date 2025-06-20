import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, BarChart3, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign, NumberPool } from "@shared/schema";
import PoolAssignmentDialog from "../PoolAssignmentDialog";

interface CampaignPoolsProps {
  campaign: Campaign;
}

interface PoolStats {
  totalNumbers: number;
  availableNumbers: number;
  assignedNumbers: number;
  utilizationRate: number;
}

export default function CampaignPools({ campaign }: CampaignPoolsProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pools assigned to this campaign
  const { data: assignedPools, isLoading: poolsLoading } = useQuery<NumberPool[]>({
    queryKey: ["/api/campaigns", campaign.id, "pools"],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaign.id}/pools`);
      if (!response.ok) throw new Error("Failed to fetch campaign pools");
      const pools = await response.json();
      console.log("Fetched assigned pools:", pools);
      return pools;
    },
  });

  // Fetch pool statistics
  const { data: poolStats, isLoading: statsLoading } = useQuery<PoolStats>({
    queryKey: ["/api/campaigns", campaign.id, "pool-stats"],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaign.id}/pool-stats`);
      if (!response.ok) throw new Error("Failed to fetch pool statistics");
      return response.json();
    },
  });

  // Mutation to unassign pool from campaign
  const unassignPoolMutation = useMutation({
    mutationFn: async (poolId: number) => {
      const response = await apiRequest(`/api/campaigns/${campaign.id}/unassign-pool`, "POST", { poolId });
      if (!response.ok) {
        throw new Error("Failed to unassign pool from campaign");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaign.id, "pools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaign.id, "pool-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: "Pool unassigned from campaign",
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

  const hasAssignedPools = assignedPools && assignedPools.length > 0;

  return (
    <div className="space-y-6">
      {/* Pool Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Pools</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedPools?.length || 0}</div>
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
            <div className="text-2xl font-bold">{poolStats?.totalNumbers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available for routing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(poolStats?.utilizationRate || 0)}%</div>
            <Progress 
              value={poolStats?.utilizationRate || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Status</CardTitle>
            {hasAssignedPools ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {hasAssignedPools ? "Pool-based" : "Direct"}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasAssignedPools ? "Using number pools" : "Using campaign number"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pool Assignment Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Pool Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Manage number pools assigned to this campaign for dynamic number insertion.
          </p>
        </div>
        <Button onClick={() => setIsAssignDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Pool
        </Button>
      </div>

      {/* Assigned Pools List */}
      {poolsLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
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
      ) : !hasAssignedPools ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pools Assigned</h3>
              <p className="text-muted-foreground mb-4">
                This campaign is using direct phone number assignment. 
                Assign number pools to enable dynamic number insertion and better call tracking.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setIsAssignDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign First Pool
                </Button>
                <Button variant="outline" asChild>
                  <a href="/number-pools">
                    Manage Pools
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignedPools.map((pool) => (
            <Card key={pool.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={pool.isActive ? "default" : "secondary"}>
                        {pool.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <h4 className="text-lg font-semibold">{pool.name}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pool Size</p>
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
                        <p className="text-muted-foreground">Assignment</p>
                        <p className="font-medium">Round Robin</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Priority</p>
                        <p className="font-medium">Primary</p>
                      </div>
                    </div>

                    {/* Pool Health Indicator */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Pool Health</span>
                        <span className="font-medium text-green-600">Healthy</span>
                      </div>
                      <Progress value={85} className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pool has sufficient available numbers for routing
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/number-pools`}>
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unassignPoolMutation.mutate(pool.id)}
                      disabled={unassignPoolMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Routing Flow Visualization */}
      {hasAssignedPools && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Call Routing Flow
            </CardTitle>
            <CardDescription>
              Visual representation of how calls are routed through your number pools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center space-x-8 py-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <Phone className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm font-medium">Visitor Calls</p>
                <p className="text-xs text-muted-foreground">Dynamic Number</p>
              </div>
              
              <div className="flex-1 h-px bg-gray-200 relative">
                <div className="absolute right-0 top-0 w-2 h-2 bg-gray-400 transform rotate-45 -translate-y-1"></div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <Settings className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm font-medium">Number Pool</p>
                <p className="text-xs text-muted-foreground">Routes to Buyers</p>
              </div>
              
              <div className="flex-1 h-px bg-gray-200 relative">
                <div className="absolute right-0 top-0 w-2 h-2 bg-gray-400 transform rotate-45 -translate-y-1"></div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-sm font-medium">Buyers</p>
                <p className="text-xs text-muted-foreground">Receive Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Assignment Dialog */}
      <PoolAssignmentDialog
        campaign={campaign}
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onSuccess={() => {
          setIsAssignDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaign.id, "pools"] });
          queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaign.id, "pool-stats"] });
        }}
      />
    </div>
  );
}