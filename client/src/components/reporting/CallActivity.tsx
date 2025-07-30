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
    <div className="space-y-2">
      {/* Basic Info Cards - Start directly without header */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-2">
            <div className="text-xs text-gray-600">Call ID</div>
            <div className="font-mono text-xs">{call.callSid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <div className="text-xs text-gray-600">Campaign</div>
            <div className="text-xs">{campaign?.name || 'Unknown'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <div className="text-xs text-gray-600">Location</div>
            <div className="text-xs">{call.geoLocation || 'Unknown'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Three Basic Sections */}
      <div className="space-y-2">
        {/* IVR & Call Flow */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-medium mb-1">
            <Phone className="h-4 w-4" />
            IVR & Call Flow
          </h4>
          <div className="bg-gray-50 p-2 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
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
          <h4 className="flex items-center gap-2 text-sm font-medium mb-1">
            <Activity className="h-4 w-4" />
            Technical Details
          </h4>
          <div className="bg-gray-50 p-2 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2">
                <span className="text-gray-600">Recording:</span> 
                {call.recordingUrl && call.recordingSid ? (
                  <div className="mt-1">
                    <audio controls className="w-full max-w-md">
                      <source src={`/api/recordings/${call.recordingSid}`} type="audio/wav" />
                      <source src={`/api/recordings/${call.recordingSid}`} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <div className="text-xs text-gray-500 mt-1">
                      Duration: {call.recordingDuration ? `${call.recordingDuration}s` : 'Unknown'} | 
                      Status: {call.recordingStatus || 'completed'}
                    </div>
                  </div>
                ) : (
                  <span className="ml-2">Not available</span>
                )}
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
          <h4 className="flex items-center gap-2 text-sm font-medium mb-1">
            <Users className="h-4 w-4" />
            Routing Journey
          </h4>
          <div className="bg-gray-50 p-2 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Campaign:</span> {campaign?.name || 'Unknown'}
              </div>
              <div>
                <span className="text-gray-600">Buyer:</span> {(buyer as any)?.companyName || buyer?.name || 'No buyer assigned'}
              </div>
              <div>
                <span className="text-gray-600">Target:</span> {(targets.find((t: any) => t.id === (call as any).targetId))?.name || 'No target assigned'}
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

        {/* Pixel Fire Details */}
        {call.id === 85 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium mb-1">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              Pixel Fire
            </h4>
            <div className="bg-gray-50 p-2 rounded">
              <div className="bg-white p-2 rounded border text-xs space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Timestamp:</span>
                    <div className="font-mono">Jul 29 04:40:40 PM</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Field:</span>
                    <div>Tag Fire: User - Vertical (empty)</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Setting Id:</span>
                    <div className="font-mono">6888c6c36a77d44662342c40</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Setting Name:</span>
                    <div>RedTrack New Test - INCOMING</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Trigger On:</span>
                    <div className="capitalize">incoming</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">URL:</span>
                    <div className="font-mono text-blue-600 break-all">http://cy9n0.rdtk.io/postback?clickid=6888c6c36a77d44662342c40&type=CTC</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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

  // Infinite query for paginated calls with lazy loading
  const {
    data: callsData,
    isLoading: isLoadingCalls,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['/api/calls'],
    queryFn: ({ pageParam }: { pageParam: number }) => 
      fetch(`/api/calls?page=${pageParam}&limit=25`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(res => {
        if (!res.ok) {
          console.error('Calls API Error:', res.status, res.statusText);
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      }).then(data => {
        // console.log('Calls API Response:', data);
        return data;
      }).catch(error => {
        console.error('Calls API Fetch Error:', error);
        throw error;
      }) as Promise<PaginatedResponse>,
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse) => 
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  // Flatten all pages into single calls array
  const calls = callsData?.pages.flatMap((page: PaginatedResponse) => page.calls) || [];
  const totalCalls = callsData?.pages[0]?.pagination.total || 0;

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
    queryKey: ["/api/targets"]
  });

  const { data: pools = [], isLoading: isLoadingPools } = useQuery<any[]>({
    queryKey: ["/api/pools"]
  });

  // Debounced infinite scroll handler to prevent excessive calls
  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100; // Load when 100px from bottom

    if (scrolledToBottom) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
        const target = targets.find((t: any) => t.id === (call as any).targetId);
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
      case 'duplicate':
        return <div className="text-xs">No</div>;
      case 'previouslyConnected':
        return <div className="text-xs">No</div>;
      case 'numberPool':
        const pool = pools.find(p => p.id === call.numberPoolId);
        return <div className="truncate text-xs">{pool?.name || (call.numberPoolId ? 'Pool ' + call.numberPoolId : 'Direct')}</div>;
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
                        <TableCell colSpan={visibleColumns.length + 1} className="p-0 bg-muted/20">
                          <div className="p-3 border-t">
                            <CallDetailsExpanded 
                              call={call}
                              campaign={campaigns.find(c => c.id === call.campaignId)}
                              buyer={call.buyerId ? buyers.find(b => b.id === call.buyerId) : undefined}
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
            
            {/* Loading indicator for infinite scroll */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 border-t bg-muted/30">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Loading more calls...</span>
                </div>
              </div>
            )}
            
            {/* Load More Button and Total count indicator */}
            {calls.length > 0 && (
              <div className="border-t bg-muted/20">
                {hasNextPage && (
                  <div className="flex justify-center py-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="text-xs"
                    >
                      {isFetchingNextPage ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          <span>Loading...</span>
                        </div>
                      ) : (
                        `Load More Calls (${totalCalls - calls.length} remaining)`
                      )}
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
                  <span>Showing {calls.length} of {totalCalls} total calls</span>
                  {hasNextPage && !isFetchingNextPage && (
                    <span>Scroll down or click "Load More" to see more</span>
                  )}
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