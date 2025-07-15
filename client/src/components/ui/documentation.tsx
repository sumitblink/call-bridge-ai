import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  Phone, 
  Users, 
  Target, 
  Settings, 
  BarChart3, 
  Webhook, 
  PlayCircle,
  BookOpen,
  Video,
  MessageCircle,
  ExternalLink
} from "lucide-react";

interface DocumentationProps {
  trigger?: React.ReactNode;
  className?: string;
}

export function Documentation({ trigger, className }: DocumentationProps) {
  const [open, setOpen] = useState(false);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={className}>
      <HelpCircle className="h-4 w-4 mr-2" />
      Help & Documentation
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            CallCenter Pro Documentation
          </DialogTitle>
          <DialogDescription>
            Complete guide to using your call center management platform
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="quick-start" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="quick-start">Quick Start</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
            <TabsTrigger value="rtb">RTB System</TabsTrigger>
            <TabsTrigger value="twilio">Twilio Setup</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="quick-start" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Getting Started
                  </CardTitle>
                  <CardDescription>Set up your call center in 5 minutes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">1</Badge>
                      <div>
                        <h4 className="font-medium">Create Your First Campaign</h4>
                        <p className="text-sm text-gray-600">Go to Campaigns → New Campaign. Set a name and phone number.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">2</Badge>
                      <div>
                        <h4 className="font-medium">Add Buyers</h4>
                        <p className="text-sm text-gray-600">Navigate to Buyers → Add Buyer. Include name, phone, and email.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">3</Badge>
                      <div>
                        <h4 className="font-medium">Assign Buyers to Campaign</h4>
                        <p className="text-sm text-gray-600">In your campaign, click "Manage Buyers" and add your buyers.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">4</Badge>
                      <div>
                        <h4 className="font-medium">Configure Twilio</h4>
                        <p className="text-sm text-gray-600">Set webhook URL in Twilio Console to connect calls.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Demo Accounts</CardTitle>
                  <CardDescription>Test the system with these sample accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium">Demo Account 1</h4>
                      <p className="text-sm">Email: sumit@example.com</p>
                      <p className="text-sm">Password: demo123</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium">Demo Account 2</h4>
                      <p className="text-sm">Email: kiran@example.com</p>
                      <p className="text-sm">Password: kiran123</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Campaign Management
                  </CardTitle>
                  <CardDescription>Organize your call routing and lead distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Creating Campaigns</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Each campaign represents a traffic source or business line</li>
                      <li>• Assign unique phone numbers to each campaign</li>
                      <li>• Set call caps and concurrency limits</li>
                      <li>• Configure geographic and time-based routing</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Routing Options</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <strong>Round Robin:</strong> Distribute calls evenly</li>
                      <li>• <strong>Priority:</strong> Route to highest priority buyers first</li>
                      <li>• <strong>Geographic:</strong> Route based on caller location</li>
                      <li>• <strong>Time-based:</strong> Different routing by time of day</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Multiple Phone Numbers</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Create separate campaigns for each Twilio number</li>
                      <li>• Configure different buyer pools per number</li>
                      <li>• Track performance independently</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="buyers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Buyer Management
                  </CardTitle>
                  <CardDescription>Manage your call recipients and lead buyers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Adding Buyers</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Provide accurate phone numbers for call routing</li>
                      <li>• Set daily caps to control lead volume</li>
                      <li>• Configure priority levels (1-10, higher = more priority)</li>
                      <li>• Set concurrency limits for simultaneous calls</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Buyer Settings</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <strong>Status:</strong> Active, Paused, or Inactive</li>
                      <li>• <strong>Daily Cap:</strong> Maximum calls per day</li>
                      <li>• <strong>Priority:</strong> 1-10 routing priority</li>
                      <li>• <strong>Response Time:</strong> Average answer time tracking</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Campaign Assignment</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Assign buyers to specific campaigns</li>
                      <li>• Set different priorities per campaign</li>
                      <li>• Configure backup/overflow routing</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="twilio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Twilio Integration
                  </CardTitle>
                  <CardDescription>Connect your Twilio account for call routing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Webhook Configuration</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium">Voice Webhook URL:</p>
                      <code className="text-sm">https://your-domain.replit.app/api/webhooks/voice</code>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg mt-2">
                      <p className="text-sm font-medium">Status Callback URL:</p>
                      <code className="text-sm">https://your-domain.replit.app/api/webhooks/call-status</code>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Multiple Numbers Setup</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Create separate campaigns for each Twilio number</li>
                      <li>• Use the same webhook URLs for all numbers</li>
                      <li>• System automatically routes based on "To" number</li>
                      <li>• Track calls separately by campaign/number</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Environment Variables</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• TWILIO_ACCOUNT_SID: Your account identifier</li>
                      <li>• TWILIO_AUTH_TOKEN: Authentication token</li>
                      <li>• TWILIO_PHONE_NUMBER: Primary phone number</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rtb" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Real-Time Bidding (RTB) System
                  </CardTitle>
                  <CardDescription>Enterprise-level call auction system with live analytics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">RTB Overview</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Auction-based call distribution to multiple buyers</li>
                      <li>• Real-time bidding with live analytics and target name resolution</li>
                      <li>• External bidder integration with custom endpoints</li>
                      <li>• Winning bid selection and automatic call routing</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">RTB Components</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <strong>RTB Targets:</strong> External bidding endpoints with contact info</li>
                      <li>• <strong>RTB Routers:</strong> Auction orchestration and bidder management</li>
                      <li>• <strong>Bid Requests:</strong> Standardized bid request format with template variables</li>
                      <li>• <strong>Bid Responses:</strong> JSONPath field extraction and winner determination</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Setting Up RTB</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Create RTB targets with endpoint URLs and authentication</li>
                      <li>• Configure bid request templates with dynamic variables</li>
                      <li>• Set up response parsing using JSONPath expressions</li>
                      <li>• Assign targets to routers and enable RTB on campaigns</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">RTB Analytics (Enhanced)</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• <strong>Target Names:</strong> Analytics show meaningful names like "Premium Bid" instead of "Target 18"</li>
                      <li>• <strong>Bid Tracking:</strong> Real-time bid request and response monitoring</li>
                      <li>• <strong>Winner Analysis:</strong> Detailed winning bid information with target names</li>
                      <li>• <strong>Performance Metrics:</strong> Response times, success rates, and conversion tracking</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Template Variables</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Common Variables:</p>
                      <code className="text-xs block">
                        {`{requestId}, {campaignId}, {callerId}, {callStartTime}`}<br/>
                        {`{minBid}, {maxBid}, {currency}, {callerState}, {callerZip}`}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>RTB Security & Recent Updates</CardTitle>
                  <CardDescription>Security improvements and latest features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Security Features</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• User-scoped RTB targets and routers with ownership validation</li>
                      <li>• Secure bid request authentication with API keys and tokens</li>
                      <li>• Multi-tenancy isolation for all RTB resources</li>
                      <li>• Comprehensive security testing and validation</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recent Improvements (July 2025)</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Enhanced analytics with target name resolution</li>
                      <li>• Improved bid request details visualization</li>
                      <li>• Better tracking of winning bids and target performance</li>
                      <li>• Complete multi-tenancy security implementation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Advanced Features
                  </CardTitle>
                  <CardDescription>Advanced configuration and monitoring</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Tracking Pixels</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• JavaScript, Image, and Postback pixel support</li>
                      <li>• Dynamic macro replacement for call data</li>
                      <li>• Fire pixels on call events (start, complete, transfer)</li>
                      <li>• Real-time pixel firing and status tracking</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Analytics & Reporting</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Real-time call volume and conversion tracking</li>
                      <li>• Buyer performance metrics and response times</li>
                      <li>• Campaign-level analytics and ROI tracking</li>
                      <li>• Geographic and temporal call distribution</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Call Controls</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Call recording and playback</li>
                      <li>• Real-time call monitoring</li>
                      <li>• Call transfer and hold functionality</li>
                      <li>• Mute/unmute and conference features</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">API Integration</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• REST API for campaign and buyer management</li>
                      <li>• Webhook endpoints for external integrations</li>
                      <li>• Real-time call data streaming</li>
                      <li>• Custom reporting and analytics endpoints</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Support & Resources
                  </CardTitle>
                  <CardDescription>Get help and additional resources</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/MULTI_TWILIO_SETUP.md" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Multi-Twilio Setup Guide
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="https://www.twilio.com/docs" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Twilio Documentation
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/TWILIO_SETUP.md" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Basic Twilio Setup
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default Documentation;