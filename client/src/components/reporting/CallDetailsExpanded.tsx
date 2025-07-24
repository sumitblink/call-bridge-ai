import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Clock, 
  Activity,
  Zap,
  Info,
  Users
} from "lucide-react";

interface Call {
  id: number;
  campaignId: string;
  buyerId?: number;
  publisherId?: number;
  publisherName?: string;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  dialedNumber?: string;
  duration: number;
  ringTime?: number;
  talkTime?: number;
  status: string;
  disposition?: string;
  hangupCause?: string;
  callQuality?: string;
  connectionTime?: number;
  cost: string;
  payout: string;
  revenue: string;
  profit: string;
  margin?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  city?: string;
  state?: string;
  country?: string;
  deviceType?: string;
  userAgent?: string;
  recordingUrl?: string;
  transcription?: string;
  flowExecutionId?: string;
  ringTreeId?: string;
  routingAttempts?: number;
  numberPoolId?: number;
  createdAt?: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface Buyer {
  id: number;
  name: string;
  email?: string;
  phoneNumber?: string;
}

interface CallDetailsExpandedProps {
  call: Call;
  campaign?: Campaign;
  buyer?: Buyer;
}

export function CallDetailsExpanded({ call, campaign, buyer }: CallDetailsExpandedProps) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t">
      {/* Call Details */}
      <div className="flex items-center gap-2 mb-3">
        <Phone className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-sm">Call Details</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
        <div>
          <span className="text-gray-500">Call ID:</span>
          <span className="ml-2 font-mono">{call.callSid}</span>
        </div>
        <div>
          <span className="text-gray-500">Campaign:</span>
          <span className="ml-2">{campaign?.name || 'Unknown'}</span>
        </div>
      </div>

      {/* IVR & Call Flow */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-sm">IVR & Call Flow</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
        <div>
          <span className="text-gray-500">From:</span>
          <span className="ml-2">{call.fromNumber}</span>
        </div>
        <div>
          <span className="text-gray-500">Duration:</span>
          <span className="ml-2">{formatDuration(call.duration)}</span>
        </div>
      </div>

      {/* Technical Details */}
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-sm">Technical Details</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
        <div>
          <span className="text-gray-500">Recording:</span>
          <span className="ml-2">{call.recordingUrl ? 'Available' : 'Not available'}</span>
        </div>
        <div>
          <span className="text-gray-500">Quality:</span>
          <span className="ml-2">{call.callQuality || 'Not rated'}</span>
        </div>
      </div>

      {/* Routing Journey */}
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-blue-500" />
        <span className="font-medium text-sm">Routing Journey</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <span className="text-gray-500">Campaign:</span>
          <span className="ml-2">{campaign?.name || 'Unknown'}</span>
        </div>
        <div>
          <span className="text-gray-500">Revenue:</span>
          <span className="ml-2">{formatCurrency(call.revenue)}</span>
        </div>
      </div>
    </div>
  );
}