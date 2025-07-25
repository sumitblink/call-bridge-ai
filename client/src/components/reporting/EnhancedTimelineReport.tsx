import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Brush
} from "recharts";
import { Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TimelineData {
  period: string;
  totalCalls: number;
  incoming: number;
  connected: number;
  converted: number;
  revenue: number;
  payout: number;
  profit: number;
  avgDuration: number;
  periodStart: string;
  periodEnd: string;
}

interface EnhancedTimelineReportProps {
  filters: any[];
  dateRange: string;
  onTimeRangeSelect: (startDate: string, endDate: string) => void;
}

export default function EnhancedTimelineReport({ 
  filters, 
  dateRange, 
  onTimeRangeSelect 
}: EnhancedTimelineReportProps) {
  const [groupBy, setGroupBy] = useState("auto");
  const [selectedMetric, setSelectedMetric] = useState("totalCalls");
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const chartRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/reporting/timeline', { filters, dateRange, groupBy }],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateRange,
        groupBy,
        filters: JSON.stringify(filters)
      });
      const response = await fetch(`/api/reporting/timeline?${params}`);
      return response.json();
    }
  });

  const timelineData = Array.isArray(data?.timeline) ? data.timeline : [];
  const summary = data?.summary || { totalCalls: 0, totalRevenue: 0, totalConversions: 0, totalCost: 0 };

  const groupingOptions = [
    { value: "auto", label: "Auto" },
    { value: "year", label: "By Year" },
    { value: "month", label: "By Month" },
    { value: "week", label: "By Week" },
    { value: "day", label: "By Day" },
    { value: "hour", label: "By Hour" },
    { value: "minute", label: "By Minute" }
  ];

  const metricOptions = [
    { value: "totalCalls", label: "Total Calls", color: "#3b82f6" },
    { value: "incoming", label: "Incoming", color: "#10b981" },
    { value: "connected", label: "Connected", color: "#f59e0b" },
    { value: "converted", label: "Converted", color: "#ef4444" },
    { value: "revenue", label: "Revenue", color: "#8b5cf6" },
    { value: "profit", label: "Profit", color: "#06b6d4" }
  ];

  const exportTimeline = () => {
    const params = new URLSearchParams({
      dateRange,
      groupBy,
      format: 'csv',
      filters: JSON.stringify(filters)
    });
    window.open(`/api/reporting/timeline/export?${params}`, '_blank');
  };

  const resetZoom = () => {
    setBrushDomain(null);
  };

  const handleBrushChange = (brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      const startData = timelineData[brushData.startIndex];
      const endData = timelineData[brushData.endIndex];
      
      if (startData && endData) {
        setBrushDomain([brushData.startIndex, brushData.endIndex]);
        onTimeRangeSelect(startData.periodStart, endData.periodEnd);
      }
    }
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'revenue' || name === 'payout' || name === 'profit') {
      return [
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value),
        name.charAt(0).toUpperCase() + name.slice(1)
      ];
    }
    
    if (name === 'avgDuration') {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return [`${minutes}:${seconds.toString().padStart(2, '0')}`, 'Avg Duration'];
    }
    
    return [value.toLocaleString(), name.charAt(0).toUpperCase() + name.slice(1)];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Total Calls:</span>
              <span className="font-medium">{(data.calls || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Conversions:</span>
              <span className="font-medium text-green-600">{(data.conversions || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-medium text-purple-600">
                ${(data.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Cost:</span>
              <span className="font-medium text-red-600">
                ${(data.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Conversion Rate:</span>
              <span className="font-medium">
                {(data.calls || 0) > 0 ? (((data.conversions || 0) / (data.calls || 1)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
            Error loading timeline data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timelineData || timelineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No timeline data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedMetricData = metricOptions.find(m => m.value === selectedMetric);
  const maxValue = Math.max(...timelineData.map((d: any) => d[selectedMetric] || 0));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Timeline Report</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupingOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metricOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: option.color }}
                      ></div>
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {brushDomain && (
              <Button variant="outline" size="sm" onClick={resetZoom}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
            
            <Button onClick={exportTimeline} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        {timelineData.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Total: {timelineData.reduce((sum: number, d: any) => sum + (d.calls || 0), 0).toLocaleString()}</Badge>
              <Badge variant="outline">Connected: {timelineData.reduce((sum: number, d: any) => sum + (d.conversions || 0), 0).toLocaleString()}</Badge>
              <Badge variant="outline">Revenue: ${timelineData.reduce((sum: number, d: any) => sum + (d.revenue || 0), 0).toLocaleString()}</Badge>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {timelineData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No data available for the selected time range and filters
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300} ref={chartRef}>
              <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (selectedMetric.includes('revenue') || selectedMetric.includes('payout') || selectedMetric.includes('profit')) {
                      return `$${(value / 1000).toFixed(0)}k`;
                    }
                    return value.toLocaleString();
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey={selectedMetric === 'totalCalls' ? 'calls' : selectedMetric}
                  fill={selectedMetricData?.color || "#3b82f6"}
                  radius={[2, 2, 0, 0]}
                  cursor="pointer"
                />
                {maxValue > 0 && (
                  <ReferenceLine 
                    y={maxValue * 0.8} 
                    stroke="#ef4444" 
                    strokeDasharray="3 3" 
                    label={{ value: "80% of Peak", position: "top" }}
                  />
                )}
                {timelineData.length > 10 && (
                  <Brush 
                    dataKey="period" 
                    height={30} 
                    stroke="#3b82f6"
                    onChange={handleBrushChange}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
            
            {brushDomain && (
              <div className="text-sm text-gray-600 text-center">
                <Badge variant="secondary">
                  Zoomed: {timelineData[brushDomain[0]]?.period} to {timelineData[brushDomain[1]]?.period}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}