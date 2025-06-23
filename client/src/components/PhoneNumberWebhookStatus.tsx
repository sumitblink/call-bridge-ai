import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Minus } from "lucide-react";

interface PhoneNumberWebhookStatusProps {
  phoneNumber: any;
  poolId?: number;
  campaignId?: number;
}

export function PhoneNumberWebhookStatus({ phoneNumber, poolId, campaignId }: PhoneNumberWebhookStatusProps) {
  const getWebhookStatus = () => {
    // Check if number is assigned to a pool or campaign
    if (poolId) {
      return {
        status: 'pool',
        label: 'Pool Routing',
        icon: CheckCircle2,
        color: 'text-blue-600',
        variant: 'default' as const,
        description: `Pool webhook configured`
      };
    } else if (campaignId || phoneNumber.campaignId) {
      return {
        status: 'campaign',
        label: 'Campaign Routing',
        icon: CheckCircle2,
        color: 'text-green-600',
        variant: 'default' as const,
        description: 'Direct campaign webhook'
      };
    } else {
      return {
        status: 'unassigned',
        label: 'Unassigned',
        icon: Minus,
        color: 'text-gray-500',
        variant: 'secondary' as const,
        description: 'No webhook configured'
      };
    }
  };

  const config = getWebhookStatus();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${config.color}`} />
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    </div>
  );
}