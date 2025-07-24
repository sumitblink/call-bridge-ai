import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  Phone, 
  Clock, 
  DollarSign,
  Users,
  Activity,
  Zap,
  MapPin,
  Info,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Enhanced Call interface with detailed tracking data
interface CallWithDetails {
  id: number;
  campaignId: string;
  campaignName?: string;
  buyerId?: number;
  buyerName?: string;
  publisherId?: number;
  publisherName?: string;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  dialedNumber?: string;
  duration: number;
  ringTime?: number;
  talkTime?: number;
  status: string;
  disposition?: string;
  hangupCause?: string;
  callQuality?: string;
  connectionTime?: number;
  cost: string;
  payout: string;
  revenue: string;
  profit: string;
  margin?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  city?: string;
  state?: string;
  country?: string;
  deviceType?: string;
  userAgent?: string;
  recordingUrl?: string;
  transcription?: string;
  isConverted?: boolean;
  conversionType?: string;
  conversionValue?: string;
  createdAt: string;
  
  // Enhanced tracking data
  flowExecutionId?: string;
  ringTreeId?: string;
  currentNodeId?: string;
  flowPath?: any[];
  routingAttempts?: number;
  
  // Related data from our new tables
  events?: CallEvent[];
  routingDecisions?: RoutingDecision[];
  rtbAuctions?: RtbAuctionDetails[];
}

interface CallEvent {
  id: number;
  callId: number;
  eventType: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  stepName?: string;
  userInput?: string;
  timestamp: string;
  duration?: number;
  metadata?: any;
}

interface RoutingDecision {
  id: number;
  callId: number;
  sequenceNumber: number;
  targetType: string;
  targetId?: number;
  targetName?: string;
  priority?: number;
  weight?: number;
  reason?: string;
  outcome: string;
  responseTime?: number;
  bidAmount?: string;
  timestamp: string;
  metadata?: any;
}

interface RtbAuctionDetails {
  id: number;
  callId: number;
  auctionId: string;
  targetId: number;
  targetName: string;
  bidAmount: string;
  bidDuration?: number;
  bidStatus: string;
  responseTime?: number;
  rejectionReason?: string;
  destinationNumber?: string;
  isWinner: boolean;
  timestamp: string;
  metadata?: any;
}

export function ExpandableCallDetails() {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedCallDetails, setSelectedCallDetails] = useState<{[key: number]: CallWithDetails}>({});

  // Fetch enhanced calls data
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["/api/calls/enhanced"],
    queryFn: async () => {
      const response = await fetch("/api/calls/enhanced");
      if (!response.ok) throw new Error("Failed to fetch calls");
      return response.json();
    },
  });

  const toggleRow = async (callId: number) => {
    const newExpanded = new Set(expandedRows);
    
    if (expandedRows.has(callId)) {
      newExpanded.delete(callId);
    } else {
      newExpanded.add(callId);
      
      // Fetch detailed call data if not already cached
      if (!selectedCallDetails[callId]) {
        try {
          const response = await fetch(`/api/calls/${callId}/details`);
          if (response.ok) {
            const detailData = await response.json();
            setSelectedCallDetails(prev => ({
              ...prev,
              [callId]: detailData
            }));
          }
        } catch (error) {
          console.error("Failed to fetch call details:", error);
        }
      }
    }
    
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "in_progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      busy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "no_answer": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  const getQualityColor = (quality: string) => {
    const colors = {
      excellent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
      good: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      fair: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      poor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return colors[quality as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  const renderCallEvents = (events: CallEvent[]) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Activity className="h-4 w-4" />
        IVR Node Events
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-gray-500">No IVR events recorded</p>
      ) : (
        <div className="space-y-1">
          {events.map((event) => (
            <div key={event.id} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{event.stepName || event.nodeName}</span>
                  <span className="text-gray-500 ml-2">({event.nodeType})</span>
                </div>
                <span className="text-gray-400">
                  {formatDistanceToNow(new Date(event.timestamp))} ago
                </span>
              </div>
              {event.userInput && (
                <div className="mt-1 text-gray-600">Input: {event.userInput}</div>
              )}
              {event.duration && (
                <div className="mt-1 text-gray-600">Duration: {event.duration}ms</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Phase 4: Enhanced Routing Decision Journey Visualization
  const renderRoutingDecisions = (decisions: RoutingDecision[]) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Zap className="h-4 w-4 text-blue-500" />
        Routing Decision Journey ({decisions.length} decisions)
      </div>
      {decisions.length === 0 ? (
        <p className="text-sm text-gray-500">No routing decisions recorded</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="space-y-3">
            {decisions
              .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
              .map((decision, index) => (
              <div key={decision.id} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                {/* Sequence Number */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300">
                  {decision.sequenceNumber}
                </div>
                
                {/* Decision Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{decision.targetName || decision.targetType}</span>
                    <Badge 
                      variant={decision.outcome === 'success' ? 'default' : 
                              decision.outcome === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {decision.outcome === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {decision.outcome === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                      {decision.outcome !== 'success' && decision.outcome !== 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {decision.outcome}
                    </Badge>
                    {decision.priority && (
                      <Badge variant="outline" className="text-xs">
                        Priority {decision.priority}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><strong>Type:</strong> {decision.targetType.toUpperCase()}</div>
                    {decision.reason && <div><strong>Reason:</strong> {decision.reason}</div>}
                    {decision.bidAmount && <div><strong>Bid:</strong> {formatCurrency(decision.bidAmount)}</div>}
                    <div><strong>Time:</strong> {formatDistanceToNow(new Date(decision.timestamp))} ago</div>
                  </div>
                </div>
                
                {/* Response Time */}
                {decision.responseTime && (
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-500">Response</div>
                    <div className={`text-sm font-medium ${
                      decision.responseTime < 500 ? 'text-green-600' :
                      decision.responseTime < 1000 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {decision.responseTime < 1000 ? `${decision.responseTime}ms` : `${(decision.responseTime/1000).toFixed(1)}s`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Phase 4: Enhanced RTB Auction Visualization with Winner Analysis  
  const renderRtbAuctions = (auctions: RtbAuctionDetails[]) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="h-4 w-4 text-green-500" />
        RTB Auction Results ({auctions.length} bidders)
      </div>
      {auctions.length === 0 ? (
        <p className="text-sm text-gray-500">No RTB auctions for this call</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="space-y-3">
            {auctions
              .sort((a, b) => parseFloat(b.bidAmount) - parseFloat(a.bidAmount))
              .map((auction, index) => (
              <div key={auction.id} className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                {/* Winner Crown or Rank */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs">
                  {auction.isWinner ? (
                    <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                      <span className="text-yellow-600 dark:text-yellow-300">👑</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400">#{index + 1}</span>
                    </div>
                  )}
                </div>
                
                {/* Auction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{auction.targetName}</span>
                    <Badge 
                      variant={auction.isWinner ? 'default' : 
                              auction.bidStatus === 'won' ? 'default' :
                              auction.bidStatus === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {auction.bidStatus}
                    </Badge>
                    <div className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(auction.bidAmount)}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><strong>Auction ID:</strong> {auction.auctionId}</div>
                    {auction.destinationNumber && <div><strong>Destination:</strong> {auction.destinationNumber}</div>}
                    {auction.rejectionReason && <div><strong>Rejection:</strong> {auction.rejectionReason}</div>}
                    <div><strong>Time:</strong> {formatDistanceToNow(new Date(auction.timestamp))} ago</div>
                  </div>
                </div>
                
                {/* Response Time */}
                {auction.responseTime && (
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-500">Response</div>
                    <div className={`text-sm font-medium ${
                      auction.responseTime < 500 ? 'text-green-600' :
                      auction.responseTime < 1000 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {auction.responseTime < 1000 ? `${auction.responseTime}ms` : `${(auction.responseTime/1000).toFixed(1)}s`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading detailed call data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Details
          <Badge variant="outline" className="ml-2">
            {calls.length} calls
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Call Info</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead>Caller ID</TableHead>
              <TableHead>Dialed #</TableHead>
              <TableHead>Time To Call</TableHead>
              <TableHead>Duplicate</TableHead>
              <TableHead>Hangup</TableHead>
              <TableHead>Time To Connect</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Recording</TableHead>
              <TableHead>Transcript</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((call: any) => {
              const expandedContent = expandedRows.has(call.id) ? (
                <TableRow key={`call-expanded-${call.id}`}>
                  <TableCell colSpan={17} className="bg-gray-50 dark:bg-gray-900 p-6">
                    <div className="space-y-6">
                      {/* Simple Header */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Phone className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">Complete Call Journey</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          End-to-end analysis of routing decisions, IVR interactions, and RTB auctions
                        </p>
                        
                        {/* Simple Info Cards */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <div className="text-xs text-gray-500">Call ID</div>
                            <div className="font-mono text-sm">{call.callSid}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <div className="text-xs text-gray-500">Campaign</div>
                            <div className="text-sm">{call.campaignName}</div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <div className="text-xs text-gray-500">Location</div>
                            <div className="text-sm">{call.city && call.state ? `${call.city}, ${call.state}` : 'Unknown'}</div>
                          </div>
                        </div>
                      </div>

                      {/* IVR & Call Flow */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="h-4 w-4 text-purple-500" />
                          <h4 className="font-semibold">IVR & Call Flow</h4>
                        </div>
                        {selectedCallDetails[call.id]?.events && selectedCallDetails[call.id].events!.length > 0 ? 
                          renderCallEvents(selectedCallDetails[call.id].events || []) : 
                          <p className="text-sm text-gray-500">No IVR events recorded for this call</p>
                        }
                      </div>

                      {/* Technical Details */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Info className="h-4 w-4 text-gray-500" />
                          <h4 className="font-semibold">Technical Details</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Ring Tree ID</span>
                            <div>{call.ringTreeId || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Flow Execution</span>
                            <div>{call.flowExecutionId || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Routing Attempts</span>
                            <div>{call.routingAttempts || 0}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Device Type</span>
                            <div>{call.deviceType || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Routing Journey */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="h-4 w-4 text-blue-500" />
                          <h4 className="font-semibold">Routing Journey</h4>
                        </div>
                        {selectedCallDetails[call.id]?.routingDecisions && selectedCallDetails[call.id].routingDecisions!.length > 0 ? 
                          renderRoutingDecisions(selectedCallDetails[call.id].routingDecisions || []) : 
                          <p className="text-sm text-gray-500">No routing decisions recorded for this call</p>
                        }
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null;

              return [
                <TableRow key={`call-${call.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRow(call.id)}
                      className="p-0 h-6 w-6"
                    >
                      {expandedRows.has(call.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {new Date(call.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(call.createdAt))} ago
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{call.campaignName || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{call.utmCampaign}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{call.publisherName || 'Direct'}</div>
                    <div className="text-xs text-gray-500">{call.utmSource}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{call.fromNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{call.dialedNumber || call.toNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDuration(call.ringTime || 0)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                      {call.status === 'completed' ? 'No' : 'Yes'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{call.hangupCause || call.disposition || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDuration(call.duration)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{call.buyerName || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{formatCurrency(call.revenue)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatCurrency(call.payout)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDuration(call.duration)}</div>
                    {call.callQuality && (
                      <Badge className={`text-xs mt-1 ${getQualityColor(call.callQuality)}`}>
                        {call.callQuality}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.recordingUrl ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">Available</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">None</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.transcription ? (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">Available</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">None</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(call.status)}>
                      {call.status}
                    </Badge>
                  </TableCell>
                </TableRow>,
                expandedContent
              ];
            })}
          </TableBody>
        </Table>
        
        {calls.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No calls found. Start generating calls to see detailed tracking information.
          </div>
        )}
      </CardContent>
    </Card>
  );
}