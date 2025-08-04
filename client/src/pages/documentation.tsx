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
              <ScrollArea className="h-96 w-full">
                <div className="prose prose-sm max-w-none">
                  <h2>Platform Overview</h2>
                  <p>CallCenter Pro is a comprehensive call center management platform designed to streamline inbound call campaigns, intelligent call routing, and performance tracking across diverse industries and verticals.</p>
                  
                  <h3>Key Features</h3>
                  <ul>
                    <li><strong>Campaign Management:</strong> Create and manage multi-industry campaigns</li>
                    <li><strong>Intelligent Call Routing:</strong> Priority, round-robin, and pool-based routing</li>
                    <li><strong>Real-Time Bidding (RTB):</strong> Direct campaign-to-RTB target assignments</li>
                    <li><strong>Dynamic Number Insertion (DNI):</strong> Ultra-fast DNI service with caching</li>
                    <li><strong>Advanced Analytics:</strong> Detailed call logs and performance metrics</li>
                    <li><strong>IVR System:</strong> Advanced call flow capabilities</li>
                  </ul>

                  <h3>Getting Started</h3>
                  <ol>
                    <li><strong>Create a Campaign:</strong> Navigate to Campaigns → New Campaign</li>
                    <li><strong>Set up Phone Numbers:</strong> Add numbers via Phone Numbers section</li>
                    <li><strong>Configure Buyers:</strong> Add buyer endpoints for call routing</li>
                    <li><strong>Enable RTB:</strong> Configure real-time bidding targets</li>
                    <li><strong>Monitor Performance:</strong> Use Enhanced Reporting for analytics</li>
                  </ol>

                  <h3>Campaign Types</h3>
                  <p>The platform supports campaigns across multiple verticals:</p>
                  <ul>
                    <li>Healthcare & Medical</li>
                    <li>Insurance & Financial Services</li>
                    <li>Legal Services</li>
                    <li>Home Services & Contractors</li>
                    <li>Education & Training</li>
                    <li>Real Estate</li>
                  </ul>

                  <h3>Call Routing Methods</h3>
                  <p><strong>Priority Routing:</strong> Calls routed to buyers based on priority scores</p>
                  <p><strong>Round Robin:</strong> Equal distribution across available buyers</p>
                  <p><strong>Pool-Based:</strong> Calls distributed within specific buyer pools</p>

                  <h3>Real-Time Bidding (RTB)</h3>
                  <p>Advanced RTB system supporting:</p>
                  <ul>
                    <li>External bidder integration</li>
                    <li>Rate limiting and bid expiration</li>
                    <li>Comprehensive audit trails</li>
                    <li>Phone number obfuscation for security</li>
                    <li>Health monitoring and uptime tracking</li>
                  </ul>

                  <h3>Security Features</h3>
                  <ul>
                    <li>Multi-tenancy with user-scoped data filtering</li>
                    <li>Phone number obfuscation (555***1234 format)</li>
                    <li>Timeout protection for external requests</li>
                    <li>Comprehensive bid logging</li>
                    <li>Session-based authentication</li>
                  </ul>

                  <h3>Integration Capabilities</h3>
                  <p>The platform integrates with:</p>
                  <ul>
                    <li><strong>Twilio:</strong> Voice communication and number provisioning</li>
                    <li><strong>RedTrack:</strong> Advanced tracking and attribution</li>
                    <li><strong>External RTB Systems:</strong> Real-time bidding integration</li>
                    <li><strong>CRM Systems:</strong> Lead management and customer data</li>
                  </ul>

                  <h3>Analytics & Reporting</h3>
                  <p>Comprehensive reporting includes:</p>
                  <ul>
                    <li>Call volume and duration metrics</li>
                    <li>Campaign performance analytics</li>
                    <li>RTB auction details and bid responses</li>
                    <li>Revenue tracking and ROI analysis</li>
                    <li>Geographic performance data</li>
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