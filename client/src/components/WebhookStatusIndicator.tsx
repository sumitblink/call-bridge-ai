import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface WebhookStatusIndicatorProps {
  status: 'configured' | 'pending' | 'error';
  message?: string;
}

export function WebhookStatusIndicator({ status, message }: WebhookStatusIndicatorProps) {
  const statusConfig = {
    configured: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      label: "Webhooks Configured",
      badgeVariant: "default" as const
    },
    pending: {
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      label: "Webhook Update Pending",
      badgeVariant: "secondary" as const
    },
    error: {
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      label: "Webhook Configuration Error",
      badgeVariant: "destructive" as const
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${config.bg} ${config.border}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <div className="flex-1">
        <Badge variant={config.badgeVariant} className="text-xs">
          {config.label}
        </Badge>
        {message && (
          <p className={`text-xs mt-1 ${config.color}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}