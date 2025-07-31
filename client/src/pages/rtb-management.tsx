import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EnhancedRTBTargetDialog } from "@/components/rtb/EnhancedRTBTargetDialog";
import { Phase1AdvancedBiddingDialog } from "@/components/rtb/Phase1AdvancedBiddingDialog";
import { Phase2GeographicTargetingDialog } from "@/components/rtb/Phase2GeographicTargetingDialog";
import Phase3AdvancedFilteringDialog from "@/components/rtb/Phase3AdvancedFilteringDialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Target, Activity, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Play, TestTube, Zap, Users, Settings, BarChart, ArrowRight, ChevronDown, ChevronRight, Eye, Timer, Phone, Globe, Info } from "lucide-react";

// RTB Target type
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
  destinationNumber?: string;
  createdAt: string;
  campaign?: {
    id: number;
    name: string;
  };
};

export default function SimplifiedRTBManagementPage() {
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<RtbTarget | null>(null);
  const [deletingTarget, setDeleteingTarget] = useState<RtbTarget | null>(null);
  const [phase1DialogOpen, setPhase1DialogOpen] = useState(false);
  const [phase1Target, setPhase1Target] = useState<RtbTarget | null>(null);
  const [phase2DialogOpen, setPhase2DialogOpen] = useState(false);
  const [phase2Target, setPhase2Target] = useState<RtbTarget | null>(null);
  const [phase3DialogOpen, setPhase3DialogOpen] = useState(false);
  const [phase3Target, setPhase3Target] = useState<RtbTarget | null>(null);
  const [expandedAuctions, setExpandedAuctions] = useState<Set<number>>(new Set());
  const [auctionDetails, setAuctionDetails] = useState<{[key: number]: any}>({});

  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch RTB targets
  const { data: targets = [], isLoading: isLoadingTargets } = useQuery<RtbTarget[]>({
    queryKey: ['/api/rtb/targets'],
  });

  // Fetch bid requests for analytics
  const { data: bidRequests = [], isLoading: isLoadingBidRequests } = useQuery<RtbBidRequest[]>({
    queryKey: ['/api/rtb/bid-requests'],
  });

  // Fetch campaigns for bid request lookup
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['/api/campaigns'],
  });

  // Target operations
  const deleteMutation = useMutation({
    mutationFn: async (target: RtbTarget) => {
      console.log(`[RTB Frontend] Starting deletion of target ${target.id} (${target.name})`);
      try {
        const response = await apiRequest(`/api/rtb/targets/${target.id}`, 'DELETE');
        console.log(`[RTB Frontend] Delete response status:`, response.status);
        const result = await response.json();
        console.log(`[RTB Frontend] Delete response data:`, result);
        return result;
      } catch (error) {
        console.error(`[RTB Frontend] Delete error:`, error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(`[RTB Frontend] Delete success:`, data);
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      toast({ title: "Success", description: "RTB target deleted successfully" });
      setDeleteingTarget(null);
    },
    onError: (error: any) => {
      console.error(`[RTB Frontend] Delete mutation error:`, error);
      toast({ 
        title: "Deletion Failed", 
        description: `Error: ${error.message}. Check browser console for details.`,
        variant: "destructive" 
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/rtb/targets/clear-all', 'DELETE');
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

  // Create RTB target mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = editingTarget ? 'PUT' : 'POST';
      const url = editingTarget ? `/api/rtb/targets/${editingTarget.id}` : '/api/rtb/targets';
      
      const response = await apiRequest(url, method, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
      toast({ 
        title: "Success", 
        description: `RTB target ${editingTarget ? 'updated' : 'created'} successfully` 
      });
      handleCloseTargetDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate metrics
  const totalTargets = targets.length;
  const activeTargets = targets.filter(t => t.isActive).length;
  const totalBidRequests = bidRequests.length;
  const recentBidRequests = bidRequests.filter(req => {
    const requestTime = new Date(req.createdAt);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return requestTime > dayAgo;
  }).length;

  // Helper function to get campaign name
  const getCampaignName = (campaignId: number) => {
    const campaign = campaigns?.find((c: any) => c.id === campaignId);
    return campaign ? campaign.name : `Campaign ${campaignId}`;
  };

  // Helper function to get target name
  const getTargetName = (targetId: number) => {
    const target = targets?.find(t => t.id === targetId);
    return target ? target.name : `Target ${targetId}`;
  };

  // Toggle auction row expansion
  const toggleAuctionRow = async (auctionId: number) => {
    const newExpanded = new Set(expandedAuctions);
    
    if (expandedAuctions.has(auctionId)) {
      newExpanded.delete(auctionId);
    } else {
      newExpanded.add(auctionId);
      
      // Fetch detailed auction data including individual bidder responses if not already cached
      if (!auctionDetails[auctionId]) {
        try {
          // Get the bid request first
          const bidRequest = bidRequests.find(req => req.id === auctionId);
          if (bidRequest) {
            // Fetch individual bid responses for this auction
            const response = await fetch(`/api/rtb/bid-requests/${bidRequest.requestId}/responses`);
            if (response.ok) {
              const bidResponses = await response.json();
              setAuctionDetails(prev => ({
                ...prev,
                [auctionId]: {
                  bidRequest,
                  bidResponses
                }
              }));
            }
          }
        } catch (error) {
          console.error("Failed to fetch auction details:", error);
        }
      }
    }
    
    setExpandedAuctions(newExpanded);
  };

  const openEditDialog = (target: RtbTarget) => {
    setEditingTarget(target);
    setIsTargetDialogOpen(true);
  };

  const handleCloseTargetDialog = () => {
    setIsTargetDialogOpen(false);
    setEditingTarget(null);
  };

  if (isLoadingTargets) {
    return (
      <Layout>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">RTB Management</h1>
            <p className="text-muted-foreground">
              Manage your real-time bidding targets and view auction analytics
            </p>
          </div>
          <Button onClick={() => setIsTargetDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add RTB Target
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTargets}</div>
              <p className="text-xs text-muted-foreground">
                {activeTargets} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bid Requests (24h)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentBidRequests}</div>
              <p className="text-xs text-muted-foreground">
                {totalBidRequests} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBidRequests > 0 
                  ? Math.round((bidRequests.filter(r => r.successfulResponses > 0).length / totalBidRequests) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Avg response rate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bidRequests.length > 0 
                  ? Math.round(
                      bidRequests.reduce((sum, req) => sum + (req.totalResponseTimeMs || 0), 0) / 
                      bidRequests.length
                    )
                  : 0}ms
              </div>
              <p className="text-xs text-muted-foreground">
                RTB auction timing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="targets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="targets">RTB Targets</TabsTrigger>
            <TabsTrigger value="analytics">Auction Analytics</TabsTrigger>
          </TabsList>

          {/* RTB Targets Tab */}
          <TabsContent value="targets" className="space-y-4">
            <div className="flex justify-end items-center">
              <Button 
                variant="outline" 
                onClick={() => clearAllMutation.mutate()}
                disabled={clearAllMutation.isPending}
              >
                Clear All
              </Button>
            </div>

            {/* RTB Targets Table */}
            <Card>
              <CardHeader>
                <CardTitle>RTB Targets</CardTitle>
                <CardDescription>Manage your real-time bidding endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bid Range</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map((target) => (
                      <TableRow key={target.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{target.name}</div>
                            <div className="text-sm text-muted-foreground">{target.endpointUrl}</div>
                          </div>
                        </TableCell>
                        <TableCell>{target.companyName || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={target.isActive ? 'default' : 'secondary'}
                            className={target.isActive ? 'bg-green-100 text-green-800' : ''}
                          >
                            {target.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>${target.minBidAmount} - ${target.maxBidAmount}</TableCell>
                        <TableCell>
                          {target.totalPings > 0 
                            ? Math.round((target.successfulBids / target.totalPings) * 100)
                            : 0}%
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(target)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log(`[RTB Frontend] Delete button clicked for target:`, target);
                                setDeleteingTarget(target);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Auction Activity</CardTitle>
                <CardDescription>RTB auction requests and responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-end items-center">
                  <Badge variant="secondary">
                    {bidRequests.length} Total Auctions
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="w-32">Request ID</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Caller ID</TableHead>
                        <TableHead>Call Start</TableHead>
                        <TableHead>Targets Pinged</TableHead>
                        <TableHead>Successful Bids</TableHead>
                        <TableHead>Failed Bids</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead>Winning Bid</TableHead>
                        <TableHead>Destination Number</TableHead>
                        <TableHead>Avg Response Time</TableHead>
                        <TableHead>Total Auction Time</TableHead>
                        <TableHead>Auction Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bidRequests.slice(0, 15).map((request) => {
                        const avgResponseTime = request.totalResponseTimeMs && request.successfulResponses 
                          ? Math.round(request.totalResponseTimeMs / request.successfulResponses)
                          : null;
                        const failedBids = request.totalTargetsPinged - request.successfulResponses;
                        const hasWinner = request.winningTargetId && request.winningBidAmount;
                        const isExpanded = expandedAuctions.has(request.id);
                        
                        return (
                          <React.Fragment key={request.id}>
                            <TableRow className="hover:bg-muted/50">
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAuctionRow(request.id)}
                                  className="p-1 h-6 w-6"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                              <div className="flex flex-col">
                                <span className="font-semibold">{request.requestId.slice(-8)}...</span>
                                <span className="text-muted-foreground text-[10px]">#{request.id}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{getCampaignName(request.campaignId)}</span>
                                <span className="text-muted-foreground text-xs">ID: {request.campaignId}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {request.callerId ? (
                                <div className="flex flex-col">
                                  <span>{request.callerId}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {request.callerId.startsWith('+1') ? 'US Number' : 'International'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not available</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex flex-col">
                                <span>{new Date(request.callStartTime).toLocaleTimeString()}</span>
                                <span className="text-muted-foreground text-xs">
                                  {new Date(request.callStartTime).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50">
                                <Target className="h-3 w-3 mr-1" />
                                {request.totalTargetsPinged}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {request.successfulResponses}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {failedBids > 0 ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {failedBids}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  0
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {request.winningTargetId 
                                    ? getTargetName(request.winningTargetId)
                                    : 'No winner'
                                  }
                                </span>
                                {request.winningTargetId && (
                                  <span className="text-muted-foreground text-xs">
                                    Target ID: {request.winningTargetId}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.winningBidAmount ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-green-600">
                                    ${request.winningBidAmount}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {((request.winningBidAmount / request.totalTargetsPinged) * 100).toFixed(0)}% above avg
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {request.destinationNumber ? (
                                <div className="flex flex-col">
                                  <span className="font-medium text-blue-600">
                                    {request.destinationNumber}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    External Route
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground">Not available</span>
                                  <span className="text-muted-foreground text-xs">No winner</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {avgResponseTime ? (
                                <div className="flex flex-col">
                                  <span className="font-medium">{avgResponseTime}ms</span>
                                  <span className={`text-xs ${avgResponseTime < 500 ? 'text-green-600' : avgResponseTime < 1000 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {avgResponseTime < 500 ? 'Fast' : avgResponseTime < 1000 ? 'Medium' : 'Slow'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {request.totalResponseTimeMs ? `${request.totalResponseTimeMs}ms` : '-'}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  Total duration
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={hasWinner ? "default" : "secondary"}
                                className={hasWinner ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                              >
                                {hasWinner ? "Won" : request.successfulResponses > 0 ? "No Winner" : "Failed"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expandable auction details row */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={15} className="bg-muted/30 border-t-0">
                                <div className="py-4 space-y-4">
                                  {/* Basic auction info header */}
                                  <div className="flex items-center space-x-4 pb-3 border-b border-border/40">
                                    <div className="flex items-center space-x-2">
                                      <Activity className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium">Auction Details</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      Request ID: {request.requestId}
                                    </Badge>
                                  </div>

                                  {/* Individual Bidder Results Table */}
                                  {auctionDetails[request.id]?.bidResponses && auctionDetails[request.id].bidResponses.length > 0 && (
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">Individual Bidder Results</span>
                                      </div>
                                      <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-gray-50">
                                              <TableHead className="text-xs">Bidder</TableHead>
                                              <TableHead className="text-xs">Bid Amount</TableHead>
                                              <TableHead className="text-xs">Response Time</TableHead>
                                              <TableHead className="text-xs">Destination</TableHead>
                                              <TableHead className="text-xs">Status</TableHead>
                                              <TableHead className="text-xs">Winner</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {auctionDetails[request.id].bidResponses
                                              .sort((a: any, b: any) => parseFloat(b.bidAmount) - parseFloat(a.bidAmount))
                                              .map((response: any, idx: number) => (
                                              <TableRow key={response.id} className="text-sm">
                                                <TableCell>
                                                  <div className="flex items-center space-x-2">
                                                    {response.isWinningBid && (
                                                      <div className="text-yellow-500">👑</div>
                                                    )}
                                                    <div>
                                                      <div className="font-medium">{getTargetName(response.rtbTargetId)}</div>
                                                      <div className="text-xs text-gray-500">ID: {response.rtbTargetId}</div>
                                                    </div>
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="font-semibold text-green-600">
                                                    ${parseFloat(response.bidAmount).toFixed(2)}
                                                  </div>
                                                  <div className="text-xs text-gray-500">{response.bidCurrency}</div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="font-mono text-sm">
                                                    {response.responseTimeMs}ms
                                                  </div>
                                                  <div className={`text-xs ${
                                                    response.responseTimeMs < 500 ? 'text-green-600' : 
                                                    response.responseTimeMs < 1000 ? 'text-yellow-600' : 'text-red-600'
                                                  }`}>
                                                    {response.responseTimeMs < 500 ? 'Fast' : 
                                                     response.responseTimeMs < 1000 ? 'Medium' : 'Slow'}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="font-mono text-blue-600 text-sm">
                                                    {response.destinationNumber}
                                                  </div>
                                                  <div className="text-xs text-gray-500">External Route</div>
                                                </TableCell>
                                                <TableCell>
                                                  <Badge 
                                                    variant={response.responseStatus === 'success' ? 'default' : 'destructive'}
                                                    className="text-xs"
                                                  >
                                                    {response.responseStatus}
                                                  </Badge>
                                                  {response.rejectionReason && (
                                                    <div className="text-xs text-red-600 mt-1">
                                                      {response.rejectionReason}
                                                    </div>
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {response.isWinningBid ? (
                                                    <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs">
                                                      🏆 Winner
                                                    </Badge>
                                                  ) : (
                                                    <span className="text-gray-400 text-xs">
                                                      #{idx + 1}
                                                    </span>
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Auction metrics grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Timing section */}
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">Auction Timing</span>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Call Start:</span>
                                          <span className="font-mono">{new Date(request.callStartTime).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Total Duration:</span>
                                          <span className="font-mono">{request.totalResponseTimeMs || 0}ms</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Avg Response:</span>
                                          <span className="font-mono">{avgResponseTime || 0}ms</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bidding statistics */}
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-2">
                                        <TrendingUp className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">Bid Statistics</span>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Targets Pinged:</span>
                                          <Badge variant="outline" className="text-xs">{request.totalTargetsPinged}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Successful Bids:</span>
                                          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">{request.successfulResponses}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Failed Bids:</span>
                                          <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">{failedBids}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Success Rate:</span>
                                          <span className="font-semibold">{request.totalTargetsPinged > 0 ? Math.round((request.successfulResponses / request.totalTargetsPinged) * 100) : 0}%</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Winner details */}
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">Auction Winner</span>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        {hasWinner ? (
                                          <>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Winner:</span>
                                              <span className="font-medium text-blue-600">{getTargetName(request.winningTargetId!)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Winning Bid:</span>
                                              <span className="font-semibold text-green-600">${request.winningBidAmount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Destination:</span>
                                              <span className="font-mono text-blue-600">{request.destinationNumber || 'N/A'}</span>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-center py-2">
                                            <span className="text-gray-500 italic">No auction winner</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Additional technical details */}
                                  <div className="pt-3 border-t border-border/40">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <Info className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm font-medium text-gray-700">Technical Details</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Campaign ID:</span>
                                          <span className="font-mono">{request.campaignId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Caller ID:</span>
                                          <span className="font-mono">{request.callerId || 'Not available'}</span>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Auction Status:</span>
                                          <Badge variant={hasWinner ? "default" : "secondary"}>
                                            {hasWinner ? "Won" : request.successfulResponses > 0 ? "No Winner" : "Failed"}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Created:</span>
                                          <span className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <EnhancedRTBTargetDialog 
          open={isTargetDialogOpen}
          onOpenChange={handleCloseTargetDialog}
          editingTarget={editingTarget}
          onSubmit={createMutation.mutateAsync}
        />

        <Phase1AdvancedBiddingDialog
          open={phase1DialogOpen}
          onOpenChange={setPhase1DialogOpen}
          target={phase1Target}
          onSave={(data) => {
            // Handle Phase 1 save
            setPhase1DialogOpen(false);
          }}
        />

        <Phase2GeographicTargetingDialog
          open={phase2DialogOpen}
          onOpenChange={setPhase2DialogOpen}
          target={phase2Target}
          onSave={(data) => {
            // Handle Phase 2 save
            setPhase2DialogOpen(false);
          }}
        />

        <Phase3AdvancedFilteringDialog
          isOpen={phase3DialogOpen}
          onClose={() => setPhase3DialogOpen(false)}
          onSave={(data) => {
            // Handle Phase 3 save
            setPhase3DialogOpen(false);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingTarget} onOpenChange={() => setDeleteingTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete RTB Target</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingTarget?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteingTarget(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  console.log(`[RTB Frontend] Confirming deletion of target:`, deletingTarget);
                  if (deletingTarget) {
                    deleteMutation.mutate(deletingTarget);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}