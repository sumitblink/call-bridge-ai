import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  Globe, 
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  DollarSign,
  Eye,
  MousePointer,
  Clock,
  Filter,
  Zap
} from 'lucide-react';

interface TrafficSourceAnalytics {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  totalValue: number;
  averageValue: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

interface LandingPageAnalytics {
  page: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
  averageSessionDuration: number;
  topSources: string[];
  revenue: number;
}

interface AttributionReport {
  totalConversions: number;
  totalRevenue: number;
  attributionBreakdown: Array<{
    source: string;
    medium: string;
    conversions: number;
    revenue: number;
    percentage: number;
  }>;
  customerJourney: Array<{
    path: string;
    conversions: number;
    percentage: number;
  }>;
}

interface OptimizationRecommendation {
  source: string;
  medium: string;
  currentPerformance: TrafficSourceAnalytics;
  recommendations: Array<{
    type: 'increase_budget' | 'decrease_budget' | 'optimize_landing' | 'adjust_targeting';
    reason: string;
    impact: 'high' | 'medium' | 'low';
    action: string;
  }>;
}

export default function AdvancedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('attribution');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);

  // Mock data for comprehensive analytics (in production, these would come from real API endpoints)
  const mockTrafficSources: TrafficSourceAnalytics[] = [
    {
      source: 'google',
      medium: 'cpc',
      sessions: 1247,
      conversions: 89,
      conversionRate: 7.1,
      totalValue: 44500,
      averageValue: 500,
      trend: 'up',
      percentChange: 12.3
    },
    {
      source: 'facebook',
      medium: 'cpc',
      sessions: 892,
      conversions: 45,
      conversionRate: 5.0,
      totalValue: 22500,
      averageValue: 500,
      trend: 'down',
      percentChange: -8.7
    },
    {
      source: 'organic',
      medium: 'search',
      sessions: 654,
      conversions: 28,
      conversionRate: 4.3,
      totalValue: 14000,
      averageValue: 500,
      trend: 'up',
      percentChange: 5.2
    },
    {
      source: 'direct',
      medium: 'none',
      sessions: 423,
      conversions: 12,
      conversionRate: 2.8,
      totalValue: 6000,
      averageValue: 500,
      trend: 'stable',
      percentChange: 0.5
    }
  ];

  const mockLandingPages: LandingPageAnalytics[] = [
    {
      page: '/insurance-quote',
      sessions: 1456,
      conversions: 87,
      conversionRate: 5.9,
      bounceRate: 42.3,
      averageSessionDuration: 245,
      topSources: ['google', 'facebook', 'organic'],
      revenue: 43500
    },
    {
      page: '/home-insurance',
      sessions: 892,
      conversions: 34,
      conversionRate: 3.8,
      bounceRate: 58.7,
      averageSessionDuration: 180,
      topSources: ['google', 'organic'],
      revenue: 17000
    },
    {
      page: '/auto-insurance',
      sessions: 643,
      conversions: 29,
      conversionRate: 4.5,
      bounceRate: 45.2,
      averageSessionDuration: 210,
      topSources: ['facebook', 'google'],
      revenue: 14500
    }
  ];

  const mockAttributionReport: AttributionReport = {
    totalConversions: 174,
    totalRevenue: 87000,
    attributionBreakdown: [
      { source: 'google', medium: 'cpc', conversions: 89, revenue: 44500, percentage: 51.1 },
      { source: 'facebook', medium: 'cpc', conversions: 45, revenue: 22500, percentage: 25.9 },
      { source: 'organic', medium: 'search', conversions: 28, revenue: 14000, percentage: 16.1 },
      { source: 'direct', medium: 'none', conversions: 12, revenue: 6000, percentage: 6.9 }
    ],
    customerJourney: [
      { path: 'Google → Landing Page → Call', conversions: 61, percentage: 35.1 },
      { path: 'Facebook → Landing Page → Call', conversions: 44, percentage: 25.3 },
      { path: 'Direct → Landing Page → Call', conversions: 35, percentage: 20.1 },
      { path: 'Google → Multiple Pages → Call', conversions: 26, percentage: 14.9 },
      { path: 'Email → Landing Page → Call', conversions: 8, percentage: 4.6 }
    ]
  };

  const mockOptimizations: OptimizationRecommendation[] = [
    {
      source: 'google',
      medium: 'cpc',
      currentPerformance: mockTrafficSources[0],
      recommendations: [
        {
          type: 'increase_budget',
          reason: 'High conversion rate of 7.1% with positive trend',
          impact: 'high',
          action: 'Increase Google Ads budget by 30-40% to capitalize on high performance'
        },
        {
          type: 'optimize_landing',
          reason: 'Strong traffic source with room for conversion improvement',
          impact: 'medium',
          action: 'Test new landing page variants for Google traffic'
        }
      ]
    },
    {
      source: 'facebook',
      medium: 'cpc',
      currentPerformance: mockTrafficSources[1],
      recommendations: [
        {
          type: 'adjust_targeting',
          reason: 'Declining performance with -8.7% trend',
          impact: 'high',
          action: 'Review audience targeting and ad creative performance'
        },
        {
          type: 'decrease_budget',
          reason: 'Lower conversion rate compared to Google traffic',
          impact: 'medium',
          action: 'Reallocate 15-20% of Facebook budget to higher-performing channels'
        }
      ]
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics & Attribution</h1>
          <p className="text-gray-600 mt-1">
            Complete traffic source attribution, landing page optimization, and performance insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            <Activity className="w-4 h-4 mr-1" />
            Ringba-Style Analytics
          </Badge>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="landing">Landing Pages</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="attribution" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Attribution Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAttributionReport.attributionBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-3" style={{
                          backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                        }}></div>
                        <div>
                          <div className="font-medium capitalize">{item.source}</div>
                          <div className="text-sm text-gray-500">{item.medium}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.revenue)}</div>
                        <div className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="w-5 h-5 mr-2" />
                  Customer Journey Paths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAttributionReport.customerJourney.map((journey, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-sm">{journey.path}</div>
                        <div className="text-sm text-gray-600">{journey.conversions} calls</div>
                      </div>
                      <Progress value={journey.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Total Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockAttributionReport.totalConversions}</div>
                <div className="text-sm text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  +12.3% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(mockAttributionReport.totalRevenue)}</div>
                <div className="text-sm text-green-600 flex items-center mt-1">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  +8.7% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(mockAttributionReport.totalRevenue / mockAttributionReport.totalConversions)}
                </div>
                <div className="text-sm text-red-600 flex items-center mt-1">
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                  -3.2% from last period
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            {mockTrafficSources.map((source, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 capitalize flex items-center justify-between">
                    {source.source} ({source.medium})
                    {getTrendIcon(source.trend)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sessions</span>
                      <span className="font-medium">{source.sessions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conversions</span>
                      <span className="font-medium">{source.conversions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conv. Rate</span>
                      <span className="font-medium">{source.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revenue</span>
                      <span className="font-medium">{formatCurrency(source.totalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-600">Trend</span>
                      <span className={`text-sm font-medium ${source.trend === 'up' ? 'text-green-600' : source.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                        {source.trend === 'up' ? '+' : source.trend === 'down' ? '' : ''}{source.percentChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Traffic Source Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTrafficSources.map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium capitalize">{source.source}</div>
                      <div className="text-sm text-gray-600">
                        {source.conversions} conversions • {source.conversionRate.toFixed(1)}% rate
                      </div>
                    </div>
                    <Progress value={(source.conversions / Math.max(...mockTrafficSources.map(s => s.conversions))) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landing" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mockLandingPages.map((page, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{page.page}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm text-gray-600">Sessions</span>
                      </div>
                      <span className="font-medium">{page.sessions.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Target className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-600">Conversions</span>
                      </div>
                      <span className="font-medium">{page.conversions}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-purple-500 mr-2" />
                        <span className="text-sm text-gray-600">Conv. Rate</span>
                      </div>
                      <span className="font-medium">{page.conversionRate.toFixed(1)}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MousePointer className="w-4 h-4 text-orange-500 mr-2" />
                        <span className="text-sm text-gray-600">Bounce Rate</span>
                      </div>
                      <span className="font-medium">{page.bounceRate.toFixed(1)}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-red-500 mr-2" />
                        <span className="text-sm text-gray-600">Avg. Duration</span>
                      </div>
                      <span className="font-medium">{formatDuration(page.averageSessionDuration)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm text-gray-600">Revenue</span>
                      </div>
                      <span className="font-medium">{formatCurrency(page.revenue)}</span>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-sm text-gray-600 mb-1">Top Sources</div>
                      <div className="flex flex-wrap gap-1">
                        {page.topSources.map((source, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <div className="space-y-6">
            {mockOptimizations.map((optimization, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                      <span className="capitalize">{optimization.source} {optimization.medium} Optimization</span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {optimization.currentPerformance.conversionRate.toFixed(1)}% Conv. Rate
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Current Performance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sessions</span>
                          <span className="font-medium">{optimization.currentPerformance.sessions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Conversions</span>
                          <span className="font-medium">{optimization.currentPerformance.conversions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Revenue</span>
                          <span className="font-medium">{formatCurrency(optimization.currentPerformance.totalValue)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Trend</span>
                          <div className="flex items-center">
                            {getTrendIcon(optimization.currentPerformance.trend)}
                            <span className="ml-1 text-sm">{optimization.currentPerformance.percentChange.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Recommendations</h4>
                      <div className="space-y-3">
                        {optimization.recommendations.map((rec, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <Zap className="w-4 h-4 text-blue-500 mr-2" />
                                <span className="font-medium text-sm capitalize">{rec.type.replace('_', ' ')}</span>
                              </div>
                              <Badge variant="outline" className={`text-xs ${getImpactColor(rec.impact)}`}>
                                {rec.impact} impact
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                            <p className="text-sm font-medium">{rec.action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}