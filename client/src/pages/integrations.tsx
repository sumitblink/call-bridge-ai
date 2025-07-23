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

interface Pixel {
  id: number;
  name: string;
  pixelType: 'postback' | 'image' | 'javascript';
  fireOnEvent: string;
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

interface URLParameter {
  id: number;
  parameterName: string;
  reportingMenuName: string;
  reportName: string;
  parameterType: 'string' | 'integer' | 'decimal';
  isRequired: boolean;
  defaultValue?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [isPixelDialogOpen, setIsPixelDialogOpen] = useState(false);
  const [isUrlParameterDialogOpen, setIsUrlParameterDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("all");
  const [testResult, setTestResult] = useState<any>(null);

  // Form states
  const [pixelForm, setPixelForm] = useState({
    name: "",
    pixelType: "postback" as 'postback' | 'image' | 'javascript',
    fireOnEvent: "completed",
    code: "",
    assignedCampaigns: [] as string[],
    isActive: true,
    advancedOptions: false,
    authentication: 'none' as string
  });

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [selectedPixelTab, setSelectedPixelTab] = useState<'existing' | 'create'>('existing');

  // URL Parameters form state
  const [urlParameterForm, setUrlParameterForm] = useState({
    parameterName: "",
    reportingMenuName: "",
    reportName: "",
    parameterType: "string" as 'string' | 'integer' | 'decimal',
    isRequired: false,
    defaultValue: "",
    description: "",
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

  // Fetch URL Parameters
  const { data: urlParameters = [], isLoading: isLoadingUrlParameters } = useQuery<URLParameter[]>({
    queryKey: ['/api/integrations/url-parameters']
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
      const response = await apiRequest('/api/integrations/pixels', 'POST', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/pixels'] });
      setIsPixelDialogOpen(false);
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
      const response = await apiRequest(`/api/integrations/pixels/${id}`, 'PUT', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/pixels'] });
      setIsPixelDialogOpen(false);
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

  // Test pixel mutation
  const testPixelMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/pixels/test', 'POST', {
        pixelType: data.pixelType,
        code: data.code,
        sampleData: {
          call_id: 'test_call_123',
          campaign_id: '1',
          phone_number: '+1234567890',
          timestamp: new Date().toISOString()
        }
      });
      return response.json();
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
        title: "Test Error",
        description: error.message || "Failed to test pixel",
        variant: "destructive"
      });
    }
  });

  const generatePixelCode = (pixelType: string, campaignId?: string) => {
    const baseUrl = window.location.origin;
    const campaign = campaignId && campaignId !== "all" ? campaigns.find(c => c.id.toString() === campaignId) : null;
    const campaignName = campaign ? campaign.name.toLowerCase().replace(/\s+/g, '-') : 'default';
    
    switch (pixelType) {
      case 'postback':
        return `${baseUrl}/api/pixels/track?campaign_id={campaign_id}&call_id={call_id}&phone_number={phone_number}&timestamp={timestamp}&status={status}&duration={duration}&buyer_id={buyer_id}`;
      
      case 'image':
        return `<img src="${baseUrl}/api/pixels/track.gif?campaign_id={campaign_id}&call_id={call_id}&phone_number={phone_number}&timestamp={timestamp}&status={status}" width="1" height="1" style="display:none;" />`;
      
      case 'javascript':
        return `<script>
(function() {
  var img = new Image();
  img.src = '${baseUrl}/api/pixels/track.gif?campaign_id={campaign_id}&call_id={call_id}&phone_number={phone_number}&timestamp={timestamp}&status={status}&duration={duration}&buyer_id={buyer_id}&agent_id={agent_id}';
})();
</script>`;
      
      default:
        return '';
    }
  };

  const resetPixelForm = () => {
    const defaultCode = generatePixelCode("postback", "all");
    setPixelForm({
      name: "",
      pixelType: "postback",
      fireOnEvent: "completed",
      code: defaultCode,
      assignedCampaigns: [],
      isActive: true,
      advancedOptions: false,
      authentication: 'none'
    });
    setSelectedTemplate("");
    setCustomUrl("");
    setSelectedPixelTab('existing');
    setTestResult(null);
  };

  const handlePixelSubmit = () => {
    if (!pixelForm.name || !pixelForm.code) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

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
      isActive: pixel.isActive,
      advancedOptions: false,
      authentication: 'none'
    });
    
    // If the pixel code doesn't match auto-generated format, it's likely a custom URL
    const autoGenerated = generatePixelCode(pixel.pixelType, pixel.assignedCampaigns?.[0]);
    if (pixel.code !== autoGenerated && !pixel.code.includes('<script>') && !pixel.code.includes('<img')) {
      setCustomUrl(pixel.code);
    } else {
      setCustomUrl("");
    }
    
    setSelectedPixelTab('create');
    setIsPixelDialogOpen(true);
  };

  const handleDeletePixel = (id: number) => {
    if (confirm("Are you sure you want to delete this tracking pixel?")) {
      deletePixelMutation.mutate(id);
    }
  };

  // URL Parameters form handlers
  const resetUrlParameterForm = () => {
    setUrlParameterForm({
      parameterName: "",
      reportingMenuName: "",
      reportName: "",
      parameterType: "string",
      isRequired: false,
      defaultValue: "",
      description: "",
      isActive: true
    });
  };

  const handleUrlParameterSubmit = () => {
    if (!urlParameterForm.parameterName || !urlParameterForm.reportingMenuName || !urlParameterForm.reportName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (editingItem) {
      updateUrlParameterMutation.mutate({ id: editingItem.id, ...urlParameterForm });
    } else {
      createUrlParameterMutation.mutate(urlParameterForm);
    }
  };

  const handleEditUrlParameter = (parameter: URLParameter) => {
    setEditingItem(parameter);
    setUrlParameterForm({
      parameterName: parameter.parameterName,
      reportingMenuName: parameter.reportingMenuName,
      reportName: parameter.reportName,
      parameterType: parameter.parameterType,
      isRequired: parameter.isRequired,
      defaultValue: parameter.defaultValue || "",
      description: parameter.description || "",
      isActive: parameter.isActive
    });
    setIsUrlParameterDialogOpen(true);
  };

  const handleDeleteUrlParameter = (id: number) => {
    if (confirm("Are you sure you want to delete this URL parameter?")) {
      deleteUrlParameterMutation.mutate(id);
    }
  };

  // URL Parameters mutations
  const createUrlParameterMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/integrations/url-parameters', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/url-parameters'] });
      setIsUrlParameterDialogOpen(false);
      resetUrlParameterForm();
      toast({
        title: "Success",
        description: "URL parameter created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create URL parameter",
        variant: "destructive"
      });
    }
  });

  const updateUrlParameterMutation = useMutation({
    mutationFn: async (data: { id: number; [key: string]: any }) => {
      const { id, ...payload } = data;
      const response = await apiRequest(`/api/integrations/url-parameters/${id}`, 'PUT', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/url-parameters'] });
      setIsUrlParameterDialogOpen(false);
      setEditingItem(null);
      resetUrlParameterForm();
      toast({
        title: "Success",
        description: "URL parameter updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update URL parameter",
        variant: "destructive"
      });
    }
  });

  const deleteUrlParameterMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/integrations/url-parameters/${id}`, 'DELETE');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/url-parameters'] });
      toast({
        title: "Success",
        description: "URL parameter deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete URL parameter",
        variant: "destructive"
      });
    }
  });

  const handleTestPixel = () => {
    if (!pixelForm.code) {
      toast({
        title: "Validation Error",
        description: "Please enter pixel code to test",
        variant: "destructive"
      });
      return;
    }

    testPixelMutation.mutate({
      pixelType: pixelForm.pixelType,
      code: pixelForm.code
    });
  };

  const getPixelTypeIcon = (type: string) => {
    switch (type) {
      case 'postback': return <Webhook className="h-4 w-4 text-blue-500" />;
      case 'image': return <Globe className="h-4 w-4 text-green-500" />;
      case 'javascript': return <Code className="h-4 w-4 text-purple-500" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'connected': return 'bg-blue-100 text-blue-800';
      case 'incoming': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-gray-600">Manage tracking pixels, webhooks, and external integrations</p>
          </div>
        </div>

        <Tabs defaultValue="pixels" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pixels">Tracking Pixels</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="apis">API Keys</TabsTrigger>
            <TabsTrigger value="url-parameters">URL Parameters</TabsTrigger>
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
                <Dialog open={isPixelDialogOpen} onOpenChange={setIsPixelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingItem(null);
                      resetPixelForm();
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Pixel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Tracking Pixels</DialogTitle>
                      <DialogDescription>
                        Manage tracking pixels with unified form interface
                      </DialogDescription>
                    </DialogHeader>

                    {/* Tab Navigation */}
                    <div className="flex border-b mb-6">
                      <Button
                        variant={selectedPixelTab === 'existing' ? 'default' : 'ghost'}
                        className="px-6 py-2 rounded-none border-b-2 border-transparent hover:border-blue-500 data-[state=active]:border-blue-500"
                        onClick={() => setSelectedPixelTab('existing')}
                      >
                        Select Existing
                      </Button>
                      <Button
                        variant={selectedPixelTab === 'create' ? 'default' : 'ghost'}
                        className="px-6 py-2 rounded-none border-b-2 border-transparent hover:border-blue-500 data-[state=active]:border-blue-500"
                        onClick={() => setSelectedPixelTab('create')}
                      >
                        Create New
                      </Button>
                    </div>

                    {/* Select Existing Tab */}
                    {selectedPixelTab === 'existing' && (
                      <div className="space-y-4">
                        <div>
                          <Label>Choose Option</Label>
                          <div className="mt-2">
                            {pixels && pixels.length > 0 ? (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {pixels.map((pixel: any) => (
                                  <div key={pixel.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                    <div>
                                      <div className="font-medium">{pixel.name}</div>
                                      <div className="text-sm text-gray-500">
                                        Fires on: {pixel.fireOnEvent || pixel.fire_on_event}
                                      </div>
                                      <div className="text-xs text-blue-600 truncate max-w-md">
                                        {pixel.code}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        toast({
                                          title: 'Pixel Available',
                                          description: 'This pixel is already available for use in your campaigns.'
                                        });
                                        setIsPixelDialogOpen(false);
                                      }}
                                    >
                                      Use This Pixel
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Code className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm">No existing pixels found</p>
                                <p className="text-xs">Create your first pixel below</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Create New Tab - Ringba Style */}
                    {selectedPixelTab === 'create' && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                          <Input
                            id="name"
                            value={pixelForm.name}
                            onChange={(e) => setPixelForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter name"
                            required
                          />
                          <span className="text-xs text-gray-500">Required</span>
                        </div>

                        <div>
                          <Label htmlFor="fire-event">Fire Pixel On <span className="text-red-500">*</span></Label>
                          <Select 
                            value={pixelForm.fireOnEvent} 
                            onValueChange={(value) => setPixelForm(prev => ({ ...prev, fireOnEvent: value }))}
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
                            <Label htmlFor="custom-url">Custom Pixel URL</Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2"
                            >
                              TOKENS
                            </Button>
                          </div>
                          <Input
                            id="custom-url"
                            value={customUrl}
                            onChange={(e) => {
                              setCustomUrl(e.target.value);
                              setPixelForm(prev => ({ ...prev, code: e.target.value.trim() }));
                            }}
                            placeholder="https://example.com/postback?clickid={call_id}&campaign={campaign_id}"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Available tokens: {'{call_id}'}, {'{phone_number}'}, {'{campaign_id}'}, {'{timestamp}'}, {'{duration}'}, {'{status}'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label>Advanced Options</Label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={pixelForm.advancedOptions}
                              onChange={(e) => setPixelForm(prev => ({ ...prev, advancedOptions: e.target.checked }))}
                            />
                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer ${
                              pixelForm.advancedOptions ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                                pixelForm.advancedOptions ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </div>
                          </label>
                        </div>

                        {pixelForm.advancedOptions && (
                          <div>
                            <Label htmlFor="authentication">Authentication</Label>
                            <Select
                              value={pixelForm.authentication || 'none'}
                              onValueChange={(value) => setPixelForm(prev => ({ ...prev, authentication: value }))}
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
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsPixelDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handlePixelSubmit}
                            disabled={createPixelMutation.isPending || updatePixelMutation.isPending}
                          >
                            {editingItem ? 'Update' : 'Create'} Pixel
                          </Button>
                        </div>
                      </div>
                    )}
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
                    setIsPixelDialogOpen(true);
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
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPixel(pixel)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePixel(pixel.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {pixel.pixelType}
                        </Badge>
                        <Badge className={`text-xs ${getEventBadgeColor(pixel.fireOnEvent)}`}>
                          {pixel.fireOnEvent}
                        </Badge>
                        <Badge variant={pixel.isActive ? "default" : "secondary"} className="text-xs">
                          {pixel.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 font-mono truncate">
                        {pixel.code.substring(0, 80)}...
                      </div>
                      {pixel.assignedCampaigns && pixel.assignedCampaigns.length > 0 && (
                        <div className="text-xs text-gray-600">
                          Campaigns: {pixel.assignedCampaigns.length} assigned
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Webhook Integration</h3>
              <p className="text-gray-600">Webhook functionality coming soon</p>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="apis" className="space-y-6">
            <div className="text-center py-12">
              <Key className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">API Key Management</h3>
              <p className="text-gray-600">API key management coming soon</p>
            </div>
          </TabsContent>

          {/* URL Parameters Tab */}
          <TabsContent value="url-parameters" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">URL Parameters</h2>
                <p className="text-gray-600">Configure URL parameters for campaign tracking and reporting</p>
              </div>
              <Dialog open={isUrlParameterDialogOpen} onOpenChange={setIsUrlParameterDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingItem(null);
                    resetUrlParameterForm();
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? 'Edit URL Parameter' : 'Create URL Parameter'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure URL parameters to capture and report campaign data
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="parameter-name">URL Parameter <span className="text-red-500">*</span></Label>
                      <Input
                        id="parameter-name"
                        placeholder="utm_campaign"
                        value={urlParameterForm.parameterName}
                        onChange={(e) => setUrlParameterForm(prev => ({ ...prev, parameterName: e.target.value }))}
                        required
                      />
                      <span className="text-xs text-gray-500 mt-1">Required</span>
                    </div>

                    <div>
                      <Label htmlFor="reporting-menu">Reporting Menu Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="reporting-menu"
                        placeholder="User"
                        value={urlParameterForm.reportingMenuName}
                        onChange={(e) => setUrlParameterForm(prev => ({ ...prev, reportingMenuName: e.target.value }))}
                        required
                      />
                      <span className="text-xs text-gray-500 mt-1">Required</span>
                    </div>

                    <div>
                      <Label htmlFor="report-name">Report Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="report-name"
                        placeholder="Campaign Name"
                        value={urlParameterForm.reportName}
                        onChange={(e) => setUrlParameterForm(prev => ({ ...prev, reportName: e.target.value }))}
                        required
                      />
                      <span className="text-xs text-gray-500 mt-1">Required</span>
                    </div>

                    <div className="flex justify-center space-x-3 pt-6">
                      <Button
                        onClick={handleUrlParameterSubmit}
                        disabled={createUrlParameterMutation.isPending || updateUrlParameterMutation.isPending}
                        className="px-8"
                      >
                        CREATE
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsUrlParameterDialogOpen(false);
                          setEditingItem(null);
                          resetUrlParameterForm();
                        }}
                        className="px-8"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* URL Parameters Table */}
            <div className="bg-white rounded-lg border">
              {isLoadingUrlParameters ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading URL parameters...</p>
                </div>
              ) : urlParameters.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No URL Parameters</h3>
                  <p className="text-gray-600 mb-4">Configure URL parameters to track campaign data from traffic sources</p>
                  <p className="text-sm text-gray-500">Examples: utm_campaign, utm_source, keyword, adgroup_id</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Menu</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Column</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {urlParameters.map((parameter) => (
                        <tr key={parameter.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <Code className="h-4 w-4 text-purple-500 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{parameter.parameterName}</div>
                                {parameter.description && (
                                  <div className="text-sm text-gray-500">{parameter.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{parameter.reportingMenuName}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{parameter.reportName}</td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="capitalize">{parameter.parameterType}</Badge>
                            {parameter.isRequired && (
                              <Badge variant="destructive" className="ml-1">Required</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={parameter.isActive ? "default" : "secondary"}>
                              {parameter.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUrlParameter(parameter)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUrlParameter(parameter.id)}
                              disabled={deleteUrlParameterMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Usage Information */}
            {urlParameters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Parameter Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    These parameters will be captured from campaign URLs and displayed in reports:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    {`https://yoursite.com/landing-page?${urlParameters.map(p => `${p.parameterName}=value`).join('&')}`}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Values will appear in reporting under the configured menu names and column headers.
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}