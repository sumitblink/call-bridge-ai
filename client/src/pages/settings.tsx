import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Server, Phone, Webhook } from "lucide-react";
import Layout from "@/components/Layout";

export default function SettingsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">View system configuration and status</p>
        </div>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>
              Current system status and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <Server className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Environment</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Development Mode</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <Database className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Database</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">PostgreSQL (Connected)</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <Phone className="h-5 w-5 text-purple-600" />
                  <div>
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">Twilio Integration</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Active & Configured</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <Webhook className="h-5 w-5 text-orange-600" />
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Webhook Status</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Configured & Ready</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Features */}
        <Card>
          <CardHeader>
            <CardTitle>Active Features</CardTitle>
            <CardDescription>
              Currently enabled system capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-semibold mb-2">Call Routing</h4>
                <p className="text-sm text-muted-foreground">Intelligent campaign-based routing</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-semibold mb-2">DNI Tracking</h4>
                <p className="text-sm text-muted-foreground">Dynamic number insertion</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-semibold mb-2">RTB System</h4>
                <p className="text-sm text-muted-foreground">Real-time bidding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}