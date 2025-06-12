import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Code, Globe, Smartphone } from "lucide-react";

interface CampaignTrackingProps {
  campaignId: number;
  campaign: any;
}

export default function CampaignTracking({ campaignId, campaign }: CampaignTrackingProps) {
  const { toast } = useToast();
  const [activeSnippetTab, setActiveSnippetTab] = useState("html");

  // Get campaign phone numbers for DNI
  const { data: campaignNumbers = [] } = useQuery({
    queryKey: [`/api/campaigns/${campaignId}/phone-numbers`],
  });

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${type} copied to clipboard.`,
    });
  };

  // Generate HTML snippet for website integration
  const generateHTMLSnippet = () => {
    const domain = window.location.hostname;
    return `<!-- Dynamic Number Insertion for Campaign: ${campaign.name} -->
<div class="dni-phone" data-dni-campaign-id="${campaignId}" data-dni-campaign="${campaign.name}">
  ${campaignNumbers.length > 0 ? campaignNumbers[0].phoneNumber : '(555) 123-4567'}
</div>

<!-- DNI JavaScript SDK -->
<script src="https://${domain}/dni.js"></script>
<script>
  // Initialize DNI with campaign settings
  DNI.init({
    debug: false,
    timeout: 5000
  });
</script>`;
  };

  // Generate JavaScript snippet for advanced integration
  const generateJavaScriptSnippet = () => {
    const domain = window.location.hostname;
    return `// Advanced DNI Integration for Campaign: ${campaign.name}
(function() {
  // Load DNI SDK
  var script = document.createElement('script');
  script.src = 'https://${domain}/dni.js';
  script.onload = function() {
    // Initialize DNI system
    DNI.init({
      debug: false,
      timeout: 5000
    });

    // Replace specific phone number for this campaign
    DNI.replace(${campaignId}, '${campaign.name}', function(response) {
      if (response.success) {
        // Update all phone number elements
        var phoneElements = document.querySelectorAll('.campaign-phone');
        phoneElements.forEach(function(el) {
          el.textContent = response.formattedNumber;
          el.href = 'tel:' + response.phoneNumber;
        });
        
        console.log('DNI: Phone number updated to', response.formattedNumber);
      } else {
        console.error('DNI: Failed to get tracking number', response.error);
      }
    });
  };
  document.head.appendChild(script);
})();`;
  };

  // Generate React component snippet
  const generateReactSnippet = () => {
    return `import React, { useEffect, useState } from 'react';

const DNIPhone = ({ campaignId = ${campaignId}, campaignName = "${campaign.name}" }) => {
  const [phoneNumber, setPhoneNumber] = useState('${campaignNumbers.length > 0 ? campaignNumbers[0].phoneNumber : '(555) 123-4567'}');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDNI = async () => {
      try {
        const response = await fetch('/api/dni/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId,
            campaignName,
            source: new URLSearchParams(window.location.search).get('utm_source') || 'direct',
            medium: new URLSearchParams(window.location.search).get('utm_medium') || 'organic',
            sessionId: 'session_' + Date.now()
          }),
        });

        const data = await response.json();
        if (data.success) {
          setPhoneNumber(data.formattedNumber);
        }
      } catch (error) {
        console.error('DNI Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDNI();
  }, [campaignId, campaignName]);

  return (
    <a 
      href={\`tel:\${phoneNumber.replace(/[^0-9+]/g, '')}\`}
      className="text-blue-600 font-semibold hover:underline"
    >
      {isLoading ? 'Loading...' : phoneNumber}
    </a>
  );
};

export default DNIPhone;`;
  };

  const htmlSnippet = generateHTMLSnippet();
  const jsSnippet = generateJavaScriptSnippet();
  const reactSnippet = generateReactSnippet();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Website Tracking & DNI
        </h2>
        <p className="text-sm text-gray-500">
          Dynamic Number Insertion snippets for website integration and call tracking
        </p>
      </div>

      {/* Campaign Status */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Campaign Status</p>
                <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                  {campaign.status || 'active'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Smartphone className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">Tracking Numbers</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {campaignNumbers.length} assigned
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Code className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-500">DNI Ready</p>
                <Badge variant={campaignNumbers.length > 0 ? "default" : "secondary"}>
                  {campaignNumbers.length > 0 ? 'Enabled' : 'Needs Numbers'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Snippets */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Code Snippets</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSnippetTab} onValueChange={setActiveSnippetTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="html">HTML/Vanilla JS</TabsTrigger>
              <TabsTrigger value="javascript">Advanced JS</TabsTrigger>
              <TabsTrigger value="react">React Component</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>HTML Snippet</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(htmlSnippet, "HTML snippet")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={htmlSnippet}
                  readOnly
                  className="font-mono text-sm"
                  rows={12}
                />
              </div>
              <div className="text-sm text-gray-500">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Add the HTML div where you want the phone number to appear</li>
                  <li>Include the DNI JavaScript SDK before closing body tag</li>
                  <li>Phone numbers will be automatically replaced based on visitor tracking</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="javascript" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>JavaScript Snippet</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(jsSnippet, "JavaScript snippet")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={jsSnippet}
                  readOnly
                  className="font-mono text-sm"
                  rows={15}
                />
              </div>
              <div className="text-sm text-gray-500">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Add this script to your website's JavaScript files</li>
                  <li>Customize the phone element selector (.campaign-phone)</li>
                  <li>Provides callback functions for success/error handling</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="react" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>React Component</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(reactSnippet, "React component")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={reactSnippet}
                  readOnly
                  className="font-mono text-sm"
                  rows={18}
                />
              </div>
              <div className="text-sm text-gray-500">
                <p><strong>Instructions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Save as a React component file (e.g., DNIPhone.jsx)</li>
                  <li>Import and use: &lt;DNIPhone /&gt;</li>
                  <li>Automatically handles API calls and phone number updates</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test DNI */}
      <Card>
        <CardHeader>
          <CardTitle>Test Dynamic Number Insertion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Test URL with UTM parameters:
              </p>
              <div className="flex items-center space-x-2">
                <Input
                  value={`${window.location.origin}?utm_source=google&utm_medium=cpc&utm_campaign=test&utm_content=${campaign.name}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(
                    `${window.location.origin}?utm_source=google&utm_medium=cpc&utm_campaign=test&utm_content=${campaign.name}`,
                    "Test URL"
                  )}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">API Endpoint</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={`${window.location.origin}/api/dni/track`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}/api/dni/track`, "API endpoint")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">JavaScript SDK</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={`${window.location.origin}/dni.js`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}/dni.js`, "SDK URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attribution Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked Attribution Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">UTM Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">utm_source:</span>
                  <span className="font-mono">Traffic source (google, facebook, etc.)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">utm_medium:</span>
                  <span className="font-mono">Marketing medium (cpc, organic, email)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">utm_campaign:</span>
                  <span className="font-mono">Campaign name</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">utm_content:</span>
                  <span className="font-mono">Ad content/variant</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">utm_term:</span>
                  <span className="font-mono">Search keywords</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Platform Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">gclid:</span>
                  <span className="font-mono">Google Ads click ID</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">fbclid:</span>
                  <span className="font-mono">Facebook click ID</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">referrer:</span>
                  <span className="font-mono">Previous page URL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">user_agent:</span>
                  <span className="font-mono">Browser information</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ip_address:</span>
                  <span className="font-mono">Visitor IP address</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}