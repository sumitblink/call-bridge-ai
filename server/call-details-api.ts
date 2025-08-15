import { Router } from "express";
import { z } from "zod";
import { 
  calls, rtbAuctionDetails, buyers, publishers, rtbTargets,
  rtbBidRequests, rtbBidResponses, insertRtbAuctionDetailsSchema,
  type Call, type RtbAuctionDetails, type InsertRtbAuctionDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "./middleware/auth";

const router = Router();

// Enhanced call details with full tracking information
interface CallWithDetails extends Call {
  rtbAuctions?: RtbAuctionDetails[];
  campaignName?: string;
  buyerName?: string;
}

// Comprehensive RTB auction data interface
interface RtbAuctionSummary {
  requestId: string;
  campaignId: string;
  callerId: string;
  totalTargetsPinged: number;
  successfulResponses: number;
  winningBidAmount: number;
  winningTargetId: number;
  totalResponseTimeMs: number;
  publisherId: number;
  inboundNumber: string;
  callStatus: string;
  callDuration: number;
  fromNumber: string;
  toNumber: string;
  bidResponses: Array<{
    id: number;
    rtbTargetId: number;
    targetName: string;
    bidAmount: number;
    destinationNumber: string;
    responseTimeMs: number;
    responseStatus: string;
    isValid: boolean;
    isWinningBid: boolean;
    rejectionReason: string | null;
    rawResponse: any;
  }>;
}

// Phase 1: Get detailed call information for expandable rows
router.get("/api/calls/:callId/details", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get call with related data
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
      with: {
        campaign: {
          columns: { id: true, name: true }
        }
      }
    });

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    // Manually fetch buyer and publisher data if they exist
    let buyer = null;
    let publisher = null;
    
    if (call.buyerId) {
      buyer = await db.query.buyers.findFirst({
        where: eq(buyers.id, call.buyerId),
        columns: { id: true, name: true, companyName: true, email: true, phoneNumber: true }
      });
    }
    
    if (call.publisherId) {
      publisher = await db.query.publishers.findFirst({
        where: eq(publishers.id, call.publisherId),
        columns: { id: true, name: true, company: true }
      });
    }

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    // Get RTB auction details
    const rtbAuctions = await db
      .select()
      .from(rtbAuctionDetails)
      .where(eq(rtbAuctionDetails.callId, callId))
      .orderBy(desc(rtbAuctionDetails.timestamp));

    const callWithDetails = {
      ...call,
      buyer,
      publisher,
      rtbAuctions
    };

    res.json(callWithDetails);
  } catch (error) {
    console.error("Error fetching call details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Phase 2: Get call events - removed (table deleted)
router.get("/api/calls/:callId/events", requireAuth, async (req, res) => {
  try {
    // Return empty array since call events system was removed
    res.json([]);
  } catch (error) {
    console.error("Error fetching call events:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Phase 3: Get routing decisions - removed (table deleted)
router.get("/api/calls/:callId/routing", requireAuth, async (req, res) => {
  try {
    // Return empty array since routing decisions system was removed
    res.json([]);
  } catch (error) {
    console.error("Error fetching routing decisions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Phase 4: Get RTB auction details with proper target name mapping
router.get("/api/calls/:callId/rtb", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    console.log(`[RTB API] Fetching RTB auction details for call ${callId}`);
    
    // Get auctions with proper target name mapping from local configuration
    const auctions = await db
      .select({
        id: rtbAuctionDetails.id,
        callId: rtbAuctionDetails.callId,
        auctionId: rtbAuctionDetails.auctionId,
        targetId: rtbAuctionDetails.targetId,
        targetName: rtbTargets.name, // Use local target name instead of external response
        bidAmount: rtbAuctionDetails.bidAmount,
        bidStatus: rtbAuctionDetails.bidStatus,
        responseTime: rtbAuctionDetails.responseTime,
        destinationNumber: rtbAuctionDetails.destinationNumber,
        isWinner: rtbAuctionDetails.isWinner,
        rejectionReason: rtbAuctionDetails.rejectionReason,
        timestamp: rtbAuctionDetails.timestamp,
        metadata: rtbAuctionDetails.metadata
      })
      .from(rtbAuctionDetails)
      .leftJoin(rtbTargets, eq(rtbAuctionDetails.targetId, rtbTargets.id))
      .where(eq(rtbAuctionDetails.callId, callId))
      .orderBy(desc(rtbAuctionDetails.timestamp));

    console.log(`[RTB API] Found ${auctions.length} auction details for call ${callId} with correct target names`);
    res.json(auctions);
  } catch (error) {
    console.error("Error fetching RTB auction details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST endpoints for logging detailed call data - removed (tables deleted)

// Log call event - removed (table deleted)
router.post("/api/calls/:callId/events", requireAuth, async (req, res) => {
  try {
    // Return error since call events system was removed
    res.status(404).json({ message: "Call events system not available" });
  } catch (error) {
    console.error("Error logging call event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Log routing decision - removed (table deleted)
router.post("/api/calls/:callId/routing", requireAuth, async (req, res) => {
  try {
    // Return error since routing decisions system was removed
    res.status(404).json({ message: "Routing decisions system not available" });
  } catch (error) {
    console.error("Error logging routing decision:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Log RTB auction details
router.post("/api/calls/:callId/rtb", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const auctionData: InsertRtbAuctionDetails = req.body;

    const auction = await db.insert(rtbAuctionDetails).values({
      ...auctionData,
      callId
    }).returning();

    res.json(auction[0]);
  } catch (error) {
    console.error("Error logging RTB auction details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Comprehensive RTB auction details for call analysis (Ringba-style)
router.get("/api/calls/:callId/rtb-auction-details", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // First get the call to verify ownership
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId)
    });

    if (!call) {
      return res.status(404).json({ message: "Call not found" });
    }

    // Get RTB bid request associated with this call
    const bidRequest = await db.query.rtbBidRequests.findFirst({
      where: eq(rtbBidRequests.campaignId, call.campaignId!)
    });

    if (!bidRequest) {
      return res.status(404).json({ message: "No RTB auction data found for this call" });
    }

    // Get all bid responses for this request
    const bidResponses = await db
      .select({
        id: rtbBidResponses.id,
        rtbTargetId: rtbBidResponses.rtbTargetId,
        targetName: rtbTargets.name,
        bidAmount: rtbBidResponses.bidAmount,
        destinationNumber: rtbBidResponses.destinationNumber,
        responseTimeMs: rtbBidResponses.responseTimeMs,
        responseStatus: rtbBidResponses.responseStatus,
        isValid: rtbBidResponses.isValid,
        isWinningBid: rtbBidResponses.isWinningBid,
        rejectionReason: rtbBidResponses.rejectionReason,
        rawResponse: rtbBidResponses.rawResponse,
      })
      .from(rtbBidResponses)
      .leftJoin(rtbTargets, eq(rtbBidResponses.rtbTargetId, rtbTargets.id))
      .where(eq(rtbBidResponses.requestId, bidRequest.requestId))
      .orderBy(desc(rtbBidResponses.bidAmount));

    // Construct comprehensive auction summary
    const auctionSummary: RtbAuctionSummary = {
      requestId: bidRequest.requestId,
      campaignId: bidRequest.campaignId,
      callerId: bidRequest.callerId || call.fromNumber,
      totalTargetsPinged: bidRequest.totalTargetsPinged || bidResponses.length,
      successfulResponses: bidRequest.successfulResponses || bidResponses.filter(b => b.responseStatus === 'success').length,
      winningBidAmount: parseFloat(bidRequest.winningBidAmount?.toString() || '0'),
      winningTargetId: bidRequest.winningTargetId || 0,
      totalResponseTimeMs: bidRequest.totalResponseTimeMs || 0,
      publisherId: bidRequest.publisherId || 0,
      inboundNumber: bidRequest.inboundNumber || call.toNumber,
      callStatus: call.status,
      callDuration: call.duration,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
      bidResponses: bidResponses.map(bid => {
        // Determine winner based on call's target_id (the actual routing decision)
        const isWinner = call.targetId === bid.rtbTargetId;
        
        // Map response status for frontend display
        const status = bid.responseStatus === 'success' && !bid.rejectionReason ? 'success' : 
                      bid.responseStatus === 'error' || bid.rejectionReason ? 'error' : 
                      'timeout';
        
        return {
          id: bid.id,
          targetId: bid.rtbTargetId,
          targetName: bid.targetName || `Target ${bid.rtbTargetId}`,
          bidAmount: parseFloat(bid.bidAmount?.toString() || '0'),
          destinationNumber: bid.destinationNumber || '',
          responseTime: bid.responseTimeMs || 0,
          status: status,
          isWinner: isWinner,
          rejectionReason: bid.rejectionReason,
          rawResponse: bid.rawResponse
        };
      })
    };

    console.log(`[RTB AUCTION API] Call ${callId} - Pinged: ${auctionSummary.totalTargetsPinged}, Responses: ${auctionSummary.successfulResponses}, Winner: $${auctionSummary.winningBidAmount}`);

    res.json(auctionSummary);
  } catch (error) {
    console.error("Error fetching RTB auction details:", error);
    res.status(500).json({ message: "Failed to fetch RTB auction details" });
  }
});

export { router as callDetailsRouter };