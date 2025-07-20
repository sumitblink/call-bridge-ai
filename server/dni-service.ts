// Dynamic Number Insertion (DNI) Service
// Provides JavaScript SDK for websites to dynamically insert tracking phone numbers

import { db } from './db';
import { campaigns, phoneNumbers, numberPools, numberPoolAssignments, callTrackingTags } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { Campaign, PhoneNumber, NumberPool } from '@shared/schema';

export interface DNIRequest {
  tagCode?: string;
  campaignId?: number;
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
  campaignId: number;
  campaignName: string;
  trackingId: string;
  success: boolean;
  error?: string;
}

export class DNIService {
  /**
   * Get a tracking phone number for a campaign based on request parameters
   * Uses pool-based assignment if campaign has a pool, otherwise uses campaign phone number
   */
  static async getTrackingNumber(request: DNIRequest): Promise<DNIResponse> {
    try {
      console.log('DNI: Service called with request:', JSON.stringify(request, null, 2));
      let campaign: Campaign | undefined;

      // Find campaign by tracking tag code (primary method)
      if (request.tagCode) {
        console.log('DNI: Looking for tagCode:', request.tagCode);
        
        // First, let's verify the tag exists in the database
        const allTags = await db.select().from(callTrackingTags).where(eq(callTrackingTags.tagCode, request.tagCode));
        console.log('DNI: Direct tag lookup found:', allTags.length, 'tags');
        
        const trackingTagResult = await db
          .select({ 
            campaign: campaigns,
            tag: callTrackingTags 
          })
          .from(callTrackingTags)
          .innerJoin(campaigns, eq(callTrackingTags.campaignId, campaigns.id))
          .where(and(
            eq(callTrackingTags.tagCode, request.tagCode),
            eq(callTrackingTags.isActive, true)
          ));
        
        console.log('DNI: Found', trackingTagResult.length, 'tracking tag results');
        if (trackingTagResult.length > 0) {
          campaign = trackingTagResult[0].campaign;
          console.log('DNI: Using campaign:', campaign.name, 'ID:', campaign.id);
        } else {
          console.log('DNI: No active tracking tag found for tagCode:', request.tagCode);
        }
      }
      // Fallback: Find campaign by ID or name
      else if (request.campaignId) {
        const [foundCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, request.campaignId));
        campaign = foundCampaign;
      } else if (request.campaignName) {
        const allCampaigns = await db.select().from(campaigns);
        campaign = allCampaigns.find(c => c.name.toLowerCase() === (request.campaignName || '').toLowerCase());
      }

      if (!campaign) {
        return {
          phoneNumber: '',
          formattedNumber: '',
          campaignId: 0,
          campaignName: '',
          trackingId: '',
          success: false,
          error: 'Campaign not found'
        };
      }

      let selectedPhone: PhoneNumber;

      // Use mutually exclusive routing: either direct number OR pool
      if (campaign.routingType === 'pool' && campaign.poolId) {
        // Pool-based DNI: Get numbers from the assigned pool
        const poolNumbers = await db
          .select({ 
            phoneNumber: phoneNumbers.phoneNumber,
            id: phoneNumbers.id,
            isActive: phoneNumbers.isActive
          })
          .from(numberPoolAssignments)
          .innerJoin(phoneNumbers, eq(numberPoolAssignments.phoneNumberId, phoneNumbers.id))
          .where(and(
            eq(numberPoolAssignments.poolId, campaign.poolId),
            eq(phoneNumbers.isActive, true)
          ));

        if (poolNumbers.length === 0) {
          return {
            phoneNumber: '',
            formattedNumber: '',
            campaignId: campaign.id,
            campaignName: campaign.name,
            trackingId: '',
            success: false,
            error: 'No active phone numbers available in assigned pool'
          };
        }

        // Pool-based rotation logic - use round-robin or least recently used
        const rotationIndex = Math.floor(Math.random() * poolNumbers.length);
        selectedPhone = poolNumbers[rotationIndex] as PhoneNumber;
      } else if (campaign.routingType === 'direct' && campaign.phoneNumber) {
        // Direct number routing: Use campaign's assigned phone number
        selectedPhone = {
          id: 0,
          phoneNumber: campaign.phoneNumber,
          status: 'active'
        } as PhoneNumber;
      } else {
        // No valid routing configuration
        return {
          phoneNumber: '',
          formattedNumber: '',
          campaignId: campaign.id,
          campaignName: campaign.name,
          trackingId: '',
          success: false,
          error: `Campaign routing not configured. Current type: ${campaign.routingType}, has phone: ${!!campaign.phoneNumber}, has pool: ${!!campaign.poolId}`
        };
      }

      // Generate tracking ID for attribution
      const trackingId = this.generateTrackingId(campaign.id, request);

      // Store tracking session for attribution
      await this.storeTrackingSession(trackingId, campaign.id, selectedPhone.id, request);

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
        campaignId: 0,
        campaignName: '',
        trackingId: '',
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Generate unique tracking ID for attribution
   */
  private static generateTrackingId(campaignId: number, request: DNIRequest): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `dni_${campaignId}_${timestamp}_${random}`;
  }

  /**
   * Store tracking session for attribution analysis
   */
  private static async storeTrackingSession(
    trackingId: string,
    campaignId: number,
    phoneNumberId: number,
    request: DNIRequest
  ): Promise<void> {
    try {
      console.log('DNI Tracking Session:', {
        trackingId,
        campaignId,
        phoneNumberId,
        source: request.source,
        medium: request.medium,
        campaign: request.campaign,
        sessionId: request.sessionId
      });

      // Store visitor session in database for real-time tracking
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL!);
      
      // Get user ID from campaign (for now, use a default user ID)
      const userId = 1; // TODO: Get actual user ID from campaign
      
      // Create unique session identifier that includes UTM source for differentiation
      const uniqueSessionId = `${request.sessionId}_${request.source}`;
      
      const insertResult = await sql`
        INSERT INTO visitor_sessions (
          session_id, user_id, ip_address, user_agent, referrer,
          source, medium, campaign, utm_source, utm_medium, utm_campaign, 
          utm_term, utm_content, landing_page, current_page,
          first_visit, last_activity, is_active, has_converted
        ) VALUES (
          ${uniqueSessionId}, ${userId}, ${request.ipAddress || '127.0.0.1'}, ${request.userAgent || 'unknown'}, ${request.referrer || ''},
          ${request.source || ''}, ${request.medium || ''}, ${request.campaign || ''}, 
          ${request.source || ''}, ${request.medium || ''}, ${request.campaign || ''},
          ${request.term || null}, ${request.content || null}, ${request.customFields?.domain || 'unknown'}, ${request.customFields?.domain || 'unknown'},
          NOW(), NOW(), true, false
        )
        ON CONFLICT (session_id) 
        DO UPDATE SET
          last_activity = NOW(),
          utm_source = EXCLUDED.utm_source,
          utm_medium = EXCLUDED.utm_medium, 
          utm_campaign = EXCLUDED.utm_campaign,
          source = EXCLUDED.source,
          medium = EXCLUDED.medium,
          campaign = EXCLUDED.campaign
      `;
      
      console.log(`✅ DNI Session stored: ${uniqueSessionId} with UTM: ${request.source}/${request.medium}/${request.campaign}`);
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
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
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