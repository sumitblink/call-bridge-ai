import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users, Phone, Globe, BarChart3, Zap } from "lucide-react";
import Layout from "@/components/Layout";

// Individual tab components
import CampaignSettings from "@/components/campaign/CampaignSettings";
import CampaignBuyers from "@/components/campaign/CampaignBuyers";
import CampaignNumbers from "@/components/campaign/CampaignNumbers";
import CampaignTracking from "@/components/campaign/CampaignTracking";
import CampaignPublishers from "@/components/campaign/CampaignPublishers";
import CampaignAnalytics from "@/components/campaign/CampaignAnalytics";

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("settings");

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["/api/campaigns", campaignId],
    enabled: !!campaignId,
  });

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
      <div className="space-y-6">
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
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </div>
        </div>

        {/* Campaign Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="buyers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Buyers</span>
            </TabsTrigger>
            <TabsTrigger value="numbers" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Numbers</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="publishers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Publishers</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <CampaignSettings campaign={campaign} />
          </TabsContent>

          <TabsContent value="buyers">
            <CampaignBuyers campaignId={campaign.id} />
          </TabsContent>

          <TabsContent value="numbers">
            <CampaignNumbers campaignId={campaign.id} />
          </TabsContent>

          <TabsContent value="tracking">
            <CampaignTracking campaignId={campaign.id} campaign={campaign} />
          </TabsContent>

          <TabsContent value="publishers">
            <CampaignPublishers campaignId={campaign.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <CampaignAnalytics campaignId={campaign.id} campaign={campaign} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}