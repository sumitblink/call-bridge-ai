import { storage } from './storage-db';
import fetch from 'node-fetch';
import type { 
  RtbTarget, 
  RtbRouter, 
  RtbBidRequest, 
  RtbBidResponse, 
  InsertRtbBidRequest,
  InsertRtbBidResponse,
  Campaign 
} from '@shared/schema';

export interface BidRequest {
  requestId: string;
  campaignId: number; // Internal database ID for storage
  campaignRtbId?: string; // External RTB ID for bid requests
  callerId?: string;
  callerState?: string;
  callerZip?: string;
  callStartTime: Date;
  tags?: Record<string, any>;
  timeoutMs?: number;
  // Additional fields for template substitution
  minBid?: number;
  maxBid?: number;
  currency?: string;
  timezone?: string;
  sourceNumber?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  referrer?: string;
  customFields?: Record<string, any>;
  
  // Enhanced tracking for Ringba compliance
  inboundNumber?: string; // The specific number that received the call
  inboundCallId?: string; // Publisher-specific call ID format
  publisherId?: number; // Publisher who generated the call
  publisherSubId?: string; // Publisher's SubID for tracking
  exposeCallerId?: boolean; // Whether to expose caller ID to bidder
}

export interface BidResponse {
  targetId: number;
  bidAmount: number;
  bidCurrency: string;
  destinationNumber: string;
  requiredDuration?: number;
  responseTimeMs: number;
  isValid: boolean;
  errorMessage?: string;
}

export interface AuctionResult {
  success: boolean;
  winningBid?: RtbBidResponse;
  totalTargetsPinged: number;
  successfulResponses: number;
  totalResponseTime: number;
  error?: string;
}

export class RTBService {
  /**
   * Generate a publisher-specific inbound call ID
   */
  static generateInboundCallId(publisherId?: number, campaignId?: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    const pubId = publisherId ? `P${publisherId}` : 'P0';
    const campId = campaignId ? `C${campaignId}` : 'C0';
    return `${pubId}_${campId}_${timestamp}_${random}`;
  }

  /**
   * Create a sample request body template with Ringba-compliant tokens
   * This demonstrates how to use the enhanced tracking data
   */
  static createSampleRequestBody(): string {
    return JSON.stringify({
      "CID": "[tag:InboundNumber:Number-NoPlus]",
      "exposeCallerId": "{exposeCallerId}",
      "publisherInboundCallId": "[Call:InboundCallId]",
      "SubId": "[Publisher:SubId]",
      "callerId": "[Call:CallerId]",
      "callerState": "[tag:Geo:SubDivisionCode]",
      "callerZip": "[tag:Geo:ZipCode]",
      "campaignId": "{campaignId}",
      "requestId": "{requestId}",
      "timestamp": "{timestamp}",
      "inboundNumber": "[tag:InboundNumber:Number]",
      "publisherId": "[Publisher:Id]"
    }, null, 2);
  }

  /**
   * Substitute template variables in request body with Ringba-compliant tokens
   */
  private static substituteTemplateVariables(template: string, bidRequest: BidRequest): string {
    const substitutions = {
      '{requestId}': bidRequest.requestId,
      '{campaignId}': bidRequest.campaignRtbId || bidRequest.campaignId.toString(),
      '{callerId}': bidRequest.callerId || '',
      '{callerState}': bidRequest.callerState || '',
      '{callerZip}': bidRequest.callerZip || '',
      '{callStartTime}': bidRequest.callStartTime.toISOString(),
      '{timestamp}': Date.now().toString(),
      '{isoTimestamp}': new Date().toISOString(),
      '{minBid}': bidRequest.minBid?.toString() || '0',
      '{maxBid}': bidRequest.maxBid?.toString() || '100',
      '{currency}': bidRequest.currency || 'USD',
      '{timezone}': bidRequest.timezone || 'UTC',
      '{sourceNumber}': bidRequest.sourceNumber || '',
      '{userAgent}': bidRequest.userAgent || '',
      '{ipAddress}': bidRequest.ipAddress || '',
      '{sessionId}': bidRequest.sessionId || '',
      '{referrer}': bidRequest.referrer || '',
      
      // Enhanced Ringba-compliant tokens
      '{inboundNumber}': bidRequest.inboundNumber || '',
      '{inboundCallId}': bidRequest.inboundCallId || '',
      '{publisherId}': bidRequest.publisherId?.toString() || '',
      '{publisherSubId}': bidRequest.publisherSubId || '',
      '{exposeCallerId}': bidRequest.exposeCallerId ? 'yes' : 'no',
    };

    let result = template;
    for (const [placeholder, value] of Object.entries(substitutions)) {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Handle custom fields
    if (bidRequest.customFields) {
      for (const [key, value] of Object.entries(bidRequest.customFields)) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value?.toString() || '');
      }
    }

    // Handle Ringba-compliant geographic tokens (synchronous for now)
    const ringbaTokens = this.getRingbaGeographicTokens(bidRequest);
    for (const [token, value] of Object.entries(ringbaTokens)) {
      result = result.replace(new RegExp(token.replace(/[[\]]/g, '\\$&'), 'g'), value);
    }

    // Handle Ringba-compliant caller ID tokens
    const callerId = bidRequest.callerId || '';
    const callerIdNoPlus = callerId.startsWith('+1') ? callerId.substring(2) : callerId.replace(/^\+/, '');
    
    result = result.replace(/\[Call:CallerId\]/g, callerId);
    result = result.replace(/\[Call:CallerIdNoPlus\]/g, callerIdNoPlus);

    return result;
  }

  /**
   * Get Ringba-compliant geographic tokens for RTB requests
   */
  private static getRingbaGeographicTokens(bidRequest: BidRequest): Record<string, string> {
    // Use caller state/zip from Twilio data or fallback to default values
    const state = bidRequest.callerState || 'NY';
    const zip = bidRequest.callerZip || '10001';
    const city = this.getCityFromState(state);
    
    return {
      '[tag:Geo:SubDivision]': this.getFullStateName(state),
      '[tag:Geo:SubDivisionCode]': state,
      '[tag:Geo:City]': city,
      '[tag:Geo:ZipCode]': zip,
      '[tag:Technology:IPAddress]': bidRequest.ipAddress || '127.0.0.1',
      '[tag:Address:State]': this.getFullStateName(state),
      '[tag:Address:City]': city,
      '[tag:Address:Zip 5]': zip,
      '[tag:Geo:Country]': 'United States',
      '[tag:Geo:CountryCode]': 'US',
      '[tag:Geo:Timezone]': this.getTimezoneFromState(state),
      
      // Enhanced Ringba-compliant tokens for your specific requirements
      '[tag:InboundNumber:Number-NoPlus]': (bidRequest.inboundNumber || '').replace(/^\+1/, ''),
      '[tag:InboundNumber:Number]': bidRequest.inboundNumber || '',
      '[Call:InboundCallId]': bidRequest.inboundCallId || bidRequest.requestId,
      '[Publisher:SubId]': bidRequest.publisherSubId || '',
      '[Publisher:Id]': bidRequest.publisherId?.toString() || '',
      '[Call:CallerId]': bidRequest.callerId || '',
      '[Call:CallerIdNoPlus]': (bidRequest.callerId || '').replace(/^\+1/, ''),
    };
  }

  /**
   * Convert state code to full state name
   */
  private static getFullStateName(stateCode: string): string {
    const stateNames: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
    };
    return stateNames[stateCode] || stateCode;
  }

  /**
   * Get major city for state (fallback for geographic data)
   */
  private static getCityFromState(stateCode: string): string {
    const stateCities: Record<string, string> = {
      'NY': 'New York', 'CA': 'Los Angeles', 'TX': 'Houston', 'FL': 'Miami',
      'IL': 'Chicago', 'PA': 'Philadelphia', 'OH': 'Columbus', 'GA': 'Atlanta',
      'NC': 'Charlotte', 'MI': 'Detroit', 'NJ': 'Newark', 'TN': 'Nashville',
      'IN': 'Indianapolis', 'AZ': 'Phoenix', 'MA': 'Boston', 'WA': 'Seattle',
      'CO': 'Denver', 'DC': 'Washington', 'MD': 'Baltimore', 'KY': 'Louisville',
      'OR': 'Portland', 'NV': 'Las Vegas', 'WI': 'Milwaukee', 'NM': 'Albuquerque',
      'LA': 'New Orleans', 'HI': 'Honolulu', 'NE': 'Omaha', 'ID': 'Boise',
      'WV': 'Charleston', 'NH': 'Manchester', 'ME': 'Portland', 'RI': 'Providence',
      'MT': 'Billings', 'DE': 'Wilmington', 'SD': 'Sioux Falls', 'ND': 'Fargo',
      'AK': 'Anchorage', 'VT': 'Burlington', 'WY': 'Cheyenne', 'UT': 'Salt Lake City',
      'OK': 'Oklahoma City', 'AR': 'Little Rock', 'MS': 'Jackson', 'AL': 'Birmingham',
      'SC': 'Columbia', 'MN': 'Minneapolis', 'IA': 'Des Moines', 'KS': 'Wichita',
      'MO': 'Kansas City', 'CT': 'Hartford', 'VA': 'Virginia Beach'
    };
    return stateCities[stateCode] || 'Unknown';
  }

  /**
   * Get timezone for state
   */
  private static getTimezoneFromState(stateCode: string): string {
    const stateTimezones: Record<string, string> = {
      'NY': 'America/New_York', 'CA': 'America/Los_Angeles', 'TX': 'America/Chicago',
      'FL': 'America/New_York', 'IL': 'America/Chicago', 'PA': 'America/New_York',
      'OH': 'America/New_York', 'GA': 'America/New_York', 'NC': 'America/New_York',
      'MI': 'America/New_York', 'NJ': 'America/New_York', 'TN': 'America/Chicago',
      'IN': 'America/New_York', 'AZ': 'America/Phoenix', 'MA': 'America/New_York',
      'WA': 'America/Los_Angeles', 'CO': 'America/Denver', 'DC': 'America/New_York',
      'MD': 'America/New_York', 'KY': 'America/New_York', 'OR': 'America/Los_Angeles',
      'NV': 'America/Los_Angeles', 'WI': 'America/Chicago', 'NM': 'America/Denver',
      'LA': 'America/Chicago', 'HI': 'Pacific/Honolulu', 'NE': 'America/Chicago',
      'ID': 'America/Boise', 'WV': 'America/New_York', 'NH': 'America/New_York',
      'ME': 'America/New_York', 'RI': 'America/New_York', 'MT': 'America/Denver',
      'DE': 'America/New_York', 'SD': 'America/Chicago', 'ND': 'America/Chicago',
      'AK': 'America/Anchorage', 'VT': 'America/New_York', 'WY': 'America/Denver',
      'UT': 'America/Denver', 'OK': 'America/Chicago', 'AR': 'America/Chicago',
      'MS': 'America/Chicago', 'AL': 'America/Chicago', 'SC': 'America/New_York',
      'MN': 'America/Chicago', 'IA': 'America/Chicago', 'KS': 'America/Chicago',
      'MO': 'America/Chicago', 'CT': 'America/New_York', 'VA': 'America/New_York'
    };
    return stateTimezones[stateCode] || 'America/New_York';
  }

  /**
   * Extract value from response using JSONPath or simple property access
   */
  private static extractResponseValue(response: any, path: string): any {
    if (!path) return null;

    try {
      // Handle simple property access first
      if (!path.includes('.') && !path.includes('[')) {
        return response[path];
      }

      // Handle JSONPath-style access
      if (path.startsWith('$.')) {
        return this.evaluateJsonPath(response, path);
      }

      // Handle dot notation
      const keys = path.split('.');
      let current = response;
      for (const key of keys) {
        if (current === null || current === undefined) return null;
        current = current[key];
      }
      return current;
    } catch (error) {
      console.error(`Error extracting value from path ${path}:`, error);
      return null;
    }
  }

  /**
   * Simple JSONPath evaluator for common patterns
   */
  private static evaluateJsonPath(obj: any, path: string): any {
    // Remove leading $. if present
    const cleanPath = path.startsWith('$.') ? path.slice(2) : path;
    
    // Split by dots and handle array indices
    const parts = cleanPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      
      // Handle array indices like 'items[0]'
      if (part.includes('[') && part.includes(']')) {
        const [arrayName, indexPart] = part.split('[');
        const index = parseInt(indexPart.replace(']', ''));
        current = current[arrayName];
        if (Array.isArray(current)) {
          current = current[index];
        }
      } else {
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * Phase 3: Log RTB auction details for comprehensive tracking
   */
  private static async logRtbAuctionDetails(
    callId: number,
    auctionId: string,
    targetId: number,
    targetName: string,
    bidAmount: string,
    bidStatus: string,
    responseTime: number,
    destinationNumber?: string,
    isWinner: boolean = false,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const auctionDetails = {
        callId,
        auctionId,
        targetId,
        targetName,
        bidAmount,
        bidStatus,
        responseTime,
        destinationNumber,
        isWinner,
        rejectionReason,
        timestamp: new Date(),
        metadata: {
          loggedAt: new Date().toISOString(),
          source: 'RTBService.initiateAuction'
        }
      };

      // Store in database via call-details API
      await fetch(`/api/call-details/api/calls/${callId}/rtb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auctionDetails)
      });

      console.log(`[RTB Phase3] Logged auction details for call ${callId}, target ${targetName}: ${bidStatus}`);
    } catch (error) {
      console.error('[RTB Phase3] Failed to log auction details:', error);
    }
  }

  /**
   * Validate bid request meets caller ID requirements (Campaign-level only)
   */
  private static validateCallerIdRequirement(bidRequest: BidRequest, campaign: any): { valid: boolean; reason?: string } {
    // Use campaign-level setting only (simplified approach)
    const requireCallerId = campaign.rtbRequireCallerId || false;
    
    if (!requireCallerId) {
      return { valid: true }; // Caller ID not required at campaign level
    }
    
    // Check if caller ID is present and valid
    const callerId = bidRequest.callerId;
    if (!callerId || callerId.trim() === '') {
      return { 
        valid: false, 
        reason: `Caller ID required by campaign settings but not provided` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Initiate a real-time bidding auction for an incoming call
   */
  static async initiateAuction(
    campaign: Campaign,
    bidRequest: BidRequest,
    callId?: number // Phase 3: Add callId for auction logging
  ): Promise<AuctionResult> {
    try {
      // Validate that RTB is enabled for this campaign
      if (!campaign.enableRtb) {
        return {
          success: false,
          totalTargetsPinged: 0,
          successfulResponses: 0,
          totalResponseTime: 0,
          error: 'RTB not enabled for this campaign'
        };
      }

      // Get active targets assigned directly to this campaign
      const assignments = await storage.getCampaignRtbTargets(campaign.id);
      const activeAssignments = assignments.filter(a => a.isActive !== false); // Include assignments where isActive is true or undefined

      // Use campaign-level RTB configuration instead of router configuration
      const minBiddersRequired = campaign.minBiddersRequired || 1;
      const biddingTimeoutMs = campaign.biddingTimeoutMs || 3000;

      if (activeAssignments.length < minBiddersRequired) {
        return {
          success: false,
          totalTargetsPinged: 0,
          successfulResponses: 0,
          totalResponseTime: 0,
          error: `Insufficient active targets (${activeAssignments.length}), minimum required: ${minBiddersRequired}`
        };
      }

      // Check if auction already exists for this request ID to prevent duplicates
      const existingRequest = await storage.getRtbBidRequest(bidRequest.requestId);
      if (existingRequest) {
        console.log(`[RTB] Auction already exists for request ID: ${bidRequest.requestId}, skipping duplicate`);
        return {
          success: false,
          totalTargetsPinged: 0,
          successfulResponses: 0,
          totalResponseTime: 0,
          error: 'Auction already processed for this request'
        };
      }

      // Create bid request record with enhanced tracking
      const requestRecord: InsertRtbBidRequest = {
        requestId: bidRequest.requestId,
        campaignId: bidRequest.campaignId,
        rtbRouterId: null, // No router in direct assignment model
        callerId: bidRequest.callerId,
        callerState: bidRequest.callerState,
        callerZip: bidRequest.callerZip,
        callStartTime: bidRequest.callStartTime,
        tags: bidRequest.tags,
        timeoutMs: bidRequest.timeoutMs || biddingTimeoutMs,
        totalTargetsPinged: activeAssignments.length,
        successfulResponses: 0,
        
        // Enhanced publisher tracking for Ringba compliance
        publisherId: bidRequest.publisherId,
        publisherSubId: bidRequest.publisherSubId,
        inboundNumber: bidRequest.inboundNumber,
        inboundCallId: bidRequest.inboundCallId || this.generateInboundCallId(bidRequest.publisherId, bidRequest.campaignId),
        exposeCallerId: bidRequest.exposeCallerId
      };

      const storedRequest = await storage.createRtbBidRequest(requestRecord);

      // Filter targets by geographic eligibility and caller ID requirements
      const eligibleTargets: typeof activeAssignments = [];
      
      for (const assignment of activeAssignments) {
        try {
          const target = await storage.getRtbTarget(assignment.rtbTargetId);
          if (!target) {
            console.log(`[RTB] Target ${assignment.rtbTargetId} not found`);
            continue;
          }
          
          // Validate geographic targeting
          if (!await RTBService.validateGeographicTargeting(target, bidRequest)) {
            console.log(`[RTB] Target ${assignment.rtbTargetId} failed geographic validation`);
            continue;
          }
          
          // Validate caller ID requirements (campaign-level only)
          const callerIdValidation = this.validateCallerIdRequirement(bidRequest, campaign);
          if (!callerIdValidation.valid) {
            console.log(`[RTB] Target ${assignment.rtbTargetId} rejected: ${callerIdValidation.reason}`);
            continue;
          }
          
          eligibleTargets.push(assignment);
        } catch (error) {
          console.error(`[RTB] Error validating target ${assignment.rtbTargetId}:`, error);
        }
      }

      if (eligibleTargets.length === 0) {
        return {
          success: false,
          totalTargetsPinged: activeAssignments.length,
          successfulResponses: 0,
          totalResponseTime: 0,
          error: 'No targets eligible after geographic filtering'
        };
      }

      // Send bid requests to geographically eligible targets in parallel
      const targetPromises = eligibleTargets.map(assignment => 
        this.sendBidRequest(assignment.rtbTargetId, bidRequest)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(targetPromises);
      const totalResponseTime = Date.now() - startTime;

      // Phase 3: Generate unique auction ID for tracking
      const auctionId = `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process responses and store them
      const validBids: RtbBidResponse[] = [];
      let successfulResponses = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const targetId = eligibleTargets[i].rtbTargetId;
        const target = await storage.getRtbTarget(targetId);
        const targetName = target?.name || `Target ${targetId}`;

        if (result.status === 'fulfilled' && result.value) {
          const response: InsertRtbBidResponse = {
            requestId: bidRequest.requestId,
            rtbTargetId: targetId,
            bidAmount: result.value.bidAmount,
            bidCurrency: result.value.bidCurrency,
            destinationNumber: result.value.destinationNumber,
            requiredDuration: result.value.requiredDuration,
            responseTimeMs: result.value.responseTimeMs,
            responseStatus: 'success',
            isValid: result.value.isValid,
            isWinningBid: false
          };

          const storedResponse = await storage.createRtbBidResponse(response);
          
          if (result.value.isValid) {
            validBids.push(storedResponse);
            successfulResponses++;

            // Phase 3: Log successful auction details
            if (callId) {
              await this.logRtbAuctionDetails(
                callId,
                auctionId,
                targetId,
                targetName,
                result.value.bidAmount.toString(),
                'bid_received',
                result.value.responseTimeMs,
                result.value.destinationNumber,
                false // Will be updated to true for winner
              );
            }
          }
        } else {
          // Store failed response
          await storage.createRtbBidResponse({
            requestId: bidRequest.requestId,
            rtbTargetId: targetId,
            bidAmount: 0,
            bidCurrency: 'USD',
            destinationNumber: '',
            responseTimeMs: bidRequest.timeoutMs || 5000,
            responseStatus: 'timeout',
            isValid: false,
            isWinningBid: false,
            errorMessage: result.status === 'rejected' ? String(result.reason) : 'No response'
          });

          // Phase 3: Log failed auction details
          if (callId) {
            await this.logRtbAuctionDetails(
              callId,
              auctionId,
              targetId,
              targetName,
              '0.00',
              'failed',
              bidRequest.timeoutMs || 5000,
              undefined,
              false,
              result.status === 'rejected' ? String(result.reason) : 'No response'
            );
          }
        }
      }

      // Select winning bid (highest valid bid)
      let winningBid: RtbBidResponse | undefined;
      if (validBids.length > 0) {
        winningBid = validBids.reduce((highest, current) => {
          // Convert bid amounts to numbers for proper comparison
          const currentBid = parseFloat(current.bidAmount.toString());
          const highestBid = parseFloat(highest.bidAmount.toString());
          
          console.log(`[RTB Auction] Comparing bids: Target ${current.rtbTargetId} ($${currentBid}) vs Target ${highest.rtbTargetId} ($${highestBid})`);
          
          // Higher bid amount wins
          if (currentBid > highestBid) {
            console.log(`[RTB Auction] New highest bid: $${currentBid} from target ${current.rtbTargetId} (${current.responseTimeMs}ms)`);
            return current;
          }
          
          // If bid amounts are equal, fastest response time wins
          if (currentBid === highestBid) {
            const winner = current.responseTimeMs < highest.responseTimeMs ? current : highest;
            if (winner.id === current.id) {
              console.log(`[RTB Auction] Tie-breaker: $${currentBid} tie, target ${current.rtbTargetId} wins with ${current.responseTimeMs}ms vs ${highest.responseTimeMs}ms`);
            }
            return winner;
          }
          
          return highest;
        });

        // Mark winner and update bid request
        await storage.updateRtbBidResponse(winningBid.id, { isWinningBid: true });
        await storage.updateRtbBidRequest(bidRequest.requestId, {
          successfulResponses,
          winningBidAmount: winningBid.bidAmount,
          winningTargetId: winningBid.rtbTargetId,
          biddingCompletedAt: new Date(),
          totalResponseTimeMs: totalResponseTime
        });

        // Phase 3: Log winner selection
        if (callId) {
          const winnerTarget = await storage.getRtbTarget(winningBid.rtbTargetId);
          await this.logRtbAuctionDetails(
            callId,
            auctionId,
            winningBid.rtbTargetId,
            winnerTarget?.name || `Target ${winningBid.rtbTargetId}`,
            winningBid.bidAmount.toString(),
            'won',
            winningBid.responseTimeMs,
            winningBid.destinationNumber,
            true
          );
        }

        // Log final winner selection
        console.log(`[RTB Auction] Winner selected: Target ${winningBid.rtbTargetId} with $${winningBid.bidAmount} bid (${winningBid.responseTimeMs}ms response time)`);
        
        // Check if there were any ties
        const sameBidAmount = validBids.filter(bid => bid.bidAmount === winningBid.bidAmount);
        if (sameBidAmount.length > 1) {
          console.log(`[RTB Auction] ${sameBidAmount.length} targets tied at $${winningBid.bidAmount} - winner selected by fastest response time`);
        }
      } else {
        // No valid bids received
        await storage.updateRtbBidRequest(bidRequest.requestId, {
          successfulResponses: 0,
          biddingCompletedAt: new Date(),
          totalResponseTimeMs: totalResponseTime
        });
      }

      return {
        success: !!winningBid,
        winningBid,
        totalTargetsPinged: activeAssignments.length,
        successfulResponses,
        totalResponseTime,
        error: !winningBid ? 'No valid bids received' : undefined
      };

    } catch (error) {
      console.error('RTB auction error:', error);
      return {
        success: false,
        totalTargetsPinged: 0,
        successfulResponses: 0,
        totalResponseTime: 0,
        error: `Auction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send bid request to a specific target
   */
  private static async sendBidRequest(
    targetId: number,
    bidRequest: BidRequest
  ): Promise<BidResponse | null> {
    const startTime = Date.now(); // Move startTime to the beginning so it's in scope for error handling
    
    try {
      const target = await storage.getRtbTarget(targetId);
      if (!target || !target.isActive) {
        throw new Error('Target not found or inactive');
      }

      // Check capacity limits
      if (!await this.checkTargetCapacity(target)) {
        throw new Error('Target capacity exceeded');
      }

      // Check operating hours
      if (!this.checkOperatingHours(target)) {
        throw new Error('Target outside operating hours');
      }

      // Prepare bid request with template substitution
      const requestWithTargetData = {
        ...bidRequest,
        minBid: parseFloat(target.minBidAmount.toString()),
        maxBid: parseFloat(target.maxBidAmount.toString()),
        currency: target.currency
      };

      // Prepare request body (template substitution or JSON payload)
      let requestBody: string;
      if (target.requestBody) {
        // Use custom request body template with variable substitution
        requestBody = this.substituteTemplateVariables(target.requestBody, requestWithTargetData);
      } else {
        // Default JSON payload
        const payload = {
          requestId: bidRequest.requestId,
          campaignId: bidRequest.campaignRtbId || bidRequest.campaignId.toString(),
          callerId: bidRequest.callerId,
          callerState: bidRequest.callerState,
          callerZip: bidRequest.callerZip,
          callStartTime: bidRequest.callStartTime.toISOString(),
          tags: bidRequest.tags,
          timeoutMs: bidRequest.timeoutMs || 5000,
          minBid: target.minBidAmount,
          maxBid: target.maxBidAmount,
          currency: target.currency
        };
        requestBody = JSON.stringify(payload);
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': target.contentType || 'application/json',
        'User-Agent': 'CallCenter-RTB/1.0'
      };

      // Add authentication headers
      if (target.authMethod === 'api_key' && target.authToken) {
        headers['X-API-Key'] = target.authToken;
      } else if (target.authMethod === 'bearer' && target.authToken) {
        headers['Authorization'] = `Bearer ${target.authToken}`;
      } else if (target.authMethod === 'basic' && target.authToken) {
        headers['Authorization'] = `Basic ${target.authToken}`;
      } else if (target.authMethod === 'choose_authentication') {
        // For Ringba RTB endpoints, authentication is typically handled via URL tokens
        // No explicit Authorization header needed - authentication is in the endpoint URL
        console.log(`[RTB] Using URL-based authentication for ${target.name}`);
      }

      // Add custom headers
      if (target.authHeaders) {
        Object.assign(headers, target.authHeaders);
      }

      // startTime already defined at function beginning
      const timeoutMs = target.timeoutMs || 5000;
      
      // Debug: Log the request being sent
      console.log(`[RTB] Sending request to ${target.name} (${target.endpointUrl})`);
      console.log(`[RTB] Request body: ${requestBody}`);
      console.log(`[RTB] Headers:`, headers);
      
      // Make HTTP request to target endpoint using AbortSignal.timeout (same as working test service)
      const response = await fetch(target.endpointUrl, {
        method: target.httpMethod || 'POST',
        headers,
        body: target.httpMethod === 'GET' ? undefined : requestBody,
        signal: AbortSignal.timeout(timeoutMs)
      });
      
      console.log(`[RTB] Got response from ${target.name}: ${response.status} ${response.statusText}`);

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 204) {
          // No bid response, return null to indicate no bid
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log(`[RTB] ===== RESPONSE FROM ${target.name} =====`);
      console.log(`[RTB] Status: ${response.status} ${response.statusText}`);
      console.log(`[RTB] Response body:`, responseText);
      console.log(`[RTB] ===== END RESPONSE =====`);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[RTB] Failed to parse JSON response from ${target.name}:`, parseError);
        console.log(`[RTB] Raw response text:`, responseText);
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      // Use advanced response parsing with JSONPath
      const bidAmount = this.extractResponseValue(responseData, target.bidAmountPath) || 
                       responseData.bidAmount || responseData.price || 0;
      
      const destinationNumber = this.extractResponseValue(responseData, target.destinationNumberPath) || 
                               responseData.destinationNumber || responseData.phoneNumber || null;
      
      const currency = this.extractResponseValue(responseData, target.currencyPath) || 
                      responseData.bidCurrency || responseData.currency || target.currency;
      
      const requiredDuration = this.extractResponseValue(responseData, target.durationPath) || 
                              responseData.requiredDuration || responseData.duration;
      
      const acceptance = this.extractResponseValue(responseData, target.acceptancePath) || 
                        responseData.accepted || responseData.accept || true;

      // Validate response format
      const responseToValidate = { bidAmount, destinationNumber, currency };
      console.log(`[RTB] Validating response for ${target.name}:`, responseToValidate);
      
      if (!this.validateBidResponse(responseToValidate, target)) {
        console.log(`[RTB] Response validation FAILED for ${target.name}:`, {
          bidAmount: bidAmount,
          bidAmountType: typeof bidAmount,
          destinationNumber: destinationNumber,
          destinationNumberType: typeof destinationNumber,
          isValidBidAmount: !isNaN(parseFloat(bidAmount)) && parseFloat(bidAmount) >= 0,
          isBidZero: parseFloat(bidAmount) === 0
        });
        throw new Error('Invalid bid response format');
      }
      
      console.log(`[RTB] Response validation PASSED for ${target.name}`);

      const isValid = this.isBidValid({ bidAmount, destinationNumber, currency, accepted: acceptance }, target);
      
      return {
        targetId: target.id,
        bidAmount: parseFloat(bidAmount.toString()),
        bidCurrency: currency,
        destinationNumber: destinationNumber,
        requiredDuration: requiredDuration ? parseInt(requiredDuration.toString()) : undefined,
        responseTimeMs: responseTime,
        isValid
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[RTB] Bid request failed for target ID ${targetId}:`, error);
      console.error(`[RTB] Error type:`, error instanceof Error ? error.name : typeof error);
      console.error(`[RTB] Error message:`, error instanceof Error ? error.message : error);
      console.error(`[RTB] Response time: ${responseTime}ms, Timeout setting: ${target.timeoutMs || 5000}ms`);
      
      // For timeout errors, log specific details
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
        console.log(`[RTB] ${target.name} TIMED OUT after ${responseTime}ms (limit: ${target.timeoutMs || 5000}ms)`);
      }
      
      return null;
    }
  }

  /**
   * Check if target has available capacity
   */
  private static async checkTargetCapacity(target: RtbTarget): Promise<boolean> {
    // This would check current concurrent calls, daily/hourly caps, etc.
    // For now, return true - implement capacity checking logic as needed
    return true;
  }

  /**
   * Check if target is within operating hours
   */
  private static checkOperatingHours(target: RtbTarget): boolean {
    if (!target.hoursOfOperation) {
      return true; // No restrictions
    }

    // This would check if current time is within operating hours
    // For now, return true - implement time checking logic as needed
    return true;
  }

  /**
   * Validate bid response structure
   */
  private static validateBidResponse(response: any, target: RtbTarget): boolean {
    // Basic response object validation
    if (typeof response !== 'object' || response === null) {
      return false;
    }
    
    // Check if bidAmount is present and valid (can be 0 for rejections)
    const bidAmount = parseFloat(response.bidAmount);
    if (isNaN(bidAmount) || bidAmount < 0) {
      return false;
    }
    
    // For bid rejections (bidAmount = 0), destinationNumber is not required
    if (bidAmount === 0) {
      return true; // Valid rejection response
    }
    
    // For valid bids (bidAmount > 0), destinationNumber is required
    return typeof response.destinationNumber === 'string' && response.destinationNumber.length > 0;
  }

  /**
   * Check if bid meets validation criteria
   */
  private static isBidValid(response: any, target: RtbTarget): boolean {
    const bidAmount = parseFloat(response.bidAmount);
    
    // If bid amount is 0, this is a rejection - mark as invalid for auction purposes
    if (bidAmount === 0) {
      return false; // Valid response format, but rejected bid
    }
    
    const minBid = parseFloat(target.minBidAmount as any) || 0;
    const maxBid = parseFloat(target.maxBidAmount as any) || 999999;
    
    // Check if the bid is explicitly accepted (if acceptance field is present)
    const isAccepted = response.accepted === undefined ? true : Boolean(response.accepted);
    
    return (
      isAccepted &&
      bidAmount >= minBid &&
      bidAmount <= maxBid &&
      response.destinationNumber &&
      response.destinationNumber.length > 0
    );
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    return `rtb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get RTB statistics for a campaign
   */
  static async getCampaignRTBStats(campaignId: number, days: number = 30): Promise<{
    totalRequests: number;
    totalWins: number;
    winRate: number;
    averageBidAmount: number;
    averageResponseTime: number;
  }> {
    try {
      const requests = await storage.getRtbBidRequests(campaignId);
      
      // Filter to last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const recentRequests = requests.filter(r => r.createdAt >= cutoffDate);

      const totalRequests = recentRequests.length;
      const totalWins = recentRequests.filter(r => r.winningBidAmount && r.winningBidAmount > 0).length;
      const winRate = totalRequests > 0 ? (totalWins / totalRequests) * 100 : 0;

      const validWins = recentRequests.filter(r => r.winningBidAmount && r.winningBidAmount > 0);
      const averageBidAmount = validWins.length > 0 
        ? validWins.reduce((sum, r) => sum + Number(r.winningBidAmount), 0) / validWins.length 
        : 0;

      const requestsWithTime = recentRequests.filter(r => r.totalResponseTimeMs);
      const averageResponseTime = requestsWithTime.length > 0
        ? requestsWithTime.reduce((sum, r) => sum + (r.totalResponseTimeMs || 0), 0) / requestsWithTime.length
        : 0;

      return {
        totalRequests,
        totalWins,
        winRate,
        averageBidAmount,
        averageResponseTime
      };
    } catch (error) {
      console.error('Error getting RTB stats:', error);
      return {
        totalRequests: 0,
        totalWins: 0,
        winRate: 0,
        averageBidAmount: 0,
        averageResponseTime: 0
      };
    }
  }

  /**
   * Phase 2: Validate geographic targeting for RTB target
   */
  private static async validateGeographicTargeting(target: any, bidRequest: any): Promise<boolean> {
    if (!target.enableGeoTargeting) {
      return true; // Geographic targeting disabled, allow all
    }

    const { geoTargetingMode } = target;
    const isInclusive = geoTargetingMode === 'inclusive';
    
    // Extract caller location data (would come from Twilio or caller ID lookup)
    const callerState = bidRequest.callerState;
    const callerZipCode = bidRequest.callerZip;
    const callerAreaCode = bidRequest.callerAreaCode;
    const callerLat = bidRequest.callerLatitude;
    const callerLng = bidRequest.callerLongitude;

    // State-based targeting
    if (target.allowedStates?.length > 0 && isInclusive) {
      if (!callerState || !target.allowedStates.includes(callerState)) {
        console.log(`[RTB] State ${callerState} not in allowed states for target ${target.id}`);
        return false;
      }
    }
    
    if (target.blockedStates?.length > 0 && !isInclusive) {
      if (callerState && target.blockedStates.includes(callerState)) {
        console.log(`[RTB] State ${callerState} is blocked for target ${target.id}`);
        return false;
      }
    }

    // Zip code targeting
    if (target.allowedZipCodes?.length > 0 && isInclusive) {
      if (!callerZipCode || !target.allowedZipCodes.includes(callerZipCode)) {
        console.log(`[RTB] Zip code ${callerZipCode} not in allowed zip codes for target ${target.id}`);
        return false;
      }
    }
    
    if (target.blockedZipCodes?.length > 0 && !isInclusive) {
      if (callerZipCode && target.blockedZipCodes.includes(callerZipCode)) {
        console.log(`[RTB] Zip code ${callerZipCode} is blocked for target ${target.id}`);
        return false;
      }
    }

    // Area code targeting
    if (target.allowedAreaCodes?.length > 0 && isInclusive) {
      if (!callerAreaCode || !target.allowedAreaCodes.includes(callerAreaCode)) {
        console.log(`[RTB] Area code ${callerAreaCode} not in allowed area codes for target ${target.id}`);
        return false;
      }
    }
    
    if (target.blockedAreaCodes?.length > 0 && !isInclusive) {
      if (callerAreaCode && target.blockedAreaCodes.includes(callerAreaCode)) {
        console.log(`[RTB] Area code ${callerAreaCode} is blocked for target ${target.id}`);
        return false;
      }
    }

    // Radius-based targeting
    if (target.geoRadius && target.geoCenter && callerLat && callerLng) {
      const distance = RTBService.calculateDistance(
        callerLat,
        callerLng,
        target.geoCenter.lat,
        target.geoCenter.lng
      );
      
      if (isInclusive && distance > target.geoRadius) {
        console.log(`[RTB] Caller outside ${target.geoRadius} mile radius for target ${target.id} (distance: ${distance.toFixed(2)} miles)`);
        return false;
      }
      
      if (!isInclusive && distance <= target.geoRadius) {
        console.log(`[RTB] Caller inside blocked ${target.geoRadius} mile radius for target ${target.id} (distance: ${distance.toFixed(2)} miles)`);
        return false;
      }
    }

    console.log(`[RTB] Geographic targeting validation passed for target ${target.id}`);
    return true;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = RTBService.toRadians(lat2 - lat1);
    const dLon = RTBService.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(RTBService.toRadians(lat1)) * Math.cos(RTBService.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}