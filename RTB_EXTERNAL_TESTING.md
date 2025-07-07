# External RTB Bidding Simulator Testing Guide

## Quick Start

1. **Start the External Bidding Simulator**:
   ```bash
   node external-bidding-simulator.js
   ```

2. **Update RTB Targets**:
   - Go to RTB Management → RTB Targets
   - Update endpoint URLs to point to the simulator:
     - `http://localhost:3001/bid-high` (aggressive bidder)
     - `http://localhost:3001/bid-low` (conservative bidder)
     - `http://localhost:3001/bid-random` (random bidder)

3. **Test RTB Auctions**:
   - Make calls to your campaign phone numbers
   - Watch the bidding competition in real-time
   - Monitor RTB Management dashboard for results

## Bidding Strategies

### Aggressive Bidder (`/bid-high`)
- **Strategy**: Bids 80% of maximum bid amount
- **Bid Chance**: 90% 
- **Use Case**: High-value buyer who wants most calls

### Conservative Bidder (`/bid-low`)
- **Strategy**: Bids 30% of bid range above minimum
- **Bid Chance**: 60%
- **Use Case**: Cost-conscious buyer with lower budgets

### Random Bidder (`/bid-random`)
- **Strategy**: Random bid amounts and behavior
- **Bid Chance**: 70%
- **Use Case**: Unpredictable market conditions

## Testing Scenarios

### Scenario 1: Competitive Bidding
1. Create 2-3 RTB targets with different endpoints
2. Set overlapping bid ranges (e.g., $2-5, $3-6, $4-7)
3. Make test calls and observe winner selection

### Scenario 2: Bid Range Testing
1. Set tight bid ranges (e.g., $2.00-$2.50)
2. Test with wide ranges (e.g., $1.00-$10.00)
3. Observe how bidders adapt to different ranges

### Scenario 3: Timeout Testing
1. Set short RTB timeouts (1-2 seconds)
2. Monitor response times and timeout behavior
3. Test with longer timeouts (5-10 seconds)

## Expected Behavior

### Successful Auction
```
[HIGH] Bid Response: $4.80 USD
[LOW] Bid Response: $2.30 USD
[RANDOM] Bid Response: $3.45 USD
Winner: HIGH bidder with $4.80
```

### Failed Auction (No Bids)
```
[HIGH] Not bidding on this request
[LOW] Not bidding on this request
RTB Fallback: Using traditional call routing
```

## Monitoring

### Real-time Logs
- Watch simulator console for bid requests/responses
- Monitor main app logs for RTB auction results
- Check RTB Management dashboard for historical data

### Database Queries
```sql
-- Check recent RTB auctions
SELECT * FROM rtb_bid_requests ORDER BY created_at DESC LIMIT 10;

-- Check winning bids
SELECT * FROM rtb_bid_responses WHERE is_winning_bid = true ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure simulator is running on port 3001
   - Check firewall settings
   - Verify endpoint URLs in RTB targets

2. **No Bids Received**
   - Check bid ranges (min/max) in RTB targets
   - Verify simulator is responding to requests
   - Check timeout settings

3. **Invalid Bid Responses**
   - Ensure bid amounts are within target ranges
   - Check currency matching
   - Verify required response fields

### Debug Commands

```bash
# Test simulator health
curl http://localhost:3001/health

# Test bidding endpoint
curl -X POST http://localhost:3001/bid-high \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-123",
    "campaignId": "test-campaign", 
    "callerId": "+12125551234",
    "minBid": "2.00",
    "maxBid": "5.00",
    "currency": "USD"
  }'
```

## Advanced Testing

### Load Testing
```bash
# Use curl or siege for load testing
for i in {1..10}; do
  curl -X POST http://localhost:3001/bid-high \
    -H "Content-Type: application/json" \
    -d '{"requestId":"load-test-'$i'","minBid":"2.00","maxBid":"5.00"}' &
done
```

### Custom Bidding Logic
Modify `external-bidding-simulator.js` to implement:
- Time-based bidding (higher bids during peak hours)
- Caller-based bidding (different rates for different areas)
- Campaign-specific bidding strategies
- Dynamic bid adjustment based on win/loss ratios

## Integration with External Systems

### Webhook Support
The simulator can be extended to send webhooks on:
- Bid wins/losses
- Campaign performance metrics
- Budget threshold alerts

### API Integration
Connect to external systems:
- CRM systems for caller data
- Analytics platforms for performance tracking
- Billing systems for cost management

## Production Considerations

### Security
- Add API key authentication
- Implement rate limiting
- Use HTTPS in production
- Validate all incoming requests

### Monitoring
- Add logging to external log aggregators
- Implement health checks
- Set up alerting for bid failures
- Track performance metrics

### Scaling
- Use process managers (PM2, Docker)
- Implement horizontal scaling
- Add load balancers
- Use external databases for bid history