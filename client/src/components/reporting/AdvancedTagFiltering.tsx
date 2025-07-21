import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Filter, 
  Search, 
  Tags, 
  ChevronDown, 
  ChevronRight, 
  X,
  Calendar,
  Globe,
  Smartphone,
  Clock,
  Star,
  Target,
  User,
  MousePointer
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TagFilterProps {
  onFiltersChange: (filters: TagFilters) => void;
  activeFilters: TagFilters;
}

export interface TagFilters {
  dateRange?: string;
  campaigns?: string[];
  publishers?: string[];
  targets?: string[];
  buyers?: string[];
  dialedNumbers?: string[];
  sources?: string[];
  mediums?: string[];
  deviceTypes?: string[];
  geoLocations?: string[];
  sub1?: string[];
  sub2?: string[];
  sub3?: string[];
  sub4?: string[];
  sub5?: string[];
  keywords?: string[];
  adGroups?: string[];
  clickIds?: string[];
  conversionStatus?: string;
  qualityScore?: string;
  searchTerm?: string;
}

interface TagGroup {
  id: string;
  label: string;
  icon: any;
  expanded: boolean;
  items: TagItem[];
}

interface TagItem {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export default function AdvancedTagFiltering({ onFiltersChange, activeFilters }: TagFilterProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    campaign: true,
    attribution: false,
    geography: false,
    device: false,
    quality: false,
    custom: false
  });
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [localFilters, setLocalFilters] = useState<TagFilters>(activeFilters);

  // Fetch tag statistics from API
  const { data: tagStats = {} } = useQuery({
    queryKey: ["/api/reporting/tag-stats"],
  });

  // Create hierarchical tag groups based on RedTrack structure
  const tagGroups: TagGroup[] = [
    {
      id: "campaign",
      label: "Campaign & Routing",
      icon: Target,
      expanded: expandedGroups.campaign,
      items: [
        { value: "campaign", label: "Campaign", count: tagStats.campaigns?.length || 0, selected: false },
        { value: "publisher", label: "Publisher", count: tagStats.publishers?.length || 0, selected: false },
        { value: "target", label: "Target", count: tagStats.targets?.length || 0, selected: false },
        { value: "buyer", label: "Buyer", count: tagStats.buyers?.length || 0, selected: false },
        { value: "dialedNumber", label: "Dialed Number", count: tagStats.dialedNumbers?.length || 0, selected: false },
      ]
    },
    {
      id: "attribution",
      label: "Attribution & Tracking",
      icon: MousePointer,
      expanded: expandedGroups.attribution,
      items: [
        { value: "utmSource", label: "UTM Source", count: tagStats.sources?.length || 0, selected: false },
        { value: "utmMedium", label: "UTM Medium", count: tagStats.mediums?.length || 0, selected: false },
        { value: "keyword", label: "Keyword", count: tagStats.keywords?.length || 0, selected: false },
        { value: "adGroup", label: "Ad Group", count: tagStats.adGroups?.length || 0, selected: false },
        { value: "clickId", label: "Click ID", count: tagStats.clickIds?.length || 0, selected: false },
        { value: "referrer", label: "Referrer", count: tagStats.referrers?.length || 0, selected: false },
      ]
    },
    {
      id: "geography",
      label: "Geography & Location",
      icon: Globe,
      expanded: expandedGroups.geography,
      items: [
        { value: "country", label: "Country", count: tagStats.countries?.length || 0, selected: false },
        { value: "state", label: "State", count: tagStats.states?.length || 0, selected: false },
        { value: "city", label: "City", count: tagStats.cities?.length || 0, selected: false },
        { value: "zipCode", label: "ZIP Code", count: tagStats.zipCodes?.length || 0, selected: false },
      ]
    },
    {
      id: "device",
      label: "Device & Technical",
      icon: Smartphone,
      expanded: expandedGroups.device,
      items: [
        { value: "deviceType", label: "Device Type", count: tagStats.deviceTypes?.length || 0, selected: false },
        { value: "userAgent", label: "Browser", count: tagStats.browsers?.length || 0, selected: false },
        { value: "ipAddress", label: "IP Range", count: tagStats.ipRanges?.length || 0, selected: false },
      ]
    },
    {
      id: "quality",
      label: "Quality & Performance",
      icon: Star,
      expanded: expandedGroups.quality,
      items: [
        { value: "callQuality", label: "Call Quality", count: 4, selected: false },
        { value: "duration", label: "Duration Range", count: 5, selected: false },
        { value: "disposition", label: "Call Disposition", count: tagStats.dispositions?.length || 0, selected: false },
        { value: "conversionStatus", label: "Conversion Status", count: 2, selected: false },
      ]
    },
    {
      id: "custom",
      label: "Custom Sub-Tags",
      icon: Tags,
      expanded: expandedGroups.custom,
      items: [
        { value: "sub1", label: "Sub1 (Product/Service)", count: tagStats.sub1?.length || 0, selected: false },
        { value: "sub2", label: "Sub2 (Region)", count: tagStats.sub2?.length || 0, selected: false },
        { value: "sub3", label: "Sub3 (Device)", count: tagStats.sub3?.length || 0, selected: false },
        { value: "sub4", label: "Sub4 (Time)", count: tagStats.sub4?.length || 0, selected: false },
        { value: "sub5", label: "Sub5 (Quality)", count: tagStats.sub5?.length || 0, selected: false },
      ]
    }
  ];

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const updateFilter = (filterKey: keyof TagFilters, value: any) => {
    const updatedFilters = { ...localFilters, [filterKey]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const addTagFilter = (tagType: string, value: string) => {
    const currentValues = localFilters[tagType as keyof TagFilters] as string[] || [];
    if (!currentValues.includes(value)) {
      updateFilter(tagType as keyof TagFilters, [...currentValues, value]);
    }
  };

  const removeTagFilter = (tagType: string, value: string) => {
    const currentValues = localFilters[tagType as keyof TagFilters] as string[] || [];
    updateFilter(tagType as keyof TagFilters, currentValues.filter(v => v !== value));
  };

  const clearAllFilters = () => {
    const clearedFilters: TagFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).reduce((count, filter) => {
      if (Array.isArray(filter)) {
        return count + filter.length;
      }
      return filter ? count + 1 : count;
    }, 0);
  };

  const renderFilterSection = (group: TagGroup) => {
    const Icon = group.icon;
    
    return (
      <div key={group.id} className="border rounded-lg">
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleGroup(group.id)}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{group.label}</span>
            <Badge variant="secondary" className="text-xs">
              {group.items.reduce((sum, item) => sum + item.count, 0)}
            </Badge>
          </div>
          {group.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        
        {group.expanded && (
          <div className="border-t p-3 space-y-2">
            {group.items.map((item) => (
              <div key={item.value} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <Badge variant="outline" className="text-xs">
                    {item.count}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder={`Search ${item.label.toLowerCase()}...`}
                    value={searchTerms[item.value] || ""}
                    onChange={(e) => setSearchTerms(prev => ({ ...prev, [item.value]: e.target.value }))}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    onClick={() => {
                      const term = searchTerms[item.value];
                      if (term?.trim()) {
                        addTagFilter(item.value, term.trim());
                        setSearchTerms(prev => ({ ...prev, [item.value]: "" }));
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="h-8"
                  >
                    Add
                  </Button>
                </div>
                
                {/* Display selected filters for this tag type */}
                {localFilters[item.value as keyof TagFilters] && Array.isArray(localFilters[item.value as keyof TagFilters]) && (
                  <div className="flex flex-wrap gap-1">
                    {(localFilters[item.value as keyof TagFilters] as string[]).map((filterValue, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {filterValue}
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => removeTagFilter(item.value, filterValue)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Tag Filtering
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {getActiveFilterCount()} active filters
            </Badge>
            {getActiveFilterCount() > 0 && (
              <Button onClick={clearAllFilters} variant="outline" size="sm">
                Clear All
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Quick Date Range Filter */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Time Range</Label>
          <Select
            value={localFilters.dateRange || "today"}
            onValueChange={(value) => updateFilter("dateRange", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-6" />

        {/* Global Search */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Global Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search across all tags and values..."
              value={localFilters.searchTerm || ""}
              onChange={(e) => updateFilter("searchTerm", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Hierarchical Tag Filters */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {tagGroups.map(renderFilterSection)}
          </div>
        </ScrollArea>

        {/* Quick Filter Presets */}
        <div className="mt-6 pt-6 border-t">
          <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                updateFilter("conversionStatus", "converted");
                updateFilter("callQuality", ["excellent", "good"]);
              }}
            >
              High Quality Conversions
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                updateFilter("deviceType", ["mobile"]);
                updateFilter("utmSource", ["google", "facebook"]);
              }}
            >
              Mobile Traffic
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                updateFilter("dateRange", "today");
                updateFilter("disposition", ["connected"]);
              }}
            >
              Today's Connected Calls
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}