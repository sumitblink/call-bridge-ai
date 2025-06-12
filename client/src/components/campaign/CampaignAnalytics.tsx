import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Phone, TrendingUp, DollarSign, Clock, Users, BarChart3, Download } from "lucide-react";
import { useState } from "react";

interface CampaignAnalyticsProps {
  campaignId: number;
  campaign: any;
}

export default function CampaignAnalytics({ campaignId, campaign }: CampaignAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("7d");

  // Get campaign analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/analytics`, timeRange],
  });

  // Get call logs for this campaign
  const { data: callLogs = [] } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/calls`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = analytics || {
    totalCalls: callLogs.length,
    connectedCalls: callLogs.filter((call: any) => call.status === 'completed').length,
    avgDuration: callLogs.reduce((avg: number, call: any) => avg + (call.duration || 0), 0) / Math.max(callLogs.length, 1),
    totalRevenue: callLogs.reduce((sum: number, call: any) => sum + (call.revenue || 0), 0),
    conversionRate: callLogs.length > 0 ? (callLogs.filter((call: any) => call.status === 'completed').length / callLogs.length * 100) : 0,
    avgCostPerCall: 15.50,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Campaign Analytics
          </h2>
          <p className="text-sm text-gray-500">
            Performance metrics and insights for {campaign.name}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalCalls.toLocaleString()}
                </p>
                <p className="text-sm text-green-600">+12% from last period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Connected Calls</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.connectedCalls.toLocaleString()}
                </p>
                <p className="text-sm text-green-600">{stats.conversionRate.toFixed(1)}% rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Math.floor(stats.avgDuration / 60)}:{(stats.avgDuration % 60).toString().padStart(2, '0')}
                </p>
                <p className="text-sm text-blue-600">minutes:seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
                <p className="text-sm text-green-600">+8% from last period</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Call Volume Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <BarChart3 className="h-12 w-12 mb-4" />
            <div className="text-center">
              <p>Call volume chart would be displayed here</p>
              <p className="text-sm">Integration with charting library needed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Call Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No calls yet
              </h3>
              <p className="text-gray-500">
                Call activity will appear here once your campaign starts receiving calls
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {callLogs.slice(0, 5).map((call: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {call.fromNumber || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {call.toNumber} • {new Date(call.createdAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${(call.revenue || 0).toFixed(2)}
                      </div>
                    </div>
                    <Badge variant={
                      call.status === 'completed' ? 'default' : 
                      call.status === 'failed' ? 'destructive' : 
                      'secondary'
                    }>
                      {call.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {callLogs.length > 5 && (
                <div className="text-center">
                  <Button variant="outline">
                    View All Calls ({callLogs.length - 5} more)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Google Ads</span>
                </div>
                <div className="text-sm font-medium">45%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Organic Search</span>
                </div>
                <div className="text-sm font-medium">25%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Facebook Ads</span>
                </div>
                <div className="text-sm font-medium">18%</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Direct</span>
                </div>
                <div className="text-sm font-medium">12%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Conversion Rate</span>
                <span className="font-medium">{stats.conversionRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Avg Cost per Call</span>
                <span className="font-medium">${stats.avgCostPerCall.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Revenue per Call</span>
                <span className="font-medium">${(stats.totalRevenue / Math.max(stats.totalCalls, 1)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">ROI</span>
                <span className="font-medium text-green-600">
                  {((stats.totalRevenue / (stats.totalCalls * stats.avgCostPerCall) - 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}