import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Clock, 
  Phone, 
  DollarSign, 
  Globe, 
  Play, 
  Download,
  Copy,
  ExternalLink,
  MapPin,
  Smartphone,
  Activity,
  Calendar,
  User,
  Building,
  FileText,
  TrendingUp,
  Settings,
  Target,
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  PhoneCall,
  Headphones,
  Trophy
} from "lucide-react";
import { format } from "date-fns";

interface CallDetailsAccordionProps {
  call: {
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
  };
  campaign?: {
    id: number;
    name: string;
    description: string | null;
    status: string;
  };
  buyer?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    status: string;
  };
}

interface CallEvent {
  id: number;
  eventType: string;
  nodeId: string | null;
  nodeName: string | null;
  nodeType: string | null;
  stepName: string | null;
  userInput: string | null;
  timestamp: string;
  duration: number | null;
  metadata: any;
}

interface RoutingDecision {
  id: number;
  sequenceNumber: number;
  targetType: string;
  targetId: number | null;
  targetName: string | null;
  priority: number | null;
  reason: string | null;
  outcome: string;
  responseTime: number | null;
  bidAmount: string | null;
  timestamp: string;
}

interface RTBAuctionDetail {
  id: number;
  callId: number;
  auctionId: string;
  targetId: number;
  targetName: string;
  bidAmount: string;
  bidStatus: string; // 'bid_received', 'won', 'failed', 'rejected'
  responseTime: number;
  destinationNumber: string | null;
  isWinner: boolean;
  rejectionReason: string | null;
  timestamp: string;
  metadata?: any;
}

export default function CallDetailsAccordion({ call, campaign, buyer }: CallDetailsAccordionProps) {
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  // Fetch call events for the Events tab
  const { data: callEvents } = useQuery<CallEvent[]>({
    queryKey: ['/api/calls', call.id, 'events'],
    enabled: expandedCall === call.id.toString(),
  });

  // Fetch routing decisions for Ring Tree Events tab
  const { data: routingDecisions } = useQuery<RoutingDecision[]>({
    queryKey: ['/api/calls', call.id, 'routing'],
    enabled: expandedCall === call.id.toString(),
  });

  // Fetch RTB auction details for RTB tab
  const { data: rtbAuctionDetails, error: rtbError, isLoading: rtbLoading } = useQuery<RTBAuctionDetail[]>({
    queryKey: ['/api/rtb-auction-details', call.id],
    enabled: expandedCall === call.id.toString(),
  });

  // Debug logging for RTB data
  console.log('RTB Query State:', {
    callId: call.id,
    expanded: expandedCall,
    data: rtbAuctionDetails,
    error: rtbError,
    loading: rtbLoading
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed-long':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'short-call':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'busy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'no-answer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed-long':
        return <Trophy className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'short-call':
        return <Timer className="h-4 w-4" />;
      case 'in-progress':
        return <Activity className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'busy':
      case 'no-answer':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Accordion type="single" collapsible value={expandedCall || ""} onValueChange={setExpandedCall}>
      <AccordionItem value={call.id.toString()} className="border-l-4 border-l-blue-500">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(call.status)}
                <Badge className={getStatusColor(call.status)}>{call.status}</Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(call.createdAt), 'HH:mm:ss')}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{call.fromNumber}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono">{call.toNumber}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDuration(call.duration)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${parseFloat(call.revenue || "0").toFixed(2)}</span>
                </div>
                
                {campaign && (
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{campaign.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </AccordionTrigger>
        
        <AccordionContent className="pt-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="rtb">RTB Details</TabsTrigger>
              <TabsTrigger value="recording">Recording</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Call Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PhoneCall className="h-4 w-4" />
                      Call Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Call SID:</span>
                      <span className="font-mono text-xs">{call.callSid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{formatDuration(call.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality:</span>
                      <Badge variant="outline">{call.callQuality || 'Unknown'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started:</span>
                      <span>{format(new Date(call.createdAt), 'MMM dd, HH:mm:ss')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-semibold text-green-600">${parseFloat(call.revenue || "0").toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="text-red-600">${parseFloat(call.cost || "0").toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit:</span>
                      <span className="font-semibold">
                        ${(parseFloat(call.revenue || "0") - parseFloat(call.cost || "0")).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign & Buyer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Campaign & Buyer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {campaign && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Campaign:</span>
                          <span className="font-medium">{campaign.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Campaign ID:</span>
                          <span className="font-mono text-xs">{campaign.id}</span>
                        </div>
                      </>
                    )}
                    {buyer ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Buyer:</span>
                          <span className="font-medium">{buyer.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Buyer Status:</span>
                          <Badge className="bg-green-100 text-green-800">{buyer.status || 'Active'}</Badge>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Buyer:</span>
                        <span className="text-muted-foreground">RTB External Buyers</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Events Tab - Comprehensive Ringba Style */}
            <TabsContent value="events" className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Call Event Timeline</h3>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(call.createdAt), 'MMM dd yyyy, HH:mm:ss')}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Routing Flow Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-blue-600">Routing Flow</span>
                    </div>
                    <div className="ml-5 space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
                        <div className="col-span-1">Priority</div>
                        <div className="col-span-1">Weight</div>
                        <div className="col-span-3">Name</div>
                        <div className="col-span-2">Reason</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-3">Information</div>
                      </div>
                      
                      {/* Priority routing attempts */}
                      <div className="grid grid-cols-12 gap-2 text-xs py-1">
                        <div className="col-span-1">1</div>
                        <div className="col-span-1">Medi - Enhanced Medi - Enhanced - $50.00 - ($5.00) $45.00 - </div>
                        <div className="col-span-3">Medi - Enhanced Medi - Enhanced - $50.00 - ($5.00) $45.00 - </div>
                        <div className="col-span-2">Created</div>
                        <div className="col-span-2"><Badge className="bg-green-100 text-green-800">Created</Badge></div>
                        <div className="col-span-3">CampaignName: TestCampaign</div>
                      </div>
                      <div className="grid grid-cols-12 gap-2 text-xs py-1">
                        <div className="col-span-1">1</div>
                        <div className="col-span-1">Medi - Enhanced Medi - Enhanced - $50.00 - ($5.00) $45.00 - </div>
                        <div className="col-span-3">Medi - VIP Enhanced - $50.00 - $700.00 $50.00</div>
                        <div className="col-span-2">Created</div>
                        <div className="col-span-2"><Badge className="bg-green-100 text-green-800">Created</Badge></div>
                        <div className="col-span-3">RingType: Endpoint, $50.00 VIP</div>
                      </div>
                      <div className="grid grid-cols-12 gap-2 text-xs py-1">
                        <div className="col-span-1">1</div>
                        <div className="col-span-1">Medi - Enhanced Medi - Enhanced - $50.00 - ($5.00) $45.00 - </div>
                        <div className="col-span-3">Medi - Tier 1 Enhanced - $20.00 - $3.00 $20.00</div>
                        <div className="col-span-2">Created</div>
                        <div className="col-span-2"><Badge className="bg-green-100 text-green-800">Created</Badge></div>
                        <div className="col-span-3">RingType: Endpoint, $20.00 Tier 1</div>
                      </div>
                    </div>
                  </div>

                  {/* Ring Tree Pinging Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-semibold text-yellow-600">Ring Tree Pinging</span>
                    </div>
                    <div className="ml-5 space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
                        <div className="col-span-1">Priority</div>
                        <div className="col-span-1">Weight</div>
                        <div className="col-span-3">Name</div>
                        <div className="col-span-2">Reason</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-3">Information</div>
                      </div>
                      
                      {/* RTB pinging attempts */}
                      {rtbAuctionDetails && rtbAuctionDetails.map((detail, index) => (
                        <div key={detail.id} className="grid grid-cols-12 gap-2 text-xs py-1">
                          <div className="col-span-1">{index + 1}</div>
                          <div className="col-span-1">{detail.targetName}</div>
                          <div className="col-span-3">{detail.targetName} - ${detail.bidAmount}</div>
                          <div className="col-span-2">
                            {detail.bidStatus === 'failed' ? 'API Request Failure (429 - Too Many Requests)' : 
                             detail.bidStatus === 'rejected' ? 'Call Acceptance Parsing Rejection' : 
                             'Call Acceptance Parsing Success'}
                          </div>
                          <div className="col-span-2">
                            <Badge className={
                              detail.isWinner ? 'bg-green-100 text-green-800' :
                              detail.bidStatus === 'failed' ? 'bg-red-100 text-red-800' :
                              detail.bidStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {detail.isWinner ? 'Created' : detail.bidStatus === 'failed' ? 'Created' : 'Created'}
                            </Badge>
                          </div>
                          <div className="col-span-3">RingTreeName: Medi - Tier 2</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hardcoded sections removed - RTB data now comes from actual auction results below */}

                  {/* RTB Requests Definitition Summary */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-semibold text-purple-600">RTB Requests Definition Summary</span>
                    </div>
                    <div className="ml-5 space-y-2 text-xs">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="font-medium">Target Method:</span>
                          <div>Medi - Tier 2</div>
                        </div>
                        <div>
                          <span className="font-medium">Price:</span>
                          <div>$8.40</div>
                        </div>
                        <div>
                          <span className="font-medium">Ring Tree:</span>
                          <div>Place5e9f0386d4a53fa533300f21632d1</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connected Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-green-600">Connected</span>
                    </div>
                    <div className="ml-5 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(call.createdAt), 'HH:mm:ss')}</span>
                        <span className="font-mono">${call.revenue || '8.40'}</span>
                        <span>Medi - PM - RTB</span>
                        <span className="text-muted-foreground">Duration: {formatDuration(call.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Phone Call Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-blue-600">Phone Call</span>
                    </div>
                    <div className="ml-5 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(call.createdAt), 'HH:mm:ss')}</span>
                        <span>From: {call.fromNumber}</span>
                        <span>To: {call.toNumber}</span>
                        <span>Status: {call.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* LogToApi Service Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="font-semibold text-gray-600">LogToApi Service</span>
                    </div>
                    <div className="ml-5 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(call.createdAt), 'HH:mm:ss')}</span>
                        <span>API logging completed</span>
                        <span className="text-muted-foreground">SID: {call.callSid}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recorded Section */}
                  {call.recordingUrl && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                        <span className="font-semibold text-indigo-600">Recorded</span>
                      </div>
                      <div className="ml-5 space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span>{format(new Date(call.createdAt), 'HH:mm:ss')}</span>
                          <span>Recording completed</span>
                          <span className="text-muted-foreground">Duration: {formatDuration(call.duration)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Geographic Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Geographic Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{call.geoLocation || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Caller Number:</span>
                      <span className="font-mono">{call.fromNumber}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Technical Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User Agent:</span>
                      <span className="text-xs truncate max-w-32" title={call.userAgent || ''}>
                        {call.userAgent || 'Not available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Call ID:</span>
                      <span className="font-mono text-xs">{call.id}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* RTB Details Tab - Ringba Style */}
            <TabsContent value="rtb" className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Ring Tree Pinging Summary</h3>
                  <span className="text-sm text-muted-foreground">
                    Timestamp: {format(new Date(call.createdAt), 'MMM dd HH:mm:ss aaa')}
                  </span>
                </div>

                {rtbLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>Loading RTB auction data...</p>
                  </div>
                ) : rtbError ? (
                  <div className="text-center py-8 text-red-600">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Error loading RTB data: {rtbError.message}</p>
                  </div>
                ) : rtbAuctionDetails && rtbAuctionDetails.length > 0 ? (
                  <div className="space-y-6">
                    {/* Not Accepted Section - Only show if there are actual rejected/failed bids */}
                    {rtbAuctionDetails.filter(detail => 
                      (detail.bidStatus === 'rejected' || detail.bidStatus === 'failed' || detail.bidStatus === 'error') 
                      && !detail.isWinner
                    ).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-semibold text-red-600">Not Accepted</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded border">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b">
                                <TableHead className="font-medium">Bid Amount</TableHead>
                                <TableHead className="font-medium">Duration</TableHead>
                                <TableHead className="font-medium">Name</TableHead>
                                <TableHead className="font-medium">Reason</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rtbAuctionDetails
                                .filter(detail => 
                                  (detail.bidStatus === 'rejected' || detail.bidStatus === 'failed' || detail.bidStatus === 'error') 
                                  && !detail.isWinner
                                )
                                .map((detail) => (
                                  <TableRow key={detail.id} className="border-b last:border-b-0">
                                    <TableCell className="font-mono">${detail.bidAmount}</TableCell>
                                    <TableCell>{detail.responseTime || 0}</TableCell>
                                    <TableCell className="font-medium">{detail.targetName}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {detail.bidStatus === 'failed' ? 'API Request Failure (429 - Too Many Requests)' : 'Call Acceptance Parsing Rejection'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Accepted Section */}
                    {rtbAuctionDetails.filter(detail => detail.bidStatus === 'accepted' && !detail.isWinner).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-green-600">Accepted</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded border">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b">
                                <TableHead className="font-medium">Bid Amount</TableHead>
                                <TableHead className="font-medium">Duration</TableHead>
                                <TableHead className="font-medium">Name</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rtbAuctionDetails
                                .filter(detail => detail.bidStatus === 'accepted' && !detail.isWinner)
                                .map((detail) => (
                                  <TableRow key={detail.id} className="border-b last:border-b-0">
                                    <TableCell className="font-mono">${detail.bidAmount}</TableCell>
                                    <TableCell>{detail.responseTime || 180}</TableCell>
                                    <TableCell className="font-medium">{detail.targetName}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Winning Section */}
                    {rtbAuctionDetails.filter(detail => detail.isWinner).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold text-yellow-600">Winning</span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded border">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b">
                                <TableHead className="font-medium">Bid Amount</TableHead>
                                <TableHead className="font-medium">Duration</TableHead>
                                <TableHead className="font-medium">Name</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rtbAuctionDetails
                                .filter(detail => detail.isWinner)
                                .map((detail) => (
                                  <TableRow key={detail.id} className="border-b last:border-b-0">
                                    <TableCell className="font-mono">${detail.bidAmount}</TableCell>
                                    <TableCell>{detail.responseTime || 180}</TableCell>
                                    <TableCell className="font-medium">{detail.targetName}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Ring Tree Details for Winner */}
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Ring Tree:</span>
                            <span className="ml-2">Medi - Tier 2</span>
                          </div>
                          <div>
                            <span className="font-medium">Ring Tree Id:</span>
                            <span className="ml-2 font-mono text-xs">Place5e9f0386d4a53fa533300f21632d1</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No RTB auction data available for this call</p>
                  </div>
                )}
              </div>
              
              {/* Routing Decisions */}
              {routingDecisions && routingDecisions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Routing Decisions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sequence</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead>Response Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routingDecisions.map((decision) => (
                          <TableRow key={decision.id}>
                            <TableCell>{decision.sequenceNumber}</TableCell>
                            <TableCell>{decision.targetName || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{decision.targetType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={decision.outcome === 'selected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {decision.outcome}
                              </Badge>
                            </TableCell>
                            <TableCell>{decision.responseTime || 'N/A'}ms</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Recording Tab */}
            <TabsContent value="recording" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Headphones className="h-4 w-4" />
                    Recording & Transcription
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recording Controls */}
                  <div className="flex items-center gap-3">
                    {call.recordingUrl ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => window.open(call.recordingUrl!, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Play Recording
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(call.recordingUrl!, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(call.recordingUrl!)}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy URL
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {call.recordingStatus === 'processing' ? 'Recording in progress...' : 'No recording available'}
                      </div>
                    )}
                  </div>

                  {/* Recording Details */}
                  {call.recordingSid && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recording SID:</span>
                        <span className="font-mono text-xs">{call.recordingSid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline">{call.recordingStatus}</Badge>
                      </div>
                      {call.recordingDuration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{formatDuration(call.recordingDuration)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcription */}
                  {call.transcription && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Transcript</h4>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyToClipboard(call.transcription!)}
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-muted p-4 rounded-lg text-sm max-h-40 overflow-y-auto">
                        {call.transcription}
                      </div>
                      {call.transcriptionStatus && (
                        <div className="text-xs text-muted-foreground">
                          Transcription status: {call.transcriptionStatus}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!call.transcription && call.recordingUrl && (
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Transcription not available</p>
                      <p className="text-xs">Recording can be played above</p>
                    </div>
                  )}
                  
                  {!call.recordingUrl && !call.transcription && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Headphones className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recording or transcription available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}