/**
 * Test script for advanced RTB functionality with template variables and JSONPath response parsing
 */

const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

// Test endpoint that supports multiple response formats
app.post('/test-bidding-advanced', (req, res) => {
  console.log('=== Advanced RTB Test Request ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', req.headers);
  
  const { requestId, campaignId, callerId, minBid, maxBid, currency } = req.body;
  
  // Parse bidding parameters
  const minBidAmount = parseFloat(minBid) || 0;
  const maxBidAmount = parseFloat(maxBid) || 100;
  
  // Generate a bid amount between min and max
  const bidAmount = Math.random() * (maxBidAmount - minBidAmount) + minBidAmount;
  
  // Different response formats for testing
  const responseFormat = req.query.format || 'standard';
  
  let response;
  
  switch (responseFormat) {
    case 'nested':
      // Nested response format for JSONPath testing
      response = {
        success: true,
        data: {
          bid: {
            amount: bidAmount,
            currency: currency || 'USD'
          },
          routing: {
            phone: '+1800555NESTED',
            accepted: true
          },
          requirements: {
            duration: 60
          }
        },
        timestamp: new Date().toISOString()
      };
      break;
      
    case 'array':
      // Array response format
      response = {
        bids: [
          {
            bidAmount: bidAmount,
            destinationNumber: '+1800555ARRAY',
            accepted: true,
            currency: currency || 'USD'
          }
        ]
      };
      break;
      
    case 'alternative':
      // Alternative field names
      response = {
        price: bidAmount,
        phoneNumber: '+1800555ALTERNATIVE',
        accept: true,
        curr: currency || 'USD',
        duration: 90
      };
      break;
      
    case 'rejected':
      // Rejected bid
      response = {
        bidAmount: 0,
        destinationNumber: '',
        accepted: false,
        message: 'Bid rejected - out of capacity'
      };
      break;
      
    default:
      // Standard response format
      response = {
        bidAmount: bidAmount,
        destinationNumber: '+1800555STANDARD',
        bidCurrency: currency || 'USD',
        accepted: true,
        requiredDuration: 60
      };
  }
  
  console.log('Response:', JSON.stringify(response, null, 2));
  res.json(response);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`\n🚀 Advanced RTB Test Server running on port ${port}`);
  console.log(`\nTest different response formats:`);
  console.log(`• Standard:     POST /test-bidding-advanced`);
  console.log(`• Nested:       POST /test-bidding-advanced?format=nested`);
  console.log(`• Array:        POST /test-bidding-advanced?format=array`);
  console.log(`• Alternative:  POST /test-bidding-advanced?format=alternative`);
  console.log(`• Rejected:     POST /test-bidding-advanced?format=rejected`);
  console.log(`\nHealth check: GET /health`);
});