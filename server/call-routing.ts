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
        
        console.log(`[Router] Checking buyer ${buyer.companyName || buyer.name} (ID: ${buyer.id}):`, {
          status: buyer.status,
          priority: (buyer as any).priority,
          dailyCap: (buyer as any).dailyCap,
          concurrencyLimit: (buyer as any).concurrencyLimit,
          callsToday: metrics.callsToday,
          activeCalls: metrics.activeCalls
        });
        
        const availability = await this.checkBuyerAvailability(buyer, metrics);
        
        if (availability.available) {
          availableBuyers.push({
            buyer,
            metrics,
            priority: (buyer as any).priority || 1,
            campaignPriority: (buyer as any).priority || 1  // buyer.priority already contains campaign-specific priority from database join
          });
          console.log(`[Router] Buyer ${buyer.companyName || buyer.name} is AVAILABLE with campaign priority ${(buyer as any).priority}`);
        } else {
          unavailableBuyers.push(buyer);
          console.log(`[Router] Buyer ${buyer.companyName || buyer.name} is UNAVAILABLE: ${availability.reason}`);
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
        name: ab.buyer.companyName || ab.buyer.name,
        campaignPriority: ab.campaignPriority,
        priority: ab.priority,
        callsToday: ab.metrics.callsToday
      })));
      
      availableBuyers.sort((a, b) => {
        // Primary sort: Campaign-specific priority (LOWEST NUMBER FIRST - Priority 1 beats Priority 3)
        if (a.campaignPriority !== b.campaignPriority) {
          console.log(`[Router] Sorting by campaign priority: ${a.buyer.companyName || a.buyer.name}(${a.campaignPriority}) vs ${b.buyer.companyName || b.buyer.name}(${b.campaignPriority}) = ${a.campaignPriority - b.campaignPriority}`);
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
        name: ab.buyer.companyName || ab.buyer.name,
        campaignPriority: ab.campaignPriority,
        priority: ab.priority,
        callsToday: ab.metrics.callsToday
      })));

      const selectedBuyer = availableBuyers[0].buyer;
      console.log(`[Router] FINAL SELECTION: ${selectedBuyer.companyName || selectedBuyer.name} with priority ${(selectedBuyer as any).priority}`);
      const alternativeBuyers = availableBuyers.slice(1).map(ab => ab.buyer);

      console.log(`[Router] Selected buyer: ${selectedBuyer.companyName || selectedBuyer.name} (Priority: ${(selectedBuyer as any).priority}, Calls today: ${availableBuyers[0].metrics.callsToday})`);

      return {
        selectedBuyer,
        reason: `Selected based on priority (${(selectedBuyer as any).priority}) and availability`,
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
  private static async checkBuyerAvailability(buyer: Buyer, metrics: CallMetrics): Promise<{ available: boolean; reason: string }> {
    // Check if buyer is active
    if (buyer.status !== 'active') {
      return { available: false, reason: `Buyer status is ${buyer.status}` };
    }

    // Check daily cap
    const dailyCap = (buyer as any).dailyCap || 100;
    if (metrics.callsToday >= dailyCap) {
      return { available: false, reason: `Daily cap reached (${metrics.callsToday}/${dailyCap})` };
    }

    // Check concurrency limit
    const concurrencyLimit = (buyer as any).concurrencyLimit || 5;
    if (metrics.activeCalls >= concurrencyLimit) {
      return { available: false, reason: `Concurrency limit reached (${metrics.activeCalls}/${concurrencyLimit})` };
    }

    // Check if buyer has active targets with phone numbers
    try {
      const targets = await storage.getTargetsByBuyer(buyer.id);
      const activeTargets = targets.filter(target => 
        target.status === 'active' && 
        target.phoneNumber && 
        target.phoneNumber.trim() !== ''
      );
      
      if (activeTargets.length === 0) {
        return { available: false, reason: "No active targets with phone numbers" };
      }
    } catch (error) {
      console.error(`[Router] Error checking buyer targets:`, error);
      return { available: false, reason: "Error checking targets" };
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
      const availability = await this.checkBuyerAvailability(buyer, metrics);
      
      buyerStats.push({
        id: buyer.id,
        name: buyer.companyName || buyer.name,
        priority: (buyer as any).priority,
        status: buyer.status,
        available: availability.available,
        reason: availability.reason,
        callsToday: metrics.callsToday,
        activeCalls: metrics.activeCalls,
        dailyCap: (buyer as any).dailyCap,
        concurrencyLimit: (buyer as any).concurrencyLimit,
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

  /**
   * Get the best target phone number for a buyer using intelligent routing
   */
  static async getBuyerTargetPhoneNumber(buyerId: number, routingStrategy: 'priority' | 'round_robin' | 'least_busy' | 'capacity_based' = 'priority'): Promise<string | null> {
    try {
      const targets = await storage.getTargetsByBuyer(buyerId);
      const activeTargets = targets.filter(target => 
        target.status === 'active' && 
        target.phoneNumber && 
        target.phoneNumber.trim() !== ''
      );
      
      if (activeTargets.length === 0) {
        console.log(`[Router] No active targets with phone numbers for buyer ${buyerId}`);
        return null;
      }

      console.log(`[Router] Found ${activeTargets.length} active targets for buyer ${buyerId}, using ${routingStrategy} strategy`);
      
      const selectedTarget = await this.selectBestTarget(activeTargets, routingStrategy, buyerId);
      
      if (!selectedTarget) {
        console.log(`[Router] No available targets after applying ${routingStrategy} strategy`);
        return null;
      }

      console.log(`[Router] Selected target: ${selectedTarget.name} (${selectedTarget.phoneNumber}) using ${routingStrategy} strategy`);
      return selectedTarget.phoneNumber;
    } catch (error) {
      console.error(`[Router] Error getting buyer target phone number:`, error);
      return null;
    }
  }

  /**
   * Select the best target using specified routing strategy
   */
  private static async selectBestTarget(targets: any[], strategy: string, buyerId: number): Promise<any | null> {
    if (targets.length === 0) return null;
    if (targets.length === 1) return targets[0];

    try {
      switch (strategy) {
        case 'priority':
          return this.selectTargetByPriority(targets);
        
        case 'round_robin':
          return await this.selectTargetByRoundRobin(targets, buyerId);
        
        case 'least_busy':
          return await this.selectTargetByLeastBusy(targets);
        
        case 'capacity_based':
          return await this.selectTargetByCapacity(targets);
        
        default:
          console.log(`[Router] Unknown strategy ${strategy}, falling back to priority`);
          return this.selectTargetByPriority(targets);
      }
    } catch (error) {
      console.error(`[Router] Error in target selection strategy ${strategy}:`, error);
      return this.selectTargetByPriority(targets); // Fallback to priority
    }
  }

  /**
   * Priority-based target selection (lowest priority number wins)
   */
  private static selectTargetByPriority(targets: any[]): any {
    const sortedTargets = [...targets].sort((a, b) => {
      const aPriority = a.priority || 999;
      const bPriority = b.priority || 999;
      return aPriority - bPriority; // Lower number = higher priority
    });
    
    console.log(`[Router] Priority-based selection from targets:`, sortedTargets.map(t => ({
      name: t.name,
      priority: t.priority || 999,
      phone: t.phoneNumber
    })));
    
    return sortedTargets[0];
  }

  /**
   * Round-robin target selection
   */
  private static async selectTargetByRoundRobin(targets: any[], buyerId: number): Promise<any> {
    try {
      // Get call history to determine last used target
      const calls = await storage.getCalls();
      const buyerCalls = calls
        .filter(call => call.buyerId === buyerId && call.targetId)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      
      if (buyerCalls.length === 0) {
        console.log(`[Router] No previous calls found, selecting first target for round-robin`);
        return targets[0];
      }

      const lastUsedTargetId = buyerCalls[0].targetId;
      const currentTargetIndex = targets.findIndex(t => t.id === lastUsedTargetId);
      
      // Select next target in round-robin order
      const nextIndex = currentTargetIndex >= 0 ? (currentTargetIndex + 1) % targets.length : 0;
      
      console.log(`[Router] Round-robin: last target ID ${lastUsedTargetId}, selecting index ${nextIndex}`);
      return targets[nextIndex];
    } catch (error) {
      console.error(`[Router] Error in round-robin selection:`, error);
      return targets[0]; // Fallback to first target
    }
  }

  /**
   * Least busy target selection (fewest active calls)
   */
  private static async selectTargetByLeastBusy(targets: any[]): Promise<any> {
    try {
      const calls = await storage.getCalls();
      const activeCalls = calls.filter(call => 
        call.status === 'ringing' || call.status === 'in_progress'
      );

      const targetMetrics = targets.map(target => {
        const activeCallsCount = activeCalls.filter(call => call.targetId === target.id).length;
        return {
          target,
          activeCalls: activeCallsCount
        };
      });

      // Sort by least active calls, then by priority as tiebreaker
      targetMetrics.sort((a, b) => {
        if (a.activeCalls !== b.activeCalls) {
          return a.activeCalls - b.activeCalls;
        }
        return (a.target.priority || 999) - (b.target.priority || 999);
      });

      console.log(`[Router] Least busy selection:`, targetMetrics.map(tm => ({
        name: tm.target.name,
        activeCalls: tm.activeCalls,
        priority: tm.target.priority || 999
      })));

      return targetMetrics[0].target;
    } catch (error) {
      console.error(`[Router] Error in least busy selection:`, error);
      return targets[0]; // Fallback to first target
    }
  }

  /**
   * Capacity-based target selection (considers daily caps and concurrency limits)
   */
  private static async selectTargetByCapacity(targets: any[]): Promise<any> {
    try {
      const calls = await storage.getCalls();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const targetCapacityMetrics = targets.map(target => {
        // Count today's calls for this target
        const todaysCalls = calls.filter(call => 
          call.targetId === target.id &&
          call.createdAt &&
          call.createdAt >= today &&
          call.createdAt < tomorrow
        ).length;

        // Count active calls for this target
        const activeCalls = calls.filter(call => 
          call.targetId === target.id &&
          (call.status === 'ringing' || call.status === 'in_progress')
        ).length;

        const dailyCap = target.dailyCap || 999999;
        const concurrencyLimit = target.concurrencyLimit || 99;
        
        const isAvailable = 
          todaysCalls < dailyCap && 
          activeCalls < concurrencyLimit;

        return {
          target,
          todaysCalls,
          activeCalls,
          dailyCap,
          concurrencyLimit,
          isAvailable,
          capacityScore: (dailyCap - todaysCalls) + (concurrencyLimit - activeCalls) * 10 // Weight concurrency higher
        };
      });

      // Filter available targets and sort by capacity score
      const availableTargets = targetCapacityMetrics
        .filter(tm => tm.isAvailable)
        .sort((a, b) => {
          if (a.capacityScore !== b.capacityScore) {
            return b.capacityScore - a.capacityScore; // Higher score = more capacity
          }
          return (a.target.priority || 999) - (b.target.priority || 999); // Priority tiebreaker
        });

      console.log(`[Router] Capacity-based selection:`, targetCapacityMetrics.map(tm => ({
        name: tm.target.name,
        available: tm.isAvailable,
        todaysCalls: tm.todaysCalls,
        dailyCap: tm.dailyCap,
        activeCalls: tm.activeCalls,
        concurrencyLimit: tm.concurrencyLimit,
        capacityScore: tm.capacityScore
      })));

      if (availableTargets.length === 0) {
        console.log(`[Router] No targets have available capacity`);
        return null;
      }

      return availableTargets[0].target;
    } catch (error) {
      console.error(`[Router] Error in capacity-based selection:`, error);
      return targets[0]; // Fallback to first target
    }
  }

  /**
   * Get the best target with routing strategy based on campaign settings
   */
  static async selectTargetForBuyer(buyerId: number, campaignId?: string, callerNumber?: string): Promise<{ target: any; strategy: string } | null> {
    try {
      // Get campaign-specific target routing strategy
      let strategy = 'priority'; // Default fallback
      
      if (campaignId) {
        try {
          const campaigns = await storage.getCampaigns();
          const campaign = campaigns.find(c => c.id === campaignId);
          if (campaign && (campaign as any).targetRoutingStrategy) {
            strategy = (campaign as any).targetRoutingStrategy;
            console.log(`[Router] Using campaign-specific target routing strategy: ${strategy}`);
          }
        } catch (error) {
          console.log(`[Router] Could not get campaign target routing strategy, using default: ${error}`);
        }
      }
      
      const targets = await storage.getTargetsByBuyer(buyerId);
      const activeTargets = targets.filter(target => 
        target.status === 'active' && 
        target.phoneNumber && 
        target.phoneNumber.trim() !== ''
      );
      
      if (activeTargets.length === 0) {
        return null;
      }

      console.log(`[Router] Selecting target for buyer ${buyerId} using ${strategy} strategy from ${activeTargets.length} active targets`);
      const selectedTarget = await this.selectBestTarget(activeTargets, strategy, buyerId);
      
      if (!selectedTarget) {
        return null;
      }

      return {
        target: selectedTarget,
        strategy: strategy
      };
    } catch (error) {
      console.error(`[Router] Error selecting target for buyer:`, error);
      return null;
    }
  }
}