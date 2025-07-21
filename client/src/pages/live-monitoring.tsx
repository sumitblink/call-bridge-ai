import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, PhoneCall, PhoneOff, Play, Pause, Volume2, 
  Users, Activity, Clock, TrendingUp, Eye, EyeOff,
  Headphones, Mic, MicOff, Speaker 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LiveCall {
  id: number;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  status: 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed';
  startTime: string;
  duration: number;
  campaignName: string;
  buyerName: string;
  buyerPhone: string;
  recordingUrl?: string;
  callQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  isMonitored: boolean;
  canWhisper: boolean;
}

interface AgentStatus {
  id: number;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  currentCall?: LiveCall;
  callsToday: number;
  avgCallDuration: number;
  successRate: number;
}

interface MonitoringStats {
  activeCalls: number;
  totalCallsToday: number;
  avgWaitTime: number;
  callSuccessRate: number;
  peakConcurrentCalls: number;
  activeAgents: number;
}

export default function LiveMonitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch live calls data
  const { data: liveCalls = [], isLoading: callsLoading } = useQuery<LiveCall[]>({
    queryKey: ["/api/monitoring/live-calls"],
    refetchInterval: autoRefresh ? 2000 : false, // Refresh every 2 seconds
  });

  // Fetch agent status data
  const { data: agentStatuses = [], isLoading: agentsLoading } = useQuery<AgentStatus[]>({
    queryKey: ["/api/monitoring/agent-status"],
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds
  });

  // Fetch monitoring stats
  const { data: stats, isLoading: statsLoading } = useQuery<MonitoringStats>({
    queryKey: ["/api/monitoring/stats"],
    refetchInterval: autoRefresh ? 3000 : false, // Refresh every 3 seconds
  });

  // Start monitoring a call
  const startMonitoringMutation = useMutation({
    mutationFn: async (callSid: string) => {
      const response = await apiRequest(`/api/monitoring/calls/${callSid}/monitor`, 'POST', {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Call Monitoring Started", description: "You are now monitoring this call." });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/live-calls"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start call monitoring.", variant: "destructive" });
    },
  });

  // Stop monitoring a call
  const stopMonitoringMutation = useMutation({
    mutationFn: async (callSid: string) => {
      const response = await apiRequest(`/api/monitoring/calls/${callSid}/monitor`, 'DELETE', {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Call Monitoring Stopped", description: "You are no longer monitoring this call." });
      setSelectedCall(null);
      setIsMonitoring(false);
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/live-calls"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to stop call monitoring.", variant: "destructive" });
    },
  });

  // Whisper to agent during call
  const whisperToAgentMutation = useMutation({
    mutationFn: async ({ callSid, message }: { callSid: string; message: string }) => {
      const response = await apiRequest(`/api/monitoring/calls/${callSid}/whisper`, 'POST', { message });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Whisper Sent", description: "Message sent to agent." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send whisper message.", variant: "destructive" });
    },
  });

  const handleMonitorCall = (call: LiveCall) => {
    setSelectedCall(call);
    if (!call.isMonitored) {
      startMonitoringMutation.mutate(call.callSid);
      setIsMonitoring(true);
    }
  };

  const handleStopMonitoring = () => {
    if (selectedCall) {
      stopMonitoringMutation.mutate(selectedCall.callSid);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'bg-green-500';
      case 'ringing': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'busy': return 'bg-orange-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'busy': return 'text-red-600 bg-red-50';
      case 'away': return 'text-yellow-600 bg-yellow-50';
      case 'offline': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Call Monitoring</h1>
            <p className="text-gray-600">Real-time view of active calls and agent performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center space-x-2"
            >
              <Activity className="h-4 w-4" />
              <span>{autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}</span>
            </Button>
          </div>
        </div>

        {/* Monitoring Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <PhoneCall className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Calls</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.activeCalls || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.activeAgents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.avgWaitTime || 0}s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.callSuccessRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Phone className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Calls Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalCallsToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Peak Concurrent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.peakConcurrentCalls || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="live-calls" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live-calls">Live Calls</TabsTrigger>
            <TabsTrigger value="agent-status">Agent Status</TabsTrigger>
            <TabsTrigger value="call-monitor">Call Monitor</TabsTrigger>
          </TabsList>

          {/* Live Calls Tab */}
          <TabsContent value="live-calls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Calls</CardTitle>
                <CardDescription>Real-time view of all active calls in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {callsLoading ? (
                  <div className="text-center py-8">Loading live calls...</div>
                ) : liveCalls.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No active calls</div>
                ) : (
                  <div className="space-y-4">
                    {liveCalls.map((call) => (
                      <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(call.status)}`} />
                          <div>
                            <p className="font-medium">{call.fromNumber} → {call.buyerName}</p>
                            <p className="text-sm text-gray-600">{call.campaignName}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatDuration(call.duration)}</p>
                            <Badge variant="outline" className="text-xs">
                              {call.status}
                            </Badge>
                          </div>
                          
                          {call.status === 'in-progress' && (
                            <Button
                              size="sm"
                              variant={call.isMonitored ? "destructive" : "default"}
                              onClick={() => call.isMonitored ? handleStopMonitoring() : handleMonitorCall(call)}
                              className="flex items-center space-x-1"
                            >
                              {call.isMonitored ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              <span>{call.isMonitored ? "Stop" : "Monitor"}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Status Tab */}
          <TabsContent value="agent-status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Status Dashboard</CardTitle>
                <CardDescription>Real-time agent availability and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {agentsLoading ? (
                  <div className="text-center py-8">Loading agent status...</div>
                ) : agentStatuses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No agents available</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agentStatuses.map((agent) => (
                      <Card key={agent.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{agent.name}</h3>
                            <Badge className={getAgentStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Calls Today:</span>
                              <span className="font-medium">{agent.callsToday}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Avg Duration:</span>
                              <span className="font-medium">{formatDuration(agent.avgCallDuration)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Success Rate:</span>
                              <span className="font-medium">{agent.successRate}%</span>
                            </div>
                          </div>

                          {agent.currentCall && (
                            <div className="mt-4 p-2 bg-green-50 rounded">
                              <p className="text-xs text-green-700 font-medium">On Call:</p>
                              <p className="text-xs text-green-600">{agent.currentCall.fromNumber}</p>
                              <p className="text-xs text-green-600">{formatDuration(agent.currentCall.duration)}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Call Monitor Tab */}
          <TabsContent value="call-monitor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Monitoring Console</CardTitle>
                <CardDescription>Listen to live calls and provide coaching to agents</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCall ? (
                  <div className="space-y-6">
                    {/* Call Details */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Monitoring Call</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>From:</strong> {selectedCall.fromNumber}</p>
                          <p><strong>To:</strong> {selectedCall.buyerName}</p>
                          <p><strong>Campaign:</strong> {selectedCall.campaignName}</p>
                        </div>
                        <div>
                          <p><strong>Duration:</strong> {formatDuration(selectedCall.duration)}</p>
                          <p><strong>Status:</strong> {selectedCall.status}</p>
                          <p><strong>Quality:</strong> {selectedCall.callQuality || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Monitoring Controls */}
                    <div className="flex items-center justify-center space-x-4">
                      <Button variant="outline" className="flex items-center space-x-2">
                        <Headphones className="h-4 w-4" />
                        <span>Listen Only</span>
                      </Button>
                      
                      <Button variant="outline" className="flex items-center space-x-2">
                        <Mic className="h-4 w-4" />
                        <span>Whisper to Agent</span>
                      </Button>
                      
                      <Button variant="outline" className="flex items-center space-x-2">
                        <Speaker className="h-4 w-4" />
                        <span>Join Conference</span>
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        onClick={handleStopMonitoring}
                        className="flex items-center space-x-2"
                      >
                        <PhoneOff className="h-4 w-4" />
                        <span>Stop Monitoring</span>
                      </Button>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex items-center justify-center space-x-4 p-4 border rounded-lg">
                      <Button size="sm" variant="outline">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }} />
                      </div>
                      <span className="text-sm text-gray-600">Volume</span>
                    </div>

                    {/* Call Recording */}
                    {selectedCall.recordingUrl && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Call Recording</h4>
                        <div className="flex items-center space-x-4">
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4" />
                          </Button>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '30%' }} />
                          </div>
                          <span className="text-sm text-gray-600">0:45 / 2:30</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PhoneCall className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select a call from the Live Calls tab to start monitoring</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}