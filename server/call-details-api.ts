import { Router } from "express";
import { z } from "zod";
import { 
  calls, callEvents, routingDecisions, rtbAuctionDetails,
  type Call, type CallEvent, type RoutingDecision, type RtbAuctionDetails,
  type InsertCallEvent, type InsertRoutingDecision, type InsertRtbAuctionDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
// Custom authentication middleware (copied from routes.ts)
import type { Request, Response, NextFunction } from "express";

const requireAuth = (req: any, res: Response, next: NextFunction) => {
  const sessionUser = req.session?.user;
  if (!sessionUser || !sessionUser.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessionUser;
  next();
};

const router = Router();

// Enhanced call details with full tracking information
interface CallWithDetails extends Call {
  events?: CallEvent[];
  routingDecisions?: RoutingDecision[];
  rtbAuctions?: RtbAuctionDetails[];
  campaignName?: string;
  buyerName?: string;
}

// Phase 1: Get detailed call information for expandable rows
router.get("/api/calls/:callId/details", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const userId = req.user?.id;

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

    // Get call events (IVR flow tracking)
    const events = await db
      .select()
      .from(callEvents)
      .where(eq(callEvents.callId, callId))
      .orderBy(desc(callEvents.timestamp));

    // Get routing decisions
    const routingDecs = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.callId, callId))
      .orderBy(routingDecisions.sequenceNumber);

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
      events,
      routingDecisions: routingDecs,
      rtbAuctions
    };

    res.json(callWithDetails);
  } catch (error) {
    console.error("Error fetching call details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Phase 2: Get call events for IVR flow visualization
router.get("/api/calls/:callId/events", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const events = await db
      .select()
      .from(callEvents)
      .where(eq(callEvents.callId, callId))
      .orderBy(callEvents.timestamp);

    res.json(events);
  } catch (error) {
    console.error("Error fetching call events:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Phase 3: Get routing decisions for call flow analysis
router.get("/api/calls/:callId/routing", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decisions = await db
      .select()
      .from(routingDecisions)
      .where(eq(routingDecisions.callId, callId))
      .orderBy(routingDecisions.sequenceNumber);

    res.json(decisions);
  } catch (error) {
    console.error("Error fetching routing decisions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Phase 4: Get RTB auction details
router.get("/api/calls/:callId/rtb", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const auctions = await db
      .select()
      .from(rtbAuctionDetails)
      .where(eq(rtbAuctionDetails.callId, callId))
      .orderBy(desc(rtbAuctionDetails.timestamp));

    res.json(auctions);
  } catch (error) {
    console.error("Error fetching RTB auction details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST endpoints for logging detailed call data

// Log call event (IVR node interactions)
router.post("/api/calls/:callId/events", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const eventData: InsertCallEvent = req.body;

    const event = await db.insert(callEvents).values({
      ...eventData,
      callId
    }).returning();

    res.json(event[0]);
  } catch (error) {
    console.error("Error logging call event:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Log routing decision
router.post("/api/calls/:callId/routing", requireAuth, async (req, res) => {
  try {
    const callId = parseInt(req.params.callId);
    const routingData: InsertRoutingDecision = req.body;

    const decision = await db.insert(routingDecisions).values({
      ...routingData,
      callId
    }).returning();

    res.json(decision[0]);
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

export { router as callDetailsRouter };