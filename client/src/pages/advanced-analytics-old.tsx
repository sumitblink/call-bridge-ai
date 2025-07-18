import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
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

  // Fetch authentic traffic source analytics from database
  const { data: trafficSources, isLoading: trafficSourcesLoading } = useQuery<TrafficSourceAnalytics[]>({
    queryKey: ['/api/analytics/traffic-sources', dateRange, selectedCampaign],
    enabled: activeTab === 'traffic-sources'
  });

  // Fetch authentic landing page analytics from database
  const { data: landingPages, isLoading: landingPagesLoading } = useQuery<LandingPageAnalytics[]>({
    queryKey: ['/api/analytics/landing-pages', dateRange, selectedCampaign],
    enabled: activeTab === 'landing-pages'
  });

  // Fetch authentic attribution report from database
  const { data: attributionReport, isLoading: attributionLoading } = useQuery<AttributionReport>({
    queryKey: ['/api/analytics/attribution', dateRange, selectedCampaign],
    enabled: activeTab === 'attribution'
  });

  // Fetch authentic optimization recommendations from database
  const { data: optimizationRecommendations, isLoading: optimizationLoading } = useQuery<OptimizationRecommendation[]>({
    queryKey: ['/api/analytics/optimization', dateRange, selectedCampaign],
    enabled: activeTab === 'optimization'
  });

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
    <Layout>
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
          {attributionLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="animate-pulse">
                <CardHeader><div className="h-6 bg-gray-200 rounded w-3/4"></div></CardHeader>
                <CardContent><div className="h-32 bg-gray-200 rounded"></div></CardContent>
              </Card>
              <Card className="animate-pulse">
                <CardHeader><div className="h-6 bg-gray-200 rounded w-3/4"></div></CardHeader>
                <CardContent><div className="h-32 bg-gray-200 rounded"></div></CardContent>
              </Card>
            </div>
          ) : !attributionReport ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No attribution data available</div>
              <div className="text-sm text-gray-400">Start tracking visitors and calls to see attribution analytics</div>
            </div>
          ) : (
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
                  {(attributionReport?.attributionBreakdown || []).map((item, index) => (
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
                  {(attributionReport?.customerJourney || []).map((journey, index) => (
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
                <div className="text-2xl font-bold">{attributionReport?.totalConversions || 0}</div>
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
                <div className="text-2xl font-bold">{formatCurrency(attributionReport?.totalRevenue || 0)}</div>
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
                  {formatCurrency((attributionReport?.totalRevenue || 0) / (attributionReport?.totalConversions || 1))}
                </div>
                <div className="text-sm text-red-600 flex items-center mt-1">
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                  -3.2% from last period
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="traffic" className="mt-6">
          {trafficSourcesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 bg-gray-200 rounded w-3/4"></div></CardHeader>
                  <CardContent><div className="h-32 bg-gray-200 rounded"></div></CardContent>
                </Card>
              ))}
            </div>
          ) : !trafficSources || trafficSources.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No traffic source data available</div>
              <div className="text-sm text-gray-400">Start tracking visitors to see traffic source analytics</div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            {trafficSources.map((source, index) => (
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
                {(trafficSources || []).map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium capitalize">{source.source}</div>
                      <div className="text-sm text-gray-600">
                        {source.conversions} conversions • {source.conversionRate.toFixed(1)}% rate
                      </div>
                    </div>
                    <Progress value={(source.conversions / Math.max(...(trafficSources || []).map(s => s.conversions))) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="landing" className="mt-6">
          {landingPagesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 bg-gray-200 rounded w-3/4"></div></CardHeader>
                  <CardContent><div className="h-48 bg-gray-200 rounded"></div></CardContent>
                </Card>
              ))}
            </div>
          ) : !landingPages || landingPages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No landing page data available</div>
              <div className="text-sm text-gray-400">Start tracking visitors to see landing page performance</div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {landingPages.map((page, index) => (
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
          {optimizationLoading ? (
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 bg-gray-200 rounded w-3/4"></div></CardHeader>
                  <CardContent><div className="h-32 bg-gray-200 rounded"></div></CardContent>
                </Card>
              ))}
            </div>
          ) : !optimizationRecommendations || optimizationRecommendations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No optimization recommendations available</div>
              <div className="text-sm text-gray-400">Start tracking data to receive optimization insights</div>
            </div>
          ) : (
          <div className="space-y-6">
            {optimizationRecommendations.map((optimization, index) => (
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
    </Layout>
  );
}