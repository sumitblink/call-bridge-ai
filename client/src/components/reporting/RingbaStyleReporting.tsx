import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
  ChevronDown
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

export default function RingbaStyleReporting() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("today");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch enhanced calls data
  const { data: calls = [], isLoading, refetch } = useQuery<CallData[]>({
    queryKey: ["/api/calls/enhanced"],
    refetchInterval: autoRefresh ? 30000 : false,
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

      {/* Ringba-style Summary Section */}
      <Card className="mx-4">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Summary</h3>
          
          {/* Data Table - Ringba Style */}
          <div className="rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Campaign</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Publisher</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Target</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Buyer</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Dialed #</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Number Pool</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Date</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Duplicate</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Tags</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Payout</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Revenue</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Profit</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Margin</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Connected</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Duration</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">TCL</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">ACL</TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 py-2">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center py-8 text-sm text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : calls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center py-8 text-sm text-gray-500">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  calls.slice(0, 50).map((call) => (
                    <TableRow key={call.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs py-2">
                        <div className="text-blue-600 truncate max-w-24">
                          {call.campaign?.name || 'Campaign'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-2">-</TableCell>
                      <TableCell className="text-xs py-2">Live</TableCell>
                      <TableCell className="text-xs py-2">
                        <div className="text-blue-600 truncate max-w-20">
                          {call.buyer?.name || 'Buyer'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-2 font-mono">
                        {call.dialedNumber || call.toNumber}
                      </TableCell>
                      <TableCell className="text-xs py-2">Pool</TableCell>
                      <TableCell className="text-xs py-2">
                        {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant="outline" className="text-xs">
                          Blocked
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        {call.sub1 && (
                          <div className="flex gap-1">
                            <Badge variant="secondary" className="text-xs px-1">
                              {call.sub1}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-2">-</TableCell>
                      <TableCell className="text-xs py-2 text-green-600 font-medium">
                        {formatCurrency(call.revenue || 0)}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-green-600 font-medium">
                        {formatCurrency(call.profit || 0)}
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        {call.revenue && parseFloat(call.revenue.toString()) > 0 
                          ? `${((parseFloat(call.profit?.toString() || '0') / parseFloat(call.revenue.toString())) * 100).toFixed(1)}%`
                          : '0%'}
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge className={getStatusBadge(call.status)} variant="secondary">
                          {call.status === 'completed' ? 'Connected' : 'No Connect'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2 font-mono">
                        {formatDuration(call.duration)}
                      </TableCell>
                      <TableCell className="text-xs py-2">-</TableCell>
                      <TableCell className="text-xs py-2">-</TableCell>
                      <TableCell className="text-xs py-2 text-red-600">
                        {formatCurrency(call.cost || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Export Button */}
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={() => {
                // Export functionality
                const csv = calls.map(call => [
                  call.campaign?.name || '',
                  call.buyer?.name || '',
                  call.dialedNumber || call.toNumber,
                  call.createdAt,
                  call.status,
                  call.duration,
                  call.revenue || 0,
                  call.cost || 0,
                  call.profit || 0
                ].join(',')).join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ringba-report-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              EXPORT CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}