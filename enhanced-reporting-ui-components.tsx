// Enhanced Reporting Page - Complete UI Components
// Copy these components to your other project

import React, { useState, useCallback, useRef } from 'react';
import { 
  ChevronDown, 
  Download, 
  Settings, 
  X, 
  Search,
  Mail,
  BarChart3
} from 'lucide-react';

// Mock UI Components (replace with your actual UI library)
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = 'default', size = 'default', onClick, disabled, className = '' }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50';
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
  };
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 text-sm',
    lg: 'h-11 px-8'
  };
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const Select = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-popover shadow-md z-50">
          {children}
        </div>
      )}
    </div>
  );
};

const SelectTrigger = ({ children, className = '' }) => children;
const SelectValue = () => null;
const SelectContent = ({ children }) => children;
const SelectItem = ({ value, children, onSelect }) => (
  <div
    className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
    onClick={() => onSelect?.(value)}
  >
    {children}
  </div>
);

const Tabs = ({ value, onValueChange, children, className = '' }) => (
  <div className={className}>
    {React.Children.map(children, child => 
      React.cloneElement(child, { value, onValueChange })
    )}
  </div>
);

const TabsList = ({ children, className = '' }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}>
    {children}
  </div>
);

const TabsTrigger = ({ value: tabValue, children, value, onValueChange, className = '' }) => (
  <button
    className={`inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${value === tabValue ? 'bg-background text-foreground shadow-sm' : ''} ${className}`}
    onClick={() => onValueChange?.(tabValue)}
  >
    {children}
  </button>
);

// Recharts components (simplified versions)
const ResponsiveContainer = ({ children, width, height }) => (
  <div style={{ width, height }}>
    {children}
  </div>
);

const BarChart = ({ data, children }) => (
  <div className="w-full h-full bg-gray-50 rounded flex items-end justify-around p-4">
    {data.map((item, index) => (
      <div key={index} className="flex flex-col items-center">
        <div 
          className="bg-yellow-500 w-6 rounded-t"
          style={{ height: `${(item.calls / Math.max(...data.map(d => d.calls))) * 120}px` }}
        />
        <span className="text-xs mt-1">{item.time}</span>
      </div>
    ))}
  </div>
);

const XAxis = () => null;
const YAxis = () => null;
const Tooltip = () => null;
const Bar = () => null;

// Sample Data
const sampleCampaignData = [
  {
    campaignId: 'CAMP001',
    campaignName: 'Healthcare Insurance Lead Generation Campaign',
    publisher: 'Google Ads Premium',
    target: 'Insurance Qualified Leads',
    buyer: 'Allstate Insurance Partners',
    dialedNumbers: ['+18566441573', '+18568791483', '+18564853922'],
    numberPool: 'Healthcare Pool 1',
    lastCallDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tags: ['healthcare', 'insurance', 'qualified', 'premium'],
    totalCalls: 127,
    incoming: 127,
    live: 23,
    completed: 89,
    ended: 104,
    connected: 89,
    paid: 67,
    converted: 43,
    noConnection: 15,
    blocked: 8,
    duplicate: 3,
    ivrHangup: 5,
    revenue: 2890.50,
    payout: 1934.75,
    profit: 955.75,
    margin: 33.05,
    conversionRate: 48.31,
    tcl: 4.2,
    acl: 3.8,
    totalCost: 1934.75
  },
  {
    campaignId: 'CAMP002',
    campaignName: 'Auto Insurance Lead Generation Campaign',
    publisher: 'Facebook Ads Professional',
    target: 'Auto Insurance Prospects',
    buyer: 'State Farm Direct',
    dialedNumbers: ['+18569256411', '+18046079719'],
    numberPool: 'Auto Insurance Pool 2',
    lastCallDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    tags: ['auto', 'insurance', 'facebook', 'social'],
    totalCalls: 94,
    incoming: 94,
    live: 18,
    completed: 67,
    ended: 78,
    connected: 67,
    paid: 52,
    converted: 31,
    noConnection: 12,
    blocked: 4,
    duplicate: 2,
    ivrHangup: 3,
    revenue: 2108.75,
    payout: 1405.50,
    profit: 703.25,
    margin: 33.35,
    conversionRate: 46.27,
    tcl: 3.9,
    acl: 3.6,
    totalCost: 1405.50
  },
  {
    campaignId: 'CAMP003',
    campaignName: 'Medicare Advantage Lead Generation',
    publisher: 'LinkedIn Business Network',
    target: 'Medicare Qualified Prospects',
    buyer: 'Medicare Direct Solutions',
    dialedNumbers: ['+15551234567', '+15559876543'],
    numberPool: 'Medicare Pool 3',
    lastCallDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    tags: ['medicare', 'seniors', 'linkedin', 'professional'],
    totalCalls: 76,
    incoming: 76,
    live: 14,
    completed: 54,
    ended: 62,
    connected: 54,
    paid: 42,
    converted: 28,
    noConnection: 8,
    blocked: 6,
    duplicate: 1,
    ivrHangup: 2,
    revenue: 1890.25,
    payout: 1260.50,
    profit: 629.75,
    margin: 33.31,
    conversionRate: 51.85,
    tcl: 3.7,
    acl: 3.4,
    totalCost: 1260.50
  }
];

const chartData = [
  { time: "12 AM", calls: 2, revenue: 45.50 },
  { time: "1 AM", calls: 1, revenue: 22.75 },
  { time: "2 AM", calls: 0, revenue: 0 },
  { time: "3 AM", calls: 1, revenue: 18.25 },
  { time: "4 AM", calls: 0, revenue: 0 },
  { time: "5 AM", calls: 2, revenue: 41.50 },
  { time: "6 AM", calls: 4, revenue: 89.75 },
  { time: "7 AM", calls: 8, revenue: 176.25 },
  { time: "8 AM", calls: 12, revenue: 267.50 },
  { time: "9 AM", calls: 18, revenue: 398.75 },
  { time: "10 AM", calls: 23, revenue: 512.25 },
  { time: "11 AM", calls: 27, revenue: 598.50 },
  { time: "12 PM", calls: 31, revenue: 687.75 },
  { time: "1 PM", calls: 29, revenue: 645.25 },
  { time: "2 PM", calls: 25, revenue: 556.75 },
  { time: "3 PM", calls: 22, revenue: 487.50 },
  { time: "4 PM", calls: 19, revenue: 421.25 },
  { time: "5 PM", calls: 16, revenue: 354.75 },
  { time: "6 PM", calls: 12, revenue: 267.50 },
  { time: "7 PM", calls: 8, revenue: 178.25 },
  { time: "8 PM", calls: 6, revenue: 133.50 },
  { time: "9 PM", calls: 4, revenue: 89.75 },
  { time: "10 PM", calls: 3, revenue: 67.25 },
  { time: "11 PM", calls: 2, revenue: 45.50 }
];

// Main Enhanced Reporting Component
const EnhancedReporting = () => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [timeRange, setTimeRange] = useState("today");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState("campaign");
  const [filterRules, setFilterRules] = useState([]);
  const [showFilterDialog, setShowFilterDialog] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    campaign: true,
    publisher: true,
    target: true,
    buyer: true,
    dialedNumber: true,
    numberPool: true,
    date: true,
    duplicate: true,
    tags: true,
    incoming: true,
    live: true,
    completed: true,
    ended: true,
    connected: true,
    paid: true,
    converted: true,
    noConnection: true,
    blocked: true,
    ivrHangup: true,
    rpc: true,
    revenue: true,
    payout: true,
    profit: true,
    margin: true,
    conversionRate: true,
    tcl: true,
    acl: true,
    totalCost: true
  });

  const [columnWidths, setColumnWidths] = useState({
    campaign: 200,
    publisher: 150,
    target: 150,
    buyer: 150,
    dialedNumber: 120,
    numberPool: 120,
    date: 100,
    duplicate: 80,
    tags: 120,
    incoming: 80,
    live: 60,
    completed: 80,
    ended: 70,
    connected: 80,
    paid: 60,
    converted: 80,
    noConnection: 100,
    blocked: 70,
    ivrHangup: 80,
    rpc: 70,
    revenue: 90,
    payout: 80,
    profit: 80,
    margin: 70,
    conversionRate: 100,
    tcl: 60,
    acl: 60,
    totalCost: 90
  });

  const exportToCSV = () => {
    const headers = ['Campaign', 'Publisher', 'Target', 'Buyer', 'Incoming', 'Connected', 'Revenue', 'Profit'];
    const csvContent = [
      headers.join(','),
      ...sampleCampaignData.map(row => [
        row.campaignName,
        row.publisher,
        row.target,
        row.buyer,
        row.incoming,
        row.connected,
        row.revenue,
        row.profit
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enhanced-reporting.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getColumnLabel = (column) => {
    const labels = {
      campaign: 'Campaign',
      publisher: 'Publisher',
      target: 'Target',
      buyer: 'Buyer',
      dialedNumber: 'Dialed #',
      numberPool: 'Number Pool',
      date: 'Date',
      duplicate: 'Duplicate',
      tags: 'Tags',
      incoming: 'Incoming',
      live: 'Live',
      completed: 'Completed',
      ended: 'Ended',
      connected: 'Connected',
      paid: 'Paid',
      converted: 'Converted',
      noConnection: 'No Connection',
      blocked: 'Blocked',
      ivrHangup: 'IVR Hangup',
      rpc: 'RPC',
      revenue: 'Revenue',
      payout: 'Payout',
      profit: 'Profit',
      margin: 'Margin',
      conversionRate: 'Conversion Rate',
      tcl: 'TCL',
      acl: 'ACL',
      totalCost: 'Total Cost'
    };
    return labels[column] || column;
  };

  const formatCurrency = (value) => `$${value.toFixed(2)}`;
  const formatPercentage = (value) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-1">
      {/* Ringba-style Header with Filters */}
      <div className="bg-gray-50 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Untitled Report</span>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
              SAVE
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Updated a few seconds ago</span>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-7 px-2 text-xs"
            >
              AUTO REFRESH
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              <Search className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              <Mail className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ringba-style Filter Buttons */}
      <div className="bg-white border-b px-4 py-2 relative overflow-visible">
        <div className="flex items-center gap-1 flex-wrap">
          {['Campaign', 'Publisher', 'Target', 'Buyer', 'Dialed #', 'Number Pool', 'Date', 'Duplicate'].map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant="outline"
              onClick={() => setShowFilterDialog(showFilterDialog === filter.toLowerCase() ? null : filter.toLowerCase())}
              className="h-7 px-2 text-xs font-medium"
            >
              {filter}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {filterRules.length > 0 && (
        <div className="bg-white border-b px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {filterRules.map((rule, index) => (
              <div key={index} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                <span>{rule.field}: {rule.value}</span>
                <button
                  onClick={() => setFilterRules(prev => prev.filter((_, i) => i !== index))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      <Card className="mx-4 mt-2">
        <CardContent className="p-4">
          <div className="mb-2">
            <h3 className="text-sm font-medium text-gray-700">Timeline</h3>
            <Select defaultValue="hourly">
              <SelectTrigger className="w-32 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Auto (By Hour)</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'calls' ? 'Calls' : 'Revenue']}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12, padding: 8 }}
                />
                <Bar 
                  dataKey="calls" 
                  fill="#F59E0B" 
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card className="mx-4 mt-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Summary</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={exportToCSV}
              >
                <Download className="h-3 w-3 mr-1" />
                EXPORT CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Ringba-style Tabbed Interface */}
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="grid w-full grid-cols-8 h-8 bg-gray-100">
                <TabsTrigger value="campaign" className="text-xs px-2">Campaign</TabsTrigger>
                <TabsTrigger value="publisher" className="text-xs px-2">Publisher</TabsTrigger>
                <TabsTrigger value="target" className="text-xs px-2">Target</TabsTrigger>
                <TabsTrigger value="buyer" className="text-xs px-2">Buyer</TabsTrigger>
                <TabsTrigger value="dialed" className="text-xs px-2">Dialed #</TabsTrigger>
                <TabsTrigger value="pool" className="text-xs px-2">Number Pool</TabsTrigger>
                <TabsTrigger value="date" className="text-xs px-2">Date</TabsTrigger>
                <TabsTrigger value="duplicate" className="text-xs px-2">Duplicate</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilterDialog(showFilterDialog === "tags" ? null : "tags")}
              className="h-8 px-2 text-xs font-medium"
            >
              Tags
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </div>

          {/* Data Table */}
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Campaign</th>
                    <th className="text-left p-3 font-medium text-gray-700">Publisher</th>
                    <th className="text-left p-3 font-medium text-gray-700">Target</th>
                    <th className="text-left p-3 font-medium text-gray-700">Buyer</th>
                    <th className="text-center p-3 font-medium text-gray-700">Incoming</th>
                    <th className="text-center p-3 font-medium text-gray-700">Connected</th>
                    <th className="text-center p-3 font-medium text-gray-700">Revenue</th>
                    <th className="text-center p-3 font-medium text-gray-700">Profit</th>
                    <th className="text-center p-3 font-medium text-gray-700">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleCampaignData.map((campaign, index) => (
                    <tr key={campaign.campaignId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{campaign.campaignName}</div>
                        <div className="text-xs text-gray-500">{campaign.campaignId}</div>
                      </td>
                      <td className="p-3">{campaign.publisher}</td>
                      <td className="p-3">{campaign.target}</td>
                      <td className="p-3">{campaign.buyer}</td>
                      <td className="p-3 text-center">{campaign.incoming}</td>
                      <td className="p-3 text-center">{campaign.connected}</td>
                      <td className="p-3 text-center text-green-600 font-medium">
                        {formatCurrency(campaign.revenue)}
                      </td>
                      <td className="p-3 text-center text-green-600 font-medium">
                        {formatCurrency(campaign.profit)}
                      </td>
                      <td className="p-3 text-center">
                        {formatPercentage(campaign.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedReporting;

// Usage Example:
// import EnhancedReporting from './enhanced-reporting-ui-components';
//
// function App() {
//   return (
//     <div className="min-h-screen bg-gray-100">
//       <EnhancedReporting />
//     </div>
//   );
// }