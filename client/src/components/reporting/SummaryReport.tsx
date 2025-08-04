import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface SummaryData {
  groupBy: string;
  groupValue: string;
  totalCalls: number;
  incoming: number;
  live: number;
  completed: number;
  connected: number;
  converted: number;
  blocked: number;
  duplicate: number;
  revenue: number;
  payout: number;
  profit: number;
  margin: number;
  conversionRate: number;
  avgCallLength: number;
  totalCost: number;
  rpc: number; // Revenue per call
}

interface SummaryReportProps {
  filters: any[];
  dateRange: string;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  onFilterClick: (field: string, value: string) => void;
  onRemoveFilter: (index: number) => void;
  onClearAllFilters: () => void;
}

export default function SummaryReport({ filters, dateRange, customDateRange, onFilterClick, onRemoveFilter, onClearAllFilters }: SummaryReportProps) {
  const [activeTab, setActiveTab] = useState("campaign");
  const [selectedTag, setSelectedTag] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/reporting/summary', { groupBy: activeTab, filters, dateRange, customDateRange, tag: selectedTag }],
    queryFn: async () => {
      const params = new URLSearchParams({
        groupBy: activeTab,
        ...(selectedTag && selectedTag !== 'all' && { tag: selectedTag }),
        filters: JSON.stringify(filters)
      });
      
      // Handle custom date range
      if (dateRange === "custom" && customDateRange?.from && customDateRange?.to) {
        params.append('dateFrom', format(customDateRange.from, "yyyy-MM-dd"));
        params.append('dateTo', format(customDateRange.to, "yyyy-MM-dd"));
        params.append('dateRange', 'custom');
      } else {
        params.append('dateRange', dateRange);
      }
      
      const response = await fetch(`/api/reporting/summary?${params}`);
      return response.json();
    }
  });

  const summaryData = Array.isArray(data?.summaries) ? data.summaries : [];

  const { data: availableTags = [] } = useQuery({
    queryKey: ['/api/reporting/tags'],
    queryFn: async () => {
      const response = await fetch('/api/reporting/tags');
      return response.json();
    }
  });

  const exportSummary = () => {
    const params = new URLSearchParams({
      groupBy: activeTab,
      dateRange,
      format: 'csv',
      ...(selectedTag && selectedTag !== 'all' && { tag: selectedTag }),
      filters: JSON.stringify(filters)
    });
    window.open(`/api/reporting/summary/export?${params}`, '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const handleCellClick = (field: string, value: string) => {
    onFilterClick(field, value);
  };

  // Render group value with Ringba-style orange dashes for spaces
  const renderGroupValue = (value: string, groupType: string) => {
    if (!value) return '-no value-';
    
    // For tag grouping, show orange dashes for spaces to differentiate from "-no value-"
    if (groupType === 'tag' && value.includes(' ')) {
      return (
        <span>
          {value.split(' ').map((part, index) => (
            <span key={index}>
              {part}
              {index < value.split(' ').length - 1 && (
                <span className="text-orange-500 font-bold">-</span>
              )}
            </span>
          ))}
        </span>
      );
    }
    
    return value;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Summary Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Summary Report</CardTitle>
          <Button onClick={exportSummary} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Active Filters Display inside Summary Report */}
        {filters.length > 0 && (
          <div className="bg-gray-50 border rounded-lg px-3 py-2 mb-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-600 mr-2">Active Filters:</span>
              {filters.map((filter, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
                  {filter.field}: {filter.operator} "{filter.value}"
                  <button 
                    onClick={() => onRemoveFilter(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearAllFilters}
                className="h-6 px-2 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="campaign">Campaign</TabsTrigger>
              <TabsTrigger value="publisher">Publisher</TabsTrigger>
              <TabsTrigger value="pool">Pool</TabsTrigger>
              <TabsTrigger value="dialedNumber">Dialed #</TabsTrigger>
              <TabsTrigger value="duplicate">Duplicate</TabsTrigger>
              <TabsTrigger value="target">Target Name</TabsTrigger>
              <TabsTrigger value="date">Date</TabsTrigger>
              <TabsTrigger value="tag">Tag</TabsTrigger>
            </TabsList>
            
            {activeTab === 'tag' && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a reporting tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {availableTags.map((tag: any) => (
                    <SelectItem key={tag.name} value={tag.name}>
                      {tag.displayName || tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">
                      {activeTab === 'campaign' && 'Campaign'}
                      {activeTab === 'publisher' && 'Publisher'}
                      {activeTab === 'target' && 'Target'}
                      {activeTab === 'buyer' && 'Buyer'}
                      {activeTab === 'dialedNumber' && 'Dialed Number'}
                      {activeTab === 'pool' && 'Number Pool'}
                      {activeTab === 'date' && 'Date'}
                      {activeTab === 'duplicate' && 'Duplicate Status'}
                      {activeTab === 'tag' && selectedTag}
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Incoming</TableHead>
                    <TableHead className="text-right">Connected</TableHead>
                    <TableHead className="text-right">Converted</TableHead>
                    <TableHead className="text-right">Conv %</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="text-right">RPC</TableHead>
                    <TableHead className="text-right">Avg Length</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData.map((row: SummaryData, index: number) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => handleCellClick(activeTab, row.groupValue)}
                      >
                        <div className="flex items-center gap-2">
                          {renderGroupValue(row.groupValue, activeTab)}
                          {row.duplicate > 0 && <Badge variant="secondary" className="text-xs">Dup</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.totalCalls.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.incoming.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {row.connected.toLocaleString()}
                          {row.connected > 0 && getTrendIcon(row.connected - row.totalCalls * 0.5)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {row.converted.toLocaleString()}
                          {row.converted > 0 && (
                            <Badge variant={row.conversionRate > 0.3 ? "default" : "secondary"} className="text-xs">
                              {formatPercent(row.conversionRate)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.conversionRate > 0.3 ? "text-green-600 font-medium" : ""}>
                          {formatPercent(row.conversionRate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(row.payout)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.profit > 0 ? "text-green-600 font-medium" : "text-red-600"}>
                          {formatCurrency(row.profit)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.margin > 0.2 ? "text-green-600" : row.margin > 0 ? "text-yellow-600" : "text-red-600"}>
                          {formatPercent(row.margin)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.rpc)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDuration(row.avgCallLength)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {summaryData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                        No data available for the selected criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}