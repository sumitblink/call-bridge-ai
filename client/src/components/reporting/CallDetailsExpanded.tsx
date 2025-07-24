import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Clock, 
  Activity,
  Zap,
  Info
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
    <div className="space-y-3">
      {/* Simple Header */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <Phone className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-medium">Call Details</h4>
        </div>
        
        {/* Basic Info Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-gray-700 p-2 rounded text-xs">
            <div className="text-gray-500">Call ID</div>
            <div className="font-mono truncate">{call.callSid}</div>
          </div>
          <div className="bg-white dark:bg-gray-700 p-2 rounded text-xs">
            <div className="text-gray-500">Campaign</div>
            <div className="truncate">{campaign?.name || 'Unknown'}</div>
          </div>
          <div className="bg-white dark:bg-gray-700 p-2 rounded text-xs">
            <div className="text-gray-500">Location</div>
            <div className="truncate">{call.city && call.state ? `${call.city}, ${call.state}` : 'Unknown'}</div>
          </div>
        </div>
      </div>

      {/* IVR & Call Flow */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <h5 className="text-sm font-medium">IVR & Call Flow</h5>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Flow Execution: {call.flowExecutionId || 'N/A'}</div>
          <div>Ring Tree: {call.ringTreeId || 'N/A'}</div>
          <div>Routing Attempts: {call.routingAttempts || 0}</div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-gray-500" />
          <h5 className="text-sm font-medium">Technical Details</h5>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Device:</span>
            <div>{call.deviceType || 'Unknown'}</div>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <div>{formatDuration(call.duration)}</div>
          </div>
          <div>
            <span className="text-gray-500">Revenue:</span>
            <div className="text-green-600 font-medium">{formatCurrency(call.revenue)}</div>
          </div>
          <div>
            <span className="text-gray-500">Payout:</span>
            <div className="text-blue-600 font-medium">{formatCurrency(call.payout)}</div>
          </div>
        </div>
      </div>

      {/* Routing Journey */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <h5 className="text-sm font-medium">Routing Journey</h5>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Publisher: {call.publisherName || 'No Publisher'}</div>
          <div>Buyer: {buyer?.name || 'No Buyer'}</div>
          <div>Pool ID: {call.numberPoolId || 'Direct'}</div>
          <div>Status: <Badge variant="secondary" className="text-xs">{call.status}</Badge></div>
        </div>
      </div>
    </div>
  );
}