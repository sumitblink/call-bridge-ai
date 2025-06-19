import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ArrowLeft, Settings, Phone, BarChart3 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignDNIConfig } from "@/components/campaign/CampaignDNIConfig";
import { Link } from "wouter";
import type { Campaign } from "@shared/schema";

export default function CampaignDetail() {
  const [match, params] = useRoute("/campaigns/:id");
  const campaignId = params?.id;

  const { data: campaign, isLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}`],
    enabled: !!campaignId,
    retry: false,
  });

  const { data: campaignBuyers } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/buyers`],
    enabled: !!campaignId,
    retry: false,
  });

  const { data: campaignCalls } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/calls`],
    enabled: !!campaignId,
    retry: false,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading campaign details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h2>
          <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist.</p>
          <Link href="/campaigns">
            <Button>Back to Campaigns</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const buyers = Array.isArray(campaignBuyers) ? campaignBuyers : [];
  const calls = Array.isArray(campaignCalls) ? campaignCalls : [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/campaigns">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-gray-600">{campaign.description || 'No description provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={campaign.status === 'active' ? 'default' : 'secondary'}
              className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : ''}
            >
              {campaign.status === 'active' ? 'Active' : 'Paused'}
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Edit Campaign
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Phone className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Phone Config</p>
                  <p className="text-2xl font-bold">
                    {campaign.poolId ? 'Pool-Based' : 'Direct'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Calls</p>
                  <p className="text-2xl font-bold">{calls.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Buyers</p>
                  <p className="text-2xl font-bold">{buyers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conv. Rate</p>
                  <p className="text-2xl font-bold">0%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="dni" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dni">DNI Configuration</TabsTrigger>
            <TabsTrigger value="buyers">Buyers ({buyers.length})</TabsTrigger>
            <TabsTrigger value="calls">Call History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dni" className="space-y-6">
            <CampaignDNIConfig campaign={campaign} />
          </TabsContent>

          <TabsContent value="buyers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Buyers</CardTitle>
                <CardDescription>
                  Buyers assigned to receive calls from this campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                {buyers.length > 0 ? (
                  <div className="space-y-4">
                    {buyers.map((buyer: any) => (
                      <div key={buyer.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{buyer.name}</h4>
                          <p className="text-sm text-gray-600">{buyer.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Priority: {buyer.priority || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{buyer.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No buyers assigned to this campaign yet.</p>
                    <Button className="mt-4" variant="outline">
                      Add Buyers
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Call History</CardTitle>
                <CardDescription>
                  Recent calls received for this campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                {calls.length > 0 ? (
                  <div className="space-y-4">
                    {calls.slice(0, 10).map((call: any) => (
                      <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{call.fromNumber}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(call.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                            {call.status}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">
                            {call.duration ? `${call.duration}s` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No calls received yet for this campaign.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Analytics</CardTitle>
                <CardDescription>
                  Performance metrics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-600">Analytics features coming soon.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Track call volume, conversion rates, and ROI metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}