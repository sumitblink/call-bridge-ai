import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Eye, 
  Phone, 
  TrendingUp, 
  Users, 
  Globe, 
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  Code,
  Copy,
  ExternalLink
} from 'lucide-react';

interface TrackingStats {
  totalSessions: number;
  totalConversions: number;
  conversionRate: number;
  topSources: Array<{source: string; count: number}>;
  recentConversions: Array<{
    id: number;
    sessionId: string;
    campaignId: number;
    conversionType: string;
    conversionValue: number;
    callerNumber: string;
    duration: number;
    createdAt: string;
  }>;
}

interface VisitorSession {
  id: number;
  sessionId: string;
  source: string;
  medium: string;
  campaign: string;
  landingPage: string;
  currentPage: string;
  firstVisit: string;
  lastActivity: string;
  hasConverted: boolean;
  isActive: boolean;
}

export default function TrackingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [pixelCode, setPixelCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<TrackingStats>({
    queryKey: ['/api/tracking/stats'],
    enabled: activeTab === 'overview'
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns']
  });

  const generatePixelCode = async () => {
    if (!selectedCampaign) return;
    
    setIsGenerating(true);
    try {
      const response = await apiRequest(`/api/tracking/pixel-code/${selectedCampaign}`, 'GET');
      const data = await response.json();
      setPixelCode(data.pixelCode);
      toast({
        title: "Pixel code generated",
        description: "Copy and paste the code into your landing page.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate pixel code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Pixel code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const { data: conversions, isLoading: conversionsLoading } = useQuery({
    queryKey: ['/api/tracking/conversions'],
    enabled: activeTab === 'conversions'
  });

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'google':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'direct':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'facebook':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'email':
        return <Activity className="w-4 h-4 text-red-500" />;
      default:
        return <Globe className="w-4 h-4 text-gray-500" />;
    }
  };

  if (statsLoading && activeTab === 'overview') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Campaign Tracking & Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaign Tracking & Analytics</h1>
        <Badge variant="outline" className="text-sm">
          <Activity className="w-4 h-4 mr-1" />
          MVP Tracking System
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pixel">Pixel Code</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Eye className="w-5 h-5 text-blue-500 mr-2" />
                      <span className="text-2xl font-bold">{stats.totalSessions}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Conversions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-2xl font-bold">{stats.totalConversions}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-purple-500 mr-2" />
                      <span className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Top Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 text-orange-500 mr-2" />
                      <span className="text-2xl font-bold">{stats.topSources.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Globe className="w-5 h-5 mr-2" />
                      Top Traffic Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.topSources.map((source, index) => (
                        <div key={source.source} className="flex items-center justify-between">
                          <div className="flex items-center">
                            {getSourceIcon(source.source)}
                            <span className="ml-2 font-medium capitalize">{source.source}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-600 mr-2">{source.count} sessions</span>
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Recent Conversions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.recentConversions.slice(0, 5).map((conversion) => (
                        <div key={conversion.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            <div>
                              <div className="font-medium text-sm">{conversion.callerNumber}</div>
                              <div className="text-xs text-gray-500">
                                {formatDuration(conversion.duration)} • {formatDate(conversion.createdAt)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            ${conversion.conversionValue}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="pixel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="w-5 h-5 mr-2" />
                Tracking Pixel Code Generator
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Generate JavaScript tracking code for your landing pages to capture visitor sessions and attribution data.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Campaign Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Campaign
                  </label>
                  <div className="flex items-center space-x-4">
                    <select 
                      value={selectedCampaign || ''} 
                      onChange={(e) => setSelectedCampaign(e.target.value ? parseInt(e.target.value) : null)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a campaign...</option>
                      {campaigns.map((campaign: any) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                    <Button 
                      onClick={generatePixelCode}
                      disabled={!selectedCampaign || isGenerating}
                      className="whitespace-nowrap"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Code'}
                    </Button>
                  </div>
                </div>

                {/* Generated Code */}
                {pixelCode && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Tracking Code</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(pixelCode)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md border overflow-x-auto">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                        {pixelCode}
                      </pre>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Implementation Instructions
                      </h5>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                        <li>Copy the JavaScript code above</li>
                        <li>Paste it before the closing <code className="bg-white px-1 rounded">&lt;/body&gt;</code> tag on your landing pages</li>
                        <li>The code will automatically track visitor sessions and UTM parameters</li>
                        <li>When visitors call your campaign phone number, conversions will be linked to their session</li>
                        <li>Visit the Analytics dashboard to view attribution data</li>
                      </ol>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-md border border-green-200">
                      <h5 className="font-medium text-green-900 mb-2">What This Tracks</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                        <li>Visitor sessions and unique session IDs</li>
                        <li>UTM parameters (source, medium, campaign, term, content)</li>
                        <li>Referrer information and landing page URLs</li>
                        <li>User agent and browser information</li>
                        <li>Phone call conversions linked to visitor sessions</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Example Implementation */}
                <div className="bg-gray-50 p-4 rounded-md border">
                  <h5 className="font-medium mb-2">Example URL with UTM Parameters</h5>
                  <code className="text-sm text-gray-700">
                    https://yourwebsite.com/landing-page?utm_source=google&utm_medium=cpc&utm_campaign=insurance&utm_term=auto+insurance&utm_content=ad1
                  </code>
                  <p className="text-sm text-gray-600 mt-2">
                    The tracking code will automatically capture these parameters and attribute any phone calls to this traffic source.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversions Yet</h3>
                <p className="text-gray-600">
                  Start tracking visitor sessions and calls to see conversion data here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-gray-600">
                  Advanced analytics features including visitor attribution, conversion funnels, and detailed reporting will be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}