import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, DollarSign, Clock, MapPin, Search, Filter, Download, Eye, Play, PhoneOff, Calendar, Globe, Settings, GripVertical } from "lucide-react";
import { ColumnCustomizer } from "@/components/reporting/ColumnCustomizer";
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

interface UrlParameter {
  id: number;
  parameterName: string;
  reportingMenuName: string;
  reportName: string;
  parameterType: string;
  isActive: boolean;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  order: number;
}

export default function CallDetails() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'callInfo', label: 'Call Info', visible: true, order: 0 },
    { id: 'campaign', label: 'Campaign', visible: true, order: 1 },
    { id: 'fromTo', label: 'From → To', visible: true, order: 2 },
    { id: 'duration', label: 'Duration', visible: true, order: 3 },
    { id: 'status', label: 'Status', visible: true, order: 4 },
    { id: 'whoHungUp', label: 'Who Hung Up', visible: true, order: 5 },
    { id: 'callDateTime', label: 'Call Date/Time', visible: true, order: 6 },
    { id: 'destinationType', label: 'Destination Type', visible: true, order: 7 },
    { id: 'recording', label: 'Recording', visible: true, order: 8 },
    { id: 'revenue', label: 'Revenue', visible: true, order: 9 },
    { id: 'payout', label: 'Payout', visible: true, order: 10 },
    { id: 'profit', label: 'Profit', visible: true, order: 11 },
    { id: 'rtbWinner', label: 'RTB Winner', visible: true, order: 12 },
    { id: 'winningBid', label: 'Winning Bid', visible: true, order: 13 },
    { id: 'rtbStats', label: 'RTB Stats', visible: true, order: 14 },
    { id: 'actions', label: 'Actions', visible: true, order: 15 },
  ]);

  // Fetch all calls with detailed information
  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ["/api/call-details/summary"],
    refetchInterval: 30000,
  });

  // Fetch user's custom URL parameters for dynamic columns
  const { data: urlParameters = [] } = useQuery<UrlParameter[]>({
    queryKey: ['/api/integrations/url-parameters'],
  });

  // Fetch RTB bid details for selected call
  const { data: bidDetails, isLoading: bidLoading } = useQuery({
    queryKey: [`/api/call-details/bids/${selectedCallId}`],
    enabled: !!selectedCallId,
  });

  const calls: CallDetail[] = callsData?.calls || [];
  const bids: BidDetail[] = bidDetails?.bids || [];

  // Add dynamic tag columns to column configuration when URL parameters are loaded
  const allColumns = [...columnConfig];
  urlParameters.forEach((param, index) => {
    const tagColumnId = `tag_${param.parameterName}`;
    if (!allColumns.find(col => col.id === tagColumnId)) {
      allColumns.push({
        id: tagColumnId,
        label: param.reportName,
        visible: true,
        order: columnConfig.length + index,
      });
    }
  });

  // Sort columns by order
  const sortedColumns = allColumns.sort((a, b) => a.order - b.order);
  const visibleColumns = sortedColumns.filter(col => col.visible);

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

  // Function to render dynamic cell content based on column type
  const renderCellContent = (call: CallDetail, column: ColumnConfig) => {
    switch (column.id) {
      case 'callInfo':
        return (
          <div className="space-y-1">
            <div className="font-mono text-sm font-medium">{call.id}</div>
            <div className="text-xs text-gray-500">{call.callSid.slice(0, 16)}...</div>
            <div className="text-xs text-gray-400">
              {new Date(call.createdAt).toLocaleString()}
            </div>
          </div>
        );
      case 'campaign':
        return <div className="font-medium text-sm">{call.campaignName}</div>;
      case 'fromTo':
        return (
          <div className="space-y-1">
            <div className="font-mono text-sm">{call.fromNumber}</div>
            <div className="text-xs text-gray-500">→ {call.toNumber}</div>
          </div>
        );
      case 'duration':
        return (
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-sm">{formatDuration(call.duration)}</span>
          </div>
        );
      case 'status':
        return getStatusBadge(call.status);
      case 'whoHungUp':
        return (
          <div className="space-y-1">
            <div className="text-xs font-medium">{call.whoHungUp || 'Unknown'}</div>
            {call.hangupCause && (
              <div className="text-xs text-gray-500">{call.hangupCause}</div>
            )}
          </div>
        );
      case 'callDateTime':
        return (
          <div className="space-y-1">
            <div className="text-xs">{new Date(call.createdAt).toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">{new Date(call.createdAt).toLocaleTimeString()}</div>
          </div>
        );
      case 'destinationType':
        return (
          <Badge variant="outline" className="text-xs">
            {(call.winnerDestination || call.toNumber)?.includes("sip:") ? "SIP" : "Phone"}
          </Badge>
        );
      case 'recording':
        return call.recordingUrl ? (
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert("Audio player would be implemented")}
              className="h-6 w-6 p-0"
            >
              <Play className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(call.recordingUrl, '_blank')}
              className="h-6 w-6 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">No recording</span>
        );
      case 'revenue':
        return (
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="font-medium text-green-600 text-sm">
              ${(parseFloat(call.revenue?.toString() || '0') || 0).toFixed(4)}
            </span>
          </div>
        );
      case 'payout':
        return (
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-orange-600" />
            <span className="font-medium text-orange-600 text-sm">
              ${(parseFloat(call.payout?.toString() || '0') || 0).toFixed(4)}
            </span>
          </div>
        );
      case 'profit':
        const revenue = parseFloat(call.revenue?.toString() || '0') || 0;
        const payout = parseFloat(call.payout?.toString() || '0') || 0;
        const profit = revenue - payout;
        return (
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-blue-600" />
            <span className={`font-bold text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${profit.toFixed(4)}
            </span>
          </div>
        );
      case 'rtbWinner':
        return call.winnerTargetName ? (
          <div className="space-y-1">
            <div className="font-medium text-sm">{call.winnerTargetName}</div>
            {call.winnerBuyerName && (
              <div className="text-xs text-gray-500">{call.winnerBuyerName}</div>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">No winner</span>
        );
      case 'winningBid':
        return call.winningBidAmount > 0 ? (
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="font-bold text-green-600">
              ${call.winningBidAmount.toFixed(2)}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">$0.00</span>
        );
      case 'rtbStats':
        return call.winnerDestination ? (
          <div className="font-mono text-xs">
            {call.winnerDestination.length > 15 
              ? call.winnerDestination.slice(0, 15) + "..." 
              : call.winnerDestination}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">No destination</span>
        );
      case 'actions':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCallId(call.id)}
            className="h-6 px-2 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View Bids
          </Button>
        );
      default:
        // Handle dynamic tag columns
        if (column.id.startsWith('tag_')) {
          const parameterName = column.id.replace('tag_', '');
          const tagValue = (call as any)[parameterName]; // Dynamic property access
          return tagValue ? (
            <div className="text-xs font-mono max-w-32 truncate">
              {tagValue}
            </div>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          );
        }
        return <span className="text-gray-400 text-xs">-</span>;
    }
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowColumnCustomizer(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Columns
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
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
                        {visibleColumns.map((column) => (
                          <TableHead 
                            key={column.id}
                            className="relative group cursor-pointer select-none"
                            style={{ width: column.width || 'auto' }}
                          >
                            <div className="flex items-center space-x-1">
                              <GripVertical className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                              <span>{column.label}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map((call) => (
                        <TableRow key={call.id} className="hover:bg-gray-50">
                          {visibleColumns.map((column) => (
                            <TableCell key={column.id} style={{ width: column.width || 'auto' }}>
                              {renderCellContent(call, column)}
                            </TableCell>
                          ))}
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


      </Tabs>
    </div>
  );
}