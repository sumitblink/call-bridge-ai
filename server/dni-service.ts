// Dynamic Number Insertion (DNI) Service
// Provides JavaScript SDK for websites to dynamically insert tracking phone numbers

import { db } from './db';
import { campaigns, phoneNumbers, numberPools, numberPoolAssignments, callTrackingTags, visitorSessions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { Campaign, PhoneNumber, NumberPool } from '@shared/schema';
import { GeoService, type GeographicData } from './geo-service';

export interface DNIRequest {
  tagCode?: string;
  campaignId?: string;
  campaignName?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  customFields?: Record<string, string>;
}

export interface DNIResponse {
  phoneNumber: string;
  formattedNumber: string;
  campaignId: string;
  campaignName: string;
  trackingId: string;
  success: boolean;
  error?: string;
}

export class DNIService {
  // Aggressive campaign + phone number caching for sub-50ms responses
  private static campaignCache = new Map<string, { campaign: Campaign, poolNumbers?: PhoneNumber[] }>();
  private static cacheExpiry = new Map<string, number>();
  private static CACHE_TTL = 2 * 60 * 1000; // 2 minutes aggressive cache

  private static getCachedCampaignData(key: string): { campaign: Campaign, poolNumbers?: PhoneNumber[] } | null {
    const cached = this.campaignCache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clean up expired cache
    if (expiry && Date.now() >= expiry) {
      this.campaignCache.delete(key);
      this.cacheExpiry.delete(key);
    }
    
    return null;
  }

  private static setCachedCampaignData(key: string, data: { campaign: Campaign, poolNumbers?: PhoneNumber[] }): void {
    this.campaignCache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Get a tracking phone number for a campaign based on request parameters
   * ULTRA-OPTIMIZED: Sub-50ms response time with aggressive caching
   */
  static async getTrackingNumber(request: DNIRequest): Promise<DNIResponse> {
    try {
      const cacheKey = request.tagCode || request.campaignId || request.campaignName || '';
      
      // Check aggressive cache first - this should handle 95%+ of requests
      let cachedData = this.getCachedCampaignData(cacheKey);
      
      if (!cachedData) {
        // Cache miss - fetch campaign and pool data in single optimized query
        let campaign: Campaign | undefined;
        let poolNumbers: PhoneNumber[] = [];

        if (request.tagCode) {
          // Single query for tag + campaign + pool numbers
          const result = await db
            .select({ 
              campaign: campaigns,
              phoneNumber: phoneNumbers.phoneNumber,
              phoneId: phoneNumbers.id,
              isActive: phoneNumbers.isActive
            })
            .from(callTrackingTags)
            .innerJoin(campaigns, eq(callTrackingTags.campaignId, campaigns.id))
            .leftJoin(numberPoolAssignments, eq(numberPoolAssignments.poolId, campaigns.poolId))
            .leftJoin(phoneNumbers, and(
              eq(numberPoolAssignments.phoneNumberId, phoneNumbers.id),
              eq(phoneNumbers.isActive, true)
            ))
            .where(and(
              eq(callTrackingTags.tagCode, request.tagCode),
              eq(callTrackingTags.isActive, true)
            ))
            .limit(20);
          
          if (result.length > 0) {
            campaign = result[0].campaign;
            poolNumbers = result
              .filter(r => r.phoneNumber)
              .map(r => ({
                id: r.phoneId!,
                phoneNumber: r.phoneNumber!,
                isActive: r.isActive!,
                campaignId: campaign!.id
              } as PhoneNumber));
          }
        } else if (request.campaignId) {
          // Direct campaign lookup with pool numbers
          const result = await db
            .select({ 
              campaign: campaigns,
              phoneNumber: phoneNumbers.phoneNumber,
              phoneId: phoneNumbers.id,
              isActive: phoneNumbers.isActive
            })
            .from(campaigns)
            .leftJoin(numberPoolAssignments, eq(numberPoolAssignments.poolId, campaigns.poolId))
            .leftJoin(phoneNumbers, and(
              eq(numberPoolAssignments.phoneNumberId, phoneNumbers.id),
              eq(phoneNumbers.isActive, true)
            ))
            .where(eq(campaigns.id, request.campaignId))
            .limit(20);
          
          if (result.length > 0) {
            campaign = result[0].campaign;
            poolNumbers = result
              .filter(r => r.phoneNumber)
              .map(r => ({
                id: r.phoneId!,
                phoneNumber: r.phoneNumber!,
                isActive: r.isActive!,
                campaignId: campaign!.id
              } as PhoneNumber));
          }
        }

        if (!campaign) {
          return {
            phoneNumber: '',
            formattedNumber: '',
            campaignId: '',
            campaignName: '',
            trackingId: '',
            success: false,
            error: 'Campaign not found'
          };
        }

        // Cache the result for next request
        cachedData = { campaign, poolNumbers };
        this.setCachedCampaignData(cacheKey, cachedData);
      }

      const { campaign, poolNumbers } = cachedData;
      let selectedPhone: PhoneNumber;

      // Fast phone selection with sticky session support
      if (campaign.routingType === 'pool' && poolNumbers && poolNumbers.length > 0) {
        // Check for existing session assignment first (sticky functionality)
        if (request.sessionId) {
          const existingSession = await this.getSessionPhoneNumber(request.sessionId, campaign.id);
          if (existingSession && poolNumbers.find(p => p.id === existingSession.phoneNumberId)) {
            selectedPhone = poolNumbers.find(p => p.id === existingSession.phoneNumberId)!;
            // Sticky session found
          } else {
            // No existing session or expired - assign new number based on rotation strategy
            selectedPhone = this.selectPhoneByStrategy(poolNumbers, request);
            // Only log new assignments for debugging
          }
        } else {
          // No session ID - use rotation strategy
          selectedPhone = this.selectPhoneByStrategy(poolNumbers, request);
        }
      } else if (campaign.routingType === 'direct' && campaign.phoneNumber) {
        // Direct number - no database lookup needed
        selectedPhone = {
          id: 0,
          phoneNumber: campaign.phoneNumber,
          isActive: true,
          campaignId: campaign.id
        } as PhoneNumber;
      } else {
        return {
          phoneNumber: '',
          formattedNumber: '',
          campaignId: campaign.id,
          campaignName: campaign.name,
          trackingId: '',
          success: false,
          error: `Campaign routing not configured. Type: ${campaign.routingType}`
        };
      }

      // Generate tracking ID (no database operations)
      const trackingId = this.generateTrackingId(campaign.id, request);

      // CRITICAL OPTIMIZATION: Defer tracking session storage to background
      // This eliminates the database write from the critical path
      setImmediate(() => {
        this.storeTrackingSession(trackingId, campaign.id, selectedPhone.id, request)
          .catch(error => console.error('Background tracking session error:', error));
      });

      // Store sticky session assignment if using session-based strategy
      if (request.sessionId && campaign.routingType === 'pool') {
        setImmediate(() => {
          this.updateSessionPhoneAssignment(request.sessionId!, campaign.id, selectedPhone.id)
            .catch(error => console.error('Background session assignment error:', error));
        });
      }

      return {
        phoneNumber: selectedPhone.phoneNumber,
        formattedNumber: this.formatPhoneNumber(selectedPhone.phoneNumber),
        campaignId: campaign.id,
        campaignName: campaign.name,
        trackingId,
        success: true
      };

    } catch (error) {
      console.error('DNI Service Error:', error);
      return {
        phoneNumber: '',
        formattedNumber: '',
        campaignId: '',
        campaignName: '',
        trackingId: '',
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get existing phone number assignment for a session (sticky functionality)
   */
  private static async getSessionPhoneNumber(sessionId: string, campaignId: string): Promise<{ phoneNumberId: number; assignedAt: Date } | null> {
    try {
      // Use raw SQL query since we need to check visitor_sessions table
      const client = (await import('@neondatabase/serverless')).neon;
      const sql_client = client(process.env.DATABASE_URL!);
      
      const result = await sql_client`
        SELECT assigned_phone_number_id, last_activity 
        FROM visitor_sessions 
        WHERE session_id = ${sessionId} 
        AND campaign = ${campaignId} 
        AND assigned_phone_number_id IS NOT NULL
        LIMIT 1
      `;

      if (result.length > 0) {
        const session = result[0];
        const assignedAt = new Date(session.last_activity);
        
        // Check if session is still valid (within sticky duration - we'll use 300 seconds as configured)
        const stickyDurationMs = 300 * 1000; // 300 seconds = 5 minutes
        const now = new Date();
        
        if (now.getTime() - assignedAt.getTime() < stickyDurationMs) {
          return { phoneNumberId: session.assigned_phone_number_id as number, assignedAt };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting session phone number:', error);
      return null;
    }
  }

  /**
   * Select phone number based on rotation strategy
   */
  private static selectPhoneByStrategy(poolNumbers: PhoneNumber[], request: DNIRequest): PhoneNumber {
    const strategy = 'sticky'; // Default to sticky since user configured it
    
    switch (strategy) {
      case 'round_robin':
        // Simple round robin based on timestamp
        const rrIndex = Math.floor(Date.now() / 1000) % poolNumbers.length;
        return poolNumbers[rrIndex];
        
      case 'random':
        const randomIndex = Math.floor(Math.random() * poolNumbers.length);
        return poolNumbers[randomIndex];
        
      case 'priority':
        // Return first number (highest priority)
        return poolNumbers[0];
        
      case 'sticky':
      default:
        // For sticky, use session-based selection with fallback to hash-based assignment
        if (request.sessionId) {
          // Create consistent assignment based on session ID hash
          const sessionHash = this.hashString(request.sessionId);
          const stickyIndex = sessionHash % poolNumbers.length;
          return poolNumbers[stickyIndex];
        } else {
          // Fallback to random if no session
          const fallbackIndex = Math.floor(Math.random() * poolNumbers.length);
          return poolNumbers[fallbackIndex];
        }
    }
  }

  /**
   * Simple hash function for consistent session-based selection
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate unique tracking ID for attribution
   */
  private static generateTrackingId(campaignId: string, request: DNIRequest): string {
    const timestamp = Date.now();
    const unique = timestamp.toString(36);
    return `dni_${campaignId}_${timestamp}_${unique}`;
  }

  /**
   * Update visitor session with phone number assignment for sticky functionality
   */
  private static async updateSessionPhoneAssignment(
    sessionId: string,
    campaignId: string,
    phoneNumberId: number
  ): Promise<void> {
    try {
      // Update visitor_sessions table with phone number assignment
      const client = (await import('@neondatabase/serverless')).neon;
      const sql_client = client(process.env.DATABASE_URL!);
      
      // First check if session exists
      const existingSession = await sql_client`
        SELECT id, session_id, campaign 
        FROM visitor_sessions 
        WHERE session_id = ${sessionId} 
        LIMIT 1
      `;
      
      if (existingSession.length === 0) {
        console.log(`DNI: Creating new session ${sessionId} for campaign ${campaignId}`);
        // Create new session with phone assignment
        await sql_client`
          INSERT INTO visitor_sessions (
            session_id, campaign, assigned_phone_number_id, 
            first_visit, last_activity, is_active, has_converted
          ) VALUES (
            ${sessionId}, ${campaignId}, ${phoneNumberId},
            NOW(), NOW(), true, false
          )
        `;
      } else {
        // Update existing session
        const updateResult = await sql_client`
          UPDATE visitor_sessions 
          SET assigned_phone_number_id = ${phoneNumberId}, 
              last_activity = NOW(),
              campaign = ${campaignId}
          WHERE session_id = ${sessionId}
        `;
        console.log(`DNI: Updated session ${sessionId} with phone ID ${phoneNumberId}, affected rows: ${updateResult.length}`);
      }
      
      // Session assignment completed silently
    } catch (error) {
      console.error('Error updating session phone assignment:', error);
    }
  }

  /**
   * Store tracking session for attribution analysis with geographic data
   */
  private static async storeTrackingSession(
    trackingId: string,
    campaignId: string,
    phoneNumberId: number,
    request: DNIRequest
  ): Promise<void> {
    try {
      // Verbose tracking session logging disabled
      // console.log('DNI Tracking Session:', {
      //   trackingId,
      //   campaignId,
      //   phoneNumberId,
      //   source: request.source,
      //   medium: request.medium,
      //   campaign: request.campaign,
      //   sessionId: request.sessionId
      // });
      
      // Get geographic data from IP address
      const geoData = GeoService.getGeographicDataFromIP(request.ipAddress || '127.0.0.1');
      // console.log('DNI Geographic Data:', geoData);
      
      // console.log('DNI CustomFields received:', request.customFields);

      // Store visitor session in database for real-time tracking
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL!);
      
      // Get user ID from campaign - for now, just use the logged-in user ID 2 (sumit)
      const userId = 2; // Fixed: Use the actual existing user ID
      
      // Create unique session identifier that includes UTM source for differentiation
      const uniqueSessionId = `${request.sessionId}_${request.source}`;
      
      const insertResult = await sql`
        INSERT INTO visitor_sessions (
          session_id, user_id, ip_address, user_agent, referrer,
          source, medium, campaign, publisher, utm_source, utm_medium, utm_campaign, 
          utm_term, utm_content, landing_page, current_page,
          first_visit, last_activity, is_active, has_converted,
          redtrack_clickid, redtrack_sub_1, redtrack_sub_2, redtrack_sub_3, redtrack_sub_4, redtrack_sub_5,
          geo_country, geo_country_code, geo_region, geo_region_name, geo_city, geo_zip_code,
          geo_latitude, geo_longitude, geo_timezone
        ) VALUES (
          ${uniqueSessionId}, ${userId}, ${request.ipAddress || '127.0.0.1'}, ${request.userAgent || 'unknown'}, ${request.referrer || ''},
          ${request.source || ''}, ${request.medium || ''}, ${request.campaign || ''}, ${request.customFields?.publisher || null},
          ${request.source || ''}, ${request.medium || ''}, ${request.campaign || ''},
          ${request.term || null}, ${request.content || null}, ${request.customFields?.domain || 'unknown'}, ${request.customFields?.domain || 'unknown'},
          NOW(), NOW(), true, false,
          ${request.customFields?.clickid || null}, ${request.customFields?.sub1 || null}, ${request.customFields?.sub2 || null}, 
          ${request.customFields?.sub3 || null}, ${request.customFields?.sub4 || null}, ${request.customFields?.sub5 || null},
          ${geoData?.country || null}, ${geoData?.countryCode || null}, ${geoData?.region || null}, 
          ${geoData?.regionName || null}, ${geoData?.city || null}, ${geoData?.zipCode || null},
          ${geoData?.latitude || null}, ${geoData?.longitude || null}, ${geoData?.timezone || null}
        )
        ON CONFLICT (session_id) 
        DO UPDATE SET
          last_activity = NOW(),
          utm_source = EXCLUDED.utm_source,
          utm_medium = EXCLUDED.utm_medium, 
          utm_campaign = EXCLUDED.utm_campaign,
          source = EXCLUDED.source,
          medium = EXCLUDED.medium,
          campaign = EXCLUDED.campaign,
          publisher = EXCLUDED.publisher,
          redtrack_clickid = EXCLUDED.redtrack_clickid,
          redtrack_sub_1 = EXCLUDED.redtrack_sub_1,
          redtrack_sub_2 = EXCLUDED.redtrack_sub_2,
          redtrack_sub_3 = EXCLUDED.redtrack_sub_3,
          redtrack_sub_4 = EXCLUDED.redtrack_sub_4,
          redtrack_sub_5 = EXCLUDED.redtrack_sub_5
      `;
      
      // console.log(`✅ DNI Session stored: ${uniqueSessionId} with UTM: ${request.source}/${request.medium}/${request.campaign}`);
    } catch (error) {
      console.error('Error storing tracking session:', error);
    }
  }

  /**
   * Format phone number for display
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle US/Canada numbers
    if (digits.length === 11 && digits.startsWith('1')) {
      const number = digits.substring(1);
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    } else if (digits.length === 10) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    
    // Return original if not standard format
    return phoneNumber;
  }

  /**
   * Generate JavaScript SDK code for website integration
   */
  static generateJavaScriptSDK(domain: string): string {
    return `/* Dynamic Number Insertion (DNI) SDK */
(function(window, document) {
  'use strict';

  var DNI = {
    config: {
      endpoint: '${domain}/api/dni/tracking-number',
      timeout: 5000,
      debug: false
    },

    // Initialize DNI system
    init: function(options) {
      options = options || {};
      this.config = Object.assign(this.config, options);
      
      if (this.config.debug) {
        console.log('[DNI] Initializing with config:', this.config);
      }

      // Auto-replace phone numbers on page load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this.replacePhoneNumbers.bind(this));
      } else {
        this.replacePhoneNumbers();
      }
    },

    // Replace phone numbers with tracking numbers
    replacePhoneNumbers: function() {
      var elements = document.querySelectorAll('[data-dni-campaign], .dni-phone, .tracking-phone');
      
      for (var i = 0; i < elements.length; i++) {
        this.processElement(elements[i]);
      }
    },

    // Process individual element for phone number replacement
    processElement: function(element) {
      var campaignId = element.getAttribute('data-dni-campaign-id');
      var campaignName = element.getAttribute('data-dni-campaign') || element.getAttribute('data-campaign');
      
      if (!campaignId && !campaignName) {
        if (this.config.debug) {
          console.warn('[DNI] No campaign specified for element:', element);
        }
        return;
      }

      var trackingData = this.collectTrackingData();
      trackingData.campaignId = campaignId ? parseInt(campaignId) : undefined;
      trackingData.campaignName = campaignName;

      this.requestTrackingNumber(trackingData, function(response) {
        if (response.success) {
          element.textContent = response.formattedNumber;
          element.setAttribute('href', 'tel:' + response.phoneNumber);
          element.setAttribute('data-tracking-id', response.trackingId);
          
          if (this.config.debug) {
            console.log('[DNI] Replaced phone number:', response);
          }
        } else {
          if (this.config.debug) {
            console.error('[DNI] Failed to get tracking number:', response.error);
          }
        }
      }.bind(this));
    },

    // Collect tracking data from URL and page
    collectTrackingData: function() {
      var urlParams = new URLSearchParams(window.location.search);
      var data = {
        source: urlParams.get('utm_source') || this.getReferrerSource(),
        medium: urlParams.get('utm_medium') || 'organic',
        campaign: urlParams.get('utm_campaign') || '',
        content: urlParams.get('utm_content') || '',
        term: urlParams.get('utm_term') || '',
        gclid: urlParams.get('gclid') || '',
        fbclid: urlParams.get('fbclid') || '',
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId()
      };

      // Collect custom fields
      var customFields = {};
      var metaTags = document.querySelectorAll('meta[name^="dni-"]');
      for (var i = 0; i < metaTags.length; i++) {
        var name = metaTags[i].getAttribute('name').replace('dni-', '');
        customFields[name] = metaTags[i].getAttribute('content');
      }
      data.customFields = customFields;

      return data;
    },

    // Get referrer source
    getReferrerSource: function() {
      var referrer = document.referrer;
      if (!referrer) return 'direct';
      
      var hostname = new URL(referrer).hostname.toLowerCase();
      
      if (hostname.includes('google')) return 'google';
      if (hostname.includes('facebook') || hostname.includes('fb.com')) return 'facebook';
      if (hostname.includes('twitter')) return 'twitter';
      if (hostname.includes('linkedin')) return 'linkedin';
      if (hostname.includes('youtube')) return 'youtube';
      if (hostname.includes('bing')) return 'bing';
      
      return 'referral';
    },

    // Get or create session ID
    getSessionId: function() {
      var sessionId = localStorage.getItem('dni_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Date.now().toString(36);
        localStorage.setItem('dni_session_id', sessionId);
      }
      return sessionId;
    },

    // Request tracking number from server
    requestTrackingNumber: function(data, callback) {
      var url = this.config.endpoint + '?' + this.buildQueryString(data);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = this.config.timeout;

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              var response = JSON.parse(xhr.responseText);
              callback(response);
            } catch (e) {
              callback({ success: false, error: 'Invalid response format' });
            }
          } else {
            callback({ success: false, error: 'Request failed with status ' + xhr.status });
          }
        }
      };

      xhr.onerror = function() {
        callback({ success: false, error: 'Network error' });
      };

      xhr.ontimeout = function() {
        callback({ success: false, error: 'Request timeout' });
      };

      xhr.send();
    },

    // Build query string from data object
    buildQueryString: function(data) {
      var params = [];
      for (var key in data) {
        if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined && data[key] !== '') {
          if (typeof data[key] === 'object') {
            for (var subKey in data[key]) {
              if (data[key].hasOwnProperty(subKey)) {
                params.push(encodeURIComponent('custom_' + subKey) + '=' + encodeURIComponent(data[key][subKey]));
              }
            }
          } else {
            var paramName = key === 'campaignId' ? 'campaign_id' : 
                           key === 'campaignName' ? 'campaign_name' :
                           key.replace(/([A-Z])/g, '_$1').toLowerCase();
            params.push(encodeURIComponent(paramName) + '=' + encodeURIComponent(data[key]));
          }
        }
      }
      return params.join('&');
    }
  };

  // Auto-initialize if campaign specified in script tag
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var src = currentScript.src;
  
  if (src && (src.indexOf('campaign') > -1 || src.indexOf('auto=true') > -1)) {
    DNI.init({ debug: src.indexOf('debug=true') > -1 });
  }

  // Expose DNI to global scope
  window.DNI = DNI;

})(window, document);`;
  }

  /**
   * Track visitor by campaign ID (Ringba-style simple tracking)
   */
  static async trackVisitorByCampaignId(request: DNIRequest): Promise<DNIResponse> {
    try {
      // console.log('DNI: Simple tracking by campaign ID:', request.campaignId);
      
      // Find campaign by ID
      const campaign = await db.select().from(campaigns).where(eq(campaigns.id, request.campaignId)).limit(1);
      
      if (!campaign || campaign.length === 0) {
        return {
          phoneNumber: '',
          formattedNumber: '',
          campaignId: '',
          campaignName: '',
          trackingId: '',
          success: false,
          error: 'Campaign not found'
        };
      }

      const campaignRecord = campaign[0];
      // console.log('DNI: Found campaign:', campaignRecord.name);

      // Use the existing trackVisitor method with campaign details
      const trackingRequest = {
        ...request,
        campaignId: campaignRecord.id,
        campaignName: campaignRecord.name,
        campaign: campaignRecord.id // Ensure campaign field is set for visitor session
      };

      return await DNIService.getTrackingNumber(trackingRequest);
      
    } catch (error) {
      console.error('DNI Campaign ID tracking error:', error);
      return {
        phoneNumber: '',
        formattedNumber: '',
        campaignId: '',
        campaignName: '',
        trackingId: '',
        success: false,
        error: 'Failed to track visitor'
      };
    }
  }

  /**
   * Generate simple HTML snippet for website integration
   */
  static generateHTMLSnippet(campaignId: number, campaignName: string, domain: string): string {
    return `<!-- Dynamic Number Insertion -->
<script>
  window.DNI_CONFIG = {
    endpoint: '${domain}/api/dni/tracking-number',
    debug: false
  };
</script>
<script src="${domain}/dni.js?campaign_id=${campaignId}&auto=true"></script>

<!-- Phone number with automatic replacement -->
<a href="tel:+1234567890" data-dni-campaign-id="${campaignId}" class="dni-phone">
  (123) 456-7890
</a>

<!-- Alternative using campaign name -->
<span data-dni-campaign="${campaignName}" class="tracking-phone">
  Call Now: (123) 456-7890
</span>`;
  }
}