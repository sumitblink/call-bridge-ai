import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, Database, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");

  const clearDatabaseMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/clear-database', 'POST'),
    onSuccess: () => {
      toast({
        title: "Database Cleared",
        description: "All data has been successfully cleared from the database.",
      });
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries();
      setConfirmText("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear database",
        variant: "destructive",
      });
    },
  });

  const handleClearDatabase = () => {
    clearDatabaseMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your system configuration and data</p>
      </div>

      {/* Database Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>
            Manage your database and system data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Database operations are permanent and cannot be undone. 
              Make sure you have backups before proceeding.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Clear All Database Data
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                This will permanently delete all data including:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 mb-4 space-y-1">
                <li>• All campaigns and their configurations</li>
                <li>• All buyer and agent records</li>
                <li>• All call history and logs</li>
                <li>• All phone numbers and assignments</li>
                <li>• All tracking and integration data</li>
                <li>• Publisher and affiliate data</li>
              </ul>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    disabled={clearDatabaseMutation.isPending}
                  >
                    {clearDatabaseMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Clearing Database...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Database Data
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>This action cannot be undone. This will permanently delete:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>All campaigns and buyer assignments</li>
                        <li>Complete call history and recordings</li>
                        <li>All phone numbers and configurations</li>
                        <li>Publisher and integration data</li>
                        <li>User preferences and settings</li>
                      </ul>
                      <p className="font-semibold text-red-600">
                        Type "CLEAR DATABASE" to confirm this action:
                      </p>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type CLEAR DATABASE"
                        className="w-full p-2 border rounded mt-2"
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearDatabase}
                      disabled={confirmText !== "CLEAR DATABASE"}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Clear Database
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Current system status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Environment</h4>
              <p className="text-muted-foreground">Development Mode</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Database</h4>
              <p className="text-muted-foreground">PostgreSQL (Connected)</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Twilio Integration</h4>
              <p className="text-muted-foreground">Active</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Webhook Status</h4>
              <p className="text-muted-foreground">Configured</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}