import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Mock bidding endpoint that simulates external buyers
app.post('/bid', (req, res) => {
  console.log('Received bid request:', JSON.stringify(req.body, null, 2));
  
  const { requestId, campaignId, callerId, minBidAmount, maxBidAmount } = req.body;
  
  // Simulate bid decision (70% chance to bid)
  const shouldBid = Math.random() > 0.3;
  
  if (shouldBid) {
    // Generate bid amount between min and max
    const minBid = parseFloat(minBidAmount) || 1.0;
    const maxBid = parseFloat(maxBidAmount) || 5.0;
    const bidAmount = (Math.random() * (maxBid - minBid) + minBid).toFixed(2);
    
    const response = {
      requestId,
      bidAmount: parseFloat(bidAmount),
      currency: 'USD',
      accepted: true,
      callerId,
      campaignId,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending bid response:', response);
    res.json(response);
  } else {
    // No bid
    console.log('Not bidding on this request');
    res.status(204).send(); // No content
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock bidding server running on port ${PORT}`);
  console.log(`Bidding endpoint: http://localhost:${PORT}/bid`);
});