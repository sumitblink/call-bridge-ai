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
        firstVisit: new Date(),
        lastActivity: new Date(),
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
        createdAt: new Date(),
        pixelsFired: false,
        pixelData: null
      };
      
      const conversionEvent = await storage.createConversionEvent(eventData);
      
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
}

export const trackingService = new TrackingService();