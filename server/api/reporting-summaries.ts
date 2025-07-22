import { Router, Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessionUser;
  next();
};

// Get comprehensive campaign summaries for Enhanced Reporting
router.get("/campaign-summaries", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const { dateRange = "today" } = req.query;
    
    // Get date range filter
    let startDate: Date | undefined;
    let endDate: Date = new Date();
    
    switch (dateRange) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Get all campaigns and calls for the user
    const campaigns = await storage.getCampaigns(userId);
    const calls = await storage.getEnhancedCallsByUser(userId, {
      startDate,
      endDate
    });

    // Get all buyers and number pools
    const buyers = await storage.getBuyers(userId);
    const numberPools = await storage.getNumberPools ? await storage.getNumberPools(userId) : [];

    // Generate campaign summaries from real data
    const campaignSummaries = campaigns.map(campaign => {
      // Get calls for this campaign
      const campaignCalls = calls.filter(call => call.campaignId === campaign.id);
      
      // Get campaign buyer relationships  
      const campaignBuyers = buyers.filter(buyer => 
        campaignCalls.some(call => call.buyerId === buyer.id)
      );
      
      // Calculate metrics from real call data
      const totalCalls = campaignCalls.length;
      const completedCalls = campaignCalls.filter(call => call.status === 'completed').length;
      const inProgressCalls = campaignCalls.filter(call => call.status === 'in-progress').length;
      const failedCalls = campaignCalls.filter(call => call.status === 'failed').length;
      const endedCalls = campaignCalls.filter(call => call.status === 'ended').length;
      const blockedCalls = campaignCalls.filter(call => call.disposition === 'blocked').length;
      const noConnectionCalls = campaignCalls.filter(call => call.disposition === 'no-connection').length;
      const duplicateCalls = campaignCalls.filter(call => call.disposition === 'duplicate').length;
      const ivrHangupCalls = campaignCalls.filter(call => call.disposition === 'ivr-hangup').length;

      // Calculate financial metrics
      const totalRevenue = campaignCalls.reduce((sum, call) => sum + (parseFloat(call.revenue?.toString() || '0')), 0);
      const totalCost = campaignCalls.reduce((sum, call) => sum + (parseFloat(call.cost?.toString() || '0')), 0);
      const totalProfit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      
      // Calculate call durations
      const totalDuration = campaignCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
      const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
      
      // Get unique dialed numbers from calls
      const dialedNumbers = [...new Set(campaignCalls.map(call => call.toNumber).filter(Boolean))];
      
      // Get conversion metrics
      const paidCalls = campaignCalls.filter(call => parseFloat(call.revenue?.toString() || '0') > 0).length;
      const convertedCalls = campaignCalls.filter(call => call.status === 'completed' && parseFloat(call.revenue?.toString() || '0') > 0).length;
      const conversionRate = totalCalls > 0 ? (convertedCalls / totalCalls) * 100 : 0;
      const rpc = totalCalls > 0 ? totalRevenue / totalCalls : 0;

      // Find associated number pool
      const numberPool = numberPools.find(pool => 
        dialedNumbers.some(number => 
          pool.phoneNumbers?.some(poolNumber => poolNumber.phoneNumber === number)
        )
      );

      // Get primary buyer
      const primaryBuyer = campaignBuyers.length > 0 ? campaignBuyers[0] : null;
      
      // Get latest call date
      const lastCallDate = campaignCalls.length > 0 
        ? campaignCalls.reduce((latest, call) => 
            new Date(call.createdAt) > new Date(latest.createdAt) ? call : latest
          ).createdAt
        : new Date().toISOString();

      // Extract UTM sources as publisher info
      const utmSources = [...new Set(campaignCalls.map(call => call.utmSource).filter(Boolean))];
      const publisher = utmSources.length > 0 ? utmSources[0] || 'Direct' : 'Direct';

      // Generate tags from campaign and call data
      const tags = [
        campaign.name.toLowerCase().includes('healthcare') ? 'healthcare' : null,
        campaign.name.toLowerCase().includes('auto') ? 'auto' : null,
        campaign.name.toLowerCase().includes('insurance') ? 'insurance' : null,
        campaign.name.toLowerCase().includes('solar') ? 'solar' : null,
        campaign.name.toLowerCase().includes('mortgage') ? 'mortgage' : null,
        campaign.enable_rtb ? 'rtb' : 'traditional',
        ...utmSources.map(source => source?.toLowerCase())
      ].filter(Boolean) as string[];

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        publisher: publisher,
        target: campaign.routingType || 'Direct Routing',
        buyer: primaryBuyer?.name || 'No Buyer Assigned',
        dialedNumbers: dialedNumbers,
        numberPool: numberPool?.name || 'No Pool Assigned',
        totalCalls,
        incoming: totalCalls,
        live: inProgressCalls,
        completed: completedCalls,
        ended: endedCalls,
        connected: completedCalls,
        paid: paidCalls,
        converted: convertedCalls,
        noConnection: noConnectionCalls,
        blocked: blockedCalls,
        ivrHangup: ivrHangupCalls,
        duplicate: duplicateCalls,
        revenue: Math.round(totalRevenue * 100) / 100,
        payout: Math.round(totalCost * 100) / 100,
        profit: Math.round(totalProfit * 100) / 100,
        margin: Math.round(margin * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        rpc: Math.round(rpc * 100) / 100,
        tcl: totalDuration, // Total Call Length in seconds
        acl: Math.round(avgDuration), // Average Call Length in seconds
        totalCost: Math.round(totalCost * 100) / 100,
        tags: tags,
        lastCallDate: lastCallDate
      };
    });

    // Sort by total calls descending
    campaignSummaries.sort((a, b) => b.totalCalls - a.totalCalls);

    res.json(campaignSummaries);
  } catch (error) {
    console.error("Error generating campaign summaries:", error);
    res.status(500).json({ error: "Failed to generate campaign summaries" });
  }
});

// Get timeline chart data for Enhanced Reporting
router.get("/timeline-data", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const { dateRange = "today" } = req.query;
    
    // Get date range filter
    let startDate: Date | undefined;
    let endDate: Date = new Date();
    
    switch (dateRange) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    const calls = await storage.getEnhancedCallsByUser(userId, {
      startDate,
      endDate
    });

    // Generate hourly chart data from real calls
    const hourlyData: Record<string, { calls: number; revenue: number }> = {};
    
    calls.forEach(call => {
      const callDate = new Date(call.createdAt);
      const hour = callDate.getHours();
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;
      
      if (!hourlyData[timeKey]) {
        hourlyData[timeKey] = { calls: 0, revenue: 0 };
      }
      
      hourlyData[timeKey].calls += 1;
      hourlyData[timeKey].revenue += parseFloat(call.revenue?.toString() || '0');
    });

    // Generate 24-hour timeline even if no data
    const chartData = [];
    for (let hour = 0; hour < 24; hour++) {
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;
      chartData.push({
        time: timeKey,
        calls: hourlyData[timeKey]?.calls || 0,
        revenue: hourlyData[timeKey]?.revenue || 0
      });
    }

    res.json(chartData);
  } catch (error) {
    console.error("Error generating timeline data:", error);
    res.status(500).json({ error: "Failed to generate timeline data" });
  }
});

export default router;