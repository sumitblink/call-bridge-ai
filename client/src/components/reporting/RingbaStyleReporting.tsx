import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Save, Download, Calendar, X, Eye, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
type FilterRule = {
  field: string;
  operator: string;
  value: string;
};

type FilterTab = 'campaign' | 'publisher' | 'target' | 'buyer' | 'dialedNumber' | 'numberPool' | 'date' | 'duplicate' | 'tags';

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  publisher: string;
  target: string;
  buyer: string;
  dialedNumbers: string[];
  numberPool: string;
  lastCallDate: string;
  tags: string[];
  totalCalls: number;
  incoming: number;
  live: number;
  completed: number;
  ended: number;
  connected: number;
  paid: number;
  converted: number;
  noConnection: number;
  blocked: number;
  duplicate: number;
  ivrHangup: number;
  revenue: number;
  payout: number;
  profit: number;
  margin: number;
  conversionRate: number;
  rpc: number;
  tcl: number;
  acl: number;
  totalCost: number;
}

interface CallData {
  callId: string;
  campaignId: string;
  campaignName: string;
  buyer: string;
  status: string;
  dialedNumber: string;
  callerNumber: string;
  callDuration: number;
  dateTime: string;
  revenue: number;
  cost: number;
  tags: string[];
}

interface RingbaStyleReportingProps {
  autoRefresh?: boolean;
  timeRange?: string;
}

export default function RingbaStyleReporting({ autoRefresh = false, timeRange = 'today' }: RingbaStyleReportingProps) {
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('campaign');
  const [newFilter, setNewFilter] = useState({ value: '', operator: 'contains' });

  // Filter rule handlers
  const handleAddFilter = useCallback((field: string, value: string) => {
    setTimeout(() => {
      const rule: FilterRule = {
        field: field,
        operator: 'contains',
        value: value
      };
      setFilterRules(prev => [...prev.filter(r => r.field !== field), rule]);
    }, 100);
  }, []);

  const handleTabClick = useCallback((newTab: FilterTab, value?: string) => {
    setActiveTab(newTab);
    if (value) {
      setTimeout(() => {
        const rule: FilterRule = {
          field: newTab,
          operator: 'contains',
          value: value
        };
        setFilterRules(prev => [...prev.filter(r => r.field !== newTab), rule]);
      }, 100);
    }
  }, []);

  // Fetch enhanced calls data
  const { data: calls = [], isLoading, refetch } = useQuery<CallData[]>({
    queryKey: ["/api/calls/enhanced"],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch real campaign summaries from API
  const { data: realCampaignSummaries = [], isLoading: isLoadingSummaries } = useQuery<CampaignSummary[]>({
    queryKey: ["/api/reporting-summaries/campaign-summaries", timeRange],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch real timeline data from API
  const { data: timelineChartData = [], isLoading: isLoadingTimeline } = useQuery<{ time: string; calls: number; revenue: number }[]>({
    queryKey: ["/api/reporting-summaries/timeline-data", timeRange],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Generate timeline chart data from real calls if available
  const chartData = timelineChartData.length > 0 ? timelineChartData : Array.from({length: 24}, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    calls: 0,
    revenue: 0
  }));

  // Apply filters to the data
  const applyFilters = (data: CampaignSummary[]) => {
    if (filterRules.length === 0) return data;
    
    return data.filter(summary => {
      return filterRules.every(rule => {
        let fieldValue = '';
        switch (rule.field) {
          case 'campaign':
            fieldValue = summary.campaignName.toLowerCase();
            break;
          case 'publisher':
            fieldValue = summary.publisher.toLowerCase();
            break;
          case 'target':
            fieldValue = summary.target.toLowerCase();
            break;
          case 'buyer':
            fieldValue = summary.buyer.toLowerCase();
            break;
          case 'numberPool':
            fieldValue = summary.numberPool.toLowerCase();
            break;
          case 'dialedNumber':
            fieldValue = summary.dialedNumbers.join(', ').toLowerCase();
            break;
          default:
            return true;
        }
        
        const filterValue = rule.value.toLowerCase();
        
        switch (rule.operator) {
          case 'contains':
            return fieldValue.includes(filterValue);
          case 'doesNotContain':
            return !fieldValue.includes(filterValue);
          case 'beginsWith':
            return fieldValue.startsWith(filterValue);
          case 'doesNotBeginWith':
            return !fieldValue.startsWith(filterValue);
          case 'greaterThan':
            return parseFloat(fieldValue) > parseFloat(filterValue);
          case 'lessThan':
            return parseFloat(fieldValue) < parseFloat(filterValue);
          case 'equals':
            return fieldValue === filterValue;
          case 'doesNotEqual':
            return fieldValue !== filterValue;
          case 'exists':
            return fieldValue.length > 0;
          case 'doesNotExist':
            return fieldValue.length === 0;
          default:
            return true;
        }
      });
    });
  };

  // Use real data from API instead of mock data
  const summaryData = applyFilters(realCampaignSummaries);

  // Apply filters to get final data - only show filtered data when filter badges exist
  const filteredSummaryData = filterRules.length > 0 ? summaryData : realCampaignSummaries;

  // Filter badge handlers
  const removeFilter = (field: string) => {
    setFilterRules(prev => prev.filter(rule => rule.field !== field));
  };

  const clearAllFilters = () => {
    setFilterRules([]);
  };

  const addNewFilter = () => {
    if (newFilter.value.trim()) {
      const rule: FilterRule = {
        field: activeTab,
        operator: newFilter.operator,
        value: newFilter.value.trim()
      };
      setFilterRules(prev => [...prev.filter(r => r.field !== activeTab), rule]);
      setNewFilter({ value: '', operator: 'contains' });
    }
  };

  // Loading and empty states
  if (isLoading || isLoadingSummaries || isLoadingTimeline) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enhanced Reporting</h1>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {filteredSummaryData.length} campaigns
          </Badge>
          {autoRefresh && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Auto-refresh
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <Select defaultValue={timeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter Badges */}
      {filterRules.length > 0 && (
        <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Active Filters:</span>
          <div className="flex flex-wrap items-center gap-2">
            {filterRules.map((rule, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100"
              >
                {rule.field}: {rule.value}
                <button
                  onClick={() => removeFilter(rule.field)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-blue-700 hover:text-blue-900 dark:text-blue-300"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Compact Filter Tabs */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Quick Filters</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Filter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Filter Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Filter Field</label>
                  <Select value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="publisher">Publisher</SelectItem>
                      <SelectItem value="target">Target</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="dialedNumber">Dialed #</SelectItem>
                      <SelectItem value="numberPool">Number Pool</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="duplicate">Duplicate</SelectItem>
                      <SelectItem value="tags">Tags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Operator</label>
                  <Select value={newFilter.operator} onValueChange={(value) => setNewFilter(prev => ({ ...prev, operator: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="doesNotContain">Does Not Contain</SelectItem>
                      <SelectItem value="beginsWith">Begins With</SelectItem>
                      <SelectItem value="doesNotBeginWith">Does Not Begin With</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="doesNotEqual">Does Not Equal</SelectItem>
                      <SelectItem value="greaterThan">Greater Than</SelectItem>
                      <SelectItem value="lessThan">Less Than</SelectItem>
                      <SelectItem value="exists">Exists</SelectItem>
                      <SelectItem value="doesNotExist">Does Not Exist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Value</label>
                  <Input
                    value={newFilter.value}
                    onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Enter filter value"
                  />
                </div>
                
                <Button onClick={addNewFilter} className="w-full">
                  Add Filter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-9 h-8">
            <TabsTrigger value="campaign" className="text-xs px-2">CAMPAIGN</TabsTrigger>
            <TabsTrigger value="publisher" className="text-xs px-2">PUBLISHER</TabsTrigger>
            <TabsTrigger value="target" className="text-xs px-2">TARGET</TabsTrigger>
            <TabsTrigger value="buyer" className="text-xs px-2">BUYER</TabsTrigger>
            <TabsTrigger value="dialedNumber" className="text-xs px-2">DIALED#</TabsTrigger>
            <TabsTrigger value="numberPool" className="text-xs px-2">POOL</TabsTrigger>
            <TabsTrigger value="date" className="text-xs px-2">DATE</TabsTrigger>
            <TabsTrigger value="duplicate" className="text-xs px-2">DUP</TabsTrigger>
            <TabsTrigger value="tags" className="text-xs px-2">TAGS</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Call Volume Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis 
                  dataKey="time" 
                  fontSize={11}
                  stroke="#6b7280"
                />
                <YAxis 
                  fontSize={11}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="calls" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Campaign Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSummaryData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Campaign</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Publisher</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Target</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Buyer</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Dialed #</th>
                    <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Pool</th>
                    <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Calls</th>
                    <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Connected</th>
                    <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Revenue</th>
                    <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Conv Rate</th>
                    <th className="text-center p-3 font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaryData.map((summary, index) => (
                    <tr key={summary.campaignId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <button
                          onClick={() => handleTabClick('campaign', summary.campaignName)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium text-left"
                        >
                          {summary.campaignName}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTabClick('publisher', summary.publisher)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          {summary.publisher}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTabClick('target', summary.target)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          {summary.target}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTabClick('buyer', summary.buyer)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          {summary.buyer}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTabClick('dialedNumber', summary.dialedNumbers[0])}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-mono text-xs"
                        >
                          {summary.dialedNumbers[0]}
                          {summary.dialedNumbers.length > 1 && (
                            <span className="text-gray-500 ml-1">+{summary.dialedNumbers.length - 1}</span>
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTabClick('numberPool', summary.numberPool)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          {summary.numberPool}
                        </button>
                      </td>
                      <td className="p-3 text-right font-medium">{summary.totalCalls}</td>
                      <td className="p-3 text-right">{summary.connected}</td>
                      <td className="p-3 text-right font-medium text-green-600">
                        ${summary.revenue.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant={summary.conversionRate >= 50 ? "default" : "secondary"}>
                          {summary.conversionRate.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-500 dark:text-gray-400">
                <div className="text-lg font-medium mb-2">No Data Available</div>
                <p className="text-sm">No campaign data found for the selected time range.</p>
                <p className="text-xs mt-2">Real campaign data will appear here when calls are made and tracked.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}