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
    fireOnEvent: "completed",
    code: "",
    assignedCampaigns: [] as string[],
    isActive: true
  });

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customUrl, setCustomUrl] = useState("");

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
      const response = await apiRequest('/api/integrations/pixels', 'POST', payload);
      return response.json();
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
      const response = await apiRequest(`/api/integrations/pixels/${id}`, 'PUT', payload);
      return response.json();
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

  const resetPixelForm = () => {
    setPixelForm({
      name: "",
      pixelType: "postback",
      fireOnEvent: "completed",
      code: "",
      assignedCampaigns: [],
      isActive: true
    });
    setSelectedTemplate("");
    setCustomUrl("");
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
      isActive: pixel.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDeletePixel = (id: number) => {
    if (confirm("Are you sure you want to delete this tracking pixel?")) {
      deletePixelMutation.mutate(id);
    }
  };

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
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? 'Edit Tracking Pixel' : 'Create Tracking Pixel'}
                      </DialogTitle>
                      <DialogDescription>
                        Configure tracking pixels with macro replacement for call data
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pixel-name">Name</Label>
                          <Input
                            id="pixel-name"
                            placeholder="Conversion Pixel"
                            value={pixelForm.name}
                            onChange={(e) => setPixelForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="pixel-type">Type</Label>
                          <Select 
                            value={pixelForm.pixelType} 
                            onValueChange={(value) => setPixelForm(prev => ({ 
                              ...prev, 
                              pixelType: value as 'postback' | 'image' | 'javascript' 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="postback">Postback URL</SelectItem>
                              <SelectItem value="image">Image Pixel</SelectItem>
                              <SelectItem value="javascript">JavaScript</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="fire-event">Fire On Event</Label>
                        <Select 
                          value={pixelForm.fireOnEvent} 
                          onValueChange={(value) => setPixelForm(prev => ({ ...prev, fireOnEvent: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="incoming">Call Incoming</SelectItem>
                            <SelectItem value="connected">Call Connected</SelectItem>
                            <SelectItem value="completed">Call Completed</SelectItem>
                            <SelectItem value="converted">Conversion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="pixel-code">Pixel Code</Label>
                        <Textarea
                          id="pixel-code"
                          placeholder="Enter your tracking pixel code with macros like {call_id}, {phone_number}, etc."
                          value={pixelForm.code}
                          onChange={(e) => setPixelForm(prev => ({ ...prev, code: e.target.value }))}
                          className="min-h-[100px] font-mono text-sm"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Available macros: {'{call_id}'}, {'{phone_number}'}, {'{campaign_id}'}, {'{timestamp}'}, {'{duration}'}
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="assigned-campaigns">Assigned Campaigns</Label>
                        <Select 
                          value={pixelForm.assignedCampaigns[0] || "all"} 
                          onValueChange={(value) => setPixelForm(prev => ({ 
                            ...prev, 
                            assignedCampaigns: value === "all" ? [] : [value] 
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select campaigns" />
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

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            onClick={handleTestPixel}
                            disabled={testPixelMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {testPixelMutation.isPending ? 'Testing...' : 'Test Pixel'}
                          </Button>
                          {testResult && (
                            <Badge variant="outline" className="text-green-600">
                              Test {testResult.success ? 'Passed' : 'Failed'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
        </Tabs>
      </div>
    </Layout>
  );
}