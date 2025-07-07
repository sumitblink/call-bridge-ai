# External RTB Testing Demonstration

## What We've Built

✅ **Complete External RTB Infrastructure**:
- External bidding simulator (`external-bidding-simulator.js`)
- Multiple bidding strategies (aggressive, conservative, random)
- Proper RTB request/response handling
- Real-time bidding competition
- External destination number routing

## How External RTB Works

### 1. RTB Target Configuration
Your RTB targets can point to any external HTTP endpoint:
```
Target 18: http://external-buyer-1.com/bid
Target 19: http://external-buyer-2.com/bid  
Target 20: http://external-buyer-3.com/bid
```

### 2. Bid Request Format
When a call comes in, the system sends this request to each target:
```json
{
  "requestId": "pool_23_1751893041850_t2dkpg6tq1",
  "campaignId": "1c22a98c60a74cf38944c0cc77eb0t12",
  "callerId": "+12129200892",
  "callerState": "NY",
  "callerZip": "10167",
  "callStartTime": "2025-07-07T12:57:21.850Z",
  "timeout": 1000,
  "minBid": "2.00",
  "maxBid": "5.00",
  "currency": "USD"
}
```

### 3. External Bidder Response
External bidders respond with:
```json
{
  "requestId": "pool_23_1751893041850_t2dkpg6tq1",
  "bidAmount": 4.75,
  "bidCurrency": "USD",
  "destinationNumber": "+447123456789",
  "requiredDuration": 60,
  "accepted": true,
  "callerId": "+12129200892",
  "campaignId": "1c22a98c60a74cf38944c0cc77eb0t12",
  "timestamp": "2025-07-07T12:57:21.950Z"
}
```

### 4. Winner Selection & Routing
- System compares all bids
- Selects highest valid bid
- Routes call to winner's `destinationNumber`
- Records all auction data

## External Simulator Features

### Bidding Strategies
- **Aggressive** (`/bid-high`): Bids 80% of max amount, 90% bid rate
- **Conservative** (`/bid-low`): Bids 30% above min, 60% bid rate  
- **Random** (`/bid-random`): Variable strategy, 70% bid rate

### Realistic Features
- Variable response times (50-200ms)
- Random destination numbers (US, UK, India, France)
- Proper timeout handling
- Comprehensive logging
- Health monitoring

## Production Deployment

### For External Partners
1. Deploy the simulator to cloud platforms:
   ```bash
   # Heroku
   heroku create your-rtb-bidder
   git push heroku main
   
   # AWS/Digital Ocean
   docker build -t rtb-bidder .
   docker run -p 80:3001 rtb-bidder
   ```

2. Update RTB targets with production URLs:
   ```
   https://your-rtb-bidder.herokuapp.com/bid
   https://api.buyer-company.com/rtb/bid
   ```

### Security & Authentication
Add to external simulator:
```javascript
// API key authentication
app.use('/bid*', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});
```

## Testing Scenarios

### 1. Multiple External Bidders
```bash
# Terminal 1: Start bidder A
PORT=3001 node external-bidding-simulator.js

# Terminal 2: Start bidder B  
PORT=3002 node external-bidding-simulator.js

# Terminal 3: Start bidder C
PORT=3003 node external-bidding-simulator.js
```

### 2. Update RTB Targets
```sql
UPDATE rtb_targets SET endpoint_url = 'http://localhost:3001/bid-high' WHERE id = 18;
UPDATE rtb_targets SET endpoint_url = 'http://localhost:3002/bid-low' WHERE id = 19;
UPDATE rtb_targets SET endpoint_url = 'http://localhost:3003/bid-random' WHERE id = 20;
```

### 3. Make Test Calls
Watch real-time bidding competition across multiple external systems!

## Integration Examples

### CRM Integration
```javascript
app.post('/bid', async (req, res) => {
  const { callerId, callerState } = req.body;
  
  // Check CRM for caller value
  const callerData = await CRM.lookupCaller(callerId);
  const bidMultiplier = callerData.value === 'high' ? 1.2 : 0.8;
  
  const bidAmount = calculateBid(req.body, bidMultiplier);
  res.json({ bidAmount, destinationNumber: selectAgent(callerData) });
});
```

### Dynamic Pricing
```javascript
// Time-based bidding
const hourlyMultipliers = {
  '9-12': 1.3,   // High value morning hours
  '13-17': 1.0,  // Normal business hours  
  '18-22': 0.7,  // Lower value evening
  '23-8': 0.4    // Night/weekend rates
};
```

## Monitoring & Analytics

### Real-time Dashboard
- Bid win/loss rates
- Average bid amounts
- Response times
- Campaign performance
- Revenue tracking

### Alerts
- Low win rates
- High response times
- Budget thresholds
- System failures

## Current Status

✅ **Fully Functional RTB System**
- Real-time bidding working
- External endpoint support
- Winner selection algorithm
- Call routing to bid destinations
- Complete audit trail

The system is production-ready for external RTB integration!