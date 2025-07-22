import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../hybrid-storage';
import { requireAuth } from '../replitAuth';
import { insertRedtrackConfigSchema, type RedtrackConfig } from '@shared/schema';

const router = Router();

// Get all RedTrack configurations for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const configs = await storage.getRedtrackConfigs(userId);
    res.json(configs);
  } catch (error) {
    console.error('Error fetching RedTrack configurations:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Get a specific RedTrack configuration
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const config = await storage.getRedtrackConfig(configId);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Ensure user owns this configuration
    if (config.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching RedTrack configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Create a new RedTrack configuration
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const configData = insertRedtrackConfigSchema.parse({
      ...req.body,
      userId
    });

    const config = await storage.createRedtrackConfig(configData);
    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    console.error('Error creating RedTrack configuration:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

// Update a RedTrack configuration
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if configuration exists and user owns it
    const existingConfig = await storage.getRedtrackConfig(configId);
    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    if (existingConfig.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate update data
    const updateData = insertRedtrackConfigSchema.partial().parse(req.body);
    
    const updatedConfig = await storage.updateRedtrackConfig(configId, updateData);
    
    if (!updatedConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json(updatedConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    console.error('Error updating RedTrack configuration:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Delete a RedTrack configuration
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if configuration exists and user owns it
    const existingConfig = await storage.getRedtrackConfig(configId);
    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    if (existingConfig.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const deleted = await storage.deleteRedtrackConfig(configId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting RedTrack configuration:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// Test RedTrack postback endpoint
router.post('/:id/test', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const config = await storage.getRedtrackConfig(configId);
    if (!config || config.userId !== userId) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Build test postback URL
    const testClickId = 'test_' + Date.now();
    const postbackUrl = new URL(config.postbackUrl);
    postbackUrl.searchParams.set('clickid', testClickId);
    postbackUrl.searchParams.set('sum', config.defaultRevenue?.toString() || '20');
    postbackUrl.searchParams.set('type', config.conversionType || 'ConvertedCall');
    postbackUrl.searchParams.set('test', '1');

    // Send test postback
    try {
      const response = await fetch(postbackUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'CallCenter-Pro-RedTrack-Integration/1.0-Test'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseText = await response.text();
      
      res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: postbackUrl.toString(),
        response: responseText,
        clickId: testClickId
      });
    } catch (fetchError) {
      res.json({
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        url: postbackUrl.toString(),
        clickId: testClickId
      });
    }
  } catch (error) {
    console.error('Error testing RedTrack configuration:', error);
    res.status(500).json({ error: 'Failed to test configuration' });
  }
});

export default router;