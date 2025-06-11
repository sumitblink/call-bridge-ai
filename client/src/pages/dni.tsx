import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Code, Globe, Phone, TrendingUp, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Campaign {
  id: number;
  name: string;
  status: string;
  phoneNumbers?: any[];
}

interface DNISnippet {
  campaignId: number;
  campaignName: string;
  htmlSnippet: string;
  jsLibraryUrl: string;
  apiEndpoint: string;
}

export default function DNI() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [generatedSnippet, setGeneratedSnippet] = useState<DNISnippet | null>(null);
  const [testParams, setTestParams] = useState({
    source: "google",
    medium: "cpc",
    campaign: "summer-sale",
    content: "ad-variant-a",
    term: "buy-now"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  // Generate snippet mutation
  const generateSnippetMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      const response = await fetch(`/api/dni/snippet/${campaignId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate snippet');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedSnippet(data);
      toast({
        title: "Snippet Generated",
        description: "DNI integration code is ready for your website",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate DNI snippet",
        variant: "destructive",
      });
    },
  });

  // Test DNI tracking
  const testTrackingMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await fetch("/api/dni/track", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to test tracking');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Successful",
        description: `Tracking number: ${data.formattedNumber}`,
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Unable to retrieve tracking number",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${type} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleGenerateSnippet = () => {
    if (!selectedCampaignId) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign first",
        variant: "destructive",
      });
      return;
    }

    generateSnippetMutation.mutate(parseInt(selectedCampaignId));
  };

  const handleTestTracking = () => {
    if (!selectedCampaignId) {
      toast({
        title: "Campaign Required",
        description: "Please select a campaign first",
        variant: "destructive",
      });
      return;
    }

    const testData = {
      campaignId: parseInt(selectedCampaignId),
      ...testParams,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      sessionId: `test_${Date.now()}`
    };

    testTrackingMutation.mutate(testData);
  };

  const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Dynamic Number Insertion</h1>
        <Badge variant="secondary">DNI</Badge>
      </div>

      <p className="text-muted-foreground">
        Generate JavaScript code snippets to dynamically display tracking phone numbers on your websites. 
        Enable advanced attribution tracking for performance marketing campaigns.
      </p>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="setup">Setup & Generate</TabsTrigger>
          <TabsTrigger value="test">Test Tracking</TabsTrigger>
          <TabsTrigger value="examples">Integration Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Generate DNI Code
              </CardTitle>
              <CardDescription>
                Select a campaign and generate the JavaScript integration code for your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-select">Campaign</Label>
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignsLoading ? (
                      <SelectItem value="loading" disabled>Loading campaigns...</SelectItem>
                    ) : activeCampaigns.length === 0 ? (
                      <SelectItem value="none" disabled>No active campaigns found</SelectItem>
                    ) : (
                      activeCampaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleGenerateSnippet}
                disabled={!selectedCampaignId || generateSnippetMutation.isPending}
                className="w-full"
              >
                {generateSnippetMutation.isPending ? "Generating..." : "Generate DNI Code"}
              </Button>
            </CardContent>
          </Card>

          {generatedSnippet && (
            <Card>
              <CardHeader>
                <CardTitle>Integration Code</CardTitle>
                <CardDescription>
                  Copy and paste this code into your website's HTML
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>HTML Snippet</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedSnippet.htmlSnippet, "HTML snippet")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={generatedSnippet.htmlSnippet}
                    readOnly
                    className="font-mono text-sm"
                    rows={12}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>JavaScript Library URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedSnippet.jsLibraryUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedSnippet.jsLibraryUrl, "JS library URL")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>API Endpoint</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedSnippet.apiEndpoint}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedSnippet.apiEndpoint, "API endpoint")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Implementation Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Copy the HTML snippet above</li>
                    <li>Paste it into your website's HTML, preferably in the &lt;head&gt; section</li>
                    <li>Add phone number elements with the data attributes shown in the examples</li>
                    <li>The system will automatically replace phone numbers when visitors load your page</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Test DNI Tracking
              </CardTitle>
              <CardDescription>
                Test your DNI setup with custom parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-source">UTM Source</Label>
                  <Input
                    id="test-source"
                    value={testParams.source}
                    onChange={(e) => setTestParams(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="google, facebook, direct"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-medium">UTM Medium</Label>
                  <Input
                    id="test-medium"
                    value={testParams.medium}
                    onChange={(e) => setTestParams(prev => ({ ...prev, medium: e.target.value }))}
                    placeholder="cpc, organic, email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-campaign">UTM Campaign</Label>
                  <Input
                    id="test-campaign"
                    value={testParams.campaign}
                    onChange={(e) => setTestParams(prev => ({ ...prev, campaign: e.target.value }))}
                    placeholder="summer-sale, brand-awareness"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-content">UTM Content</Label>
                  <Input
                    id="test-content"
                    value={testParams.content}
                    onChange={(e) => setTestParams(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="ad-variant-a, banner-top"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-term">UTM Term</Label>
                  <Input
                    id="test-term"
                    value={testParams.term}
                    onChange={(e) => setTestParams(prev => ({ ...prev, term: e.target.value }))}
                    placeholder="buy-now, discount"
                  />
                </div>
              </div>

              <Button 
                onClick={handleTestTracking}
                disabled={!selectedCampaignId || testTrackingMutation.isPending}
                className="w-full"
              >
                {testTrackingMutation.isPending ? "Testing..." : "Test DNI Tracking"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Implementation</CardTitle>
                <CardDescription>Simple phone number replacement</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`<!-- Basic phone number with campaign ID -->
<a href="tel:+1234567890" 
   data-dni-campaign-id="123" 
   class="dni-phone">
  (123) 456-7890
</a>

<!-- Using campaign name -->
<span data-dni-campaign="Summer Sale"
      class="tracking-phone">
  Call Now: (123) 456-7890
</span>`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>With custom settings and debugging</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`<script>
  window.DNI_CONFIG = {
    endpoint: 'https://your-domain.com/api/dni/track',
    timeout: 5000,
    debug: true
  };
</script>
<script src="https://your-domain.com/dni.js"></script>

<!-- Phone numbers will be auto-replaced -->
<div class="contact-info">
  <p>Call us: 
    <strong data-dni-campaign-id="123">
      (123) 456-7890
    </strong>
  </p>
</div>`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual JavaScript API</CardTitle>
                <CardDescription>Programmatic number replacement</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`<script>
  // Manual replacement
  DNI.replace(123, 'Summer Sale', function(response) {
    if (response.success) {
      document.getElementById('phone').textContent = 
        response.formattedNumber;
      document.getElementById('phone').href = 
        'tel:' + response.phoneNumber;
    }
  });

  // Get tracking data
  const trackingData = DNI.collectTrackingData();
  console.log('UTM Parameters:', trackingData);
</script>`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attribution Tracking</CardTitle>
                <CardDescription>Enhanced tracking with custom fields</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`<!-- Custom meta tags for additional tracking -->
<meta name="dni-landing-page" content="homepage">
<meta name="dni-visitor-type" content="returning">
<meta name="dni-ab-test" content="variant-a">

<!-- URL with UTM parameters -->
https://example.com/?utm_source=google
&utm_medium=cpc&utm_campaign=summer-sale
&utm_content=ad-variant-a&utm_term=buy-now

<!-- Phone number will include attribution -->
<a data-dni-campaign-id="123" class="dni-phone">
  Call Now: (123) 456-7890
</a>`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Attribution Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Phone className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-semibold">Call Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Track which marketing channels generate phone calls
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-semibold">ROI Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Measure return on investment for each campaign
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-semibold">Multi-Channel</h4>
                  <p className="text-sm text-muted-foreground">
                    Support Google Ads, Facebook, and other platforms
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}