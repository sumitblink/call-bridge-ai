import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Phone, 
  Users, 
  Target, 
  Settings, 
  BarChart3, 
  Webhook, 
  PlayCircle,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
  Code,
  Zap,
  Database,
  Globe,
  Clock,
  Shield,
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";

export default function Documentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to App
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">CallCenter Pro Documentation</h1>
              </div>
            </div>
            <Badge variant="secondary">v1.0</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Navigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
                    <a href="#quick-start">
                      <PlayCircle className="h-3 w-3 mr-2" />
                      Quick Start
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
                    <a href="#campaigns">
                      <Target className="h-3 w-3 mr-2" />
                      Campaigns
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
                    <a href="#buyers">
                      <Users className="h-3 w-3 mr-2" />
                      Buyers
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
                    <a href="#twilio">
                      <Phone className="h-3 w-3 mr-2" />
                      Twilio Setup
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
                    <a href="#advanced">
                      <Settings className="h-3 w-3 mr-2" />
                      Advanced
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
                    <a href="#api">
                      <Code className="h-3 w-3 mr-2" />
                      API Reference
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Documentation Content */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              
              {/* Introduction */}
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      Welcome to CallCenter Pro
                    </CardTitle>
                    <CardDescription>
                      Complete call center management platform with advanced Twilio integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">
                      CallCenter Pro is a sophisticated call routing and management platform designed for lead generation businesses, 
                      call centers, and any organization that needs intelligent call distribution. Built with modern technologies 
                      and Twilio integration, it provides real-time call routing, comprehensive analytics, and advanced tracking capabilities.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Phone className="h-8 w-8 text-blue-600 mb-2" />
                        <h3 className="font-semibold text-gray-900">Call Routing</h3>
                        <p className="text-sm text-gray-600">Intelligent call distribution with multiple routing algorithms</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
                        <h3 className="font-semibold text-gray-900">Analytics</h3>
                        <p className="text-sm text-gray-600">Real-time reporting and performance tracking</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <Zap className="h-8 w-8 text-purple-600 mb-2" />
                        <h3 className="font-semibold text-gray-900">Integrations</h3>
                        <p className="text-sm text-gray-600">Seamless integration with CRMs and third-party tools</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Quick Start */}
              <section id="quick-start">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PlayCircle className="h-5 w-5 text-green-600" />
                      Quick Start Guide
                    </CardTitle>
                    <CardDescription>Get your call center running in 5 minutes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Step 1 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Badge variant="default" className="w-8 h-8 rounded-full flex items-center justify-center">1</Badge>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Create Your First Campaign</h3>
                        <p className="text-gray-600 mb-3">
                          Campaigns organize your call routing by traffic source, business line, or phone number. Each campaign can have unique settings and buyer assignments.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Steps:</h4>
                          <ol className="text-sm space-y-1 text-gray-600">
                            <li>• Navigate to <strong>Campaigns</strong> in the sidebar</li>
                            <li>• Click <strong>"New Campaign"</strong></li>
                            <li>• Enter campaign name (e.g., "Lead Gen - Primary")</li>
                            <li>• Set your Twilio phone number</li>
                            <li>• Configure routing type (Round Robin recommended for starters)</li>
                            <li>• Set call caps and concurrency limits</li>
                            <li>• Save your campaign</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Step 2 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Badge variant="default" className="w-8 h-8 rounded-full flex items-center justify-center">2</Badge>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Add Your Buyers</h3>
                        <p className="text-gray-600 mb-3">
                          Buyers are the recipients of your calls - lead buyers, sales agents, or any phone number that should receive routed calls.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Required Information:</h4>
                          <ul className="text-sm space-y-1 text-gray-600">
                            <li>• <strong>Name:</strong> Buyer or agent identifier</li>
                            <li>• <strong>Phone Number:</strong> Must include country code (e.g., +1234567890)</li>
                            <li>• <strong>Email:</strong> For notifications and reporting</li>
                            <li>• <strong>Priority:</strong> 1-10 scale (10 = highest priority)</li>
                            <li>• <strong>Daily Cap:</strong> Maximum calls per day</li>
                            <li>• <strong>Concurrency Limit:</strong> Simultaneous calls allowed</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Step 3 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Badge variant="default" className="w-8 h-8 rounded-full flex items-center justify-center">3</Badge>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Assign Buyers to Campaign</h3>
                        <p className="text-gray-600 mb-3">
                          Connect your buyers to specific campaigns to control call routing and distribution.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Assignment Process:</h4>
                          <ol className="text-sm space-y-1 text-gray-600">
                            <li>• Go to your campaign details page</li>
                            <li>• Click <strong>"Manage Buyers"</strong></li>
                            <li>• Select buyers from your buyer list</li>
                            <li>• Set campaign-specific priority for each buyer</li>
                            <li>• Configure any campaign-specific settings</li>
                            <li>• Save buyer assignments</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Step 4 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Badge variant="default" className="w-8 h-8 rounded-full flex items-center justify-center">4</Badge>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Configure Twilio Webhooks</h3>
                        <p className="text-gray-600 mb-3">
                          Connect your Twilio phone numbers to the platform for automatic call routing.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-medium mb-2 text-blue-900">Webhook URLs:</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <strong className="text-blue-900">Voice Webhook:</strong>
                              <code className="ml-2 bg-blue-100 px-2 py-1 rounded text-blue-800">
                                https://your-domain.replit.app/api/webhooks/voice
                              </code>
                            </div>
                            <div>
                              <strong className="text-blue-900">Status Callback:</strong>
                              <code className="ml-2 bg-blue-100 px-2 py-1 rounded text-blue-800">
                                https://your-domain.replit.app/api/webhooks/call-status
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </section>

              {/* Campaign Management */}
              <section id="campaigns">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Campaign Management
                    </CardTitle>
                    <CardDescription>Advanced campaign configuration and routing strategies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Campaign Types & Use Cases</h3>
                        <div className="space-y-3">
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900">Lead Generation</h4>
                            <p className="text-sm text-gray-600">Route inbound leads to qualified buyers based on geography, time, or capacity</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900">Customer Support</h4>
                            <p className="text-sm text-gray-600">Distribute support calls to available agents with skill-based routing</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900">Sales Teams</h4>
                            <p className="text-sm text-gray-600">Route qualified prospects to sales representatives based on performance</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Routing Algorithms</h3>
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900">Round Robin</h4>
                            <p className="text-sm text-blue-700">Distributes calls evenly across all available buyers</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900">Priority-Based</h4>
                            <p className="text-sm text-green-700">Routes to highest priority buyers first</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900">Geographic</h4>
                            <p className="text-sm text-purple-700">Routes based on caller's location</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <h4 className="font-medium text-orange-900">Time-Based</h4>
                            <p className="text-sm text-orange-700">Different routing rules by time of day</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Campaign Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Basic Settings</h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• <strong>Campaign Name:</strong> Descriptive identifier</li>
                              <li>• <strong>Phone Number:</strong> Associated Twilio number</li>
                              <li>• <strong>Status:</strong> Active, Paused, or Inactive</li>
                              <li>• <strong>Description:</strong> Campaign purpose and notes</li>
                            </ul>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Advanced Settings</h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• <strong>Call Cap:</strong> Daily maximum calls</li>
                              <li>• <strong>Max Concurrent:</strong> Simultaneous calls allowed</li>
                              <li>• <strong>Geo Targeting:</strong> Allowed states/regions</li>
                              <li>• <strong>Time Restrictions:</strong> Operating hours</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
                        <div className="ml-3">
                          <h4 className="font-medium text-yellow-900">Best Practice</h4>
                          <p className="text-sm text-yellow-800 mt-1">
                            Create separate campaigns for different traffic sources, phone numbers, or business objectives. 
                            This allows for better tracking, optimization, and buyer management.
                          </p>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </section>

              {/* Buyer Management */}
              <section id="buyers">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Buyer Management
                    </CardTitle>
                    <CardDescription>Comprehensive buyer configuration and performance optimization</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Buyer Profile Setup</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Full name and company details</li>
                              <li>• Primary phone number (with country code)</li>
                              <li>• Email address for notifications</li>
                              <li>• Alternative contact methods</li>
                            </ul>
                          </div>
                          
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-900 mb-2">Capacity Settings</h4>
                            <ul className="text-sm space-y-1 text-gray-600">
                              <li>• Daily call cap (0 = unlimited)</li>
                              <li>• Concurrent call limit</li>
                              <li>• Operating hours and timezone</li>
                              <li>• Holiday and break schedules</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Performance Metrics</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">Key Metrics</h4>
                            <ul className="text-sm space-y-1 text-blue-700">
                              <li>• Answer rate percentage</li>
                              <li>• Average response time</li>
                              <li>• Conversion rate</li>
                              <li>• Call duration averages</li>
                            </ul>
                          </div>
                          
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-2">Quality Scores</h4>
                            <ul className="text-sm space-y-1 text-green-700">
                              <li>• Call quality ratings</li>
                              <li>• Customer satisfaction scores</li>
                              <li>• Reliability metrics</li>
                              <li>• Performance trends</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Priority and Routing</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <h4 className="font-medium text-red-900 mb-2">High Priority (8-10)</h4>
                          <p className="text-sm text-red-700">Top performers, premium buyers, exclusive leads</p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="font-medium text-yellow-900 mb-2">Medium Priority (4-7)</h4>
                          <p className="text-sm text-yellow-700">Standard buyers, consistent performers</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">Low Priority (1-3)</h4>
                          <p className="text-sm text-gray-700">Backup buyers, overflow routing</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Campaign Assignment Strategies</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900">Dedicated Assignment</h4>
                          <p className="text-sm text-blue-700">Assign specific buyers to particular campaigns only</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900">Shared Pool</h4>
                          <p className="text-sm text-green-700">Allow buyers to receive calls from multiple campaigns</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <h4 className="font-medium text-purple-900">Overflow Routing</h4>
                          <p className="text-sm text-purple-700">Configure backup buyers for when primary buyers are unavailable</p>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </section>

              {/* Twilio Setup */}
              <section id="twilio">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-purple-600" />
                      Twilio Integration Setup
                    </CardTitle>
                    <CardDescription>Complete guide for connecting multiple Twilio phone numbers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex">
                        <Info className="h-5 w-5 text-blue-600 mt-1" />
                        <div className="ml-3">
                          <h4 className="font-medium text-blue-900">Prerequisites</h4>
                          <ul className="text-sm text-blue-800 mt-1 space-y-1">
                            <li>• Active Twilio account with phone numbers</li>
                            <li>• Account SID and Auth Token from Twilio Console</li>
                            <li>• Domain or Replit URL for webhook configuration</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Environment Configuration</h3>
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <pre className="text-green-400 text-sm">
{`# Required Environment Variables
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Database Configuration
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_session_secret`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Webhook Configuration in Twilio Console</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Step-by-Step Process</h4>
                          <ol className="text-sm space-y-2 text-gray-600">
                            <li>1. Log into your Twilio Console</li>
                            <li>2. Navigate to <strong>Phone Numbers → Manage → Active Numbers</strong></li>
                            <li>3. Click on each phone number you want to configure</li>
                            <li>4. In the Voice & Fax section, set:</li>
                            <li className="ml-4">• Webhook: <code className="bg-gray-200 px-1">https://your-domain.replit.app/api/webhooks/voice</code></li>
                            <li className="ml-4">• HTTP Method: POST</li>
                            <li>5. In the Status Callback section, set:</li>
                            <li className="ml-4">• URL: <code className="bg-gray-200 px-1">https://your-domain.replit.app/api/webhooks/call-status</code></li>
                            <li>6. Save configuration for each number</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Multiple Phone Number Setup</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-900 mb-2">Recommended Approach</h4>
                          <ul className="text-sm space-y-1 text-green-700">
                            <li>• Create separate campaigns for each number</li>
                            <li>• Assign unique buyer pools per campaign</li>
                            <li>• Use same webhook URLs for all numbers</li>
                            <li>• System auto-routes based on "To" number</li>
                          </ul>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="font-medium text-yellow-900 mb-2">Example Configuration</h4>
                          <ul className="text-sm space-y-1 text-yellow-700">
                            <li>• Number 1: Lead Gen Campaign A</li>
                            <li>• Number 2: Lead Gen Campaign B</li>
                            <li>• Number 3: Customer Support</li>
                            <li>• Different buyers for each campaign</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Testing Your Setup</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900">Webhook Testing</h4>
                          <p className="text-sm text-blue-700">Use Twilio's webhook testing tools to verify endpoint connectivity</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900">Test Calls</h4>
                          <p className="text-sm text-green-700">Make test calls to each number to verify routing works correctly</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <h4 className="font-medium text-purple-900">Log Monitoring</h4>
                          <p className="text-sm text-purple-700">Check application logs for webhook calls and routing decisions</p>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </section>

              {/* Advanced Features */}
              <section id="advanced">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-gray-600" />
                      Advanced Features
                    </CardTitle>
                    <CardDescription>Tracking pixels, analytics, and integrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Tracking Pixels</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2">JavaScript Pixels</h4>
                          <p className="text-sm text-blue-700 mb-2">Dynamic tracking with custom parameters</p>
                          <div className="bg-blue-100 p-2 rounded text-xs">
                            <code>&lt;script&gt;...&lt;/script&gt;</code>
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-900 mb-2">Image Pixels</h4>
                          <p className="text-sm text-green-700 mb-2">Simple 1x1 image tracking</p>
                          <div className="bg-green-100 p-2 rounded text-xs">
                            <code>&lt;img src="..."&gt;</code>
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h4 className="font-medium text-purple-900 mb-2">Postback URLs</h4>
                          <p className="text-sm text-purple-700 mb-2">Server-to-server notifications</p>
                          <div className="bg-purple-100 p-2 rounded text-xs">
                            <code>HTTP POST/GET</code>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Available Macros</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <code className="bg-gray-200 p-1 rounded">{'{call_id}'}</code>
                          <code className="bg-gray-200 p-1 rounded">{'{campaign_id}'}</code>
                          <code className="bg-gray-200 p-1 rounded">{'{phone_number}'}</code>
                          <code className="bg-gray-200 p-1 rounded">{'{timestamp}'}</code>
                          <code className="bg-gray-200 p-1 rounded">{'{duration}'}</code>
                          <code className="bg-gray-200 p-1 rounded">{'{status}'}</code>
                          <code className="bg-gray-200 p-1 rounded">{'{buyer_id}'}</code>
                          <code className="bg-gray-200 p-1 rounded">{'{recording_url}'}</code>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Call Controls</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Real-time Controls</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Call Recording:</strong> Automatic or manual recording with playback
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Call Transfer:</strong> Transfer calls between buyers or agents
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Hold/Resume:</strong> Put calls on hold with custom music
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Monitoring Features</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Live Dashboard:</strong> Real-time call status and metrics
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Call Logs:</strong> Detailed call history and recordings
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <strong>Performance Analytics:</strong> Conversion and quality metrics
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Integrations</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Database className="h-4 w-4 mr-2" />
                            CRM Integration
                          </h4>
                          <ul className="text-sm space-y-1 text-gray-600">
                            <li>• Salesforce connector</li>
                            <li>• HubSpot integration</li>
                            <li>• Custom webhook endpoints</li>
                            <li>• Real-time lead sync</li>
                          </ul>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Globe className="h-4 w-4 mr-2" />
                            Third-party Tools
                          </h4>
                          <ul className="text-sm space-y-1 text-gray-600">
                            <li>• Google Analytics</li>
                            <li>• Facebook Conversions API</li>
                            <li>• Zapier automation</li>
                            <li>• Custom API endpoints</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </section>

              {/* API Reference */}
              <section id="api">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-indigo-600" />
                      API Reference
                    </CardTitle>
                    <CardDescription>RESTful API endpoints for integration and automation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Authentication</h3>
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <pre className="text-green-400 text-sm">
{`POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}

# Response
{
  "message": "Login successful",
  "user": { ... }
}`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Campaign API</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">GET /api/campaigns</h4>
                          <p className="text-sm text-gray-600 mb-2">Retrieve all campaigns for authenticated user</p>
                          <div className="bg-white p-2 rounded border text-xs">
                            <code>Authorization: Bearer {'{token}'}</code>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">POST /api/campaigns</h4>
                          <p className="text-sm text-gray-600 mb-2">Create new campaign</p>
                          <div className="bg-white p-2 rounded border text-xs">
                            <code>{"{ name, phoneNumber, routingType }"}</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Buyer API</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">GET /api/buyers</h4>
                          <p className="text-sm text-gray-600 mb-2">List all buyers</p>
                          <div className="bg-white p-2 rounded border text-xs">
                            <code>Returns: [{"{ id, name, phoneNumber, ... }"}]</code>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">POST /api/buyers</h4>
                          <p className="text-sm text-gray-600 mb-2">Add new buyer</p>
                          <div className="bg-white p-2 rounded border text-xs">
                            <code>{"{ name, email, phoneNumber, priority }"}</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Webhook Endpoints</h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900">POST /api/webhooks/voice</h4>
                          <p className="text-sm text-blue-700">Twilio voice webhook for incoming calls</p>
                          <div className="mt-2 bg-blue-100 p-2 rounded text-xs">
                            <code>Accepts: To, From, CallSid, CallStatus</code>
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-900">POST /api/webhooks/call-status</h4>
                          <p className="text-sm text-green-700">Call status updates from Twilio</p>
                          <div className="mt-2 bg-green-100 p-2 rounded text-xs">
                            <code>Accepts: CallSid, CallStatus, CallDuration</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
                        <div className="ml-3">
                          <h4 className="font-medium text-yellow-900">Rate Limiting</h4>
                          <p className="text-sm text-yellow-800 mt-1">
                            API requests are limited to 1000 requests per hour per authenticated user. 
                            Contact support for higher limits if needed.
                          </p>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </section>

              {/* Support */}
              <section>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-purple-600" />
                      Support & Resources
                    </CardTitle>
                    <CardDescription>Additional help and community resources</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                        <a href="/MULTI_TWILIO_SETUP.md" target="_blank" rel="noopener noreferrer">
                          <div className="text-left">
                            <div className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              <strong>Multi-Twilio Setup Guide</strong>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Detailed guide for multiple phone numbers</p>
                          </div>
                        </a>
                      </Button>
                      <Button variant="outline" className="h-auto p-4 justify-start" asChild>
                        <a href="https://www.twilio.com/docs" target="_blank" rel="noopener noreferrer">
                          <div className="text-left">
                            <div className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              <strong>Twilio Documentation</strong>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Official Twilio API documentation</p>
                          </div>
                        </a>
                      </Button>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">Demo Accounts</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded border">
                          <strong className="text-sm">Account 1:</strong><br />
                          <code className="text-xs">sumit@example.com / demo123</code>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <strong className="text-sm">Account 2:</strong><br />
                          <code className="text-xs">kiran@example.com / kiran123</code>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}