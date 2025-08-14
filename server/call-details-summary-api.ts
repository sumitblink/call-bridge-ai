import { Router } from "express";
import { 
  calls, campaigns, rtbBidRequests, rtbBidResponses, rtbTargets, buyers
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "./middleware/auth";

const router = Router();

// Enhanced call details summary endpoint
router.get("/api/call-details/summary", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get all calls with comprehensive RTB and routing information
    const callsData = await db
      .select({
        // Basic call information
        id: calls.id,
        callSid: calls.callSid,
        campaignId: calls.campaignId,
        fromNumber: calls.fromNumber,
        toNumber: calls.toNumber,
        status: calls.status,
        duration: calls.duration,
        createdAt: calls.createdAt,
        completedAt: calls.completedAt,
        targetId: calls.targetId,
        buyerId: calls.buyerId,
        // Campaign information
        campaignName: campaigns.name,
      })
      .from(calls)
      .leftJoin(campaigns, eq(calls.campaignId, campaigns.id))
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(calls.createdAt))
      .limit(100);

    // For each call, get RTB auction details
    const callsWithRtbDetails = await Promise.all(
      callsData.map(async (call) => {
        try {
          // Find RTB bid request for this call
          const bidRequest = await db.query.rtbBidRequests.findFirst({
            where: and(
              eq(rtbBidRequests.campaignId, call.campaignId!),
              sql`${rtbBidRequests.requestId} LIKE '%' || ${call.callSid} || '%'`
            )
          });

          if (!bidRequest) {
            return {
              ...call,
              winnerTargetId: call.targetId,
              winnerTargetName: null,
              winningBidAmount: 0,
              winnerDestination: null,
              winnerBuyerName: null,
              totalBids: 0,
              successfulBids: 0,
              avgResponseTime: 0,
              totalRevenue: 0
            };
          }

          // Get all bid responses for this request
          const bidResponses = await db
            .select({
              id: rtbBidResponses.id,
              rtbTargetId: rtbBidResponses.rtbTargetId,
              targetName: rtbTargets.name,
              buyerName: buyers.name,
              bidAmount: rtbBidResponses.bidAmount,
              destinationNumber: rtbBidResponses.destinationNumber,
              responseTimeMs: rtbBidResponses.responseTimeMs,
              responseStatus: rtbBidResponses.responseStatus,
              rejectionReason: rtbBidResponses.rejectionReason,
            })
            .from(rtbBidResponses)
            .leftJoin(rtbTargets, eq(rtbBidResponses.rtbTargetId, rtbTargets.id))
            .leftJoin(buyers, eq(rtbTargets.buyerId, buyers.id))
            .where(eq(rtbBidResponses.requestId, bidRequest.requestId))
            .orderBy(desc(rtbBidResponses.bidAmount));

          // Calculate RTB statistics
          const successfulBids = bidResponses.filter(b => 
            b.responseStatus === 'success' && !b.rejectionReason && (b.bidAmount || 0) > 0
          );
          
          const avgResponseTime = bidResponses.length > 0 
            ? Math.round(bidResponses.reduce((sum, b) => sum + (b.responseTimeMs || 0), 0) / bidResponses.length)
            : 0;

          // Find winner based on call's target_id
          const winner = bidResponses.find(b => b.rtbTargetId === call.targetId);
          
          return {
            ...call,
            winnerTargetId: call.targetId,
            winnerTargetName: winner?.targetName || null,
            winningBidAmount: winner?.bidAmount ? parseFloat(winner.bidAmount.toString()) : 0,
            winnerDestination: winner?.destinationNumber || null,
            winnerBuyerName: winner?.buyerName || null,
            totalBids: bidResponses.length,
            successfulBids: successfulBids.length,
            avgResponseTime,
            totalRevenue: successfulBids.reduce((sum, b) => sum + parseFloat(b.bidAmount?.toString() || '0'), 0)
          };
        } catch (error) {
          console.error(`Error processing RTB data for call ${call.id}:`, error);
          return {
            ...call,
            winnerTargetId: call.targetId,
            winnerTargetName: null,
            winningBidAmount: 0,
            winnerDestination: null,
            winnerBuyerName: null,
            totalBids: 0,
            successfulBids: 0,
            avgResponseTime: 0,
            totalRevenue: 0
          };
        }
      })
    );

    res.json({ calls: callsWithRtbDetails });
  } catch (error) {
    console.error("Error fetching call details summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Detailed RTB bid information for a specific call
router.get("/api/call-details/bids/:callId", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get the call to verify ownership and get call details
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
      with: {
        campaign: {
          columns: { userId: true }
        }
      }
    });

    if (!call || call.campaign?.userId !== userId) {
      return res.status(404).json({ message: "Call not found" });
    }

    // Find RTB bid request for this call
    const bidRequest = await db.query.rtbBidRequests.findFirst({
      where: and(
        eq(rtbBidRequests.campaignId, call.campaignId!),
        sql`${rtbBidRequests.requestId} LIKE '%' || ${call.callSid} || '%'`
      )
    });

    if (!bidRequest) {
      return res.json({ bids: [] });
    }

    // Get all bid responses with complete details
    const bidDetails = await db
      .select({
        id: rtbBidResponses.id,
        callId: sql<number>`${callId}`,
        targetId: rtbBidResponses.rtbTargetId,
        targetName: rtbTargets.name,
        buyerName: buyers.name,
        bidAmount: rtbBidResponses.bidAmount,
        destinationNumber: rtbBidResponses.destinationNumber,
        responseTime: rtbBidResponses.responseTimeMs,
        status: rtbBidResponses.responseStatus,
        rejectionReason: rtbBidResponses.rejectionReason,
      })
      .from(rtbBidResponses)
      .leftJoin(rtbTargets, eq(rtbBidResponses.rtbTargetId, rtbTargets.id))
      .leftJoin(buyers, eq(rtbTargets.buyerId, buyers.id))
      .where(eq(rtbBidResponses.requestId, bidRequest.requestId))
      .orderBy(desc(rtbBidResponses.bidAmount));

    // Add winner determination and clean up data
    const bidsWithWinnerInfo = bidDetails.map(bid => ({
      ...bid,
      bidAmount: parseFloat(bid.bidAmount?.toString() || '0'),
      responseTime: bid.responseTime || 0,
      isWinner: bid.targetId === call.targetId,
      buyerName: bid.buyerName || 'Unknown Buyer',
      targetName: bid.targetName || `Target ${bid.targetId}`
    }));

    res.json({ bids: bidsWithWinnerInfo });
  } catch (error) {
    console.error("Error fetching bid details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;