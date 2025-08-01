import { db } from './db';
import { rtbTargets, campaigns, campaignRtbTargets } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class RTBTestService {
  /**
   * Test RTB target with simulated call data
   */
  static async testRTBTarget(targetId: number, testData: {
    callerId?: string;
    publisherId?: string;
    publisherSubId?: string;
    callerState?: string;
    callerZip?: string;
    callerAreaCode?: string;
    minBid?: number;
    maxBid?: number;
    customTags?: Record<string, any>;
  }) {
    try {
      // Get RTB target details
      const target = await db
        .select()
        .from(rtbTargets)
        .where(eq(rtbTargets.id, targetId))
        .limit(1);

      if (!target.length) {
        throw new Error('RTB Target not found');
      }

      const rtbTarget = target[0];

      // Use bidder's configured request body template with macro substitution
      const requestBody = this.generateRequestBodyFromTemplate(rtbTarget, testData);
      
      // Simulate ping (GET request)
      const pingResult = await this.sendTestPing(rtbTarget, requestBody);
      
      // Simulate post (POST request)
      const postResult = await this.sendTestPost(rtbTarget, requestBody);

      return {
        target: {
          id: rtbTarget.id,
          name: rtbTarget.name,
          endpointUrl: rtbTarget.endpointUrl,
          timeoutMs: rtbTarget.timeoutMs
        },
        testData,
        requestBody: requestBody,
        parsedRequestBody: this.tryParseJSON(requestBody),
        results: {
          ping: pingResult,
          post: postResult
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('RTB Test Error:', error);
      throw error;
    }
  }

  /**
   * Test multiple RTB targets (auction simulation)
   */
  static async testRTBAuction(campaignId: string, testData: {
    callerId?: string;
    publisherId?: string;
    publisherSubId?: string;
    callerState?: string;
    callerZip?: string;
    callerAreaCode?: string;
    minBid?: number;
    maxBid?: number;
    customTags?: Record<string, any>;
  }) {
    try {
      // Get campaign details
      const campaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaign.length) {
        throw new Error('Campaign not found');
      }

      // Get assigned RTB targets for this campaign
      const assignments = await db
        .select({
          rtbTarget: rtbTargets,
          assignment: campaignRtbTargets
        })
        .from(campaignRtbTargets)
        .innerJoin(rtbTargets, eq(campaignRtbTargets.rtbTargetId, rtbTargets.id))
        .where(
          and(
            eq(campaignRtbTargets.campaignId, campaignId),
            eq(rtbTargets.isActive, true)
          )
        );

      if (!assignments.length) {
        throw new Error('No active RTB targets assigned to this campaign');
      }

      // Test all targets in parallel
      const testPromises = assignments.map(async ({ rtbTarget, assignment }) => {
        try {
          const result = await this.testRTBTarget(rtbTarget.id, testData);
          return {
            ...result,
            assignment: {
              weight: assignment.weight,
              priority: assignment.priority
            }
          };
        } catch (error) {
          return {
            target: {
              id: rtbTarget.id,
              name: rtbTarget.name,
              endpointUrl: rtbTarget.endpointUrl
            },
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
        }
      });

      const results = await Promise.all(testPromises);

      // Determine auction winner (highest bid)
      const successfulBids = results.filter(r => r.results?.post?.success && r.results.post.bidAmount);
      const winner = successfulBids.length > 0 ? successfulBids.reduce((prev, current) => {
        const prevBid = parseFloat(prev.results?.post?.bidAmount || '0');
        const currentBid = parseFloat(current.results?.post?.bidAmount || '0');
        return currentBid > prevBid ? current : prev;
      }, successfulBids[0]) : null;

      return {
        campaign: campaign[0],
        testData,
        totalTargets: assignments.length,
        successfulResponses: successfulBids.length,
        winner: winner || null,
        allResults: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('RTB Auction Test Error:', error);
      throw error;
    }
  }

  /**
   * Generate request body from bidder's template with macro substitution
   */
  private static generateRequestBodyFromTemplate(target: any, testData: any): string {
    // Use bidder's configured request body template or fallback to default
    let template = target.requestBody;
    
    // If no template configured, use a minimal default
    if (!template) {
      template = JSON.stringify({
        requestId: "{requestId}",
        callerId: "{callerId}",
        timestamp: "{timestamp}"
      });
    }
    
    // Generate test values
    const requestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const callerIdFormatted = this.formatPhoneNumber(testData.callerId || '+15551234567');
    const inboundNumberFormatted = this.formatPhoneNumber('+19786432489');
    const timestamp = new Date().toISOString();
    
    // Create macro replacement mapping - supports both {macro} and [tag:Type:Field] formats
    const macros: Record<string, string> = {
      // Standard macros
      '{requestId}': requestId,
      '{callerId}': testData.callerId || '+15551234567',
      '{timestamp}': timestamp,
      '{callerState}': testData.callerState || 'CA',
      '{callerZip}': testData.callerZip || '90210',
      '{callerAreaCode}': testData.callerAreaCode || '555',
      '{publisherId}': testData.publisherId || 'test_publisher',
      '{publisherSubId}': testData.publisherSubId || 'sub_001',
      '{minBid}': (testData.minBid || 10).toString(),
      '{maxBid}': (testData.maxBid || 50).toString(),
      '{currency}': 'USD',
      '{inboundNumber}': '+19786432489',
      
      // Ringba-style macros [tag:Type:Field]
      '[Call:CallerId]': testData.callerId || '+15551234567',
      '[Call:CallerIdNoPlus]': callerIdFormatted,
      '[Call:InboundCallId]': requestId,
      '[tag:InboundNumber:Number]': '+19786432489',
      '[tag:InboundNumber:Number-NoPlus]': inboundNumberFormatted,
      '[Publisher:Id]': testData.publisherId || 'test_publisher',
      '[Publisher:SubId]': testData.publisherSubId || 'sub_001',
      '[Geo:State]': testData.callerState || 'CA',
      '[Geo:Zipcode]': testData.callerZip || '90210',
      '[Zip Code:Zip Code]': testData.callerZip || '90210',
      
      // Remove these - they're causing incorrect replacements
    };
    
    // Perform macro substitution
    let processedTemplate = template;
    for (const [macro, value] of Object.entries(macros)) {
      // Handle both quoted and unquoted macro replacements
      processedTemplate = processedTemplate.replace(new RegExp(this.escapeRegExp(macro), 'g'), value);
    }
    
    return processedTemplate;
  }
  
  /**
   * Format phone number - remove +1 prefix for US numbers
   */
  private static formatPhoneNumber(phone: string): string {
    if (!phone) return '5551234567';
    return phone.replace(/^\+1/, '').replace(/\D/g, '');
  }
  
  /**
   * Escape special regex characters for safe string replacement
   */
  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Safely parse JSON string, return null if invalid
   */
  private static tryParseJSON(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return { error: 'Invalid JSON format', original: jsonString };
    }
  }

  /**
   * Send test ping (GET request)
   */
  private static async sendTestPing(target: any, requestBody: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Simulate GET request with query parameters
      const requestData = JSON.parse(requestBody);
      const queryParams = new URLSearchParams(requestData).toString();
      const pingUrl = `${target.endpointUrl}?${queryParams}`;

      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CallCenter-Pro-RTB-Test/1.0',
          ...(target.authMethod === 'bearer' && target.authToken ? {
            'Authorization': `Bearer ${target.authToken}`
          } : {})
        },
        signal: AbortSignal.timeout(target.timeoutMs || 3000)
      });

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        url: pingUrl
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        url: target.endpointUrl
      };
    }
  }

  /**
   * Send test post (POST request)
   */
  private static async sendTestPost(target: any, requestBody: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(target.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CallCenter-Pro-RTB-Test/1.0',
          ...(target.authMethod === 'bearer' && target.authToken ? {
            'Authorization': `Bearer ${target.authToken}`
          } : {})
        },
        body: requestBody,
        signal: AbortSignal.timeout(target.timeoutMs || 3000)
      });

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();
      
      // Try to parse response and extract bid information
      let bidAmount = null;
      let phoneNumber = null;
      let accepted = false;

      try {
        const responseJson = JSON.parse(responseText);
        
        // Common bid response patterns
        bidAmount = responseJson.bid || responseJson.bidAmount || responseJson.price || responseJson.amount;
        phoneNumber = responseJson.phoneNumber || responseJson.phone || responseJson.number || responseJson.destinationNumber;
        accepted = responseJson.accepted || responseJson.accept || responseJson.success || (bidAmount && bidAmount > 0);
      } catch (e) {
        // Response is not JSON or doesn't follow expected format
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        bidAmount,
        phoneNumber,
        accepted,
        url: target.endpointUrl
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        url: target.endpointUrl
      };
    }
  }

  /**
   * Get RTB test history
   */
  static async getTestHistory(userId: number, limit: number = 20) {
    // This would require a test_history table in the real implementation
    // For now, return empty array
    return [];
  }
}