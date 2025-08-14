import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, DollarSign, Clock, MapPin, Search, Filter, Download, Eye, Play, PhoneOff, Calendar, Globe } from "lucide-react";
// Format duration in seconds to human readable format
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

interface CallDetail {
  id: number;
  callSid: string;
  campaignName: string;
  fromNumber: string;
  toNumber: string;
  status: string;
  duration: number;
  createdAt: string;
  completedAt: string;
  // RTB Winner Info
  winnerTargetId: number | null;
  winnerTargetName: string | null;
  winningBidAmount: number;
  winnerDestination: string | null;
  winnerBuyerName: string | null;
  // RTB Summary
  totalBids: number;
  successfulBids: number;
  avgResponseTime: number;
  totalRevenue: number;
  // New Call Details Features
  whoHungUp?: string;
  hangupCause?: string;
  recordingUrl?: string;
  recordingSid?: string;
  recordingStatus?: string;
  revenue?: number;
  payout?: number;
  profit?: number;
  // URL Parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  clickId?: string;
  landingPage?: string;
  // Geographic data
  city?: string;
  state?: string;
  country?: string;
}

interface BidDetail {
  id: number;
  callId: number;
  targetId: number;
  targetName: string;
  buyerName: string;
  companyName?: string;
  bidAmount: number;
  destinationNumber: string;
  responseTime: number;
  status: string;
  isWinner: boolean;
  rejectionReason: string | null;
}

export default function CallDetails() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);

  // Fetch all calls with detailed information
  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ["/api/call-details/summary"],
    refetchInterval: 30000,
  });

  // Fetch RTB bid details for selected call
  const { data: bidDetails, isLoading: bidLoading } = useQuery({
    queryKey: [`/api/call-details/bids/${selectedCallId}`],
    enabled: !!selectedCallId,
  });

  const calls: CallDetail[] = callsData?.calls || [];
  const bids: BidDetail[] = bidDetails?.bids || [];

  // Filter calls based on search and status
  const filteredCalls = calls.filter(call => {
    const matchesSearch = 
      call.callSid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.fromNumber.includes(searchTerm) ||
      call.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.winnerTargetName && call.winnerTargetName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || call.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      failed: "destructive", 
      "no-answer": "secondary",
      busy: "secondary",
      cancelled: "outline"
    };
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>;
  };

  const getBidStatusBadge = (status: string, rejectionReason: string | null, isWinner: boolean) => {
    if (isWinner) {
      return <Badge className="bg-yellow-100 text-yellow-800">🏆 Winner</Badge>;
    }
    if (status === 'success' && !rejectionReason) {
      return <Badge variant="default">Success</Badge>;
    }
    return <Badge variant="destructive">Rejected</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Details</h1>
          <p className="text-gray-500">Comprehensive call information and RTB auction results</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Calls</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by Call SID, phone number, campaign, or target..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="no-answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Call Overview</TabsTrigger>
          <TabsTrigger value="bids" disabled={!selectedCallId}>
            RTB Bid Details {selectedCallId && `(Call ${selectedCallId})`}
          </TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedCallId}>
            Call Details {selectedCallId && `(Call ${selectedCallId})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>All Calls Summary</span>
                <Badge variant="outline">{filteredCalls.length} calls</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {callsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call Info</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>From → To</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>RTB Winner</TableHead>
                        <TableHead>Winning Bid</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>RTB Stats</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map((call) => (
                        <TableRow key={call.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-mono text-sm font-medium">{call.id}</div>
                              <div className="text-xs text-gray-500">{call.callSid.slice(0, 16)}...</div>
                              <div className="text-xs text-gray-400">
                                {new Date(call.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="font-medium text-sm">{call.campaignName}</div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-mono text-sm">{call.fromNumber}</div>
                              <div className="text-xs text-gray-500">→ {call.toNumber}</div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{formatDuration(call.duration)}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {getStatusBadge(call.status)}
                          </TableCell>
                          
                          <TableCell>
                            {call.winnerTargetName ? (
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{call.winnerTargetName}</div>
                                {call.winnerBuyerName && (
                                  <div className="text-xs text-gray-500">{call.winnerBuyerName}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No winner</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {call.winningBidAmount > 0 ? (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span className="font-bold text-green-600">
                                  ${call.winningBidAmount.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">$0.00</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {call.winnerDestination ? (
                              <div className="font-mono text-xs">
                                {call.winnerDestination.length > 15 
                                  ? call.winnerDestination.slice(0, 15) + "..." 
                                  : call.winnerDestination}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">N/A</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              <div>{call.successfulBids}/{call.totalBids} bids</div>
                              <div className="text-gray-500">{call.avgResponseTime}ms avg</div>
                              {call.totalRevenue > 0 && (
                                <div className="text-green-600">${call.totalRevenue.toFixed(2)}</div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCallId(call.id)}
                                className="flex-1"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bids">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>RTB Bid Details - Call {selectedCallId}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bidLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Bid Amount</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rejection Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bids.map((bid) => (
                        <TableRow key={bid.id} className={bid.isWinner ? "bg-yellow-50" : ""}>
                          <TableCell>
                            <div className="font-medium">{bid.targetName}</div>
                            <div className="text-xs text-gray-500">{bid.companyName || bid.buyerName}</div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="font-medium">{bid.companyName || bid.buyerName || 'Unknown'}</div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span className={`font-bold ${bid.bidAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {bid.bidAmount.toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {bid.destinationNumber ? (
                              <div className="font-mono text-sm">{bid.destinationNumber}</div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span>{bid.responseTime}ms</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            {getBidStatusBadge(bid.status, bid.rejectionReason, bid.isWinner)}
                          </TableCell>
                          
                          <TableCell>
                            {bid.rejectionReason ? (
                              <span className="text-red-600 text-sm">{bid.rejectionReason}</span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {selectedCallId && (() => {
            const selectedCall = filteredCalls.find(call => call.id === selectedCallId);
            if (!selectedCall) return <div>Call not found</div>;

            const formatDate = (dateString: string) => {
              return new Date(dateString).toLocaleString();
            };

            const getDestinationType = (destination: string) => {
              if (!destination) return "Unknown";
              return destination.includes("sip:") ? "SIP" : "Phone";
            };

            const calculateProfit = () => {
              const revenue = selectedCall.revenue || 0;
              const payout = selectedCall.payout || 0;
              return revenue - payout;
            };

            const renderRecordingSection = () => {
              if (!selectedCall.recordingUrl) {
                return <span className="text-gray-400">No recording available</span>;
              }

              return (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Play recording (would need audio player implementation)
                      alert("Audio player functionality would be implemented here");
                    }}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Play
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(selectedCall.recordingUrl, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              );
            };

            const renderUrlParameters = () => {
              const params = [];
              if (selectedCall.utmSource) params.push({label: "UTM Source", value: selectedCall.utmSource});
              if (selectedCall.utmMedium) params.push({label: "UTM Medium", value: selectedCall.utmMedium});
              if (selectedCall.utmCampaign) params.push({label: "UTM Campaign", value: selectedCall.utmCampaign});
              if (selectedCall.utmContent) params.push({label: "UTM Content", value: selectedCall.utmContent});
              if (selectedCall.utmTerm) params.push({label: "UTM Term", value: selectedCall.utmTerm});
              if (selectedCall.sub1) params.push({label: "Sub1", value: selectedCall.sub1});
              if (selectedCall.sub2) params.push({label: "Sub2", value: selectedCall.sub2});
              if (selectedCall.sub3) params.push({label: "Sub3", value: selectedCall.sub3});
              if (selectedCall.clickId) params.push({label: "Click ID", value: selectedCall.clickId});
              if (selectedCall.landingPage) params.push({label: "Landing Page", value: selectedCall.landingPage});

              if (params.length === 0) {
                return <span className="text-gray-400">No URL parameters tracked</span>;
              }

              return (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {params.map((param, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="font-medium text-gray-600">{param.label}:</span>
                      <span className="text-gray-900 truncate ml-2">{param.value}</span>
                    </div>
                  ))}
                </div>
              );
            };

            return (
              <div className="space-y-6">
                {/* Call Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* 1. Who Hung Up */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-sm font-medium">
                        <PhoneOff className="h-4 w-4 mr-2" />
                        Call Termination
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-600">Who hung up:</span>
                          <div className="font-medium">{selectedCall.whoHungUp || 'Unknown'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Hangup cause:</span>
                          <div className="text-sm text-gray-900">{selectedCall.hangupCause || 'Not specified'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2. Call Date and Time */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-sm font-medium">
                        <Calendar className="h-4 w-4 mr-2" />
                        Call Timing
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-600">Started:</span>
                          <div className="font-medium">{formatDate(selectedCall.createdAt)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Completed:</span>
                          <div className="font-medium">{formatDate(selectedCall.completedAt)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Duration:</span>
                          <div className="font-medium">{formatDuration(selectedCall.duration)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 3. Destination Type */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-sm font-medium">
                        <Globe className="h-4 w-4 mr-2" />
                        Destination Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-gray-600">To Number:</span>
                          <div className="font-mono font-medium">{selectedCall.toNumber}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Type:</span>
                          <Badge variant="outline">
                            {getDestinationType(selectedCall.winnerDestination || selectedCall.toNumber)}
                          </Badge>
                        </div>
                        {selectedCall.winnerDestination && (
                          <div>
                            <span className="text-sm text-gray-600">Winner Destination:</span>
                            <div className="font-mono text-sm text-gray-900">{selectedCall.winnerDestination}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 6, 7, 8. Financial Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-sm font-medium">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Financial Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Revenue:</span>
                          <span className="font-medium text-green-600">
                            ${(selectedCall.revenue || 0).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Payout:</span>
                          <span className="font-medium text-orange-600">
                            ${(selectedCall.payout || 0).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-medium text-gray-900">Profit:</span>
                          <span className={`font-bold ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${calculateProfit().toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Geographic Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-sm font-medium">
                        <MapPin className="h-4 w-4 mr-2" />
                        Geographic Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedCall.city && (
                          <div>
                            <span className="text-sm text-gray-600">City:</span>
                            <div className="font-medium">{selectedCall.city}</div>
                          </div>
                        )}
                        {selectedCall.state && (
                          <div>
                            <span className="text-sm text-gray-600">State:</span>
                            <div className="font-medium">{selectedCall.state}</div>
                          </div>
                        )}
                        {selectedCall.country && (
                          <div>
                            <span className="text-sm text-gray-600">Country:</span>
                            <div className="font-medium">{selectedCall.country}</div>
                          </div>
                        )}
                        {!selectedCall.city && !selectedCall.state && !selectedCall.country && (
                          <span className="text-gray-400">No geographic data available</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 4. Call Recording */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg font-medium">
                      <Play className="h-5 w-5 mr-2" />
                      Call Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderRecordingSection()}
                    {selectedCall.recordingStatus && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Status: </span>
                        <Badge variant="outline">{selectedCall.recordingStatus}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 5. URL Parameters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg font-medium">
                      <Globe className="h-5 w-5 mr-2" />
                      Custom URL Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderUrlParameters()}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}