import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, BarChart3, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Campaign, NumberPool } from "@shared/schema";

interface CampaignPoolsProps {
  campaign: Campaign;
}

export default function CampaignPools({ campaign }: CampaignPoolsProps) {
  // Fetch the assigned pool details (from campaign.poolId)
  const { data: assignedPool, isLoading: poolLoading } = useQuery<NumberPool>({
    queryKey: ["/api/number-pools", campaign.poolId],
    queryFn: async () => {
      if (!campaign.poolId) throw new Error("No pool assigned");
      const response = await fetch(`/api/number-pools/${campaign.poolId}`);
      if (!response.ok) throw new Error("Failed to fetch pool details");
      return response.json();
    },
    enabled: !!campaign.poolId,
  });

  // Fetch pool numbers
  const { data: poolNumbers, isLoading: numbersLoading } = useQuery({
    queryKey: ["/api/number-pools", campaign.poolId, "numbers"],
    queryFn: async () => {
      if (!campaign.poolId) return [];
      const response = await fetch(`/api/number-pools/${campaign.poolId}/numbers`);
      if (!response.ok) throw new Error("Failed to fetch pool numbers");
      return response.json();
    },
    enabled: !!campaign.poolId,
  });

  // Pool management helper functions
  const calculateUtilization = () => {
    if (!poolNumbers || poolNumbers.length === 0) return 0;
    const assignedCount = poolNumbers.filter((num: any) => num.campaignId).length;
    return Math.round((assignedCount / poolNumbers.length) * 100);
  };

  if (poolLoading || numbersLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign.poolId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pool Assigned</h3>
          <p className="text-muted-foreground mb-4">
            This campaign is not using pool routing. To assign a pool, go to Settings and select "Number Pool" routing.
          </p>
        </CardContent>
      </Card>
    );
  }

  const utilization = calculateUtilization();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Pool Management</h2>
          <p className="text-muted-foreground">Monitor and manage your assigned number pool</p>
        </div>
      </div>

      {/* Assigned Pool Details */}
      {assignedPool && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg">{assignedPool.name}</CardTitle>
              <CardDescription>
                {assignedPool.poolSize} numbers • {assignedPool.country} • {assignedPool.numberType}
              </CardDescription>
            </div>
            <Badge variant={assignedPool.isActive ? "default" : "secondary"}>
              {assignedPool.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-lg font-semibold">{assignedPool.poolSize}</div>
                <div className="text-xs text-muted-foreground">Pool Size</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{poolNumbers?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Available Numbers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{assignedPool.closedBrowserDelay}s</div>
                <div className="text-xs text-muted-foreground">Browser Delay</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{assignedPool.idleLimit}s</div>
                <div className="text-xs text-muted-foreground">Idle Limit</div>
              </div>
            </div>
            
            {/* Pool utilization progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pool Utilization</span>
                <span>{utilization}%</span>
              </div>
              <Progress value={utilization} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Numbers List */}
      {poolNumbers && poolNumbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pool Numbers</CardTitle>
            <CardDescription>
              Numbers available in this pool for dynamic assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {poolNumbers.map((number: any) => (
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
                  <Badge variant={number.isActive ? "default" : "secondary"}>
                    {number.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}