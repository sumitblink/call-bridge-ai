import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Users, Phone, Globe, Target, Calendar,
  Activity, Download, Filter, ExternalLink
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

export default function UsefulAnalytics() {
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch real visitor session data with auto-refresh
  const { data: sessionData, isLoading, refetch } = useQuery({
    queryKey: ['/api/tracking/live-sessions'],
    staleTime: 5000, // Refresh every 5 seconds
    refetchInterval: false, // Turn off auto-refresh to reduce console spam
  });

  const sessions = sessionData?.sessions || [];
  
  // Calculate meaningful analytics from real data
  const sourceStats = sessions.reduce((acc: any, session: any) => {
    const source = session.source || 'direct';
    if (!acc[source]) {
      acc[source] = { name: source, sessions: 0, campaigns: new Set() };
    }
    acc[source].sessions++;
    acc[source].campaigns.add(session.campaign || 'unnamed');
    return acc;
  }, {});

  const sourceChartData = Object.values(sourceStats).map((stat: any) => ({
    name: stat.name.charAt(0).toUpperCase() + stat.name.slice(1),
    value: stat.sessions,
    campaigns: stat.campaigns.size
  }));

  // Campaign performance analysis
  const campaignStats = sessions.reduce((acc: any, session: any) => {
    const key = `${session.source}_${session.campaign || 'direct'}`;
    if (!acc[key]) {
      acc[key] = {
        source: session.source,
        campaign: session.campaign || 'Direct Traffic',
        sessions: 0,
        lastSeen: session.timestamp,
        medium: session.medium
      };
    }
    acc[key].sessions++;
    if (session.timestamp > acc[key].lastSeen) {
      acc[key].lastSeen = session.timestamp;
    }
    return acc;
  }, {});

  const topCampaigns = Object.values(campaignStats)
    .sort((a: any, b: any) => b.sessions - a.sessions)
    .slice(0, 6);

  // Time-based analysis from actual data
  const { data: historicalData } = useQuery({
    queryKey: ['/api/analytics/historical', timeRange],
    staleTime: 60000,
  });

  const dailyStats = historicalData?.dailyBreakdown || [
    { date: 'Today', sessions: sessions.length, sources: Object.keys(sourceStats).length }
  ];

  // Attribution insights from real session data
  const { data: attributionMetrics } = useQuery({
    queryKey: ['/api/analytics/attribution-values', timeRange],
    staleTime: 60000,
  });

  const attributionData = sessions.map((session: any, index: number) => {
    const metrics = attributionMetrics?.find((m: any) => m.sessionId === session.id);
    return {
      id: index + 1,
      source: session.source,
      campaign: session.campaign,
      medium: session.medium,
      timestamp: session.timestamp,
      potentialValue: metrics?.potentialValue || 0,
      conversionProbability: metrics?.conversionProbability || 0
    };
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-lg">Loading analytics data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Traffic Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real insights from your {sessions.length} tracking sessions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Today</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Traffic Sources</p>
                  <p className="text-2xl font-bold">{Object.keys(sourceStats).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Globe className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Unique Campaigns</p>
                  <p className="text-2xl font-bold">{Object.keys(campaignStats).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Top Source</p>
                  <p className="text-lg font-bold">
                    {sourceChartData.length > 0 ? sourceChartData[0].name : 'None'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts - Only show when we have actual data */}
        {sessions.length > 0 && sourceChartData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {sourceChartData.map((entry, index) => (
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
                <CardTitle>Session Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Analytics Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Traffic Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  Start generating traffic with UTM tracking to see analytics here.
                </p>
                <p className="text-sm text-muted-foreground">
                  Use the tracking dashboard to create pixel codes and start collecting visitor data.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Performance */}
        {sessions.length > 0 && topCampaigns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Campaign Performance Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Medium</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCampaigns.map((campaign: any, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {campaign.campaign}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge size="sm" variant="secondary">{campaign.medium || 'none'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold">{campaign.sessions}</span>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {campaign.lastSeen}
                      </TableCell>
                      <TableCell>
                        <Badge variant={campaign.sessions > 1 ? "default" : "secondary"}>
                          {campaign.sessions > 1 ? "Active" : "Low"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Attribution Insights - Only show when data exists */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Attribution Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Key Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-800 dark:text-blue-200">
                        <strong>Top Performer:</strong> {sourceChartData.length > 0 ? sourceChartData[0].name : 'No data'} 
                        {sourceChartData.length > 0 && ` (${sourceChartData[0].value} sessions)`}
                      </p>
                      <p className="text-blue-800 dark:text-blue-200">
                        <strong>Active Sources:</strong> {Object.keys(sourceStats).length} different traffic sources
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-800 dark:text-blue-200">
                        <strong>Campaign Diversity:</strong> {Object.keys(campaignStats).length} unique campaigns
                      </p>
                      <p className="text-blue-800 dark:text-blue-200">
                        <strong>Tracking Status:</strong> Active tracking
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sessions.slice(0, 3).map((session: any, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{session.source}</Badge>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="font-medium">{session.campaign || 'Direct Traffic'}</p>
                      <p className="text-sm text-muted-foreground">{session.medium} campaign</p>
                      <p className="text-xs text-muted-foreground mt-2">{session.timestamp}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refresh Controls */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Data Status</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? 'Loading analytics data...' : 
                     sessions.length > 0 ? `${sessions.length} tracking sessions found` : 
                     'No tracking data available'}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status - Only show when sessions exist */}
        {sessions.length > 0 && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-green-800">Analytics Active</p>
                  <p className="text-sm text-green-600">
                    Tracking {sessions.length} sessions across {Object.keys(sourceStats).length} sources. 
                    Latest: {sessions[0]?.source} campaign.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}