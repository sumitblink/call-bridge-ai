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

  // Comprehensive mock data for demonstration
  const mockCalls: Call[] = [
    {
      id: 1001, callSid: "CA1001mock001", campaignId: 1, buyerId: 3,
      fromNumber: "+12125551234", toNumber: "+18566441573", status: "completed", duration: 324,
      callQuality: "excellent", recordingSid: "RE1001mock001", recordingUrl: "https://api.twilio.com/recording1001",
      recordingStatus: "completed", recordingDuration: 320, transcription: "Customer inquired about insurance options for family of 4, interested in premium plan",
      transcriptionStatus: "completed", cost: "18.25", revenue: "45.50", geoLocation: "New York, NY",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 1002, callSid: "CA1002mock002", campaignId: 1, buyerId: 3,
      fromNumber: "+15551234567", toNumber: "+18568791483", status: "in-progress", duration: 156,
      callQuality: "good", recordingSid: "RE1002mock002", recordingUrl: null, recordingStatus: "processing",
      recordingDuration: null, transcription: null, transcriptionStatus: "pending",
      cost: "8.75", revenue: "0.00", geoLocation: "Los Angeles, CA",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)", createdAt: new Date(Date.now() - 900000).toISOString(),
      updatedAt: new Date(Date.now() - 900000).toISOString()
    },
    {
      id: 1003, callSid: "CA1003mock003", campaignId: 1, buyerId: 3,
      fromNumber: "+13105551111", toNumber: "+18564853922", status: "failed", duration: 12,
      callQuality: "poor", recordingSid: null, recordingUrl: null, recordingStatus: "failed",
      recordingDuration: null, transcription: null, transcriptionStatus: "failed",
      cost: "2.50", revenue: "0.00", geoLocation: "Chicago, IL",
      userAgent: "Mozilla/5.0 (Android 11; Mobile)", createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 1004, callSid: "CA1004mock004", campaignId: 1, buyerId: 3,
      fromNumber: "+19175559999", toNumber: "+18569256411", status: "completed", duration: 567,
      callQuality: "excellent", recordingSid: "RE1004mock004", recordingUrl: "https://api.twilio.com/recording1004",
      recordingStatus: "completed", recordingDuration: 560, transcription: "Customer requested detailed quote for family plan, discussed deductibles and coverage options",
      transcriptionStatus: "completed", cost: "22.10", revenue: "78.25", geoLocation: "Houston, TX",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", createdAt: new Date(Date.now() - 14400000).toISOString(),
      updatedAt: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: 1005, callSid: "CA1005mock005", campaignId: 1, buyerId: 3,
      fromNumber: "+14155552222", toNumber: "+18046079719", status: "completed", duration: 892,
      callQuality: "good", recordingSid: "RE1005mock005", recordingUrl: "https://api.twilio.com/recording1005",
      recordingStatus: "completed", recordingDuration: 885, transcription: "Detailed discussion about coverage options and pricing, customer comparing with other providers",
      transcriptionStatus: "completed", cost: "35.60", revenue: "125.75", geoLocation: "Phoenix, AZ",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36", createdAt: new Date(Date.now() - 21600000).toISOString(),
      updatedAt: new Date(Date.now() - 21600000).toISOString()
    },
    {
      id: 1006, callSid: "CA1006mock006", campaignId: 1, buyerId: 3,
      fromNumber: "+17185553333", toNumber: "+18566441573", status: "busy", duration: 0,
      callQuality: null, recordingSid: null, recordingUrl: null, recordingStatus: null,
      recordingDuration: null, transcription: null, transcriptionStatus: null,
      cost: "1.25", revenue: "0.00", geoLocation: "Miami, FL",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; rv:91.0)", createdAt: new Date(Date.now() - 25200000).toISOString(),
      updatedAt: new Date(Date.now() - 25200000).toISOString()
    },
    {
      id: 1007, callSid: "CA1007mock007", campaignId: 1, buyerId: 3,
      fromNumber: "+16175554444", toNumber: "+18568791483", status: "completed", duration: 234,
      callQuality: "fair", recordingSid: "RE1007mock007", recordingUrl: "https://api.twilio.com/recording1007",
      recordingStatus: "completed", recordingDuration: 230, transcription: "Brief inquiry about services and pricing",
      transcriptionStatus: "completed", cost: "12.75", revenue: "34.50", geoLocation: "Seattle, WA",
      userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0)", createdAt: new Date(Date.now() - 28800000).toISOString(),
      updatedAt: new Date(Date.now() - 28800000).toISOString()
    },
    {
      id: 1008, callSid: "CA1008mock008", campaignId: 1, buyerId: 3,
      fromNumber: "+13235555555", toNumber: "+18564853922", status: "completed", duration: 445,
      callQuality: "excellent", recordingSid: "RE1008mock008", recordingUrl: "https://api.twilio.com/recording1008",
      recordingStatus: "completed", recordingDuration: 440, transcription: "Customer comparing multiple insurance providers, seeking best rates for auto coverage",
      transcriptionStatus: "completed", cost: "19.50", revenue: "67.25", geoLocation: "Denver, CO",
      userAgent: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT)", createdAt: new Date(Date.now() - 32400000).toISOString(),
      updatedAt: new Date(Date.now() - 32400000).toISOString()
    },
    {
      id: 1009, callSid: "CA1009mock009", campaignId: 1, buyerId: 3,
      fromNumber: "+19495556666", toNumber: "+18569256411", status: "no-answer", duration: 0,
      callQuality: null, recordingSid: null, recordingUrl: null, recordingStatus: null,
      recordingDuration: null, transcription: null, transcriptionStatus: null,
      cost: "0.75", revenue: "0.00", geoLocation: "San Diego, CA",
      userAgent: "Mozilla/5.0 (Android 12; SM-G991B)", createdAt: new Date(Date.now() - 36000000).toISOString(),
      updatedAt: new Date(Date.now() - 36000000).toISOString()
    },
    {
      id: 1010, callSid: "CA1010mock010", campaignId: 1, buyerId: 3,
      fromNumber: "+15105557777", toNumber: "+18046079719", status: "completed", duration: 678,
      callQuality: "excellent", recordingSid: "RE1010mock010", recordingUrl: "https://api.twilio.com/recording1010",
      recordingStatus: "completed", recordingDuration: 675, transcription: "Customer interested in life insurance policy, discussed term vs whole life options extensively",
      transcriptionStatus: "completed", cost: "28.25", revenue: "98.75", geoLocation: "Austin, TX",
      userAgent: "Mozilla/5.0 (Windows NT 11.0; Win64; x64)", createdAt: new Date(Date.now() - 39600000).toISOString(),
      updatedAt: new Date(Date.now() - 39600000).toISOString()
    },
    {
      id: 1011, callSid: "CA1011mock011", campaignId: 1, buyerId: 3,
      fromNumber: "+16468881111", toNumber: "+18566441573", status: "completed", duration: 189,
      callQuality: "good", recordingSid: "RE1011mock011", recordingUrl: "https://api.twilio.com/recording1011",
      recordingStatus: "completed", recordingDuration: 185, transcription: "Quick quote request for home insurance",
      transcriptionStatus: "completed", cost: "9.50", revenue: "28.75", geoLocation: "Boston, MA",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)", createdAt: new Date(Date.now() - 43200000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString()
    },
    {
      id: 1012, callSid: "CA1012mock012", campaignId: 1, buyerId: 3,
      fromNumber: "+14044442222", toNumber: "+18568791483", status: "completed", duration: 756,
      callQuality: "excellent", recordingSid: "RE1012mock012", recordingUrl: "https://api.twilio.com/recording1012",
      recordingStatus: "completed", recordingDuration: 750, transcription: "Comprehensive discussion about business insurance needs, multiple policies quoted",
      transcriptionStatus: "completed", cost: "32.75", revenue: "115.25", geoLocation: "Atlanta, GA",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", createdAt: new Date(Date.now() - 46800000).toISOString(),
      updatedAt: new Date(Date.now() - 46800000).toISOString()
    },
    {
      id: 1013, callSid: "CA1013mock013", campaignId: 1, buyerId: 3,
      fromNumber: "+12025553333", toNumber: "+18564853922", status: "failed", duration: 8,
      callQuality: "poor", recordingSid: null, recordingUrl: null, recordingStatus: "failed",
      recordingDuration: null, transcription: null, transcriptionStatus: "failed",
      cost: "1.75", revenue: "0.00", geoLocation: "Washington, DC",
      userAgent: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0)", createdAt: new Date(Date.now() - 50400000).toISOString(),
      updatedAt: new Date(Date.now() - 50400000).toISOString()
    },
    {
      id: 1014, callSid: "CA1014mock014", campaignId: 1, buyerId: 3,
      fromNumber: "+15037774444", toNumber: "+18569256411", status: "completed", duration: 423,
      callQuality: "good", recordingSid: "RE1014mock014", recordingUrl: "https://api.twilio.com/recording1014",
      recordingStatus: "completed", recordingDuration: 420, transcription: "Customer seeking motorcycle insurance quote, discussed coverage options and rates",
      transcriptionStatus: "completed", cost: "18.90", revenue: "62.50", geoLocation: "Portland, OR",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0)", createdAt: new Date(Date.now() - 54000000).toISOString(),
      updatedAt: new Date(Date.now() - 54000000).toISOString()
    },
    {
      id: 1015, callSid: "CA1015mock015", campaignId: 1, buyerId: 3,
      fromNumber: "+18015555555", toNumber: "+18046079719", status: "completed", duration: 345,
      callQuality: "fair", recordingSid: "RE1015mock015", recordingUrl: "https://api.twilio.com/recording1015",
      recordingStatus: "completed", recordingDuration: 340, transcription: "Health insurance inquiry, customer comparing ACA marketplace options",
      transcriptionStatus: "completed", cost: "15.25", revenue: "48.75", geoLocation: "Salt Lake City, UT",
      userAgent: "Mozilla/5.0 (compatible; Safari/17.0)", createdAt: new Date(Date.now() - 57600000).toISOString(),
      updatedAt: new Date(Date.now() - 57600000).toISOString()
    }
  ];

  const mockCampaigns: Campaign[] = [
    {
      id: 1, name: "Healthcare Campaign", description: "Primary healthcare insurance campaign",
      status: "active", phoneNumber: "+18566441573", routingType: "pool", maxConcurrentCalls: 50,
      callCap: 1000, geoTargeting: ["US"], timeZoneRestriction: "EST",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: 2, name: "Auto Insurance Campaign", description: "Auto insurance leads campaign",
      status: "active", phoneNumber: "+18568791483", routingType: "pool", maxConcurrentCalls: 30,
      callCap: 500, geoTargeting: ["US", "CA"], timeZoneRestriction: "PST",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }
  ];

  const mockBuyers: Buyer[] = [
    {
      id: 3, name: "Premium Insurance Co", email: "contact@premiumins.com", phoneNumber: "+18005551234",
      status: "active", priority: 1, dailyCap: 100, concurrencyLimit: 10, acceptanceRate: "85%",
      avgResponseTime: 2.5, endpoint: "https://api.premiumins.com/webhook",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: 4, name: "SecureLife Partners", email: "leads@securelife.com", phoneNumber: "+18005552345",
      status: "active", priority: 2, dailyCap: 75, concurrencyLimit: 8, acceptanceRate: "92%",
      avgResponseTime: 1.8, endpoint: "https://api.securelife.com/webhook",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    },
    {
      id: 5, name: "QuickQuote Insurance", email: "api@quickquote.com", phoneNumber: "+18005553456",
      status: "active", priority: 3, dailyCap: 150, concurrencyLimit: 15, acceptanceRate: "78%",
      avgResponseTime: 3.2, endpoint: "https://api.quickquote.com/webhook",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }
  ];

  const { data: calls = mockCalls, isLoading: isLoadingCalls } = useQuery<Call[]>({
    queryKey: ["/api/calls"],
    enabled: false, // Use mock data for demonstration
  });

  const { data: campaigns = mockCampaigns, isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    enabled: false, // Use mock data for demonstration  
  });

  const { data: buyers = mockBuyers, isLoading: isLoadingBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"],
    enabled: false, // Use mock data for demonstration
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
              <CardTitle>Call Details ({filteredCalls.length})</CardTitle>
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