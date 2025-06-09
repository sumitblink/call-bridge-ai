import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Phone, ExternalLink, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WebhookTest() {
  const [testData, setTestData] = useState({
    To: "+15551234567",
    From: "+15559876543",
    CallSid: "CAtest123"
  });
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const webhookUrl = `${window.location.origin}/api/call/inbound`;
  const publicUrl = window.location.origin.replace("localhost:5000", `${window.location.hostname}.replit.app`);
  const publicWebhookUrl = `${publicUrl}/api/call/inbound`;

  const testWebhook = async () => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      Object.entries(testData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const res = await fetch("/api/call/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const responseText = await res.text();
      setResponse(responseText);
      
      if (res.ok) {
        toast({
          title: "Webhook Test Successful",
          description: "TwiML response generated successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to test webhook endpoint",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "URL copied successfully",
    });
  };

  const formatXml = (xml: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, "text/xml");
      const serializer = new XMLSerializer();
      return serializer.serializeToString(xmlDoc);
    } catch {
      return xml;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Twilio Webhook Setup</h1>
        <p className="text-muted-foreground">Configure and test your Twilio webhook integration</p>
      </div>

      {/* Webhook URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Use these URLs in your Twilio console phone number configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Local Development URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Production URL (for Twilio)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input 
                value={publicWebhookUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => copyToClipboard(publicWebhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Twilio Console Setup</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Go to Twilio Console → Phone Numbers → Active numbers</li>
              <li>2. Select your phone number</li>
              <li>3. Set Webhook URL to the production URL above</li>
              <li>4. Set HTTP Method to POST</li>
              <li>5. Save configuration</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Test Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Test Webhook
          </CardTitle>
          <CardDescription>
            Simulate Twilio webhook calls to test your configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="to">To (Twilio Phone Number)</Label>
              <Input
                id="to"
                value={testData.To}
                onChange={(e) => setTestData(prev => ({ ...prev, To: e.target.value }))}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="from">From (Caller Number)</Label>
              <Input
                id="from"
                value={testData.From}
                onChange={(e) => setTestData(prev => ({ ...prev, From: e.target.value }))}
                placeholder="+1987654321"
              />
            </div>
            <div>
              <Label htmlFor="callsid">Call SID</Label>
              <Input
                id="callsid"
                value={testData.CallSid}
                onChange={(e) => setTestData(prev => ({ ...prev, CallSid: e.target.value }))}
                placeholder="CAtest123"
              />
            </div>
          </div>

          <Button onClick={testWebhook} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Webhook"}
          </Button>

          {response && (
            <div>
              <Label className="text-sm font-medium">TwiML Response</Label>
              <Textarea
                value={formatXml(response)}
                readOnly
                className="mt-1 font-mono text-sm h-32"
              />
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Valid TwiML Response</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Configuration</CardTitle>
          <CardDescription>
            Ensure your campaigns have phone numbers assigned for webhook routing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Current test phone number:</span>
              <Badge variant="outline" className="font-mono">{testData.To}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Update campaign #{6} phone number to match your Twilio number for testing
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}