export interface Call {
  id: number;
  campaignId: number | null;
  buyerId: number | null;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  duration: number;
  status: string;
  callQuality: string | null;
  recordingUrl: string | null;
  cost: string;
  revenue: string;
  geoLocation: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  status: string;
  phoneNumber: string | null;
  routingType: string;
  maxConcurrentCalls: number;
  callCap: number;
  geoTargeting: string[] | null;
  timeZoneRestriction: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Buyer {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  endpoint: string | null;
  status: string;
  priority: number;
  dailyCap: number;
  concurrencyLimit: number;
  acceptanceRate: string;
  avgResponseTime: number;
  createdAt: string;
  updatedAt: string;
}