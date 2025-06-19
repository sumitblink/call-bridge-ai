// Test script to verify pool assignment functionality
import fetch from 'node-fetch';

async function testPoolAssignment() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    // First, get available pools
    console.log('1. Fetching available pools...');
    const poolsResponse = await fetch(`${baseUrl}/api/pools`, {
      headers: {
        'Cookie': 'session=your-session-cookie' // This would need actual auth
      }
    });
    
    if (!poolsResponse.ok) {
      console.log('Pools endpoint returned:', poolsResponse.status, await poolsResponse.text());
      return;
    }
    
    const pools = await poolsResponse.json();
    console.log('Available pools:', pools);
    
    if (!pools || pools.length === 0) {
      console.log('No pools available for testing');
      return;
    }
    
    const testPoolId = pools[0].id;
    console.log(`2. Using pool ID ${testPoolId} for testing`);
    
    // Create a campaign with pool assignment
    const campaignData = {
      name: 'Pool Test Campaign',
      geoTargeting: ['US'],
      status: 'draft',
      routingType: 'priority_based',
      maxConcurrentCalls: 10,
      callCap: 100,
      userId: 1,
      poolId: testPoolId
    };
    
    console.log('3. Creating campaign with data:', campaignData);
    
    const createResponse = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignData)
    });
    
    const newCampaign = await createResponse.json();
    console.log('4. Created campaign:', newCampaign);
    
    // Verify pool assignment
    if (newCampaign.poolId === testPoolId) {
      console.log('✅ Pool assignment successful!');
    } else {
      console.log(`❌ Pool assignment failed. Expected: ${testPoolId}, Got: ${newCampaign.poolId}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPoolAssignment();