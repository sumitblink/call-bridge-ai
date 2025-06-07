import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign } from "@shared/schema";
import { Filter, Search, BellRing, Star, AlertTriangle, Heart } from "lucide-react";

interface CampaignListProps {
  campaigns?: Campaign[];
  isLoading: boolean;
}

const getCampaignIcon = (name: string) => {
  if (name.toLowerCase().includes("satisfaction")) return BellRing;
  if (name.toLowerCase().includes("product")) return Star;
  if (name.toLowerCase().includes("debt")) return AlertTriangle;
  if (name.toLowerCase().includes("healthcare")) return Heart;
  return BellRing;
};

const getCampaignIconColor = (name: string) => {
  if (name.toLowerCase().includes("satisfaction")) return "text-primary-600 bg-primary-100";
  if (name.toLowerCase().includes("product")) return "text-yellow-600 bg-yellow-100";
  if (name.toLowerCase().includes("debt")) return "text-red-600 bg-red-100";
  if (name.toLowerCase().includes("healthcare")) return "text-blue-600 bg-blue-100";
  return "text-primary-600 bg-primary-100";
};

export default function CampaignList({ campaigns, isLoading }: CampaignListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/campaigns/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Campaign updated",
        description: "Campaign status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update campaign status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePause = (campaignId: number) => {
    updateCampaignMutation.mutate({ id: campaignId, status: "paused" });
  };

  const handleResume = (campaignId: number) => {
    updateCampaignMutation.mutate({ id: campaignId, status: "active" });
  };

  const handleEdit = (campaignId: number) => {
    toast({
      title: "Edit Campaign",
      description: `Edit functionality for campaign ${campaignId} would be implemented here.`,
    });
  };

  if (isLoading) {
    return (
      <Card className="border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls Made</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(4)].map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="w-10 h-10 rounded-lg mr-4" />
                        <div>
                          <Skeleton className="h-4 w-48 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-2 w-24 mr-3" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card className="border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
              <p className="text-sm text-gray-500 mt-1">Monitor and manage your ongoing campaigns</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <BellRing className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-500">Create your first campaign to get started with call center operations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
            <p className="text-sm text-gray-500 mt-1">Monitor and manage your ongoing campaigns</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calls Made</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((campaign) => {
              const IconComponent = getCampaignIcon(campaign.name);
              const iconColorClass = getCampaignIconColor(campaign.name);
              
              return (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${iconColorClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        campaign.status === "active"
                          ? "bg-green-100 text-green-800"
                          : campaign.status === "paused"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-3" style={{ width: "100px" }}>
                        <div
                          className={`h-2 rounded-full ${
                            campaign.status === "active" ? "bg-primary-600" : "bg-gray-400"
                          }`}
                          style={{ width: `${campaign.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900 font-medium">{campaign.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.callsMade.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.successRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(campaign.id)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      Edit
                    </Button>
                    {campaign.status === "active" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePause(campaign.id)}
                        disabled={updateCampaignMutation.isPending}
                        className="text-red-600 hover:text-red-900"
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResume(campaign.id)}
                        disabled={updateCampaignMutation.isPending}
                        className="text-green-600 hover:text-green-900"
                      >
                        Resume
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing <span className="font-medium">1-{campaigns.length}</span> of{" "}
          <span className="font-medium">{campaigns.length}</span> campaigns
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
            1
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
