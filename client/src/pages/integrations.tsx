import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Link2, 
  Code, 
  Webhook, 
  Key, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Globe,
  Zap,
  Shield,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";

interface URLParameter {
  id: string;
  name: string;
  parameter: string;
  description: string;
  value: string;
  isActive: boolean;
}

interface Pixel {
  id: number;
  name: string;
  pixelType: 'postback' | 'image' | 'javascript';
  fireOnEvent: 'call_start' | 'call_complete' | 'call_transfer';
  code: string;
  assignedCampaigns: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: number;
  name: string;
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("all");
  const [testResult, setTestResult] = useState<any>(null);

  // Form states
  const [pixelForm, setPixelForm] = useState({
    name: "",
    pixelType: "postback" as 'postback' | 'image' | 'javascript',
    fireOnEvent: "call_complete" as 'call_start' | 'call_complete' | 'call_transfer',
    code: "",
    assignedCampaigns: [] as string[],
    isActive: true
  });

  // Fetch campaigns for assignment
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    select: (data: any[]) => data.map((campaign: any) => ({
      id: campaign.id,
      name: campaign.name
    }))
  });

  // Fetch pixels
  const { data: pixels = [], isLoading: isLoadingPixels } = useQuery<Pixel[]>({
    queryKey: ['/api/integrations/pixels'],
    select: (data: any[]) => data.map((pixel: any) => ({
      id: pixel.id,
      name: pixel.name,
      pixelType: pixel.pixelType || pixel.pixel_type,
      fireOnEvent: pixel.fireOnEvent || pixel.fire_on_event,
      code: pixel.code,
      assignedCampaigns: pixel.assignedCampaigns || pixel.assigned_campaigns || [],
      isActive: pixel.isActive !== false,
      createdAt: pixel.createdAt || pixel.created_at,
      updatedAt: pixel.updatedAt || pixel.updated_at
    }))
  });

  // Filter pixels by campaign
  const filteredPixels = selectedCampaignId === "all" 
    ? pixels 
    : pixels.filter((pixel: Pixel) => 
        pixel.assignedCampaigns?.includes(selectedCampaignId)
      );

  // Create pixel mutation
  const createPixelMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name,
        pixelType: data.pixelType,
        fireOnEvent: data.fireOnEvent,
        code: data.code,
        assignedCampaigns: data.assignedCampaigns,
        isActive: data.isActive
      };
      return apiRequest('/api/integrations/pixels', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/pixels'] });
      setIsDialogOpen(false);
      resetPixelForm();
      toast({
        title: "Success",
        description: "Tracking pixel created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pixel",
        variant: "destructive"
      });
    }
  });

  // Update pixel mutation
  const updatePixelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const payload = {
        name: data.name,
        pixelType: data.pixelType,
        fireOnEvent: data.fireOnEvent,
        code: data.code,
        assignedCampaigns: data.assignedCampaigns,
        isActive: data.isActive
      };
      return apiRequest(`/api/integrations/pixels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/pixels'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      resetPixelForm();
      toast({
        title: "Success",
        description: "Tracking pixel updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pixel",
        variant: "destructive"
      });
    }
  });

  // Delete pixel mutation
  const deletePixelMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/integrations/pixels/${id}`, {
        method: 'DELETE'
      });
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

  // Test pixel mutation
  const testPixelMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/pixels/test', {
        method: 'POST',
        body: JSON.stringify({
          pixelType: data.pixelType,
          code: data.code,
          sampleData: {
            call_id: 'test_call_123',
            campaign_id: '1',
            phone_number: '+1234567890',
            timestamp: new Date().toISOString()
          }
        })
      });
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({
        title: "Test Complete",
        description: "Pixel code tested with sample data"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test pixel",
        variant: "destructive"
      });
    }
  });

  const resetPixelForm = () => {
    setPixelForm({
      name: "",
      pixelType: "postback",
      fireOnEvent: "call_complete",
      code: "",
      assignedCampaigns: [],
      isActive: true
    });
    setTestResult(null);
  };

  const handlePixelSubmit = () => {
    if (editingItem) {
      updatePixelMutation.mutate({ id: editingItem.id, data: pixelForm });
    } else {
      createPixelMutation.mutate(pixelForm);
    }
  };

  const handleEditPixel = (pixel: Pixel) => {
    setEditingItem(pixel);
    setPixelForm({
      name: pixel.name,
      pixelType: pixel.pixelType,
      fireOnEvent: pixel.fireOnEvent,
      code: pixel.code,
      assignedCampaigns: pixel.assignedCampaigns || [],
      isActive: pixel.isActive
    });
    setTestResult(null);
    setIsDialogOpen(true);
  };

  const testPixelCode = () => {
    testPixelMutation.mutate({
      pixelType: pixelForm.pixelType,
      code: pixelForm.code
    });
  };

  const getPixelCodePlaceholder = (type: string) => {
    switch (type) {
      case 'postback':
        return 'https://example.com/postback?call_id={call_id}&campaign_id={campaign_id}&phone={phone_number}&timestamp={timestamp}';
      case 'image':
        return '<img src="https://example.com/pixel.gif?call_id={call_id}&campaign_id={campaign_id}" width="1" height="1" />';
      case 'javascript':
        return `// Example JavaScript pixel
gtag('event', 'conversion', {
  'call_id': '{call_id}',
  'campaign_id': '{campaign_id}',
  'phone_number': '{phone_number}',
  'timestamp': '{timestamp}'
});`;
      default:
        return '';
    }
  };

  const getPixelTypeIcon = (type: string) => {
    switch (type) {
      case 'postback':
        return <ExternalLink className="h-4 w-4" />;
      case 'image':
        return <Globe className="h-4 w-4" />;
      case 'javascript':
        return <Code className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case 'call_start':
        return 'bg-blue-100 text-blue-800';
      case 'call_complete':
        return 'bg-green-100 text-green-800';
      case 'call_transfer':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-gray-600">Manage tracking pixels, webhooks, and third-party integrations</p>
        </div>

        <Tabs defaultValue="pixels" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pixels">Tracking Pixels</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="apis">API Keys</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
          </TabsList>

          {/* Tracking Pixels Tab */}
          <TabsContent value="pixels" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Tracking Pixels</h2>
                <p className="text-gray-600">Manage conversion tracking with macro replacement</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="campaign-select">Filter by Campaign:</Label>
                  <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingItem(null);
                      resetPixelForm();
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Pixel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingItem ? 'Edit Pixel' : 'Create New Pixel'}</DialogTitle>
                      <DialogDescription>
                        Configure tracking pixel with macro replacement for real-time call data
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pixel-name">Name *</Label>
                          <Input
                            id="pixel-name"
                            value={pixelForm.name}
                            onChange={(e) => setPixelForm({...pixelForm, name: e.target.value})}
                            placeholder="e.g., Google Analytics Conversion"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pixel-type">Pixel Type *</Label>
                          <Select 
                            value={pixelForm.pixelType} 
                            onValueChange={(value) => setPixelForm({...pixelForm, pixelType: value as 'postback' | 'image' | 'javascript'})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select pixel type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="postback">Postback URL</SelectItem>
                              <SelectItem value="image">Image Pixel</SelectItem>
                              <SelectItem value="javascript">JavaScript Code</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="fire-on-event">Fire On Event *</Label>
                        <Select 
                          value={pixelForm.fireOnEvent} 
                          onValueChange={(value) => setPixelForm({...pixelForm, fireOnEvent: value as 'call_start' | 'call_complete' | 'call_transfer'})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select when to fire pixel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call_start">Call Start</SelectItem>
                            <SelectItem value="call_complete">Call Complete</SelectItem>
                            <SelectItem value="call_transfer">Call Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="pixel-code">
                          Pixel Code *
                          <span className="text-sm text-gray-500 ml-2">
                            Use macros: {'{call_id}'}, {'{campaign_id}'}, {'{phone_number}'}, {'{timestamp}'}, {'{caller_id}'}, {'{duration}'}, {'{status}'}
                          </span>
                        </Label>
                        <Textarea
                          id="pixel-code"
                          rows={6}
                          value={pixelForm.code}
                          onChange={(e) => setPixelForm({...pixelForm, code: e.target.value})}
                          placeholder={getPixelCodePlaceholder(pixelForm.pixelType)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div>
                        <Label>Assign to Campaigns</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                          {campaigns?.map((campaign) => (
                            <div key={campaign.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`campaign-${campaign.id}`}
                                checked={pixelForm.assignedCampaigns.includes(campaign.id.toString())}
                                onChange={(e) => {
                                  const campaignId = campaign.id.toString();
                                  if (e.target.checked) {
                                    setPixelForm({
                                      ...pixelForm,
                                      assignedCampaigns: [...pixelForm.assignedCampaigns, campaignId]
                                    });
                                  } else {
                                    setPixelForm({
                                      ...pixelForm,
                                      assignedCampaigns: pixelForm.assignedCampaigns.filter(id => id !== campaignId)
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`campaign-${campaign.id}`} className="text-sm">
                                {campaign.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={testPixelCode}
                          disabled={!pixelForm.code || !pixelForm.pixelType || testPixelMutation.isPending}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {testPixelMutation.isPending ? "Testing..." : "Test Pixel"}
                        </Button>
                        <Button 
                          onClick={handlePixelSubmit}
                          disabled={createPixelMutation.isPending || updatePixelMutation.isPending || !pixelForm.name || !pixelForm.code || !pixelForm.pixelType || !pixelForm.fireOnEvent}
                        >
                          {(createPixelMutation.isPending || updatePixelMutation.isPending) ? "Saving..." : editingItem ? "Update Pixel" : "Create Pixel"}
                        </Button>
                      </div>

                      {testResult && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">Test Result:</h4>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-sm">Original Code:</Label>
                              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">{testResult.originalCode}</pre>
                            </div>
                            <div>
                              <Label className="text-sm">Processed Code:</Label>
                              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">{testResult.processedCode}</pre>
                            </div>
                            <div className="text-sm text-gray-600">{testResult.note}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Pixels List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingPixels ? (
                <div className="col-span-full text-center py-8">Loading pixels...</div>
              ) : filteredPixels.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Code className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Tracking Pixels</h3>
                  <p className="text-gray-600 mb-4">Create your first tracking pixel to start monitoring conversions</p>
                  <Button onClick={() => {
                    setEditingItem(null);
                    resetPixelForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Pixel
                  </Button>
                </div>
              ) : (
                filteredPixels.map((pixel) => (
                  <Card key={pixel.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getPixelTypeIcon(pixel.pixelType)}
                          <CardTitle className="text-base">{pixel.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditPixel(pixel)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deletePixelMutation.mutate(pixel.id)}
                            disabled={deletePixelMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getEventBadgeColor(pixel.fireOnEvent)}>
                          {pixel.fireOnEvent.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {pixel.pixelType}
                        </Badge>
                        <Badge className={pixel.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {pixel.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500">Pixel Code:</Label>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-hidden">
                          {pixel.code.length > 100 ? `${pixel.code.substring(0, 100)}...` : pixel.code}
                        </pre>
                      </div>

                      {pixel.assignedCampaigns && pixel.assignedCampaigns.length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-500">Campaigns ({pixel.assignedCampaigns.length}):</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pixel.assignedCampaigns.slice(0, 3).map((campaignId) => {
                              const campaign = campaigns.find(c => c.id.toString() === campaignId);
                              return campaign ? (
                                <Badge key={campaignId} variant="secondary" className="text-xs">
                                  {campaign.name}
                                </Badge>
                              ) : null;
                            })}
                            {pixel.assignedCampaigns.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{pixel.assignedCampaigns.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Other tabs content */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Webhooks</h3>
              <p className="text-gray-600">Webhook configuration coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="apis" className="space-y-6">
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">API Keys</h3>
              <p className="text-gray-600">API key management coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Platform Integrations</h3>
              <p className="text-gray-600">Platform integrations coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}