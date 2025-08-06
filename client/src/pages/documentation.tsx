import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Phone, Target, BarChart3, Shield, Users, Database } from 'lucide-react';

function DocumentationPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Platform Documentation</h1>
        <Badge variant="outline">Complete Guide</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>CallCenter Pro Documentation</CardTitle>
              <CardDescription>
                Complete platform guide covering all features and workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[800px] w-full">
                <div className="prose prose-sm max-w-none space-y-6">
                  <h2>System Overview</h2>
                  <p>CallCenter Pro is a comprehensive call center management platform designed as a Ringba alternative. It provides intelligent call routing, real-time bidding (RTB), campaign management, and advanced analytics for businesses managing inbound call operations.</p>
                  
                  <h3>Core Capabilities</h3>
                  <ul>
                    <li><strong>Multi-tenancy:</strong> Complete user isolation with secure data access</li>
                    <li><strong>Real-time bidding:</strong> Auction-based call distribution with 33+ bidder support</li>
                    <li><strong>Dynamic Number Insertion:</strong> Campaign attribution through dynamic phone numbers</li>
                    <li><strong>Advanced call flows:</strong> Visual IVR builder with complex routing logic</li>
                    <li><strong>Campaign management:</strong> Complete lifecycle from creation to analytics</li>
                    <li><strong>Twilio integration:</strong> Full voice communication capabilities</li>
                    <li><strong>Enhanced reporting:</strong> Detailed analytics with RTB rejection reasons</li>
                    <li><strong>AI-powered help:</strong> Claude-based chatbot with project knowledge</li>
                  </ul>

                  <h2>Complete Website Flow</h2>
                  
                  <h3>Entry Points</h3>
                  <p><strong>Login Page:</strong> User authentication entry point with username/password login, session management, and redirect to dashboard after login.</p>
                  <p><strong>Demo Credentials:</strong> email: sumit@blinkdigital.in, password: demo1234</p>

                  <h3>Main Navigation Structure</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs">{`├── Dashboard (/)
├── Campaigns (/campaigns)
├── Buyers (/buyers)
├── Targets (/targets)
├── Publishers (/publishers)
├── Agents (/agents)
├── Phone Numbers (/phone-numbers)
├── RTB Management (/rtb-management)
├── Call Flows (/call-flows)
├── Enhanced Reporting (/enhanced-reporting)
├── Integrations (/integrations)
└── Settings (/settings)`}</pre>
                  </div>

                  <h3>User Journey Flows</h3>
                  <p><strong>Campaign Creation:</strong> Dashboard → Campaigns → Create Campaign → Configure Routing → Add Buyers → Set Numbers → Save</p>
                  <p><strong>RTB Setup:</strong> RTB Management → Add RTB Target → Configure Endpoint → Test Bidding → Assign to Campaign → Monitor Analytics</p>
                  <p><strong>Call Analytics:</strong> Enhanced Reporting → Filter Calls → Select Call → Expand Details → View RTB Analytics → See Rejection Reasons</p>

                  <h2>Authentication System</h2>
                  <h3>Login Process</h3>
                  <ol>
                    <li><strong>Access:</strong> Navigate to `/` or login page</li>
                    <li><strong>Credentials:</strong> Enter email and password</li>
                    <li><strong>Validation:</strong> Server validates against user database</li>
                    <li><strong>Session:</strong> Express session created with PostgreSQL storage</li>
                    <li><strong>Redirect:</strong> Automatic redirect to `/dashboard`</li>
                  </ol>

                  <h3>Session Management</h3>
                  <ul>
                    <li><strong>Storage:</strong> PostgreSQL-backed session store</li>
                    <li><strong>Security:</strong> Secure cookies with HTTP-only flags</li>
                    <li><strong>Multi-tenancy:</strong> User ID scoped to all data operations</li>
                  </ul>

                  <h2>Campaign Management</h2>
                  <h3>Campaign Creation Process</h3>
                  <ol>
                    <li><strong>Navigate:</strong> Dashboard → Campaigns → "Create Campaign"</li>
                    <li><strong>Basic Info:</strong> Campaign name, description, industry vertical</li>
                    <li><strong>Phone Numbers:</strong> Assign tracking numbers from pools</li>
                    <li><strong>Routing Setup:</strong> Choose routing method (Priority, Round Robin, Pool-based)</li>
                    <li><strong>Buyer Assignment:</strong> Add buyers with priority scores and caps</li>
                    <li><strong>RTB Configuration:</strong> Enable RTB, set bidding parameters</li>
                    <li><strong>Call Flows:</strong> Design IVR and routing logic</li>
                    <li><strong>Testing:</strong> Test routing with sample calls</li>
                    <li><strong>Activation:</strong> Go live with monitoring</li>
                  </ol>

                  <h3>Campaign Types & Verticals</h3>
                  <ul>
                    <li>Healthcare & Medical Services</li>
                    <li>Insurance & Financial Services</li>
                    <li>Legal Services & Law Firms</li>
                    <li>Home Services & Contractors</li>
                    <li>Education & Training Programs</li>
                    <li>Real Estate & Property</li>
                    <li>Automotive Services</li>
                    <li>Travel & Hospitality</li>
                  </ul>

                  <h2>Real-Time Bidding (RTB)</h2>
                  <h3>RTB System Features</h3>
                  <ul>
                    <li><strong>33+ Bidder Support:</strong> Comprehensive rejection reason analysis</li>
                    <li><strong>Auction Management:</strong> Real-time bid processing with timeout protection</li>
                    <li><strong>Security Features:</strong> Comprehensive error logging and audit trails</li>
                    <li><strong>Health Monitoring:</strong> Uptime tracking and error alerting</li>
                    <li><strong>Comprehensive Logging:</strong> All requests/responses/failures logged</li>
                    <li><strong>Rate Limiting:</strong> Per minute/hour/day limits</li>
                    <li><strong>Bid Expiration:</strong> Timeout handling with retry limits</li>
                  </ul>

                  <h3>RTB Configuration</h3>
                  <ol>
                    <li><strong>Target Creation:</strong> Add RTB endpoint URLs and authentication</li>
                    <li><strong>Bid Parameters:</strong> Set min/max bid amounts and currencies</li>
                    <li><strong>Geographic Targeting:</strong> Configure states and zip codes</li>
                    <li><strong>Response Mapping:</strong> Define JSON paths for bid parsing</li>
                    <li><strong>Campaign Assignment:</strong> Link targets to specific campaigns</li>
                    <li><strong>Testing & Validation:</strong> Health checks and bid testing</li>
                  </ol>

                  <h2>Enhanced Reporting & Analytics</h2>
                  <h3>RTB Analytics Features</h3>
                  <ul>
                    <li><strong>Bid Request Tracking:</strong> Complete auction details with 33 bidders</li>
                    <li><strong>Rejection Analysis:</strong> Detailed rejection reasons per bidder</li>
                    <li><strong>Performance Metrics:</strong> Response times, success rates, revenue</li>
                    <li><strong>Geographic Analysis:</strong> State and zip code performance</li>
                    <li><strong>Time-based Reports:</strong> Hourly, daily, weekly analytics</li>
                    <li><strong>Campaign Comparison:</strong> Multi-campaign performance analysis</li>
                  </ul>

                  <h2>Phone Number Management</h2>
                  <h3>Number Pool System</h3>
                  <ul>
                    <li><strong>Pool Creation:</strong> Organize numbers by campaign or geography</li>
                    <li><strong>Dynamic Assignment:</strong> Automatic number rotation</li>
                    <li><strong>Twilio Integration:</strong> Direct number provisioning</li>
                    <li><strong>Usage Tracking:</strong> Monitor number utilization</li>
                    <li><strong>Geographic Targeting:</strong> Local numbers for better conversion</li>
                  </ul>

                  <h2>Call Flow System</h2>
                  <h3>IVR Builder Features</h3>
                  <ul>
                    <li><strong>Visual Flow Builder:</strong> Drag-and-drop interface</li>
                    <li><strong>Node Types:</strong> Menu, Gather, Play, Business Hours, Router, Splitter</li>
                    <li><strong>Complex Logic:</strong> Conditional routing and A/B testing</li>
                    <li><strong>Custom Scripts:</strong> JavaScript-based custom logic</li>
                    <li><strong>Call Recording:</strong> Automatic recording with storage</li>
                  </ul>

                  <h2>Integration Capabilities</h2>
                  <h3>Supported Integrations</h3>
                  <ul>
                    <li><strong>Twilio:</strong> Voice communication and SMS</li>
                    <li><strong>RedTrack:</strong> Advanced tracking and attribution</li>
                    <li><strong>External RTB Systems:</strong> Real-time bidding integration</li>
                    <li><strong>CRM Systems:</strong> Lead management and customer data</li>
                    <li><strong>Analytics Platforms:</strong> Google Analytics, Facebook Pixel</li>
                    <li><strong>Webhooks:</strong> Custom event notifications</li>
                  </ul>

                  <h2>Security & Compliance</h2>
                  <h3>Security Features</h3>
                  <ul>
                    <li><strong>Multi-tenancy:</strong> Complete data isolation between users</li>
                    <li><strong>Complete Logging:</strong> All requests and responses logged for troubleshooting</li>
                    <li><strong>Session Security:</strong> Secure cookies and CSRF protection</li>
                    <li><strong>API Security:</strong> Rate limiting and authentication</li>
                    <li><strong>Audit Trails:</strong> Complete activity logging</li>
                    <li><strong>Data Encryption:</strong> Encrypted data storage and transmission</li>
                  </ul>

                  <h2>Technical Architecture</h2>
                  <h3>Technology Stack</h3>
                  <ul>
                    <li><strong>Frontend:</strong> React + TypeScript + Tailwind CSS</li>
                    <li><strong>Backend:</strong> Node.js + Express + TypeScript</li>
                    <li><strong>Database:</strong> PostgreSQL with Drizzle ORM</li>
                    <li><strong>Voice:</strong> Twilio SDK integration</li>
                    <li><strong>Deployment:</strong> Replit with Node.js 20</li>
                    <li><strong>State Management:</strong> TanStack React Query</li>
                  </ul>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                <span>Campaign Setup</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4" />
                <span>RTB Configuration</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Performance Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                <span>Security Features</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>User Management</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4" />
                <span>API Integration</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Support Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Technical Documentation:</strong> Comprehensive API docs</p>
              <p><strong>Integration Guides:</strong> Step-by-step setup instructions</p>
              <p><strong>Best Practices:</strong> Optimization recommendations</p>
              <p><strong>Troubleshooting:</strong> Common issues and solutions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DocumentationPage;