// Phase 2: Call Flow Event Tracking Service
import { db } from "./db";
import { callEvents, routingDecisions, rtbAuctionDetails } from "@shared/schema";
import type { InsertCallEvent, InsertRoutingDecision, InsertRtbAuctionDetails } from "@shared/schema";

export class CallFlowTracker {
  // Phase 2: IVR Node Event Tracking
  static async logIVREvent(callId: number, eventData: {
    eventType: 'node_enter' | 'node_exit' | 'ivr_input' | 'routing_decision';
    nodeId?: string;
    nodeName?: string;
    nodeType?: 'dial' | 'gather' | 'play' | 'hangup' | 'goto';
    stepName?: string;
    userInput?: string;
    duration?: number;
    metadata?: any;
  }) {
    try {
      const event: InsertCallEvent = {
        callId,
        ...eventData
      };
      
      const result = await db.insert(callEvents).values(event).returning();
      console.log(`IVR event logged for call ${callId}:`, eventData.eventType, eventData.stepName);
      return result[0];
    } catch (error) {
      console.error("Failed to log IVR event:", error);
      throw error;
    }
  }

  // Log node entry
  static async logNodeEnter(callId: number, nodeId: string, nodeName: string, nodeType: string) {
    return this.logIVREvent(callId, {
      eventType: 'node_enter',
      nodeId,
      nodeName,
      nodeType: nodeType as any,
      stepName: `Enter ${nodeName}`
    });
  }

  // Log node exit with duration
  static async logNodeExit(callId: number, nodeId: string, nodeName: string, duration: number) {
    return this.logIVREvent(callId, {
      eventType: 'node_exit',
      nodeId,
      nodeName,
      stepName: `Exit ${nodeName}`,
      duration
    });
  }

  // Log user input (DTMF or speech)
  static async logUserInput(callId: number, nodeId: string, userInput: string, nodeType: string = 'gather') {
    return this.logIVREvent(callId, {
      eventType: 'ivr_input',
      nodeId,
      nodeType: nodeType as any,
      userInput,
      stepName: `User Input: ${userInput}`
    });
  }

  // Phase 3: Routing Decision Tracking
  static async logRoutingDecision(callId: number, decisionData: {
    sequenceNumber: number;
    targetType: 'buyer' | 'rtb_target' | 'external';
    targetId?: number;
    targetName?: string;
    priority?: number;
    weight?: number;
    reason?: string;
    outcome: 'selected' | 'rejected' | 'timeout' | 'error';
    responseTime?: number;
    bidAmount?: string;
    metadata?: any;
  }) {
    try {
      const decision: InsertRoutingDecision = {
        callId,
        ...decisionData
      };
      
      const result = await db.insert(routingDecisions).values(decision).returning();
      console.log(`Routing decision logged for call ${callId}:`, decisionData.outcome, decisionData.targetName);
      return result[0];
    } catch (error) {
      console.error("Failed to log routing decision:", error);
      throw error;
    }
  }

  // Log buyer selection attempt
  static async logBuyerAttempt(
    callId: number, 
    sequenceNumber: number,
    buyerId: number, 
    buyerName: string, 
    priority: number,
    outcome: 'selected' | 'rejected' | 'timeout',
    responseTime?: number,
    reason?: string
  ) {
    return this.logRoutingDecision(callId, {
      sequenceNumber,
      targetType: 'buyer',
      targetId: buyerId,
      targetName: buyerName,
      priority,
      outcome,
      responseTime,
      reason: reason || `Buyer ${outcome}`
    });
  }

  // Phase 4: RTB Auction Tracking
  static async logRTBAuction(callId: number, auctionData: {
    auctionId: string;
    targetId: number;
    targetName: string;
    bidAmount: string;
    bidDuration?: number;
    bidStatus: 'submitted' | 'accepted' | 'rejected' | 'timeout';
    responseTime?: number;
    rejectionReason?: string;
    destinationNumber?: string;
    isWinner: boolean;
    metadata?: any;
  }) {
    try {
      const auction: InsertRtbAuctionDetails = {
        callId,
        ...auctionData
      };
      
      const result = await db.insert(rtbAuctionDetails).values(auction).returning();
      console.log(`RTB auction logged for call ${callId}:`, auctionData.bidStatus, auctionData.targetName);
      return result[0];
    } catch (error) {
      console.error("Failed to log RTB auction:", error);
      throw error;
    }
  }

  // Log winning RTB bid
  static async logRTBWinner(
    callId: number,
    auctionId: string,
    targetId: number,
    targetName: string,
    bidAmount: string,
    destinationNumber: string,
    responseTime: number
  ) {
    return this.logRTBAuction(callId, {
      auctionId,
      targetId,
      targetName,
      bidAmount,
      bidStatus: 'accepted',
      responseTime,
      destinationNumber,
      isWinner: true
    });
  }

  // Log failed RTB bid
  static async logRTBRejection(
    callId: number,
    auctionId: string,
    targetId: number,
    targetName: string,
    bidAmount: string,
    rejectionReason: string,
    responseTime?: number
  ) {
    return this.logRTBAuction(callId, {
      auctionId,
      targetId,
      targetName,
      bidAmount,
      bidStatus: 'rejected',
      responseTime,
      rejectionReason,
      isWinner: false
    });
  }

  // Comprehensive call flow summary
  static async getCallFlowSummary(callId: number) {
    try {
      const [events, decisions, auctions] = await Promise.all([
        db.select().from(callEvents).where(eq(callEvents.callId, callId)),
        db.select().from(routingDecisions).where(eq(routingDecisions.callId, callId)),
        db.select().from(rtbAuctionDetails).where(eq(rtbAuctionDetails.callId, callId))
      ]);

      return {
        events: events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        decisions: decisions.sort((a, b) => a.sequenceNumber - b.sequenceNumber),
        auctions: auctions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      };
    } catch (error) {
      console.error("Failed to get call flow summary:", error);
      return { events: [], decisions: [], auctions: [] };
    }
  }
}

// Import eq function
import { eq } from "drizzle-orm";