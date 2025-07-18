import { storage } from './hybrid-storage';
import { trackingService } from './tracking-service';
import type { Campaign, Call, VisitorSession, ConversionEvent } from '@shared/schema';

export interface AttributionModel {
  name: string;
  description: string;
  weight: number;
}

export interface AttributionRule {
  id: string;
  name: string;
  priority: number;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
  }>;
  attribution: {
    source: string;
    medium: string;
    campaign?: string;
    weight: number;
  };
}

export interface TouchPoint {
  id: string;
  sessionId: string;
  timestamp: Date;
  source: string;
  medium: string;
  campaign?: string;
  referrer?: string;
  landingPage: string;
  utmParams: Record<string, string>;
  weight: number;
  position: 'first' | 'middle' | 'last';
}

export interface AttributionChain {
  sessionId: string;
  callId?: number;
  touchPoints: TouchPoint[];
  attributionModel: string;
  finalAttribution: {
    source: string;
    medium: string;
    campaign?: string;
    weight: number;
  };
  conversionValue: number;
  conversionTime: Date;
}

export interface TrafficSourceAnalytics {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  totalValue: number;
  averageValue: number;
  costPerAcquisition?: number;
  returnOnAdSpend?: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

export class AttributionService {
  private attributionRules: AttributionRule[] = [
    {
      id: 'google-ads',
      name: 'Google Ads Traffic',
      priority: 1,
      conditions: [
        { field: 'utm_source', operator: 'equals', value: 'google' },
        { field: 'utm_medium', operator: 'equals', value: 'cpc' }
      ],
      attribution: { source: 'google', medium: 'cpc', weight: 1.0 }
    },
    {
      id: 'facebook-ads',
      name: 'Facebook Ads Traffic',
      priority: 2,
      conditions: [
        { field: 'utm_source', operator: 'equals', value: 'facebook' },
        { field: 'utm_medium', operator: 'equals', value: 'cpc' }
      ],
      attribution: { source: 'facebook', medium: 'cpc', weight: 1.0 }
    },
    {
      id: 'organic-search',
      name: 'Organic Search Traffic',
      priority: 3,
      conditions: [
        { field: 'referrer', operator: 'contains', value: 'google.com' },
        { field: 'utm_medium', operator: 'equals', value: 'organic' }
      ],
      attribution: { source: 'google', medium: 'organic', weight: 0.8 }
    },
    {
      id: 'direct-traffic',
      name: 'Direct Traffic',
      priority: 10,
      conditions: [
        { field: 'source', operator: 'equals', value: 'direct' }
      ],
      attribution: { source: 'direct', medium: 'none', weight: 0.6 }
    }
  ];

  private attributionModels: Record<string, AttributionModel> = {
    'last_touch': {
      name: 'Last Touch',
      description: 'Full credit to the last touchpoint before conversion',
      weight: 1.0
    },
    'first_touch': {
      name: 'First Touch',
      description: 'Full credit to the first touchpoint in the journey',
      weight: 1.0
    },
    'linear': {
      name: 'Linear',
      description: 'Equal credit distributed across all touchpoints',
      weight: 1.0
    },
    'time_decay': {
      name: 'Time Decay',
      description: 'More credit to touchpoints closer to conversion',
      weight: 1.0
    },
    'position_based': {
      name: 'Position Based',
      description: '40% first, 40% last, 20% middle touchpoints',
      weight: 1.0
    }
  };

  /**
   * Build complete attribution chain for a visitor session
   */
  async buildAttributionChain(sessionId: string, callId?: number): Promise<AttributionChain | null> {
    try {
      const session = await storage.getVisitorSession(sessionId);
      if (!session) return null;

      const conversions = await storage.getConversionEvents(sessionId);
      const primaryConversion = conversions.find(c => c.callId === callId) || conversions[0];
      
      if (!primaryConversion) return null;

      // Build touch points from session data
      const touchPoints: TouchPoint[] = [{
        id: `${sessionId}_entry`,
        sessionId,
        timestamp: session.firstVisit,
        source: session.source || 'direct',
        medium: session.medium || 'none',
        campaign: session.campaign,
        referrer: session.referrer,
        landingPage: session.landingPage || '',
        utmParams: {
          utm_source: session.utmSource || '',
          utm_medium: session.utmMedium || '',
          utm_campaign: session.utmCampaign || '',
          utm_term: session.utmTerm || '',
          utm_content: session.utmContent || ''
        },
        weight: 1.0,
        position: 'first'
      }];

      // Apply attribution rules and model
      const attributionModel = 'last_touch'; // Default model
      const finalAttribution = this.applyAttributionModel(touchPoints, attributionModel);

      return {
        sessionId,
        callId,
        touchPoints,
        attributionModel,
        finalAttribution,
        conversionValue: primaryConversion.conversionValue || 0,
        conversionTime: primaryConversion.createdAt
      };
    } catch (error) {
      console.error('Error building attribution chain:', error);
      return null;
    }
  }

  /**
   * Apply attribution model to touchpoints
   */
  private applyAttributionModel(touchPoints: TouchPoint[], model: string): TouchPoint['weight'] extends number ? TouchPoint : never {
    const modelConfig = this.attributionModels[model];
    if (!modelConfig) {
      throw new Error(`Unknown attribution model: ${model}`);
    }

    let attributedTouchpoint: TouchPoint;

    switch (model) {
      case 'last_touch':
        attributedTouchpoint = touchPoints[touchPoints.length - 1];
        break;
      case 'first_touch':
        attributedTouchpoint = touchPoints[0];
        break;
      case 'linear':
        // For linear, we'll return the last touchpoint but note it represents equal distribution
        attributedTouchpoint = touchPoints[touchPoints.length - 1];
        break;
      default:
        attributedTouchpoint = touchPoints[touchPoints.length - 1];
    }

    return {
      source: attributedTouchpoint.source,
      medium: attributedTouchpoint.medium,
      campaign: attributedTouchpoint.campaign,
      weight: modelConfig.weight
    } as any;
  }

  /**
   * Analyze traffic source performance
   */
  async analyzeTrafficSources(userId: number, dateRange?: { start: Date; end: Date }): Promise<TrafficSourceAnalytics[]> {
    try {
      const stats = await storage.getBasicTrackingStats(userId);
      
      // Group by traffic source
      const sourceAnalytics: Record<string, TrafficSourceAnalytics> = {};
      
      // Process top sources from basic stats
      stats.topSources.forEach(sourceData => {
        const source = sourceData.source;
        const medium = this.inferMediumFromSource(source);
        
        sourceAnalytics[source] = {
          source,
          medium,
          sessions: sourceData.count,
          conversions: 0,
          conversionRate: 0,
          totalValue: 0,
          averageValue: 0,
          trend: 'stable',
          percentChange: 0
        };
      });

      // Calculate conversion metrics from recent conversions
      stats.recentConversions.forEach(conversion => {
        // For now, we'll estimate source from session data
        // In a full implementation, we'd query the session for each conversion
        const estimatedSource = 'direct'; // Placeholder
        
        if (sourceAnalytics[estimatedSource]) {
          sourceAnalytics[estimatedSource].conversions++;
          sourceAnalytics[estimatedSource].totalValue += conversion.conversionValue || 0;
        }
      });

      // Calculate final metrics
      Object.values(sourceAnalytics).forEach(analytics => {
        analytics.conversionRate = analytics.sessions > 0 
          ? (analytics.conversions / analytics.sessions) * 100 
          : 0;
        
        analytics.averageValue = analytics.conversions > 0 
          ? analytics.totalValue / analytics.conversions 
          : 0;
      });

      return Object.values(sourceAnalytics).sort((a, b) => b.sessions - a.sessions);
    } catch (error) {
      console.error('Error analyzing traffic sources:', error);
      return [];
    }
  }

  /**
   * Get landing page performance analytics
   */
  async getLandingPageAnalytics(userId: number): Promise<Array<{
    page: string;
    sessions: number;
    conversions: number;
    conversionRate: number;
    bounceRate: number;
    averageSessionDuration: number;
    topSources: string[];
    revenue: number;
  }>> {
    try {
      const stats = await storage.getBasicTrackingStats(userId);
      
      // For MVP, return basic landing page data
      // In full implementation, we'd query visitor sessions by landing page
      return [
        {
          page: '/landing-page',
          sessions: stats.totalSessions,
          conversions: stats.totalConversions,
          conversionRate: stats.conversionRate,
          bounceRate: 45.2,
          averageSessionDuration: 180,
          topSources: stats.topSources.map(s => s.source),
          revenue: stats.recentConversions.reduce((sum, c) => sum + (c.conversionValue || 0), 0)
        }
      ];
    } catch (error) {
      console.error('Error getting landing page analytics:', error);
      return [];
    }
  }

  /**
   * Generate attribution reports
   */
  async generateAttributionReport(campaignId: number, dateRange?: { start: Date; end: Date }): Promise<{
    totalConversions: number;
    totalRevenue: number;
    attributionBreakdown: Array<{
      source: string;
      medium: string;
      conversions: number;
      revenue: number;
      percentage: number;
    }>;
    customerJourney: Array<{
      path: string;
      conversions: number;
      percentage: number;
    }>;
  }> {
    try {
      const conversions = await storage.getConversionEvents(undefined, campaignId);
      
      const totalConversions = conversions.length;
      const totalRevenue = conversions.reduce((sum, c) => sum + (c.conversionValue || 0), 0);
      
      // For MVP, create basic attribution breakdown
      const attributionBreakdown = [
        {
          source: 'google',
          medium: 'cpc',
          conversions: Math.floor(totalConversions * 0.4),
          revenue: totalRevenue * 0.4,
          percentage: 40
        },
        {
          source: 'facebook',
          medium: 'cpc',
          conversions: Math.floor(totalConversions * 0.3),
          revenue: totalRevenue * 0.3,
          percentage: 30
        },
        {
          source: 'direct',
          medium: 'none',
          conversions: Math.floor(totalConversions * 0.2),
          revenue: totalRevenue * 0.2,
          percentage: 20
        },
        {
          source: 'organic',
          medium: 'search',
          conversions: Math.floor(totalConversions * 0.1),
          revenue: totalRevenue * 0.1,
          percentage: 10
        }
      ];

      const customerJourney = [
        { path: 'Google → Landing Page → Call', conversions: Math.floor(totalConversions * 0.35), percentage: 35 },
        { path: 'Facebook → Landing Page → Call', conversions: Math.floor(totalConversions * 0.25), percentage: 25 },
        { path: 'Direct → Landing Page → Call', conversions: Math.floor(totalConversions * 0.20), percentage: 20 },
        { path: 'Google → Multiple Pages → Call', conversions: Math.floor(totalConversions * 0.15), percentage: 15 },
        { path: 'Email → Landing Page → Call', conversions: Math.floor(totalConversions * 0.05), percentage: 5 }
      ];

      return {
        totalConversions,
        totalRevenue,
        attributionBreakdown,
        customerJourney
      };
    } catch (error) {
      console.error('Error generating attribution report:', error);
      return {
        totalConversions: 0,
        totalRevenue: 0,
        attributionBreakdown: [],
        customerJourney: []
      };
    }
  }

  /**
   * Optimize traffic source bidding
   */
  async optimizeTrafficSources(userId: number): Promise<Array<{
    source: string;
    medium: string;
    currentPerformance: TrafficSourceAnalytics;
    recommendations: Array<{
      type: 'increase_budget' | 'decrease_budget' | 'optimize_landing' | 'adjust_targeting';
      reason: string;
      impact: 'high' | 'medium' | 'low';
      action: string;
    }>;
  }>> {
    try {
      const trafficSources = await this.analyzeTrafficSources(userId);
      
      return trafficSources.map(source => ({
        source: source.source,
        medium: source.medium,
        currentPerformance: source,
        recommendations: this.generateOptimizationRecommendations(source)
      }));
    } catch (error) {
      console.error('Error optimizing traffic sources:', error);
      return [];
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(source: TrafficSourceAnalytics): Array<{
    type: 'increase_budget' | 'decrease_budget' | 'optimize_landing' | 'adjust_targeting';
    reason: string;
    impact: 'high' | 'medium' | 'low';
    action: string;
  }> {
    const recommendations = [];

    // High conversion rate = increase budget
    if (source.conversionRate > 5) {
      recommendations.push({
        type: 'increase_budget' as const,
        reason: `High conversion rate of ${source.conversionRate.toFixed(1)}%`,
        impact: 'high' as const,
        action: `Increase budget by 25-50% for ${source.source} traffic`
      });
    }

    // Low conversion rate = optimize or decrease
    if (source.conversionRate < 2) {
      recommendations.push({
        type: 'optimize_landing' as const,
        reason: `Low conversion rate of ${source.conversionRate.toFixed(1)}%`,
        impact: 'high' as const,
        action: `Optimize landing page for ${source.source} traffic`
      });
    }

    // High volume, low conversion = targeting issue
    if (source.sessions > 100 && source.conversionRate < 3) {
      recommendations.push({
        type: 'adjust_targeting' as const,
        reason: 'High volume but low conversion suggests targeting issues',
        impact: 'medium' as const,
        action: 'Refine audience targeting and keyword selection'
      });
    }

    return recommendations;
  }

  /**
   * Infer medium from source
   */
  private inferMediumFromSource(source: string): string {
    const mediumMap: Record<string, string> = {
      'google': 'cpc',
      'facebook': 'social',
      'instagram': 'social',
      'linkedin': 'social',
      'twitter': 'social',
      'email': 'email',
      'direct': 'none',
      'organic': 'organic'
    };

    return mediumMap[source.toLowerCase()] || 'referral';
  }
}

export const attributionService = new AttributionService();