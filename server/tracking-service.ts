import { storage } from './hybrid-storage';
import { v4 as uuidv4 } from 'uuid';
import type { InsertVisitorSession, InsertConversionEvent, VisitorSession, ConversionEvent } from '@shared/schema';

export interface TrackingPixelData {
  campaign_id?: string;
  source?: string;
  medium?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  user_agent?: string;
  ip_address?: string;
  // RedTrack parameters
  clickid?: string;
  rt_clickid?: string;
  redtrack_campaign_id?: string;
  redtrack_offer_id?: string;
  redtrack_affiliate_id?: string;
  redtrack_sub_id?: string;
  redtrack_visitor_id?: string;
}

export interface ConversionData {
  sessionId: string;
  campaignId?: number;
  callId?: number;
  callerNumber?: string;
  duration?: number;
  callStatus?: string;
  conversionValue?: number;
  conversionType?: string;
  // RedTrack specific
  redtrackClickId?: string;
  sendRedtrackPostback?: boolean;
}

export interface RedtrackPostbackData {
  clickid: string;
  sum: number;
  type: string;
  additional_params?: Record<string, string>;
}

export class TrackingService {
  /**
   * Create or update a visitor session
   */
  async createOrUpdateSession(
    sessionId: string,
    userId: number,
    trackingData: TrackingPixelData
  ): Promise<VisitorSession> {
    try {
      // Check if session already exists
      const existingSession = await storage.getVisitorSession(sessionId);
      
      if (existingSession) {
        // Update existing session with new activity
        const updatedSession = await storage.updateVisitorSession(sessionId, {
          currentPage: trackingData.landing_page || existingSession.currentPage,
          lastActivity: new Date(),
          isActive: true
        });
        
        if (updatedSession) {
          return updatedSession;
        }
      }
      
      // Create new session
      const sessionData: InsertVisitorSession = {
        sessionId,
        userId,
        ipAddress: trackingData.ip_address,
        userAgent: trackingData.user_agent,
        referrer: trackingData.referrer,
        source: trackingData.source || trackingData.utm_source || 'direct',
        medium: trackingData.medium || trackingData.utm_medium || 'organic',
        campaign: trackingData.utm_campaign,
        utmSource: trackingData.utm_source,
        utmMedium: trackingData.utm_medium,
        utmCampaign: trackingData.utm_campaign,
        utmTerm: trackingData.utm_term,
        utmContent: trackingData.utm_content,
        landingPage: trackingData.landing_page,
        currentPage: trackingData.landing_page,
        // RedTrack parameters
        redtrackClickId: trackingData.clickid || trackingData.rt_clickid,
        redtrackCampaignId: trackingData.redtrack_campaign_id,
        redtrackOfferId: trackingData.redtrack_offer_id,
        redtrackAffiliateId: trackingData.redtrack_affiliate_id,
        redtrackSubId: trackingData.redtrack_sub_id,
        redtrackVisitorId: trackingData.redtrack_visitor_id,
        isActive: true,
        hasConverted: false
      };
      
      return await storage.createVisitorSession(sessionData);
    } catch (error) {
      console.error('Error creating/updating visitor session:', error);
      throw error;
    }
  }
  
  /**
   * Track a conversion event (phone call)
   */
  async trackConversion(conversionData: ConversionData): Promise<ConversionEvent> {
    try {
      // Check if session exists
      const session = await storage.getVisitorSession(conversionData.sessionId);
      if (!session) {
        throw new Error(`Session ${conversionData.sessionId} not found`);
      }
      
      // Create conversion event
      const eventData: InsertConversionEvent = {
        sessionId: conversionData.sessionId,
        campaignId: conversionData.campaignId,
        callId: conversionData.callId,
        conversionType: conversionData.conversionType || 'call',
        conversionValue: conversionData.conversionValue || 0,
        currency: 'USD',
        callerNumber: conversionData.callerNumber,
        duration: conversionData.duration || 0,
        callStatus: conversionData.callStatus || 'completed',
        attributionModel: 'last_touch',
        redtrackClickId: conversionData.redtrackClickId || session.redtrackClickId,
        redtrackPostbackSent: false,
        pixelsFired: false,
        pixelData: null
      };
      
      const conversionEvent = await storage.createConversionEvent(eventData);
      
      // Send RedTrack postback if configured and clickid is available
      if (conversionData.sendRedtrackPostback !== false && eventData.redtrackClickId) {
        await this.sendRedtrackPostback({
          clickid: eventData.redtrackClickId,
          sum: conversionData.conversionValue || 20,
          type: 'ConvertedCall',
          additional_params: {
            call_duration: conversionData.duration?.toString() || '0',
            call_status: conversionData.callStatus || 'completed',
            campaign_id: conversionData.campaignId?.toString() || ''
          }
        }, conversionEvent.id);
      }
      
      // Update session to mark as converted
      await storage.updateVisitorSession(conversionData.sessionId, {
        hasConverted: true,
        lastActivity: new Date()
      });
      
      return conversionEvent;
    } catch (error) {
      console.error('Error tracking conversion:', error);
      throw error;
    }
  }
  
  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return uuidv4();
  }
  
  /**
   * Parse UTM parameters from URL
   */
  parseUTMParameters(url: string): Partial<TrackingPixelData> {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_term: params.get('utm_term') || undefined,
        utm_content: params.get('utm_content') || undefined,
        source: params.get('source') || params.get('utm_source') || undefined,
        medium: params.get('medium') || params.get('utm_medium') || undefined,
        campaign: params.get('campaign') || params.get('utm_campaign') || undefined,
      };
    } catch (error) {
      console.error('Error parsing UTM parameters:', error);
      return {};
    }
  }
  
  /**
   * Get visitor session analytics
   */
  async getSessionAnalytics(sessionId: string): Promise<{
    session: VisitorSession;
    conversions: ConversionEvent[];
    totalConversions: number;
    totalValue: number;
  }> {
    try {
      const session = await storage.getVisitorSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      const conversions = await storage.getConversionEvents(sessionId);
      const totalValue = conversions.reduce((sum, conv) => sum + (conv.conversionValue || 0), 0);
      
      return {
        session,
        conversions,
        totalConversions: conversions.length,
        totalValue
      };
    } catch (error) {
      console.error('Error getting session analytics:', error);
      throw error;
    }
  }
  
  /**
   * Get campaign conversion metrics
   */
  async getCampaignMetrics(campaignId: number): Promise<{
    totalConversions: number;
    totalValue: number;
    averageValue: number;
    conversionRate: number;
    topSources: Array<{source: string; conversions: number}>;
  }> {
    try {
      const conversions = await storage.getConversionEvents(undefined, campaignId);
      const totalValue = conversions.reduce((sum, conv) => sum + (conv.conversionValue || 0), 0);
      const averageValue = conversions.length > 0 ? totalValue / conversions.length : 0;
      
      // Get unique session IDs for this campaign
      const sessionIds = [...new Set(conversions.map(conv => conv.sessionId))];
      
      // Get sessions for source analysis
      const sessions = await Promise.all(
        sessionIds.map(sessionId => storage.getVisitorSession(sessionId))
      );
      
      const validSessions = sessions.filter(s => s !== undefined) as VisitorSession[];
      
      // Calculate source distribution
      const sourceCounts: Record<string, number> = {};
      validSessions.forEach(session => {
        const source = session.source || 'direct';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      
      const topSources = Object.entries(sourceCounts)
        .map(([source, conversions]) => ({ source, conversions }))
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 5);
      
      return {
        totalConversions: conversions.length,
        totalValue,
        averageValue,
        conversionRate: 0, // Would need total sessions to calculate
        topSources
      };
    } catch (error) {
      console.error('Error getting campaign metrics:', error);
      throw error;
    }
  }
  
  /**
   * Generate tracking pixel URL
   */
  generatePixelUrl(campaignId: number, sessionId?: string): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    const pixelSessionId = sessionId || this.generateSessionId();
    
    return `${baseUrl}/api/tracking/pixel.gif?campaign_id=${campaignId}&session_id=${pixelSessionId}`;
  }
  
  /**
   * Generate JavaScript tracking code
   */
  generateTrackingCode(campaignId: number, userId: number): string {
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    return `
<!-- CallCenter Pro Tracking Code -->
<script>
(function() {
  // Generate or retrieve session ID
  var sessionId = localStorage.getItem('cc_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('cc_session_id', sessionId);
  }
  
  // Collect tracking data
  var trackingData = {
    campaign_id: '${campaignId}',
    session_id: sessionId,
    user_id: '${userId}',
    referrer: document.referrer,
    landing_page: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
  
  // Parse UTM parameters
  var urlParams = new URLSearchParams(window.location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'source', 'medium'].forEach(function(param) {
    var value = urlParams.get(param);
    if (value) trackingData[param] = value;
  });
  
  // Send tracking data
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '${baseUrl}/api/tracking/session', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(trackingData));
  
  // Track page views
  window.addEventListener('beforeunload', function() {
    var beacon = new XMLHttpRequest();
    beacon.open('PATCH', '${baseUrl}/api/tracking/session/' + sessionId, true);
    beacon.setRequestHeader('Content-Type', 'application/json');
    beacon.send(JSON.stringify({
      current_page: window.location.href,
      last_activity: new Date().toISOString()
    }));
  });
})();
</script>
<!-- End CallCenter Pro Tracking Code -->
`.trim();
  }

  /**
   * Send RedTrack postback notification
   */
  async sendRedtrackPostback(postbackData: RedtrackPostbackData, conversionEventId: number): Promise<void> {
    try {
      // Get active RedTrack configurations for the user
      const configs = await storage.getRedtrackConfigs(1); // TODO: Get actual user ID
      
      if (!configs || configs.length === 0) {
        console.log('No RedTrack configurations found, skipping postback');
        return;
      }

      // Use the first active configuration
      const config = configs.find(c => c.isActive) || configs[0];
      
      // Build postback URL
      const postbackUrl = new URL(config.postbackUrl);
      postbackUrl.searchParams.set('clickid', postbackData.clickid);
      postbackUrl.searchParams.set('sum', postbackData.sum.toString());
      postbackUrl.searchParams.set('type', postbackData.type);
      
      // Add additional parameters
      if (postbackData.additional_params) {
        Object.entries(postbackData.additional_params).forEach(([key, value]) => {
          if (value) {
            postbackUrl.searchParams.set(key, value);
          }
        });
      }

      console.log(`Sending RedTrack postback: ${postbackUrl.toString()}`);

      // Send the postback
      const response = await fetch(postbackUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'CallCenter-Pro-RedTrack-Integration/1.0'
        },
        timeout: 10000 // 10 second timeout
      });

      const responseText = await response.text();
      const isSuccess = response.ok;

      console.log(`RedTrack postback response: ${response.status} - ${responseText}`);

      // Update conversion event with postback status
      await storage.updateConversionEvent(conversionEventId, {
        redtrackPostbackSent: true,
        redtrackPostbackUrl: postbackUrl.toString(),
        redtrackPostbackResponse: responseText,
        redtrackPostbackStatus: isSuccess ? 'success' : 'failed'
      });

      // Update configuration last used timestamp
      await storage.updateRedtrackConfig(config.id, {
        lastUsed: new Date()
      });

    } catch (error) {
      console.error('Error sending RedTrack postback:', error);
      
      // Update conversion event with error status
      try {
        await storage.updateConversionEvent(conversionEventId, {
          redtrackPostbackSent: false,
          redtrackPostbackStatus: 'failed',
          redtrackPostbackResponse: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (updateError) {
        console.error('Error updating conversion event with postback failure:', updateError);
      }
    }
  }

  /**
   * Parse RedTrack parameters from URL or tracking data
   */
  parseRedtrackParameters(url: string): Partial<TrackingPixelData> {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      return {
        clickid: params.get('clickid') || params.get('rt_clickid') || undefined,
        rt_clickid: params.get('rt_clickid') || params.get('clickid') || undefined,
        redtrack_campaign_id: params.get('campaign_id') || params.get('rt_campaign_id') || undefined,
        redtrack_offer_id: params.get('offer_id') || params.get('rt_offer_id') || undefined,
        redtrack_affiliate_id: params.get('affiliate_id') || params.get('rt_affiliate_id') || undefined,
        redtrack_sub_id: params.get('sub_id') || params.get('rt_sub_id') || undefined,
        redtrack_visitor_id: params.get('visitor_id') || params.get('rt_visitor_id') || undefined,
      };
    } catch (error) {
      console.error('Error parsing RedTrack parameters:', error);
      return {};
    }
  }

  /**
   * Generate enhanced tracking pixel with RedTrack support
   */
  generateTrackingPixel(campaignId: string, includeRedtrackParams: boolean = true): string {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
    
    let pixelCode = `
<!-- CallCenter Pro Tracking Pixel with RedTrack Integration -->
<script>
(function() {
  var trackingData = {
    campaign_id: '${campaignId}',
    landing_page: window.location.href,
    referrer: document.referrer,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };

  // Extract UTM parameters
  var urlParams = new URLSearchParams(window.location.search);
  var utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  utmParams.forEach(function(param) {
    var value = urlParams.get(param);
    if (value) trackingData[param] = value;
  });
`;

    if (includeRedtrackParams) {
      pixelCode += `
  // Extract RedTrack parameters
  var redtrackParams = ['clickid', 'rt_clickid', 'campaign_id', 'offer_id', 'affiliate_id', 'sub_id', 'visitor_id'];
  redtrackParams.forEach(function(param) {
    var value = urlParams.get(param);
    if (value) {
      if (param === 'clickid' || param === 'rt_clickid') {
        trackingData.clickid = value;
        trackingData.rt_clickid = value;
      } else {
        trackingData['redtrack_' + param] = value;
      }
    }
  });
`;
    }

    pixelCode += `
  // Send tracking data
  var img = new Image();
  var params = new URLSearchParams(trackingData);
  img.src = '${baseUrl}/api/tracking/pixel?' + params.toString();
  img.style.display = 'none';
  document.body.appendChild(img);
})();
</script>`;

    return pixelCode;
  }
}

export const trackingService = new TrackingService();