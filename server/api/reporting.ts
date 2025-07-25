import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../supabase-storage';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Summary Report Data
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const dateRange = req.query.dateRange as string || 'today';
    const filters = req.query.filters ? JSON.parse(req.query.filters as string) : [];

    // Get campaign data with summary statistics
    const campaigns = await storage.getCampaigns(userId);
    const calls = await storage.getCallsByUser(userId);
    
    const summaryData = campaigns.map(campaign => {
      const campaignCalls = calls.filter(call => call.campaignId === campaign.id);
      const totalCalls = campaignCalls.length;
      const completedCalls = campaignCalls.filter(call => call.status === 'completed').length;
      const convertedCalls = campaignCalls.filter(call => 
        call.status === 'completed' && call.duration && call.duration > 30
      ).length;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        publisher: 'Direct',
        target: 'Default Target',
        buyer: 'Primary Buyer',
        dialedNumbers: [campaign.phoneNumber || '+1234567890'],
        numberPool: campaign.routingType === 'pool' ? 'Campaign Pool' : 'Direct',
        lastCallDate: campaignCalls.length > 0 ? 
          Math.max(...campaignCalls.map(c => new Date(c.createdAt).getTime())) : null,
        duplicate: 'No',
        tags: ['campaign', 'active'],
        incoming: totalCalls,
        live: campaignCalls.filter(call => call.status === 'in-progress').length,
        completed: completedCalls,
        ended: campaignCalls.filter(call => call.status === 'ended').length,
        connected: completedCalls,
        paid: convertedCalls,
        converted: convertedCalls,
        noConnection: campaignCalls.filter(call => call.status === 'failed').length,
        blocked: 0,
        ivrHangup: campaignCalls.filter(call => call.status === 'busy').length,
        rpc: convertedCalls > 0 ? 5.50 : 0,
        revenue: convertedCalls * 5.50,
        payout: convertedCalls * 5.00,
        profit: convertedCalls * 0.50,
        margin: convertedCalls > 0 ? 9.1 : 0,
        conversionRate: totalCalls > 0 ? (convertedCalls / totalCalls) * 100 : 0,
        tcl: completedCalls > 0 ? 180 : 0, // Average call length in seconds
        acl: completedCalls > 0 ? 45 : 0,  // Average call length
        totalCost: totalCalls * 0.15,
        totalCalls
      };
    });

    res.json({ summaries: summaryData, total: summaryData.length });
  } catch (error) {
    console.error('Error fetching summary report:', error);
    res.status(500).json({ error: 'Failed to fetch summary report' });
  }
});

// Timeline Report Data
router.get('/timeline', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const dateRange = req.query.dateRange as string || 'today';
    const groupBy = req.query.groupBy as string || 'hour';

    // Generate mock timeline data based on current time
    const now = new Date();
    const timelineData = [];
    
    if (groupBy === 'hour') {
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        const calls = Math.floor(Math.random() * 20);
        const revenue = calls * 5.50;
        
        timelineData.push({
          time: hour,
          calls,
          revenue,
          conversions: Math.floor(calls * 0.3),
          cost: calls * 0.15
        });
      }
    } else if (groupBy === 'day') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const calls = Math.floor(Math.random() * 100) + 20;
        const revenue = calls * 5.50;
        
        timelineData.push({
          time: date.toISOString().split('T')[0],
          calls,
          revenue,
          conversions: Math.floor(calls * 0.3),
          cost: calls * 0.15
        });
      }
    }

    res.json({ 
      timeline: timelineData, 
      summary: {
        totalCalls: timelineData.reduce((sum, item) => sum + item.calls, 0),
        totalRevenue: timelineData.reduce((sum, item) => sum + item.revenue, 0),
        totalConversions: timelineData.reduce((sum, item) => sum + item.conversions, 0),
        totalCost: timelineData.reduce((sum, item) => sum + item.cost, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching timeline report:', error);
    res.status(500).json({ error: 'Failed to fetch timeline report' });
  }
});

// Custom Reports Management
router.get('/custom-reports', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const reports = await storage.getCustomReports(userId);
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

export default router;