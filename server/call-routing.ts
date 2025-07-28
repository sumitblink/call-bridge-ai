import { storage } from "./storage";
import type { Buyer, Campaign } from "@shared/schema";

export interface RoutingResult {
  selectedBuyer: Buyer | null;
  reason: string;
  alternativeBuyers: Buyer[];
}

export interface CallMetrics {
  buyerId: number;
  callsToday: number;
  activeCalls: number;
  lastCallTime: Date | null;
}

export class CallRouter {
  /**
   * Select the best buyer for a call using priority-based routing with capacity limits
   */
  static async selectBuyer(campaignId: number, callerNumber?: string): Promise<RoutingResult> {
    try {
      // Get all buyers for this campaign
      const buyers = await storage.getCampaignBuyers(campaignId);
      
      if (buyers.length === 0) {
        return {
          selectedBuyer: null,
          reason: "No buyers assigned to campaign",
          alternativeBuyers: []
        };
      }

      // Get call metrics for all buyers
      const buyerMetrics = await Promise.all(
        buyers.map(buyer => this.getBuyerMetrics(buyer.id))
      );

      // Filter available buyers based on status and capacity
      const availableBuyers = [];
      const unavailableBuyers = [];

      for (let i = 0; i < buyers.length; i++) {
        const buyer = buyers[i];
        const metrics = buyerMetrics[i];
        
        console.log(`[Router] Checking buyer ${buyer.name} (ID: ${buyer.id}):`, {
          status: buyer.status,
          phoneNumber: buyer.phoneNumber,
          priority: buyer.priority,
          dailyCap: buyer.dailyCap,
          concurrencyLimit: buyer.concurrencyLimit,
          callsToday: metrics.callsToday,
          activeCalls: metrics.activeCalls
        });
        
        const availability = this.checkBuyerAvailability(buyer, metrics);
        
        if (availability.available) {
          availableBuyers.push({
            buyer,
            metrics,
            priority: buyer.priority || 1,
            campaignPriority: buyer.priority || 1  // buyer.priority already contains campaign-specific priority from database join
          });
          console.log(`[Router] Buyer ${buyer.name} is AVAILABLE with campaign priority ${buyer.priority}`);
        } else {
          unavailableBuyers.push(buyer);
          console.log(`[Router] Buyer ${buyer.name} is UNAVAILABLE: ${availability.reason}`);
        }
      }

      if (availableBuyers.length === 0) {
        return {
          selectedBuyer: null,
          reason: "All buyers have reached capacity or are inactive",
          alternativeBuyers: unavailableBuyers
        };
      }

      // Sort by priority (LOWEST NUMBER = HIGHEST PRIORITY), then by call count (lowest first)
      console.log(`[Router] Before sorting - Available buyers:`, availableBuyers.map(ab => ({
        name: ab.buyer.name,
        campaignPriority: ab.campaignPriority,
        priority: ab.priority,
        callsToday: ab.metrics.callsToday
      })));
      
      availableBuyers.sort((a, b) => {
        // Primary sort: Campaign-specific priority (LOWEST NUMBER FIRST - Priority 1 beats Priority 3)
        if (a.campaignPriority !== b.campaignPriority) {
          console.log(`[Router] Sorting by campaign priority: ${a.buyer.name}(${a.campaignPriority}) vs ${b.buyer.name}(${b.campaignPriority}) = ${a.campaignPriority - b.campaignPriority}`);
          return a.campaignPriority - b.campaignPriority;  // Fixed: 1-3=-2 (Priority 1 goes first)
        }
        
        // Secondary sort: General priority (LOWEST NUMBER FIRST)
        if (a.priority !== b.priority) {
          return a.priority - b.priority;  // Fixed: 1-3=-2 (Priority 1 goes first)
        }
        
        // Tertiary sort: Calls today (lowest first for load balancing)
        return a.metrics.callsToday - b.metrics.callsToday;
      });
      
      console.log(`[Router] After sorting - Available buyers:`, availableBuyers.map(ab => ({
        name: ab.buyer.name,
        campaignPriority: ab.campaignPriority,
        priority: ab.priority,
        callsToday: ab.metrics.callsToday
      })));

      const selectedBuyer = availableBuyers[0].buyer;
      console.log(`[Router] FINAL SELECTION: ${selectedBuyer.name} with priority ${selectedBuyer.priority}`);
      const alternativeBuyers = availableBuyers.slice(1).map(ab => ab.buyer);

      console.log(`[Router] Selected buyer: ${selectedBuyer.name} (Priority: ${selectedBuyer.priority}, Calls today: ${availableBuyers[0].metrics.callsToday})`);

      return {
        selectedBuyer,
        reason: `Selected based on priority (${selectedBuyer.priority}) and availability`,
        alternativeBuyers
      };

    } catch (error) {
      console.error('[Router] Error selecting buyer:', error);
      return {
        selectedBuyer: null,
        reason: "Routing error occurred",
        alternativeBuyers: []
      };
    }
  }

  /**
   * Get current call metrics for a buyer
   */
  private static async getBuyerMetrics(buyerId: number): Promise<CallMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Get today's calls for this buyer
      const calls = await storage.getCalls();
      const buyerCalls = calls.filter(call => 
        call.buyerId === buyerId && 
        call.createdAt && 
        call.createdAt >= today && 
        call.createdAt < tomorrow
      );

      // Count active calls (ringing, in_progress)
      const activeCalls = buyerCalls.filter(call => 
        call.status === 'ringing' || call.status === 'in_progress'
      ).length;

      // Get last call time
      const lastCall = buyerCalls
        .filter(call => call.createdAt)
        .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0];

      return {
        buyerId,
        callsToday: buyerCalls.length,
        activeCalls,
        lastCallTime: lastCall?.createdAt || null
      };
    } catch (error) {
      console.error(`[Router] Error getting metrics for buyer ${buyerId}:`, error);
      return {
        buyerId,
        callsToday: 0,
        activeCalls: 0,
        lastCallTime: null
      };
    }
  }

  /**
   * Check if a buyer is available to receive calls
   */
  private static checkBuyerAvailability(buyer: Buyer, metrics: CallMetrics): { available: boolean; reason: string } {
    // Check if buyer is active
    if (buyer.status !== 'active') {
      return { available: false, reason: `Buyer status is ${buyer.status}` };
    }

    // Check daily cap
    const dailyCap = buyer.dailyCap || 100;
    if (metrics.callsToday >= dailyCap) {
      return { available: false, reason: `Daily cap reached (${metrics.callsToday}/${dailyCap})` };
    }

    // Check concurrency limit
    const concurrencyLimit = buyer.concurrencyLimit || 5;
    if (metrics.activeCalls >= concurrencyLimit) {
      return { available: false, reason: `Concurrency limit reached (${metrics.activeCalls}/${concurrencyLimit})` };
    }

    // Check if buyer has phone number
    if (!buyer.phoneNumber) {
      return { available: false, reason: "No phone number configured" };
    }

    return { available: true, reason: "Available" };
  }

  /**
   * Get routing statistics for a campaign
   */
  static async getRoutingStats(campaignId: number) {
    const buyers = await storage.getCampaignBuyers(campaignId);
    const buyerStats = [];

    for (const buyer of buyers) {
      const metrics = await this.getBuyerMetrics(buyer.id);
      const availability = this.checkBuyerAvailability(buyer, metrics);
      
      buyerStats.push({
        id: buyer.id,
        name: buyer.name,
        priority: buyer.priority,
        status: buyer.status,
        available: availability.available,
        reason: availability.reason,
        callsToday: metrics.callsToday,
        activeCalls: metrics.activeCalls,
        dailyCap: buyer.dailyCap,
        concurrencyLimit: buyer.concurrencyLimit,
        lastCallTime: metrics.lastCallTime
      });
    }

    // Sort by priority for display
    buyerStats.sort((a, b) => (b.priority || 1) - (a.priority || 1));

    return {
      campaignId,
      totalBuyers: buyers.length,
      availableBuyers: buyerStats.filter(b => b.available).length,
      buyers: buyerStats
    };
  }

  /**
   * Test routing logic without making actual calls
   */
  static async testRouting(campaignId: number): Promise<RoutingResult[]> {
    const results = [];
    
    // Simulate multiple calls to see routing distribution
    for (let i = 0; i < 10; i++) {
      const result = await this.selectBuyer(campaignId);
      results.push(result);
      
      // Add small delay to simulate real calls
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}