import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  Activity, Phone, TrendingUp, DollarSign, Users, Target,
  Download, Filter, Calendar, Search, Map, Clock
} from 'lucide-react';

interface CallData {
  id: string;
  campaignName: string;
  source: string;
  medium: string;
  duration: number;
  outcome: 'connected' | 'abandoned' | 'voicemail';
  revenue: number;
  timestamp: string;
  location: string;
  callerNumber: string;
}

interface PerformanceMetrics {
  totalCalls: number;
  connectedCalls: number;
  totalRevenue: number;
  averageDuration: number;
  conversionRate: number;
  costPerCall: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function RingbaStyleAnalytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // Fetch comprehensive analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics/comprehensive', { dateRange, campaign: selectedCampaign, source: filterSource }],
    staleTime: 30000,
  });

  // Use comprehensive analytics data from actual calls and sessions
  const performanceData = analyticsData?.performanceTimeline || [];
  const trafficSourceData = analyticsData?.trafficSources || [];
  const recentCalls = analyticsData?.recentCalls || [];
  const metrics: PerformanceMetrics = analyticsData?.performanceMetrics || {
    totalCalls: 0,
    connectedCalls: 0,
    totalRevenue: 0,
    averageDuration: 0,
    conversionRate: 0,
    costPerCall: 0
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Ringba-style branding */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Professional Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">Enterprise-level call tracking and attribution analysis</p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Today</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Performance Metrics - Ringba Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Calls</p>
                  <p className="text-2xl font-bold">{metrics.totalCalls}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Connected</p>
                  <p className="text-2xl font-bold">{metrics.connectedCalls}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
                  <p className="text-2xl font-bold">{Math.floor(metrics.averageDuration / 60)}:{(metrics.averageDuration % 60).toString().padStart(2, '0')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Conv. Rate</p>
                  <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cost/Call</p>
                  <p className="text-2xl font-bold">${metrics.costPerCall}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Tabs */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="calls">Call Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="calls" stroke="#8884d8" name="Calls" />
                      <Line type="monotone" dataKey="conversions" stroke="#82ca9d" name="Conversions" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#ffc658" fill="#ffc658" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Source Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={trafficSourceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {trafficSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Source Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trafficSourceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#8884d8" name="Calls" />
                      <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attribution Chain Analysis</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">Complete visitor journey from source to conversion</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <p className="font-semibold">Traffic Source</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Google Ads → Landing Page</p>
                      </div>
                    </div>
                    <Badge>89 Sessions</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <p className="font-semibold">Phone Call</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Dynamic Number → Call Routing</p>
                      </div>
                    </div>
                    <Badge>67 Calls</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <p className="font-semibold">Conversion</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Connected Call → Sale/Lead</p>
                      </div>
                    </div>
                    <Badge>48 Conversions</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Call Activity</CardTitle>
                <div className="flex items-center space-x-2">
                  <Input placeholder="Search calls..." className="max-w-sm" />
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Call ID</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCalls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell className="font-mono">{call.id}</TableCell>
                        <TableCell>{call.campaign}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{call.source}</Badge>
                        </TableCell>
                        <TableCell>{Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}</TableCell>
                        <TableCell>
                          <Badge variant={
                            call.outcome === 'connected' ? 'default' :
                            call.outcome === 'abandoned' ? 'destructive' : 'secondary'
                          }>
                            {call.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell>${call.revenue}</TableCell>
                        <TableCell>{call.location}</TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(call.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}