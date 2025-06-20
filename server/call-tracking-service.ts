import { db } from "./db";
import { 
  callTrackingTags, 
  dniSessions, 
  dniSnippets, 
  phoneNumbers, 
  numberPools, 
  numberPoolAssignments,
  publishers,
  CallTrackingTag,
  InsertCallTrackingTag,
  DniSession,
  InsertDniSession,
  PhoneNumber
} from "../shared/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
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

export interface CallTrackingTagWithDetails extends CallTrackingTag {
  primaryNumber?: PhoneNumber;
  pool?: {
    id: number;
    name: string;
    poolSize: number;
    assignedNumbers: PhoneNumber[];
  };
  publisher?: {
    id: number;
    name: string;
  };
}

export class CallTrackingService {
  
  /**
   * Get tracking number for a DNI request
   */
  static async getTrackingNumber(request: DNIRequest): Promise<DNIResponse> {
    try {
      // Find the tracking tag
      const tag = await db.query.callTrackingTags.findFirst({
        where: and(
          eq(callTrackingTags.tagCode, request.tagCode),
          eq(callTrackingTags.isActive, true)
        ),
        with: {
          primaryNumber: true,
          pool: {
            with: {
              assignments: {
                with: {
                  phoneNumber: true
                }
              }
            }
          }
        }
      });

      if (!tag) {
        return {
          success: false,
          sessionId: request.sessionId || this.generateSessionId(),
          error: "Tracking tag not found"
        };
      }

      const sessionId = request.sessionId || this.generateSessionId();
      
      // Check for existing session
      let session = await this.findExistingSession(tag.id, sessionId, request.visitorId);
      
      if (session && this.isSessionValid(session, tag)) {
        // Return existing assigned number
        const phoneNumber = await db.query.phoneNumbers.findFirst({
          where: eq(phoneNumbers.id, session.assignedNumberId)
        });

        if (phoneNumber) {
          await this.updateSessionActivity(session.id);
          return {
            success: true,
            phoneNumber: phoneNumber.phoneNumber,
            formattedNumber: this.formatPhoneNumber(phoneNumber.phoneNumber),
            sessionId: sessionId,
            trackingCode: tag.tagCode
          };
        }
      }

      // Assign new number based on rotation strategy
      const assignedNumber = await this.assignNumberFromPool(tag, request);
      
      if (!assignedNumber) {
        // Fallback to primary number if available
        if (tag.primaryNumberId) {
          const primaryNumber = await db.query.phoneNumbers.findFirst({
            where: eq(phoneNumbers.id, tag.primaryNumberId)
          });
          
          if (primaryNumber) {
            await this.createSession(tag.id, sessionId, primaryNumber.id, request);
            return {
              success: true,
              phoneNumber: primaryNumber.phoneNumber,
              formattedNumber: this.formatPhoneNumber(primaryNumber.phoneNumber),
              sessionId: sessionId,
              trackingCode: tag.tagCode
            };
          }
        }

        return {
          success: false,
          sessionId: sessionId,
          error: "No available numbers in pool"
        };
      }

      // Create new session
      await this.createSession(tag.id, sessionId, assignedNumber.id, request);

      return {
        success: true,
        phoneNumber: assignedNumber.phoneNumber,
        formattedNumber: this.formatPhoneNumber(assignedNumber.phoneNumber),
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
   * Find existing session for visitor
   */
  private static async findExistingSession(
    tagId: number, 
    sessionId: string, 
    visitorId?: string
  ): Promise<DniSession | undefined> {
    const conditions = [eq(dniSessions.tagId, tagId), eq(dniSessions.isActive, true)];
    
    if (visitorId) {
      conditions.push(eq(dniSessions.visitorId, visitorId));
    } else {
      conditions.push(eq(dniSessions.sessionId, sessionId));
    }

    return await db.query.dniSessions.findFirst({
      where: and(...conditions),
      orderBy: desc(dniSessions.lastSeen)
    });
  }

  /**
   * Check if session is still valid based on timeout settings
   */
  private static isSessionValid(session: DniSession, tag: CallTrackingTag): boolean {
    const now = new Date();
    const lastSeen = new Date(session.lastSeen);
    const timeDiff = (now.getTime() - lastSeen.getTime()) / 1000;

    // Check session timeout
    if (timeDiff > tag.sessionTimeout) {
      return false;
    }

    // For sticky strategy, check sticky duration
    if (tag.rotationStrategy === 'sticky') {
      const firstSeen = new Date(session.firstSeen);
      const stickyDiff = (now.getTime() - firstSeen.getTime()) / 1000;
      return stickyDiff <= tag.stickyDuration;
    }

    return true;
  }

  /**
   * Assign number from pool based on rotation strategy
   */
  private static async assignNumberFromPool(
    tag: CallTrackingTag, 
    request: DNIRequest
  ): Promise<PhoneNumber | null> {
    if (!tag.poolId) {
      return null;
    }

    // Get available numbers from pool
    const poolNumbers = await db
      .select({
        phoneNumber: phoneNumbers
      })
      .from(numberPoolAssignments)
      .innerJoin(phoneNumbers, eq(numberPoolAssignments.phoneNumberId, phoneNumbers.id))
      .where(and(
        eq(numberPoolAssignments.poolId, tag.poolId),
        eq(numberPoolAssignments.isActive, true),
        eq(phoneNumbers.isActive, true)
      ))
      .orderBy(asc(numberPoolAssignments.priority));

    if (poolNumbers.length === 0) {
      return null;
    }

    const numbers = poolNumbers.map(p => p.phoneNumber);

    switch (tag.rotationStrategy) {
      case 'round_robin':
        return await this.selectRoundRobinNumber(numbers, tag.id);
      
      case 'random':
        return numbers[Math.floor(Math.random() * numbers.length)];
      
      case 'priority':
        return numbers[0]; // First number has highest priority
      
      case 'sticky':
        // For sticky, use visitor ID to determine number
        if (request.visitorId) {
          const hash = crypto.createHash('md5').update(request.visitorId).digest('hex');
          const index = parseInt(hash.substring(0, 8), 16) % numbers.length;
          return numbers[index];
        }
        return numbers[0];
      
      default:
        return numbers[0];
    }
  }

  /**
   * Select number using round-robin strategy
   */
  private static async selectRoundRobinNumber(
    numbers: PhoneNumber[], 
    tagId: number
  ): Promise<PhoneNumber> {
    // Get last assigned number for this tag
    const lastSession = await db.query.dniSessions.findFirst({
      where: eq(dniSessions.tagId, tagId),
      orderBy: desc(dniSessions.createdAt),
      with: {
        assignedNumber: true
      }
    });

    if (!lastSession) {
      return numbers[0];
    }

    // Find next number in rotation
    const lastIndex = numbers.findIndex(n => n.id === lastSession.assignedNumberId);
    const nextIndex = (lastIndex + 1) % numbers.length;
    return numbers[nextIndex];
  }

  /**
   * Create new DNI session
   */
  private static async createSession(
    tagId: number,
    sessionId: string,
    assignedNumberId: number,
    request: DNIRequest
  ): Promise<void> {
    const sessionData: InsertDniSession = {
      tagId,
      sessionId,
      visitorId: request.visitorId,
      assignedNumberId,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      referrer: request.referrer,
      utmSource: request.utmSource,
      utmMedium: request.utmMedium,
      utmCampaign: request.utmCampaign,
      utmContent: request.utmContent,
      utmTerm: request.utmTerm,
      pageViews: 1,
      isActive: true
    };

    await db.insert(dniSessions).values(sessionData);
  }

  /**
   * Update session activity
   */
  private static async updateSessionActivity(sessionId: number): Promise<void> {
    await db
      .update(dniSessions)
      .set({
        lastSeen: new Date(),
        pageViews: sql`${dniSessions.pageViews} + 1`
      })
      .where(eq(dniSessions.id, sessionId));
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
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const areaCode = cleaned.substring(1, 4);
      const exchange = cleaned.substring(4, 7);
      const number = cleaned.substring(7);
      return `(${areaCode}) ${exchange}-${number}`;
    }
    
    if (cleaned.length === 10) {
      const areaCode = cleaned.substring(0, 3);
      const exchange = cleaned.substring(3, 6);
      const number = cleaned.substring(6);
      return `(${areaCode}) ${exchange}-${number}`;
    }
    
    return phoneNumber;
  }

  /**
   * Generate JavaScript tracking code
   */
  static generateJavaScriptCode(
    tagCode: string, 
    domain: string, 
    options: {
      selectors?: string[];
      numberToReplace?: string;
      captureUserData?: boolean;
    } = {}
  ): string {
    const selectors = options.selectors || ['[data-tracking-number]', '.tracking-number'];
    const selectorString = selectors.map(s => `'${s}'`).join(', ');
    
    return `
(function() {
  var config = {
    tagCode: '${tagCode}',
    apiUrl: '${domain}/api/dni/track',
    selectors: [${selectorString}],
    numberToReplace: '${options.numberToReplace || ''}',
    captureUserData: ${options.captureUserData || false}
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

  // Generate or get visitor ID
  function getVisitorId() {
    var visitorId = localStorage.getItem('dni_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substr(2, 16);
      localStorage.setItem('dni_visitor_id', visitorId);
    }
    return visitorId;
  }

  // Collect tracking data
  function collectTrackingData() {
    var data = {
      tagCode: config.tagCode,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      domain: window.location.hostname
    };

    if (config.captureUserData) {
      data.referrer = document.referrer;
      data.userAgent = navigator.userAgent;
      
      // Collect UTM parameters
      var urlParams = new URLSearchParams(window.location.search);
      data.utmSource = urlParams.get('utm_source');
      data.utmMedium = urlParams.get('utm_medium');
      data.utmCampaign = urlParams.get('utm_campaign');
      data.utmContent = urlParams.get('utm_content');
      data.utmTerm = urlParams.get('utm_term');
    }

    return data;
  }

  // Replace phone numbers on page
  function replacePhoneNumbers(trackingNumber) {
    config.selectors.forEach(function(selector) {
      var elements = document.querySelectorAll(selector);
      elements.forEach(function(element) {
        if (config.numberToReplace && element.textContent.includes(config.numberToReplace)) {
          element.textContent = element.textContent.replace(
            new RegExp(config.numberToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            trackingNumber
          );
        } else {
          element.textContent = trackingNumber;
        }
        element.setAttribute('data-original-number', element.textContent);
      });
    });
  }

  // Make API request to get tracking number
  function getTrackingNumber() {
    var data = collectTrackingData();
    
    fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(result) {
      if (result.success && result.formattedNumber) {
        replacePhoneNumbers(result.formattedNumber);
      }
    })
    .catch(function(error) {
      console.error('DNI Tracking Error:', error);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', getTrackingNumber);
  } else {
    getTrackingNumber();
  }
})();
    `.trim();
  }

  /**
   * Generate HTML integration snippet
   */
  static generateHTMLSnippet(
    tagCode: string, 
    domain: string, 
    numberToReplace?: string
  ): string {
    return `
<!-- DNI Call Tracking Tag: ${tagCode} -->
<script>
${this.generateJavaScriptCode(tagCode, domain, { 
  numberToReplace,
  captureUserData: true 
})}
</script>

<!-- Alternative: Manual phone number replacement -->
<!-- Replace your static phone numbers with this: -->
<!-- <span class="tracking-number" data-tracking-number>${numberToReplace || 'Your phone number here'}</span> -->
    `.trim();
  }

  /**
   * Get tracking tag analytics
   */
  static async getTagAnalytics(tagId: number, days: number = 30): Promise<{
    totalSessions: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    topSources: Array<{source: string; count: number}>;
    numberDistribution: Array<{phoneNumber: string; count: number}>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get session statistics
    const sessions = await db.query.dniSessions.findMany({
      where: and(
        eq(dniSessions.tagId, tagId),
        sql`${dniSessions.createdAt} >= ${startDate}`
      ),
      with: {
        assignedNumber: true
      }
    });

    const uniqueVisitors = new Set(sessions.filter(s => s.visitorId).map(s => s.visitorId)).size;
    
    // Calculate average session duration
    const avgDuration = sessions.reduce((acc, session) => {
      const duration = new Date(session.lastSeen).getTime() - new Date(session.firstSeen).getTime();
      return acc + duration;
    }, 0) / sessions.length / 1000; // Convert to seconds

    // Top sources
    const sourceCounts = sessions.reduce((acc, session) => {
      const source = session.utmSource || 'Direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Number distribution
    const numberCounts = sessions.reduce((acc, session) => {
      const phoneNumber = session.assignedNumber?.phoneNumber || 'Unknown';
      acc[phoneNumber] = (acc[phoneNumber] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const numberDistribution = Object.entries(numberCounts)
      .map(([phoneNumber, count]) => ({ phoneNumber, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSessions: sessions.length,
      uniqueVisitors,
      avgSessionDuration: avgDuration,
      topSources,
      numberDistribution
    };
  }
}