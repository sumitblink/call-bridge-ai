import { storage } from './storage-db';

/**
 * Phase 3: Routing Decision Tracker for comprehensive call routing analytics
 * Tracks all routing decisions, attempts, and outcomes for detailed analysis
 */
export class RoutingDecisionTracker {
  
  /**
   * Log a routing decision for a call
   */
  static async logRoutingDecision(
    callId: number,
    sequenceNumber: number,
    targetType: 'buyer' | 'rtb' | 'voicemail' | 'fallback',
    targetId?: number,
    targetName?: string,
    priority?: number,
    weight?: number,
    reason?: string,
    outcome: 'selected' | 'attempted' | 'failed' | 'rejected' | 'timeout' = 'attempted',
    responseTime?: number,
    bidAmount?: string,
    metadata?: any
  ): Promise<void> {
    try {
      const routingDecision = {
        callId,
        sequenceNumber,
        targetType,
        targetId,
        targetName,
        priority,
        weight,
        reason,
        outcome,
        responseTime,
        bidAmount,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          loggedAt: new Date().toISOString(),
          source: 'RoutingDecisionTracker'
        }
      };

      // Store in database via call-details API
      await fetch(`/api/call-details/api/calls/${callId}/routing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routingDecision)
      });

      console.log(`[Routing Phase3] Logged routing decision for call ${callId}: ${targetType} ${targetName || targetId} - ${outcome}`);
    } catch (error) {
      console.error('[Routing Phase3] Failed to log routing decision:', error);
    }
  }

  /**
   * Log RTB auction initiation
   */
  static async logRtbAuctionStart(
    callId: number,
    sequenceNumber: number,
    campaignId: string,
    eligibleTargets: number,
    reason: string = 'RTB auction initiated'
  ): Promise<void> {
    await this.logRoutingDecision(
      callId,
      sequenceNumber,
      'rtb',
      undefined,
      'RTB Auction',
      undefined,
      undefined,
      reason,
      'attempted',
      undefined,
      undefined,
      { 
        campaignId, 
        eligibleTargets,
        auctionType: 'real_time_bidding'
      }
    );
  }

  /**
   * Log traditional buyer selection
   */
  static async logBuyerSelection(
    callId: number,
    sequenceNumber: number,
    buyerId: number,
    buyerName: string,
    priority: number,
    reason: string,
    outcome: 'selected' | 'failed' = 'selected',
    responseTime?: number
  ): Promise<void> {
    await this.logRoutingDecision(
      callId,
      sequenceNumber,
      'buyer',
      buyerId,
      buyerName,
      priority,
      undefined,
      reason,
      outcome,
      responseTime
    );
  }

  /**
   * Log fallback routing decisions
   */
  static async logFallbackRouting(
    callId: number,
    sequenceNumber: number,
    fallbackType: 'voicemail' | 'busy_message' | 'no_agents',
    reason: string
  ): Promise<void> {
    await this.logRoutingDecision(
      callId,
      sequenceNumber,
      'fallback',
      undefined,
      fallbackType.replace('_', ' '),
      undefined,
      undefined,
      reason,
      'selected'
    );
  }

  /**
   * Log routing failure
   */
  static async logRoutingFailure(
    callId: number,
    sequenceNumber: number,
    targetType: 'buyer' | 'rtb',
    targetId: number,
    targetName: string,
    reason: string,
    responseTime?: number
  ): Promise<void> {
    await this.logRoutingDecision(
      callId,
      sequenceNumber,
      targetType,
      targetId,
      targetName,
      undefined,
      undefined,
      reason,
      'failed',
      responseTime
    );
  }
}