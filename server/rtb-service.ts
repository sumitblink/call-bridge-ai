import { storage } from './storage-db';
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
   * Initiate a real-time bidding auction for an incoming call
   */
  static async initiateAuction(
    campaign: Campaign,
    bidRequest: BidRequest
  ): Promise<AuctionResult> {
    try {
      // Validate that RTB is enabled for this campaign
      if (!campaign.enableRtb || !campaign.rtbRouterId) {
        return {
          success: false,
          totalTargetsPinged: 0,
          successfulResponses: 0,
          totalResponseTime: 0,
          error: 'RTB not enabled for this campaign'
        };
      }

      // Get RTB router configuration
      const router = await storage.getRtbRouter(campaign.rtbRouterId);
      if (!router || !router.isActive) {
        return {
          success: false,
          totalTargetsPinged: 0,
          successfulResponses: 0,
          totalResponseTime: 0,
          error: 'RTB router not found or inactive'
        };
      }

      // Get active targets assigned to this router
      const assignments = await storage.getRtbRouterAssignments(router.id);
      const activeAssignments = assignments.filter(a => a.isActive);

      if (activeAssignments.length < router.minBiddersRequired) {
        return {
          success: false,
          totalTargetsPinged: 0,
          successfulResponses: 0,
          totalResponseTime: 0,
          error: `Insufficient active targets (${activeAssignments.length}), minimum required: ${router.minBiddersRequired}`
        };
      }

      // Create bid request record
      const requestRecord: InsertRtbBidRequest = {
        requestId: bidRequest.requestId,
        campaignId: bidRequest.campaignId,
        rtbRouterId: router.id,
        callerId: bidRequest.callerId,
        callerState: bidRequest.callerState,
        callerZip: bidRequest.callerZip,
        callStartTime: bidRequest.callStartTime,
        tags: bidRequest.tags,
        timeoutMs: bidRequest.timeoutMs || router.biddingTimeoutMs,
        totalTargetsPinged: activeAssignments.length,
        successfulResponses: 0
      };

      const storedRequest = await storage.createRtbBidRequest(requestRecord);

      // Send bid requests to all active targets in parallel
      const targetPromises = activeAssignments.map(assignment => 
        this.sendBidRequest(assignment.rtbTargetId, bidRequest, router)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(targetPromises);
      const totalResponseTime = Date.now() - startTime;

      // Process responses and store them
      const validBids: RtbBidResponse[] = [];
      let successfulResponses = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const targetId = activeAssignments[i].rtbTargetId;

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
          }
        } else {
          // Store failed response
          await storage.createRtbBidResponse({
            requestId: bidRequest.requestId,
            rtbTargetId: targetId,
            bidAmount: 0,
            bidCurrency: 'USD',
            destinationNumber: '',
            responseTimeMs: router.biddingTimeoutMs,
            responseStatus: 'timeout',
            isValid: false,
            isWinningBid: false,
            errorMessage: result.status === 'rejected' ? String(result.reason) : 'No response'
          });
        }
      }

      // Select winning bid (highest valid bid)
      let winningBid: RtbBidResponse | undefined;
      if (validBids.length > 0) {
        winningBid = validBids.reduce((highest, current) => 
          current.bidAmount > highest.bidAmount ? current : highest
        );

        // Mark winner and update bid request
        await storage.updateRtbBidResponse(winningBid.id, { isWinningBid: true });
        await storage.updateRtbBidRequest(bidRequest.requestId, {
          successfulResponses,
          winningBidAmount: winningBid.bidAmount,
          winningTargetId: winningBid.rtbTargetId,
          biddingCompletedAt: new Date(),
          totalResponseTimeMs: totalResponseTime
        });
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
    bidRequest: BidRequest,
    router: RtbRouter
  ): Promise<BidResponse | null> {
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

      // Prepare bid request payload - use RTB ID for external requests
      const payload = {
        requestId: bidRequest.requestId,
        campaignId: bidRequest.campaignRtbId || bidRequest.campaignId.toString(), // Use RTB ID if available, fallback to numeric ID
        callerId: bidRequest.callerId,
        callerState: bidRequest.callerState,
        callerZip: bidRequest.callerZip,
        callStartTime: bidRequest.callStartTime.toISOString(),
        tags: bidRequest.tags,
        timeout: router.biddingTimeoutMs,
        minBid: target.minBidAmount,
        maxBid: target.maxBidAmount,
        currency: target.currency
      };

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'CallCenter-RTB/1.0'
      };

      // Add authentication headers
      if (target.authMethod === 'api_key' && target.authToken) {
        headers['X-API-Key'] = target.authToken;
      } else if (target.authMethod === 'bearer' && target.authToken) {
        headers['Authorization'] = `Bearer ${target.authToken}`;
      } else if (target.authMethod === 'basic' && target.authToken) {
        headers['Authorization'] = `Basic ${target.authToken}`;
      }

      // Add custom headers
      if (target.authHeaders) {
        Object.assign(headers, target.authHeaders);
      }

      const startTime = Date.now();
      
      // Make HTTP request to target endpoint
      const response = await fetch(target.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: target.timeoutMs
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json() as any;

      // Validate response format
      if (!this.validateBidResponse(responseData, target)) {
        throw new Error('Invalid bid response format');
      }

      return {
        targetId: target.id,
        bidAmount: parseFloat(responseData.bidAmount),
        bidCurrency: responseData.bidCurrency || target.currency,
        destinationNumber: responseData.destinationNumber,
        requiredDuration: responseData.requiredDuration,
        responseTimeMs: responseTime,
        isValid: this.isBidValid(responseData, target)
      };

    } catch (error) {
      console.error(`Bid request failed for target ${targetId}:`, error);
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
    return (
      typeof response === 'object' &&
      typeof response.bidAmount === 'number' &&
      typeof response.destinationNumber === 'string' &&
      response.bidAmount >= 0 &&
      response.destinationNumber.length > 0
    );
  }

  /**
   * Check if bid meets validation criteria
   */
  private static isBidValid(response: any, target: RtbTarget): boolean {
    const bidAmount = parseFloat(response.bidAmount);
    
    return (
      bidAmount >= target.minBidAmount &&
      bidAmount <= target.maxBidAmount &&
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
}