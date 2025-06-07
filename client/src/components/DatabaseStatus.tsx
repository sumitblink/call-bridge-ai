import { AlertCircle, CheckCircle, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DatabaseStatusProps {
  isConnected: boolean;
  error?: string;
  onRetry?: () => void;
}

export function DatabaseStatus({ isConnected, error, onRetry }: DatabaseStatusProps) {
  if (isConnected) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Connected to Supabase database successfully
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="space-y-2">
          <p>Database connection failed. Please ensure your Supabase DATABASE_URL is correctly configured.</p>
          {error && (
            <p className="text-sm font-mono bg-red-100 p-2 rounded">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-sm">
              Expected format: postgresql://postgres.xxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
            </span>
          </div>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry Connection
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}