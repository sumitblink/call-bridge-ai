import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Phone, 
  Users, 
  Target,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import CallDetailsAccordion from "@/components/CallDetailsAccordion";
import AdvancedTagFiltering, { TagFilters } from "./AdvancedTagFiltering";

interface CallWithDetails {
  id: number;
  campaignId: string;
  buyerId?: number;
  callSid?: string;
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
  // Enhanced attribution fields
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  city?: string;
  state?: string;
  country?: string;
  deviceType?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
  keyword?: string;
  adGroup?: string;
  clickId?: string;
}

interface ReportingSummary {
  totalCalls: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgCallDuration: number;
  conversionRate: number;
  topSources: Array<{ name: string; calls: number; revenue: number }>;
  topCampaigns: Array<{ name: string; calls: number; revenue: number }>;
  callsByHour: Array<{ hour: string; calls: number }>;
  performanceByTag: Record<string, { calls: number; revenue: number; profit: number }>;
}

export default function ComprehensiveReporting() {
  const [activeFilters, setActiveFilters] = useState<TagFilters>({
    dateRange: "today"
  });
  const [viewType, setViewType] = useState<"summary" | "timeline" | "detailed">("summary");

  // Fetch enhanced calls with filtering
  const { data: calls = [], isLoading } = useQuery<CallWithDetails[]>({
    queryKey: ["/api/calls/enhanced", activeFilters],
    enabled: true
  });

  // Fetch reporting summary
  const { data: summary } = useQuery<ReportingSummary>({
    queryKey: ["/api/reporting/summary", activeFilters],
  });

  const handleFiltersChange = (filters: TagFilters) => {
    setActiveFilters(filters);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Group calls by different dimensions for analytics
  const groupCallsByDimension = (dimension: keyof CallWithDetails) => {
    const grouped = calls.reduce((acc, call) => {
      const key = call[dimension] as string || 'Unknown';
      if (!acc[key]) {
        acc[key] = { calls: 0, revenue: 0, profit: 0 };
      }
      acc[key].calls += 1;
      acc[key].revenue += parseFloat(call.revenue?.toString() || '0');
      acc[key].profit += parseFloat(call.profit?.toString() || '0');
      return acc;
    }, {} as Record<string, { calls: number; revenue: number; profit: number }>);

    return Object.entries(grouped)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);
  };

  const exportToCSV = () => {
    const headers = [
      'Call ID', 'Campaign', 'From', 'To', 'Duration', 'Status', 'Revenue', 'Cost', 'Profit',
      'UTM Source', 'UTM Medium', 'UTM Campaign', 'Keyword', 'Device Type', 'Location',
      'Sub1', 'Sub2', 'Sub3', 'Sub4', 'Sub5', 'Created At'
    ];
    
    const csvData = calls.map(call => [
      call.id,
      call.campaign?.name || '',
      call.fromNumber,
      call.toNumber,
      call.duration,
      call.status,
      call.revenue || 0,
      call.cost || 0,
      call.profit || 0,
      call.utmSource || '',
      call.utmMedium || '',
      call.utmCampaign || '',
      call.keyword || '',
      call.deviceType || '',
      `${call.city || ''}, ${call.state || ''}, ${call.country || ''}`,
      call.sub1 || '',
      call.sub2 || '',
      call.sub3 || '',
      call.sub4 || '',
      call.sub5 || '',
      call.createdAt
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const renderSummaryView = () => {
    const totalRevenue = calls.reduce((sum, call) => sum + parseFloat(call.revenue?.toString() || '0'), 0);
    const totalCost = calls.reduce((sum, call) => sum + parseFloat(call.cost?.toString() || '0'), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgDuration = calls.length > 0 ? calls.reduce((sum, call) => sum + call.duration, 0) / calls.length : 0;
    const conversionRate = calls.filter(call => call.status === 'completed').length / Math.max(calls.length, 1) * 100;

    // Analytics charts data
    const sourceData = groupCallsByDimension('utmSource');
    const campaignData = groupCallsByDimension('campaignId');
    const deviceData = groupCallsByDimension('deviceType');
    const locationData = groupCallsByDimension('state');

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Calls</p>
                  <p className="text-2xl font-bold">{calls.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Traffic Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourceData.map(([name, data]) => ({ name, ...data }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => name === 'revenue' ? formatCurrency(value as number) : value} />
                  <Bar dataKey="calls" fill="#3b82f6" name="Calls" />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Device Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceData.map(([name, data]) => ({ name, value: data.calls }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Campaign Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignData.slice(0, 5).map(([campaignId, data]) => {
                  const campaign = calls.find(c => c.campaignId === campaignId)?.campaign;
                  return (
                    <div key={campaignId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{campaign?.name || `Campaign ${campaignId.slice(0, 8)}`}</p>
                        <p className="text-sm text-gray-600">{data.calls} calls</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{formatCurrency(data.revenue)}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(data.profit)} profit</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Top Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationData.slice(0, 5).map(([state, data]) => (
                  <div key={state} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{state}</p>
                      <Progress value={(data.calls / calls.length) * 100} className="w-32 h-2" />
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{data.calls} calls</p>
                      <p className="text-sm text-gray-600">{formatCurrency(data.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderTimelineView = () => {
    // Group calls by hour for timeline view
    const hourlyData = calls.reduce((acc, call) => {
      const hour = new Date(call.createdAt).getHours();
      const key = `${hour}:00`;
      if (!acc[key]) {
        acc[key] = { hour: key, calls: 0, revenue: 0 };
      }
      acc[key].calls += 1;
      acc[key].revenue += parseFloat(call.revenue?.toString() || '0');
      return acc;
    }, {} as Record<string, { hour: string; calls: number; revenue: number }>);

    const timelineData = Object.values(hourlyData).sort((a, b) => 
      parseInt(a.hour.split(':')[0]) - parseInt(b.hour.split(':')[0])
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Call Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value as number) : value,
                  name === 'revenue' ? 'Revenue' : 'Calls'
                ]}
              />
              <Bar yAxisId="left" dataKey="calls" fill="#3b82f6" name="calls" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" name="revenue" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderDetailedView = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detailed Call Report</span>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading detailed report...</div>
          ) : calls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No calls found matching your filters.
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => {
                // Transform the call data to match the accordion interface expectations
                const transformedCall = {
                  id: call.id,
                  campaignId: call.campaignId || call.campaign?.id,
                  buyerId: call.buyerId || call.buyer?.id,
                  callSid: call.callSid || `call_${call.id}`,
                  fromNumber: call.fromNumber,
                  toNumber: call.toNumber,
                  duration: call.duration,
                  status: call.status,
                  callQuality: call.callQuality,
                  recordingUrl: call.recordingUrl,
                  recordingSid: call.recordingSid,
                  recordingStatus: call.recordingStatus,
                  recordingDuration: call.recordingDuration,
                  transcription: call.transcription,
                  transcriptionStatus: call.transcriptionStatus,
                  cost: call.cost?.toString() || '0',
                  revenue: call.revenue?.toString() || '0',
                  geoLocation: call.geoLocation || [call.city, call.state, call.country].filter(Boolean).join(', '),
                  userAgent: call.userAgent,
                  createdAt: call.createdAt,
                  updatedAt: call.updatedAt
                };

                const campaign = call.campaign || {
                  id: call.campaignId,
                  name: 'Unknown Campaign',
                  description: null,
                  status: 'active',
                  phoneNumber: call.toNumber,
                  routingType: 'round_robin',
                  maxConcurrentCalls: 1,
                  callCap: 100,
                  geoTargeting: null,
                  timeZoneRestriction: null,
                  createdAt: call.createdAt,
                  updatedAt: call.updatedAt
                };

                const buyer = call.buyer || undefined;

                return (
                  <CallDetailsAccordion
                    key={call.id}
                    call={transformedCall}
                    campaign={campaign}
                    buyer={buyer}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Advanced Filtering */}
      <AdvancedTagFiltering 
        onFiltersChange={handleFiltersChange}
        activeFilters={activeFilters}
      />

      {/* View Toggle */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={viewType} onValueChange={(value) => setViewType(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary Analytics</TabsTrigger>
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Report</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Content based on view type */}
      {viewType === "summary" && renderSummaryView()}
      {viewType === "timeline" && renderTimelineView()}
      {viewType === "detailed" && renderDetailedView()}
    </div>
  );
}