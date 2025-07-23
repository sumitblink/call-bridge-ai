import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { apiRequest } from '@/lib/queryClient';

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

export default function CampaignTrackingPixels({ campaignId }: CampaignTrackingPixelsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState<TrackingPixel | null>(null);
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
  const queryClient = useQueryClient();

  // Fetch actual tracking pixels instead of using hardcoded sample data
  const { data: pixels = [], isLoading: isLoadingPixels } = useQuery<TrackingPixel[]>({
    queryKey: ['/api/integrations/pixels'],
    select: (data: any[]) => data.map((pixel: any) => ({
      id: pixel.id,
      name: pixel.name,
      firePixelOn: pixel.fireOnEvent || pixel.fire_on_event || 'incoming',
      url: pixel.code,
      httpMethod: 'GET' as const,
      headers: [],
      authentication: 'none' as const,
      advancedOptions: false,
      active: pixel.isActive !== false
    })),
    retry: false,
  });

  // Fetch global tracking pixels from Integrations
  const { data: globalPixels, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['/api/integrations/pixels'],
    retry: false,
  });

  // Delete pixel mutation
  const deletePixelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/integrations/pixels/${id}`, 'DELETE');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/pixels'] });
      toast({
        title: "Success",
        description: "Tracking pixel deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pixel",
        variant: "destructive"
      });
    }
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
    
    // Direct users to the Integrations page for pixel management
    toast({
      title: 'Create pixels in Integrations',
      description: 'Please use the Integrations page to create and manage tracking pixels. They will appear here automatically.',
    });
    
    resetForm();
  };

  const handleEdit = (pixel: TrackingPixel) => {
    // Direct users to the Integrations page for editing
    toast({
      title: 'Edit in Integrations',
      description: 'Please use the Integrations page to edit tracking pixels.',
    });
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
    toast({
      title: 'Pixels are automatically available',
      description: 'All pixels created in Integrations are automatically available here.',
    });
    setIsImportDialogOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Pixel URL copied to clipboard'
    });
  };

  const generateTokenizedUrl = (baseUrl: string, campaignId?: number) => {
    return baseUrl.replace(/{([^}]+)}/g, (match, token) => {
      switch (token) {
        case 'campaign_id':
          return campaignId?.toString() || '{campaign_id}';
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
                onClick={() => setIsImportDialogOpen(true)}
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

        {/* Create/Edit Pixel Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPixel ? 'Edit Tracking Pixel' : 'Create New Tracking Pixel'}
              </DialogTitle>
              <DialogDescription>
                For full pixel management, please use the Integrations page. This creates a simplified pixel.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Pixel Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Conversion Tracker"
                  />
                </div>

                <div>
                  <Label htmlFor="firePixelOn">Fire Pixel On</Label>
                  <Select
                    value={formData.firePixelOn}
                    onValueChange={(value: any) => setFormData({ ...formData, firePixelOn: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="url">Pixel URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/pixel?campaign_id={campaign_id}&call_id={call_id}"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use tokens: {'{campaign_id}'}, {'{call_id}'}, {'{phone_number}'}, {'{timestamp}'}, {'{status}'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create in Integrations
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Pixels Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Existing Pixels</DialogTitle>
              <DialogDescription>
                All pixels created in Integrations are automatically available here.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-gray-600">
                No import needed - all tracking pixels from the Integrations page are automatically available in this campaign.
              </p>
            </div>

            <div className="flex justify-end gap-2">
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