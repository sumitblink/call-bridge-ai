import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Edit, Trash2, Download, ExternalLink, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface CampaignTrackingPixelsProps {
  campaignId?: number;
}

interface TrackingPixel {
  id: number;
  name: string;
  firePixelOn: 'incoming' | 'connected' | 'completed' | 'converted' | 'error' | 'payout' | 'recording' | 'finalized';
  url: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: { key: string; value: string }[];
  authentication: 'none' | 'basic' | 'bearer' | 'api_key';
  advancedOptions: boolean;
  active: boolean;
}

const SAMPLE_PIXELS: TrackingPixel[] = [
  {
    id: 1,
    name: 'Conversion Tracker',
    firePixelOn: 'converted',
    url: 'https://mytracking.tracking.com/conversion?campaign_id={campaign_id}&call_id={call_id}',
    httpMethod: 'GET',
    headers: [],
    authentication: 'none',
    advancedOptions: false,
    active: true
  },
  {
    id: 2,
    name: 'Call Completion Pixel',
    firePixelOn: 'completed',
    url: 'https://analytics.example.com/postback',
    httpMethod: 'POST',
    headers: [
      { key: 'Authorization', value: 'Bearer {token}' },
      { key: 'Content-Type', value: 'application/json' }
    ],
    authentication: 'bearer',
    advancedOptions: true,
    active: true
  }
];

export default function CampaignTrackingPixels({ campaignId }: CampaignTrackingPixelsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState<TrackingPixel | null>(null);
  const [pixels, setPixels] = useState<TrackingPixel[]>(SAMPLE_PIXELS);
  const [selectedGlobalPixels, setSelectedGlobalPixels] = useState<number[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    firePixelOn: 'incoming' | 'connected' | 'completed' | 'converted' | 'error' | 'payout' | 'recording' | 'finalized';
    url: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: { key: string; value: string }[];
    authentication: 'none' | 'basic' | 'bearer' | 'api_key';
    advancedOptions: boolean;
    active: boolean;
  }>({
    name: '',
    firePixelOn: 'incoming',
    url: '',
    httpMethod: 'GET',
    headers: [],
    authentication: 'none',
    advancedOptions: false,
    active: true
  });
  
  const { toast } = useToast();

  // Fetch global tracking pixels from Integrations
  const { data: globalPixels, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['/api/integrations/pixels'],
    retry: false,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      firePixelOn: 'incoming',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPixel) {
      // Update existing pixel
      setPixels(prev => prev.map(pixel => 
        pixel.id === editingPixel.id 
          ? { ...pixel, ...formData }
          : pixel
      ));
      toast({
        title: 'Success',
        description: 'Tracking pixel updated successfully'
      });
    } else {
      // Create new pixel
      const newPixel: TrackingPixel = {
        id: Date.now(),
        ...formData
      };
      setPixels(prev => [...prev, newPixel]);
      toast({
        title: 'Success',
        description: 'Tracking pixel created successfully'
      });
    }
    
    resetForm();
  };

  const handleEdit = (pixel: TrackingPixel) => {
    setEditingPixel(pixel);
    setFormData({
      name: pixel.name,
      firePixelOn: pixel.firePixelOn,
      url: pixel.url,
      httpMethod: pixel.httpMethod,
      headers: pixel.headers,
      authentication: pixel.authentication,
      advancedOptions: pixel.advancedOptions,
      active: pixel.active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setPixels(prev => prev.filter(pixel => pixel.id !== id));
    toast({
      title: 'Success',
      description: 'Tracking pixel deleted successfully'
    });
  };

  const handleToggleActive = (id: number) => {
    setPixels(prev => prev.map(pixel => 
      pixel.id === id 
        ? { ...pixel, active: !pixel.active }
        : pixel
    ));
  };

  const handleImportPixels = () => {
    if (!globalPixels || !Array.isArray(globalPixels) || selectedGlobalPixels.length === 0) return;

    const pixelsToImport = globalPixels.filter((pixel: any) => 
      selectedGlobalPixels.includes(pixel.id)
    );

    const highestId = Math.max(...pixels.map(p => p.id), 0);
    const newPixels = pixelsToImport.map((pixel: any, index: number) => ({
      id: highestId + index + 1,
      name: pixel.name,
      firePixelOn: pixel.firePixelOn || 'incoming',
      url: pixel.url || '',
      httpMethod: pixel.httpMethod || 'GET',
      headers: pixel.headers || [],
      authentication: pixel.authentication || 'none',
      advancedOptions: pixel.advancedOptions || false,
      active: true
    }));

    setPixels(prev => [...prev, ...newPixels]);
    setSelectedGlobalPixels([]);
    setIsImportDialogOpen(false);
    
    toast({
      title: 'Pixels Imported!',
      description: `${newPixels.length} tracking pixel(s) imported from Integrations`
    });
  };

  const handleTogglePixelSelection = (pixelId: number) => {
    setSelectedGlobalPixels(prev => 
      prev.includes(pixelId) 
        ? prev.filter(id => id !== pixelId)
        : [...prev, pixelId]
    );
  };

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case 'converted': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'connected': return 'bg-yellow-100 text-yellow-800';
      case 'incoming': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const insertToken = (field: string, token: string) => {
    if (field === 'url') {
      setFormData({ ...formData, url: formData.url + token });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tracking Pixels</CardTitle>
            <CardDescription>
              Configure tracking pixels to fire on specific call events
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Import Existing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Tracking Pixels</DialogTitle>
                  <DialogDescription>
                    Select tracking pixels from your Integrations to add to this campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {isLoadingGlobal ? (
                    <div className="text-center py-8">Loading pixels...</div>
                  ) : !globalPixels || !Array.isArray(globalPixels) || globalPixels.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tracking pixels found in Integrations. Create some pixels in the Integrations section first.
                    </div>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Select</TableHead>
                              <TableHead>Pixel Name</TableHead>
                              <TableHead>Fire On</TableHead>
                              <TableHead>Method</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {globalPixels.map((pixel: any) => (
                              <TableRow key={pixel.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedGlobalPixels.includes(pixel.id)}
                                    onChange={() => handleTogglePixelSelection(pixel.id)}
                                    className="rounded"
                                  />
                                </TableCell>
                                <TableCell>{pixel.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{pixel.firePixelOn || 'incoming'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{pixel.httpMethod || 'GET'}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setSelectedGlobalPixels([]);
                            setIsImportDialogOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleImportPixels}
                          disabled={selectedGlobalPixels.length === 0}
                        >
                          Import {selectedGlobalPixels.length} Pixel(s)
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPixel(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Pixel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPixel ? 'Edit' : 'Add'} Tracking Pixel
                  </DialogTitle>
                  <DialogDescription>
                    Configure tracking pixels to fire on specific call events
                  </DialogDescription>
                </DialogHeader>
                <TooltipProvider>
                  <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Field */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>A descriptive name for this tracking pixel (e.g., "Conversion Tracker", "Lead Pixel")</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter name"
                      required
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                    <span className="text-xs text-gray-500 mt-1">Required</span>
                  </div>
                  
                  {/* Fire Pixel On */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="firePixelOn">Fire Pixel On <span className="text-red-500">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Choose when this pixel should fire during the call lifecycle:<br/>
                          • Incoming: When call is received<br/>
                          • Connected: When call is answered<br/>
                          • Completed: When call ends<br/>
                          • Converted: When caller takes desired action</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.firePixelOn}
                      onValueChange={(value: 'incoming' | 'connected' | 'completed' | 'converted' | 'error' | 'payout' | 'recording' | 'finalized') => 
                        setFormData({ ...formData, firePixelOn: value })}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-800">
                        <SelectValue placeholder="Choose Event Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incoming">Incoming</SelectItem>
                        <SelectItem value="connected">Connected (Answered)</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="payout">Payout</SelectItem>
                        <SelectItem value="recording">Recording</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-gray-500 mt-1">Required</span>
                  </div>

                  {/* URL Field with TOKEN button */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="url">URL <span className="text-red-500">*</span></Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The endpoint URL to send tracking data to. Use TOKEN button to insert dynamic values like {'{call_id}'}, {'{campaign_id}'}, etc.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder="http://mytracking.tracking.com"
                        required
                        className="bg-gray-50 dark:bg-gray-800 flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => insertToken('url', '{call_id}')}
                      >
                        TOKEN
                      </Button>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">Required</span>
                  </div>

                  {/* Advanced Options Toggle */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="advancedOptions"
                      checked={formData.advancedOptions}
                      onChange={(e) => setFormData({ ...formData, advancedOptions: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="advancedOptions">Advanced Options</Label>
                  </div>

                  {/* Advanced Options Section */}
                  {formData.advancedOptions && (
                    <div className="space-y-4 border-t pt-4">
                      {/* HTTP Method */}
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="httpMethod">HTTP Method <span className="text-red-500">*</span></Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>HTTP method for the tracking request:<br/>
                              • GET: Simple URL-based tracking<br/>
                              • POST: Send data in request body<br/>
                              • PUT: Update existing data<br/>
                              • DELETE: Remove tracking data</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select
                          value={formData.httpMethod}
                          onValueChange={(value: 'GET' | 'POST' | 'PUT' | 'DELETE') => 
                            setFormData({ ...formData, httpMethod: value })}
                        >
                          <SelectTrigger className="bg-gray-50 dark:bg-gray-800">
                            <SelectValue placeholder="Choose Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-gray-500 mt-1">Required</span>
                      </div>

                      {/* Headers */}
                      <div>
                        <div className="flex items-center gap-2">
                          <Label>Headers</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Custom HTTP headers to send with the tracking request. Common examples:<br/>
                              • Authorization: Bearer token or API key<br/>
                              • Content-Type: application/json<br/>
                              • User-Agent: Your application name</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="space-y-2">
                          {formData.headers.map((header, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <Input
                                placeholder="key"
                                value={header.key}
                                onChange={(e) => {
                                  const newHeaders = [...formData.headers];
                                  newHeaders[index].key = e.target.value;
                                  setFormData({ ...formData, headers: newHeaders });
                                }}
                                className="bg-gray-50 dark:bg-gray-800"
                              />
                              <span className="text-gray-500">:</span>
                              <Input
                                placeholder="value"
                                value={header.value}
                                onChange={(e) => {
                                  const newHeaders = [...formData.headers];
                                  newHeaders[index].value = e.target.value;
                                  setFormData({ ...formData, headers: newHeaders });
                                }}
                                className="bg-gray-50 dark:bg-gray-800"
                              />
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const newHeaders = [...formData.headers];
                                  newHeaders[index].value += '{token}';
                                  setFormData({ ...formData, headers: newHeaders });
                                }}
                              >
                                TOKEN
                              </Button>
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  const newHeaders = formData.headers.filter((_, i) => i !== index);
                                  setFormData({ ...formData, headers: newHeaders });
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setFormData({ 
                                ...formData, 
                                headers: [...formData.headers, { key: '', value: '' }] 
                              });
                            }}
                          >
                            ADD
                          </Button>
                          {formData.headers.length === 0 && (
                            <p className="text-xs text-gray-500">No Headers</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Authentication - Outside Advanced Options like Ringba */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="authentication">Authentication</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Authentication method for the tracking endpoint:<br/>
                          • None: No authentication required<br/>
                          • Basic Auth: Username/password authentication<br/>
                          • Bearer Token: OAuth or API token<br/>
                          • API Key: Custom API key authentication</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.authentication}
                      onValueChange={(value: 'none' | 'basic' | 'bearer' | 'api_key') => 
                        setFormData({ ...formData, authentication: value })}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-800">
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

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingPixel ? 'Update' : 'Create'} Pixel
                    </Button>
                  </div>
                </form>
                </TooltipProvider>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pixels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tracking pixels configured yet. Add your first pixel to get started.
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pixels.map((pixel) => (
                <TableRow key={pixel.id}>
                  <TableCell className="font-medium">{pixel.name}</TableCell>
                  <TableCell>
                    <Badge className={getEventBadgeColor(pixel.firePixelOn)}>
                      {pixel.firePixelOn}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <a href={pixel.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      {pixel.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{pixel.httpMethod}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pixel.active ? 'default' : 'secondary'}>
                      {pixel.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pixel)}
                      >
                        <Edit className="h-4 w-4" />
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
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}