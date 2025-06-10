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
  Shield
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
  id: string;
  name: string;
  type: string;
  fireOn: string; // page_view, form_submit, call_start, call_complete, call_transfer
  url?: string; // External tracking URL
  code: string;
  campaigns: string[];
  authentication?: string;
  isActive: boolean;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  isActive: boolean;
  retryCount: number;
}

interface Authentication {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  secretKey?: string;
  isActive: boolean;
}

interface Platform {
  id: string;
  name: string;
  type: string;
  status: string;
  config: Record<string, any>;
  lastSync?: string;
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState("url-parameters");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all");

  const { toast } = useToast();

  // Fetch campaigns for dropdown
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ['/api/campaigns'],
  });

  // Fetch URL Parameters from API
  const { data: urlParameters = [], isLoading: urlLoading } = useQuery<URLParameter[]>({
    queryKey: ['/api/integrations/url-parameters'],
    select: (data: any[]) => data.map((param: any) => ({
      id: param.id.toString(),
      name: param.name,
      parameter: param.parameter,
      description: param.description || "",
      value: param.value,
      isActive: param.isActive
    }))
  });

  // Fetch Tracking Pixels from API
  const { data: pixels = [], isLoading: pixelsLoading } = useQuery<Pixel[]>({
    queryKey: ['/api/integrations/pixels'],
    select: (data: any[]) => data.map((pixel: any) => ({
      id: pixel.id.toString(),
      name: pixel.name,
      type: pixel.type,
      fireOn: pixel.fireOn || 'page_view',
      url: pixel.url,
      code: pixel.code,
      campaigns: Array.isArray(pixel.campaigns) ? pixel.campaigns : [],
      authentication: pixel.authentication,
      isActive: pixel.isActive
    }))
  });

  // Fetch Webhooks from API
  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery<WebhookConfig[]>({
    queryKey: ['/api/webhook-configs'],
    select: (data: any[]) => data.map((webhook: any) => ({
      id: webhook.id.toString(),
      name: webhook.name,
      url: webhook.url,
      events: Array.isArray(webhook.events) ? webhook.events : 
               typeof webhook.events === 'string' ? JSON.parse(webhook.events) : [],
      headers: typeof webhook.headers === 'string' ? JSON.parse(webhook.headers || '{}') : webhook.headers || {},
      isActive: webhook.isActive,
      retryCount: webhook.retryCount || 3
    }))
  });

  // Fetch API Authentications from API
  const { data: authentications = [], isLoading: authLoading } = useQuery<Authentication[]>({
    queryKey: ['/api/integrations/authentications'],
    select: (data: any[]) => data.map((auth: any) => ({
      id: auth.id.toString(),
      name: auth.name,
      type: auth.type,
      apiKey: auth.apiKey || "***************",
      secretKey: auth.secretKey ? "***************" : undefined,
      isActive: auth.isActive
    }))
  });

  // Fetch Platform Integrations from API
  const { data: platforms = [], isLoading: platformsLoading } = useQuery<Platform[]>({
    queryKey: ['/api/integrations/platforms'],
    select: (data: any[]) => data.map((platform: any) => ({
      id: platform.id.toString(),
      name: platform.name,
      type: platform.type,
      status: platform.status,
      config: typeof platform.config === 'string' ? JSON.parse(platform.config || '{}') : platform.config || {},
      lastSync: platform.lastSync
    }))
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  // Filter pixels based on selected campaign
  const filteredPixels = selectedCampaignId === "all" 
    ? pixels 
    : pixels.filter(pixel => 
        pixel.campaigns.includes(selectedCampaignId) || 
        pixel.campaigns.length === 0
      );

  // Generate campaign-specific pixel code
  const generateCampaignPixelCode = (pixel: Pixel, campaignId: string) => {
    if (campaignId === "all") return pixel.code;
    
    const campaign = campaigns.find((c) => c.id.toString() === campaignId);
    if (!campaign) return pixel.code;

    return pixel.code
      .replace(/\{campaign\.id\}/g, campaign.id.toString())
      .replace(/\{campaign\.name\}/g, campaign.name)
      .replace(/\{campaign\.phone_number\}/g, campaign.phoneNumber || "")
      .replace(/G-XXXXXXXXXX/g, `G-${campaign.id}${Date.now().toString().slice(-6)}`)
      .replace(/XXXXXXXXXXXXXXX/g, `${campaign.id}${Date.now().toString().slice(-9)}`);
  };

  const generateTrackingURL = (baseUrl: string, parameters: URLParameter[]) => {
    const params = parameters
      .filter(p => p.isActive)
      .map(p => `${p.parameter}=${p.value}`)
      .join('&');
    return `${baseUrl}?${params}`;
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-gray-600 mt-1">Connect your call routing platform with external services</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="url-parameters" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              URL Parameters
            </TabsTrigger>
            <TabsTrigger value="pixels" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Pixels
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="authentications" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Authentications
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Platforms
            </TabsTrigger>
          </TabsList>

          {/* URL Parameters Tab */}
          <TabsContent value="url-parameters" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">URL Parameters</h2>
                <p className="text-gray-600">Configure dynamic URL parameters for tracking and attribution</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            </div>

            <div className="grid gap-4">
              {urlParameters.map((param) => (
                <Card key={param.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{param.name}</h3>
                          <Badge className={param.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {param.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{param.description}</p>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {param.parameter}={param.value}
                          </code>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(`${param.parameter}=${param.value}`)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Generated Tracking URL</CardTitle>
                <CardDescription>Preview how your URLs will look with current parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                  {generateTrackingURL("https://yoursite.com/landing", urlParameters)}
                </div>
                <Button 
                  className="mt-3" 
                  variant="outline" 
                  onClick={() => copyToClipboard(generateTrackingURL("https://yoursite.com/landing", urlParameters))}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pixels Tab */}
          <TabsContent value="pixels" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Tracking Pixels</h2>
                <p className="text-gray-600">Manage conversion tracking and analytics pixels</p>
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
                      {campaigns.map((campaign: any) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pixel
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredPixels.map((pixel) => (
                <Card key={pixel.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{pixel.name}</h3>
                        <Badge variant="outline">{pixel.type}</Badge>
                        <Badge variant="secondary">
                          Fire On: {pixel.fireOn?.replace('_', ' ') || 'page view'}
                        </Badge>
                        <Badge className={pixel.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {pixel.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono mb-3 max-h-32 overflow-y-auto">
                      {selectedCampaignId !== "all" 
                        ? generateCampaignPixelCode(pixel, selectedCampaignId)
                        : pixel.code}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {selectedCampaignId !== "all" 
                          ? `Campaign-specific code for: ${campaigns.find((c) => c.id.toString() === selectedCampaignId)?.name || "Unknown"}`
                          : `Campaigns: ${pixel.campaigns.join(", ") || "All campaigns"}`
                        }
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyToClipboard(
                          selectedCampaignId !== "all" 
                            ? generateCampaignPixelCode(pixel, selectedCampaignId)
                            : pixel.code
                        )}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Webhooks</h2>
                <p className="text-gray-600">Configure real-time event notifications</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>

            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{webhook.name}</h3>
                        <Badge className={webhook.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Endpoint URL</Label>
                        <div className="bg-gray-50 p-2 rounded text-sm font-mono">{webhook.url}</div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Events</Label>
                        <div className="flex gap-2 mt-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline">{event}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Retry attempts: {webhook.retryCount}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Authentications Tab */}
          <TabsContent value="authentications" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">API Authentications</h2>
                <p className="text-gray-600">Manage API keys and authentication credentials</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Authentication
              </Button>
            </div>

            <div className="grid gap-4">
              {authentications.map((auth) => (
                <Card key={auth.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="h-5 w-5 text-blue-600" />
                          <h3 className="font-medium">{auth.name}</h3>
                          <Badge variant="outline">{auth.type}</Badge>
                          <Badge className={auth.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {auth.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-gray-500">API Key</Label>
                            <div className="font-mono text-sm">{auth.apiKey}</div>
                          </div>
                          {auth.secretKey && (
                            <div>
                              <Label className="text-xs text-gray-500">Secret Key</Label>
                              <div className="font-mono text-sm">{auth.secretKey}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Platform Integrations</h2>
                <p className="text-gray-600">Connect with CRM systems and marketing platforms</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Platform
              </Button>
            </div>

            <div className="grid gap-4">
              {platforms.map((platform) => (
                <Card key={platform.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Globe className="h-5 w-5 text-purple-600" />
                          <h3 className="font-medium">{platform.name}</h3>
                          <Badge variant="outline">{platform.type}</Badge>
                          <Badge className={
                            platform.status === "connected" ? "bg-green-100 text-green-800" : 
                            platform.status === "disconnected" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }>
                            {platform.status}
                          </Badge>
                        </div>
                        {platform.lastSync && (
                          <div className="text-sm text-gray-600">
                            Last sync: {new Date(platform.lastSync).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Zap className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}