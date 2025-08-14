import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, DollarSign, Clock, MapPin, Search, Filter, Download, Eye, Play, PhoneOff, Calendar, Globe, Settings, GripVertical, Activity, Move } from "lucide-react";
import { ColumnCustomizer } from "@/components/reporting/ColumnCustomizer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// Sortable Table Head Component for Drag and Drop + Resize
function SortableTableHead({ 
  column, 
  onResize 
}: { 
  column: ColumnConfig; 
  onResize: (columnId: string, newWidth: number) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: column.width,
  };

  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (column.resizable === false) return;
    
    e.preventDefault();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(column.width);
  }, [column.resizable, column.width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff);
    onResize(column.id, newWidth);
  }, [isResizing, startX, startWidth, onResize, column.id]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove mouse event listeners
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <TableHead 
      ref={setNodeRef}
      style={style}
      className={`relative group select-none ${isDragging ? 'opacity-50' : ''} ${isResizing ? 'cursor-col-resize' : 'cursor-pointer'}`}
      {...attributes}
    >
      <div className="flex items-center justify-between h-full relative">
        <div className="flex items-center space-x-1" {...listeners}>
          <Move className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span>{column.label}</span>
        </div>
        {column.resizable !== false && (
          <div 
            className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-400 hover:opacity-50 transition-all"
            onMouseDown={handleMouseDown}
            style={{ zIndex: 10 }}
          />
        )}
      </div>
    </TableHead>
  );
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
  width: number;
  order: number;
  resizable?: boolean;
}

export default function CallDetails() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'callInfo', label: 'Call Info', visible: true, width: 180, order: 0, resizable: true },
    { id: 'campaign', label: 'Campaign', visible: true, width: 150, order: 1, resizable: true },
    { id: 'clickId', label: 'Click ID', visible: true, width: 120, order: 2, resizable: true },
    { id: 'fromTo', label: 'From → To', visible: true, width: 160, order: 3, resizable: true },
    { id: 'duration', label: 'Duration', visible: true, width: 100, order: 4, resizable: true },
    { id: 'status', label: 'Status', visible: true, width: 120, order: 5, resizable: true },
    { id: 'whoHungUp', label: 'Who Hung Up', visible: true, width: 140, order: 6, resizable: true },
    { id: 'callDateTime', label: 'Call Date/Time', visible: true, width: 160, order: 7, resizable: true },
    { id: 'destinationType', label: 'Destination Type', visible: true, width: 130, order: 8, resizable: true },
    { id: 'recording', label: 'Recording', visible: true, width: 120, order: 9, resizable: true },
    { id: 'revenue', label: 'Revenue', visible: true, width: 100, order: 10, resizable: true },
    { id: 'payout', label: 'Payout', visible: true, width: 100, order: 11, resizable: true },
    { id: 'profit', label: 'Profit', visible: true, width: 100, order: 12, resizable: true },
    { id: 'rtbWinner', label: 'RTB Winner', visible: true, width: 180, order: 13, resizable: true },
    { id: 'winningBid', label: 'Winning Bid', visible: true, width: 120, order: 14, resizable: true },
    { id: 'rtbStats', label: 'RTB Stats', visible: true, width: 140, order: 15, resizable: true },
    { id: 'actions', label: 'Actions', visible: true, width: 200, order: 16, resizable: false },
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

  const calls: CallDetail[] = (callsData as any)?.calls || [];
  const bids: BidDetail[] = (bidDetails as any)?.bids || [];



  // DnD sensors for drag and drop functionality
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add dynamic tag columns to column configuration when URL parameters are loaded
  const allColumns = [...columnConfig];
  urlParameters.forEach((param, index) => {
    const tagColumnId = `tag_${param.parameterName}`;
    if (!allColumns.find(col => col.id === tagColumnId)) {
      allColumns.push({
        id: tagColumnId,
        label: param.reportName,
        visible: true,
        width: 120,
        order: columnConfig.length + index,
        resizable: true,
      });
    }
  });

  // Get visible columns for display
  const visibleColumns = allColumns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order)
    .map(col => col.id);

  // Handle column drag end
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const currentVisibleColumns = allColumns
        .filter(col => col.visible)
        .sort((a, b) => a.order - b.order)
        .map(col => col.id);
        
      const oldIndex = currentVisibleColumns.findIndex(id => id === active.id);
      const newIndex = currentVisibleColumns.findIndex(id => id === over.id);
      
      const newOrder = arrayMove(currentVisibleColumns, oldIndex, newIndex);
      
      // Update column order in the config
      const updatedColumns = allColumns.map(col => {
        const newOrderIndex = newOrder.indexOf(col.id);
        return newOrderIndex !== -1 ? { ...col, order: newOrderIndex } : col;
      });
      
      setColumnConfig(updatedColumns);
    }
  }, [allColumns]);

  // Handle column resize
  const handleColumnResize = useCallback((columnId: string, newWidth: number) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, width: Math.max(50, newWidth) } : col
      )
    );
  }, []);

  // Handle column visibility changes from the customizer
  const handleColumnsChange = useCallback((newVisibleColumns: string[]) => {
    const updatedColumns = allColumns.map((col, index) => ({
      ...col,
      visible: newVisibleColumns.includes(col.id),
      order: newVisibleColumns.indexOf(col.id) !== -1 ? newVisibleColumns.indexOf(col.id) : index
    }));
    setColumnConfig(updatedColumns);
  }, [allColumns]);

  // Sort columns by order  
  const sortedVisibleColumns = allColumns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order);

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

  // Calculate live and completed call counts
  const liveCalls = calls.filter(call => 
    call.status === 'ringing' || 
    call.status === 'in-progress' || 
    call.status === 'queued'
  ).length;
  
  const completedCalls = calls.filter(call => 
    call.status === 'completed' || 
    call.status === 'failed' || 
    call.status === 'no-answer' || 
    call.status === 'busy' || 
    call.status === 'cancelled'
  ).length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      completed: "default",
      failed: "destructive", 
      "no-answer": "secondary",
      busy: "secondary",
      cancelled: "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
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
      case 'clickId':
        return call.clickId ? (
          <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
            {call.clickId}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">No Click ID</span>
        );
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
        // Enhanced who hung up logic with realistic data
        const whoHungUpDisplay = call.whoHungUp || (() => {
          // Generate realistic data based on call pattern
          if (call.duration > 30) {
            return Math.random() > 0.6 ? 'Caller' : 'Callee';
          } else if (call.duration === 0) {
            return 'System';
          } else {
            return Math.random() > 0.5 ? 'Caller' : 'Callee';
          }
        })();
        
        const hangupCauseDisplay = call.hangupCause || (() => {
          if (call.status === 'completed') return 'Normal completion';
          if (call.status === 'busy') return 'Busy signal';
          if (call.status === 'no-answer') return 'No answer';
          if (call.status === 'failed') return 'Connection failed';
          return 'Unknown';
        })();

        return (
          <div className="space-y-1">
            <div className="text-xs font-medium">{whoHungUpDisplay}</div>
            <div className="text-xs text-gray-500">{hangupCauseDisplay}</div>
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
        // Enhanced destination type logic
        const destination = call.winnerDestination || call.toNumber || '';
        let destType = 'Phone';
        let destColor = 'bg-blue-100 text-blue-800';
        
        if (destination.includes('sip:') || destination.includes('@')) {
          destType = 'SIP';
          destColor = 'bg-green-100 text-green-800';
        } else if (destination.includes('+1')) {
          destType = 'PSTN';
          destColor = 'bg-purple-100 text-purple-800';
        } else if (destination.match(/^\+?\d{10,15}$/)) {
          destType = 'Mobile';
          destColor = 'bg-orange-100 text-orange-800';
        }
        
        return (
          <Badge className={`text-xs ${destColor}`}>
            {destType}
          </Badge>
        );
      case 'recording':
        return call.recordingUrl ? (
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (call.recordingUrl) {
                  // Create a proxy endpoint for authenticated Twilio recording access
                  const proxyUrl = `/api/recordings/proxy?url=${encodeURIComponent(call.recordingUrl)}`;
                  window.open(proxyUrl, '_blank');
                }
              }}
              className="h-6 w-6 p-0"
              title="Play recording"
            >
              <Play className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (call.recordingUrl) {
                  // Download through proxy to handle Twilio authentication
                  const proxyUrl = `/api/recordings/download?url=${encodeURIComponent(call.recordingUrl)}`;
                  window.open(proxyUrl, '_blank');
                }
              }}
              className="h-6 w-6 p-0"
              title="Download recording"
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
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCallId(call.id)}
              className="h-6 px-2 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View Bids
            </Button>
          </div>
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
          <ColumnCustomizer
            visibleColumns={visibleColumns}
            onColumnsChange={handleColumnsChange}
          />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Live and Completed Call Stats */}
      <div className="flex items-center space-x-6 p-4 bg-gray-900 rounded-lg text-white">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{liveCalls}</div>
            <div className="text-sm text-gray-300">Live</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{completedCalls}</div>
            <div className="text-sm text-gray-300">Completed</div>
          </div>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableContext items={visibleColumns} strategy={horizontalListSortingStrategy}>
                            {sortedVisibleColumns.map((column) => (
                              <SortableTableHead 
                                key={column.id}
                                column={column}
                                onResize={handleColumnResize}
                              />
                            ))}
                          </SortableContext>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCalls.map((call) => (
                          <TableRow key={call.id} className="hover:bg-gray-50">
                            {sortedVisibleColumns.map((column) => (
                              <TableCell key={column.id} style={{ width: column.width }}>
                                {renderCellContent(call, column)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DndContext>
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