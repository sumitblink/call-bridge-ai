import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Edit, Trash2, Code, ExternalLink, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface CampaignTrackingPixelsProps {
  campaignId?: number;
}

interface TrackingPixel {
  id: number;
  name: string;
  type: 'javascript' | 'image' | 'iframe';
  code: string;
  triggerEvent: 'page_load' | 'form_submit' | 'phone_click' | 'button_click';
  active: boolean;
}

const SAMPLE_PIXELS: TrackingPixel[] = [
  {
    id: 1,
    name: 'Google Analytics',
    type: 'javascript',
    code: `<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>`,
    triggerEvent: 'page_load',
    active: true
  },
  {
    id: 2,
    name: 'Facebook Pixel',
    type: 'javascript',
    code: `<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>`,
    triggerEvent: 'page_load',
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
    type: 'javascript' | 'image' | 'iframe';
    code: string;
    triggerEvent: 'page_load' | 'form_submit' | 'phone_click' | 'button_click';
    active: boolean;
  }>({
    name: '',
    type: 'javascript',
    code: '',
    triggerEvent: 'page_load',
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
      type: 'javascript',
      code: '',
      triggerEvent: 'page_load',
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
      type: pixel.type,
      code: pixel.code,
      triggerEvent: pixel.triggerEvent,
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

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Tracking pixel code copied to clipboard'
    });
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
      type: pixel.pixelType,
      code: pixel.pixelCode,
      triggerEvent: pixel.triggerEvent,
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'javascript':
        return <Code className="h-4 w-4" />;
      case 'image':
        return <ExternalLink className="h-4 w-4" />;
      case 'iframe':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tracking Pixels</CardTitle>
            <CardDescription>
              Add tracking pixels and conversion codes for your campaigns
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
                              <TableHead>Type</TableHead>
                              <TableHead>Trigger Event</TableHead>
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
                                  <Badge variant="outline">{pixel.pixelType}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{pixel.triggerEvent}</Badge>
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
          </div>
          
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPixel(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Pixel
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPixel ? 'Edit' : 'Add'} Tracking Pixel
                </DialogTitle>
                <DialogDescription>
                  Configure tracking pixels to fire on specific events
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
                      placeholder="e.g., Google Analytics"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Pixel Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="image">Image Pixel</SelectItem>
                        <SelectItem value="iframe">iFrame</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="triggerEvent">Trigger Event</Label>
                  <Select 
                    value={formData.triggerEvent} 
                    onValueChange={(value: any) => setFormData({ ...formData, triggerEvent: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page_load">Page Load</SelectItem>
                      <SelectItem value="form_submit">Form Submit</SelectItem>
                      <SelectItem value="phone_click">Phone Click</SelectItem>
                      <SelectItem value="button_click">Button Click</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="code">Tracking Code</Label>
                  <Textarea
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Paste your tracking pixel code here..."
                    rows={8}
                    className="font-mono text-sm"
                    required
                  />
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
            </DialogContent>
          </Dialog>
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
                <TableHead>Type</TableHead>
                <TableHead>Trigger Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pixels.map((pixel) => (
                <TableRow key={pixel.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(pixel.type)}
                      {pixel.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {pixel.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{pixel.triggerEvent.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={pixel.active ? "default" : "secondary"}
                      className={pixel.active ? 'bg-green-100 text-green-800' : ''}
                    >
                      {pixel.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(pixel.code)}
                      >
                        <Copy className="h-4 w-4" />
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
                        onClick={() => handleEdit(pixel)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pixel.id)}
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