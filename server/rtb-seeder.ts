import { storage } from './storage-db';
import { 
  type InsertRtbRouter,
  type InsertRtbTarget,
  type InsertRtbRouterAssignment,
  type InsertRtbBidRequest,
  type InsertRtbBidResponse
} from '../shared/schema';

/**
 * RTB Database Seeder
 * Creates comprehensive sample data for testing the RTB system
 */
export class RTBSeeder {
  
  /**
   * Main seeding function - creates all sample RTB data
   */
  static async seedAll(): Promise<{
    router: any;
    targets: any[];
    assignments: any[];
    bidRequests: any[];
    bidResponses: any[];
  }> {
    console.log('🚀 Starting RTB data seeding...');
    
    // 1. Create Premium Buyers Router
    const router = await this.createSampleRouter();
    console.log('✓ Created RTB Router:', router.name);
    
    // 2. Create 3 RTB Targets with realistic configurations
    const targets = await this.createSampleTargets();
    console.log('✓ Created', targets.length, 'RTB Targets');
    
    // 3. Create router assignments
    const assignments = await this.createRouterAssignments(router.id, targets);
    console.log('✓ Created', assignments.length, 'Router Assignments');
    
    // 4. Create 20 sample bid requests with varied outcomes
    const bidRequests = await this.createSampleBidRequests();
    console.log('✓ Created', bidRequests.length, 'Bid Requests');
    
    // 5. Create bid responses for each request
    const bidResponses = await this.createSampleBidResponses(bidRequests, targets);
    console.log('✓ Created', bidResponses.length, 'Bid Responses');
    
    console.log('🎉 RTB seeding completed successfully!');
    
    return {
      router,
      targets,
      assignments,
      bidRequests,
      bidResponses
    };
  }
  
  /**
   * Create a sample RTB Router with enterprise settings
   */
  private static async createSampleRouter(): Promise<any> {
    const routerData: InsertRtbRouter = {
      name: "Premium Buyers Router",
      description: "High-volume router for premium buyer network with predictive routing and advanced analytics",
      userId: 1, // Assuming user ID 1 exists
      biddingTimeoutMs: 500,
      minBiddersRequired: 2,
      enablePredictiveRouting: true,
      revenueType: "per_call",
      conversionTracking: true,
      isActive: true
    };
    
    return await storage.createRtbRouter(routerData);
  }
  
  /**
   * Create 3 sample RTB Targets with realistic configurations
   */
  private static async createSampleTargets(): Promise<any[]> {
    const targets = [];
    
    // Create targets individually to avoid type issues
    const target1 = await storage.createRtbTarget({
      name: "LeadGen Pro Network",
      userId: 1,
      buyerId: 1,
      endpointUrl: "https://api.leadgenpro.com/rtb/bid",
      timeoutMs: 300,
      connectionTimeout: 5000,
      authMethod: "bearer",
      authToken: "lg_live_sk_abc123def456",
      timezone: "America/New_York",
      isActive: true,
      maxConcurrentCalls: 50,
      dailyCap: 500,
      hourlyCap: 25,
      monthlyCap: 15000,
      currency: "USD"
    } as any);
    targets.push(target1);
    
    const target2 = await storage.createRtbTarget({
      name: "CallCenters USA",
      userId: 1,
      buyerId: 1,
      endpointUrl: "https://rtb.callcentersusa.com/v2/bid",
      timeoutMs: 400,
      connectionTimeout: 6000,
      authMethod: "api_key",
      authToken: "cc_api_789xyz012",
      timezone: "America/Chicago",
      isActive: true,
      maxConcurrentCalls: 75,
      dailyCap: 750,
      hourlyCap: 40,
      monthlyCap: 22500,
      currency: "USD"
    } as any);
    targets.push(target2);
    
    const target3 = await storage.createRtbTarget({
      name: "Pacific Lead Exchange",
      userId: 1,
      buyerId: 1,
      endpointUrl: "https://exchange.pacificleads.io/rtb/auction",
      timeoutMs: 250,
      connectionTimeout: 4000,
      authMethod: "bearer",
      authToken: "ple_token_qrs456tuv789",
      timezone: "America/Los_Angeles",
      isActive: true,
      maxConcurrentCalls: 30,
      dailyCap: 300,
      hourlyCap: 15,
      monthlyCap: 9000,
      currency: "USD"
    } as any);
    targets.push(target3);
    
    return targets;
  }
  
  /**
   * Create router assignments connecting targets to router
   */
  private static async createRouterAssignments(routerId: number, targets: any[]): Promise<any[]> {
    const assignments = [];
    
    for (const target of targets) {
      const assignmentData: InsertRtbRouterAssignment = {
        rtbRouterId: routerId,
        rtbTargetId: target.id,
        isActive: true
      };
      
      const assignment = await storage.createRtbRouterAssignment(assignmentData);
      assignments.push(assignment);
    }
    
    return assignments;
  }
  
  /**
   * Create 20 sample bid requests with varied outcomes
   */
  private static async createSampleBidRequests(): Promise<any[]> {
    const bidRequests = [];
    const campaigns = [1]; // Using campaign ID 1 for consistency
    const callerNumbers = [
      "+15551234567", "+15559876543", "+15555678901", 
      "+15552345678", "+15557890123", "+15554567890"
    ];
    
    // Create requests over the past 7 days
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
      // Random time in past 7 days
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const callTime = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
      
      const requestData: InsertRtbBidRequest = {
        requestId: `req_${Date.now()}_${i.toString().padStart(3, '0')}`,
        campaignId: campaigns[Math.floor(Math.random() * campaigns.length)],
        rtbRouterId: 1, // Will reference the router we created
        callerId: callerNumbers[Math.floor(Math.random() * callerNumbers.length)],
        callStartTime: callTime,
        totalTargetsPinged: Math.floor(Math.random() * 3) + 1, // 1-3 targets
        successfulResponses: 0, // Will be updated after responses
        winningBidAmount: null, // Will be determined by responses
        winningTargetId: null,
        totalResponseTimeMs: null
      };
      
      const bidRequest = await storage.createRtbBidRequest(requestData);
      bidRequests.push(bidRequest);
    }
    
    return bidRequests;
  }
  
  /**
   * Create realistic bid responses for each request
   */
  private static async createSampleBidResponses(bidRequests: any[], targets: any[]): Promise<any[]> {
    const bidResponses = [];
    
    for (const request of bidRequests) {
      const targetsPinged = targets.slice(0, request.totalTargetsPinged);
      let successfulResponses = 0;
      let winningBid = 0;
      let winningTargetId = null;
      let totalResponseTime = 0;
      
      for (const target of targetsPinged) {
        // 80% success rate for responses
        const isSuccessful = Math.random() > 0.2;
        const responseTime = Math.floor(Math.random() * 400) + 100; // 100-500ms
        totalResponseTime += responseTime;
        
        let bidAmount = 0;
        let responseStatus: "success" | "timeout" | "error" | "invalid" = "error";
        
        if (isSuccessful) {
          successfulResponses++;
          responseStatus = "success";
          
          // Generate bid based on target's range
          const minBid = typeof target.minBidAmount === 'string' ? parseFloat(target.minBidAmount) : target.minBidAmount;
          const maxBid = typeof target.maxBidAmount === 'string' ? parseFloat(target.maxBidAmount) : target.maxBidAmount;
          bidAmount = Math.random() * (maxBid - minBid) + minBid;
          
          // Track highest bid
          if (bidAmount > winningBid) {
            winningBid = bidAmount;
            winningTargetId = target.id;
          }
        } else {
          // Random failure type
          const failures = ["timeout", "error", "invalid"] as const;
          responseStatus = failures[Math.floor(Math.random() * failures.length)];
        }
        
        const responseData = {
          rtbTargetId: target.id,
          requestId: request.requestId,
          bidAmount: bidAmount.toFixed(2),
          destinationNumber: "+15558765432", // Sample destination
          responseTimeMs: responseTime,
          responseStatus,
          bidCurrency: "USD",
          isValid: responseStatus === "success"
        } as any;
        
        const response = await storage.createRtbBidResponse(responseData);
        bidResponses.push(response);
      }
      
      // Update the request with final results
      await storage.updateRtbBidRequest(request.requestId, {
        successfulResponses,
        winningBidAmount: winningBid > 0 ? winningBid.toFixed(2) : null,
        winningTargetId,
        totalResponseTimeMs: totalResponseTime
      });
    }
    
    return bidResponses;
  }
  
  /**
   * Clear all RTB data (for testing)
   */
  static async clearAll(): Promise<void> {
    console.log('🧹 Clearing all RTB data...');
    
    // Note: In a real implementation, you'd want to be more careful about this
    // and perhaps only clear test data, not production data
    
    console.log('⚠️  Clear function not implemented for safety');
    console.log('   Manually truncate RTB tables if needed for testing');
  }
}