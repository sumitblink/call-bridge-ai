import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneNumberTagsManager } from "@/components/reporting/PhoneNumberTagsManager";
import { EnhancedCallDetails } from "@/components/reporting/EnhancedCallDetails";
import { BarChart3, Phone, Tag, TrendingUp } from "lucide-react";

export default function EnhancedReporting() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Enhanced Reporting</h1>
          <p className="text-gray-600">
            Advanced call analytics with tagged number attribution and comprehensive call details
          </p>
        </div>

        <Tabs defaultValue="call-details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="call-details" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Details
            </TabsTrigger>
            <TabsTrigger value="phone-tags" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Phone Tags
            </TabsTrigger>
            <TabsTrigger value="attribution" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Attribution
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="call-details">
            <EnhancedCallDetails />
          </TabsContent>

          <TabsContent value="phone-tags">
            <PhoneNumberTagsManager />
          </TabsContent>

          <TabsContent value="attribution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Attribution Analysis
                </CardTitle>
                <CardDescription>
                  Track call attribution across different traffic sources and tags
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Attribution Analysis Coming Soon</h3>
                  <p>Advanced attribution tracking with multi-touch analysis and conversion paths will be available in the next phase.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Detailed performance analytics for tagged numbers and campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Performance Metrics Coming Soon</h3>
                  <p>Comprehensive performance analytics with ROI tracking, conversion metrics, and optimization recommendations.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}