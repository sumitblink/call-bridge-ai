import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../supabase-storage';
import { requireAuth } from '../middleware/auth';

// Simple in-memory cache for reporting data to speed up dashboard
const reportingCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache for reporting data

function getCachedData(key: string): any | null {
  const cached = reportingCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  // Clean up expired cache
  if (cached && Date.now() >= cached.expiry) {
    reportingCache.delete(key);
  }
  return null;
}

function setCachedData(key: string, data: any): void {
  reportingCache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL
  });
}

const router = Router();

// Summary Report Data - OPTIMIZED with caching
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const dateRange = req.query.dateRange as string || 'today';
    const groupBy = req.query.groupBy as string || 'campaign';
    const filters = req.query.filters ? JSON.parse(req.query.filters as string) : [];

    // Check cache first
    const cacheKey = `summary_${userId}_${dateRange}_${groupBy}_${JSON.stringify(filters)}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Get campaign data with summary statistics
    const campaigns = await storage.getCampaigns(userId);
    const calls = await storage.getCallsByUser(userId);
    const buyers = await storage.getBuyers(userId);
    
    // Group data based on the groupBy parameter
    let summaryData: any[] = [];
    
    if (groupBy === 'campaign') {
      summaryData = campaigns.map(campaign => {
        const campaignCalls = calls.filter(call => call.campaignId === campaign.id);
        return createSummaryRecord(campaignCalls, 'campaign', campaign.name, campaign);
      });
    } else if (groupBy === 'target') {
      // Group by target/buyer
      const targetGroups = new Map<string, any[]>();
      calls.forEach(call => {
        const buyer = buyers.find(b => b.id === call.buyerId);
        const targetName = buyer ? buyer.name : 'Unknown Target';
        if (!targetGroups.has(targetName)) {
          targetGroups.set(targetName, []);
        }
        targetGroups.get(targetName)!.push(call);
      });
      
      summaryData = Array.from(targetGroups.entries()).map(([targetName, targetCalls]) => {
        return createSummaryRecord(targetCalls, 'target', targetName);
      });
    } else if (groupBy === 'buyer') {
      // Group by buyer
      const buyerGroups = new Map<string, any[]>();
      calls.forEach(call => {
        const buyer = buyers.find(b => b.id === call.buyerId);
        const buyerName = buyer ? buyer.name : 'Unknown Buyer';
        if (!buyerGroups.has(buyerName)) {
          buyerGroups.set(buyerName, []);
        }
        buyerGroups.get(buyerName)!.push(call);
      });
      
      summaryData = Array.from(buyerGroups.entries()).map(([buyerName, buyerCalls]) => {
        return createSummaryRecord(buyerCalls, 'buyer', buyerName);
      });
    } else if (groupBy === 'publisher') {
      // Group by publisher from call data
      const publisherGroups = new Map<string, any[]>();
      calls.forEach(call => {
        const publisherName = call.publisher || 'Direct';
        if (!publisherGroups.has(publisherName)) {
          publisherGroups.set(publisherName, []);
        }
        publisherGroups.get(publisherName)!.push(call);
      });
      
      summaryData = Array.from(publisherGroups.entries()).map(([publisherName, publisherCalls]) => {
        return createSummaryRecord(publisherCalls, 'publisher', publisherName);
      });
    } else if (groupBy === 'dialedNumber') {
      // Group by dialed number
      const numberGroups = new Map<string, any[]>();
      calls.forEach(call => {
        const dialedNumber = call.toNumber || 'Unknown';
        if (!numberGroups.has(dialedNumber)) {
          numberGroups.set(dialedNumber, []);
        }
        numberGroups.get(dialedNumber)!.push(call);
      });
      
      summaryData = Array.from(numberGroups.entries()).map(([dialedNumber, numberCalls]) => {
        return createSummaryRecord(numberCalls, 'dialedNumber', dialedNumber);
      });
    } else if (groupBy === 'pool') {
      // Group by number pool
      const poolGroups = new Map<string, any[]>();
      calls.forEach(call => {
        const poolName = call.numberPoolId ? `Pool ${call.numberPoolId}` : 'Direct';
        if (!poolGroups.has(poolName)) {
          poolGroups.set(poolName, []);
        }
        poolGroups.get(poolName)!.push(call);
      });
      
      summaryData = Array.from(poolGroups.entries()).map(([poolName, poolCalls]) => {
        return createSummaryRecord(poolCalls, 'pool', poolName);
      });
    } else if (groupBy === 'date') {
      // Group by date
      const dateGroups = new Map<string, any[]>();
      calls.forEach(call => {
        const callDate = new Date(call.createdAt).toISOString().split('T')[0];
        if (!dateGroups.has(callDate)) {
          dateGroups.set(callDate, []);
        }
        dateGroups.get(callDate)!.push(call);
      });
      
      summaryData = Array.from(dateGroups.entries()).map(([date, dateCalls]) => {
        return createSummaryRecord(dateCalls, 'date', date);
      });
    } else {
      // Default to campaign grouping
      summaryData = campaigns.map(campaign => {
        const campaignCalls = calls.filter(call => call.campaignId === campaign.id);
        return createSummaryRecord(campaignCalls, 'campaign', campaign.name, campaign);
      });
    }

    // Helper function to create summary record
    function createSummaryRecord(callsGroup: any[], groupType: string, groupValue: string, campaign?: any) {
      const totalCalls = callsGroup.length;
      const completedCalls = callsGroup.filter(call => call.status === 'completed').length;
      const convertedCalls = callsGroup.filter(call => 
        call.status === 'completed' && call.duration && call.duration > 30
      ).length;

      // Calculate real financial data from call records
      const totalRevenue = callsGroup.reduce((sum, call) => sum + parseFloat(call.revenue || '0'), 0);
      const totalCost = callsGroup.reduce((sum, call) => sum + parseFloat(call.cost || '0'), 0);
      const totalPayout = callsGroup.reduce((sum, call) => sum + parseFloat(call.payout || '0'), 0);
      const profit = totalRevenue - totalCost;
      const avgCallLength = completedCalls > 0 ? 
        callsGroup.filter(c => c.duration).reduce((sum, c) => sum + (c.duration || 0), 0) / completedCalls : 0;

      return {
        groupBy: groupType,
        groupValue: groupValue,
        campaignId: campaign?.id || '',
        campaignName: campaign?.name || 'Multiple Campaigns',
        publisher: groupType === 'publisher' ? groupValue : 'Mixed',
        target: groupType === 'target' ? groupValue : 'Mixed',
        buyer: groupType === 'buyer' ? groupValue : 'Mixed',
        dialedNumbers: groupType === 'dialedNumber' ? [groupValue] : ['Mixed'],
        numberPool: groupType === 'pool' ? groupValue : 'Mixed',
        lastCallDate: callsGroup.length > 0 ? 
          new Date(Math.max(...callsGroup.map(c => new Date(c.createdAt).getTime()))).toISOString().split('T')[0] : null,
        duplicate: 'No',
        tags: ['summary', groupType],
        totalCalls,
        incoming: totalCalls,
        live: callsGroup.filter(call => call.status === 'in-progress').length,
        completed: completedCalls,
        ended: callsGroup.filter(call => call.status === 'ended').length,
        connected: completedCalls,
        paid: convertedCalls,
        converted: convertedCalls,
        noConnection: callsGroup.filter(call => call.status === 'failed').length,
        blocked: 0,
        duplicate: 0,
        ivrHangup: callsGroup.filter(call => call.status === 'busy').length,
        rpc: totalCalls > 0 ? totalRevenue / totalCalls : 0,
        revenue: totalRevenue,
        payout: totalPayout,
        profit: profit,
        margin: totalRevenue > 0 ? profit / totalRevenue : 0,
        conversionRate: totalCalls > 0 ? (convertedCalls / totalCalls) : 0,
        avgCallLength: avgCallLength,
        tcl: avgCallLength,
        acl: avgCallLength,
        totalCost: totalCost
      };
    }

    const result = { summaries: summaryData, total: summaryData.length };
    
    // Cache the result
    setCachedData(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching summary report:', error);
    res.status(500).json({ error: 'Failed to fetch summary report' });
  }
});

// Timeline Report Data - OPTIMIZED with caching
router.get('/timeline', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const dateRange = req.query.dateRange as string || 'today';
    const groupBy = req.query.groupBy as string || 'hour';

    // Check cache first
    const cacheKey = `timeline_${userId}_${dateRange}_${groupBy}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Get real call data - limit to recent calls for performance
    const calls = await storage.getCallsByUser(userId);
    const timelineData = [];
    
    if (groupBy === 'hour') {
      // Group calls by hour
      const callsByHour = new Map<string, any[]>();
      
      calls.forEach(call => {
        const callDate = new Date(call.createdAt);
        const hour = callDate.getHours().toString().padStart(2, '0') + ':00';
        
        if (!callsByHour.has(hour)) {
          callsByHour.set(hour, []);
        }
        callsByHour.get(hour)!.push(call);
      });
      
      // Generate 24-hour timeline
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        const hourCalls = callsByHour.get(hour) || [];
        const callCount = hourCalls.length;
        const revenue = hourCalls.reduce((sum, call) => sum + parseFloat(call.revenue || '0'), 0);
        const cost = hourCalls.reduce((sum, call) => sum + parseFloat(call.cost || '0'), 0);
        const conversions = hourCalls.filter(call => 
          call.status === 'completed' && call.duration && call.duration > 30
        ).length;
        
        timelineData.push({
          time: hour,
          calls: callCount,
          revenue,
          conversions,
          cost
        });
      }
    } else if (groupBy === 'day') {
      // Group calls by day for last 7 days
      const callsByDay = new Map<string, any[]>();
      
      calls.forEach(call => {
        const callDate = new Date(call.createdAt);
        const day = callDate.toISOString().split('T')[0];
        
        if (!callsByDay.has(day)) {
          callsByDay.set(day, []);
        }
        callsByDay.get(day)!.push(call);
      });
      
      // Generate last 7 days
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const day = date.toISOString().split('T')[0];
        const dayCalls = callsByDay.get(day) || [];
        const callCount = dayCalls.length;
        const revenue = dayCalls.reduce((sum, call) => sum + parseFloat(call.revenue || '0'), 0);
        const cost = dayCalls.reduce((sum, call) => sum + parseFloat(call.cost || '0'), 0);
        const conversions = dayCalls.filter(call => 
          call.status === 'completed' && call.duration && call.duration > 30
        ).length;
        
        timelineData.push({
          time: day,
          calls: callCount,
          revenue,
          conversions,
          cost
        });
      }
    }

    const result = { 
      timeline: timelineData, 
      summary: {
        totalCalls: timelineData.reduce((sum, item) => sum + item.calls, 0),
        totalRevenue: timelineData.reduce((sum, item) => sum + item.revenue, 0),
        totalConversions: timelineData.reduce((sum, item) => sum + item.conversions, 0),
        totalCost: timelineData.reduce((sum, item) => sum + item.cost, 0)
      }
    };

    // Cache the result
    setCachedData(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching timeline report:', error);
    res.status(500).json({ error: 'Failed to fetch timeline report' });
  }
});

// Custom Reports Management - OPTIMIZED with caching
router.get('/custom-reports', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    
    // Check cache first
    const cacheKey = `custom_reports_${userId}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    const reports = await storage.getCustomReports(userId);
    
    // Cache the result
    setCachedData(cacheKey, reports);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching custom reports:', error);
    res.status(500).json({ error: 'Failed to fetch custom reports' });
  }
});

const createReportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  config: z.object({
    filters: z.array(z.any()),
    dateRange: z.string(),
    viewAs: z.string(),
    timezone: z.string(),
    visibleColumns: z.record(z.boolean())
  }),
  isShared: z.boolean().default(false)
});

router.post('/custom-reports', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const validatedData = createReportSchema.parse(req.body);
    
    const report = await storage.createCustomReport({
      ...validatedData,
      userId
    });
    
    res.json(report);
  } catch (error) {
    console.error('Error creating custom report:', error);
    res.status(500).json({ error: 'Failed to create custom report' });
  }
});

router.put('/custom-reports/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const reportId = parseInt(req.params.id);
    const validatedData = createReportSchema.parse(req.body);
    
    const report = await storage.updateCustomReport(reportId, validatedData, userId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error updating custom report:', error);
    res.status(500).json({ error: 'Failed to update custom report' });
  }
});

router.delete('/custom-reports/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const reportId = parseInt(req.params.id);
    
    const success = await storage.deleteCustomReport(reportId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom report:', error);
    res.status(500).json({ error: 'Failed to delete custom report' });
  }
});

router.post('/custom-reports/:id/copy', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const reportId = parseInt(req.params.id);
    
    const copiedReport = await storage.copyCustomReport(reportId, userId);
    if (!copiedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(copiedReport);
  } catch (error) {
    console.error('Error copying custom report:', error);
    res.status(500).json({ error: 'Failed to copy custom report' });
  }
});

// Bulk Actions
const bulkTranscribeSchema = z.object({
  callIds: z.array(z.number()),
  provider: z.string().default('auto')
});

router.post('/bulk/transcribe', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { callIds } = bulkTranscribeSchema.parse(req.body);
    
    const result = await storage.bulkTranscribeCalls(callIds, userId);
    res.json(result);
  } catch (error) {
    console.error('Error bulk transcribing calls:', error);
    res.status(500).json({ error: 'Failed to transcribe calls' });
  }
});

const bulkAnnotateSchema = z.object({
  callIds: z.array(z.number()),
  annotation: z.string().min(1),
  category: z.string().optional()
});

router.post('/bulk/annotate', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { callIds, annotation, category } = bulkAnnotateSchema.parse(req.body);
    
    const result = await storage.bulkAnnotateCalls(callIds, { annotation, category }, userId);
    res.json(result);
  } catch (error) {
    console.error('Error bulk annotating calls:', error);
    res.status(500).json({ error: 'Failed to annotate calls' });
  }
});

const bulkBlockSchema = z.object({
  callIds: z.array(z.number()),
  reason: z.string().min(1),
  duration: z.string().default('permanent')
});

router.post('/bulk/block', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { callIds, reason, duration } = bulkBlockSchema.parse(req.body);
    
    const result = await storage.bulkBlockCallerIds(callIds, { reason, duration }, userId);
    res.json(result);
  } catch (error) {
    console.error('Error bulk blocking caller IDs:', error);
    res.status(500).json({ error: 'Failed to block caller IDs' });
  }
});

const bulkAdjustmentSchema = z.object({
  callIds: z.array(z.number()),
  adjustmentType: z.enum(['payout_increase', 'payout_decrease', 'quality_dispute', 'billing_correction']),
  reason: z.string().min(1),
  amount: z.number().optional()
});

router.post('/bulk/adjustment', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { callIds, adjustmentType, reason, amount } = bulkAdjustmentSchema.parse(req.body);
    
    const result = await storage.bulkRequestAdjustments(callIds, { 
      adjustmentType, 
      reason, 
      amount 
    }, userId);
    res.json(result);
  } catch (error) {
    console.error('Error bulk requesting adjustments:', error);
    res.status(500).json({ error: 'Failed to request adjustments' });
  }
});

// Tags endpoint for Summary Report - OPTIMIZED with caching
router.get('/tags', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    
    // Check cache first
    const cacheKey = `tags_${userId}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Get actual tags from calls data
    const calls = await storage.getCallsByUser(userId);
    const tagSet = new Set<string>();
    
    calls.forEach(call => {
      if (call.tags) {
        const callTags = call.tags.split(',').map(tag => tag.trim());
        callTags.forEach(tag => {
          if (tag) tagSet.add(tag);
        });
      }
    });
    
    const tags = Array.from(tagSet).map(tag => ({
      value: tag,
      label: tag.charAt(0).toUpperCase() + tag.slice(1)
    }));
    
    // Cache the result
    setCachedData(cacheKey, tags);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

export default router;