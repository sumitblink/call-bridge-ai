import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { 
  Filter, 
  Download, 
  RefreshCw,
  Calendar,
  ChevronDown,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import CallActivity from "./CallActivity";
import SummaryReport from "./SummaryReport";
import CustomReportsManager from "./CustomReportsManager";
import EnhancedTimelineReport from "./EnhancedTimelineReport";
import BulkCallActions from "./BulkCallActions";

// Types and Interfaces
interface FilterRule {
  field: string;
  operator: string;
  value: string;
}

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  publisher: string;
  target: string;
  buyer: string;
  dialedNumbers: string[];
  numberPool: string;
  lastCallDate: string;
  duplicate: string;
  tags: string[];
  incoming: number;
  live: number;
  completed: number;
  ended: number;
  connected: number;
  paid: number;
  converted: number;
  noConnection: number;
  blocked: number;
  ivrHangup: number;
  rpc: number;
  revenue: number;
  payout: number;
  profit: number;
  margin: number;
  conversionRate: number;
  tcl: number;
  acl: number;
  totalCost: number;
  totalCalls: number;
}

export default function RingbaStyleReporting() {
  const queryClient = useQueryClient();
  const [activeFilters, setActiveFilters] = useState<FilterRule[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("today");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCalls, setSelectedCalls] = useState<any[]>([]);
  const [currentReportConfig, setCurrentReportConfig] = useState({
    filters: [],
    dateRange: "today",
    viewAs: "full",
    timezone: "UTC",
    visibleColumns: {}
  });

  // Fetch real summary data from API
  const { data: summaryResponse, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['/api/reporting/summary', { groupBy: 'campaign', filters: activeFilters, dateRange: 'today' }],
    queryFn: async () => {
      const params = new URLSearchParams({
        groupBy: 'campaign',
        dateRange: 'today',
        filters: JSON.stringify(activeFilters)
      });
      const response = await fetch(`/api/reporting/summary?${params}`);
      return response.json();
    }
  });

  const summaryData = summaryResponse?.summaries || [];

  // Fetch real timeline data from API
  const { data: timelineResponse, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['/api/reporting/timeline', { groupBy: 'hour', dateRange: 'today' }],
    queryFn: async () => {
      const params = new URLSearchParams({
        groupBy: 'hour',
        dateRange: 'today'
      });
      const response = await fetch(`/api/reporting/timeline?${params}`);
      return response.json();
    }
  });

  const chartData = timelineResponse?.timeline || [];

  // Auto refresh functionality - DISABLED to prevent freezing
  // useEffect(() => {
  //   let interval: NodeJS.Timeout;
  //   
  //   if (autoRefresh) {
  //     interval = setInterval(() => {
  //       // Invalidate and refetch all reporting queries
  //       queryClient.invalidateQueries({ queryKey: ['/api/reporting/summary'] });
  //       queryClient.invalidateQueries({ queryKey: ['/api/reporting/timeline'] });
  //       // Reset infinite query to first page to prevent conflicts
  //       queryClient.resetQueries({ queryKey: ['/api/calls'] });
  //     }, 120000); // Refresh every 2 minutes
  //   }
  //   
  //   return () => {
  //     if (interval) {
  //       clearInterval(interval);
  //     }
  //   };
  // }, [autoRefresh, queryClient]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/reporting/summary'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reporting/timeline'] });
    // Reset infinite query to first page to prevent conflicts
    queryClient.resetQueries({ queryKey: ['/api/calls'] });
  }, [queryClient]);

  // Export CSV functionality
  const exportCsv = () => {
    const headers = [
      'Campaign', 'Publisher', 'Target', 'Buyer', 'Dialed Numbers', 'Number Pool',
      'Last Call Date', 'Duplicate', 'Tags', 'Incoming', 'Live', 'Completed',
      'Ended', 'Connected', 'Paid', 'Converted', 'No Connection', 'Blocked',
      'IVR Hangup', 'RPC', 'Revenue', 'Payout', 'Profit', 'Margin %',
      'Conversion Rate %', 'TCL', 'ACL', 'Total Cost'
    ];
    
    const csvData = summaryData.map((summary: any) => [
      summary.campaignName,
      summary.publisher,
      summary.target,
      summary.buyer,
      summary.dialedNumbers.join(';'),
      summary.numberPool,
      summary.lastCallDate,
      summary.duplicate,
      summary.tags.join(';'),
      summary.incoming,
      summary.live,
      summary.completed,
      summary.ended,
      summary.connected,
      summary.paid,
      summary.converted,
      summary.noConnection,
      summary.blocked,
      summary.ivrHangup,
      `$${summary.rpc.toFixed(2)}`,
      `$${summary.revenue.toFixed(2)}`,
      `$${summary.payout.toFixed(2)}`,
      `$${summary.profit.toFixed(2)}`,
      `${summary.margin.toFixed(2)}%`,
      `${summary.conversionRate.toFixed(2)}%`,
      `${Math.floor(summary.tcl / 60)}m ${summary.tcl % 60}s`,
      `${summary.acl.toFixed(0)}s`,
      `$${summary.totalCost.toFixed(2)}`
    ]);

    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-reporting-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle filter clicks for cross-panel navigation
  const handleFilterClick = (field: string, value: string) => {
    const newFilter = { field, operator: 'equals', value };
    setActiveFilters([...activeFilters, newFilter]);
    setCurrentReportConfig({
      ...currentReportConfig,
      filters: [...currentReportConfig.filters, newFilter]
    });
  };

  // Handle time range selection from timeline
  const handleTimeRangeSelect = (startDate: string, endDate: string) => {
    setDateRange(`${startDate}_${endDate}`);
    setCurrentReportConfig({
      ...currentReportConfig,
      dateRange: `${startDate}_${endDate}`
    });
  };

  // Handle report configuration loading
  const handleLoadReportConfig = (config: any) => {
    setCurrentReportConfig(config);
    setActiveFilters(config.filters || []);
    setDateRange(config.dateRange || "today");
  };

  // Handle saving report configuration
  const handleSaveReportConfig = (name: string, description: string, isShared: boolean) => {
    console.log('Save report config:', { name, description, isShared, config: currentReportConfig });
  };

  // Clear call selection
  const handleClearSelection = () => {
    setSelectedCalls([]);
    setSelectedRows(new Set());
  };

  // Handle bulk action completion
  const handleActionComplete = () => {
    handleClearSelection();
  };

  return (
    <div className="space-y-1">
      {/* Comprehensive Four-Panel Header */}
      <div className="bg-gray-50 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Enhanced Reporting</span>
            <CustomReportsManager 
              currentConfig={currentReportConfig}
              onLoadReport={handleLoadReportConfig}
              onSaveReport={handleSaveReportConfig}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Updated a few seconds ago</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualRefresh}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              REFRESH
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled
              className="h-7 px-2 text-xs opacity-50"
            >
              AUTO REFRESH DISABLED
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} className="h-7 px-2 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkCallActions
        selectedCalls={selectedCalls}
        onClearSelection={handleClearSelection}
        onActionComplete={handleActionComplete}
      />

      {/* Single Unified Report Content */}
      <div className="p-4 space-y-6">
        {/* Timeline Report */}
        <EnhancedTimelineReport
          filters={activeFilters}
          dateRange={dateRange}
          onTimeRangeSelect={handleTimeRangeSelect}
        />
        
        {/* Summary Report below Timeline */}
        <SummaryReport
          filters={activeFilters}
          dateRange={dateRange}
          onFilterClick={handleFilterClick}
        />

        {/* Call Details below Summary */}
        <CallActivity
          selectedRows={selectedRows}
          onRowSelect={(rowId, isSelected) => {
            const newSelection = new Set(selectedRows);
            if (isSelected) {
              newSelection.add(rowId);
            } else {
              newSelection.delete(rowId);
            }
            setSelectedRows(newSelection);
            
            // Update selected calls for bulk actions
            const callsToUpdate = Array.from(newSelection);
            setSelectedCalls(callsToUpdate.map(id => ({ id, callId: id })));
          }}
        />
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="bg-white border-b px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
                {filter.field}: {filter.operator} "{filter.value}"
                <button 
                  onClick={() => setActiveFilters(prev => prev.filter((_, i) => i !== index))}
                  className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </Badge>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setActiveFilters([])}
              className="h-6 px-2 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}