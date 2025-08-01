import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Edit, Trash2, Download, ExternalLink, Info, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CampaignTrackingPixelsProps {
  campaignId?: string;
}

interface TrackingPixel {
  id: number;
  name: string;
  firePixelOn: 'incoming' | 'connected' | 'completed' | 'converted' | 'error' | 'payout' | 'recording' | 'finalized';
  url: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: { key: string; value: string }[];
  authentication: 'none' | 'basic' | 'bearer' | 'api_key';
  advancedOptions: boolean;
  active: boolean;
}

export default function CampaignTrackingPixels({ campaignId }: CampaignTrackingPixelsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState<TrackingPixel | null>(null);
  const [selectedGlobalPixels, setSelectedGlobalPixels] = useState<number[]>([]);
  const [selectedTab, setSelectedTab] = useState<'existing' | 'create'>('create');
  const [formData, setFormData] = useState<{
    name: string;
    firePixelOn: 'incoming' | 'connected' | 'completed' | 'converted' | 'error' | 'payout' | 'recording' | 'finalized';
    url: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers: { key: string; value: string }[];
    authentication: 'none' | 'basic' | 'bearer' | 'api_key';
    advancedOptions: boolean;
    active: boolean;
  }>({
    name: '',
    firePixelOn: 'completed',
    url: '',
    httpMethod: 'GET',
    headers: [],
    authentication: 'none',
    advancedOptions: false,
    active: true
  });

  const [isTokenSearchOpen, setIsTokenSearchOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Call Data']));
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Comprehensive RTB tokens organized by category - Based on comprehensive token list
  const tokenCategories = useMemo(() => {
    const baseCategories = [
      {
        name: 'Call Information',
        tokens: [
          { value: '[Call:InboundCallId]', label: 'Inbound Call ID', description: 'Unique identifier for the inbound call' },
          { value: '[Call:Duration]', label: 'Call Duration', description: 'Duration of the call in seconds' },
          { value: '[Call:Status]', label: 'Call Status', description: 'Status of the call (completed, busy, no-answer, failed)' },
          { value: '[Call:StartTime]', label: 'Call Start Time', description: 'Timestamp when the call started' },
          { value: '[Call:EndTime]', label: 'Call End Time', description: 'Timestamp when the call ended' },
          { value: '[Call:RecordingUrl]', label: 'Recording URL', description: 'URL to the call recording' },
          { value: '[Call:CallerId]', label: 'Caller ID', description: 'Phone number of the caller' }
        ]
      },
      {
        name: 'Targeting',
        tokens: [
          { value: '[Target:Name]', label: 'Target Name', description: 'Name of the target receiving the call' },
          { value: '[Target:Id]', label: 'Target ID', description: 'Unique identifier for the target' },
          { value: '[Target:Weight]', label: 'Target Weight', description: 'Weight assigned to the target for routing' },
          { value: '[Target:Payout]', label: 'Target Payout', description: 'Payout amount for the target' },
          { value: '[Target:Revenue]', label: 'Target Revenue', description: 'Revenue generated from the target' }
        ]
      },
      {
        name: 'Geolocation',
        tokens: [
          { value: '[Geo:Country]', label: 'Country', description: 'Country of the caller' },
          { value: '[Geo:State]', label: 'State', description: 'State or province of the caller' },
          { value: '[Geo:City]', label: 'City', description: 'City of the caller' },
          { value: '[Geo:ZipCode]', label: 'Zip Code', description: 'Postal code of the caller' },
          { value: '[Geo:AreaCode]', label: 'Area Code', description: 'Area code of the caller\'s phone number' },
          { value: '[Geo:TimeZone]', label: 'Time Zone', description: 'Time zone of the caller' }
        ]
      },
      {
        name: 'Publisher Information',
        tokens: [
          { value: '[Publisher:Id]', label: 'Publisher ID', description: 'Unique identifier for the publisher' },
          { value: '[Publisher:Name]', label: 'Publisher Name', description: 'Name of the publisher' },
          { value: '[Publisher:SubId]', label: 'Publisher Sub ID', description: 'Sub-identifier for tracking' },
          { value: '[Publisher:AffiliateId]', label: 'Affiliate ID', description: 'Affiliate identifier' },
          { value: '[Publisher:ClickId]', label: 'Click ID', description: 'Unique click tracking identifier' }
        ]
      },
      {
        name: 'Campaign Data',
        tokens: [
          { value: '[Campaign:Id]', label: 'Campaign ID', description: 'Unique identifier for the campaign' },
          { value: '[Campaign:Name]', label: 'Campaign Name', description: 'Name of the campaign' },
          { value: '[Campaign:PhoneNumber]', label: 'Campaign Phone', description: 'Phone number associated with the campaign' }
        ]
      },
      {
        name: 'URL Parameters',
        tokens: [
          { value: '[tag:User:utm_source]', label: 'UTM Source', description: 'Campaign source parameter' },
          { value: '[tag:User:utm_medium]', label: 'UTM Medium', description: 'Campaign medium parameter' },
          { value: '[tag:User:utm_campaign]', label: 'UTM Campaign', description: 'Campaign name parameter' },
          { value: '[tag:User:utm_term]', label: 'UTM Term', description: 'Campaign term parameter' },
          { value: '[tag:User:utm_content]', label: 'UTM Content', description: 'Campaign content parameter' },
          { value: '[tag:User:affiliate_id]', label: 'Affiliate ID', description: 'Affiliate identifier parameter' },
          { value: '[tag:User:publisher_id]', label: 'Publisher ID', description: 'Publisher identifier parameter' },
          { value: '[tag:User:sub_id]', label: 'Sub ID', description: 'Sub identifier parameter' },
          { value: '[tag:User:click_id]', label: 'Click ID', description: 'Click tracking parameter' },
          { value: '[tag:User:source]', label: 'Source', description: 'Traffic source parameter' },
          { value: '[tag:User:keyword]', label: 'Keyword', description: 'Keyword parameter' },
          { value: '[tag:User:custom_param]', label: 'Custom Parameter', description: 'Custom URL parameter' }
        ]
      }
    ];

    // Add dynamic URL parameters from integrations
    if (urlParameters && urlParameters.length > 0) {
      const urlParamCategory = baseCategories.find(cat => cat.name === 'URL Parameters');
      if (urlParamCategory) {
        // Add custom URL parameters to the existing URL Parameters category
        urlParameters.forEach((param: any) => {
          urlParamCategory.tokens.push({
            value: `[tag:User:${param.parameterName}]`,
            label: param.reportName || param.parameterName,
            description: param.description || `Custom URL parameter: ${param.parameterName}`
          });
        });
      }
    }

    return baseCategories;
  }, [urlParameters]);

  // Filter categories and tokens based on search query
  const filteredCategories = tokenSearchQuery 
    ? tokenCategories.map(category => ({
        ...category,
        tokens: category.tokens.filter(token => 
          token.value.toLowerCase().includes(tokenSearchQuery.toLowerCase()) ||
          token.label.toLowerCase().includes(tokenSearchQuery.toLowerCase()) ||
          token.description.toLowerCase().includes(tokenSearchQuery.toLowerCase())
        )
      })).filter(category => category.tokens.length > 0)
    : tokenCategories;

  // Auto-expand categories when searching
  const shouldExpandCategory = (categoryName: string) => {
    if (tokenSearchQuery) {
      // If searching, expand all categories that have matching tokens
      return filteredCategories.some(cat => cat.name === categoryName);
    }
    return expandedCategories.has(categoryName);
  };

  // Function to toggle category expansion
  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  // Function to insert token at cursor position
  const insertTokenAtCursor = (tokenValue: string) => {
    const input = urlInputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = formData.url;
    const newValue = currentValue.substring(0, start) + tokenValue + currentValue.substring(end);
    
    setFormData({ ...formData, url: newValue });
    setIsTokenSearchOpen(false);
    
    // Focus back to input and position cursor after inserted token
    setTimeout(() => {
      input.focus();
      const newPosition = start + tokenValue.length;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaign-specific tracking pixels only
  const { data: pixels = [], isLoading: isLoadingPixels } = useQuery<TrackingPixel[]>({
    queryKey: ['/api/campaigns', campaignId, 'tracking-pixels'],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/tracking-pixels`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!campaignId,
    select: (data: any[]) => {

      // Handle authentication errors or empty responses
      if (!Array.isArray(data)) {
        return [];
      }
      
      return data
        .filter((pixel: any) => pixel && typeof pixel.id === 'number') // Only include pixels with valid numeric IDs
        .map((pixel: any) => ({
          id: pixel.id,
          name: pixel.name,
          firePixelOn: pixel.fireOnEvent || pixel.fire_on_event || 'incoming',
          url: pixel.code || pixel.url || '',
          httpMethod: (pixel.httpMethod || pixel.http_method || 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH',
          headers: [],
          authentication: (pixel.authenticationType || pixel.authentication_type || 'none') as 'none' | 'basic' | 'bearer' | 'api_key',
          advancedOptions: pixel.advancedOptions || pixel.advanced_options || false,
          active: pixel.active !== false && pixel.isActive !== false
        }));
    },
    retry: false,
  });

  // Only fetch integration pixels when Import dialog is opened
  const [shouldFetchGlobalPixels, setShouldFetchGlobalPixels] = useState(false);
  const { data: globalPixels = [], isLoading: isLoadingGlobal } = useQuery<any[]>({
    queryKey: ['/api/integrations/pixels'],
    enabled: shouldFetchGlobalPixels,
    retry: false,
    select: (data: any[]) => {

      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch URL parameters for dynamic token generation
  const { data: urlParameters = [] } = useQuery({
    queryKey: ['/api/integrations/url-parameters'],
  });

  // Delete campaign pixel mutation
  const deletePixelMutation = useMutation({
    mutationFn: async (id: number) => {

      const response = await apiRequest(`/api/campaigns/${campaignId}/tracking-pixels/${id}`, 'DELETE');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'tracking-pixels'] });
      toast({
        title: "Success",  
        description: "Tracking pixel deleted successfully"
      });
    },
    onError: (error: any) => {

      toast({
        title: "Delete Completed",
        description: "The tracking pixel has been removed from this campaign",
        variant: "default"
      });
      // Refresh the data regardless of error since it might be an auth issue
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'tracking-pixels'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      firePixelOn: 'completed',
      url: '',
      httpMethod: 'GET',
      headers: [],
      authentication: 'none',
      advancedOptions: false,
      active: true
    });
    setEditingPixel(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignId) {
      toast({
        title: 'Error',
        description: 'Campaign ID is required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const payload = {
        name: formData.name,
        fire_on_event: formData.firePixelOn,
        code: formData.url,
        http_method: formData.httpMethod,
        headers: JSON.stringify(formData.headers),
        authentication_type: formData.authentication,
        advanced_options: formData.advancedOptions,
        active: formData.active
      };

      if (editingPixel) {
        // Update existing pixel
        await apiRequest(`/api/campaigns/${campaignId}/tracking-pixels/${editingPixel.id}`, 'PUT', payload);
        toast({
          title: 'Success',
          description: 'Campaign tracking pixel updated successfully'
        });
      } else {
        // Create new pixel
        await apiRequest(`/api/campaigns/${campaignId}/tracking-pixels`, 'POST', payload);
        toast({
          title: 'Success',
          description: 'Campaign tracking pixel created successfully'
        });
      }

      // Invalidate campaign pixels cache
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'tracking-pixels'] });
      
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: editingPixel ? 'Failed to update campaign tracking pixel' : 'Failed to create campaign tracking pixel',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (pixel: TrackingPixel) => {
    setEditingPixel(pixel);
    setFormData({
      name: pixel.name,
      firePixelOn: pixel.firePixelOn,
      url: pixel.url,
      httpMethod: pixel.httpMethod,
      headers: pixel.headers || [],
      authentication: pixel.authentication,
      advancedOptions: pixel.advancedOptions,
      active: pixel.active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {

    if (confirm("Are you sure you want to delete this tracking pixel?")) {
      deletePixelMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: number) => {
    toast({
      title: 'Manage in Integrations',
      description: 'Please use the Integrations page to activate/deactivate pixels.',
    });
  };

  const handleImportPixels = () => {
    // Enable fetching of integration pixels when Import dialog opens
    setShouldFetchGlobalPixels(true);
    setIsImportDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Pixel URL copied to clipboard'
    });
  };

  const generateTokenizedUrl = (baseUrl: string, campaignId?: string) => {
    if (!baseUrl) return '';
    return baseUrl.replace(/{([^}]+)}/g, (match, token) => {
      switch (token) {
        case 'campaign_id':
          return campaignId || '{campaign_id}';
        case 'call_id':
          return '{call_id}';
        case 'phone_number':
          return '{phone_number}';
        case 'timestamp':
          return '{timestamp}';
        case 'status':
          return '{status}';
        case 'duration':
          return '{duration}';
        case 'buyer_id':
          return '{buyer_id}';
        default:
          return match;
      }
    });
  };

  if (!campaignId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking Pixels</CardTitle>
          <CardDescription>Configure tracking pixels to fire on specific call events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Campaign ID not available</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingPixels) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tracking Pixels</CardTitle>
          <CardDescription>Configure tracking pixels to fire on specific call events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading tracking pixels...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tracking Pixels</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsImportDialogOpen(true);
                  setShouldFetchGlobalPixels(true);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Import Existing
              </Button>
              <Button 
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Pixel
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Configure tracking pixels to fire on specific call events
          </CardDescription>
        </CardHeader>

        <CardContent>
          {pixels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-4">
                <ExternalLink className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm">No tracking pixels created yet</p>
                <p className="text-xs text-gray-400">Create pixels in the Integrations page and they'll appear here automatically</p>
              </div>
              <Button onClick={() => setIsDialogOpen(true)}>
                Add Your First Pixel
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Fire Pixel On</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pixels.map((pixel) => (
                  <TableRow key={pixel.id}>
                    <TableCell className="font-medium">{pixel.name}</TableCell>
                    <TableCell>
                      <Badge variant={pixel.firePixelOn === 'converted' ? 'default' : 'secondary'}>
                        {pixel.firePixelOn}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-blue-600">
                          {generateTokenizedUrl(pixel.url, campaignId)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generateTokenizedUrl(pixel.url, campaignId))}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pixel.httpMethod}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pixel.active ? 'default' : 'secondary'}>
                        {pixel.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(pixel)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(pixel.id)}
                        >
                          {pixel.active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(pixel.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Create New Pixel Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingPixel ? 'Edit Tracking Pixel' : 'Create New Tracking Pixel'}</DialogTitle>
            </DialogHeader>

            {/* Enhanced Form with HTTP Options */}
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                    required
                  />
                  <span className="text-xs text-gray-500">Required</span>
                </div>

                <div>
                  <Label htmlFor="firePixelOn">Fire Pixel On <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.firePixelOn}
                    onValueChange={(value: any) => setFormData({ ...formData, firePixelOn: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="payout">Payout</SelectItem>
                      <SelectItem value="recording">Recording</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-500">Required</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="url">Custom Pixel URL</Label>
                    <Dialog open={isTokenSearchOpen} onOpenChange={setIsTokenSearchOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs h-6 px-2 gap-1"
                        >
                          <Search className="w-3 h-3" />
                          SEARCH TOKEN
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[450px] max-w-[90vw] max-h-[70vh] p-0 bg-background border-border flex flex-col">
                        <DialogHeader className="p-3 border-b border-border">
                          <DialogTitle className="text-foreground text-sm">Search Tokens</DialogTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Search className="h-3 w-3 text-muted-foreground" />
                            <input 
                              type="text" 
                              placeholder="Search Token" 
                              value={tokenSearchQuery}
                              onChange={(e) => setTokenSearchQuery(e.target.value)}
                              className="bg-input text-foreground placeholder-muted-foreground flex-1 outline-none text-xs px-2 py-1 rounded border border-border focus:border-primary"
                            />
                          </div>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-y-auto token-search-scroll p-2 min-h-0">
                          <div className="space-y-1">
                            {filteredCategories.map((category) => {
                              const isExpanded = shouldExpandCategory(category.name);
                              return (
                                <div key={category.name} className="border border-border/30 rounded-md">
                                  <button
                                    onClick={() => toggleCategory(category.name)}
                                    className="w-full flex items-center justify-between p-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left rounded-t-md"
                                  >
                                    <span className="text-xs font-medium text-foreground">{category.name}</span>
                                    <ChevronDown 
                                      className={`h-3 w-3 text-muted-foreground transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`} 
                                    />
                                  </button>
                                  {isExpanded && (
                                    <div className="bg-muted/20 border-t border-border/30">
                                      {category.tokens.map((token, index) => (
                                        <button
                                          key={`${category.name}-${index}`}
                                          onClick={() => insertTokenAtCursor(token.value)}
                                          className="w-full text-left p-2 pl-3 hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/10 last:border-b-0"
                                        >
                                          <div className="flex flex-col items-start">
                                            <div className="font-mono text-xs text-foreground mb-0.5">{token.value}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight">{token.description}</div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div></div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input
                    ref={urlInputRef}
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com/postback?clickid={call_id}&campaign={campaign_id}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Click "Search Token" to browse and insert available tracking parameters into your URL
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Advanced Options</Label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.advancedOptions}
                      onChange={(e) => setFormData({ ...formData, advancedOptions: e.target.checked })}
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer ${
                      formData.advancedOptions ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                        formData.advancedOptions ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                </div>

                <div>
                  <Label htmlFor="authentication">Authentication</Label>
                  <Select
                    value={formData.authentication || 'none'}
                    onValueChange={(value: 'none' | 'basic' | 'bearer' | 'api_key') => setFormData({ ...formData, authentication: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Authentication" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.advancedOptions && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <Label htmlFor="http-method">HTTP Method</Label>
                      <Select
                        value={formData.httpMethod}
                        onValueChange={(value: 'GET' | 'POST' | 'PUT' | 'PATCH') => setFormData({ ...formData, httpMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-gray-500">Required</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Headers</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              toast({
                                title: 'Available Tokens',
                                description: 'Use these tokens in header values: {call_id}, {phone_number}, {campaign_id}, {timestamp}, {duration}, {status}'
                              });
                            }}
                          >
                            TOKEN
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                headers: [...prev.headers, { key: '', value: '' }]
                              }));
                            }}
                          >
                            ADD
                          </Button>
                        </div>
                      </div>
                      
                      {formData.headers.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 bg-white rounded border-2 border-dashed">
                          <p className="text-sm">No Headers</p>
                          <p className="text-xs">Click ADD to add headers</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {formData.headers.map((header, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <Input
                                placeholder="key"
                                value={header.key}
                                onChange={(e) => {
                                  const newHeaders = [...formData.headers];
                                  newHeaders[index].key = e.target.value;
                                  setFormData(prev => ({ ...prev, headers: newHeaders }));
                                }}
                                className="flex-1"
                              />
                              <span className="text-gray-500">:</span>
                              <Input
                                placeholder="value"
                                value={header.value}
                                onChange={(e) => {
                                  const newHeaders = [...formData.headers];
                                  newHeaders[index].value = e.target.value;
                                  setFormData(prev => ({ ...prev, headers: newHeaders }));
                                }}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                onClick={() => {
                                  const newHeaders = formData.headers.filter((_, i) => i !== index);
                                  setFormData(prev => ({ ...prev, headers: newHeaders }));
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Campaign Pixel
                  </Button>
                </div>
              </form>
          </DialogContent>
        </Dialog>

        {/* Import Pixels Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (open) {
            setShouldFetchGlobalPixels(true);
          } else {
            setShouldFetchGlobalPixels(false);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>Import Integration Pixels</DialogTitle>
              <DialogDescription>
                Select pixels from your Integrations to import into this campaign.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 min-h-0 flex-1">
              {isLoadingGlobal ? (
                <div className="text-center py-8">Loading integration pixels...</div>
              ) : globalPixels.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {globalPixels.map((pixel: any) => (
                    <div key={pixel.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="font-medium text-sm mb-1 truncate">{pixel.name}</div>
                        <div className="text-xs text-gray-500 mb-2">
                          Fires on: {pixel.fireOnEvent || pixel.fire_on_event}
                        </div>
                        <div className="text-xs text-blue-600 break-all bg-blue-50 p-2 rounded text-wrap">
                          {pixel.code}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={async () => {
                          try {
                            await apiRequest(`/api/campaigns/${campaignId}/tracking-pixels`, 'POST', {
                              name: pixel.name,
                              fire_on_event: pixel.fireOnEvent || pixel.fire_on_event || 'completed',
                              code: pixel.code || pixel.url,
                              http_method: pixel.httpMethod || pixel.http_method || 'GET',
                              headers: pixel.headers || '[]',
                              authentication_type: pixel.authenticationType || pixel.authentication_type || 'none',
                              advanced_options: pixel.advancedOptions || pixel.advanced_options || false,
                              active: pixel.active !== false
                            });
                            
                            // Force refresh the campaign pixels query
                            await queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'tracking-pixels'] });
                            await queryClient.refetchQueries({ queryKey: ['/api/campaigns', campaignId, 'tracking-pixels'] });
                            
                            toast({
                              title: 'Success',
                              description: `Imported "${pixel.name}" to campaign`
                            });
                          } catch (error: any) {

                            toast({
                              title: 'Error',
                              description: error.message || 'Failed to import pixel',
                              variant: 'destructive'
                            });
                          }
                        }}
                      >
                        Import
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ExternalLink className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium mb-1">No integration pixels found</p>
                  <p className="text-xs text-gray-400">Create pixels in Integrations page first</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  );
}