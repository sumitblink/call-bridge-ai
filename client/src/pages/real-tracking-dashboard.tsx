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
  // Fetch real tracking data
  const { data: trackingData, isLoading, error, refetch } = useQuery<{
    sessions: TrackingSession[];
    stats: TrackingStats;
  }>({
    queryKey: ['/api/tracking/live-sessions'],
    refetchInterval: 6000, // 6 second refresh
    staleTime: 4000,
  });

  const sessions = trackingData?.sessions || [];
  
  // Calculate real statistics from actual data
  const stats = {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).length,
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Real-Time Tracking</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Live data from your DNI pixel tracking tests
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

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}</div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
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

        {/* Campaign Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Top Performing Campaigns</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCampaigns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No campaign data available</p>
                ) : (
                  topCampaigns.map((campaign: any, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{campaign.source}</Badge>
                        <div>
                          <p className="font-medium">{campaign.campaign || 'Unnamed Campaign'}</p>
                          <p className="text-sm text-muted-foreground">
                            Last activity: {new Date(campaign.latest).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{campaign.count}</div>
                        <p className="text-xs text-muted-foreground">sessions</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 border-l-2 border-l-blue-500 bg-blue-50/50 rounded-r-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge size="sm" variant="secondary">{session.source}</Badge>
                        <span className="text-sm font-medium">{session.campaign || 'Direct'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.medium} • {new Date(session.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No recent sessions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
                        <Badge size="sm" variant="secondary">{session.medium || 'none'}</Badge>
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