import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, DollarSign, Clock, MapPin, Tag, Filter, Download, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Call, PhoneNumber, Campaign, Buyer } from "@shared/schema";

interface CallWithDetails extends Call {
  campaign?: Campaign;
  buyer?: Buyer;
  phoneNumber?: PhoneNumber;
}

export function EnhancedCallDetails() {
  const [selectedCall, setSelectedCall] = useState<CallWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: "today",
    status: "all",
    campaign: "all",
    minDuration: "",
    tags: "",
  });

  // Fetch calls with enhanced details
  const { data: callsData = { calls: [] }, isLoading } = useQuery<{ calls: CallWithDetails[] }>({
    queryKey: ["/api/calls", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`/api/calls?${params}`);
      if (!response.ok) throw new Error("Failed to fetch calls");
      return response.json();
    },
  });

  const calls = callsData.calls || [];

  // Fetch campaigns for filter dropdown
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const getStatusColor = (status: string) => {
    const colors = {
      completed: "bg-green-100 text-green-800",
      "in_progress": "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      busy: "bg-yellow-100 text-yellow-800",
      "no_answer": "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getQualityColor = (quality: string) => {
    const colors = {
      excellent: "bg-emerald-100 text-emerald-800",
      good: "bg-green-100 text-green-800",
      fair: "bg-yellow-100 text-yellow-800",
      poor: "bg-red-100 text-red-800",
    };
    return colors[quality as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleCallDetails = (call: CallWithDetails) => {
    setSelectedCall(call);
    setIsDetailsOpen(true);
  };

  const exportData = () => {
    // Implement CSV export
    const csv = calls.map(call => [
      call.id,
      call.fromNumber,
      call.toNumber,
      call.status,
      call.duration,
      call.cost,
      call.revenue,
      call.profit,
      call.createdAt
    ].join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'call-details.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Call Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no_answer">No Answer</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.campaign}
              onValueChange={(value) => setFilters(prev => ({ ...prev, campaign: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Min Duration (seconds)"
              value={filters.minDuration}
              onChange={(e) => setFilters(prev => ({ ...prev, minDuration: e.target.value }))}
              type="number"
            />

            <Input
              placeholder="Search by tags..."
              value={filters.tags}
              onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
            />
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              {calls.length} calls found
            </div>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Call Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Enhanced Call Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading call details...</div>
          ) : calls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No calls found matching your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call Info</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status & Quality</TableHead>
                  <TableHead>Duration & Timing</TableHead>
                  <TableHead>Financial</TableHead>
                  <TableHead>Attribution</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          {call.fromNumber} → {call.toNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {call.id} | SID: {call.callSid?.slice(-8)}
                        </div>
                        {call.dialedNumber && call.dialedNumber !== call.toNumber && (
                          <div className="text-xs text-blue-600">
                            Pool: {call.dialedNumber}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {call.campaign?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {call.buyer?.name || 'No buyer'}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <Badge className={getStatusColor(call.status)}>
                          {call.status.replace('_', ' ')}
                        </Badge>
                        {call.callQuality && (
                          <Badge className={getQualityColor(call.callQuality)} variant="outline">
                            {call.callQuality}
                          </Badge>
                        )}
                        {call.disposition && (
                          <div className="text-xs text-gray-500">
                            {call.disposition}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.duration)}
                        </div>
                        {call.talkTime && (
                          <div className="text-xs text-gray-500">
                            Talk: {formatDuration(call.talkTime)}
                          </div>
                        )}
                        {call.ringTime && (
                          <div className="text-xs text-gray-500">
                            Ring: {call.ringTime}s
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(call.createdAt))} ago
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-green-600">
                            {formatCurrency(parseFloat(call.revenue?.toString() || '0'))}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Cost: {formatCurrency(parseFloat(call.cost?.toString() || '0'))}
                        </div>
                        <div className="text-xs text-gray-500">
                          Profit: <span className={`${(parseFloat(call.profit?.toString() || '0')) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(parseFloat(call.profit?.toString() || '0'))}
                          </span>
                        </div>
                        {call.margin && (
                          <div className="text-xs">
                            {(parseFloat(call.margin?.toString() || '0')).toFixed(1)}% margin
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {call.tags && call.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {call.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {call.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{call.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        {call.utmSource && (
                          <div className="text-xs text-gray-500">
                            Source: {call.utmSource}
                          </div>
                        )}
                        {call.city && call.state && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-2 w-2" />
                            {call.city}, {call.state}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallDetails(call)}
                        >
                          Details
                        </Button>
                        {call.recordingUrl && (
                          <Button size="sm" variant="outline" title="Play Recording">
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {call.recordingStatus && (
                          <Badge variant="outline" className="text-xs">
                            {call.recordingStatus}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Call Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Details - {selectedCall?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedCall && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="attribution">Attribution</TabsTrigger>
                <TabsTrigger value="recording">Recording</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Call Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">From:</span>
                        <div className="font-mono">{selectedCall.fromNumber}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">To:</span>
                        <div className="font-mono">{selectedCall.toNumber}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Duration:</span>
                        <div>{formatDuration(selectedCall.duration)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Status:</span>
                        <Badge className={getStatusColor(selectedCall.status)}>
                          {selectedCall.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Financial Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Revenue:</span>
                        <div className="text-green-600 font-medium">
                          {formatCurrency(selectedCall.revenue || 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Cost:</span>
                        <div>{formatCurrency(selectedCall.cost || 0)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Profit:</span>
                        <div className={`font-medium ${(selectedCall.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(selectedCall.profit || 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Margin:</span>
                        <div>{(selectedCall.margin || 0).toFixed(1)}%</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="attribution" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Attribution Data</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">UTM Source:</span>
                        <div>{selectedCall.utmSource || '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">UTM Medium:</span>
                        <div>{selectedCall.utmMedium || '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">UTM Campaign:</span>
                        <div>{selectedCall.utmCampaign || '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Referrer:</span>
                        <div className="text-xs break-all">{selectedCall.referrer || '-'}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCall.tags && selectedCall.tags.length > 0 ? 
                            selectedCall.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary">{tag}</Badge>
                            )) : '-'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Location:</span>
                        <div>{selectedCall.city && selectedCall.state ? `${selectedCall.city}, ${selectedCall.state}` : '-'}</div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Device:</span>
                        <div>{selectedCall.deviceType || '-'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="recording">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recording & Transcription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCall.recordingUrl ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Recording Status:</span>
                            <Badge variant="outline" className="text-xs">
                              {selectedCall.recordingStatus || 'completed'}
                            </Badge>
                          </div>
                          {selectedCall.recordingDuration && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Duration:</span>
                              <span className="text-sm">{selectedCall.recordingDuration} seconds</span>
                            </div>
                          )}
                        </div>
                        <audio controls className="w-full">
                          <source src={selectedCall.recordingUrl} type="audio/wav" />
                          <source src={selectedCall.recordingUrl} type="audio/mpeg" />
                          Your browser does not support audio playback.
                        </audio>
                        <div className="text-xs text-gray-500">
                          Recording ID: {selectedCall.recordingSid}
                        </div>
                        {selectedCall.transcription && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Transcription:</h4>
                            <div className="p-3 bg-gray-50 rounded-md text-sm">
                              {selectedCall.transcription}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No recording available for this call
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="technical">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Technical Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-500">Call SID:</span>
                        <div className="font-mono">{selectedCall.callSid}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Connection Time:</span>
                        <div>{selectedCall.connectionTime || '-'}ms</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Audio Quality:</span>
                        <div>{selectedCall.audioQuality || '-'}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-500">IP Address:</span>
                        <div className="font-mono">{selectedCall.ipAddress || '-'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">User Agent:</span>
                        <div className="text-xs break-all">{selectedCall.userAgent || '-'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}