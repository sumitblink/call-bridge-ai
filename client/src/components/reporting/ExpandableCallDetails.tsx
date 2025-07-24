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
  Info
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
          const response = await fetch(`/api/call-details/api/calls/${callId}/details`);
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

  const renderRoutingDecisions = (decisions: RoutingDecision[]) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        Routing Plan
      </div>
      {decisions.length === 0 ? (
        <p className="text-sm text-gray-500">No routing decisions recorded</p>
      ) : (
        <div className="space-y-1">
          {decisions.map((decision) => (
            <div key={decision.id} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">#{decision.sequenceNumber} - {decision.targetName}</span>
                  <Badge className={`ml-2 text-xs ${decision.outcome === 'selected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {decision.outcome}
                  </Badge>
                </div>
                <span className="text-gray-400">
                  {decision.responseTime}ms
                </span>
              </div>
              <div className="mt-1 text-gray-600">
                Priority: {decision.priority} | Type: {decision.targetType}
              </div>
              {decision.reason && (
                <div className="mt-1 text-gray-600">Reason: {decision.reason}</div>
              )}
              {decision.bidAmount && (
                <div className="mt-1 text-gray-600">Bid: {formatCurrency(decision.bidAmount)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRtbAuctions = (auctions: RtbAuctionDetails[]) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Zap className="h-4 w-4" />
        Ring Tree Pinging Summary
      </div>
      {auctions.length === 0 ? (
        <p className="text-sm text-gray-500">No RTB auctions for this call</p>
      ) : (
        <div className="space-y-1">
          {auctions.map((auction) => (
            <div key={auction.id} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{auction.targetName}</span>
                  {auction.isWinner && (
                    <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Winner</Badge>
                  )}
                </div>
                <div className="text-right">
                  <div>{formatCurrency(auction.bidAmount)}</div>
                  <div className="text-gray-400">{auction.responseTime}ms</div>
                </div>
              </div>
              <div className="mt-1">
                <Badge className={`text-xs ${auction.bidStatus === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {auction.bidStatus}
                </Badge>
                {auction.bidDuration && (
                  <span className="ml-2 text-gray-600">{auction.bidDuration}s duration</span>
                )}
              </div>
              {auction.destinationNumber && (
                <div className="mt-1 text-gray-600">Routed to: {auction.destinationNumber}</div>
              )}
              {auction.rejectionReason && (
                <div className="mt-1 text-red-600">Reason: {auction.rejectionReason}</div>
              )}
            </div>
          ))}
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
            {calls.map((call) => (
              <React.Fragment key={call.id}>
                <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800">
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
                </TableRow>
                
                {/* Expandable Content - Ringba Style */}
                {expandedRows.has(call.id) && (
                  <TableRow>
                    <TableCell colSpan={17} className="p-0">
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Call Overview */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Info className="h-4 w-4" />
                                Call Overview
                              </div>
                              <div className="space-y-1 text-xs">
                                <div><strong>Call SID:</strong> {call.callSid}</div>
                                <div><strong>Ring Tree ID:</strong> {call.ringTreeId || 'N/A'}</div>
                                <div><strong>Flow Execution:</strong> {call.flowExecutionId || 'N/A'}</div>
                                <div><strong>Routing Attempts:</strong> {call.routingAttempts || 0}</div>
                                {call.connectionTime && (
                                  <div><strong>Connection Time:</strong> {call.connectionTime}ms</div>
                                )}
                              </div>
                            </div>

                            {/* Geographic & Technical Info */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <MapPin className="h-4 w-4" />
                                Location & Device
                              </div>
                              <div className="space-y-1 text-xs">
                                {call.city && <div><strong>Location:</strong> {call.city}, {call.state} {call.country}</div>}
                                {call.deviceType && <div><strong>Device:</strong> {call.deviceType}</div>}
                                {call.userAgent && (
                                  <div className="break-all"><strong>User Agent:</strong> {call.userAgent.substring(0, 100)}...</div>
                                )}
                              </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <DollarSign className="h-4 w-4" />
                                Financial Summary
                              </div>
                              <div className="space-y-1 text-xs">
                                <div><strong>Revenue:</strong> {formatCurrency(call.revenue)}</div>
                                <div><strong>Payout:</strong> {formatCurrency(call.payout)}</div>
                                <div><strong>Cost:</strong> {formatCurrency(call.cost)}</div>
                                <div><strong>Profit:</strong> {formatCurrency(call.profit)}</div>
                                {call.margin && <div><strong>Margin:</strong> {call.margin}%</div>}
                              </div>
                            </div>
                          </div>

                          {/* IVR Events and Routing */}
                          <div className="space-y-4">
                            {selectedCallDetails[call.id]?.events && 
                              renderCallEvents(selectedCallDetails[call.id].events || [])}
                            
                            {selectedCallDetails[call.id]?.routingDecisions && 
                              renderRoutingDecisions(selectedCallDetails[call.id].routingDecisions || [])}
                          </div>

                          {/* RTB Auction Details */}
                          <div className="space-y-4">
                            {selectedCallDetails[call.id]?.rtbAuctions && 
                              renderRtbAuctions(selectedCallDetails[call.id].rtbAuctions || [])}
                            
                            {/* Conversion Info */}
                            {call.isConverted && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Activity className="h-4 w-4" />
                                  Conversion Details
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div><strong>Type:</strong> {call.conversionType}</div>
                                  <div><strong>Value:</strong> {formatCurrency(call.conversionValue || '0')}</div>
                                </div>
                              </div>
                            )}

                            {/* Recording and Transcription */}
                            {(call.recordingUrl || call.transcription) && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Clock className="h-4 w-4" />
                                  Media & Transcription
                                </div>
                                <div className="space-y-1 text-xs">
                                  {call.recordingUrl && (
                                    <div>
                                      <a 
                                        href={call.recordingUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        📞 Play Recording
                                      </a>
                                    </div>
                                  )}
                                  {call.transcription && (
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                                      <strong>Transcription:</strong>
                                      <p className="mt-1 text-gray-700 dark:text-gray-300">
                                        {call.transcription}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
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