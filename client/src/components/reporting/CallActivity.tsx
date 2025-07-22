import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Clock, DollarSign, Users, Filter, Download, Play, Pause, Square, PhoneCall, Mic, MicOff, PhoneForwarded } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColumnCustomizer } from "./ColumnCustomizer";
import { getDefaultVisibleColumns, getColumnDefinition } from "@shared/column-definitions";
import { formatDistanceToNow } from "date-fns";

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

export default function CallActivity() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getDefaultVisibleColumns());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  
  const { toast } = useToast();

  const handleColumnsChange = (newVisibleColumns: string[]) => {
    setVisibleColumns(newVisibleColumns);
  };

  // Column resizing handlers
  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(column);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!tableRef.current) return;
      
      const rect = tableRef.current.getBoundingClientRect();
      const newWidth = Math.max(50, e.clientX - rect.left);
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Render column value based on column definition
  const renderColumnValue = (column: string, call: Call, campaign?: Campaign, buyer?: Buyer) => {
    const columnDef = getColumnDefinition(column);
    if (!columnDef) return <div className="truncate">-</div>;

    switch (column) {
      case 'inbound_call_id':
        return <div className="text-blue-600 font-mono text-xs">{call.id}</div>;
      case 'call_date':
        return <div className="text-xs">{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}</div>;
      case 'caller_id':
        return <div className="font-mono text-xs">{call.fromNumber}</div>;
      case 'dialed_number':
        return <div className="font-mono text-xs">{call.toNumber}</div>;
      case 'call_duration':
        return <div className="text-center">{Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}</div>;
      case 'call_status':
        return (
          <Badge variant={
            call.status === 'completed' ? 'default' :
            call.status === 'failed' ? 'destructive' :
            call.status === 'busy' ? 'secondary' : 'outline'
          }>
            {call.status}
          </Badge>
        );
      case 'call_revenue':
        return <div className="text-right text-green-600 font-medium">${parseFloat(call.revenue || '0').toFixed(2)}</div>;
      case 'call_cost':
        return <div className="text-right text-red-600">${parseFloat(call.cost || '0').toFixed(2)}</div>;
      case 'call_profit':
        const profit = parseFloat(call.revenue || '0') - parseFloat(call.cost || '0');
        return <div className="text-right font-medium">${profit.toFixed(2)}</div>;
      case 'recording_status':
        return call.recordingStatus ? <Badge variant="outline">{call.recordingStatus}</Badge> : <span className="text-gray-400">-</span>;
      case 'call_quality':
        return call.callQuality ? <Badge variant="secondary">{call.callQuality}</Badge> : <span className="text-gray-400">-</span>;
      case 'geo_location':
        return <div className="truncate">{call.geoLocation || '-'}</div>;
      case 'user_agent':
        return <div className="truncate text-xs">{call.userAgent || '-'}</div>;
      case 'recording_url':
        return call.recordingUrl ? (
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
            <Play className="h-3 w-3" />
          </Button>
        ) : <span className="text-gray-400">-</span>;
      case 'transcription':
        return call.transcription ? (
          <div className="truncate max-w-32 text-xs">{call.transcription}</div>
        ) : <span className="text-gray-400">-</span>;
      case 'campaign_name':
        return (
          <div className="flex flex-col">
            <span className="font-medium text-xs">{campaign?.name || 'Unknown'}</span>
            <span className="text-xs text-gray-400">ID: {call.campaignId}</span>
          </div>
        );
      case 'buyer_name':
        return (
          <div className="flex flex-col">
            {buyer ? (
              <>
                <span className="font-medium text-xs">{buyer.name}</span>
                <span className="text-xs text-gray-400">{buyer.phoneNumber}</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No buyer assigned</span>
            )}
          </div>
        );
      case 'actions':
        return (
          <div className="flex gap-1 flex-wrap">
            {call.status === 'in-progress' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => holdCallMutation.mutate(call.callSid)}
                  title="Hold Call"
                  className="h-6 w-6 p-0"
                >
                  <Pause className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => muteCallMutation.mutate(call.callSid)}
                  title="Mute Call"
                  className="h-6 w-6 p-0"
                >
                  <MicOff className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleTransferCall(call.callSid)}
                  title="Transfer Call"
                  className="h-6 w-6 p-0"
                >
                  <PhoneForwarded className="h-3 w-3" />
                </Button>
              </>
            )}
            
            {/* Recording Controls */}
            {call.status === 'in-progress' && !call.recordingSid && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleStartRecording(call.callSid)}
                title="Start Recording"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <Square className="h-3 w-3" />
              </Button>
            )}
            
            {call.recordingSid && call.recordingStatus === 'processing' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleStopRecording(call.callSid, call.recordingSid)}
                title="Stop Recording"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <Square className="h-3 w-3 fill-current" />
              </Button>
            )}
            
            {call.recordingUrl && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => call.recordingUrl && window.open(call.recordingUrl, '_blank')}
                title="Play Recording"
                className="h-6 w-6 p-0"
              >
                <Play className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      default:
        return <div className="truncate text-xs">-</div>;
    }
  };

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

  // Call control mutations
  const startRecordingMutation = useMutation({
    mutationFn: async (callSid: string) => apiRequest(`/api/calls/${callSid}/record`, "POST"),
    onSuccess: () => {
      toast({ title: "Recording started" });
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
    },
    onError: () => {
      toast({ title: "Failed to start recording", variant: "destructive" });
    }
  });

  const stopRecordingMutation = useMutation({
    mutationFn: async ({ callSid, recordingSid }: { callSid: string; recordingSid: string }) => 
      apiRequest(`/api/calls/${callSid}/record/${recordingSid}/stop`, "POST"),
    onSuccess: () => {
      toast({ title: "Recording stopped" });
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
    },
    onError: () => {
      toast({ title: "Failed to stop recording", variant: "destructive" });
    }
  });

  const transferCallMutation = useMutation({
    mutationFn: async ({ callSid, targetNumber }: { callSid: string; targetNumber: string }) =>
      apiRequest(`/api/calls/${callSid}/transfer`, "POST", { targetNumber }),
    onSuccess: () => {
      toast({ title: "Call transferred" });
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
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
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      <Card>
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

      {/* Call Activity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Call Activity ({filteredCalls.length})</CardTitle>
              <CardDescription>
                Real-time view of all calls with actions and monitoring
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <ColumnCustomizer 
                tableType="call_activity"
                onColumnsChange={handleColumnsChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((column) => {
                    const columnDef = getColumnDefinition(column);
                    if (!columnDef) return null;
                    const width = columnWidths[column] || columnDef.width || 120;
                    
                    return (
                      <TableHead 
                        key={column}
                        className="relative border-r border-gray-200 bg-gray-50"
                        style={{ width: `${width}px`, minWidth: `${width}px` }}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="truncate pr-2 font-medium text-xs">
                            {columnDef.label}
                          </div>
                        </div>
                        {/* Resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50"
                          onMouseDown={(e) => handleMouseDown(column, e)}
                          style={{
                            backgroundColor: isResizing === column ? '#3b82f6' : 'transparent'
                          }}
                        />
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="text-center py-8">
                      <div className="text-gray-500">
                        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No calls found matching your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCalls.map((call) => {
                    const campaign = campaigns.find((c) => c.id === call.campaignId);
                    const buyer = buyers.find((b) => b.id === call.buyerId);
                    
                    return (
                      <TableRow key={call.id} className="hover:bg-gray-50/50">
                        {visibleColumns.map((column) => {
                          const columnDef = getColumnDefinition(column);
                          if (!columnDef) return null;
                          const width = columnWidths[column] || columnDef.width || 120;
                          
                          return (
                            <TableCell 
                              key={column}
                              className="py-1 px-2 border-r border-gray-200 truncate text-xs"
                              style={{ width: `${width}px`, minWidth: `${width}px` }}
                            >
                              {renderColumnValue(column, call, campaign, buyer)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}