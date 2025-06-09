import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Webhook, Globe, Key, TestTube, Activity, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WebhookConfig {
  id: number;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secretKey: string;
  retryAttempts: number;
  timeout: number;
  headers: Record<string, string>;
}

export default function WebhookSetupPage() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as string[],
    isActive: true,
    retryAttempts: 3,
    timeout: 30,
    headers: "{}"
  });

  // Mock data for demonstration
  const webhooks: WebhookConfig[] = [
    {
      id: 1,
      name: "CRM Integration",
      url: "https://api.mycrm.com/webhooks/calls",
      events: ["call.created", "call.completed", "call.failed"],
      isActive: true,
      secretKey: "wh_secret_***",
      retryAttempts: 3,
      timeout: 30,
      headers: { "Authorization": "Bearer ***", "Content-Type": "application/json" }
    },
    {
      id: 2,
      name: "Analytics Platform",
      url: "https://analytics.example.com/api/events",
      events: ["call.created", "buyer.ping", "buyer.post"],
      isActive: false,
      secretKey: "wh_secret_***",
      retryAttempts: 5,
      timeout: 45,
      headers: { "X-API-Key": "***", "Content-Type": "application/json" }
    }
  ];

  const availableEvents = [
    { value: "call.created", label: "Call Created", description: "Triggered when a new call is received" },
    { value: "call.completed", label: "Call Completed", description: "Triggered when a call ends successfully" },
    { value: "call.failed", label: "Call Failed", description: "Triggered when a call fails or is rejected" },
    { value: "buyer.ping", label: "Buyer Ping", description: "Triggered when pinging buyers for availability" },
    { value: "buyer.post", label: "Buyer Post", description: "Triggered when posting a call to a buyer" },
    { value: "campaign.updated", label: "Campaign Updated", description: "Triggered when campaign settings change" },
    { value: "buyer.added", label: "Buyer Added", description: "Triggered when a new buyer is added to a campaign" }
  ];

  const testWebhookMutation = useMutation({
    mutationFn: async (webhookId: number) => {
      // Simulate webhook test
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, response_time: 150, status_code: 200 };
    },
    onSuccess: (data) => {
      toast({
        title: "Webhook Test Successful",
        description: `Response received in ${data.response_time}ms with status ${data.status_code}`,
      });
    },
    onError: () => {
      toast({
        title: "Webhook Test Failed",
        description: "The webhook endpoint did not respond correctly",
        variant: "destructive",
      });
    }
  });

  const saveWebhookMutation = useMutation({
    mutationFn: async (data: any) => {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: editingWebhook ? "Webhook Updated" : "Webhook Created",
        description: "The webhook configuration has been saved successfully",
      });
      setIsCreating(false);
      setEditingWebhook(null);
      setFormData({
        name: "",
        url: "",
        events: [],
        isActive: true,
        retryAttempts: 3,
        timeout: 30,
        headers: "{}"
      });
    }
  });

  const handleSaveWebhook = () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    saveWebhookMutation.mutate(formData);
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      retryAttempts: webhook.retryAttempts,
      timeout: webhook.timeout,
      headers: JSON.stringify(webhook.headers, null, 2)
    });
    setIsCreating(true);
  };

  const handleEventToggle = (eventValue: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Webhook Management</h1>
          <p className="text-gray-600 mt-1">Configure integrations with external systems</p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="events">Event Types</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          {/* Create/Edit Webhook Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  {editingWebhook ? "Edit Webhook" : "Create New Webhook"}
                </CardTitle>
                <CardDescription>
                  Configure webhook endpoint to receive real-time event notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Webhook Name</Label>
                      <Input
                        id="name"
                        placeholder="CRM Integration"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="url">Endpoint URL</Label>
                      <Input
                        id="url"
                        placeholder="https://api.example.com/webhooks"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="active">Active</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="retries">Retry Attempts</Label>
                        <Input
                          id="retries"
                          type="number"
                          min="1"
                          max="10"
                          value={formData.retryAttempts}
                          onChange={(e) => setFormData(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="timeout">Timeout (seconds)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          min="5"
                          max="300"
                          value={formData.timeout}
                          onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Event Types</Label>
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                        {availableEvents.map((event) => (
                          <div key={event.value} className="flex items-start space-x-2">
                            <input
                              type="checkbox"
                              id={event.value}
                              checked={formData.events.includes(event.value)}
                              onChange={() => handleEventToggle(event.value)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label htmlFor={event.value} className="text-sm font-medium">
                                {event.label}
                              </Label>
                              <p className="text-xs text-gray-500">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="headers">Custom Headers (JSON)</Label>
                      <Textarea
                        id="headers"
                        placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                        value={formData.headers}
                        onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveWebhook}
                    disabled={saveWebhookMutation.isPending}
                  >
                    {saveWebhookMutation.isPending ? "Saving..." : (editingWebhook ? "Update" : "Create")} Webhook
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreating(false);
                      setEditingWebhook(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhooks List */}
          <Card>
            <CardHeader>
              <CardTitle>Configured Webhooks</CardTitle>
              <CardDescription>
                Manage your webhook endpoints and monitor their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell className="font-mono text-sm">{webhook.url}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.slice(0, 2).map((event) => (
                              <Badge key={event} variant="secondary" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                            {webhook.events.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{webhook.events.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={webhook.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {webhook.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testWebhookMutation.mutate(webhook.id)}
                              disabled={testWebhookMutation.isPending}
                            >
                              <TestTube className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditWebhook(webhook)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Available Event Types
              </CardTitle>
              <CardDescription>
                Events that can trigger webhook notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableEvents.map((event) => (
                  <Card key={event.value}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{event.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                            {event.value}
                          </code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Delivery Logs
              </CardTitle>
              <CardDescription>
                Monitor webhook delivery attempts and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Globe className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No webhook deliveries yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Delivery logs will appear here once webhooks are triggered
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}