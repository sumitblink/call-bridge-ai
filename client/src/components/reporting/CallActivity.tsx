import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Phone, Clock, DollarSign, Users, Filter, Download, Play, Pause, Square, PhoneCall, Mic, MicOff, PhoneForwarded, Ban, Tag, Edit3, MoreVertical, ChevronRight, ChevronDown, Activity } from "lucide-react";
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
}

function CallDetailsExpanded({ call, campaign, buyer }: CallDetailsExpandedProps) {
  return (
    <div className="space-y-6">
      {/* Simple Header Section */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Phone className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Call Details</h3>
      </div>

      {/* Basic Info Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Call ID</div>
            <div className="font-mono text-sm">{call.callSid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Campaign</div>
            <div className="text-sm">{campaign?.name || 'Unknown'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Location</div>
            <div className="text-sm">{call.geoLocation || 'Unknown'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Three Basic Sections */}
      <div className="space-y-4">
        {/* IVR & Call Flow */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
            <Phone className="h-4 w-4" />
            IVR & Call Flow
          </h4>
          <div className="bg-gray-50 p-4 rounded">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">From:</span> {call.fromNumber}
              </div>
              <div>
                <span className="text-gray-600">To:</span> {call.toNumber}
              </div>
              <div>
                <span className="text-gray-600">Duration:</span> {call.duration}s
              </div>
              <div>
                <span className="text-gray-600">Status:</span> 
                <Badge className={`ml-2 ${getStatusColor(call.status)}`}>
                  {call.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
            <Activity className="h-4 w-4" />
            Technical Details
          </h4>
          <div className="bg-gray-50 p-4 rounded">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Recording:</span> {call.recordingUrl ? 'Available' : 'Not available'}
              </div>
              <div>
                <span className="text-gray-600">Transcription:</span> {call.transcription ? 'Available' : 'Not available'}
              </div>
              <div>
                <span className="text-gray-600">Quality:</span> {call.callQuality || 'Not rated'}
              </div>
              <div>
                <span className="text-gray-600">User Agent:</span> {call.userAgent ? 'Available' : 'Not available'}
              </div>
            </div>
          </div>
        </div>

        {/* Routing Journey */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
            <Users className="h-4 w-4" />
            Routing Journey
          </h4>
          <div className="bg-gray-50 p-4 rounded">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Campaign:</span> {campaign?.name || 'Unknown'}
              </div>
              <div>
                <span className="text-gray-600">Buyer:</span> {buyer?.name || 'No buyer assigned'}
              </div>
              <div>
                <span className="text-gray-600">Revenue:</span> ${call.revenue}
              </div>
              <div>
                <span className="text-gray-600">Cost:</span> ${call.cost}
              </div>
            </div>
          </div>
        </div>
      </div>
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
        label: urlParam.reportName, // Use Report Name as the label
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

  // Real data queries - no mock data
  const { data: calls = [], isLoading: isLoadingCalls } = useQuery<Call[]>({
    queryKey: ["/api/calls"]
  });

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"]
  });

  const { data: buyers = [], isLoading: isLoadingBuyers } = useQuery<Buyer[]>({
    queryKey: ["/api/buyers"]
  });

  const filteredCalls = calls.filter(call => {
    const matchesStatus = statusFilter === "all" || call.status === statusFilter;
    const matchesCampaign = campaignFilter === "all" || call.campaignId === campaignFilter;
    const matchesSearch = searchTerm === "" || 
      call.fromNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      call.toNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.callSid.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesCampaign && matchesSearch;
  });

  // Debug: log filtered calls count
  console.log('Total calls:', calls.length, 'Filtered calls:', filteredCalls.length, 'Visible columns:', visibleColumns);
  if (filteredCalls.length > 0) {
    console.log('Sample call data:', filteredCalls[0]);
  }
  console.log('Sample column mapping check:', visibleColumns.map(col => ({ col, def: getColumnDefinition(col) })));

  const renderColumnValue = (call: Call, column: string) => {
    const columnDef = getDynamicColumnDefinition(column);
    
    switch (column) {
      case 'campaign':
        const campaign = campaigns.find(c => c.id === call.campaignId);
        return <div className="truncate text-xs">{campaign?.name || 'Unknown'}</div>;
      case 'buyer':
        const buyer = buyers.find(b => b.id === call.buyerId);
        return <div className="truncate text-xs">{buyer?.name || 'No Buyer'}</div>;
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
      case 'duplicate':
        return <div className="text-xs">No</div>;
      case 'previouslyConnected':
        return <div className="text-xs">No</div>;
      case 'numberPool':
        return <div className="truncate text-xs">{call.numberPoolId ? 'FirstCampaignPool' : 'Direct'}</div>;
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
      case 'payout':
        return <div className="text-xs font-medium text-blue-600">${(call as any).payout || '0.00'}</div>;
      case 'timeToCall':
        return <div className="text-xs">{(call as any).ringTime || 0}s</div>;
      case 'timeToConnect':
        return <div className="text-xs">{(call as any).connectionTime || 0}s</div>;
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
                
                {call.recordingUrl && (
                  <DropdownMenuItem onClick={() => call.recordingUrl && window.open(call.recordingUrl, '_blank')}>
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
        // Map URL parameter names to database column names (snake_case)
        const columnMappings: Record<string, string> = {
          'clickid': 'click_id',
          'publisher': 'publisher_name',
          'utm_campaign': 'utm_campaign',
          'utm_source': 'utm_source',
          'utm_medium': 'utm_medium',
          'utm_content': 'utm_content',
          'utm_term': 'utm_term',
          'parameter': 'custom_parameters'
        };
        
        const dbColumnName = columnMappings[column] || column;
        const paramValue = (call as any)[dbColumnName];
        
        if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
          return <div className="truncate text-xs">{paramValue}</div>;
        }
        console.log('Unknown column:', column, 'mapped to:', dbColumnName, 'value:', paramValue);
        return <div className="truncate text-xs">-</div>;
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
            <CardDescription>Monitor and manage individual call activities</CardDescription>
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
          <div className="rounded-md border overflow-hidden">
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((column, columnIndex) => {
                    const columnDef = getDynamicColumnDefinition(column);
                    return (
                      <TableHead 
                        key={`header-${columnIndex}-${column}`} 
                        className="text-xs font-medium relative bg-muted/50"
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
                {filteredCalls.map((call, callIndex) => (
                  <>
                    <TableRow key={`call-row-${callIndex}`} className="hover:bg-muted/30">
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
                            <div className="flex items-center space-x-2">
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
                              {renderColumnValue(call, column)}
                            </div>
                          ) : (
                            renderColumnValue(call, column)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedRows.has(call.id) && (
                      <TableRow key={`expanded-${call.id}`}>
                        <TableCell colSpan={visibleColumns.length} className="p-0 bg-muted/20">
                          <div className="p-6 border-t transition-all duration-200">
                            <CallDetailsExpanded 
                              call={call}
                              campaign={campaigns.find(c => c.id === call.campaignId)}
                              buyer={call.buyerId ? buyers.find(b => b.id === call.buyerId) : undefined}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}