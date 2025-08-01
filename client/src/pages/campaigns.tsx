import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Edit, Trash2, Play, Pause, BarChart3, Users, Phone, Grid3X3, List, PhoneCall, Info, Link as LinkIcon, Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign, InsertCampaign, Buyer } from "@shared/schema";
import { DatabaseStatus } from "@/components/DatabaseStatus";

// Schema for campaign form (simplified RTB - no routers)
const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  country: z.string().min(1, "Country is required"),
  enableRtb: z.boolean().default(false),
  // RTB configuration moved to campaign level
  biddingTimeoutMs: z.number().min(1000).max(30000).optional(),
  minBiddersRequired: z.number().min(1).max(10).optional(),
  
  // Comprehensive Ringba-style RTB Settings
  // Real Time Bidding
  rtbOnlySip: z.boolean().default(false),
  rtbRequireCallerId: z.boolean().default(false),
  rtbJornayaEnabled: z.boolean().default(false),
  rtbTrustedFormCertId: z.string().optional(),
  
  // Bid Expiration
  rtbBidGoodForSeconds: z.number().default(60),
  rtbGiveBidInstead: z.string().default("reject"),
  
  // Rate Limit
  rtbMaxRequestsPerMinute: z.number().default(100),
  
  // Bid Settings
  rtbBidModifier: z.string().optional(),
  rtbMaxBid: z.string().optional(),
  rtbMinBid: z.string().optional(),
  rtbPayoutOn: z.string().optional(),
  rtbDuplicatePayouts: z.string().default("disabled"),
  
  // Pass Through Settings
  rtbPassThroughEnabled: z.boolean().default(false),
  rtbPassThroughMaxBid: z.number().optional(),
  rtbAllowBidOfLink: z.boolean().default(false),
  rtbBidMarginType: z.string().default("percentage"),
  rtbBidMargin: z.number().default(25),
  rtbNoBidMarginAfterAdjustment: z.number().default(3),
  rtbMinCallDurationForPayout: z.number().default(10),
  rtbPayoutSequence: z.string().default("30"),
  
  // Custom Scoring
  rtbCustomScoringEnabled: z.boolean().default(false),
  rtbCustomScoringRules: z.object({}).optional(),
  
  // Bid Modifiers
  rtbBidModifiers: z.array(z.object({})).optional(),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;



function BuyerCount({ campaignId }: { campaignId: string }) {
  const { data: buyers } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/buyers`],
    retry: false,
  });

  if (!buyers || !Array.isArray(buyers)) return <span>-</span>;
  
  return <span>{buyers.length}</span>;
}

function useCampaignStats(campaignId: string) {
  const { data: calls = [], isLoading, error } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/calls`],
    retry: false,
  });

  // Debug logging
  console.log('Campaign Stats Debug:', {
    campaignId,
    calls,
    callsLength: calls.length,
    isLoading,
    error,
    sampleCall: calls[0]
  });

  // Calculate statistics from actual call data
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const todayCalls = calls.filter((call: any) => {
    if (!call.createdAt && !call.created_at) return false;
    const callDate = new Date(call.createdAt || call.created_at).toISOString().split('T')[0];
    return callDate === todayString;
  }).length;

  const monthCalls = calls.filter((call: any) => {
    if (!call.createdAt && !call.created_at) return false;
    const callDate = new Date(call.createdAt || call.created_at);
    return callDate.getMonth() === currentMonth && callDate.getFullYear() === currentYear;
  }).length;

  const totalCalls = calls.length;

  return {
    today: todayCalls,
    month: monthCalls,
    total: totalCalls,
    isLoading
  };
}

function CampaignCard({ campaign, onDelete, onEdit }: { 
  campaign: Campaign; 
  onDelete: (campaign: Campaign) => void;
  onEdit?: (campaign: Campaign) => void;
}) {
  const stats = useCampaignStats(campaign.id);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Badge 
                variant={campaign.status === 'active' ? 'default' : 'secondary'}
                className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : ''}
              >
                {campaign.status === 'active' ? 'Active' : 'Paused'}
              </Badge>
              {campaign.enableRtb && (
                <Badge 
                  variant="outline" 
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  RTB Enabled
                </Badge>
              )}
              <Link href={`/campaigns/${campaign.id}`}>
                <Button variant="link" className="p-0 h-auto text-lg font-semibold text-blue-600 hover:text-blue-800">
                  {campaign.name}
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Phone Number</p>
                <p className="font-mono font-medium">{campaign.phoneNumber || 'Not assigned'}</p>
              </div>
              
              <div>
                <p className="text-gray-500 mb-1">Pool Assignment</p>
                <p className="font-medium">{campaign.poolId ? `Pool ID: ${campaign.poolId}` : 'No Pool'}</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 mb-1">Today</p>
                <p className="font-bold text-lg">{stats.today}</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 mb-1">Month</p>
                <p className="font-bold text-lg">{stats.month}</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 mb-1">Total</p>
                <p className="font-bold text-lg">{stats.total}</p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 mb-1">Buyers</p>
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <BuyerCount campaignId={campaign.id} />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <BarChart3 className="h-4 w-4" />
                Recording: Yes
              </div>
              {campaign.enableRtb && (
                <div className="flex items-center gap-1 text-sm text-purple-600">
                  <PhoneCall className="h-4 w-4" />
                  RTB: Direct Assignment
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* Toggle status logic */}}
            >
              {campaign.status === 'active' ? 
                <Pause className="h-4 w-4" /> : 
                <Play className="h-4 w-4" />
              }
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(campaign)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(campaign)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignForm({ 
  campaign, 
  onSuccess 
}: { 
  campaign?: Campaign; 
  onSuccess?: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch RTB targets for campaign assignment (simplified architecture)
  const { data: rtbTargets = [] } = useQuery({
    queryKey: ["/api/rtb/targets"],
  });

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: campaign?.name || "",
      country: campaign?.geoTargeting?.[0] || "US", // Use existing geo targeting or default to US
      enableRtb: campaign?.enableRtb || false,
      // RTB configuration at campaign level
      biddingTimeoutMs: campaign?.biddingTimeoutMs || 3000,
      minBiddersRequired: campaign?.minBiddersRequired || 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      console.log('Form data received:', data);
      const campaignData: InsertCampaign = {
        name: data.name,
        geoTargeting: [data.country], // Map country to geoTargeting array
        status: 'draft',
        routingType: 'priority_based',
        maxConcurrentCalls: 10,
        callCap: 100,
        userId: 1, // Default user ID for now
        enableRtb: data.enableRtb,
        // RTB configuration moved to campaign level
        biddingTimeoutMs: data.biddingTimeoutMs,
        minBiddersRequired: data.minBiddersRequired,
      };
      console.log('Campaign data to send:', campaignData);
      
      const response = await apiRequest("/api/campaigns", "POST", campaignData);
      if (!response.ok) {
        throw new Error(`Failed to create campaign: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      console.log('Updating campaign with data:', data);
      const campaignData = {
        name: data.name,
        geoTargeting: [data.country],
        enableRtb: data.enableRtb,
        // RTB configuration moved to campaign level
        biddingTimeoutMs: data.biddingTimeoutMs,
        minBiddersRequired: data.minBiddersRequired,
      };
      console.log('Campaign update data to send:', campaignData);
      
      const response = await apiRequest(`/api/campaigns/${campaign!.id}`, "PUT", campaignData);
      if (!response.ok) {
        throw new Error(`Failed to update campaign: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign!.id}`] });
      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CampaignFormData) => {
    if (campaign) {
      // Edit mode - update existing campaign
      updateMutation.mutate(data);
    } else {
      // Create mode - create new campaign
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Campaign Name</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>A descriptive name for your campaign<br/>
                        This helps identify the campaign purpose</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormControl>
                <Input placeholder="Enter campaign name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

            <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Country</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Target country for call routing<br/>
                        Used for geo-targeting and compliance</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="IT">Italy</SelectItem>
                  <SelectItem value="ES">Spain</SelectItem>
                  <SelectItem value="NL">Netherlands</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Comprehensive RTB Configuration Section - Ringba Style */}
        <div className="space-y-6 pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Real Time Bidding
          </h3>
          
          {/* RTB Enable Section */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="enableRtb"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel className="text-sm font-medium">Enable</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rtbOnlySip"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel className="text-sm font-medium">Only SIP</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rtbRequireCallerId"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel className="text-sm font-medium">Require Caller ID</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-medium">Jornaya</FormLabel>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Enabled</Button>
                <Button variant="outline" size="sm">Enabled</Button>
                <Button variant="outline" size="sm">Required</Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-medium">Trusted Form Cert ID</FormLabel>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Disabled</Button>
                <Button variant="outline" size="sm">Enabled</Button>
                <Button variant="outline" size="sm">Required</Button>
              </div>
            </div>
          </div>

          {form.watch("enableRtb") && (
            <div className="space-y-6">
              {/* Bid Expiration Section */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Bid Expiration</h4>
                
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Bid Good For</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="rtbBidGoodForSeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              className="w-20"
                              {...field}
                              value={field.value || 60}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Give Bid Instead</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Reject</Button>
                    <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Accept Normally</Button>
                  </div>
                </div>
              </div>

              {/* Rate Limit Section */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Rate Limit</h4>
                
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Maximum Requests</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="rtbMaxRequestsPerMinute"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              className="w-20"
                              {...field}
                              value={field.value || 100}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-sm text-muted-foreground">Per Minute</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prevent bursts to scheduling using default values will be applied in "Not request per minute"
                </p>
              </div>

              {/* Bid Settings Section */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Bid Settings</h4>
                
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Bid Bid Modifier</FormLabel>
                  <FormField
                    control={form.control}
                    name="rtbBidModifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            className="w-32"
                            placeholder="Account Specific via Pricing Settings"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Max Bid</FormLabel>
                  <FormField
                    control={form.control}
                    name="rtbMaxBid"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            className="w-32"
                            placeholder="Account Campaign Pricing Settings"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Min Bid</FormLabel>
                  <FormField
                    control={form.control}
                    name="rtbMinBid"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            className="w-32"
                            placeholder="Open Offers in Pre Pricing Settings"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Payout On</FormLabel>
                  <FormField
                    control={form.control}
                    name="rtbPayoutOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            className="w-32"
                            placeholder="Open Offers in Call Qualifying Conversions Settings"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Duplicate Payouts</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Disabled</Button>
                    <Button variant="outline" size="sm">Enabled</Button>
                    <Button variant="outline" size="sm">Time Based</Button>
                  </div>
                </div>
              </div>

              {/* Pass Through Settings Section */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Pass Through Settings</h4>
                
                <FormField
                  control={form.control}
                  name="rtbPassThroughEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm font-medium">Enable</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Max Bid</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="rtbPassThroughMaxBid"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-20"
                              {...field}
                              value={field.value || 100}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 100)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-sm text-muted-foreground">Seconds</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="rtbAllowBidOfLink"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="text-sm font-medium">Allow Bid of Link</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Bid Margin Type</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Percentage</Button>
                    <Button variant="outline" size="sm">Amount</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Bid Margin</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="rtbBidMargin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-20"
                              {...field}
                              value={field.value || 25}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 25)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">No Bid Margin After Adjustment</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="rtbNoBidMarginAfterAdjustment"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              className="w-20"
                              {...field}
                              value={field.value || 3}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Min Call Duration for Payout</FormLabel>
                  <FormField
                    control={form.control}
                    name="rtbMinCallDurationForPayout"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select from Target Duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="10">10 seconds</SelectItem>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">60 seconds</SelectItem>
                            <SelectItem value="90">90 seconds</SelectItem>
                            <SelectItem value="120">120 seconds</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Payout Sequence</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="rtbPayoutSequence"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              className="w-20"
                              {...field}
                              value={field.value || 30}
                              onChange={(e) => field.onChange(e.target.value || "30")}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-sm text-muted-foreground">Seconds</span>
                  </div>
                </div>
              </div>

              {/* Custom Scoring Section */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Custom Scoring</h4>
                
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Custom Scoring</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">Disabled</Button>
                    <Button variant="outline" size="sm">Enabled</Button>
                    <Button variant="outline" size="sm">Required</Button>
                  </div>
                </div>
              </div>

              {/* Bid Modifiers Section */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold">Bid Modifiers</h4>
                
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  ADD NEW MODIFIER
                </Button>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Tag</span>
                    <span>Logic</span>
                    <span>Value</span>
                  </div>
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    No bid modifiers.
                  </div>
                </div>
              </div>

              {/* Legacy Settings */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="biddingTimeoutMs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Bidding Timeout (ms)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1000}
                          max={30000}
                          placeholder="3000"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Maximum time to wait for bidder responses (1000-30000ms)
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minBiddersRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Minimum Bidders Required</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          placeholder="1"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Minimum number of active bidders required (1-10)
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending 
                  ? (campaign ? "Updating..." : "Creating...") 
                  : (campaign ? "Update Campaign" : "Create Campaign")
                }
              </Button>
            </div>
          </form>
        </Form>
    </div>
  );
}

export default function Campaigns() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('campaignViewMode') as 'cards' | 'table') || 'cards';
    }
    return 'cards';
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('campaignViewMode', mode);
  };

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/campaigns/${id}`, "DELETE");
      if (!response.ok) {
        throw new Error(`Failed to delete campaign: ${response.statusText}`);
      }
      // For DELETE requests with 204 status, there's no JSON content to parse
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });



  const handleDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsEditDialogOpen(true);
  };

  if (error) {
    return (
      <div className="p-6">
        <DatabaseStatus 
          isConnected={false} 
          error={error instanceof Error ? error.message : "Connection failed"}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] })}
        />
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header with View Toggle and Test Call Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-muted-foreground">Manage your call center campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('cards')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('table')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Create a new campaign to start tracking calls and managing buyers.
              </DialogDescription>
            </DialogHeader>
            <CampaignForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Campaigns Display */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !campaigns || (Array.isArray(campaigns) && campaigns.length === 0) ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first campaign to get started with call center management.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>RTB</TableHead>
                    <TableHead>Recording</TableHead>
                    <TableHead className="text-center">Today</TableHead>
                    <TableHead className="text-center">Month</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Buyers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns && Array.isArray(campaigns) && campaigns.map((campaign: Campaign) => (
                    <TableRow key={campaign.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge 
                          variant={campaign.status === 'active' ? 'default' : 'secondary'}
                          className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {campaign.status === 'active' ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/campaigns/${campaign.id}`}>
                          <Button variant="link" className="p-0 h-auto font-medium text-left">
                            {campaign.name}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {campaign.phoneNumber || 'Not assigned'}
                      </TableCell>
                      <TableCell>
                        {campaign.enableRtb ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          Yes
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">0</TableCell>
                      <TableCell className="text-center font-medium">0</TableCell>
                      <TableCell className="text-center font-medium">0</TableCell>
                      <TableCell className="text-center">
                        <BuyerCount campaignId={campaign.id} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* Toggle status logic */}}
                          >
                            {campaign.status === 'active' ? 
                              <Pause className="h-4 w-4" /> : 
                              <Play className="h-4 w-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(campaign)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(campaign)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns && Array.isArray(campaigns) && campaigns.map((campaign: Campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => campaignToDelete && deleteMutation.mutate(campaignToDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>
                Update campaign details, RTB settings, and configuration.
              </DialogDescription>
            </DialogHeader>
            {editingCampaign && (
              <CampaignForm
                campaign={editingCampaign}
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  setEditingCampaign(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}