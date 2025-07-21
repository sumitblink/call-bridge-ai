import express, { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Custom authentication middleware for session-based auth
const requireAuth = (req: any, res: Response, next: NextFunction) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessionUser;
  next();
};

const router = express.Router();

// Get tag statistics for filtering interface
router.get("/tag-stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    
    // Get all calls for the user to generate tag statistics
    const calls = await storage.getEnhancedCallsByUser(userId, {});
    
    // Extract unique values for each tag type
    const tagStats = {
      campaigns: [...new Set(calls.map(c => c.campaign?.name).filter(Boolean))],
      publishers: [...new Set(calls.map(c => c.publisherId).filter(Boolean))],
      targets: [...new Set(calls.map(c => c.buyerId).filter(Boolean))],
      buyers: [...new Set(calls.map(c => c.buyer?.name).filter(Boolean))],
      dialedNumbers: [...new Set(calls.map(c => c.dialedNumber).filter(Boolean))],
      sources: [...new Set(calls.map(c => c.utmSource).filter(Boolean))],
      mediums: [...new Set(calls.map(c => c.utmMedium).filter(Boolean))],
      keywords: [...new Set(calls.map(c => c.keyword).filter(Boolean))],
      adGroups: [...new Set(calls.map(c => c.adGroup).filter(Boolean))],
      clickIds: [...new Set(calls.map(c => c.clickId).filter(Boolean))],
      referrers: [...new Set(calls.map(c => c.referrer).filter(Boolean))],
      countries: [...new Set(calls.map(c => c.country).filter(Boolean))],
      states: [...new Set(calls.map(c => c.state).filter(Boolean))],
      cities: [...new Set(calls.map(c => c.city).filter(Boolean))],
      zipCodes: [...new Set(calls.map(c => c.zipCode).filter(Boolean))],
      deviceTypes: [...new Set(calls.map(c => c.deviceType).filter(Boolean))],
      browsers: [...new Set(calls.map(c => {
        try {
          return c.userAgent ? c.userAgent.split(' ')[0] : null;
        } catch {
          return null;
        }
      }).filter(Boolean))],
      dispositions: [...new Set(calls.map(c => c.disposition).filter(Boolean))],
      sub1: [...new Set(calls.map(c => c.sub1).filter(Boolean))],
      sub2: [...new Set(calls.map(c => c.sub2).filter(Boolean))],
      sub3: [...new Set(calls.map(c => c.sub3).filter(Boolean))],
      sub4: [...new Set(calls.map(c => c.sub4).filter(Boolean))],
      sub5: [...new Set(calls.map(c => c.sub5).filter(Boolean))],
    };
    
    res.json(tagStats);
  } catch (error) {
    console.error("Error fetching tag statistics:", error);
    res.status(500).json({ error: "Failed to fetch tag statistics" });
  }
});

// Get comprehensive reporting summary
router.get("/summary", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const filters = req.query;
    
    // Convert query filters to proper format
    const filterOptions: any = {};
    
    if (filters.dateRange && filters.dateRange !== "all") {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "yesterday":
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "quarter":
          startDate.setMonth(startDate.getMonth() - 3);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }
      
      filterOptions.startDate = startDate;
      filterOptions.endDate = new Date();
    }

    const calls = await storage.getEnhancedCallsByUser(userId, filterOptions);
    
    // Calculate summary metrics
    const totalCalls = calls.length;
    const totalRevenue = calls.reduce((sum, call) => sum + parseFloat(call.revenue?.toString() || '0'), 0);
    const totalCost = calls.reduce((sum, call) => sum + parseFloat(call.cost?.toString() || '0'), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgCallDuration = totalCalls > 0 ? calls.reduce((sum, call) => sum + call.duration, 0) / totalCalls : 0;
    const conversionRate = calls.filter(call => call.status === 'completed').length / Math.max(totalCalls, 1) * 100;
    
    // Calculate top sources
    const sourceGroups = calls.reduce((acc, call) => {
      const source = call.utmSource || 'Direct';
      if (!acc[source]) {
        acc[source] = { name: source, calls: 0, revenue: 0 };
      }
      acc[source].calls += 1;
      acc[source].revenue += parseFloat(call.revenue?.toString() || '0');
      return acc;
    }, {} as Record<string, { name: string; calls: number; revenue: number }>);
    
    const topSources = Object.values(sourceGroups)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Calculate top campaigns
    const campaignGroups = calls.reduce((acc, call) => {
      const campaignName = call.campaign?.name || 'Unknown Campaign';
      if (!acc[campaignName]) {
        acc[campaignName] = { name: campaignName, calls: 0, revenue: 0 };
      }
      acc[campaignName].calls += 1;
      acc[campaignName].revenue += parseFloat(call.revenue?.toString() || '0');
      return acc;
    }, {} as Record<string, { name: string; calls: number; revenue: number }>);
    
    const topCampaigns = Object.values(campaignGroups)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Calculate calls by hour
    const hourlyGroups = calls.reduce((acc, call) => {
      const hour = new Date(call.createdAt).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      if (!acc[hourKey]) {
        acc[hourKey] = { hour: hourKey, calls: 0 };
      }
      acc[hourKey].calls += 1;
      return acc;
    }, {} as Record<string, { hour: string; calls: number }>);
    
    const callsByHour = Array.from({ length: 24 }, (_, i) => {
      const hour = `${i.toString().padStart(2, '0')}:00`;
      return hourlyGroups[hour] || { hour, calls: 0 };
    });
    
    // Performance by tag analysis
    const performanceByTag: Record<string, { calls: number; revenue: number; profit: number }> = {};
    
    // Analyze Sub1 performance
    calls.forEach(call => {
      if (call.sub1) {
        if (!performanceByTag[call.sub1]) {
          performanceByTag[call.sub1] = { calls: 0, revenue: 0, profit: 0 };
        }
        performanceByTag[call.sub1].calls += 1;
        performanceByTag[call.sub1].revenue += parseFloat(call.revenue?.toString() || '0');
        performanceByTag[call.sub1].profit += parseFloat(call.profit?.toString() || '0');
      }
    });
    
    const summary = {
      totalCalls,
      totalRevenue,
      totalCost,
      totalProfit,
      avgCallDuration,
      conversionRate,
      topSources,
      topCampaigns,
      callsByHour,
      performanceByTag
    };
    
    res.json(summary);
  } catch (error) {
    console.error("Error generating reporting summary:", error);
    res.status(500).json({ error: "Failed to generate reporting summary" });
  }
});

// Get detailed breakdown by specific dimension
router.get("/breakdown/:dimension", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const { dimension } = req.params;
    const filters = req.query;
    
    const calls = await storage.getEnhancedCallsByUser(userId, {});
    
    // Group calls by the requested dimension
    const breakdown = calls.reduce((acc, call) => {
      let key: string;
      
      switch (dimension) {
        case 'utm_source':
          key = call.utmSource || 'Direct';
          break;
        case 'utm_medium':
          key = call.utmMedium || 'Unknown';
          break;
        case 'device_type':
          key = call.deviceType || 'Unknown';
          break;
        case 'country':
          key = call.country || 'Unknown';
          break;
        case 'state':
          key = call.state || 'Unknown';
          break;
        case 'sub1':
          key = call.sub1 || 'Unknown';
          break;
        case 'sub2':
          key = call.sub2 || 'Unknown';
          break;
        case 'sub3':
          key = call.sub3 || 'Unknown';
          break;
        case 'sub4':
          key = call.sub4 || 'Unknown';
          break;
        case 'sub5':
          key = call.sub5 || 'Unknown';
          break;
        case 'keyword':
          key = call.keyword || 'Unknown';
          break;
        case 'ad_group':
          key = call.adGroup || 'Unknown';
          break;
        default:
          key = 'Unknown';
      }
      
      if (!acc[key]) {
        acc[key] = {
          name: key,
          calls: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          avgDuration: 0,
          conversionRate: 0,
          totalDuration: 0,
          conversions: 0
        };
      }
      
      acc[key].calls += 1;
      acc[key].revenue += parseFloat(call.revenue?.toString() || '0');
      acc[key].cost += parseFloat(call.cost?.toString() || '0');
      acc[key].profit += parseFloat(call.profit?.toString() || '0');
      acc[key].totalDuration += call.duration;
      
      if (call.status === 'completed') {
        acc[key].conversions += 1;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate averages and rates
    Object.values(breakdown).forEach((item: any) => {
      item.avgDuration = item.calls > 0 ? item.totalDuration / item.calls : 0;
      item.conversionRate = item.calls > 0 ? (item.conversions / item.calls) * 100 : 0;
      delete item.totalDuration; // Remove temporary field
      delete item.conversions; // Remove temporary field
    });
    
    const result = Object.values(breakdown)
      .sort((a: any, b: any) => b.revenue - a.revenue);
    
    res.json(result);
  } catch (error) {
    console.error(`Error generating ${req.params.dimension} breakdown:`, error);
    res.status(500).json({ error: `Failed to generate ${req.params.dimension} breakdown` });
  }
});

// Export comprehensive report data
router.get("/export", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const calls = await storage.getEnhancedCallsByUser(userId, {});
    
    // Prepare comprehensive export data with all tracking fields
    const exportData = calls.map(call => ({
      call_id: call.id,
      campaign_id: call.campaignId,
      campaign_name: call.campaign?.name || '',
      buyer_id: call.buyerId,
      buyer_name: call.buyer?.name || '',
      publisher_id: call.publisherId,
      from_number: call.fromNumber,
      to_number: call.toNumber,
      dialed_number: call.dialedNumber,
      duration: call.duration,
      status: call.status,
      disposition: call.disposition,
      cost: call.cost,
      revenue: call.revenue,
      profit: call.profit,
      margin: call.margin,
      utm_source: call.utmSource,
      utm_medium: call.utmMedium,
      utm_campaign: call.utmCampaign,
      utm_term: call.utmTerm,
      utm_content: call.utmContent,
      referrer: call.referrer,
      landing_page: call.landingPage,
      city: call.city,
      state: call.state,
      country: call.country,
      zip_code: call.zipCode,
      device_type: call.deviceType,
      user_agent: call.userAgent,
      ip_address: call.ipAddress,
      sub1: call.sub1,
      sub2: call.sub2,
      sub3: call.sub3,
      sub4: call.sub4,
      sub5: call.sub5,
      click_id: call.clickId,
      session_id: call.sessionId,
      ad_account_id: call.adAccountId,
      keyword: call.keyword,
      placement: call.placement,
      ad_group: call.adGroup,
      creative_id: call.creativeId,
      created_at: call.createdAt,
      updated_at: call.updatedAt
    }));
    
    res.json(exportData);
  } catch (error) {
    console.error("Error exporting comprehensive report:", error);
    res.status(500).json({ error: "Failed to export comprehensive report" });
  }
});

export default router;