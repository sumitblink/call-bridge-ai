import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users, Phone, Globe, Zap, Target, Database, MousePointer } from "lucide-react";
import Layout from "@/components/Layout";

// Individual tab components
import CampaignSettings from "@/components/campaign/CampaignSettings";
import CampaignBuyers from "@/components/campaign/CampaignBuyers";
import CampaignNumbers from "@/components/campaign/CampaignNumbers";
import CampaignPools from "@/components/campaign/CampaignPools";
import CampaignTracking from "@/components/campaign/CampaignTracking";
import CampaignPublishers from "@/components/campaign/CampaignPublishers";
import { CampaignReadinessDashboard } from "@/components/campaign/CampaignReadinessDashboard";
import { RTBTargetAssignment } from "@/components/campaign/RTBTargetAssignment";
import CampaignUrlParameters from "@/components/campaign/CampaignUrlParameters";
import CampaignTrackingPixels from "@/components/campaign/CampaignTrackingPixels";

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("settings");

  const { data: campaign, isLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}`],
    enabled: !!campaignId,
  });

  // Redirect to settings tab if currently viewing pools tab but routing type is not pool
  useEffect(() => {
    if (campaign && activeTab === "pools" && campaign.routingType !== "pool") {
      setActiveTab("settings");
    }
  }, [campaign, activeTab]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Campaign not found
          </h2>
          <Button onClick={() => setLocation("/campaigns")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Campaign Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setLocation("/campaigns")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {campaign.name}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">Campaign ID: {campaign.id}</span>
                <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                  {campaign.status}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Test Call
            </Button>
          </div>
        </div>

        {/* Campaign Readiness Dashboard */}
        <CampaignReadinessDashboard 
          campaignId={campaign.id} 
          campaignStatus={campaign.status}
        />

        {/* Campaign Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={`grid w-full ${campaign.enableRtb ? (campaign.routingType === "pool" ? "grid-cols-8" : "grid-cols-7") : (campaign.routingType === "pool" ? "grid-cols-7" : "grid-cols-6")}`}>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="buyers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Buyers</span>
            </TabsTrigger>
            {campaign.routingType === "pool" && (
              <TabsTrigger value="pools" className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Pools</span>
              </TabsTrigger>
            )}
            {campaign.enableRtb && (
              <TabsTrigger value="rtb" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">RTB Targets</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="tracking" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="url-parameters" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">URL Parameters</span>
            </TabsTrigger>
            <TabsTrigger value="tracking-pixels" className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking Pixels</span>
            </TabsTrigger>
            <TabsTrigger value="publishers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Publishers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <CampaignSettings campaignId={campaign.id} campaign={campaign} />
          </TabsContent>

          <TabsContent value="buyers">
            <CampaignBuyers campaignId={campaign.id} />
          </TabsContent>

          {campaign.routingType === "pool" && (
            <TabsContent value="pools">
              <CampaignPools campaign={campaign} />
            </TabsContent>
          )}

          <TabsContent value="tracking">
            <CampaignTracking campaignId={campaign.id} campaign={campaign} />
          </TabsContent>

          <TabsContent value="url-parameters">
            <CampaignUrlParameters campaignId={campaign.id} />
          </TabsContent>

          <TabsContent value="tracking-pixels">
            <CampaignTrackingPixels campaignId={campaign.id} />
          </TabsContent>

          <TabsContent value="publishers">
            <CampaignPublishers campaignId={campaign.id} />
          </TabsContent>

          {campaign.enableRtb && (
            <TabsContent value="rtb">
              <RTBTargetAssignment 
                campaignId={campaign.id} 
                campaignName={campaign.name}
                isRtbEnabled={campaign.enableRtb}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}