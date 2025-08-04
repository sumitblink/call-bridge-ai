import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Phone, Clock, DollarSign, Users, Filter, Download, Play, Pause, Square, PhoneCall, Mic, MicOff, PhoneForwarded, Ban, Tag, Edit3, MoreVertical, ChevronRight, ChevronDown, Activity, Info, FileText, Settings, CheckCircle, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColumnCustomizer } from "./ColumnCustomizer";
import { getDefaultVisibleColumns, getColumnDefinition } from "@shared/column-definitions";
import { formatDistanceToNow } from "date-fns";

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
  userAgent: string | null;
  numberPoolId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: string;
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

// Individual call details component for accordion expansion
interface CallDetailsExpandedProps {
  call: Call;
  campaign?: Campaign;
  buyer?: Buyer;
  targets?: any[];
}

function CallDetailsExpanded({ call, campaign, buyer, targets }: CallDetailsExpandedProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 4 
    }).format(num || 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center"><div className="h-2 w-2 bg-white rounded-full"></div></div>;
      case 'failed': return <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center"><div className="h-1 w-1 bg-white rounded-full"></div></div>;
      case 'busy': return <div className="h-4 w-4 bg-yellow-500 rounded-full flex items-center justify-center"><div className="h-1 w-1 bg-white rounded-full"></div></div>;
      case 'no-answer': return <PhoneCall className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-50 rounded-none border-b">
          <TabsTrigger value="overview" className="text-xs py-2">
            <Info className="h-3 w-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs py-2">
            <FileText className="h-3 w-3 mr-1" />
            Details
          </TabsTrigger>
          <TabsTrigger value="routing" className="text-xs py-2">
            <PhoneForwarded className="h-3 w-3 mr-1" />
            Routing
          </TabsTrigger>
          <TabsTrigger value="rtb" className="text-xs py-2">
            <Activity className="h-3 w-3 mr-1" />
            RTB Analytics
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs py-2">
            <Activity className="h-3 w-3 mr-1" />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4 space-y-4 m-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Call ID</div>
              <div className="font-mono text-sm">{call.callSid.slice(-8)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</div>
              <div className="flex items-center gap-2">
                {getStatusIcon(call.status)}
                <span className="text-sm capitalize">{call.status}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Duration</div>
              <div className="text-sm font-medium">{formatDuration(call.duration)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Started</div>
              <div className="text-sm">{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">Call Information</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">From:</span>
                  <span className="font-mono">{call.fromNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">To:</span>
                  <span className="font-mono">{call.toNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quality:</span>
                  <span>{call.callQuality || 'Not rated'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span>{call.geoLocation || 'Unknown'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">Financial</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cost:</span>
                  <span className="text-red-600 font-medium">{formatCurrency(call.cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Revenue:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(call.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Profit:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(call.revenue) - parseFloat(call.cost))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Margin:</span>
                  <span className="font-medium">{((parseFloat(call.revenue) - parseFloat(call.cost)) / parseFloat(call.revenue) * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="p-4 space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">Technical Information</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Call SID:</span>
                  <span className="font-mono">{call.callSid}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Ring Time:</span>
                  <span>{(call as any).ringTime || 0}s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Talk Time:</span>
                  <span>{(call as any).talkTime || 0}s</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Recording SID:</span>
                  <span className="font-mono">{call.recordingSid || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Recording Status:</span>
                  <span>{call.recordingStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Transcription:</span>
                  <span>{call.transcriptionStatus || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">Tracking & Attribution</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">UTM Source:</span>
                  <span>{(call as any).utmSource || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">UTM Medium:</span>
                  <span>{(call as any).utmMedium || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">UTM Campaign:</span>
                  <span>{(call as any).utmCampaign || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Referrer:</span>
                  <span className="truncate max-w-32">{(call as any).referrer || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">IP Address:</span>
                  <span className="font-mono">{(call as any).ipAddress || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">User Agent:</span>
                  <span className="truncate max-w-32">{call.userAgent ? 'Available' : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {call.recordingUrl && (
            <div className="border-t pt-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">Call Recording</div>
              <audio controls className="w-full max-w-md">
                <source src={`/api/recordings/${call.recordingSid}`} type="audio/wav" />
                <source src={`/api/recordings/${call.recordingSid}`} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <div className="text-xs text-gray-500 mt-2">
                Duration: {call.recordingDuration ? `${call.recordingDuration}s` : 'Unknown'} • 
                Status: {call.recordingStatus || 'Available'}
              </div>
            </div>
          )}

          {call.transcription && (
            <div className="border-t pt-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Call Transcription</div>
              <div className="bg-gray-50 p-3 rounded text-sm leading-relaxed">
                {call.transcription}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Status: {call.transcriptionStatus || 'Available'}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="routing" className="p-4 space-y-4 m-0">
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700">Campaign & Routing Information</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Campaign Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Campaign:</span>
                    <span className="font-medium">{campaign?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Campaign ID:</span>
                    <span className="font-mono text-xs">{call.campaignId?.slice(-8) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Pool ID:</span>
                    <span>{(call as any).numberPoolId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Phone Number ID:</span>
                    <span>{(call as any).phoneNumberId || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Routing Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Buyer:</span>
                    <span>{buyer ? (buyer.name || 'Unnamed Buyer') : 'No buyer assigned'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Target:</span>
                    <span>{(targets?.find((t: any) => t.id === (call as any).targetId))?.name || 'No target assigned'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Routing Attempts:</span>
                    <span>{(call as any).routingAttempts || 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Dialed Number:</span>
                    <span className="font-mono">{(call as any).dialedNumber || call.toNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rtb" className="p-4 space-y-4 m-0">
          {(call as any).rtbRequestId ? (
            <div className="space-y-4">
              {/* Auction Header Info */}
              <div className="flex items-center space-x-4 pb-3 border-b border-border/40">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">RTB Details</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Request ID: {(call as any).rtbRequestId}
                </Badge>
                <Badge 
                  variant={(call as any).winningBidAmount && parseFloat((call as any).winningBidAmount) > 0 ? "default" : "secondary"}
                  className={(call as any).winningBidAmount && parseFloat((call as any).winningBidAmount) > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                >
                  {(call as any).winningBidAmount && parseFloat((call as any).winningBidAmount) > 0 ? "Won" : "No Winner"}
                </Badge>
              </div>

              {/* Individual Bidder Results Table */}
              {(call as any).rtbBidders && (call as any).rtbBidders.length > 0 && (
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
                          <TableHead className="text-xs">Status & Rejection Details</TableHead>
                          <TableHead className="text-xs">Winner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(call as any).rtbBidders
                          .sort((a: any, b: any) => b.bidAmount - a.bidAmount)
                          .map((bidder: any, idx: number) => (
                          <TableRow key={idx} className="text-sm">
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {bidder.isWinner && (
                                  <div className="text-yellow-500">👑</div>
                                )}
                                <div>
                                  <div className="font-medium">{bidder.targetName || `Target ${bidder.targetId}`}</div>
                                  <div className="text-xs text-gray-500">ID: {bidder.targetId}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-green-600">
                                ${bidder.bidAmount.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">{bidder.currency || 'USD'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm">
                                {bidder.responseTime}ms
                              </div>
                              <div className={`text-xs ${
                                bidder.responseTime < 500 ? 'text-green-600' : 
                                bidder.responseTime < 1000 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {bidder.responseTime < 500 ? 'Fast' : 
                                 bidder.responseTime < 1000 ? 'Medium' : 'Slow'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {bidder.destinationNumber ? (
                                <>
                                  <div className="font-mono text-blue-600 text-sm">
                                    {bidder.destinationNumber}
                                  </div>
                                  <div className="text-xs text-gray-500">External Route</div>
                                </>
                              ) : (
                                <div className="text-xs text-gray-500">No destination</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1.5 max-w-[250px]">
                                <div className="flex items-center space-x-2">
                                  {bidder.status === 'success' ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <Badge 
                                    variant={bidder.status === 'success' ? 'default' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {bidder.status === 'error' ? 'rejected' : bidder.status}
                                  </Badge>
                                </div>
                                
                                {bidder.rejectionReason && (
                                  <div className="text-xs text-red-600">
                                    {bidder.rejectionReason}
                                  </div>
                                )}
                                
                                {!bidder.rejectionReason && bidder.status === 'success' && bidder.bidAmount > 0 && (
                                  <div className="text-xs text-green-600">Bid accepted successfully</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {bidder.isWinner ? (
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

              {/* RTB Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Timing Section */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">RTB Timing</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Call Start:</span>
                      <span className="font-mono">{new Date(call.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Duration:</span>
                      <span className="font-mono">{(call as any).auctionTimeMs || 0}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Response:</span>
                      <span className="font-mono">
                        {(call as any).rtbBidders 
                          ? Math.round((call as any).rtbBidders.reduce((sum: number, b: any) => sum + b.responseTime, 0) / (call as any).rtbBidders.length)
                          : 0}ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bidding Statistics */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Bidding Stats</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Targets Pinged:</span>
                      <span className="font-medium">{(call as any).totalTargetsPinged || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Successful Bids:</span>
                      <span className="font-medium text-green-600">{(call as any).successfulResponses || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="font-medium">
                        {(call as any).totalTargetsPinged 
                          ? Math.round(((call as any).successfulResponses / (call as any).totalTargetsPinged) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Winner Information */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Winner Details</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Winning Bid:</span>
                      <span className="font-bold text-green-600">
                        ${(call as any).winningBidAmount || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Winner ID:</span>
                      <span className="font-mono">{(call as any).winningTargetId || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route Method:</span>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">RTB</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">This call was not routed via RTB</div>
              <div className="text-xs text-gray-400 mt-1">No RTB data available</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="p-4 space-y-4 m-0">
          <div className="text-sm font-semibold text-gray-700">Call Timeline</div>
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-medium">Call Initiated</div>
                <div className="text-gray-500 text-xs">
                  {new Date(call.createdAt).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  From {call.fromNumber} to {call.toNumber}
                </div>
              </div>
            </div>
            
            {(call as any).routingAttempts > 0 && (
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="font-medium">Routing Processing</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {(call as any).routingAttempts} routing attempt(s) made
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3 text-sm">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                call.status === 'completed' ? 'bg-green-500' : 
                call.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
              <div className="flex-1">
                <div className="font-medium">Call {call.status.charAt(0).toUpperCase() + call.status.slice(1)}</div>
                <div className="text-gray-500 text-xs">
                  {new Date(call.updatedAt).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Duration: {formatDuration(call.duration)} • Cost: {formatCurrency(call.cost)} • Revenue: {formatCurrency(call.revenue)}
                </div>
              </div>
            </div>

            {/* Pixel Fire Event (if applicable) */}
            {call.id === 85 && (
              <div className="flex items-start gap-3 text-sm border-t pt-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="font-medium">Tracking Pixel Fired</div>
                  <div className="text-gray-500 text-xs">
                    Jul 29, 2024 04:40:40 PM
                  </div>
                  <div className="bg-gray-50 p-3 rounded mt-2">
                    <div className="text-xs space-y-1">
                      <div><span className="font-medium">Setting:</span> RedTrack New Test - INCOMING</div>
                      <div><span className="font-medium">Trigger:</span> incoming</div>
                      <div><span className="font-medium">URL:</span> <span className="font-mono text-blue-600 break-all">http://cy9n0.rdtk.io/postback?clickid=6888c6c36a77d44662342c40&type=CTC</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function for status colors (moved here for reuse)
function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "in-progress": return "bg-blue-100 text-blue-800";
    case "failed": return "bg-red-100 text-red-800";
    case "busy": return "bg-yellow-100 text-yellow-800";
    case "no-answer": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export default function CallActivity() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  
  // Expanded rows state for accordion functionality
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    // Clear any old column preferences to prevent conflicts
    localStorage.removeItem('call-activity-columns');
    
    // Define custom column order with Publisher as second column
    const customOrder = [
      'campaign',
      'publisherName',  // Publisher as second column
      'buyer',
      'callDate',
      'callerId',
      'dialedNumber',
      'duration',
      'status',
      'actions'
    ];
    
    // Load saved preferences but filter out old 'publisher' column
    const saved = localStorage.getItem('call-details-column-preferences');
    if (saved) {
      try {
        const savedPrefs = JSON.parse(saved);
        const savedColumns = savedPrefs.visibleColumns || savedPrefs;
        // Filter out old 'publisher' column and ensure publisherName is used
        const filteredColumns = savedColumns
          .filter((col: string) => col !== 'publisher') // Remove old publisher column
          .map((col: string) => col === 'publisher' ? 'publisherName' : col); // Map any remaining
        
        // Ensure actions column is always at the right end
        const actionsIndex = filteredColumns.indexOf('actions');
        if (actionsIndex > -1) {
          const columnsWithoutActions = filteredColumns.filter((col: string) => col !== 'actions');
          return [...columnsWithoutActions, 'actions'];
        }
        return filteredColumns.length > 0 ? filteredColumns : customOrder;
      } catch (e) {
        return customOrder;
      }
    }
    return customOrder;
  });
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Action dialog states
  const [blockNumberDialog, setBlockNumberDialog] = useState<{ isOpen: boolean; callId: number | null; phoneNumber: string }>({
    isOpen: false, callId: null, phoneNumber: ""
  });
  const [tagDialog, setTagDialog] = useState<{ isOpen: boolean; callId: number | null; currentTags: string[] }>({
    isOpen: false, callId: null, currentTags: []
  });
  const [paymentDialog, setPaymentDialog] = useState<{ isOpen: boolean; callId: number | null; currentRevenue: string; currentCost: string }>({
    isOpen: false, callId: null, currentRevenue: "", currentCost: ""
  });
  
  // Form states
  const [blockReason, setBlockReason] = useState("");
  const [newTag, setNewTag] = useState("");
  const [adjustedRevenue, setAdjustedRevenue] = useState("");
  const [adjustedCost, setAdjustedCost] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  
  const { toast } = useToast();

  // Fetch URL parameters to create dynamic column definitions
  const { data: urlParameters } = useQuery({
    queryKey: ['/api/integrations/url-parameters'],
    queryFn: () => fetch('/api/integrations/url-parameters').then(res => res.json())
  });

  // Create dynamic column definition lookup that includes URL parameters
  const getDynamicColumnDefinition = (columnId: string) => {
    // First check static columns (built-in columns like 'publisher' take priority)
    const staticColumn = getColumnDefinition(columnId);
    if (staticColumn) return staticColumn;
    
    // Then check if it's a URL parameter (only if not a built-in column)
    const urlParam = urlParameters?.find((param: any) => param.parameterName === columnId);
    if (urlParam) {
      return {
        id: urlParam.parameterName,
        label: `${urlParam.reportingMenuName}:${urlParam.reportName}`, // Show "Category:Name" format
        category: urlParam.reportingMenuName,
        dataType: urlParam.parameterType,
        defaultVisible: false,
        width: 150,
        sortable: true,
        filterable: true,
        description: `URL parameter: ${urlParam.parameterName}`
      };
    }
    
    // Fallback to column ID if no definition found
    return { id: columnId, label: columnId, category: 'Unknown', dataType: 'string', defaultVisible: false };
  };

  const handleColumnsChange = (newVisibleColumns: string[]) => {
    // Remove duplicates to fix React key issues
    const uniqueColumns = [...new Set(newVisibleColumns)];
    // Ensure actions column is always at the right end
    const actionsIndex = uniqueColumns.indexOf('actions');
    if (actionsIndex > -1) {
      const columnsWithoutActions = uniqueColumns.filter(col => col !== 'actions');
      setVisibleColumns([...columnsWithoutActions, 'actions']);
    } else {
      setVisibleColumns(uniqueColumns);
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (callId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(callId)) {
        newSet.delete(callId);
      } else {
        newSet.add(callId);
      }
      return newSet;
    });
  };

  // Action handlers
  const handleBlockNumber = (callId: number, phoneNumber: string) => {
    setBlockNumberDialog({ isOpen: true, callId, phoneNumber });
    setBlockReason("");
  };

  const handleAddTag = (callId: number, currentTags: string[] = []) => {
    setTagDialog({ isOpen: true, callId, currentTags });
    setNewTag("");
  };

  const handleAdjustPayment = (callId: number, currentRevenue: string, currentCost: string) => {
    setPaymentDialog({ isOpen: true, callId, currentRevenue, currentCost });
    setAdjustedRevenue(currentRevenue);
    setAdjustedCost(currentCost);
    setAdjustmentReason("");
  };

  // Add refs and state for lazy loading
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Pagination state and types
  interface PaginatedResponse {
    calls: Call[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }

  // Simple query for calls with proper error handling - no infinite scroll to prevent issues
  const { data: callsResponse, isLoading: isLoadingCalls, error: callsError } = useQuery({
    queryKey: ['/api/calls'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/calls?page=1&limit=100', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('Calls API Error:', response.status, response.statusText);
          return { calls: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
        }
        
        return response.json();
      } catch (error) {
        console.error('Calls API Fetch Error:', error);
        return { calls: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
      }
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Extract calls data from response
  const calls = callsResponse?.calls || [];
  const totalCalls = callsResponse?.pagination.total || 0;

  // Debug pagination state (remove in production)
  // console.log('Pagination Debug:', {
  //   pagesLoaded: callsData?.pages.length || 0,
  //   totalCalls,
  //   currentCallsCount: calls.length,
  //   hasNextPage,
  //   isFetchingNextPage,
  //   isLoadingCalls,
  //   firstPageData: callsData?.pages[0] || null,
  //   error: callsData?.pages.length === 0 ? 'No pages loaded' : null
  // });

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"]
  });

  const { data: buyers = [], isLoading: isLoadingBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"]
  });

  const { data: targets = [], isLoading: isLoadingTargets } = useQuery<any[]>({
    queryKey: ["/api/targets"],
    staleTime: 0 // Force fresh data
  });

  const { data: pools = [], isLoading: isLoadingPools } = useQuery<any[]>({
    queryKey: ["/api/pools"],
    staleTime: 0 // Force fresh data
  });

  // Removed infinite scroll functionality for simplicity

  // Infinite scroll DISABLED to prevent freezing - use manual Load More button instead
  // useEffect(() => {
  //   const container = tableContainerRef.current;
  //   if (!container) return;

  //   let timeoutId: number;
  //   const throttledHandleScroll = () => {
  //     if (timeoutId) clearTimeout(timeoutId);
  //     timeoutId = window.setTimeout(handleScroll, 500); // Throttle to 500ms to reduce CPU load
  //   };

  //   container.addEventListener('scroll', throttledHandleScroll, { passive: true });
  //   return () => {
  //     container.removeEventListener('scroll', throttledHandleScroll);
  //     if (timeoutId) clearTimeout(timeoutId);
  //   };
  // }, [handleScroll]);

  const filteredCalls = useMemo(() => {
    if (!calls || !Array.isArray(calls)) return [];
    
    return calls.filter(call => {
      if (!call) return false;
      
      const matchesStatus = statusFilter === "all" || call.status === statusFilter;
      const matchesCampaign = campaignFilter === "all" || call.campaignId === campaignFilter;
      const matchesSearch = searchTerm === "" || 
        (call.fromNumber && call.fromNumber.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (call.toNumber && call.toNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (call.callSid && call.callSid.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesStatus && matchesCampaign && matchesSearch;
    });
  }, [calls, statusFilter, campaignFilter, searchTerm]);

  // Debug: log filtered calls count


  const renderColumnValue = (call: Call, column: string) => {
    const columnDef = getDynamicColumnDefinition(column);
    
    switch (column) {
      case 'campaign':
        const campaign = campaigns.find(c => c.id === call.campaignId);
        return <div className="truncate text-xs">{campaign?.name || 'Unknown'}</div>;
      case 'buyer':
        const buyer = buyers.find(b => b.id === call.buyerId);
        return <div className="truncate text-xs">{(buyer as any)?.companyName || buyer?.name || 'No Buyer'}</div>;
      case 'target':
        const target = targets?.find((t: any) => t.id === (call as any).targetId);
        return <div className="truncate text-xs">{target?.name || 'No Target'}</div>;
      case 'fromNumber':
        return <div className="font-mono text-xs">{call.fromNumber}</div>;
      case 'toNumber':
        return <div className="font-mono text-xs">{call.toNumber}</div>;
      case 'dialedNumber':
        return <div className="font-mono text-xs">{call.toNumber}</div>;
      case 'duration':
        return <div className="text-xs">{call.duration}s</div>;
      case 'revenue':
        return <div className="text-xs font-medium text-green-600">${call.revenue}</div>;
      case 'profit':
        const revenue = parseFloat(call.revenue) || 0;
        const cost = parseFloat(call.cost) || 0;
        const profit = revenue - cost;
        return <div className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${profit.toFixed(2)}
        </div>;
      case 'status':
        return <Badge variant="secondary" className={`text-xs ${getStatusColor(call.status)}`}>
          {call.status}
        </Badge>;
      case 'callDate':
        return <div className="text-xs">{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}</div>;
      case 'callerId':
        return <div className="font-mono text-xs">{call.fromNumber}</div>;
      case 'connectedCallLength':
        return <div className="text-xs">{call.duration}s</div>;
      case 'previouslyConnected':
        return <div className="text-xs">No</div>;
      case 'numberPool':
        const pool = pools.find(p => p.id === call.numberPoolId);
        return <div className="truncate text-xs">{pool?.name || 'Direct'}</div>;
      case 'numberPoolId':
        return <div className="text-xs">{call.numberPoolId || '-'}</div>;
      case 'numberPoolUsed':
        return <div className="text-xs">{call.numberPoolId ? 'Yes' : 'No'}</div>;
      case 'campaignId':
        return <div className="font-mono text-xs">{call.campaignId}</div>;
      case 'buyerId':
        return <div className="font-mono text-xs">{call.buyerId || 'N/A'}</div>;
      case 'publisherName':
        return <div className="truncate text-xs">{(call as any).publisherName || 'No Publisher'}</div>;
      case 'clickId':
        return <div className="font-mono text-xs text-blue-600">{(call as any).click_id || (call as any).clickId || '-'}</div>;
      case 'payout':
        return <div className="text-xs font-medium text-blue-600">${(call as any).payout || '0.00'}</div>;
      case 'timeToCall':
        return <div className="text-xs">{(call as any).ringTime || 0}s</div>;
      case 'timeToConnect':
        return <div className="text-xs">{(call as any).connectionTime || 0}s</div>;
      
      // Additional missing column mappings from database
      case 'targetNumber':
        const callTarget = targets?.find((t: any) => t.id === (call as any).targetId);
        return <div className="font-mono text-xs">{callTarget?.phoneNumber || '-'}</div>;
      case 'targetId':
        return <div className="text-xs">{(call as any).targetId || '-'}</div>;
      case 'publisherId':
        return <div className="text-xs">{(call as any).publisherId || '-'}</div>;
      case 'publisherSubId':
        return <div className="text-xs">{(call as any).publisherSubId || '-'}</div>;
      case 'targetSubId':
        return <div className="text-xs">{(call as any).targetSubId || '-'}</div>;
      case 'buyerSubId':
        return <div className="text-xs">{(call as any).buyerSubId || '-'}</div>;
      case 'targetGroupId':
        return <div className="text-xs">{(call as any).targetGroupId || '-'}</div>;
      case 'ringTime':
        return <div className="text-xs">{(call as any).ringTime || 0}s</div>;
      case 'talkTime':
        return <div className="text-xs">{(call as any).talkTime || 0}s</div>;
      case 'holdTime':
        return <div className="text-xs">{(call as any).holdTime || 0}s</div>;
      case 'disposition':
        return <div className="text-xs">{(call as any).disposition || '-'}</div>;
      case 'hangupCause':
        return <div className="text-xs">{(call as any).hangupCause || '-'}</div>;
      case 'audioQuality':
        return <div className="text-xs">{(call as any).audioQuality || '-'}</div>;
      case 'duplicate':
        return <div className="text-xs">{(call as any).isDuplicate ? 'Yes' : 'No'}</div>;
      case 'isDuplicate':
        return <div className="text-xs">{(call as any).isDuplicate ? 'Yes' : 'No'}</div>;
      case 'duplicateOfCallId':
        return <div className="text-xs">{(call as any).duplicateOfCallId || '-'}</div>;
      case 'margin':
        return <div className="text-xs">{(call as any).margin || '0.00'}%</div>;
      case 'tags':
        const callTags = (call as any).tags || [];
        return <div className="text-xs">{Array.isArray(callTags) ? callTags.join(', ') : callTags}</div>;
      case 'utmSource':
        return <div className="text-xs">{(call as any).utmSource || '-'}</div>;
      case 'utmMedium':
        return <div className="text-xs">{(call as any).utmMedium || '-'}</div>;
      case 'utmCampaign':
        return <div className="text-xs">{(call as any).utmCampaign || '-'}</div>;
      case 'utmContent':
        return <div className="text-xs">{(call as any).utmContent || '-'}</div>;
      case 'utmTerm':
        return <div className="text-xs">{(call as any).utmTerm || '-'}</div>;
      case 'referrer':
        return <div className="text-xs">{(call as any).referrer || '-'}</div>;
      case 'landingPage':
        return <div className="text-xs">{(call as any).landingPage || '-'}</div>;
      case 'city':
        return <div className="text-xs">{(call as any).city || '-'}</div>;
      case 'state':
        return <div className="text-xs">{(call as any).state || '-'}</div>;
      case 'country':
        return <div className="text-xs">{(call as any).country || '-'}</div>;
      case 'zipCode':
        return <div className="text-xs">{(call as any).zipCode || '-'}</div>;
      case 'ipAddress':
        return <div className="font-mono text-xs">{(call as any).ipAddress || '-'}</div>;
      case 'deviceType':
        return <div className="text-xs">{(call as any).deviceType || '-'}</div>;
      case 'isConverted':
        return <div className="text-xs">{(call as any).isConverted ? 'Yes' : 'No'}</div>;
      case 'conversionType':
        return <div className="text-xs">{(call as any).conversionType || '-'}</div>;
      case 'conversionValue':
        return <div className="text-xs">${(call as any).conversionValue || '0.00'}</div>;
      case 'conversionTimestamp':
        return <div className="text-xs">{(call as any).conversionTimestamp ? formatDistanceToNow(new Date((call as any).conversionTimestamp), { addSuffix: true }) : '-'}</div>;
      case 'sub1':
        return <div className="text-xs">{(call as any).sub1 || '-'}</div>;
      case 'sub2':
        return <div className="text-xs">{(call as any).sub2 || '-'}</div>;
      case 'sub3':
        return <div className="text-xs">{(call as any).sub3 || '-'}</div>;
      case 'sub4':
        return <div className="text-xs">{(call as any).sub4 || '-'}</div>;
      case 'sub5':
        return <div className="text-xs">{(call as any).sub5 || '-'}</div>;
      case 'sessionId':
        return <div className="font-mono text-xs">{(call as any).sessionId || '-'}</div>;
      case 'adAccountId':
        return <div className="text-xs">{(call as any).adAccountId || '-'}</div>;
      case 'keyword':
        return <div className="text-xs">{(call as any).keyword || '-'}</div>;
      case 'placement':
        return <div className="text-xs">{(call as any).placement || '-'}</div>;
      case 'adGroup':
        return <div className="text-xs">{(call as any).adGroup || '-'}</div>;
      case 'creativeId':
        return <div className="text-xs">{(call as any).creativeId || '-'}</div>;
      case 'flowExecutionId':
        return <div className="text-xs">{(call as any).flowExecutionId || '-'}</div>;
      case 'ringTreeId':
        return <div className="text-xs">{(call as any).ringTreeId || '-'}</div>;
      case 'currentNodeId':
        return <div className="text-xs">{(call as any).currentNodeId || '-'}</div>;
      case 'flowPath':
        return <div className="text-xs">{(call as any).flowPath || '-'}</div>;
      case 'routingAttempts':
        return <div className="text-xs">{(call as any).routingAttempts || 0}</div>;
      case 'trackingTagId':
        return <div className="text-xs">{(call as any).trackingTagId || '-'}</div>;
      case 'phoneNumberId':
        return <div className="text-xs">{(call as any).phoneNumberId || '-'}</div>;
      case 'recordingUrl':
        return <div className="text-xs">{call.recordingUrl ? 'Available' : 'None'}</div>;
      case 'recordingSid':
        return <div className="font-mono text-xs">{call.recordingSid || '-'}</div>;
      case 'recordingStatus':
        return <div className="text-xs">{call.recordingStatus || '-'}</div>;
      case 'recordingDuration':
        return <div className="text-xs">{call.recordingDuration ? `${call.recordingDuration}s` : '-'}</div>;
      case 'transcription':
        return <div className="text-xs truncate max-w-xs">{call.transcription || '-'}</div>;
      case 'transcriptionStatus':
        return <div className="text-xs">{call.transcriptionStatus || '-'}</div>;
      case 'transcriptionConfidence':
        return <div className="text-xs">{(call as any).transcriptionConfidence || '-'}</div>;
      case 'callQuality':
        return <div className="text-xs">{call.callQuality || '-'}</div>;
      case 'userAgent':
        return <div className="text-xs truncate max-w-xs">{call.userAgent || '-'}</div>;
      case 'userAgentParsed':
        return <div className="text-xs">{(call as any).userAgentParsed || '-'}</div>;
      case 'cost':
        return <div className="text-xs text-red-600">${call.cost}</div>;
      case 'geoLocation':
        return <div className="text-xs">{call.geoLocation || '-'}</div>;
      case 'callSid':
        return <div className="font-mono text-xs">{call.callSid}</div>;
      case 'createdAt':
        return <div className="text-xs">{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}</div>;
      case 'updatedAt':
        return <div className="text-xs">{formatDistanceToNow(new Date(call.updatedAt), { addSuffix: true })}</div>;
      
      case 'actions':
        return (
          <div className="flex items-center space-x-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleBlockNumber(call.id, call.fromNumber)}>
                  <Ban className="h-3 w-3 mr-2" />
                  Block Number
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => handleAddTag(call.id, [])}>
                  <Tag className="h-3 w-3 mr-2" />
                  Add Tag
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => handleAdjustPayment(call.id, call.revenue, call.cost)}>
                  <Edit3 className="h-3 w-3 mr-2" />
                  Adjust Payment
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {call.recordingUrl && call.recordingSid && (
                  <DropdownMenuItem onClick={() => window.open(`/api/recordings/${call.recordingSid}`, '_blank')}>
                    <Play className="h-3 w-3 mr-2" />
                    Play Recording
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      default:
        // Handle dynamic URL parameter columns
        // Enhanced mapping for user-created URL parameters to database fields
        const getUrlParameterValue = (parameterName: string) => {
          // Direct mapping for common URL parameters to database fields
          const directMappings: Record<string, string> = {
            'clickid': 'clickId',
            'click_id': 'clickId', 
            'publisher': 'publisherName',
            'publisher_name': 'publisherName',
            'utm_campaign': 'utmCampaign',
            'utm_source': 'utmSource',
            'utm_medium': 'utmMedium',
            'utm_content': 'utmContent',
            'utm_term': 'utmTerm',
            'referrer': 'referrer',
            'landing_page': 'landingPage',
            'user_agent': 'userAgent',
            'ip_address': 'ipAddress',
            'geo_location': 'geoLocation',
            'session_id': 'sessionId'
          };
          
          // Try direct mapping first
          const mappedField = directMappings[parameterName.toLowerCase()];
          if (mappedField && call[mappedField as keyof typeof call] !== undefined) {
            return call[mappedField as keyof typeof call];
          }
          
          // Try camelCase version
          const camelCase = parameterName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          if (call[camelCase as keyof typeof call] !== undefined) {
            return call[camelCase as keyof typeof call];
          }
          
          // Try snake_case version
          const snakeCase = parameterName.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (call[snakeCase as keyof typeof call] !== undefined) {
            return call[snakeCase as keyof typeof call];
          }
          
          // Try exact match
          if (call[parameterName as keyof typeof call] !== undefined) {
            return call[parameterName as keyof typeof call];
          }
          
          return null;
        };
        
        const paramValue = getUrlParameterValue(column);
        
        if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
          // Format display based on parameter type
          if (column.toLowerCase().includes('clickid') || column.toLowerCase().includes('click_id')) {
            return <div className="truncate text-xs font-mono text-blue-600">{String(paramValue)}</div>;
          }
          if (column.toLowerCase().includes('publisher')) {
            return <div className="truncate text-xs font-medium">{String(paramValue)}</div>;
          }
          return <div className="truncate text-xs">{String(paramValue)}</div>;
        }
        return <div className="truncate text-xs text-gray-400">-</div>;
    }
  };

  const handleMouseDown = (e: React.MouseEvent, columnId: string) => {
    setIsResizing(columnId);
    e.preventDefault();
  };

  const handleExport = () => {
    const csvContent = [
      visibleColumns.join(','),
      ...filteredCalls.map(call => 
        visibleColumns.map(col => {
          switch (col) {
            case 'campaign':
              return campaigns.find(c => c.id === call.campaignId)?.name || 'Unknown';
            case 'campaignId':
              return call.campaignId;
            case 'buyerId':
              return call.buyerId || 'N/A';
            case 'buyer':
              return buyers.find(b => b.id === call.buyerId)?.name || 'No Buyer';
            default:
              return (call as any)[col] || '';
          }
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'call-details.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoadingCalls || isLoadingCampaigns || isLoadingBuyers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Details</CardTitle>
          <CardDescription>Loading call activity data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Call Details</CardTitle>
            <CardDescription>
              {calls.length > 0 ? 
                `Showing ${calls.length} of ${totalCalls} calls • Lazy loading enabled` : 
                'Monitor and manage individual call activities'
              }
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <ColumnCustomizer
              visibleColumns={visibleColumns}
              onColumnsChange={handleColumnsChange}
            />
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            placeholder="Search calls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredCalls.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium text-muted-foreground mb-1">No calls found</h3>
            <p className="text-sm text-muted-foreground">
              {calls.length === 0 ? "No call data available yet." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <div 
              ref={tableContainerRef}
              className="overflow-auto max-h-[600px] relative"
              style={{ scrollBehavior: 'smooth' }}
            >
              <Table ref={tableRef} className="relative">
                <TableHeader className="sticky top-0 z-30 bg-white border-b-2 border-gray-200">
                  <TableRow className="bg-white">
                    <TableHead className="text-xs font-semibold bg-white text-gray-800 w-8 sticky top-0 z-30 border-r border-gray-200"></TableHead>
                    {visibleColumns.map((column, columnIndex) => {
                      const columnDef = getDynamicColumnDefinition(column);
                      return (
                        <TableHead 
                          key={`header-${columnIndex}-${column}`} 
                          className="text-xs font-semibold relative bg-white text-gray-800 sticky top-0 z-30 border-r border-gray-200"
                          style={{ 
                            width: columnWidths[column] || columnDef?.width || 'auto',
                            minWidth: '60px'
                          }}
                        >
                          {columnDef?.label || column}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                            onMouseDown={(e) => handleMouseDown(e, column)}
                          />
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredCalls.slice(0, 50).flatMap((call, callIndex) => {
                  const rows = [
                    <TableRow key={`call-row-${call.id}`} className="hover:bg-muted/30">
                      <TableCell className="py-2 w-8">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRowExpansion(call.id)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedRows.has(call.id) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                      {visibleColumns.map((column, columnIndex) => (
                        <TableCell 
                          key={`cell-${callIndex}-${columnIndex}`} 
                          className="py-2"
                          style={{ 
                            width: columnWidths[column] || getDynamicColumnDefinition(column)?.width || 'auto',
                            minWidth: '60px'
                          }}
                        >
                          {column === 'actions' ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => handleBlockNumber(call.id, call.fromNumber)}>
                                  <Ban className="h-3 w-3 mr-2" />
                                  Block Number
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleAddTag(call.id, (call as any).tags ? (call as any).tags.split(',') : [])}>
                                  <Tag className="h-3 w-3 mr-2" />
                                  Add Tag
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleAdjustPayment(call.id, call.revenue, call.cost)}>
                                  <Edit3 className="h-3 w-3 mr-2" />
                                  Adjust Payment
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {call.recordingUrl && call.recordingSid && (
                                  <DropdownMenuItem onClick={() => window.open(`/api/recordings/${call.recordingSid}`, '_blank')}>
                                    <Play className="h-3 w-3 mr-2" />
                                    Play Recording
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            renderColumnValue(call, column)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ];

                  if (expandedRows.has(call.id)) {
                    rows.push(
                      <TableRow key={`expanded-${call.id}`}>
                        <TableCell colSpan={visibleColumns.length + 1} className="p-0 bg-gray-100 dark:bg-gray-800">
                          <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
                            <CallDetailsExpanded 
                              call={call}
                              campaign={campaigns.find(c => c.id === call.campaignId)}
                              buyer={call.buyerId ? buyers.find(b => b.id === call.buyerId) : undefined}
                              targets={targets}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return rows;
                })}
              </TableBody>
            </Table>
            
            {/* Simple call count display */}
            {calls.length > 0 && (
              <div className="border-t bg-muted/20">
                <div className="flex items-center justify-center px-4 py-2 text-xs text-muted-foreground">
                  <span>Showing {calls.length} calls</span>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}