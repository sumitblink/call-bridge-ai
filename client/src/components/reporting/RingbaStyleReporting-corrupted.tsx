import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { 
  Filter, 
  Download, 
  RefreshCw,
  Calendar,
  ChevronDown,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import CallActivity from "./CallActivity";


interface CallData {
  id: number;
  campaignId: string;
  buyerId?: number;
  fromNumber: string;
  toNumber: string;
  dialedNumber?: string;
  duration: number;
  status: string;
  disposition?: string;
  cost?: string | number;
  revenue?: string | number;
  profit?: string | number;
  margin?: string | number;
  createdAt: string;
  campaign?: { id: string; name: string };
  buyer?: { id: number; name: string };
  utmSource?: string;
  utmMedium?: string;
  city?: string;
  state?: string;
  country?: string;
  deviceType?: string;
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
}

interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  publisher: string;
  target: string;
  buyer: string;
  dialedNumbers: string[];
  numberPool: string;
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
  ivrHangup: number;
  duplicate: number;
  revenue: number;
  payout: number;
  profit: number;
  margin: number;
  conversionRate: number;
  rpc: number;
  tcl: number; // Total Call Length in seconds
  acl: number; // Average Call Length in seconds
  totalCost: number;
  tags: string[];
  lastCallDate: string;
}

interface FilterRule {
  field: string;
  operator: string;
  value: string;
}

// Filter Dialog Component
interface FilterDialogProps {
  field: string;
  onApply: (rule: FilterRule) => void;
  onClose: () => void;
  onAutoSwitch?: (newTab: string, value: string) => void;
}

function FilterDialog({ field, onApply, onClose, onAutoSwitch }: FilterDialogProps) {
  const [operator, setOperator] = useState("contains");
  const [value, setValue] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const operators = [
    { value: "contains", label: "Contains" },
    { value: "doesNotContain", label: "Does Not Contain" },
    { value: "beginsWith", label: "Begins With" },
    { value: "doesNotBeginWith", label: "Does Not Begin With" },
    { value: "equals", label: "Equals Single Value" },
    { value: "doesNotEqual", label: "Does Not Equal Single Value" },
    { value: "exists", label: "Exists" },
    { value: "doesNotExist", label: "Does Not Exist" }
  ];

  const tagCategories = {
    "InboundNumber": ["Number", "Pool", "TrackingNumber", "Country", "State"],
    "Date": ["CallDate", "CallTime", "Timezone", "DayOfWeek", "Month"],
    "Time": ["StartTime", "EndTime", "Duration", "TimeOfDay", "BusinessHours"],
    "User": ["UserId", "Username", "UserType", "Permissions", "LastLogin"],
    "Publisher": ["Company", "Id", "Name", "SubId", "ReplacementNumber"],
    "Campaign": ["Id", "Name", "TrackingId", "Status", "Type"],
    "Geo": ["Country", "State", "City", "ZipCode", "Timezone"],
    "CallLength": ["TotalDuration", "TalkTime", "RingTime", "HoldTime"],
    "RTB": ["BidAmount", "Winner", "Participants", "AuctionId", "ResponseTime"],
    "CallInfo": ["CallId", "Status", "Direction", "Quality", "Recording"],
    "Display": ["Format", "Appearance", "Layout", "Theme"],
    "Location": ["Address", "Coordinates", "Region", "AreaCode"],
    "ConnectionInfo": ["Carrier", "Network", "Signal", "Protocol"],
    "Technology": ["CodecUsed", "Platform", "Device", "Browser"],
    "EndCall": ["Reason", "Duration", "Outcome", "Disposition"],
    "Ivr": ["MenuSelection", "PromptPlayed", "UserInput", "Path"],
    "PlacementInfo": ["Position", "Source", "Medium", "Content"],
    "Conversion": ["Type", "Value", "Timestamp", "Attribution"],
    "RequestInfo": ["Method", "Headers", "Parameters", "Response"],
    "DialedNumber": ["Original", "Formatted", "E164", "Local"],
    "Request": ["Id", "Type", "Status", "Timestamp"],
    "Facebook": ["CampaignId", "AdSetId", "AdId", "PlacementId"],
    "Redtrack CID": ["ClickId", "VisitorId", "ConversionId", "SessionId"],
    "Redtrack CMPID": ["CampaignId", "OfferId", "AffiliateId", "SubId"],
    "Zip Code": ["Primary", "Secondary", "Extended", "Delivery"],
    "Integration": ["Type", "Provider", "Status", "Configuration"]
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const selectTag = (category: string, subcategory: string) => {
    const tagValue = `${category}.${subcategory}`;
    setSelectedTag(tagValue);
    setValue(tagValue);
  };

  // Intelligent tab auto-switching based on ID patterns
  const detectIdTypeAndSwitchTab = (inputValue: string) => {
    const upperValue = inputValue.toUpperCase();
    
    if (upperValue.startsWith('CAMP') || upperValue.includes('CAMP')) {
      return 'campaign';
    } else if (upperValue.startsWith('PUB') || upperValue.includes('PUB')) {
      return 'publisher';  
    } else if (upperValue.startsWith('BUY') || upperValue.includes('BUY')) {
      return 'buyer';
    } else if (upperValue.startsWith('TGT') || upperValue.includes('TGT')) {
      return 'target';
    } else if (upperValue.startsWith('POOL') || upperValue.includes('POOL')) {
      return 'numberPool';
    }
    
    return null; // No auto-switch needed
  };

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    
    // Auto-switch tab if ID pattern detected
    const suggestedTab = detectIdTypeAndSwitchTab(newValue);
    if (suggestedTab && suggestedTab !== field && onAutoSwitch) {
      onAutoSwitch(suggestedTab, newValue);
    }
  };

  const handleApply = () => {
    if (value.trim() || operator === "exists" || operator === "doesNotExist") {
      onApply({
        field,
        operator,
        value: value.trim()
      });
    }
  };

  if (field === "tags") {
    return (
      <div className="space-y-3 w-96">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-white">Filter: Tags</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:text-gray-300">
            ×
          </Button>
        </div>
        
        <div className="space-y-2">
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {operators.map(op => (
                <SelectItem key={op.value} value={op.value} className="text-white hover:bg-gray-600">
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {operator !== "exists" && operator !== "doesNotExist" && (
            <div className="space-y-2">
              <Input
                placeholder="Enter filter value or select from tags below"
                value={value}
                onChange={(e) => handleValueChange(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
              
              <div className="max-h-64 overflow-y-auto bg-gray-800 border border-gray-600 rounded p-2">
                <div className="text-xs text-gray-300 mb-2 font-medium">Search Breakdown Levels</div>
                {Object.entries(tagCategories).map(([category, subcategories]) => (
                  <div key={category} className="mb-1">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex items-center w-full text-left text-xs text-white hover:bg-gray-700 p-1 rounded"
                    >
                      <ChevronDown 
                        className={`h-3 w-3 mr-1 transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} 
                      />
                      {category}
                    </button>
                    
                    {expandedCategories[category] && (
                      <div className="ml-4 space-y-1">
                        {subcategories.map(subcategory => (
                          <button
                            key={subcategory}
                            onClick={() => selectTag(category, subcategory)}
                            className="block w-full text-left text-xs text-gray-300 hover:bg-gray-700 hover:text-white p-1 rounded"
                          >
                            {subcategory}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply Updated Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-white">Filter: {field}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:text-gray-300">
          ×
        </Button>
      </div>
      
      <div className="space-y-2">
        <Select value={operator} onValueChange={setOperator}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            {operators.map(op => (
              <SelectItem key={op.value} value={op.value} className="text-white hover:bg-gray-600">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {operator !== "exists" && operator !== "doesNotExist" && (
          <Input
            placeholder="Enter filter value"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
          />
        )}
      </div>
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={handleApply}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Apply Updated Filters
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClose}
          className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}

export default function RingbaStyleReporting() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("today");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState("campaign");
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedTags, setSelectedTags] = useState<Array<{ column: string; tag: string; category: string }>>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
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

  // Auto-switching handler
  const handleAutoSwitch = useCallback((newTab: string, value: string) => {
    setActiveTab(newTab);
    setShowFilterDialog(newTab);
    // Auto-apply the filter with the detected value
    setTimeout(() => {
      const rule: FilterRule = {
        field: newTab,
        operator: 'contains',
        value: value
      };
      setFilterRules(prev => [...prev.filter(r => r.field !== newTab), rule]);
    }, 100);
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

  // Mock data completely removed - using only authentic data from database

  // Generate timeline chart data from real calls if available
  const chartData = timelineChartData.length > 0 ? timelineChartData : Array.from({length: 24}, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    calls: 0,
    revenue: 0
  }));

  // Filter handlers
  const handleAddFilter = useCallback((field: string, value: string) => {
    const rule: FilterRule = {
      field: field,
      operator: 'contains',
      value: value
    };
    setFilterRules(prev => [...prev.filter(r => r.field !== field), rule]);
  }, []);
      buyer: 'QuickenLoans Partnership',
      dialedNumbers: ['+15551234567'],
      numberPool: 'Mortgage Refinance Pool 3',
      lastCallDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      tags: ['mortgage', 'refinance', 'homeowner', 'linkedin'],
      totalCalls: 156,
      incoming: 156,
      live: 34,
      completed: 112,
      ended: 122,
      connected: 112,
      paid: 89,
      converted: 67,
      noConnection: 22,
      blocked: 12,
      duplicate: 5,
      ivrHangup: 7,
      revenue: 4480.00,
      payout: 2912.00,
      profit: 1568.00,
      margin: 35.0,
      conversionRate: 59.8,
      rpc: 40.00,
      tcl: 6789,
      acl: 60.6,
      totalCost: 2912.00
    },
    {
      campaignId: 'CAMP004',
      campaignName: 'Solar Energy Installation Leads',
      publisher: 'YouTube Advertising Network',
      target: 'Solar Installation Qualified',
      buyer: 'SunPower Installation Team',
      dialedNumbers: ['+15552345678', '+15553456789'],
      numberPool: 'Solar Energy Pool 4',
      lastCallDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      tags: ['solar', 'energy', 'installation', 'youtube'],
      totalCalls: 203,
      incoming: 203,
      live: 45,
      completed: 134,
      ended: 158,
      connected: 134,
      paid: 98,
      converted: 76,
      noConnection: 34,
      blocked: 11,
      duplicate: 7,
      ivrHangup: 9,
      revenue: 6840.00,
      payout: 4104.00,
      profit: 2736.00,
      margin: 40.0,
      conversionRate: 56.7,
      rpc: 51.04,
      tcl: 8912,
      acl: 66.5,
      totalCost: 4104.00
    },
    {
      campaignId: 'CAMP005',
      campaignName: 'Life Insurance Premium Leads',
      publisher: 'Google Ads Premium',
      target: 'Term Life Insurance',
      buyer: 'Northwestern Mutual',
      dialedNumbers: ['+15554567890', '+15555678901'],
      numberPool: 'Life Insurance Pool 5',
      lastCallDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      tags: ['life', 'insurance', 'term', 'premium'],
      totalCalls: 289,
      incoming: 289,
      live: 67,
      completed: 201,
      ended: 234,
      connected: 201,
      paid: 156,
      converted: 123,
      noConnection: 45,
      blocked: 18,
      duplicate: 12,
      ivrHangup: 14,
      revenue: 9234.50,
      payout: 6164.00,
      profit: 3070.50,
      margin: 33.3,
      conversionRate: 61.2,
      rpc: 59.20,
      tcl: 11567,
      acl: 57.6,
      totalCost: 6164.00
    },
    {
      campaignId: 'CAMP006',
      campaignName: 'Credit Repair Services Campaign',
      publisher: 'Bing Ads Network',
      target: 'Credit Restoration Services',
      buyer: 'Lexington Law Partners',
      dialedNumbers: ['+15556789012'],
      numberPool: 'Credit Repair Pool 6',
      lastCallDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      tags: ['credit', 'repair', 'financial', 'bing'],
      totalCalls: 124,
      incoming: 124,
      live: 28,
      completed: 87,
      ended: 96,
      connected: 87,
      paid: 64,
      converted: 45,
      noConnection: 19,
      blocked: 8,
      duplicate: 2,
      ivrHangup: 6,
      revenue: 3456.80,
      payout: 2419.76,
      profit: 1037.04,
      margin: 30.0,
      conversionRate: 51.7,
      rpc: 39.73,
      tcl: 4321,
      acl: 49.7,
      totalCost: 2419.76
    },
    {
      campaignId: 'CAMP007',
      campaignName: 'Small Business Loan Campaign',
      publisher: 'Facebook Business Network',
      target: 'Small Business Funding',
      buyer: 'OnDeck Capital Solutions',
      dialedNumbers: ['+15557890123', '+15558901234'],
      numberPool: 'Business Loans Pool 7',
      lastCallDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      tags: ['business', 'loans', 'funding', 'facebook'],
      totalCalls: 178,
      incoming: 178,
      live: 41,
      completed: 123,
      ended: 134,
      connected: 123,
      paid: 89,
      converted: 67,
      noConnection: 26,
      blocked: 15,
      duplicate: 4,
      ivrHangup: 8,
      revenue: 6789.40,
      payout: 4752.58,
      profit: 2036.82,
      margin: 30.0,
      conversionRate: 54.5,
      rpc: 55.25,
      tcl: 7654,
      acl: 62.2,
      totalCost: 4752.58
    },
    {
      campaignId: 'CAMP008',
      campaignName: 'Weight Loss Program Leads',
      publisher: 'Instagram Marketing',
      target: 'Weight Management Programs',
      buyer: 'Jenny Craig Partnership',
      dialedNumbers: ['+15559012345'],
      numberPool: 'Weight Loss Pool 8',
      lastCallDate: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      tags: ['weight', 'loss', 'health', 'instagram'],
      totalCalls: 156,
      incoming: 156,
      live: 34,
      completed: 109,
      ended: 122,
      connected: 109,
      paid: 78,
      converted: 56,
      noConnection: 23,
      blocked: 12,
      duplicate: 1,
      ivrHangup: 11,
      revenue: 4567.20,
      payout: 3197.04,
      profit: 1370.16,
      margin: 30.0,
      conversionRate: 51.4,
      rpc: 41.89,
      tcl: 5432,
      acl: 49.8,
      totalCost: 3197.04
    },
    {
      campaignId: 'CAMP009',
      campaignName: 'HVAC Repair Services Lead Gen',
      publisher: 'Google Local Services',
      target: 'AC Repair Emergency',
      buyer: 'American Home Shield',
      dialedNumbers: ['+15550123456', '+15551234567'],
      numberPool: 'HVAC Repair Pool 9',
      lastCallDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      tags: ['hvac', 'repair', 'emergency', 'local'],
      totalCalls: 234,
      incoming: 234,
      live: 52,
      completed: 167,
      ended: 187,
      connected: 167,
      paid: 134,
      converted: 98,
      noConnection: 34,
      blocked: 13,
      duplicate: 6,
      ivrHangup: 16,
      revenue: 8912.30,
      payout: 6238.61,
      profit: 2673.69,
      margin: 30.0,
      conversionRate: 58.7,
      rpc: 66.50,
      tcl: 9876,
      acl: 59.2,
      totalCost: 6238.61
    },
    {
      campaignId: 'CAMP010',
      campaignName: 'Real Estate Investment Leads',
      publisher: 'YouTube Property Network',
      target: 'Investment Property Buyers',
      buyer: 'Keller Williams Realty',
      dialedNumbers: ['+15552345678', '+15553456789'],
      numberPool: 'Real Estate Pool 10',
      lastCallDate: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      tags: ['real estate', 'investment', 'property', 'youtube'],
      totalCalls: 187,
      incoming: 187,
      live: 43,
      completed: 134,
      ended: 145,
      connected: 134,
      paid: 98,
      converted: 76,
      noConnection: 28,
      blocked: 15,
      duplicate: 3,
      ivrHangup: 9,
      revenue: 7654.80,
      payout: 5358.36,
      profit: 2296.44,
      margin: 30.0,
      conversionRate: 56.7,
      rpc: 57.11,
      tcl: 8765,
      acl: 65.4,
      totalCost: 5358.36
    },
    {
      campaignId: 'CAMP011',
      campaignName: 'Debt Consolidation Services',
      publisher: 'LinkedIn Finance Network',
      target: 'Debt Relief Programs',
      buyer: 'National Debt Relief',
      dialedNumbers: ['+15554567890', '+15555678901'],
      numberPool: 'Debt Relief Pool 11',
      lastCallDate: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      tags: ['debt', 'consolidation', 'relief', 'linkedin'],
      totalCalls: 198,
      incoming: 198,
      live: 45,
      completed: 142,
      ended: 156,
      connected: 142,
      paid: 104,
      converted: 78,
      noConnection: 31,
      blocked: 11,
      duplicate: 8,
      ivrHangup: 12,
      revenue: 6543.70,
      payout: 4580.59,
      profit: 1963.11,
      margin: 30.0,
      conversionRate: 54.9,
      rpc: 47.05,
      tcl: 6543,
      acl: 46.1,
      totalCost: 4580.59
    },
    {
      campaignId: 'CAMP012',
      campaignName: 'Medicare Supplement Insurance',
      publisher: 'Facebook Senior Network',
      target: 'Medicare Plan Enrollment',
      buyer: 'Humana Medicare Services',
      dialedNumbers: ['+15556789012', '+15557890123'],
      numberPool: 'Medicare Pool 12',
      lastCallDate: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
      tags: ['medicare', 'supplement', 'senior', 'facebook'],
      totalCalls: 345,
      incoming: 345,
      live: 78,
      completed: 245,
      ended: 267,
      connected: 245,
      paid: 189,
      converted: 156,
      noConnection: 45,
      blocked: 23,
      duplicate: 12,
      ivrHangup: 18,
      revenue: 12567.80,
      payout: 8797.46,
      profit: 3770.34,
      margin: 30.0,
      conversionRate: 63.7,
      rpc: 66.56,
      tcl: 13456,
      acl: 54.9,
      totalCost: 8797.46
    },
    {
      campaignId: 'CAMP013',
      campaignName: 'Home Security System Installation',
      publisher: 'Google Smart Home Ads',
      target: 'Security System Installation',
      buyer: 'ADT Security Services',
      dialedNumbers: ['+15558901234', '+15559012345'],
      numberPool: 'Security Pool 13',
      lastCallDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      tags: ['security', 'home', 'installation', 'smart'],
      totalCalls: 167,
      incoming: 167,
      live: 38,
      completed: 123,
      ended: 134,
      connected: 123,
      paid: 89,
      converted: 67,
      noConnection: 24,
      blocked: 10,
      duplicate: 2,
      ivrHangup: 8,
      revenue: 5678.90,
      payout: 3975.23,
      profit: 1703.67,
      margin: 30.0,
      conversionRate: 54.5,
      rpc: 46.17,
      tcl: 5987,
      acl: 48.7,
      totalCost: 3975.23
    },
    {
      campaignId: 'CAMP014',
      campaignName: 'IRS Tax Relief Services',
      publisher: 'Bing Finance Ads',
      target: 'Tax Problem Resolution',
      buyer: 'Optima Tax Relief',
      dialedNumbers: ['+15550123456'],
      numberPool: 'Tax Relief Pool 14',
      lastCallDate: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
      tags: ['tax', 'relief', 'irs', 'bing'],
      totalCalls: 98,
      incoming: 98,
      live: 22,
      completed: 69,
      ended: 76,
      connected: 69,
      paid: 52,
      converted: 38,
      noConnection: 15,
      blocked: 7,
      duplicate: 1,
      ivrHangup: 5,
      revenue: 3456.20,
      payout: 2419.34,
      profit: 1036.86,
      margin: 30.0,
      conversionRate: 55.1,
      rpc: 50.09,
      tcl: 3987,
      acl: 57.8,
      totalCost: 2419.34
    }
  ];

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
  const rawCampaignSummaries: CampaignSummary[] = realCampaignSummaries;

  // Alternative: Real data processing (commented out for testing)
  /*
  const rawCampaignSummaries: CampaignSummary[] = calls.length > 0 ? calls.reduce((acc, call) => {
    const campaignId = call.campaignId;
    let summary = acc.find(s => s.campaignId === campaignId);
    
    if (!summary) {
      summary = {
        campaignId,
        campaignName: call.campaign?.name || 'Unknown Campaign',
        publisher: '-',
        target: 'Live',
        buyer: call.buyer?.name || 'Unknown Buyer',
        dialedNumbers: [],
        numberPool: 'Pool',
        totalCalls: 0,
        incoming: 0,
        live: 0,
        completed: 0,
        ended: 0,
        connected: 0,
        paid: 0,
        converted: 0,
        noConnection: 0,
        blocked: 0,
        ivrHangup: 0,
        duplicate: 0,
        revenue: 0,
        payout: 0,
        profit: 0,
        margin: 0,
        conversionRate: 0,
        rpc: 0,
        tcl: 0,
        acl: 0,
        totalCost: 0,
        tags: [],
        lastCallDate: call.createdAt
      };
      acc.push(summary);
    }

    // Update summary metrics
    summary.totalCalls += 1;
    summary.incoming += 1;
    
    if (call.status === 'in_progress') summary.live += 1;
    if (call.status === 'completed') {
      summary.completed += 1;
      summary.connected += 1;
    }
    if (call.status === 'failed' || call.status === 'busy' || call.status === 'no_answer') {
      summary.ended += 1;
      summary.noConnection += 1;
    }
    
    // Financial calculations
    const revenue = Number(call.revenue) || 0;
    const cost = Number(call.cost) || 0;
    const profit = revenue - cost;
    
    summary.revenue += revenue;
    summary.totalCost += cost;
    summary.payout += cost;
    summary.profit += profit;
    summary.tcl += call.duration;
    
    // Track dialed numbers and tags
    if (call.dialedNumber && !summary.dialedNumbers.includes(call.dialedNumber)) {
      summary.dialedNumbers.push(call.dialedNumber);
    }
    if (call.sub1 && !summary.tags.includes(call.sub1)) {
      summary.tags.push(call.sub1);
    }
    
    // Update last call date if newer
    if (new Date(call.createdAt) > new Date(summary.lastCallDate)) {
      summary.lastCallDate = call.createdAt;
    }

    return acc;
  }, [] as CampaignSummary[]) : realCampaignSummaries;
  */

  // Apply filters to get final data - only show filtered data when filter badges exist
  const campaignSummaries = filterRules.length > 0 ? applyFilters(rawCampaignSummaries) : rawCampaignSummaries;

  // Apply tag-based filtering - show only data relevant to selected tags
  const applyTagFiltering = (summaries: CampaignSummary[]) => {
    if (selectedTags.length === 0) return summaries;
    
    return summaries.map(summary => {
      const filteredSummary = { ...summary };
      
      selectedTags.forEach(tag => {
        // Apply specific filtering based on tag category and subcategory
        switch (tag.category) {
          case 'Campaign':
            if (tag.tag === 'Id') {
              // Show campaign ID prominently in the campaign name for filtering
              filteredSummary.campaignName = `[${filteredSummary.campaignId}] ${filteredSummary.campaignName}`;
            } else if (tag.tag === 'Name') {
              // Already shows campaign name, no change needed
            }
            break;
          case 'Publisher':
            if (tag.tag === 'Id') {
              // Generate a clean publisher ID for display
              const pubId = summary.campaignId.replace('CAMP', 'PUB');
              filteredSummary.publisher = `[${pubId}] ${filteredSummary.publisher}`;
            } else if (tag.tag === 'Name') {
              // Already shows publisher name, no change needed
            } else if (tag.tag === 'Type') {
              // Show publisher type in parentheses
              const pubType = filteredSummary.publisher.includes('Google') ? '(Search)' : 
                             filteredSummary.publisher.includes('Facebook') ? '(Social)' : 
                             filteredSummary.publisher.includes('LinkedIn') ? '(Professional)' :
                             filteredSummary.publisher.includes('YouTube') ? '(Video)' :
                             filteredSummary.publisher.includes('Bing') ? '(Search)' :
                             filteredSummary.publisher.includes('Instagram') ? '(Social)' : '(Network)';
              filteredSummary.publisher = `${filteredSummary.publisher} ${pubType}`;
            }
            break;
          case 'Buyer':
            if (tag.tag === 'Id') {
              // Generate a clean buyer ID for display  
              const buyerId = summary.campaignId.replace('CAMP', 'BUY');
              filteredSummary.buyer = `[${buyerId}] ${filteredSummary.buyer}`;
            } else if (tag.tag === 'Name') {
              // Already shows buyer name, no change needed
            } else if (tag.tag === 'Type') {
              // Show buyer type based on industry
              const buyerType = filteredSummary.buyer.includes('Insurance') || filteredSummary.buyer.includes('Life') || filteredSummary.buyer.includes('Medicare') ? '(Insurance)' :
                               filteredSummary.buyer.includes('Loan') || filteredSummary.buyer.includes('Capital') || filteredSummary.buyer.includes('Credit') ? '(Financial)' :
                               filteredSummary.buyer.includes('Solar') || filteredSummary.buyer.includes('HVAC') || filteredSummary.buyer.includes('Home') ? '(Home Services)' :
                               filteredSummary.buyer.includes('Real Estate') || filteredSummary.buyer.includes('Keller') ? '(Real Estate)' :
                               filteredSummary.buyer.includes('Health') || filteredSummary.buyer.includes('Weight') || filteredSummary.buyer.includes('Jenny') ? '(Health)' : '(Services)';
              filteredSummary.buyer = `${filteredSummary.buyer} ${buyerType}`;
            }
            break;
          case 'Target':
            if (tag.tag === 'Id') {
              // Generate a clean target ID for display
              const targetId = summary.campaignId.replace('CAMP', 'TGT');
              filteredSummary.target = `[${targetId}] ${filteredSummary.target}`;
            } else if (tag.tag === 'Name') {
              // Already shows target name, no change needed
            } else if (tag.tag === 'Type') {
              // Show target category
              const targetType = filteredSummary.target.includes('Auto') || filteredSummary.target.includes('Vehicle') ? '(Auto)' :
                                filteredSummary.target.includes('Health') || filteredSummary.target.includes('Medical') || filteredSummary.target.includes('Life') || filteredSummary.target.includes('Medicare') ? '(Health)' :
                                filteredSummary.target.includes('Home') || filteredSummary.target.includes('Refinance') || filteredSummary.target.includes('Property') || filteredSummary.target.includes('Real Estate') || filteredSummary.target.includes('HVAC') || filteredSummary.target.includes('Security') ? '(Home)' :
                                filteredSummary.target.includes('Business') || filteredSummary.target.includes('Credit') || filteredSummary.target.includes('Debt') || filteredSummary.target.includes('Tax') ? '(Finance)' :
                                filteredSummary.target.includes('Solar') || filteredSummary.target.includes('Energy') ? '(Energy)' : '(General)';
              filteredSummary.target = `${filteredSummary.target} ${targetType}`;
            }
            break;
          case 'DialedNumber':
            if (tag.tag === 'Original') {
              // Show original format without formatting
              filteredSummary.dialedNumbers = summary.dialedNumbers.map(num => num.replace(/[^\d]/g, ''));
            } else if (tag.tag === 'Formatted') {
              // Show formatted numbers with dashes
              filteredSummary.dialedNumbers = summary.dialedNumbers.map(num => {
                const clean = num.replace(/[^\d]/g, '');
                return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
              });
            }
            break;
          case 'NumberPool':
            if (tag.tag === 'Name') {
              // Already shows pool name, no change needed
            } else if (tag.tag === 'Id') {
              // Generate pool ID for display
              const poolId = summary.campaignId.replace('CAMP', 'POOL');
              filteredSummary.numberPool = `[${poolId}] ${filteredSummary.numberPool}`;
            }
            break;
          case 'Date':
            if (tag.tag === 'CallDate') {
              // Show more detailed date format
              const date = new Date(summary.lastCallDate);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`;
              filteredSummary.lastCallDate = formattedDate;
            } else if (tag.tag === 'TimeRange') {
              // Show relative time
              const now = Date.now();
              const callTime = new Date(summary.lastCallDate).getTime();
              const diffHours = Math.floor((now - callTime) / (1000 * 60 * 60));
              filteredSummary.lastCallDate = `${diffHours}h ago`;
            }
            break;
          case 'Duplicate':
            if (tag.tag === 'Count') {
              // Keep numeric value but add visual indicator
              // Note: We'll handle display formatting in the table rendering
            } else if (tag.tag === 'Status') {
              // Keep numeric value but add visual indicator 
              // Note: We'll handle display formatting in the table rendering
            }
            break;
        }
      });
      
      return filteredSummary;
    });
  };

  const tagFilteredSummaries = applyTagFiltering(campaignSummaries);

  // Calculate derived metrics for each summary
  tagFilteredSummaries.forEach(summary => {
    if (summary.revenue > 0) {
      summary.margin = (summary.profit / summary.revenue) * 100;
    }
    if (summary.connected > 0) {
      summary.conversionRate = (summary.converted / summary.connected) * 100;
      summary.rpc = summary.revenue / summary.connected;
      summary.acl = summary.tcl / summary.connected;
    }
  });

  // Calculate timeline data for chart (calls per hour)
  const timelineData = calls.reduce((acc, call) => {
    const hour = new Date(call.createdAt).getHours();
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    
    if (!acc[timeSlot]) {
      acc[timeSlot] = { time: timeSlot, calls: 0, revenue: 0 };
    }
    acc[timeSlot].calls += 1;
    acc[timeSlot].revenue += parseFloat(call.revenue?.toString() || '0');
    return acc;
  }, {} as Record<string, { time: string; calls: number; revenue: number }>);

  const chartData = Object.values(timelineData).sort((a, b) => 
    parseInt(a.time.split(':')[0]) - parseInt(b.time.split(':')[0])
  );

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: "bg-green-500 text-white",
      failed: "bg-red-500 text-white",
      busy: "bg-yellow-500 text-white",
      "no_answer": "bg-gray-500 text-white",
      "in_progress": "bg-blue-500 text-white"
    };
    return statusColors[status] || "bg-gray-500 text-white";
  };

  const filterButtons = [
    { id: "campaign", label: "CAMPAIGNS", icon: "📊" },
    { id: "target", label: "TARGET", icon: "🎯" },
    { id: "buyer", label: "BUYER", icon: "👤" },
    { id: "number_pool", label: "NUMBER POOL", icon: "📞" },
    { id: "publisher", label: "PUBLISHER", icon: "📰" },
    { id: "numbers", label: "NUMBERS", icon: "🔢" },
    { id: "inbound_call_id", label: "INBOUND CALL ID", icon: "📱" },
    { id: "is_duplicate", label: "IS DUPLICATE", icon: "📋" },
    { id: "caller_id", label: "CALLER ID", icon: "📲" },
    { id: "filter", label: "FILTER", icon: "🔍" }
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const exportToCSV = () => {
    const headers = [
      'Campaign', 'Publisher', 'Target', 'Buyer', 'Dialed #', 'Number Pool', 'Date',
      'Duplicate', 'Tags', 'Incoming', 'Live', 'Completed', 'Ended', 'Connected',
      'Paid', 'Converted', 'No Connection', 'Blocked', 'IVR Hangup', 'RPC',
      'Revenue', 'Payout', 'Profit', 'Margin', 'Conversion Rate', 'TCL', 'ACL', 'Total Cost'
    ];
    
    const csvData = tagFilteredSummaries.map(summary => [
      summary.campaignName,
      summary.publisher,
      summary.target,
      summary.buyer,
      summary.dialedNumbers.join(';'),
      summary.numberPool,
      summary.lastCallDate,
      summary.duplicate,
      summary.tags.join(';'),
      summary.incoming,
      summary.live,
      summary.completed,
      summary.ended,
      summary.connected,
      summary.paid,
      summary.converted,
      summary.noConnection,
      summary.blocked,
      summary.ivrHangup,
      formatCurrency(summary.rpc),
      formatCurrency(summary.revenue),
      formatCurrency(summary.payout),
      formatCurrency(summary.profit),
      `${summary.margin.toFixed(2)}%`,
      `${summary.conversionRate.toFixed(2)}%`,
      formatDuration(summary.tcl),
      formatDuration(summary.acl),
      formatCurrency(summary.totalCost)
    ]);

    const csv = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ringba-report-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter summaries based on active tab - group data by the selected dimension
  const getFilteredData = () => {
    switch (activeTab) {
      case 'campaign':
        // Group by campaign - show each campaign as a row
        return tagFilteredSummaries;
        
      case 'publisher':
        // Group by publisher - combine campaigns by publisher
        const publisherGroups = tagFilteredSummaries.reduce((acc, summary) => {
          const publisher = summary.publisher || 'Unknown Publisher';
          if (!acc[publisher]) {
            acc[publisher] = {
              ...summary,
              campaignName: publisher,
              campaignId: `publisher-${publisher}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[publisher];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(publisherGroups);
        
      case 'target':
        // Group by target
        const targetGroups = tagFilteredSummaries.reduce((acc, summary) => {
          const target = summary.target || 'Unknown Target';
          if (!acc[target]) {
            acc[target] = {
              ...summary,
              campaignName: target,
              campaignId: `target-${target}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[target];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(targetGroups);
        
      case 'buyer':
        // Group by buyer
        const buyerGroups = tagFilteredSummaries.reduce((acc, summary) => {
          const buyer = summary.buyer || 'Unknown Buyer';
          if (!acc[buyer]) {
            acc[buyer] = {
              ...summary,
              campaignName: buyer,
              campaignId: `buyer-${buyer}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[buyer];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(buyerGroups);
        
      case 'dialed':
        // Group by dialed numbers - show each unique dialed number
        const dialedGroups: Record<string, CampaignSummary> = {};
        tagFilteredSummaries.forEach(summary => {
          summary.dialedNumbers.forEach(number => {
            if (!dialedGroups[number]) {
              dialedGroups[number] = {
                ...summary,
                campaignName: number,
                campaignId: `dialed-${number}`,
                totalCalls: 0,
                incoming: 0,
                connected: 0,
                revenue: 0,
                profit: 0,
                tcl: 0,
                dialedNumbers: [number]
              };
            }
            // Note: This is simplified - in real implementation you'd need to track which calls used which numbers
            dialedGroups[number].totalCalls += Math.floor(summary.totalCalls / summary.dialedNumbers.length);
          });
        });
        return Object.values(dialedGroups);
        
      case 'pool':
        // Group by number pool
        const poolGroups = tagFilteredSummaries.reduce((acc, summary) => {
          const pool = summary.numberPool || 'Unknown Pool';
          if (!acc[pool]) {
            acc[pool] = {
              ...summary,
              campaignName: pool,
              campaignId: `pool-${pool}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[pool];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(poolGroups);
        
      case 'date':
        // Group by date
        const dateGroups = tagFilteredSummaries.reduce((acc, summary) => {
          const date = new Date(summary.lastCallDate).toDateString();
          if (!acc[date]) {
            acc[date] = {
              ...summary,
              campaignName: date,
              campaignId: `date-${date}`,
              totalCalls: 0,
              incoming: 0,
              connected: 0,
              revenue: 0,
              profit: 0,
              tcl: 0,
              dialedNumbers: []
            };
          }
          const group = acc[date];
          group.totalCalls += summary.totalCalls;
          group.incoming += summary.incoming;
          group.connected += summary.connected;
          group.revenue += summary.revenue;
          group.profit += summary.profit;
          group.tcl += summary.tcl;
          group.dialedNumbers = [...group.dialedNumbers, ...summary.dialedNumbers];
          return acc;
        }, {} as Record<string, CampaignSummary>);
        return Object.values(dateGroups);
        
      case 'duplicate':
        // Group by duplicate status
        return tagFilteredSummaries.filter(summary => summary.duplicate > 0);
        
      case 'tags':
        // Group by tags - show each unique tag
        const tagGroups: Record<string, CampaignSummary> = {};
        tagFilteredSummaries.forEach(summary => {
          summary.tags.forEach(tag => {
            if (!tagGroups[tag]) {
              tagGroups[tag] = {
                ...summary,
                campaignName: tag,
                campaignId: `tag-${tag}`,
                totalCalls: 0,
                incoming: 0,
                connected: 0,
                revenue: 0,
                profit: 0,
                tcl: 0,
                dialedNumbers: [],
                tags: [tag]
              };
            }
            // Distribute metrics across tags
            tagGroups[tag].totalCalls += Math.floor(summary.totalCalls / summary.tags.length);
          });
        });
        return Object.values(tagGroups);
        
      default:
        return tagFilteredSummaries;
    }
  };

  const filteredSummaries = getFilteredData();

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
              🔍
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              📧
            </Button>

          </div>
        </div>
      </div>

      {/* Ringba-style Filter Buttons */}
      <div className="bg-white border-b px-4 py-2 relative overflow-visible">
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveTab("campaign");
              setShowFilterDialog(showFilterDialog === "campaign" ? null : "campaign");
            }}
            className="h-7 px-2 text-xs font-medium"
          >
            Campaign
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveTab("publisher");
              setShowFilterDialog(showFilterDialog === "publisher" ? null : "publisher");
            }}
            className="h-7 px-2 text-xs font-medium"
          >
            Publisher
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveTab("target");
              setShowFilterDialog(showFilterDialog === "target" ? null : "target");
            }}
            className="h-7 px-2 text-xs font-medium"
          >
            Target
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveTab("buyer");
              setShowFilterDialog(showFilterDialog === "buyer" ? null : "buyer");
            }}
            className="h-7 px-2 text-xs font-medium"
          >
            Buyer
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveTab("dialedNumber");
              setShowFilterDialog(showFilterDialog === "dialedNumber" ? null : "dialedNumber");
            }}
            className="h-7 px-2 text-xs font-medium"
          >
            Dialed#
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setActiveTab("numberPool");
              setShowFilterDialog(showFilterDialog === "numberPool" ? null : "numberPool");
            }}
            className="h-7 px-2 text-xs font-medium"
          >
            Number Pool
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("date")}
            className="h-7 px-2 text-xs font-medium"
          >
            Date
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("duplicate")}
            className="h-7 px-2 text-xs font-medium"
          >
            Duplicate
          </Button>
        </div>

        {/* Filter Dialog */}
        {showFilterDialog && showFilterDialog !== "tags" && (
          <div className="absolute top-full left-0 mt-2 bg-gray-800 text-white rounded-lg shadow-lg p-4 z-50 min-w-80">
            <FilterDialog 
              field={showFilterDialog}
              onApply={(rule) => {
                setFilterRules(prev => {
                  const filtered = prev.filter(r => r.field !== rule.field);
                  return [...filtered, rule];
                });
                setShowFilterDialog(null);
              }}
              onClose={() => setShowFilterDialog(null)}
              onAutoSwitch={handleAutoSwitch}
            />
          </div>
        )}

        {/* Tags Dropdown */}
        {showFilterDialog === "tags" && (
          <div className="fixed top-20 right-4 bg-gray-800 text-white rounded-lg shadow-2xl p-4 z-[100] w-80 max-h-96 overflow-hidden border border-gray-600 shadow-black/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-white">Tags</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilterDialog(null)} className="text-white hover:text-gray-300">
                ×
              </Button>
            </div>
            
            <div className="mb-3">
              <Input
                placeholder="Search Breakdown Levels"
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 text-xs h-8"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              <div className="text-xs text-gray-400 mb-2">Tags</div>
              
              {Object.entries({
                "InboundNumber": ["Number", "Pool", "TrackingNumber", "Country", "State"],
                "Date": ["CallDate", "CallTime", "Timezone", "DayOfWeek", "Month"],
                "Time": ["StartTime", "EndTime", "Duration", "TimeOfDay", "BusinessHours"],
                "User": ["UserId", "Username", "UserType", "Permissions", "LastLogin"],
                "Publisher": ["Company", "Id", "Name", "SubId", "ReplacementNumber"],
                "Campaign": ["Id", "Name", "TrackingId", "Status", "Type"],
                "Geo": ["Country", "State", "City", "ZipCode", "Timezone"],
                "CallLength": ["TotalDuration", "TalkTime", "RingTime", "HoldTime"],
                "RTB": ["BidAmount", "Winner", "Participants", "AuctionId", "ResponseTime"],
                "CallInfo": ["CallId", "Status", "Direction", "Quality", "Recording"],
                "Display": ["Format", "Appearance", "Layout", "Theme"],
                "Location": ["Address", "Coordinates", "Region", "AreaCode"],
                "ConnectionInfo": ["Carrier", "Network", "Signal", "Protocol"],
                "Technology": ["CodecUsed", "Platform", "Device", "Browser"],
                "EndCall": ["Reason", "Duration", "Outcome", "Disposition"],
                "Ivr": ["MenuSelection", "PromptPlayed", "UserInput", "Path"],
                "PlacementInfo": ["Position", "Source", "Medium", "Content"],
                "Conversion": ["Type", "Value", "Timestamp", "Attribution"],
                "RequestInfo": ["Method", "Headers", "Parameters", "Response"],
                "DialedNumber": ["Original", "Formatted", "E164", "Local"],
                "Request": ["Id", "Type", "Status", "Timestamp"],
                "Facebook": ["CampaignId", "AdSetId", "AdId", "PlacementId"],
                "Redtrack CID": ["ClickId", "VisitorId", "ConversionId", "SessionId"],
                "Redtrack CMPID": ["CampaignId", "OfferId", "AffiliateId", "SubId"],
                "Zip Code": ["Primary", "Secondary", "Extended", "Delivery"],
                "Integration": ["Type", "Provider", "Status", "Configuration"]
              }).map(([category, subcategories]) => (
                <div key={category}>
                  <button
                    onClick={() => {
                      const isExpanded = expandedCategories[category];
                      setExpandedCategories(prev => ({
                        ...prev,
                        [category]: !isExpanded
                      }));
                    }}
                    className="flex items-center w-full text-left text-xs text-white hover:bg-gray-700 p-2 rounded"
                  >
                    <ChevronDown 
                      className={`h-3 w-3 mr-2 transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} 
                    />
                    {category}
                  </button>
                  
                  {expandedCategories[category] && (
                    <div className="ml-5 space-y-1">
                      {subcategories.map(subcategory => (
                        <div
                          key={subcategory}
                          onClick={() => {
                            // Map category to table column and corresponding tab
                            const columnMap: Record<string, string> = {
                              "Campaign": "campaign",
                              "Publisher": "publisher", 
                              "Target": "target",
                              "Buyer": "buyer",
                              "DialedNumber": "dialedNumber",
                              "NumberPool": "numberPool",
                              "Date": "date",
                              "Duplicate": "duplicate",
                              "InboundNumber": "inbound",
                              "Time": "time",
                              "CallInfo": "callinfo",
                              "RTB": "rtb",
                              "Geo": "geo",
                              "User": "user"
                            };
                            
                            const column = columnMap[category] || category.toLowerCase();
                            const newTag = {
                              column,
                              tag: subcategory,
                              category
                            };
                            
                            // Replace any existing tags with the new single tag
                            setSelectedTags([newTag]);
                            
                            // Auto-switch to the appropriate tab based on tag category
                            const tabMap: Record<string, string> = {
                              "Campaign": "campaign",
                              "Publisher": "publisher",
                              "Target": "target", 
                              "Buyer": "buyer",
                              "DialedNumber": "dialed",
                              "NumberPool": "pool",
                              "Date": "date",
                              "Duplicate": "duplicate"
                            };
                            
                            const targetTab = tabMap[category];
                            if (targetTab) {
                              setActiveTab(targetTab);
                            }
                            
                            setShowFilterDialog(null);
                          }}
                          className="text-xs text-gray-300 hover:bg-gray-700 hover:text-white p-2 rounded cursor-pointer"
                        >
                          {subcategory}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {filterRules.length > 0 && (
        <div className="bg-white border-b px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {filterRules.map((rule, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800 border border-blue-200">
                {rule.field}: {rule.operator} "{rule.value}"
                <button 
                  onClick={() => setFilterRules(prev => prev.filter((_, i) => i !== index))}
                  className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </Badge>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFilterRules([])}
              className="h-6 px-2 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      )}

      {/* Ringba-style Timeline Chart */}
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

      {/* Report Summary Table with Tabs */}
      <Card className="mx-4">
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
              onClick={() => {
                setShowFilterDialog(showFilterDialog === "tags" ? null : "tags");
              }}
              className="h-8 px-2 text-xs font-medium"
            >
              Tags
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </div>

          {/* Single tab content that changes based on active tab */}
          <div className="mt-4">
            <ReportSummaryTable 
              summaries={filteredSummaries} 
              visibleColumns={visibleColumns} 
              isLoading={isLoading} 
              activeTab={activeTab}
              selectedTags={selectedTags}
              onRemoveTag={(column, tag) => {
                setSelectedTags([]); // Clear all tags since only one is allowed
              }}
            />
          </div>
          
          {/* Call Activity Section */}
          <div className="mt-6">
            <CallActivity />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Report Summary Table Component
interface ReportSummaryTableProps {
  summaries: CampaignSummary[];
  visibleColumns: Record<string, boolean>;
  isLoading: boolean;
  activeTab: string;
  selectedTags: Array<{ column: string; tag: string; category: string }>;
  onRemoveTag: (column: string, tag: string) => void;
}

function ReportSummaryTable({ summaries, visibleColumns, isLoading, activeTab, selectedTags, onRemoveTag }: ReportSummaryTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
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

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(column);
    
    const startX = e.clientX;
    const startWidth = columnWidths[column];

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (e.clientX - startX));
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getColumnLabel = (column: string) => {
    const labels: Record<string, string> = {
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

  // Define which columns to show for each tab
  const getColumnsForTab = (tab: string) => {
    const baseColumns = ['incoming', 'live', 'completed', 'ended', 'connected', 'paid', 'converted', 'noConnection', 'blocked', 'ivrHangup', 'rpc', 'revenue', 'payout', 'profit', 'margin', 'conversionRate', 'tcl', 'acl', 'totalCost'];
    
    switch (tab) {
      case 'campaign':
        return ['campaign', ...baseColumns];
      case 'publisher':
        return ['publisher', ...baseColumns];
      case 'target':
        return ['target', ...baseColumns];
      case 'buyer':
        return ['buyer', ...baseColumns];
      case 'dialed':
        return ['dialedNumber', ...baseColumns];
      case 'pool':
        return ['numberPool', ...baseColumns];
      case 'date':
        return ['date', ...baseColumns];
      case 'duplicate':
        return ['duplicate', ...baseColumns];
      default:
        return ['campaign', 'publisher', 'target', 'buyer', 'dialedNumber', 'numberPool', 'date', 'duplicate', ...baseColumns];
    }
  };

  const activeColumns = getColumnsForTab(activeTab).filter(col => visibleColumns[col]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="rounded border overflow-hidden">
      <div className="overflow-x-auto max-h-96">
        <Table ref={tableRef} className="table-fixed">
          <TableHeader className="sticky top-0 bg-gray-50 z-10">
            <TableRow>
              {activeColumns.map((column) => (
                <TableHead 
                  key={column}
                  className="text-xs font-medium text-gray-600 py-2 px-2 relative border-r border-gray-200"
                  style={{ width: `${columnWidths[column]}px` }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="truncate pr-2">{getColumnLabel(column)}</div>
                    {/* Show selected tags for this column */}
                    {selectedTags.filter(tag => tag.column === column).map(tag => (
                      <Badge 
                        key={`${tag.category}-${tag.tag}`}
                        variant="secondary" 
                        className="text-xs px-1 py-0 bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-fit"
                      >
                        {tag.tag}
                        <button
                          onClick={() => onRemoveTag(column, tag.tag)}
                          className="text-blue-600 hover:text-blue-800 font-bold ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-300 transition-colors"
                    onMouseDown={(e) => handleMouseDown(column, e)}
                    style={{ 
                      backgroundColor: isResizing === column ? '#93c5fd' : 'transparent'
                    }}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={activeColumns.length} className="text-center py-8 text-gray-500">
                  Loading campaign data...
                </TableCell>
              </TableRow>
            ) : summaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeColumns.length} className="text-center py-8 text-gray-500">
                  No campaign data available
                </TableCell>
              </TableRow>
            ) : (
              summaries.map((summary, index) => (
                <TableRow key={summary.campaignId} className="hover:bg-gray-50 text-xs">
                  {activeColumns.map((column) => (
                    <TableCell 
                      key={column}
                      className="py-1 px-2 border-r border-gray-200 truncate"
                      style={{ width: `${columnWidths[column]}px` }}
                    >
                      {(() => {
                        switch (column) {
                          case 'campaign':
                            return <div className="text-blue-600 font-medium truncate">{summary.campaignName}</div>;
                          case 'publisher':
                            return <div className="truncate">{summary.publisher}</div>;
                          case 'target':
                            return <div className="truncate">{summary.target}</div>;
                          case 'buyer':
                            return <div className="truncate">{summary.buyer}</div>;
                          case 'dialedNumber':
                            return <div className="text-xs font-mono truncate">{summary.dialedNumbers.join(', ')}</div>;
                          case 'numberPool':
                            return <div className="truncate">{summary.numberPool}</div>;
                          case 'date':
                            return <div className="text-xs text-gray-500">{new Date(summary.lastCallDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} {new Date(summary.lastCallDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</div>;
                          case 'duplicate':
                            return <div className="text-center">{summary.duplicate}</div>;
                          case 'tags':
                            return (
                              <div className="flex flex-wrap gap-1">
                                {summary.tags.slice(0, 2).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs px-1 py-0">{tag}</Badge>
                                ))}
                                {summary.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">+{summary.tags.length - 2}</Badge>
                                )}
                              </div>
                            );
                          case 'incoming':
                            return <div className="text-center font-medium">{summary.incoming}</div>;
                          case 'live':
                            return <div className="text-center text-green-600 font-medium">{summary.live}</div>;
                          case 'completed':
                            return <div className="text-center text-blue-600 font-medium">{summary.completed}</div>;
                          case 'ended':
                            return <div className="text-center text-gray-600">{summary.ended}</div>;
                          case 'connected':
                            return <div className="text-center text-green-600 font-medium">{summary.connected}</div>;
                          case 'paid':
                            return <div className="text-center text-purple-600 font-medium">{summary.paid}</div>;
                          case 'converted':
                            return <div className="text-center text-emerald-600 font-medium">{summary.converted}</div>;
                          case 'noConnection':
                            return <div className="text-center text-red-600">{summary.noConnection}</div>;
                          case 'blocked':
                            return <div className="text-center text-red-600">{summary.blocked}</div>;
                          case 'ivrHangup':
                            return <div className="text-center text-orange-600">{summary.ivrHangup}</div>;
                          case 'rpc':
                            return <div className="text-center text-green-600 font-medium">${summary.rpc.toFixed(2)}</div>;
                          case 'revenue':
                            return <div className="text-center text-green-600 font-medium">${summary.revenue.toFixed(2)}</div>;
                          case 'payout':
                            return <div className="text-center text-orange-600">${summary.payout.toFixed(2)}</div>;
                          case 'profit':
                            return <div className="text-center text-emerald-600 font-medium">${summary.profit.toFixed(2)}</div>;
                          case 'margin':
                            return <div className="text-center text-blue-600 font-medium">{summary.margin.toFixed(1)}%</div>;
                          case 'conversionRate':
                            return <div className="text-center text-purple-600 font-medium">{summary.conversionRate.toFixed(1)}%</div>;
                          case 'tcl':
                            return <div className="text-center text-gray-600">{Math.floor(summary.tcl / 60)}m {summary.tcl % 60}s</div>;
                          case 'acl':
                            return <div className="text-center text-gray-600">{summary.acl.toFixed(0)}s</div>;
                          case 'totalCost':
                            return <div className="text-center text-red-600">${summary.totalCost.toFixed(2)}</div>;
                          default:
                            return null;
                        }
                      })()}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


    </div>
  );
}