import Layout from '@/components/Layout';
import { RedtrackConfigManager } from '@/components/RedtrackConfigManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Zap, Target, TrendingUp } from 'lucide-react';

export default function RedTrackPage() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">RedTrack Integration</h1>
          <p className="text-muted-foreground">
            Configure RedTrack attribution tracking for advanced campaign optimization and postback management
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-500" />
                Click Attribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Capture clickid parameters from RedTrack campaigns for precise attribution tracking
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-green-500" />
                Real-time Postbacks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatically send conversion events to RedTrack for optimization and reporting
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Campaign Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enable RedTrack's AI-powered campaign optimization with conversion data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Integration Information */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              How RedTrack Integration Works
            </CardTitle>
            <CardDescription>
              Complete attribution flow from click to conversion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">1. Click Tracking</h4>
                <p className="text-sm text-muted-foreground">
                  RedTrack sends visitors to your landing pages with clickid parameters. Our system automatically captures and stores these for attribution.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Session Management</h4>
                <p className="text-sm text-muted-foreground">
                  Visitor sessions are tracked with RedTrack campaign data, including offer IDs and campaign information for precise tracking.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Conversion Events</h4>
                <p className="text-sm text-muted-foreground">
                  When calls are made or forms submitted, conversion events are created with revenue data and attribution details.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. Postback Delivery</h4>
                <p className="text-sm text-muted-foreground">
                  Conversion data is automatically sent to RedTrack via postback URLs for optimization and performance tracking.
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Sample Postback URL Format</h4>
              <div className="bg-white dark:bg-gray-900 p-3 rounded font-mono text-sm border">
                https://your.redtrack.domain/postback?clickid={'{'}clickid{'}'}&sum=20&type=ConvertedCall
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Postbacks include clickid for attribution, revenue amount, and conversion type
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Manager */}
        <RedtrackConfigManager />
      </div>
    </Layout>
  );
}