import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { 
  BarChart3, TrendingUp, DollarSign, Phone, Filter, Download, 
  Search, Tag, Calendar, MapPin, Users, Target 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CallWithDetails {
  id: number;
  campaignId: string;
  campaignName: string;
  buyerId: number;
  buyerName: string;
  publisherId: number;
  publisherName: string;
  fromNumber: string;
  toNumber: string;
  dialedNumber: string;
  duration: number;
  ringTime: number;
  talkTime: number;
  status: string;
  disposition: string;
  callQuality: string;
  cost: string;
  revenue: string;
  payout: string;
  profit: string;
  margin: string;
  tags: string[];
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  sub1: string;
  sub2: string;
  sub3: string;
  sub4: string;
  sub5: string;
  clickId: string;
  keyword: string;
  adGroup: string;
  city: string;
  state: string;
  country: string;
  deviceType: string;
  isConverted: boolean;
  conversionType: string;
  conversionValue: string;
  createdAt: string;
}

export function AdvancedReporting() {
  const [filters, setFilters] = useState({
    dateRange: "today",
    campaign: "all",
    publisher: "all",
    buyer: "all",
    status: "all",
    utmSource: "all",
    utmMedium: "all",
    sub1: "all",
    sub2: "all",
    sub3: "all",
    sub4: "all",
    sub5: "all",
    deviceType: "all",
    location: "all",
    minDuration: "",
    searchTerm: "",
    tags: "",
  });

  const [activeView, setActiveView] = useState<"summary" | "timeline" | "breakdown">("summary");

  // Fetch enhanced calls data
  const { data: calls = [], isLoading } = useQuery<CallWithDetails[]>({
    queryKey: ["/api/calls/enhanced", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`/api/calls/enhanced?${params}`);
      if (!response.ok) throw new Error("Failed to fetch calls");
      return response.json();
    },
  });

  // Fetch campaigns for dropdown
  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  // Compute analytics data
  const analytics = useMemo(() => {
    const totalCalls = calls.length;
    const totalRevenue = calls.reduce((sum, call) => sum + parseFloat(call.revenue || '0'), 0);
    const totalCost = calls.reduce((sum, call) => sum + parseFloat(call.cost || '0'), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
    const conversionRate = totalCalls > 0 ? ((calls.filter(call => call.isConverted).length / totalCalls) * 100) : 0;
    
    // Group by different dimensions
    const byCampaign = calls.reduce((acc, call) => {
      const key = call.campaignName || 'Unknown';
      if (!acc[key]) acc[key] = { calls: 0, revenue: 0, profit: 0, conversions: 0 };
      acc[key].calls++;
      acc[key].revenue += parseFloat(call.revenue || '0');
      acc[key].profit += parseFloat(call.profit || '0');
      if (call.isConverted) acc[key].conversions++;
      return acc;
    }, {});

    const bySource = calls.reduce((acc, call) => {
      const key = call.utmSource || 'Direct';
      if (!acc[key]) acc[key] = { calls: 0, revenue: 0, profit: 0 };
      acc[key].calls++;
      acc[key].revenue += parseFloat(call.revenue || '0');
      acc[key].profit += parseFloat(call.profit || '0');
      return acc;
    }, {});

    const byDevice = calls.reduce((acc, call) => {
      const key = call.deviceType || 'Unknown';
      if (!acc[key]) acc[key] = { calls: 0, revenue: 0 };
      acc[key].calls++;
      acc[key].revenue += parseFloat(call.revenue || '0');
      return acc;
    }, {});

    const bySub1 = calls.reduce((acc, call) => {
      const key = call.sub1 || 'Untagged';
      if (!acc[key]) acc[key] = { calls: 0, revenue: 0, conversions: 0 };
      acc[key].calls++;
      acc[key].revenue += parseFloat(call.revenue || '0');
      if (call.isConverted) acc[key].conversions++;
      return acc;
    }, {});

    return {
      totals: { totalCalls, totalRevenue, totalCost, totalProfit, avgMargin, conversionRate },
      byCampaign: Object.entries(byCampaign).map(([name, data]) => ({ name, ...data })),
      bySource: Object.entries(bySource).map(([name, data]) => ({ name, ...data })),
      byDevice: Object.entries(byDevice).map(([name, data]) => ({ name, ...data })),
      bySub1: Object.entries(bySub1).map(([name, data]) => ({ name, ...data })),
    };
  }, [calls]);

  // Get unique values for filter dropdowns
  const uniqueValues = useMemo(() => {
    return {
      sources: [...new Set(calls.map(call => call.utmSource).filter(Boolean))],
      mediums: [...new Set(calls.map(call => call.utmMedium).filter(Boolean))],
      sub1s: [...new Set(calls.map(call => call.sub1).filter(Boolean))],
      sub2s: [...new Set(calls.map(call => call.sub2).filter(Boolean))],
      sub3s: [...new Set(calls.map(call => call.sub3).filter(Boolean))],
      sub4s: [...new Set(calls.map(call => call.sub4).filter(Boolean))],
      sub5s: [...new Set(calls.map(call => call.sub5).filter(Boolean))],
      devices: [...new Set(calls.map(call => call.deviceType).filter(Boolean))],
      publishers: [...new Set(calls.map(call => call.publisherName).filter(Boolean))],
      buyers: [...new Set(calls.map(call => call.buyerName).filter(Boolean))],
      locations: [...new Set(calls.map(call => call.city ? `${call.city}, ${call.state}` : '').filter(Boolean))],
    };
  }, [calls]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exportData = () => {
    const headers = [
      'Campaign', 'Publisher', 'Buyer', 'From', 'To', 'Duration', 'Status', 
      'Revenue', 'Cost', 'Profit', 'Margin', 'UTM Source', 'UTM Medium', 
      'Sub1', 'Sub2', 'Sub3', 'Sub4', 'Sub5', 'Device', 'Location', 'Converted'
    ];
    
    const rows = calls.map(call => [
      call.campaignName,
      call.publisherName,
      call.buyerName,
      call.fromNumber,
      call.toNumber,
      call.duration,
      call.status,
      call.revenue,
      call.cost,
      call.profit,
      call.margin,
      call.utmSource,
      call.utmMedium,
      call.sub1,
      call.sub2,
      call.sub3,
      call.sub4,
      call.sub5,
      call.deviceType,
      `${call.city}, ${call.state}`,
      call.isConverted ? 'Yes' : 'No'
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `advanced-call-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      {/* Advanced Filter Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters & Search
            </span>
            <div className="flex gap-2">
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            {/* Date Range */}
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

            {/* Campaign */}
            <Select
              value={filters.campaign}
              onValueChange={(value) => setFilters(prev => ({ ...prev, campaign: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign: any) => (
                  <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* UTM Source */}
            <Select
              value={filters.utmSource}
              onValueChange={(value) => setFilters(prev => ({ ...prev, utmSource: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Traffic Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueValues.sources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub1 */}
            <Select
              value={filters.sub1}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sub1: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sub1" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub1</SelectItem>
                {uniqueValues.sub1s.map((sub1) => (
                  <SelectItem key={sub1} value={sub1}>{sub1}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub2 */}
            <Select
              value={filters.sub2}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sub2: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sub2" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub2</SelectItem>
                {uniqueValues.sub2s.map((sub2) => (
                  <SelectItem key={sub2} value={sub2}>{sub2}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Device Type */}
            <Select
              value={filters.deviceType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, deviceType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {uniqueValues.devices.map((device) => (
                  <SelectItem key={device} value={device}>{device}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Second Row of Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            {/* Sub3 */}
            <Select
              value={filters.sub3}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sub3: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sub3" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub3</SelectItem>
                {uniqueValues.sub3s.map((sub3) => (
                  <SelectItem key={sub3} value={sub3}>{sub3}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub4 */}
            <Select
              value={filters.sub4}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sub4: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sub4" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub4</SelectItem>
                {uniqueValues.sub4s.map((sub4) => (
                  <SelectItem key={sub4} value={sub4}>{sub4}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub5 */}
            <Select
              value={filters.sub5}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sub5: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sub5" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub5</SelectItem>
                {uniqueValues.sub5s.map((sub5) => (
                  <SelectItem key={sub5} value={sub5}>{sub5}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location */}
            <Select
              value={filters.location}
              onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueValues.locations.map((location) => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Publisher */}
            <Select
              value={filters.publisher}
              onValueChange={(value) => setFilters(prev => ({ ...prev, publisher: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Publisher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publishers</SelectItem>
                {uniqueValues.publishers.map((publisher) => (
                  <SelectItem key={publisher} value={publisher}>{publisher}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <Input
              placeholder="Search keywords, click IDs..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="col-span-1"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {calls.length} calls found • {formatCurrency(analytics.totals.totalRevenue)} revenue • {analytics.totals.conversionRate.toFixed(1)}% conversion rate
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeView === "summary" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView("summary")}
              >
                Summary
              </Button>
              <Button
                variant={activeView === "timeline" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView("timeline")}
              >
                Timeline
              </Button>
              <Button
                variant={activeView === "breakdown" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView("breakdown")}
                
              >
                Breakdown
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold">{analytics.totals.totalCalls}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totals.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Profit</p>
                <p className={`text-2xl font-bold ${analytics.totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(analytics.totals.totalProfit)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Margin</p>
                <p className="text-2xl font-bold">{analytics.totals.avgMargin.toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold">{analytics.totals.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.totals.totalCost)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Areas */}
      {activeView === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.byCampaign}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.bySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="calls"
                  >
                    {analytics.bySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance by Sub1 */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Sub1</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.bySub1}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#82ca9d" name="Calls" />
                  <Bar dataKey="conversions" fill="#8884d8" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Device Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Device Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.byDevice}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === "breakdown" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Detailed Call Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading call breakdown...</div>
            ) : calls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No calls found matching your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Number Pool</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">{call.campaignName}</div>
                        <div className="text-xs text-gray-500">{call.utmCampaign}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{call.publisherName || 'Direct'}</div>
                        <div className="text-xs text-gray-500">{call.utmSource}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{call.keyword || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{call.adGroup}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{call.buyerName}</div>
                        <div className="text-xs text-gray-500">{call.disposition}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{call.dialedNumber || call.toNumber}</div>
                        <div className="text-xs text-gray-500">{call.fromNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(call.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{formatDistanceToNow(new Date(call.createdAt))} ago</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDuration(call.duration)}</div>
                        <Badge className={call.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {call.sub1 && <Badge variant="outline" className="text-xs">{call.sub1}</Badge>}
                          {call.sub2 && <Badge variant="outline" className="text-xs">{call.sub2}</Badge>}
                          {call.sub3 && <Badge variant="outline" className="text-xs">{call.sub3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-green-600 font-medium">
                          {formatCurrency(parseFloat(call.revenue || '0'))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${parseFloat(call.profit || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(parseFloat(call.profit || '0'))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {parseFloat(call.margin?.toString() || '0').toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        {call.isConverted ? (
                          <Badge className="bg-green-100 text-green-800">
                            {call.conversionType || 'Converted'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}