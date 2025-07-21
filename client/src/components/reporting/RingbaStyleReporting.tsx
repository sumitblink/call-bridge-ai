import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface CallData {
  id: number;
  campaignId: string;
  buyerId?: number;
  fromNumber: string;
  toNumber: string;
  dialedNumber?: string;
  duration: number;
  status: string;
  disposition?: string;
  cost?: string | number;
  revenue?: string | number;
  profit?: string | number;
  margin?: string | number;
  createdAt: string;
  campaign?: { id: string; name: string };
  buyer?: { id: number; name: string };
  utmSource?: string;
  utmMedium?: string;
  city?: string;
  state?: string;
  country?: string;
  deviceType?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
}

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  publisher: string;
  target: string;
  buyer: string;
  dialedNumbers: string[];
  numberPool: string;
  totalCalls: number;
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
  duplicate: number;
  revenue: number;
  payout: number;
  profit: number;
  margin: number;
  conversionRate: number;
  rpc: number;
  tcl: number; // Total Call Length in seconds
  acl: number; // Average Call Length in seconds
  totalCost: number;
  tags: string[];
  lastCallDate: string;
}

export default function RingbaStyleReporting() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("today");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState("campaign");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    campaign: true,
    publisher: true,
    target: true,
    buyer: true,
    dialedNumber: true,
    numberPool: true,
    date: true,
    duplicate: true,
    tags: true,
    incoming: true,
    live: true,
    completed: true,
    ended: true,
    connected: true,
    paid: true,
    converted: true,
    noConnection: true,
    blocked: true,
    ivrHangup: true,
    rpc: true,
    revenue: true,
    payout: true,
    profit: true,
    margin: true,
    conversionRate: true,
    tcl: true,
    acl: true,
    totalCost: true
  });

  // Fetch enhanced calls data
  const { data: calls = [], isLoading, refetch } = useQuery<CallData[]>({
    queryKey: ["/api/calls/enhanced"],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Calculate campaign summaries from call data
  const campaignSummaries: CampaignSummary[] = calls.reduce((acc, call) => {
    const campaignId = call.campaignId;
    let summary = acc.find(s => s.campaignId === campaignId);
    
    if (!summary) {
      summary = {
        campaignId,
        campaignName: call.campaign?.name || 'Unknown Campaign',
        publisher: '-',
        target: 'Live',
        buyer: call.buyer?.name || 'Unknown Buyer',
        dialedNumbers: [],
        numberPool: 'Pool',
        totalCalls: 0,
        incoming: 0,
        live: 0,
        completed: 0,
        ended: 0,
        connected: 0,
        paid: 0,
        converted: 0,
        noConnection: 0,
        blocked: 0,
        ivrHangup: 0,
        duplicate: 0,
        revenue: 0,
        payout: 0,
        profit: 0,
        margin: 0,
        conversionRate: 0,
        rpc: 0,
        tcl: 0,
        acl: 0,
        totalCost: 0,
        tags: [],
        lastCallDate: call.createdAt
      };
      acc.push(summary);
    }

    // Update summary metrics
    summary.totalCalls += 1;
    summary.incoming += 1;
    
    if (call.status === 'in_progress') summary.live += 1;
    if (call.status === 'completed') {
      summary.completed += 1;
      summary.connected += 1;
    }
    if (call.status === 'failed' || call.status === 'busy' || call.status === 'no_answer') {
      summary.ended += 1;
      summary.noConnection += 1;
    }
    
    // Financial calculations
    const revenue = Number(call.revenue) || 0;
    const cost = Number(call.cost) || 0;
    const profit = revenue - cost;
    
    summary.revenue += revenue;
    summary.totalCost += cost;
    summary.payout += cost;
    summary.profit += profit;
    summary.tcl += call.duration;
    
    // Track dialed numbers and tags
    if (call.dialedNumber && !summary.dialedNumbers.includes(call.dialedNumber)) {
      summary.dialedNumbers.push(call.dialedNumber);
    }
    if (call.sub1 && !summary.tags.includes(call.sub1)) {
      summary.tags.push(call.sub1);
    }
    
    // Update last call date if newer
    if (new Date(call.createdAt) > new Date(summary.lastCallDate)) {
      summary.lastCallDate = call.createdAt;
    }

    return acc;
  }, [] as CampaignSummary[]);

  // Calculate derived metrics for each summary
  campaignSummaries.forEach(summary => {
    if (summary.revenue > 0) {
      summary.margin = (summary.profit / summary.revenue) * 100;
    }
    if (summary.connected > 0) {
      summary.conversionRate = (summary.converted / summary.connected) * 100;
      summary.rpc = summary.revenue / summary.connected;
      summary.acl = summary.tcl / summary.connected;
    }
  });

  // Calculate timeline data for chart (calls per hour)
  const timelineData = calls.reduce((acc, call) => {
    const hour = new Date(call.createdAt).getHours();
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    
    if (!acc[timeSlot]) {
      acc[timeSlot] = { time: timeSlot, calls: 0, revenue: 0 };
    }
    acc[timeSlot].calls += 1;
    acc[timeSlot].revenue += parseFloat(call.revenue?.toString() || '0');
    return acc;
  }, {} as Record<string, { time: string; calls: number; revenue: number }>);

  const chartData = Object.values(timelineData).sort((a, b) => 
    parseInt(a.time.split(':')[0]) - parseInt(b.time.split(':')[0])
  );

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: "bg-green-500 text-white",
      failed: "bg-red-500 text-white",
      busy: "bg-yellow-500 text-white",
      "no_answer": "bg-gray-500 text-white",
      "in_progress": "bg-blue-500 text-white"
    };
    return statusColors[status] || "bg-gray-500 text-white";
  };

  const filterButtons = [
    { id: "campaign", label: "CAMPAIGNS", icon: "📊" },
    { id: "target", label: "TARGET", icon: "🎯" },
    { id: "buyer", label: "BUYER", icon: "👤" },
    { id: "number_pool", label: "NUMBER POOL", icon: "📞" },
    { id: "publisher", label: "PUBLISHER", icon: "📰" },
    { id: "numbers", label: "NUMBERS", icon: "🔢" },
    { id: "inbound_call_id", label: "INBOUND CALL ID", icon: "📱" },
    { id: "is_duplicate", label: "IS DUPLICATE", icon: "📋" },
    { id: "caller_id", label: "CALLER ID", icon: "📲" },
    { id: "filter", label: "FILTER", icon: "🔍" }
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const exportToCSV = () => {
    const headers = [
      'Campaign', 'Publisher', 'Target', 'Buyer', 'Dialed #', 'Number Pool', 'Date',
      'Duplicate', 'Tags', 'Incoming', 'Live', 'Completed', 'Ended', 'Connected',
      'Paid', 'Converted', 'No Connection', 'Blocked', 'IVR Hangup', 'RPC',
      'Revenue', 'Payout', 'Profit', 'Margin', 'Conversion Rate', 'TCL', 'ACL', 'Total Cost'
    ];
    
    const csvData = campaignSummaries.map(summary => [
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
      formatCurrency(summary.rpc),
      formatCurrency(summary.revenue),
      formatCurrency(summary.payout),
      formatCurrency(summary.profit),
      `${summary.margin.toFixed(2)}%`,
      `${summary.conversionRate.toFixed(2)}%`,
      formatDuration(summary.tcl),
      formatDuration(summary.acl),
      formatCurrency(summary.totalCost)
    ]);

    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ringba-report-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter summaries based on active tab - group data by the selected dimension
  const getFilteredData = () => {
    switch (activeTab) {
      case 'campaign':
        // Group by campaign - show each campaign as a row
        return campaignSummaries;
        
      case 'publisher':
        // Group by publisher - combine campaigns by publisher
        const publisherGroups = campaignSummaries.reduce((acc, summary) => {
          const publisher = summary.publisher || 'Unknown Publisher';
          if (!acc[publisher]) {
            acc[publisher] = {
              ...summary,
              campaignName: publisher,
              campaignId: `publisher-${publisher}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[publisher];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(publisherGroups);
        
      case 'target':
        // Group by target
        const targetGroups = campaignSummaries.reduce((acc, summary) => {
          const target = summary.target || 'Unknown Target';
          if (!acc[target]) {
            acc[target] = {
              ...summary,
              campaignName: target,
              campaignId: `target-${target}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[target];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(targetGroups);
        
      case 'buyer':
        // Group by buyer
        const buyerGroups = campaignSummaries.reduce((acc, summary) => {
          const buyer = summary.buyer || 'Unknown Buyer';
          if (!acc[buyer]) {
            acc[buyer] = {
              ...summary,
              campaignName: buyer,
              campaignId: `buyer-${buyer}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[buyer];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(buyerGroups);
        
      case 'dialed':
        // Group by dialed numbers - show each unique dialed number
        const dialedGroups: Record<string, CampaignSummary> = {};
        campaignSummaries.forEach(summary => {
          summary.dialedNumbers.forEach(number => {
            if (!dialedGroups[number]) {
              dialedGroups[number] = {
                ...summary,
                campaignName: number,
                campaignId: `dialed-${number}`,
                totalCalls: 0,
                incoming: 0,
                connected: 0,
                revenue: 0,
                profit: 0,
                tcl: 0,
                dialedNumbers: [number]
              };
            }
            // Note: This is simplified - in real implementation you'd need to track which calls used which numbers
            dialedGroups[number].totalCalls += Math.floor(summary.totalCalls / summary.dialedNumbers.length);
          });
        });
        return Object.values(dialedGroups);
        
      case 'pool':
        // Group by number pool
        const poolGroups = campaignSummaries.reduce((acc, summary) => {
          const pool = summary.numberPool || 'Unknown Pool';
          if (!acc[pool]) {
            acc[pool] = {
              ...summary,
              campaignName: pool,
              campaignId: `pool-${pool}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[pool];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(poolGroups);
        
      case 'date':
        // Group by date
        const dateGroups = campaignSummaries.reduce((acc, summary) => {
          const date = new Date(summary.lastCallDate).toDateString();
          if (!acc[date]) {
            acc[date] = {
              ...summary,
              campaignName: date,
              campaignId: `date-${date}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[date];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(dateGroups);
        
      case 'duplicate':
        // Group by duplicate status
        return campaignSummaries.filter(summary => summary.duplicate > 0);
        
      case 'tags':
        // Group by tags - show each unique tag
        const tagGroups: Record<string, CampaignSummary> = {};
        campaignSummaries.forEach(summary => {
          summary.tags.forEach(tag => {
            if (!tagGroups[tag]) {
              tagGroups[tag] = {
                ...summary,
                campaignName: tag,
                campaignId: `tag-${tag}`,
                totalCalls: 0,
                incoming: 0,
                connected: 0,
                revenue: 0,
                profit: 0,
                tcl: 0,
                dialedNumbers: [],
                tags: [tag]
              };
            }
            // Distribute metrics across tags
            tagGroups[tag].totalCalls += Math.floor(summary.totalCalls / summary.tags.length);
          });
        });
        return Object.values(tagGroups);
        
      default:
        return campaignSummaries;
    }
  };

  const filteredSummaries = getFilteredData();

  return (
    <div className="space-y-1">
      {/* Ringba-style Header with Filters */}
      <div className="bg-gray-50 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Untitled Report</span>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
              SAVE
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Updated a few seconds ago</span>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-7 px-2 text-xs"
            >
              AUTO REFRESH
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              🔍
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              📧
            </Button>
          </div>
        </div>
      </div>

      {/* Ringba-style Filter Buttons */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {filterButtons.map((button) => (
            <Button
              key={button.id}
              size="sm"
              variant={activeFilters.includes(button.id) ? "default" : "outline"}
              onClick={() => toggleFilter(button.id)}
              className="h-7 px-2 text-xs font-medium"
            >
              {button.label}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          ))}
        </div>
      </div>

      {/* Ringba-style Timeline Chart */}
      <Card className="mx-4 mt-2">
        <CardContent className="p-4">
          <div className="mb-2">
            <h3 className="text-sm font-medium text-gray-700">Timeline</h3>
            <Select defaultValue="hourly">
              <SelectTrigger className="w-32 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Auto (By Hour)</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'calls' ? 'Calls' : 'Revenue']}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12, padding: 8 }}
                />
                <Bar 
                  dataKey="calls" 
                  fill="#F59E0B" 
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary Table with Tabs */}
      <Card className="mx-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Summary</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={exportToCSV}
              >
                <Download className="h-3 w-3 mr-1" />
                EXPORT CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Ringba-style Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-9 h-8 bg-gray-100">
              <TabsTrigger value="campaign" className="text-xs px-2">Campaign</TabsTrigger>
              <TabsTrigger value="publisher" className="text-xs px-2">Publisher</TabsTrigger>
              <TabsTrigger value="target" className="text-xs px-2">Target</TabsTrigger>
              <TabsTrigger value="buyer" className="text-xs px-2">Buyer</TabsTrigger>
              <TabsTrigger value="dialed" className="text-xs px-2">Dialed #</TabsTrigger>
              <TabsTrigger value="pool" className="text-xs px-2">Number Pool</TabsTrigger>
              <TabsTrigger value="date" className="text-xs px-2">Date</TabsTrigger>
              <TabsTrigger value="duplicate" className="text-xs px-2">Duplicate</TabsTrigger>
              <TabsTrigger value="tags" className="text-xs px-2">Tags</TabsTrigger>
            </TabsList>

            {/* Single tab content that changes based on active tab */}
            <div className="mt-4">
              <ReportSummaryTable 
                summaries={filteredSummaries} 
                visibleColumns={visibleColumns} 
                isLoading={isLoading} 
                activeTab={activeTab}
              />
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Report Summary Table Component
interface ReportSummaryTableProps {
  summaries: CampaignSummary[];
  visibleColumns: Record<string, boolean>;
  isLoading: boolean;
  activeTab: string;
}

function ReportSummaryTable({ summaries, visibleColumns, isLoading, activeTab }: ReportSummaryTableProps) {
  // Define which columns to show for each tab
  const getColumnsForTab = (tab: string) => {
    const baseColumns = ['incoming', 'live', 'completed', 'ended', 'connected', 'paid', 'converted', 'noConnection', 'blocked', 'ivrHangup', 'rpc', 'revenue', 'payout', 'profit', 'margin', 'conversionRate', 'tcl', 'acl', 'totalCost'];
    
    switch (tab) {
      case 'campaign':
        return ['campaign', ...baseColumns];
      case 'publisher':
        return ['publisher', ...baseColumns];
      case 'target':
        return ['target', ...baseColumns];
      case 'buyer':
        return ['buyer', ...baseColumns];
      case 'dialed':
        return ['dialedNumber', ...baseColumns];
      case 'pool':
        return ['numberPool', ...baseColumns];
      case 'date':
        return ['date', ...baseColumns];
      case 'duplicate':
        return ['duplicate', ...baseColumns];
      case 'tags':
        return ['tags', ...baseColumns];
      default:
        return ['campaign', 'publisher', 'target', 'buyer', 'dialedNumber', 'numberPool', 'date', 'duplicate', 'tags', ...baseColumns];
    }
  };

  const activeColumns = getColumnsForTab(activeTab);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="rounded border overflow-hidden">
      <div className="overflow-x-auto max-h-96">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10">
            <TableRow>
              {activeColumns.includes('campaign') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Campaign</TableHead>}
              {activeColumns.includes('publisher') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Publisher</TableHead>}
              {activeColumns.includes('target') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Target</TableHead>}
              {activeColumns.includes('buyer') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Buyer</TableHead>}
              {activeColumns.includes('dialedNumber') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Dialed #</TableHead>}
              {activeColumns.includes('numberPool') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Number Pool</TableHead>}
              {activeColumns.includes('date') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Date</TableHead>}
              {activeColumns.includes('duplicate') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Duplicate</TableHead>}
              {activeColumns.includes('tags') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Tags</TableHead>}
              {activeColumns.includes('incoming') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Incoming</TableHead>}
              {activeColumns.includes('live') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Live</TableHead>}
              {activeColumns.includes('completed') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Completed</TableHead>}
              {activeColumns.includes('ended') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Ended</TableHead>}
              {activeColumns.includes('connected') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Connected</TableHead>}
              {activeColumns.includes('paid') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Paid</TableHead>}
              {activeColumns.includes('converted') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Converted</TableHead>}
              {activeColumns.includes('noConnection') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">No Connection</TableHead>}
              {activeColumns.includes('blocked') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Blocked</TableHead>}
              {activeColumns.includes('ivrHangup') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">IVR Hangup</TableHead>}
              {activeColumns.includes('rpc') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">RPC</TableHead>}
              {activeColumns.includes('revenue') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Revenue</TableHead>}
              {activeColumns.includes('payout') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Payout</TableHead>}
              {activeColumns.includes('profit') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Profit</TableHead>}
              {activeColumns.includes('margin') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Margin</TableHead>}
              {activeColumns.includes('conversionRate') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Conversion Rate</TableHead>}
              {activeColumns.includes('tcl') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">TCL</TableHead>}
              {activeColumns.includes('acl') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">ACL</TableHead>}
              {activeColumns.includes('totalCost') && <TableHead className="text-xs font-medium text-gray-600 py-2 px-2">Total Cost</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((summary) => (
              <TableRow key={summary.campaignId} className="hover:bg-gray-50">
                {activeColumns.includes('campaign') && (
                  <TableCell className="text-xs py-1 px-2">
                    <button className="text-blue-600 hover:underline text-left truncate max-w-24">
                      {summary.campaignName}
                    </button>
                  </TableCell>
                )}
                {activeColumns.includes('publisher') && <TableCell className="text-xs py-1 px-2">{summary.publisher}</TableCell>}
                {activeColumns.includes('target') && <TableCell className="text-xs py-1 px-2">{summary.target}</TableCell>}
                {activeColumns.includes('buyer') && <TableCell className="text-xs py-1 px-2 text-blue-600 truncate max-w-20">{summary.buyer}</TableCell>}
                {activeColumns.includes('dialedNumber') && (
                  <TableCell className="text-xs py-1 px-2 font-mono">
                    {summary.dialedNumbers.slice(0, 1).join(', ')}{summary.dialedNumbers.length > 1 && ` +${summary.dialedNumbers.length - 1}`}
                  </TableCell>
                )}
                {activeColumns.includes('numberPool') && <TableCell className="text-xs py-1 px-2">{summary.numberPool}</TableCell>}
                {activeColumns.includes('date') && <TableCell className="text-xs py-1 px-2">{formatDistanceToNow(new Date(summary.lastCallDate), { addSuffix: true })}</TableCell>}
                {activeColumns.includes('duplicate') && (
                  <TableCell className="text-xs py-1 px-2">
                    <Badge variant="outline" className="text-xs">
                      {summary.duplicate}
                    </Badge>
                  </TableCell>
                )}
                {activeColumns.includes('tags') && (
                  <TableCell className="text-xs py-1 px-2">
                    {summary.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs px-1 mr-1">
                        {tag}
                      </Badge>
                    ))}
                    {summary.tags.length > 2 && <span className="text-gray-500">+{summary.tags.length - 2}</span>}
                  </TableCell>
                )}
                {activeColumns.includes('incoming') && <TableCell className="text-xs py-1 px-2 text-center">{summary.incoming}</TableCell>}
                {activeColumns.includes('live') && <TableCell className="text-xs py-1 px-2 text-center">{summary.live}</TableCell>}
                {activeColumns.includes('completed') && <TableCell className="text-xs py-1 px-2 text-center">{summary.completed}</TableCell>}
                {activeColumns.includes('ended') && <TableCell className="text-xs py-1 px-2 text-center">{summary.ended}</TableCell>}
                {activeColumns.includes('connected') && <TableCell className="text-xs py-1 px-2 text-center text-green-600 font-medium">{summary.connected}</TableCell>}
                {activeColumns.includes('paid') && <TableCell className="text-xs py-1 px-2 text-center">{summary.paid}</TableCell>}
                {activeColumns.includes('converted') && <TableCell className="text-xs py-1 px-2 text-center text-green-600 font-medium">{summary.converted}</TableCell>}
                {activeColumns.includes('noConnection') && <TableCell className="text-xs py-1 px-2 text-center text-red-600">{summary.noConnection}</TableCell>}
                {activeColumns.includes('blocked') && <TableCell className="text-xs py-1 px-2 text-center text-orange-600">{summary.blocked}</TableCell>}
                {activeColumns.includes('ivrHangup') && <TableCell className="text-xs py-1 px-2 text-center">{summary.ivrHangup}</TableCell>}
                {activeColumns.includes('rpc') && <TableCell className="text-xs py-1 px-2 text-green-600 font-medium">{formatCurrency(summary.rpc)}</TableCell>}
                {activeColumns.includes('revenue') && <TableCell className="text-xs py-1 px-2 text-green-600 font-medium">{formatCurrency(summary.revenue)}</TableCell>}
                {activeColumns.includes('payout') && <TableCell className="text-xs py-1 px-2 text-red-600">{formatCurrency(summary.payout)}</TableCell>}
                {activeColumns.includes('profit') && <TableCell className="text-xs py-1 px-2 text-green-600 font-medium">{formatCurrency(summary.profit)}</TableCell>}
                {activeColumns.includes('margin') && <TableCell className="text-xs py-1 px-2 font-medium">{summary.margin.toFixed(1)}%</TableCell>}
                {activeColumns.includes('conversionRate') && <TableCell className="text-xs py-1 px-2">{summary.conversionRate.toFixed(1)}%</TableCell>}
                {activeColumns.includes('tcl') && <TableCell className="text-xs py-1 px-2 font-mono">{formatDuration(summary.tcl)}</TableCell>}
                {activeColumns.includes('acl') && <TableCell className="text-xs py-1 px-2 font-mono">{formatDuration(summary.acl)}</TableCell>}
                {activeColumns.includes('totalCost') && <TableCell className="text-xs py-1 px-2 text-red-600">{formatCurrency(summary.totalCost)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}