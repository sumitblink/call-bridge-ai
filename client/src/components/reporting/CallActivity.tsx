import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Phone,
  DollarSign,
  User,
  MapPin,
  Play,
  Download,
  ExternalLink,
  PhoneForwarded,
  Activity,
  Info,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  TrendingUp,
  Building,
  Globe
} from "lucide-react";
import { format } from "date-fns";

// Call interface
interface Call {
  id: number;
  campaignId: string | null;
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
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: string;
  name: string;
  routingType: string;
}

interface Buyer {
  id: number;
  name: string;
}

interface Pool {
  id: number;
  name: string;
}

interface CallActivityProps {
  selectedCallId?: number | null;
}

// RTB Auction Data interface
interface RTBAuctionData {
  id: number;
  targetId: number;
  targetName: string;
  bidAmount: string;
  isWinner: boolean;
  response: any;
  responseTime: number;
  status: string;
  createdAt: string;
}

export default function CallActivity({ selectedCallId }: CallActivityProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("events");
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set());
  
  // Fetch all calls
  const { data: callsResponse, isLoading: callsLoading, error: callsError } = useQuery({
    queryKey: ["/api/calls"],
    staleTime: 0
  });

  const calls = callsResponse?.calls || [];

  // Fetch campaigns data
  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    staleTime: 0
  });

  // Fetch buyers data
  const { data: buyers } = useQuery({
    queryKey: ["/api/buyers"],
    staleTime: 0
  });

  // Fetch pools data
  const { data: pools } = useQuery({
    queryKey: ["/api/pools"],
    staleTime: 0
  });

  // Helper functions
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const toggleCallExpanded = (callId: number) => {
    const newExpanded = new Set(expandedCalls);
    if (newExpanded.has(callId)) {
      newExpanded.delete(callId);
    } else {
      newExpanded.add(callId);
    }
    setExpandedCalls(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'busy': return 'text-yellow-600';
      case 'no-answer': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'busy': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get call status color based on Ringba standards
  const getCallStatusColor = (status: string, revenue?: string) => {
    switch (status.toLowerCase()) {
      case 'completed': 
        return revenue && parseFloat(revenue) > 0 ? 'white' : 'yellow-500'; 
      case 'connected':
      case 'answered':
        return 'green-500'; 
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'red-500'; 
      default:
        return 'gray-400';
    }
  };

  const getCallStatusText = (status: string, revenue?: string) => {
    if (status.toLowerCase() === 'completed') {
      return revenue && parseFloat(revenue) > 0 ? 'Call Completed - Conversion' : 'Call Completed - No Conversion';
    }
    switch (status.toLowerCase()) {
      case 'connected':
      case 'answered':
        return 'Call Live';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return "Call Didn't Connect";
      default:
        return status;
    }
  };

  if (callsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading call data...</div>
      </div>
    );
  }

  if (callsError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error loading call data</div>
      </div>
    );
  }

  if (!calls || calls.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No call data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-gray-900 mb-4">Call Details</div>
      
      {calls.map((call: Call) => {
        const isExpanded = expandedCalls.has(call.id);
        const campaign = campaigns?.find((c: Campaign) => c.id === call.campaignId);
        const buyer = buyers?.find((b: Buyer) => b.id === call.buyerId);

        return (
          <div key={call.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Call Row */}
            <div 
              className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
              onClick={() => toggleCallExpanded(call.id)}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full bg-${getCallStatusColor(call.status, call.revenue)}`}></div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(call.status)}
                  <span className="font-mono text-sm">{call.callSid.slice(-8)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {call.fromNumber} → {call.toNumber}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDuration(call.duration)}
                </div>
                <Badge variant="outline" className="text-xs">
                  {call.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(call.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Expanded Call Details */}
            {isExpanded && (
              <CallDetailsExpanded 
                call={call} 
                campaign={campaign} 
                buyer={buyer}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Expanded Call Details Component
function CallDetailsExpanded({ 
  call, 
  campaign, 
  buyer, 
  activeTab, 
  setActiveTab 
}: { 
  call: Call; 
  campaign?: Campaign; 
  buyer?: Buyer;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  // RTB auction data query
  const { data: rtbAuctionData, isLoading: rtbLoading, error: rtbError } = useQuery({
    queryKey: ['/api/calls', call.id, 'rtb'],
    queryFn: async () => {
      const response = await fetch(`/api/calls/${call.id}/rtb`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch RTB data');
      }
      return response.json();
    },
    enabled: activeTab === 'rtb',
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: string | number) => {
    return `$${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const getCallStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': 
        return call.revenue && parseFloat(call.revenue) > 0 ? 'white' : 'yellow-500';
      case 'connected':
      case 'answered':
        return 'green-500';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'red-500';
      default:
        return 'gray-400';
    }
  };

  const getCallStatusText = (status: string) => {
    if (status.toLowerCase() === 'completed') {
      return call.revenue && parseFloat(call.revenue) > 0 ? 'Call Completed - Conversion' : 'Call Completed - No Conversion';
    }
    switch (status.toLowerCase()) {
      case 'connected':
      case 'answered':
        return 'Call Live';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return "Call Didn't Connect";
      default:
        return status;
    }
  };

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Ringba-style header with status indicator triangle */}
      <div className="relative bg-gray-50 px-4 py-2 border-b">
        <div className={`absolute top-0 left-0 w-0 h-0 border-l-[20px] border-t-[20px] border-l-transparent border-t-${getCallStatusColor(call.status)}`}></div>
        <div className="flex items-center justify-between pl-6">
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-gray-900">Call Details - {call.callSid.slice(-8)}</div>
            <Badge variant="outline" className="text-xs">
              {getCallStatusText(call.status)}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(call.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white rounded-none border-b border-gray-200">
          <TabsTrigger value="events" className="text-xs py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            Events
          </TabsTrigger>
          <TabsTrigger value="record" className="text-xs py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            Record
          </TabsTrigger>
          <TabsTrigger value="tags" className="text-xs py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            Tags
          </TabsTrigger>
          <TabsTrigger value="rtb" className="text-xs py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            RTB Events
          </TabsTrigger>
          <TabsTrigger value="transcript" className="text-xs py-3 data-[state=active]:bg-primary data-[state=active]:text-white">
            Transcript
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="p-4 space-y-4 m-0">
          {/* Ringba-style Events Timeline */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Call Journey</div>
            
            <div className="space-y-3">
              {/* Call Initiated */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Call Initiated</p>
                    <p className="text-xs text-gray-500">{new Date(call.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-gray-600">From {call.fromNumber} to {call.toNumber}</p>
                </div>
              </div>

              {/* Routing Plan */}
              {campaign && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Routing Plan</p>
                      <p className="text-xs text-gray-500">Campaign: {campaign.name}</p>
                    </div>
                    <p className="text-xs text-gray-600">Routing Type: {campaign.routingType}</p>
                  </div>
                </div>
              )}

              {/* RTB Processing (if RTB data exists) */}
              {rtbAuctionData && rtbAuctionData.length > 0 && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">RTB Auction Summary</p>
                      <p className="text-xs text-gray-500">{rtbAuctionData.length} targets pinged</p>
                    </div>
                    <p className="text-xs text-gray-600">
                      Winner: {rtbAuctionData.find((bid: RTBAuctionData) => bid.isWinner)?.targetName || 'No winner'} - 
                      ${rtbAuctionData.find((bid: RTBAuctionData) => bid.isWinner)?.bidAmount || '0.00'}
                    </p>
                  </div>
                </div>
              )}

              {/* Target Dialed */}
              {buyer && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Target Dialed</p>
                      <p className="text-xs text-gray-500">Buyer: {buyer.name}</p>
                    </div>
                    <p className="text-xs text-gray-600">Connected to target endpoint</p>
                  </div>
                </div>
              )}

              {/* Call Completed */}
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  call.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Call {call.status.charAt(0).toUpperCase() + call.status.slice(1)}</p>
                    <p className="text-xs text-gray-500">Duration: {formatDuration(call.duration)}</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    Cost: {formatCurrency(call.cost)} | Revenue: {formatCurrency(call.revenue)}
                  </p>
                </div>
              </div>

              {/* Recording */}
              {call.recordingUrl && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Recorded</p>
                      <p className="text-xs text-gray-500">Available</p>
                    </div>
                    <p className="text-xs text-gray-600">Recording duration: {call.recordingDuration ? formatDuration(call.recordingDuration) : 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="record" className="p-4 space-y-4 m-0">
          {/* Ringba-style Record Tab */}
          <div className="space-y-6">
            <div className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Call Record Details</div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {/* Basic Call Info */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Basic Information</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inbound Call ID:</span>
                    <span className="font-mono">{call.callSid.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">From Number:</span>
                    <span className="font-mono">{call.fromNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dialed Number:</span>
                    <span className="font-mono">{call.toNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{formatDuration(call.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Campaign & Target Info */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Campaign Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign:</span>
                    <span>{campaign ? campaign.name : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign ID:</span>
                    <span className="font-mono">{call.campaignId?.slice(-8) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Buyer:</span>
                    <span>{buyer ? buyer.name : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Buyer ID:</span>
                    <span className="font-mono">{call.buyerId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Financial Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="text-red-600">{formatCurrency(call.cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payout:</span>
                    <span className="text-green-600">{formatCurrency(call.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className={parseFloat(call.revenue) - parseFloat(call.cost) >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency((parseFloat(call.revenue) - parseFloat(call.cost)).toString())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Call Quality:</span>
                    <span>{call.callQuality || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recording Info */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recording Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recording Status:</span>
                    <span>{call.recordingStatus || 'Not recorded'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recording Duration:</span>
                    <span>{call.recordingDuration ? formatDuration(call.recordingDuration) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recording SID:</span>
                    <span className="font-mono">{call.recordingSid?.slice(-8) || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Transcription Info */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transcription Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transcription Status:</span>
                    <span>{call.transcriptionStatus || 'Not transcribed'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Has Transcript:</span>
                    <span>{call.transcription ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span>{call.geoLocation || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tags" className="p-4 space-y-4 m-0">
          {/* Ringba-style Tags Tab */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Call Attribute Data</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Call Info Category */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Call Info</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">call_sid</span>
                    <span className="font-mono text-xs">{call.callSid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">status</span>
                    <span className="text-xs">{call.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">duration</span>
                    <span className="text-xs">{call.duration}s</span>
                  </div>
                </div>
              </div>

              {/* Time Category */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Time</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">start_time</span>
                    <span className="text-xs">{format(new Date(call.createdAt), 'HH:mm:ss')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">end_time</span>
                    <span className="text-xs">{format(new Date(call.updatedAt), 'HH:mm:ss')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">call_length</span>
                    <span className="text-xs">{formatDuration(call.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Date Category */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Date</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">call_date</span>
                    <span className="text-xs">{format(new Date(call.createdAt), 'yyyy-MM-dd')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">day_of_week</span>
                    <span className="text-xs">{format(new Date(call.createdAt), 'EEEE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">hour</span>
                    <span className="text-xs">{format(new Date(call.createdAt), 'HH')}</span>
                  </div>
                </div>
              </div>

              {/* Numbers Category */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Numbers</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">inbound_number</span>
                    <span className="font-mono text-xs">{call.toNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">caller_id</span>
                    <span className="font-mono text-xs">{call.fromNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">dialed_number</span>
                    <span className="font-mono text-xs">{call.toNumber}</span>
                  </div>
                </div>
              </div>

              {/* Financial Category */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Financial</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">cost</span>
                    <span className="text-xs text-red-600">${parseFloat(call.cost).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">payout</span>
                    <span className="text-xs text-green-600">${parseFloat(call.revenue).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">profit</span>
                    <span className={`text-xs ${parseFloat(call.revenue) - parseFloat(call.cost) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${(parseFloat(call.revenue) - parseFloat(call.cost)).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Category - Custom URL Parameters */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">User</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">campaign_id</span>
                    <span className="font-mono text-xs">{call.campaignId?.slice(-8) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">buyer_id</span>
                    <span className="text-xs">{call.buyerId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">geo_location</span>
                    <span className="text-xs">{call.geoLocation || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rtb" className="p-4 space-y-4 m-0">
          {/* RTB Analytics Tab */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900">RTB Auction Details</div>
              {rtbLoading && <div className="text-xs text-gray-500">Loading auction data...</div>}
            </div>

            {rtbError && (
              <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
                Failed to load RTB data: {rtbError.message}
              </div>
            )}

            {rtbAuctionData && rtbAuctionData.length > 0 ? (
              <div className="space-y-4">
                {/* Auction Summary */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-2">Auction Summary</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Targets Contacted</div>
                      <div className="font-semibold">{rtbAuctionData.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Winning Bid</div>
                      <div className="font-semibold text-green-600">
                        ${rtbAuctionData.find((bid: RTBAuctionData) => bid.isWinner)?.bidAmount || '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Winner</div>
                      <div className="font-semibold">
                        {rtbAuctionData.find((bid: RTBAuctionData) => bid.isWinner)?.targetName || 'No winner'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Avg Response Time</div>
                      <div className="font-semibold">
                        {Math.round(rtbAuctionData.reduce((acc: number, bid: RTBAuctionData) => acc + bid.responseTime, 0) / rtbAuctionData.length)}ms
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Bid Results */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Target</TableHead>
                        <TableHead className="text-xs">Bid Amount</TableHead>
                        <TableHead className="text-xs">Response Time</TableHead>
                        <TableHead className="text-xs">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rtbAuctionData.map((bid: RTBAuctionData) => (
                        <TableRow key={bid.id}>
                          <TableCell className="text-xs">
                            <Badge
                              variant={bid.isWinner ? "default" : bid.status === "rejected" ? "destructive" : "secondary"}
                              className="text-xs px-2 py-1"
                            >
                              {bid.isWinner ? 'Winner' : bid.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{bid.targetName}</TableCell>
                          <TableCell className="text-xs font-semibold">${parseFloat(bid.bidAmount).toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{bid.responseTime}ms</TableCell>
                          <TableCell className="text-xs">{new Date(bid.createdAt).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : !rtbLoading && (
              <div className="text-center text-gray-500 py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm">No RTB auction data available for this call</div>
                <div className="text-xs text-gray-400 mt-1">
                  This call may not have used RTB routing
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="p-4 space-y-4 m-0">
          {/* Transcript Tab */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Call Transcript</div>
            
            {call.transcription ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm whitespace-pre-wrap">{call.transcription}</div>
              </div>
            ) : call.recordingUrl ? (
              <div className="text-center py-8">
                <Button className="mb-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Send Recording for Transcription
                </Button>
                <div className="text-sm text-gray-500">
                  This call recording is available for transcription.
                  <br />
                  There is a fee associated with transcription services.
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm">No recording available for transcription</div>
                <div className="text-xs text-gray-400 mt-1">
                  Recording must be enabled to generate transcripts
                </div>
              </div>
            )}

            {/* Transcription Status */}
            {call.transcriptionStatus && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-blue-900">Transcription Status</div>
                <div className="text-sm text-blue-700 mt-1">{call.transcriptionStatus}</div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}