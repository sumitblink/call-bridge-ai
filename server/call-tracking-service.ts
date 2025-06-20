import { db } from "./db";
import { 
  callTrackingTags, 
  dniSessions, 
  phoneNumbers, 
  numberPools, 
  publishers,
  type CallTrackingTag,
  type PhoneNumber
} from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

export interface DNIRequest {
  tagCode: string;
  sessionId?: string;
  visitorId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  domain?: string;
}

export interface DNIResponse {
  success: boolean;
  phoneNumber?: string;
  formattedNumber?: string;
  sessionId: string;
  trackingCode?: string;
  error?: string;
}

export class CallTrackingService {
  
  /**
   * Get tracking number for a DNI request
   */
  static async getTrackingNumber(request: DNIRequest): Promise<DNIResponse> {
    try {
      const sessionId = request.sessionId || this.generateSessionId();
      
      // Find the tracking tag
      const tags = await db.select().from(callTrackingTags)
        .where(and(
          eq(callTrackingTags.tagCode, request.tagCode),
          eq(callTrackingTags.isActive, true)
        ));

      if (tags.length === 0) {
        return {
          success: false,
          sessionId: sessionId,
          error: "Tracking tag not found"
        };
      }

      const tag = tags[0];

      // If tag has a primary number, use it
      if (tag.primaryNumberId) {
        const primaryNumbers = await db.select().from(phoneNumbers)
          .where(eq(phoneNumbers.id, tag.primaryNumberId));
        
        if (primaryNumbers.length > 0) {
          const phoneNumber = primaryNumbers[0];
          return {
            success: true,
            phoneNumber: phoneNumber.phoneNumber,
            formattedNumber: this.formatPhoneNumber(phoneNumber.phoneNumber),
            sessionId: sessionId,
            trackingCode: tag.tagCode
          };
        }
      }

      // Fallback to a default number
      return {
        success: true,
        phoneNumber: "+15551234567",
        formattedNumber: "(555) 123-4567",
        sessionId: sessionId,
        trackingCode: tag.tagCode
      };

    } catch (error) {
      console.error("DNI Error:", error);
      return {
        success: false,
        sessionId: request.sessionId || this.generateSessionId(),
        error: "Internal server error"
      };
    }
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Format phone number for display
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 11 && digits.startsWith('1')) {
      const number = digits.substring(1);
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    } else if (digits.length === 10) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    
    return phoneNumber;
  }

  /**
   * Generate JavaScript tracking code
   */
  static generateJavaScriptCode(
    tagCode: string,
    apiUrl: string,
    numberToReplace?: string,
    captureUserData: boolean = false
  ): string {
    return `
(function() {
  var config = {
    tagCode: '${tagCode}',
    apiUrl: '${apiUrl}/api/dni/track',
    numberToReplace: '${numberToReplace || ''}',
    captureUserData: ${captureUserData},
    selectors: ['.tracking-number', '[data-tracking-number]', '.phone-number']
  };

  // Generate or get session ID
  function getSessionId() {
    var sessionId = localStorage.getItem('dni_session_' + config.tagCode);
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 16);
      localStorage.setItem('dni_session_' + config.tagCode, sessionId);
    }
    return sessionId;
  }

  // Get tracking number from API
  function getTrackingNumber() {
    var requestData = {
      tagCode: config.tagCode,
      sessionId: getSessionId(),
      domain: window.location.hostname,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    };

    if (config.captureUserData) {
      // Add UTM parameters
      var urlParams = new URLSearchParams(window.location.search);
      requestData.utmSource = urlParams.get('utm_source');
      requestData.utmMedium = urlParams.get('utm_medium');
      requestData.utmCampaign = urlParams.get('utm_campaign');
      requestData.utmContent = urlParams.get('utm_content');
      requestData.utmTerm = urlParams.get('utm_term');
    }

    fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      if (data.success && data.phoneNumber) {
        replacePhoneNumbers(data.formattedNumber || data.phoneNumber);
      }
    })
    .catch(function(error) {
      console.warn('DNI tracking error:', error);
    });
  }

  // Replace phone numbers in the page
  function replacePhoneNumbers(trackingNumber) {
    config.selectors.forEach(function(selector) {
      var elements = document.querySelectorAll(selector);
      elements.forEach(function(element) {
        if (config.numberToReplace && element.textContent.includes(config.numberToReplace)) {
          // Simple string replacement for phone numbers
          element.textContent = element.textContent.replace(config.numberToReplace, trackingNumber);
        } else {
          element.textContent = trackingNumber;
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', getTrackingNumber);
  } else {
    getTrackingNumber();
  }
})();`;
  }

  /**
   * Generate HTML integration snippet
   */
  static generateHTMLSnippet(
    tagCode: string,
    numberToReplace: string,
    apiUrl: string
  ): string {
    return `<!-- DNI Call Tracking Tag: ${tagCode} -->
<span class="tracking-number" data-tracking-number>${numberToReplace}</span>

<!-- Place this script before closing </body> tag -->
<script>
${this.generateJavaScriptCode(tagCode, apiUrl, numberToReplace, true)}
</script>`;
  }

  /**
   * Get tracking tag analytics
   */
  static async getTagAnalytics(tagId: number, days: number = 30): Promise<{
    totalSessions: number;
    uniqueVisitors: number;
    topSources: Array<{ source: string; count: number }>;
    dailyActivity: Array<{ date: string; sessions: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get sessions for this tag
    const sessions = await db.select().from(dniSessions)
      .where(and(
        eq(dniSessions.tagId, tagId),
        // Add date filter when we have proper date handling
      ))
      .orderBy(desc(dniSessions.createdAt))
      .limit(1000);

    return {
      totalSessions: sessions.length,
      uniqueVisitors: new Set(sessions.map(s => s.visitorId || s.ipAddress).filter(Boolean)).size,
      topSources: [],
      dailyActivity: []
    };
  }
}