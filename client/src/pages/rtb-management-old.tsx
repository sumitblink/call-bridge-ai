import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { EnhancedRTBTargetDialog } from "@/components/rtb/EnhancedRTBTargetDialog";
import { Phase1AdvancedBiddingDialog } from "@/components/rtb/Phase1AdvancedBiddingDialog";
import { Phase2GeographicTargetingDialog } from "@/components/rtb/Phase2GeographicTargetingDialog";
import Phase3AdvancedFilteringDialog from "@/components/rtb/Phase3AdvancedFilteringDialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Target, Activity, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Play, TestTube, Zap, Users, Settings, BarChart, ArrowRight, ChevronDown, ChevronRight, Eye, Timer, Phone, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Schema definitions
const rtbRouterSchema = z.object({
  name: z.string().min(1, "Router name is required"),
  description: z.string().optional(),
  biddingTimeoutMs: z.number().min(1000, "Timeout must be at least 1000ms").max(30000, "Timeout cannot exceed 30000ms"),
  minBiddersRequired: z.number().min(1, "Must require at least 1 bidder").max(10, "Cannot require more than 10 bidders"),
  enablePredictiveRouting: z.boolean(),
  revenueType: z.enum(["per_call", "per_minute", "cpa", "cpl"]),
  conversionTracking: z.boolean(),
  isActive: z.boolean(),
});

const rtbTargetSchema = z.object({
  name: z.string().min(1, "Target name is required"),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  endpointUrl: z.string().url("Valid endpoint URL is required"),
  timeoutMs: z.number().min(1000, "Timeout must be at least 1000ms").max(30000, "Timeout cannot exceed 30000ms"),
  connectionTimeout: z.number().min(1000, "Connection timeout must be at least 1000ms").max(30000, "Connection timeout cannot exceed 30000ms"),
  authMethod: z.enum(["none", "api_key", "bearer", "basic"]),
  authToken: z.string().optional(),
  timezone: z.string(),
  isActive: z.boolean(),
  maxConcurrentCalls: z.number().min(1, "Must allow at least 1 concurrent call").max(100, "Cannot exceed 100 concurrent calls"),
  dailyCap: z.number().min(1, "Daily cap must be at least 1").max(10000, "Daily cap cannot exceed 10000"),
  hourlyCap: z.number().min(1, "Hourly cap must be at least 1").max(1000, "Hourly cap cannot exceed 1000"),
  monthlyCap: z.number().min(1, "Monthly cap must be at least 1").max(100000, "Monthly cap cannot exceed 100000"),
  minBidAmount: z.number().min(0, "Minimum bid cannot be negative"),
  maxBidAmount: z.number().min(0, "Maximum bid cannot be negative"),
  currency: z.string().length(3, "Currency must be 3 characters"),
  
  // Phase 1: Advanced Bidding Features
  bidStrategy: z.enum(["fixed", "percentage", "dynamic", "auto"]).optional(),
  bidFloor: z.number().min(0, "Bid floor cannot be negative").optional(),
  bidCeiling: z.number().min(0, "Bid ceiling cannot be negative").optional(),
  geoBidMultipliers: z.record(z.string(), z.number().min(0.1).max(10)).optional(),
  performanceBidAdjustment: z.boolean().optional(),
  targetConversionRate: z.number().min(0, "Conversion rate cannot be negative").max(100, "Conversion rate cannot exceed 100%").optional(),
  maxCostPerAcquisition: z.number().min(0, "Cost per acquisition cannot be negative").optional(),
  bidAdjustmentFrequency: z.number().min(300, "Frequency must be at least 300 seconds").max(86400, "Frequency cannot exceed 86400 seconds").optional(),
  enableAutoBidding: z.boolean().optional(),
  
  // Phase 2: Geographic Targeting
  allowedStates: z.array(z.string().length(2, "State codes must be 2 characters")).optional(),
  blockedStates: z.array(z.string().length(2, "State codes must be 2 characters")).optional(),
  allowedZipCodes: z.array(z.string().min(5, "Zip codes must be at least 5 characters").max(10, "Zip codes cannot exceed 10 characters")).optional(),
  blockedZipCodes: z.array(z.string().min(5, "Zip codes must be at least 5 characters").max(10, "Zip codes cannot exceed 10 characters")).optional(),
  allowedAreaCodes: z.array(z.string().length(3, "Area codes must be 3 characters")).optional(),
  blockedAreaCodes: z.array(z.string().length(3, "Area codes must be 3 characters")).optional(),
  geoRadius: z.number().min(1, "Geo radius must be at least 1 mile").max(1000, "Geo radius cannot exceed 1000 miles").optional(),
  geoCenter: z.object({
    lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
    lng: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
    city: z.string().optional(),
    state: z.string().length(2, "State code must be 2 characters").optional(),
  }).optional(),
  enableGeoTargeting: z.boolean().optional(),
  geoTargetingMode: z.enum(["inclusive", "exclusive"], {
    errorMap: () => ({ message: "Geo targeting mode must be 'inclusive' or 'exclusive'" })
  }).optional(),
  
  // Phase 3: Advanced Filtering
  qualityScoreThreshold: z.number().min(0, "Quality score must be between 0 and 100").max(100, "Quality score must be between 0 and 100").optional(),
  enableCallerHistory: z.boolean().optional(),
  callerHistoryDays: z.number().min(1, "History days must be at least 1").max(365, "History days cannot exceed 365").optional(),
  maxCallsPerCaller: z.number().min(0, "Max calls per caller cannot be negative").optional(),
  maxCallsPerCallerPeriod: z.enum(["day", "week", "month"], {
    errorMap: () => ({ message: "Period must be 'day', 'week', or 'month'" })
  }).optional(),
  blockedCallerIds: z.array(z.string().min(10, "Caller ID must be at least 10 digits").max(15, "Caller ID cannot exceed 15 digits")).optional(),
  enableTimeBasedFiltering: z.boolean().optional(),
  allowedTimeRanges: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    timezone: z.string().optional(),
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  })).optional(),
  blockedTimeRanges: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    timezone: z.string().optional(),
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).optional(),
  })).optional(),
  enableCallDurationFiltering: z.boolean().optional(),
  minCallDuration: z.number().min(0, "Min call duration cannot be negative").optional(),
  maxCallDuration: z.number().min(0, "Max call duration cannot be negative").optional(),
  enableDeviceTypeFiltering: z.boolean().optional(),
  allowedDeviceTypes: z.array(z.enum(["mobile", "landline", "voip", "payphone", "blocked"])).optional(),
  blockedDeviceTypes: z.array(z.enum(["mobile", "landline", "voip", "payphone", "blocked"])).optional(),
  enableCustomFiltering: z.boolean().optional(),
  customFilteringRules: z.array(z.object({
    name: z.string().min(1, "Rule name is required"),
    condition: z.string().min(1, "Condition is required"),
    action: z.enum(["allow", "block", "adjust_bid"]),
    value: z.any().optional(),
  })).optional(),
});

type RtbRouter = {
  id: number;
  name: string;
  description?: string;
  biddingTimeoutMs: number;
  minBiddersRequired: number;
  enablePredictiveRouting: boolean;
  revenueType: string;
  conversionTracking: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RtbTarget = {
  id: number;
  name: string;
  companyName?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  endpointUrl: string;
  timeoutMs: number;
  connectionTimeout: number;
  authMethod: string;
  authToken?: string;
  timezone: string;
  isActive: boolean;
  maxConcurrentCalls: number;
  dailyCap: number;
  hourlyCap: number;
  monthlyCap: number;
  minBidAmount: number;
  maxBidAmount: number;
  currency: string;
  totalPings: number;
  successfulBids: number;
  wonCalls: number;
  createdAt: string;
  updatedAt: string;
  
  // Phase 1: Advanced Bidding Features
  bidStrategy?: string;
  bidFloor?: number;
  bidCeiling?: number;
  geoBidMultipliers?: Record<string, number>;
  performanceBidAdjustment?: boolean;
  targetConversionRate?: number;
  maxCostPerAcquisition?: number;
  bidAdjustmentFrequency?: number;
  enableAutoBidding?: boolean;
  
  // Phase 2: Geographic Targeting
  allowedStates?: string[];
  blockedStates?: string[];
  allowedZipCodes?: string[];
  blockedZipCodes?: string[];
  allowedAreaCodes?: string[];
  blockedAreaCodes?: string[];
  geoRadius?: number;
  geoCenter?: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  };
  enableGeoTargeting?: boolean;
  geoTargetingMode?: string;
  
  // Phase 3: Advanced Filtering
  qualityScoreThreshold?: number;
  enableCallerHistory?: boolean;
  callerHistoryDays?: number;
  maxCallsPerCaller?: number;
  maxCallsPerCallerPeriod?: string;
  blockedCallerIds?: string[];
  enableTimeBasedFiltering?: boolean;
  allowedTimeRanges?: Array<{
    start: string;
    end: string;
    timezone?: string;
    days?: string[];
  }>;
  blockedTimeRanges?: Array<{
    start: string;
    end: string;
    timezone?: string;
    days?: string[];
  }>;
  enableCallDurationFiltering?: boolean;
  minCallDuration?: number;
  maxCallDuration?: number;
  enableDeviceTypeFiltering?: boolean;
  allowedDeviceTypes?: string[];
  blockedDeviceTypes?: string[];
  enableCustomFiltering?: boolean;
  customFilteringRules?: Array<{
    name: string;
    condition: string;
    action: string;
    value?: any;
  }>;
};

type RtbBidRequest = {
  id: number;
  requestId: string;
  campaignId: number;
  callerId?: string;
  callStartTime: string;
  totalTargetsPinged: number;
  successfulResponses: number;
  winningBidAmount?: number;
  winningTargetId?: number;
  totalResponseTimeMs?: number;
  createdAt: string;
  campaign?: {
    id: number;
    name: string;
  };
};

type RtbBidResponse = {
  id: number;
  requestId: string;
  rtbTargetId: number;
  bidAmount: string;
  bidCurrency: string;
  requiredDuration: number;
  destinationNumber: string;
  responseTimeMs: number;
  responseStatus: string;
  errorMessage?: string;
  isValid: boolean;
  isWinningBid: boolean;
  rejectionReason?: string;
  createdAt: string;
  rtbTarget?: {
    id: number;
    name: string;
    buyerId: number;
  };
};

// Detailed Bid Requests Table Component
const BidRequestsTable = ({ bidRequests, campaigns }: { bidRequests: RtbBidRequest[], campaigns: any[] }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [bidResponses, setBidResponses] = useState<{[key: string]: RtbBidResponse[]}>({});

  // Fetch RTB targets for name lookup
  const { data: rtbTargets } = useQuery<RtbTarget[]>({
    queryKey: ['/api/rtb/targets'],
  });

  // Helper function to get campaign name
  const getCampaignName = (campaignId: number) => {
    const campaign = campaigns?.find(c => c.id === campaignId);
    return campaign ? campaign.name : `Campaign ${campaignId}`;
  };

  // Helper function to get target name
  const getTargetName = (targetId: number) => {
    const target = rtbTargets?.find(t => t.id === targetId);
    return target ? target.name : `Target ${targetId}`;
  };

  const toggleRowExpansion = async (requestId: string, id: number) => {
    const newExpandedRows = new Set(expandedRows);
    
    if (expandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
      
      // Fetch bid responses for this request if not already loaded
      if (!bidResponses[requestId]) {
        try {
          const response = await fetch(`/api/rtb/bid-requests/${requestId}/responses`);
          if (response.ok) {
            const responses = await response.json();
            setBidResponses(prev => ({ ...prev, [requestId]: responses }));
          }
        } catch (error) {
          console.error('Failed to fetch bid responses:', error);
        }
      }
    }
    
    setExpandedRows(newExpandedRows);
  };

  return (
    <div className="space-y-2">
      {bidRequests?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No bid requests found.
        </div>
      ) : (
        bidRequests?.slice(0, 10).map((request: RtbBidRequest) => (
          <div key={request.id} className="border rounded-lg">
            {/* Main Row */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleRowExpansion(request.requestId, request.id)}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  {expandedRows.has(request.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="grid grid-cols-6 gap-4 flex-1">
                  <div>
                    <div className="font-mono text-sm font-medium">{request.requestId.split('_').pop()}</div>
                    <div className="text-xs text-muted-foreground">Request ID</div>
                  </div>
                  
                  <div>
                    <div className="font-medium">{getCampaignName(request.campaignId)}</div>
                    <div className="text-xs text-muted-foreground">{request.callerId || 'Unknown'}</div>
                  </div>
                  
                  <div>
                    <Badge variant="outline">
                      {request.successfulResponses}/{request.totalTargetsPinged}
                    </Badge>
                    <div className="text-xs text-muted-foreground">Responses</div>
                  </div>
                  
                  <div>
                    {request.winningBidAmount ? (
                      <div className="text-green-600 font-medium">
                        ${typeof request.winningBidAmount === 'number' ? request.winningBidAmount.toFixed(2) : parseFloat(request.winningBidAmount || '0').toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No bid</div>
                    )}
                    <div className="text-xs text-muted-foreground">Winning Bid</div>
                  </div>
                  
                  <div>
                    <div className="font-medium">
                      {request.totalResponseTimeMs ? `${request.totalResponseTimeMs}ms` : '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">Response Time</div>
                  </div>
                  
                  <div>
                    <div className="font-medium">
                      {new Date(request.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Time</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expanded Details */}
            {expandedRows.has(request.id) && (
              <div className="border-t bg-muted/30 p-4">
                <div className="space-y-4">
                  {/* Auction Summary */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Auction ID</div>
                      <div className="font-mono">{request.requestId}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Call Start</div>
                      <div>{new Date(request.callStartTime).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Winning Target</div>
                      <div>{request.winningTargetId ? getTargetName(request.winningTargetId) : 'None'}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Total Duration</div>
                      <div>{request.totalResponseTimeMs}ms</div>
                    </div>
                  </div>
                  
                  {/* Individual Bid Responses */}
                  <div>
                    <div className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Individual Bid Responses
                    </div>
                    
                    {bidResponses[request.requestId] ? (
                      <div className="space-y-2">
                        {bidResponses[request.requestId].map((response: RtbBidResponse) => (
                          <div 
                            key={response.id} 
                            className={`p-3 rounded border-l-4 ${
                              response.isWinningBid 
                                ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' 
                                : 'border-l-gray-300 bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div className="grid grid-cols-6 gap-4 text-sm">
                              <div>
                                <div className="font-medium">
                                  {getTargetName(response.rtbTargetId)}
                                  {response.isWinningBid && (
                                    <Badge variant="default" className="ml-2 text-xs">WINNER</Badge>
                                  )}
                                </div>
                                <div className="text-muted-foreground">
                                  {response.responseStatus}
                                </div>
                              </div>
                              
                              <div>
                                <div className="font-medium text-green-600">
                                  ${parseFloat(response.bidAmount).toFixed(2)}
                                </div>
                                <div className="text-muted-foreground">{response.bidCurrency}</div>
                              </div>
                              
                              <div>
                                <div className="font-medium flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {response.responseTimeMs}ms
                                </div>
                                <div className="text-muted-foreground">Response Time</div>
                              </div>
                              
                              <div>
                                <div className="font-medium flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {response.destinationNumber}
                                </div>
                                <div className="text-muted-foreground">Destination</div>
                              </div>
                              
                              <div>
                                <div className="font-medium">{response.requiredDuration}s</div>
                                <div className="text-muted-foreground">Min Duration</div>
                              </div>
                              
                              <div>
                                <div className="font-medium">
                                  {response.isValid ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                                <div className="text-muted-foreground">Valid</div>
                              </div>
                            </div>
                            
                            {response.errorMessage && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600">
                                Error: {response.errorMessage}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mx-auto mb-2"></div>
                        Loading bid responses...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// RTB Routers Component
const RTBRoutersTab = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRouter, setEditingRouter] = useState<RtbRouter | null>(null);
  const [targetAssignments, setTargetAssignments] = useState<{[key: number]: {priority: number, active: boolean}}>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: routers = [], isLoading } = useQuery({
    queryKey: ['/api/rtb/routers'],
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['/api/rtb/targets'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/rtb/router-assignments'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rtbRouterSchema>) => {
      const response = await fetch('/api/rtb/routers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create RTB router');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/routers'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "RTB router created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, assignments }: { 
      id: number; 
      data: Partial<z.infer<typeof rtbRouterSchema>>; 
      assignments?: Array<{targetId: number, priority: number, isActive: boolean}>
    }) => {
      // Update router
      const routerResponse = await fetch(`/api/rtb/routers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!routerResponse.ok) {
        throw new Error('Failed to update RTB router');
      }
      
      // Update assignments if provided
      if (assignments) {
        const assignmentResponse = await fetch(`/api/rtb/routers/${id}/assignments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments }),
        });
        if (!assignmentResponse.ok) {
          throw new Error('Failed to update router assignments');
        }
      }
      
      return routerResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/routers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/router-assignments'] });
      setEditingRouter(null);
      setTargetAssignments({});
      toast({ title: "Success", description: "RTB router updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/rtb/routers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.campaigns) {
          // Router is in use by campaigns
          const campaignNames = errorData.campaigns.map((c: any) => c.name).join(', ');
          throw new Error(`Cannot delete router: ${errorData.reason}. Campaigns using this router: ${campaignNames}. ${errorData.suggestion}`);
        }
        throw new Error(errorData.error || 'Failed to delete RTB router');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/routers'] });
      toast({ title: "Success", description: "RTB router deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Cannot Delete RTB Router", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const form = useForm<z.infer<typeof rtbRouterSchema>>({
    resolver: zodResolver(rtbRouterSchema),
    defaultValues: {
      name: "",
      description: "",
      biddingTimeoutMs: 3000,
      minBiddersRequired: 1,
      enablePredictiveRouting: false,
      revenueType: "per_call",
      conversionTracking: false,
      isActive: true,
    },
  });

  const onSubmit = async (data: z.infer<typeof rtbRouterSchema>) => {
    if (editingRouter) {
      // Update router and assignments
      updateMutation.mutate({ 
        id: editingRouter.id, 
        data, 
        assignments: Object.entries(targetAssignments).map(([targetId, config]) => ({
          targetId: parseInt(targetId),
          priority: config.priority,
          isActive: config.active
        }))
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (router: RtbRouter) => {
    setEditingRouter(router);
    form.reset({
      name: router.name,
      description: router.description || "",
      biddingTimeoutMs: router.biddingTimeoutMs,
      minBiddersRequired: router.minBiddersRequired,
      enablePredictiveRouting: router.enablePredictiveRouting,
      revenueType: router.revenueType as "per_call" | "per_minute" | "cpa" | "cpl",
      conversionTracking: router.conversionTracking,
      isActive: router.isActive,
    });
    
    // Load current assignments for this router
    const routerAssignments = assignments.filter((a: any) => a.rtbRouterId === router.id);
    const assignmentMap: {[key: number]: {priority: number, active: boolean}} = {};
    routerAssignments.forEach((assignment: any) => {
      assignmentMap[assignment.rtbTargetId] = {
        priority: assignment.priority || 1,
        active: assignment.isActive || false
      };
    });
    setTargetAssignments(assignmentMap);
  };

  const handleCloseDialog = () => {
    console.log('Closing dialog, setting state to false');
    setIsCreateDialogOpen(false);
    setEditingRouter(null);
    setTargetAssignments({});
    form.reset();
  };

  const getTargetsCount = (routerId: number) => {
    // This would need to be implemented with router assignments
    return 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">RTB Routers</h3>
          <p className="text-sm text-muted-foreground">
            Manage your real-time bidding router configurations
          </p>
        </div>
        <Button onClick={() => {
          console.log('Create Router button clicked, setting state to true');
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Router
        </Button>
        
        <Dialog open={isCreateDialogOpen || !!editingRouter} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRouter ? "Edit RTB Router" : "Create RTB Router"}
              </DialogTitle>
              <DialogDescription>
                Configure a new RTB router to manage bidding targets and auction settings.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Router Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Insurance RTB Router" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="biddingTimeoutMs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bidding Timeout (ms)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="3000" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minBiddersRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Bidders Required</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="revenueType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select revenue type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="per_call">Per Call</SelectItem>
                          <SelectItem value="per_minute">Per Minute</SelectItem>
                          <SelectItem value="cpa">Cost Per Acquisition</SelectItem>
                          <SelectItem value="cpl">Cost Per Lead</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enablePredictiveRouting"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Predictive Routing</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Use machine learning to optimize routing decisions
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conversionTracking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Conversion Tracking</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Track conversion rates and optimize performance
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this router for live bidding
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Target Assignment Section */}
                {editingRouter && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3">Target Assignments</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Select targets to assign to this router and set their priority order
                      </p>
                      
                      {Array.isArray(targets) && targets.length > 0 ? (
                        <div className="space-y-3">
                          {targets.map((target: RtbTarget) => {
                            const currentAssignment = assignments.find(
                              (a: any) => a.rtbTargetId === target.id && a.rtbRouterId === editingRouter?.id
                            );
                            const isAssigned = !!currentAssignment || !!targetAssignments[target.id]?.active;
                            const currentPriority = targetAssignments[target.id]?.priority || currentAssignment?.priority || 1;
                            
                            return (
                              <div key={target.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                <input
                                  type="checkbox"
                                  id={`target-${target.id}`}
                                  checked={isAssigned}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setTargetAssignments(prev => ({
                                      ...prev,
                                      [target.id]: checked 
                                        ? { priority: currentPriority, active: true }
                                        : { priority: 1, active: false }
                                    }));
                                  }}
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                                <div className="flex-1">
                                  <label htmlFor={`target-${target.id}`} className="text-sm font-medium cursor-pointer">
                                    {target.name}
                                  </label>
                                  <div className="text-xs text-muted-foreground">
                                    Company: {target.companyName || 'Not specified'}
                                  </div>
                                </div>
                                {isAssigned && (
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-muted-foreground">Priority:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="99"
                                      value={currentPriority}
                                      onChange={(e) => {
                                        const priority = parseInt(e.target.value) || 1;
                                        setTargetAssignments(prev => ({
                                          ...prev,
                                          [target.id]: { 
                                            priority, 
                                            active: true
                                          }
                                        }));
                                      }}
                                      className="w-16 px-2 py-1 text-xs border rounded"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No RTB targets available. Create targets first to assign them to routers.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Router"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active RTB Routers</CardTitle>
          <CardDescription>
            Manage your real-time bidding router configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Timeout</TableHead>
                <TableHead>Revenue Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!Array.isArray(routers) || routers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No RTB routers found. Create your first router to get started.
                  </TableCell>
                </TableRow>
              ) : (
                routers.map((router: RtbRouter) => (
                  <TableRow key={router.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{router.name}</div>
                        {router.description && (
                          <div className="text-sm text-muted-foreground">{router.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getTargetsCount(router.id)} targets
                      </Badge>
                    </TableCell>
                    <TableCell>{router.biddingTimeoutMs}ms</TableCell>
                    <TableCell className="capitalize">{router.revenueType.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={router.isActive ? "default" : "secondary"}>
                        {router.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(router)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(router.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// RTB Targets Component
const RTBTargetsTab = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<RtbTarget | null>(null);
  const [testingTarget, setTestingTarget] = useState<RtbTarget | null>(null);
  const [advancedBiddingTarget, setAdvancedBiddingTarget] = useState<RtbTarget | null>(null);
  const [isAdvancedBiddingDialogOpen, setIsAdvancedBiddingDialogOpen] = useState(false);
  const [geographicTargetingTarget, setGeographicTargetingTarget] = useState<RtbTarget | null>(null);
  const [isGeographicTargetingDialogOpen, setIsGeographicTargetingDialogOpen] = useState(false);
  const [advancedFilteringTarget, setAdvancedFilteringTarget] = useState<RtbTarget | null>(null);
  const [isAdvancedFilteringDialogOpen, setIsAdvancedFilteringDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['/api/rtb/targets'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rtbTargetSchema>) => {
      const response = await fetch('/api/rtb/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create RTB target');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "RTB target created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<z.infer<typeof rtbTargetSchema>> }) => {
      const response = await fetch(`/api/rtb/targets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update RTB target');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      setEditingTarget(null);
      toast({ title: "Success", description: "RTB target updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const advancedBiddingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/rtb/targets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update advanced bidding configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      setAdvancedBiddingTarget(null);
      setIsAdvancedBiddingDialogOpen(false);
      toast({ title: "Success", description: "Advanced bidding configuration updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/rtb/targets/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete RTB target');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      toast({ title: "Success", description: "RTB target deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/rtb/targets/clear-all', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear all RTB targets');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      toast({ title: "Success", description: "All RTB targets cleared successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (target: RtbTarget) => {
      // Simulate a test bid request
      const testPayload = {
        requestId: `test_${Date.now()}`,
        campaignId: 1,
        callerId: '+1234567890',
        callStartTime: new Date().toISOString(),
        timeout: target.timeoutMs,
        minBid: target.minBidAmount,
        maxBid: target.maxBidAmount,
        currency: target.currency
      };

      const response = await fetch(target.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(target.authMethod === 'api_key' && target.authToken ? { 'X-API-Key': target.authToken } : {}),
          ...(target.authMethod === 'bearer' && target.authToken ? { 'Authorization': `Bearer ${target.authToken}` } : {}),
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Test Successful", 
        description: `Target responded with bid: $${data.bidAmount || 'N/A'}` 
      });
      setTestingTarget(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Test Failed", 
        description: error.message,
        variant: "destructive" 
      });
      setTestingTarget(null);
    },
  });

  const form = useForm<z.infer<typeof rtbTargetSchema>>({
    resolver: zodResolver(rtbTargetSchema),
    defaultValues: {
      name: "",
      companyName: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      endpointUrl: "",
      timeoutMs: 3000,
      connectionTimeout: 5000,
      authMethod: "none",
      authToken: "",
      timezone: "UTC",
      isActive: true,
      maxConcurrentCalls: 10,
      dailyCap: 100,
      hourlyCap: 10,
      monthlyCap: 3000,
      minBidAmount: 0,
      maxBidAmount: 100,
      currency: "USD",
    },
  });

  const onSubmit = (data: z.infer<typeof rtbTargetSchema>) => {
    if (editingTarget) {
      updateMutation.mutate({ id: editingTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (target: RtbTarget) => {
    setEditingTarget(target);
    form.reset({
      name: target.name,
      companyName: target.companyName || "",
      contactPerson: target.contactPerson || "",
      contactEmail: target.contactEmail || "",
      contactPhone: target.contactPhone || "",
      endpointUrl: target.endpointUrl,
      timeoutMs: target.timeoutMs,
      connectionTimeout: target.connectionTimeout,
      authMethod: target.authMethod as "none" | "api_key" | "bearer" | "basic",
      authToken: target.authToken || "",
      timezone: target.timezone,
      isActive: target.isActive,
      maxConcurrentCalls: target.maxConcurrentCalls,
      dailyCap: target.dailyCap,
      hourlyCap: target.hourlyCap,
      monthlyCap: target.monthlyCap,
      minBidAmount: target.minBidAmount,
      maxBidAmount: target.maxBidAmount,
      currency: target.currency,
    });
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTarget(null);
    form.reset();
  };

  const handleTest = (target: RtbTarget) => {
    setTestingTarget(target);
    testMutation.mutate(target);
  };

  const handleClearAllTargets = () => {
    if (confirm('Are you sure you want to delete all RTB targets? This action cannot be undone.')) {
      clearAllMutation.mutate();
    }
  };

  const handleAdvancedBiddingSave = (data: any) => {
    if (advancedBiddingTarget) {
      advancedBiddingMutation.mutate({ 
        id: advancedBiddingTarget.id, 
        data 
      });
    }
  };

  const handleGeographicTargetingSave = (data: any) => {
    if (geographicTargetingTarget) {
      const mutationData = {
        ...geographicTargetingTarget,
        ...data,
      };
      
      apiRequest(`/api/rtb/targets/${geographicTargetingTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify(mutationData),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
        toast({
          title: "Success",
          description: "Geographic targeting configuration saved successfully",
        });
        setIsGeographicTargetingDialogOpen(false);
        setGeographicTargetingTarget(null);
      }).catch(error => {
        console.error('Error saving geographic targeting configuration:', error);
        toast({
          title: "Error",
          description: "Failed to save geographic targeting configuration",
          variant: "destructive",
        });
      });
    }
  };

  const handleAdvancedFilteringSave = (data: any) => {
    if (advancedFilteringTarget) {
      const mutationData = {
        ...advancedFilteringTarget,
        ...data,
      };
      
      apiRequest(`/api/rtb/targets/${advancedFilteringTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify(mutationData),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
        toast({
          title: "Success",
          description: "Advanced filtering configuration saved successfully",
        });
        setIsAdvancedFilteringDialogOpen(false);
        setAdvancedFilteringTarget(null);
      }).catch(error => {
        console.error('Error saving advanced filtering configuration:', error);
        toast({
          title: "Error",
          description: "Failed to save advanced filtering configuration",
          variant: "destructive",
        });
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">RTB Targets</h3>
          <p className="text-sm text-muted-foreground">
            Manage bidding targets and their endpoint configurations
          </p>
        </div>
        <div className="flex gap-2">
          {Array.isArray(targets) && targets.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearAllTargets}
              disabled={clearAllMutation.isPending}
            >
              {clearAllMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </>
              )}
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create RTB Target
          </Button>
        </div>
      </div>
      
      <EnhancedRTBTargetDialog
        open={isCreateDialogOpen || !!editingTarget}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
        onSubmit={onSubmit}
        editingTarget={editingTarget}
      />

      <Phase1AdvancedBiddingDialog
        open={isAdvancedBiddingDialogOpen}
        onOpenChange={setIsAdvancedBiddingDialogOpen}
        target={advancedBiddingTarget}
        onSave={handleAdvancedBiddingSave}
      />

      <Phase2GeographicTargetingDialog
        open={isGeographicTargetingDialogOpen}
        onOpenChange={setIsGeographicTargetingDialogOpen}
        target={geographicTargetingTarget}
        onSave={handleGeographicTargetingSave}
      />
      
      <Phase3AdvancedFilteringDialog
        isOpen={isAdvancedFilteringDialogOpen}
        onClose={() => setIsAdvancedFilteringDialogOpen(false)}
        onSave={handleAdvancedFilteringSave}
        currentConfig={advancedFilteringTarget}
      />

      <Card>
        <CardHeader>
          <CardTitle>RTB Targets</CardTitle>
          <CardDescription>
            Manage your bidding targets and endpoint configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Live</TableHead>
                <TableHead>Hour</TableHead>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(targets) && targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No RTB targets found. Create your first target to get started.
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(targets) && targets.map((target: RtbTarget) => {
                  // No longer using buyer lookup - RTB targets are independent
                  return (
                    <TableRow key={target.id}>
                      <TableCell>
                        <div className="font-medium">{target.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Sub ID: {target.subId || 'None'}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          External Endpoint
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm truncate max-w-[200px]">
                          {target.endpointUrl}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {target.isActive ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm">
                            {target.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-center">
                          <div className="font-medium">{target.wonCalls || 0}</div>
                          <div className="text-muted-foreground text-xs">calls</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-center">
                          <div className="font-medium">{target.totalPings || 0}</div>
                          <div className="text-muted-foreground text-xs">total</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdvancedBiddingTarget(target);
                              setIsAdvancedBiddingDialogOpen(true);
                            }}
                            className="h-8 px-2"
                            title="Advanced Bidding Configuration"
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Advanced
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGeographicTargetingTarget(target);
                              setIsGeographicTargetingDialogOpen(true);
                            }}
                            className="h-8 px-2"
                            title="Geographic Targeting Configuration"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            Geographic
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdvancedFilteringTarget(target);
                              setIsAdvancedFilteringDialogOpen(true);
                            }}
                            className="h-8 px-2"
                            title="Advanced Filtering Configuration"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Filtering
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(target)}
                            disabled={testMutation.isPending && testingTarget?.id === target.id}
                            className="h-8 px-2"
                            title="Test Endpoint"
                          >
                            <TestTube className="w-4 h-4 mr-1" />
                            {testMutation.isPending && testingTarget?.id === target.id ? "Testing..." : "Test"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(target)}
                            className="h-8 px-2"
                            title="Edit Target"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(target.id)}
                            disabled={deleteMutation.isPending}
                            className="h-8 px-2"
                            title="Delete Target"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// RTB Overview Component with Setup Guidance
const RTBOverviewTab = () => {
  const { data: routers = [] } = useQuery({
    queryKey: ['/api/rtb/routers'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['/api/rtb/targets'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const { data: bidRequests = [] } = useQuery({
    queryKey: ['/api/rtb/bid-requests'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const totalRouters = routers?.length || 0;
  const totalTargets = targets?.length || 0;
  const totalRequests = bidRequests?.length || 0;
  const recentRequests = bidRequests?.slice(0, 3) || [];

  const isSetupComplete = totalRouters > 0 && totalTargets > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">RTB System Overview</h3>
        <p className="text-sm text-muted-foreground">
          Real-time bidding dashboard and setup guidance
        </p>
      </div>

      {/* Setup Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RTB Targets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTargets}</div>
            <p className="text-xs text-muted-foreground">
              {totalTargets > 0 ? 'Targets configured' : 'No targets yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RTB Routers</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRouters}</div>
            <p className="text-xs text-muted-foreground">
              {totalRouters > 0 ? 'Routers active' : 'No routers yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bid Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              Total RTB auctions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {isSetupComplete ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSetupComplete ? 'Ready' : 'Setup'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isSetupComplete ? 'RTB system operational' : 'Configuration needed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Setup Guide */}
      {!isSetupComplete && (
        <Card>
          <CardHeader>
            <CardTitle>RTB Setup Guide</CardTitle>
            <CardDescription>
              Follow these steps to configure your real-time bidding system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">1</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Create RTB Targets</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set up bidding endpoints for your buyers with bid ranges and timeouts
                  </p>
                  <Button size="sm" className="mt-2" variant="outline">
                    Go to RTB Targets <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">2</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Configure RTB Router</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a router and assign targets with priorities for bidding logic
                  </p>
                  <Button size="sm" className="mt-2" variant="outline">
                    Go to RTB Routers <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">3</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">Enable RTB on Campaign</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign your RTB router to campaigns for live bidding
                  </p>
                  <Button size="sm" className="mt-2" variant="outline">
                    Go to Campaigns <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent RTB Activity</CardTitle>
            <CardDescription>
              Latest bidding requests and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Request {request.requestId}</div>
                    <div className="text-xs text-muted-foreground">
                      {request.totalTargetsPinged} targets pinged • {request.totalResponseTimeMs}ms
                    </div>
                  </div>
                  <div className="text-right">
                    {request.winningBidAmount ? (
                      <div className="text-sm font-medium text-green-600">
                        ${request.winningBidAmount}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No bid</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// RTB Analytics Component
const RTBAnalyticsTab = ({ clearBidRequestsMutation }: { clearBidRequestsMutation: any }) => {
  const { data: bidRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/rtb/bid-requests'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['/api/rtb/targets'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  // Helper function to get campaign name
  const getCampaignName = (campaignId: number) => {
    const campaign = campaigns?.find(c => c.id === campaignId);
    return campaign ? campaign.name : `Campaign ${campaignId}`;
  };

  if (requestsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const totalRequests = bidRequests?.length || 0;
  const successfulRequests = bidRequests?.filter((req: RtbBidRequest) => req.winningBidAmount && req.winningBidAmount > 0).length || 0;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  const avgBidAmount = bidRequests?.length > 0 
    ? bidRequests
        .filter((req: RtbBidRequest) => req.winningBidAmount && req.winningBidAmount > 0)
        .reduce((sum: number, req: RtbBidRequest) => sum + (req.winningBidAmount || 0), 0) / successfulRequests
    : 0;
  const avgResponseTime = bidRequests?.length > 0
    ? bidRequests
        .filter((req: RtbBidRequest) => req.totalResponseTimeMs)
        .reduce((sum: number, req: RtbBidRequest) => sum + (req.totalResponseTimeMs || 0), 0) / bidRequests.filter((req: RtbBidRequest) => req.totalResponseTimeMs).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">RTB Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Monitor performance metrics and bidding activity
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Bid requests processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Successful bid auctions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Bid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgBidAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average winning bid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Average auction time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Target Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Target Performance</CardTitle>
          <CardDescription>
            Performance metrics for each RTB target
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Total Pings</TableHead>
                <TableHead>Successful Bids</TableHead>
                <TableHead>Won Calls</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No targets found.
                  </TableCell>
                </TableRow>
              ) : (
                targets?.map((target: RtbTarget) => {
                  const winRate = target.totalPings > 0 ? (target.wonCalls / target.totalPings) * 100 : 0;
                  return (
                    <TableRow key={target.id}>
                      <TableCell>
                        <div className="font-medium">{target.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${typeof target.minBidAmount === 'number' ? target.minBidAmount.toFixed(2) : parseFloat(target.minBidAmount || '0').toFixed(2)} - 
                          ${typeof target.maxBidAmount === 'number' ? target.maxBidAmount.toFixed(2) : parseFloat(target.maxBidAmount || '0').toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>{target.totalPings.toLocaleString()}</TableCell>
                      <TableCell>{target.successfulBids.toLocaleString()}</TableCell>
                      <TableCell>{target.wonCalls.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {winRate.toFixed(1)}%
                          {winRate > 10 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={target.isActive ? "default" : "secondary"}>
                          {target.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Bid Requests with Expandable Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Recent Bid Requests</CardTitle>
              <CardDescription>
                Latest RTB auction activity with detailed bidding breakdown
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearBidRequestsMutation.mutate()}
              disabled={clearBidRequestsMutation.isPending}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              {clearBidRequestsMutation.isPending ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Tie-Breaking Logic</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              When multiple bids have the same amount, the target with the <strong>fastest response time</strong> wins the auction. This encourages efficient bidding infrastructure.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <BidRequestsTable bidRequests={bidRequests} campaigns={campaigns} />
        </CardContent>
      </Card>
    </div>
  );
};

// Main RTB Management Component
export default function RTBManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for seeding sample data
  const seedDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/rtb/seed-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to create sample data');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sample Data Created",
        description: `Successfully created RTB sample data: ${data.data.targetsCreated} targets, ${data.data.bidRequestsCreated} bid requests`,
      });
      // Invalidate all RTB queries to refresh the interface
      queryClient.invalidateQueries({ queryKey: ['/api/rtb'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Sample Data",
        description: error.message || "Failed to create sample RTB data",
        variant: "destructive",
      });
    },
  });

  // Mutation for clearing bid requests
  const clearBidRequestsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/rtb/bid-requests/clear-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error('Failed to clear bid requests');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid Requests Cleared",
        description: "Successfully cleared all RTB bid requests and responses",
      });
      // Invalidate all RTB queries to refresh the interface
      queryClient.invalidateQueries({ queryKey: ['/api/rtb'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Clearing Bid Requests",
        description: error.message || "Failed to clear RTB bid requests",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">RTB Management</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedDataMutation.mutate()}
              disabled={seedDataMutation.isPending}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {seedDataMutation.isPending ? 'Creating...' : 'Seed Test Data'}
            </Button>
            <Badge variant="outline">Real-Time Bidding</Badge>
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="targets" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              RTB Targets
            </TabsTrigger>
            <TabsTrigger value="routers" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              RTB Routers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <RTBOverviewTab />
          </TabsContent>
          
          <TabsContent value="targets">
            <RTBTargetsTab />
          </TabsContent>
          
          <TabsContent value="routers">
            <RTBRoutersTab />
          </TabsContent>
          
          <TabsContent value="analytics">
            <RTBAnalyticsTab clearBidRequestsMutation={clearBidRequestsMutation} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}