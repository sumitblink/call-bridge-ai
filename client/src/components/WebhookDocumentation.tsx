import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Phone, ArrowRight } from "lucide-react";

export function WebhookDocumentation() {
  const domain = window.location.origin;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Automatic Webhook Configuration
        </CardTitle>
        <CardDescription>
          When you create number pools, webhook URLs are automatically updated on Twilio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
              Pool-Based Webhooks
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 dark:text-blue-300">Voice Webhook:</span>
                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">
                  {domain}/api/webhooks/pool/[POOL_ID]/voice
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700 dark:text-blue-300">Status Callback:</span>
                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">
                  {domain}/api/webhooks/pool/[POOL_ID]/status
                </code>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">How It Works</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div>
                  <p className="font-medium">Create Pool</p>
                  <p className="text-muted-foreground">You create a number pool and assign phone numbers</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-6" />
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div>
                  <p className="font-medium">Auto-Configure Webhooks</p>
                  <p className="text-muted-foreground">System automatically updates Twilio webhook URLs for all numbers in the pool</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-6" />
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <div>
                  <p className="font-medium">Dynamic Routing</p>
                  <p className="text-muted-foreground">Incoming calls to any pool number are routed through the pool's webhook</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
              Benefits
            </h4>
            <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
              <li>• No manual Twilio configuration required</li>
              <li>• Webhooks updated automatically when pools change</li>
              <li>• Pool-based routing for dynamic number insertion</li>
              <li>• Centralized call tracking and analytics</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}