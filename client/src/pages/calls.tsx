import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Clock, DollarSign, Users, Filter, Download, Play, Pause, Square, PhoneCall, Mic, MicOff, PhoneForwarded, History, Radio, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import CallDetailsAccordion from "@/components/CallDetailsAccordion";

interface Call {
  id: number;
  campaignId: number | null;
  buyerId: number | null;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  duration: number;
  status: string;
  callQuality: string | null;
  recordingUrl: string | null;
  recordingSid: string | null;
  recordingStatus: string | null;
  recordingDuration: number | null;
  transcription: string | null;
  transcriptionStatus: string | null;
  cost: string;
  revenue: string;
  geoLocation: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  status: string;
  phoneNumber: string | null;
  routingType: string;
  maxConcurrentCalls: number;
  callCap: number;
  geoTargeting: string[] | null;
  timeZoneRestriction: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Buyer {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  priority: number;
  dailyCap: number;
  concurrencyLimit: number;
  acceptanceRate: string;
  avgResponseTime: number | null;
  endpoint: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function CallsPage() {
  const [activeTab, setActiveTab] = useState("history");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { toast } = useToast();

  const { data: calls = [], isLoading: isLoadingCalls } = useQuery<Call[]>({
    queryKey: ["/api/calls"],
  });

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: buyers = [], isLoading: isLoadingBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
  });

  const filteredCalls = calls.filter(call => {
    const matchesStatus = statusFilter === "all" || call.status === statusFilter;
    const matchesCampaign = campaignFilter === "all" || call.campaignId?.toString() === campaignFilter;
    const matchesSearch = searchTerm === "" || 
      call.fromNumber.includes(searchTerm) || 
      call.toNumber.includes(searchTerm) ||
      call.callSid.includes(searchTerm);
    
    return matchesStatus && matchesCampaign && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "ringing": return "bg-blue-100 text-blue-800";
      case "in-progress": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      case "busy": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const liveCallsCount = calls.filter(call => ['ringing', 'in-progress'].includes(call.status)).length;
  const totalCallsToday = calls.filter(call => {
    const today = new Date().toDateString();
    return new Date(call.createdAt).toDateString() === today;
  }).length;

  const avgCallDuration = calls.length > 0 
    ? Math.round(calls.reduce((sum, call) => sum + call.duration, 0) / calls.length)
    : 0;

  const totalRevenue = calls.reduce((sum, call) => sum + parseFloat(call.revenue || "0"), 0);

  // Call recording mutations
  const startRecordingMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/recording/start`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      toast({ title: "Recording started successfully" });
    },
    onError: () => {
      toast({ title: "Failed to start recording", variant: "destructive" });
    }
  });

  const stopRecordingMutation = useMutation({
    mutationFn: async ({ callSid, recordingSid }: { callSid: string; recordingSid: string }) => 
      apiRequest(`/api/calls/${callSid}/recording/stop`, "POST", { recordingSid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      toast({ title: "Recording stopped successfully" });
    },
    onError: () => {
      toast({ title: "Failed to stop recording", variant: "destructive" });
    }
  });

  // Call control mutations
  const transferCallMutation = useMutation({
    mutationFn: async ({ callSid, targetNumber }: { callSid: string; targetNumber: string }) => 
      apiRequest(`/api/calls/${callSid}/transfer`, "POST", { targetNumber }),
    onSuccess: () => {
      toast({ title: "Call transfer initiated" });
    },
    onError: () => {
      toast({ title: "Failed to transfer call", variant: "destructive" });
    }
  });

  const holdCallMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/hold`, "POST"),
    onSuccess: () => {
      toast({ title: "Call placed on hold" });
    },
    onError: () => {
      toast({ title: "Failed to hold call", variant: "destructive" });
    }
  });

  const resumeCallMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/resume`, "POST"),
    onSuccess: () => {
      toast({ title: "Call resumed" });
    },
    onError: () => {
      toast({ title: "Failed to resume call", variant: "destructive" });
    }
  });

  const muteCallMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/mute`, "POST"),
    onSuccess: () => {
      toast({ title: "Call muted" });
    },
    onError: () => {
      toast({ title: "Failed to mute call", variant: "destructive" });
    }
  });

  const handleStartRecording = (callSid: string) => {
    startRecordingMutation.mutate(callSid);
  };

  const handleStopRecording = (callSid: string, recordingSid: string | null) => {
    if (recordingSid) {
      stopRecordingMutation.mutate({ callSid, recordingSid });
    }
  };

  const handleTransferCall = (callSid: string) => {
    const targetNumber = prompt("Enter phone number to transfer to:");
    if (targetNumber) {
      transferCallMutation.mutate({ callSid, targetNumber });
    }
  };

  const getRecordingStatusColor = (status: string | null) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "processing": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoadingCalls || isLoadingCampaigns || isLoadingBuyers) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Calls</h1>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Call History
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Live Calls
            </TabsTrigger>
            <TabsTrigger value="control" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Call Control
            </TabsTrigger>
          </TabsList>

          {/* Call History Tab */}
          <TabsContent value="history" className="space-y-6">

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Calls</CardTitle>
              <Phone className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{liveCallsCount}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCallsToday}</div>
              <p className="text-xs text-muted-foreground">Since midnight</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(avgCallDuration)}</div>
              <p className="text-xs text-muted-foreground">Per call</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search by phone, Call SID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ringing">Ringing</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                </SelectContent>
              </Select>

              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter("all");
                  setCampaignFilter("all");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Call List */}
        <Card>
          <CardHeader>
            <CardTitle>Call Activity ({filteredCalls.length})</CardTitle>
            <CardDescription>
              Real-time view of all calls with actions and monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCalls.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No calls found matching your filters</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCalls.map((call) => {
                  const campaign = campaigns.find((c) => c.id === call.campaignId);
                  const buyer = buyers.find((b) => b.id === call.buyerId);
                  return (
                    <CallDetailsAccordion
                      key={call.id}
                      call={call}
                      campaign={campaign}
                      buyer={buyer}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Live Calls Tab */}
          <TabsContent value="live" className="space-y-6">
            <Card>
              <CardContent className="text-center py-8">
                <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live Call Monitoring</h3>
                <p className="text-muted-foreground mb-4">
                  Real-time monitoring of active calls with live status updates.
                </p>
                <p className="text-sm text-muted-foreground">
                  {liveCallsCount} calls currently active
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Call Control Tab */}
          <TabsContent value="control" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Control Center</CardTitle>
                <CardDescription>
                  Advanced call management and control features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-16 flex flex-col gap-2">
                    <PhoneCall className="h-6 w-6" />
                    <span>Initiate Call</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <PhoneForwarded className="h-6 w-6" />
                    <span>Transfer Call</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col gap-2">
                    <Mic className="h-6 w-6" />
                    <span>Recording Controls</span>
                  </Button>
                </div>
                
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Call control features are available when calls are active.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}