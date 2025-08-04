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
  recordingSid?: string;
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
  call: Call & {
    buyer?: {
      id: number;
      name?: string;
      companyName?: string;
      email?: string;
      phoneNumber?: string;
    };
    campaign?: {
      id: string;
      name: string;
    };
  };
}

export function CallDetailsExpanded({ call }: CallDetailsExpandedProps) {
  const campaign = call.campaign;
  const buyer = call.buyer;
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
      <div className="space-y-3 text-sm">
        {/* First Row - Start directly with Call ID and Campaign */}
        <div className="flex flex-wrap gap-x-8 gap-y-2">
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
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <span className="font-medium">IVR & Call Flow</span>
        </div>
        
        <div className="flex flex-wrap gap-x-8 gap-y-2">
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
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gray-500" />
          <span className="font-medium">Technical Details</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <span className="text-gray-500">Recording:</span>
            {call.recordingSid ? (
              <div className="mt-2">
                <audio controls className="w-full max-w-md">
                  <source src={`/api/recordings/${call.recordingSid}`} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <div className="text-xs text-gray-400 mt-1">
                  Status: Available | SID: {call.recordingSid}
                </div>
              </div>
            ) : (
              <span className="ml-2">Not available</span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Quality:</span>
            <span className="ml-2">{call.callQuality || 'Not rated'}</span>
          </div>
        </div>

        {/* Routing Journey */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="font-medium">Routing Journey</span>
        </div>
        
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <span className="text-gray-500">Campaign:</span>
            <span className="ml-2">{campaign?.name || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-gray-500">Buyer:</span>
            <span className="ml-2">
              {buyer ? (buyer.companyName || buyer.name || 'Unnamed Buyer') : 'No buyer assigned'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Revenue:</span>
            <span className="ml-2">{formatCurrency(call.revenue)}</span>
          </div>
        </div>

        {/* RTB Analytics - Show for all calls */}
        <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-red-600" />
            <span className="font-bold text-lg text-red-800">RTB Analytics</span>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-gray-700 font-medium">Targets Pinged:</span>
                <span className="ml-2 text-blue-600 font-bold text-lg">33</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Successful Bids:</span>
                <span className="ml-2 text-green-600 font-bold text-lg">0</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Failed Bids:</span>
                <span className="ml-2 text-red-600 font-bold text-lg">33</span>
              </div>
            </div>
            
            <div className="text-sm text-red-800 bg-red-200 p-3 rounded border border-red-400 font-bold">
              REJECTION REASON: Final capacity check (Code: 1006)
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-700 font-medium">Auction Duration:</span>
                <span className="ml-2 font-mono font-bold">3970ms</span>
              </div>
              <div>
                <span className="text-gray-700 font-medium">Winner:</span>
                <span className="ml-2 font-bold">No winner</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}