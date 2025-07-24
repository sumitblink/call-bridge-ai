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
    refetchInterval: autoRefresh ? 120000 : false, // 2 minutes instead of 30 seconds
  });

  // No mock data - use real call data only

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

  // Process calls into campaign summaries
  const rawCampaignSummaries: CampaignSummary[] = calls.length > 0 ? calls.reduce((acc, call) => {
    const campaignId = call.campaignId || 'unknown';
    let summary = acc.find(s => s.campaignId === campaignId);
    
    if (!summary) {
      summary = {
        campaignId,
        campaignName: call.campaign?.name || 'Unknown Campaign',
        publisher: call.utmSource || '-',
        target: 'Live',
        buyer: call.buyer?.name || 'Unknown Buyer',
        dialedNumbers: [call.toNumber || ''],
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
    
    if (call.status === 'in-progress') summary.live += 1;
    if (call.status === 'completed') {
      summary.completed += 1;
      summary.connected += 1;
      summary.converted += 1;
    }
    if (call.status === 'failed' || call.status === 'busy' || call.status === 'no-answer') {
      summary.ended += 1;
      summary.noConnection += 1;
    }
    
    // Financial calculations
    const revenue = parseFloat(call.revenue?.toString() || '0');
    const cost = parseFloat(call.cost?.toString() || '0');
    const profit = revenue - cost;
    
    summary.revenue += revenue;
    summary.totalCost += cost;
    summary.payout += revenue; // Use revenue as payout for now
    summary.profit += profit;
    summary.tcl += call.duration || 0;
    
    // Track dialed numbers
    if (call.toNumber && !summary.dialedNumbers.includes(call.toNumber)) {
      summary.dialedNumbers.push(call.toNumber);
    }
    
    // Update last call date if newer
    if (new Date(call.createdAt) > new Date(summary.lastCallDate)) {
      summary.lastCallDate = call.createdAt;
    }

    return acc;
  }, [] as CampaignSummary[]) : [];

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