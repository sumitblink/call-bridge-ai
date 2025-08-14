import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Activity, Phone, Globe, Users, Target, TrendingUp, 
  Download, ExternalLink, Clock, MapPin
} from 'lucide-react';

interface TrackingSession {
  id: string;
  source: string;
  medium: string;
  campaign: string;
  timestamp: string;
  userAgent: string;
  referrer: string;
}

interface TrackingStats {
  totalSessions: number;
  activeSessions: number;
  googleTraffic: number;
  facebookTraffic: number;
  linkedinTraffic: number;
  youtubeTraffic: number;
}

export default function RealTrackingDashboard() {
  // Fetch real tracking data with auto-refresh
  const { data: trackingData, isLoading, error, refetch } = useQuery<{
    sessions: TrackingSession[];
    stats: TrackingStats;
  }>({
    queryKey: ['/api/tracking/live-sessions'],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time traffic monitoring
    staleTime: 5000,
  });

  const sessions = trackingData?.sessions || [];
  
  // Calculate real-time statistics from actual data
  const now = new Date();
  const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const last10Minutes = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  const stats = {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.timestamp > last24Hours).length,
    recentSessions: sessions.filter(s => s.timestamp > last10Minutes).length,
    liveTraffic: sessions.filter(s => s.timestamp > last5Minutes).length,
    googleTraffic: sessions.filter(s => s.source === 'google').length,
    facebookTraffic: sessions.filter(s => s.source === 'facebook').length,
    linkedinTraffic: sessions.filter(s => s.source === 'linkedin').length,
    youtubeTraffic: sessions.filter(s => s.source === 'youtube').length,
  };

  // Group sessions by campaign for insights
  const campaignGroups = sessions.reduce((acc, session) => {
    const key = `${session.source}_${session.campaign}`;
    if (!acc[key]) {
      acc[key] = {
        source: session.source,
        campaign: session.campaign,
        count: 0,
        latest: session.timestamp
      };
    }
    acc[key].count++;
    if (session.timestamp > acc[key].latest) {
      acc[key].latest = session.timestamp;
    }
    return acc;
  }, {} as Record<string, any>);

  const topCampaigns = Object.values(campaignGroups)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-red-600" />
                <p className="text-red-800">Failed to load tracking data. Check your connection.</p>
              </div>
            </CardContent>
          </Card>
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
              Real-time page visits and session tracking • Updated every 10 seconds
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={isLoading ? "secondary" : "default"}>
              <Activity className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Live Active'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Real-Time Traffic Analytics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="col-span-2">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.totalSessions.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Total Page Visits</p>
                <p className="text-xs text-gray-500">All time</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.liveTraffic}</div>
                <p className="text-sm text-muted-foreground">Live Traffic</p>
                <p className="text-xs text-gray-500">Last 5 mins</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.recentSessions}</div>
                <p className="text-sm text-muted-foreground">Recent Visits</p>
                <p className="text-xs text-gray-500">Last 10 mins</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.activeSessions}</div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-xs text-gray-500">24 hours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.googleTraffic}</div>
                <p className="text-sm text-muted-foreground">Google</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.facebookTraffic}</div>
                <p className="text-sm text-muted-foreground">Facebook</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.linkedinTraffic}</div>
                <p className="text-sm text-muted-foreground">LinkedIn</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.youtubeTraffic}</div>
                <p className="text-sm text-muted-foreground">YouTube</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.activeSessions}</div>
                <p className="text-sm text-muted-foreground">Active (24h)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Traffic Monitoring Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Traffic Monitor</span>
                </span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {stats.liveTraffic} active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Page visits this hour</span>
                  <span className="font-mono text-xl text-blue-600">
                    {sessions.filter(s => s.timestamp > new Date(Date.now() - 60 * 60 * 1000).toISOString()).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Visitors last 10 minutes</span>
                  <span className="font-mono text-xl text-orange-600">{stats.recentSessions}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Active visitors (5 mins)</span>
                  <span className="font-mono text-xl text-green-600">{stats.liveTraffic}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-600">Total sessions tracked</span>
                  <span className="font-mono text-xl text-purple-600">{stats.totalSessions.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Traffic Sources</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCampaigns.slice(0, 8).map((campaign: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-green-500' : 
                        index === 2 ? 'bg-purple-500' : 
                        index === 3 ? 'bg-orange-500' : 
                        index === 4 ? 'bg-red-500' : 
                        index === 5 ? 'bg-yellow-500' : 
                        index === 6 ? 'bg-pink-500' : 'bg-indigo-500'
                      }`}></div>
                      <span className="text-sm">
                        <span className="font-medium capitalize">{campaign.source}</span>
                        {campaign.campaign && (
                          <span className="text-gray-500"> • {campaign.campaign}</span>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold">{campaign.count}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(campaign.latest).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {topCampaigns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No traffic sources found. Data will appear as visitors land on your pages.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Page Visits</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Auto-refresh: 10s
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {sessions.length} Total
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Medium</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 15).map((session: TrackingSession) => {
                    const isRecent = new Date(session.timestamp) > new Date(Date.now() - 5 * 60 * 1000);
                    return (
                      <TableRow key={session.id} className={isRecent ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span>{new Date(session.timestamp).toLocaleTimeString()}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(session.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {session.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {session.campaign || 'Direct'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {session.id.length > 15 ? `${session.id.substring(0, 15)}...` : session.id}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 capitalize">
                            {session.medium || 'organic'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No page visits found. Data will appear here once traffic starts hitting your campaigns.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Session Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>All Tracking Sessions</span>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No tracking data yet</p>
                <p className="text-muted-foreground">
                  Start tracking by adding DNI pixels to your landing pages
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Medium</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Device</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{session.source}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.campaign || 'Direct Traffic'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{session.medium || 'none'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(session.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {session.userAgent ? (
                          session.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
                        ) : 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* DNI Status */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-green-800">DNI Tracking Active</p>
                <p className="text-sm text-green-600">
                  Your pixel is capturing {stats.totalSessions} total sessions. Latest activity from {sessions.length > 0 ? sessions[0]?.source : 'none'}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}