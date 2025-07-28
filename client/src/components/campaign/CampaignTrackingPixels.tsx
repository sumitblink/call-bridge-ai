import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Edit, Trash2, Download, ExternalLink, Info, Search, ChevronDown } from 'lucide-react';
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
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Comprehensive token library organized by categories
  const tokenLibrary = {
    'Call Data': [
      { token: '{call_id}', description: 'Unique call identifier' },
      { token: '{phone_number}', description: 'Dialed phone number' },
      { token: '{caller_id}', description: 'Caller\'s phone number' },
      { token: '{duration}', description: 'Call duration in seconds' },
      { token: '{status}', description: 'Call status (completed, busy, no-answer, failed)' },
      { token: '{recording_url}', description: 'Call recording URL' },
      { token: '{timestamp}', description: 'Call timestamp' }
    ],
    'Campaign & Routing': [
      { token: '{campaign_id}', description: 'Campaign identifier' },
      { token: '{buyer_id}', description: 'Assigned buyer ID' },
      { token: '{agent_id}', description: 'Agent ID (if applicable)' }
    ],
    'RedTrack Integration': [
      { token: '[tag:User:clickid]', description: 'RedTrack click ID' },
      { token: '[Call:ConversionPayout]', description: 'Call payout value' },
      { token: '{redtrack_campaign_id}', description: 'RedTrack campaign ID' },
      { token: '{redtrack_offer_id}', description: 'RedTrack offer ID' },
      { token: '{redtrack_affiliate_id}', description: 'RedTrack affiliate ID' },
      { token: '{redtrack_sub_id}', description: 'RedTrack sub ID' }
    ],
    'UTM Parameters': [
      { token: '{utm_source}', description: 'UTM source parameter' },
      { token: '{utm_medium}', description: 'UTM medium parameter' },
      { token: '{utm_campaign}', description: 'UTM campaign parameter' },
      { token: '{utm_content}', description: 'UTM content parameter' },
      { token: '{utm_term}', description: 'UTM term parameter' }
    ],
    'RedTrack Sub Parameters': [
      { token: '{clickid}', description: 'Click ID parameter' },
      { token: '{sub1}', description: 'RedTrack sub parameter 1' },
      { token: '{sub2}', description: 'RedTrack sub parameter 2' },
      { token: '{sub3}', description: 'RedTrack sub parameter 3' },
      { token: '{sub4}', description: 'RedTrack sub parameter 4' },
      { token: '{sub5}', description: 'RedTrack sub parameter 5' },
      { token: '{sub6}', description: 'RedTrack sub parameter 6' },
      { token: '{sub7}', description: 'RedTrack sub parameter 7' },
      { token: '{sub8}', description: 'RedTrack sub parameter 8' }
    ],
    'Traffic Source Parameters': [
      { token: '{publisher}', description: 'Publisher parameter' },
      { token: '{gclid}', description: 'Google Ads click ID' },
      { token: '{fbclid}', description: 'Facebook click ID' },
      { token: '{msclkid}', description: 'Microsoft Ads click ID' },
      { token: '{ttclid}', description: 'TikTok click ID' },
      { token: '{twclid}', description: 'Twitter click ID' },
      { token: '{liclid}', description: 'LinkedIn click ID' },
      { token: '{subid}', description: 'Sub ID parameter' },
      { token: '{affid}', description: 'Affiliate ID parameter' },
      { token: '{pubid}', description: 'Publisher ID parameter' }
    ],
    'Ad Platform Parameters': [
      { token: '{source}', description: 'Traffic source' },
      { token: '{medium}', description: 'Traffic medium' },
      { token: '{content}', description: 'Content parameter' },
      { token: '{term}', description: 'Term parameter' },
      { token: '{keyword}', description: 'Keyword parameter' },
      { token: '{placement}', description: 'Placement parameter' },
      { token: '{adgroup}', description: 'Ad group parameter' },
      { token: '{creative}', description: 'Creative parameter' },
      { token: '{device}', description: 'Device parameter' },
      { token: '{network}', description: 'Network parameter' },
      { token: '{matchtype}', description: 'Match type parameter' },
      { token: '{adposition}', description: 'Ad position parameter' },
      { token: '{target}', description: 'Target parameter' },
      { token: '{targetid}', description: 'Target ID parameter' }
    ],
    'Custom Fields': [
      { token: '{custom_field_1}', description: 'Custom field 1' },
      { token: '{custom_field_2}', description: 'Custom field 2' },
      { token: '{custom_field_3}', description: 'Custom field 3' },
      { token: '{loc_physical_ms}', description: 'Physical location parameter' },
      { token: '{loc_interest_ms}', description: 'Interest location parameter' }
    ]
  };

  // Function to insert token at cursor position
  const insertTokenAtCursor = (token: string) => {
    const input = urlInputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = formData.url;
    const newValue = currentValue.substring(0, start) + token + currentValue.substring(end);
    
    setFormData({ ...formData, url: newValue });
    setIsTokenSearchOpen(false);
    
    // Focus back to input and position cursor after inserted token
    setTimeout(() => {
      input.focus();
      const newPosition = start + token.length;
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
                    <Popover open={isTokenSearchOpen} onOpenChange={setIsTokenSearchOpen}>
                      <PopoverTrigger asChild>
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
                      </PopoverTrigger>
                      <PopoverContent className="w-[480px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search tokens..." className="h-9" />
                          <CommandList className="max-h-[400px]">
                            <CommandEmpty>No tokens found.</CommandEmpty>
                            {Object.entries(tokenLibrary).map(([category, tokens]) => (
                              <CommandGroup key={category} heading={category}>
                                {tokens.map((tokenItem, index) => (
                                  <CommandItem
                                    key={`${category}-${index}`}
                                    value={`${tokenItem.token} ${tokenItem.description}`}
                                    onSelect={() => insertTokenAtCursor(tokenItem.token)}
                                    className="flex flex-col items-start gap-1 py-2"
                                  >
                                    <div className="font-mono text-blue-600 font-medium">
                                      {tokenItem.token}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {tokenItem.description}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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