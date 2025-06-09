import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  code: string;
  campaigns: string[];
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

  const { toast } = useToast();

  // Mock data - in production this would come from API
  const urlParameters: URLParameter[] = [
    {
      id: "1",
      name: "UTM Source Tracking",
      parameter: "utm_source",
      description: "Track traffic source for attribution",
      value: "{utm_source}",
      isActive: true
    },
    {
      id: "2", 
      name: "Campaign ID",
      parameter: "campaign_id",
      description: "Dynamic campaign identifier",
      value: "{campaign.id}",
      isActive: true
    }
  ];

  const pixels: Pixel[] = [
    {
      id: "1",
      name: "Google Analytics",
      type: "analytics",
      code: `<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>`,
      campaigns: ["Auto Insurance", "Home Insurance"],
      isActive: true
    }
  ];

  const webhooks: WebhookConfig[] = [
    {
      id: "1",
      name: "Call Started Webhook",
      url: "https://api.yourcrm.com/webhooks/call-started",
      events: ["call.started", "call.answered"],
      headers: { "Authorization": "Bearer token123", "Content-Type": "application/json" },
      isActive: true,
      retryCount: 3
    }
  ];

  const authentications: Authentication[] = [
    {
      id: "1",
      name: "Twilio API",
      type: "api_key",
      apiKey: "AC***************",
      secretKey: "***************",
      isActive: true
    }
  ];

  const platforms: Platform[] = [
    {
      id: "1",
      name: "Salesforce",
      type: "crm",
      status: "connected",
      config: { instanceUrl: "https://yourcompany.salesforce.com" },
      lastSync: "2024-01-15T10:30:00Z"
    },
    {
      id: "2",
      name: "HubSpot",
      type: "crm", 
      status: "disconnected",
      config: {},
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Pixel
              </Button>
            </div>

            <div className="grid gap-4">
              {pixels.map((pixel) => (
                <Card key={pixel.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{pixel.name}</h3>
                        <Badge variant="outline">{pixel.type}</Badge>
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
                      {pixel.code}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Campaigns: {pixel.campaigns.join(", ")}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(pixel.code)}>
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