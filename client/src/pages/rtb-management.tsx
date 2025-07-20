import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Edit, Trash2, Target, Activity, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Play, TestTube, Zap, Users, Settings, BarChart, ArrowRight, ChevronDown, ChevronRight, Eye, Timer, Phone, Globe, Grid3X3, List } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
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
  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Target operations
  const deleteMutation = useMutation({
    mutationFn: async (target: RtbTarget) => {
      const response = await fetch(`/api/rtb/targets/${target.id}`, {
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
      setDeleteingTarget(null);
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
    const campaign = campaigns?.find(c => c.id === campaignId);
    return campaign ? campaign.name : `Campaign ${campaignId}`;
  };

  // Helper function to get target name
  const getTargetName = (targetId: number) => {
    const target = targets?.find(t => t.id === targetId);
    return target ? target.name : `Target ${targetId}`;
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
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => clearAllMutation.mutate()}
                  disabled={clearAllMutation.isPending}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Targets View */}
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {targets.map((target) => (
                  <Card key={target.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{target.name}</CardTitle>
                          <CardDescription>{target.companyName || target.endpointUrl}</CardDescription>
                        </div>
                        <Badge 
                          variant={target.isActive ? 'default' : 'secondary'}
                          className={target.isActive ? 'bg-green-100 text-green-800' : ''}
                        >
                          {target.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bid Range:</span>
                          <span>${target.minBidAmount} - ${target.maxBidAmount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Daily Cap:</span>
                          <span>{target.dailyCap}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Success Rate:</span>
                          <span>
                            {target.totalPings > 0 
                              ? Math.round((target.successfulBids / target.totalPings) * 100)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(target)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPhase1Target(target);
                              setPhase1DialogOpen(true);
                            }}
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Bidding
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteingTarget(target)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
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
                                onClick={() => setDeleteingTarget(target)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Auction Activity</CardTitle>
                <CardDescription>RTB auction requests and responses</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Targets Pinged</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Winning Bid</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bidRequests.slice(0, 10).map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">
                          {request.requestId.slice(-8)}...
                        </TableCell>
                        <TableCell>{getCampaignName(request.campaignId)}</TableCell>
                        <TableCell>{request.totalTargetsPinged}</TableCell>
                        <TableCell>{request.successfulResponses}</TableCell>
                        <TableCell>
                          {request.winningTargetId 
                            ? getTargetName(request.winningTargetId)
                            : 'No winner'
                          }
                        </TableCell>
                        <TableCell>
                          {request.winningBidAmount ? `$${request.winningBidAmount}` : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <EnhancedRTBTargetDialog 
          open={isTargetDialogOpen}
          onOpenChange={handleCloseTargetDialog}
          target={editingTarget}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/rtb/targets'] });
            handleCloseTargetDialog();
          }}
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
          open={phase3DialogOpen}
          onOpenChange={setPhase3DialogOpen}
          target={phase3Target}
          onSave={(data) => {
            // Handle Phase 3 save
            setPhase3DialogOpen(false);
          }}
        />
      </div>
    </Layout>
  );
}