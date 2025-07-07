#!/usr/bin/env node

/**
 * External RTB Bidding Simulator
 * 
 * This is a standalone bidding server that simulates external RTB buyers.
 * Run this separately from your main application to test RTB functionality.
 * 
 * Usage:
 *   node external-bidding-simulator.js
 * 
 * Then update your RTB targets to point to:
 *   http://localhost:3001/bid-high    (aggressive bidder)
 *   http://localhost:3001/bid-low     (conservative bidder)
 *   http://localhost:3001/bid-random  (random bidder)
 */

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Simulate different bidding strategies
const BIDDING_STRATEGIES = {
  high: {
    name: 'Aggressive Bidder',
    bidMultiplier: 0.8, // Bid 80% of max
    bidChance: 0.9,     // 90% chance to bid
    color: '\x1b[32m'   // Green
  },
  low: {
    name: 'Conservative Bidder', 
    bidMultiplier: 0.3, // Bid 30% of range
    bidChance: 0.6,     // 60% chance to bid
    color: '\x1b[33m'   // Yellow
  },
  random: {
    name: 'Random Bidder',
    bidMultiplier: Math.random(), // Random multiplier
    bidChance: 0.7,     // 70% chance to bid
    color: '\x1b[36m'   // Cyan
  }
};

// Generic bidding endpoint
function createBidEndpoint(strategy, strategyName) {
  return (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`${strategy.color}[${strategyName}] ${timestamp} - Bid request received\x1b[0m`);
    console.log(`${strategy.color}Request: ${JSON.stringify(req.body, null, 2)}\x1b[0m`);
    
    const { requestId, campaignId, callerId, minBid, maxBid, currency = 'USD' } = req.body;
    
    // Simulate processing time (50-200ms)
    const processingTime = Math.floor(Math.random() * 150) + 50;
    
    setTimeout(() => {
      // Decide whether to bid
      const shouldBid = Math.random() < strategy.bidChance;
      
      if (!shouldBid) {
        console.log(`${strategy.color}[${strategyName}] Not bidding on this request\x1b[0m`);
        return res.status(204).send();
      }
      
      // Calculate bid amount
      const minBidAmount = parseFloat(minBid) || 1.0;
      const maxBidAmount = parseFloat(maxBid) || 5.0;
      const bidRange = maxBidAmount - minBidAmount;
      const bidAmount = (minBidAmount + (bidRange * strategy.bidMultiplier)).toFixed(2);
      
      // Random destination numbers for testing
      const destinations = [
        '+917208280595', // India
        '+447123456789', // UK
        '+12125551234',  // US
        '+33123456789'   // France
      ];
      
      const response = {
        requestId,
        bidAmount: parseFloat(bidAmount),
        bidCurrency: currency,
        destinationNumber: destinations[Math.floor(Math.random() * destinations.length)],
        requiredDuration: Math.floor(Math.random() * 120) + 60, // 60-180 seconds
        accepted: true,
        callerId,
        campaignId,
        timestamp: new Date().toISOString(),
        bidderInfo: {
          name: strategy.name,
          strategy: strategyName,
          processingTime: processingTime
        }
      };
      
      console.log(`${strategy.color}[${strategyName}] Bid Response: $${bidAmount} ${currency}\x1b[0m`);
      console.log(`${strategy.color}Response: ${JSON.stringify(response, null, 2)}\x1b[0m`);
      
      res.json(response);
    }, processingTime);
  };
}

// Create endpoints for different strategies
app.post('/bid-high', createBidEndpoint(BIDDING_STRATEGIES.high, 'HIGH'));
app.post('/bid-low', createBidEndpoint(BIDDING_STRATEGIES.low, 'LOW'));
app.post('/bid-random', createBidEndpoint(BIDDING_STRATEGIES.random, 'RANDOM'));

// Generic bidding endpoint
app.post('/bid', (req, res) => {
  const strategies = Object.keys(BIDDING_STRATEGIES);
  const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
  const strategy = BIDDING_STRATEGIES[randomStrategy];
  
  return createBidEndpoint(strategy, randomStrategy.toUpperCase())(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    endpoints: {
      aggressive: 'http://localhost:3001/bid-high',
      conservative: 'http://localhost:3001/bid-low', 
      random: 'http://localhost:3001/bid-random',
      generic: 'http://localhost:3001/bid'
    }
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    server: 'External RTB Bidding Simulator',
    version: '1.0.0',
    uptime: process.uptime(),
    strategies: Object.keys(BIDDING_STRATEGIES),
    endpoints: [
      'POST /bid-high (aggressive bidder)',
      'POST /bid-low (conservative bidder)', 
      'POST /bid-random (random bidder)',
      'POST /bid (generic bidder)',
      'GET /health',
      'GET /status'
    ]
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('\x1b[35m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[35m║             External RTB Bidding Simulator                  ║\x1b[0m');
  console.log('\x1b[35m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');
  console.log(`\x1b[32m✅ Server running on http://${HOST}:${PORT}\x1b[0m`);
  console.log('');
  console.log('\x1b[36mAvailable endpoints:\x1b[0m');
  console.log(`  \x1b[32m• POST http://localhost:${PORT}/bid-high\x1b[0m    (Aggressive bidder - 80% of max bid)`);
  console.log(`  \x1b[33m• POST http://localhost:${PORT}/bid-low\x1b[0m     (Conservative bidder - 30% of range)`);
  console.log(`  \x1b[36m• POST http://localhost:${PORT}/bid-random\x1b[0m  (Random bidder - variable strategy)`);
  console.log(`  \x1b[37m• POST http://localhost:${PORT}/bid\x1b[0m        (Generic bidder - random strategy)`);
  console.log('');
  console.log('\x1b[35mHow to test:\x1b[0m');
  console.log('1. Update your RTB targets to use the above endpoints');
  console.log('2. Make test calls to trigger RTB auctions');
  console.log('3. Watch the bidding competition in real-time');
  console.log('');
  console.log('\x1b[33mPress Ctrl+C to stop the simulator\x1b[0m');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\x1b[31m\nShutting down External RTB Bidding Simulator...\x1b[0m');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\x1b[31m\nShutting down External RTB Bidding Simulator...\x1b[0m');
  process.exit(0);
});