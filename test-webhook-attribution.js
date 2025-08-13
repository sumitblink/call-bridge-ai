#!/usr/bin/env node

// Test webhook attribution and revenue assignment fixes
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testWebhookAttribution() {
  console.log('\n🔔 === TESTING WEBHOOK ATTRIBUTION FIXES ===');
  
  // Test 1: Create a new call and simulate webhook
  const testCallSid = 'CA' + Date.now() + '_attr_test';
  
  console.log(`\n📞 1. Testing webhook status update for ${testCallSid}`);
  
  // Simulate Twilio webhook data
  const webhookData = {
    CallSid: testCallSid,
    CallStatus: 'completed',
    CallDuration: '180', // 3 minutes
    From: '+12125551234',
    To: '+18562813889',
    CallType: 'inbound'
  };
  
  try {
    // Send webhook
    const webhookResponse = await fetch(`${API_BASE}/api/webhooks/twilio/status`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(webhookData)
    });
    
    if (webhookResponse.ok) {
      console.log('✅ Webhook processed successfully');
    } else {
      console.log('❌ Webhook failed:', await webhookResponse.text());
    }
  } catch (error) {
    console.log('❌ Webhook error:', error.message);
  }
  
  // Test 2: Check current call data
  console.log('\n📊 2. Checking recent call data...');
  
  try {
    const callsResponse = await fetch(`${API_BASE}/api/calls`);
    if (callsResponse.ok) {
      const callsData = await callsResponse.json();
      const recentCalls = callsData.calls.slice(0, 5);
      
      console.log('\n📋 Recent Call Analysis:');
      
      recentCalls.forEach(call => {
        console.log(`\nCall ID ${call.id}:`);
        console.log(`  📞 ${call.fromNumber} → ${call.toNumber}`);
        console.log(`  ⏱️  Duration: ${call.duration}s`);
        console.log(`  💰 Revenue: $${call.revenue || '0.00'}`);
        console.log(`  🆔 Session: ${call.sessionId || 'None'}`);
        console.log(`  🖱️  Click ID: ${call.clickId || 'None'}`);
        console.log(`  📞 Hangup: ${call.hangupCause || 'None'}`);
        console.log(`  📊 Status: ${call.status}`);
      });
      
      // Calculate statistics
      const withRevenue = recentCalls.filter(c => parseFloat(c.revenue || '0') > 0).length;
      const withSessions = recentCalls.filter(c => c.sessionId).length;
      const withClickIds = recentCalls.filter(c => c.clickId).length;
      const withHangup = recentCalls.filter(c => c.hangupCause).length;
      
      console.log(`\n📈 Attribution Statistics (Last ${recentCalls.length} calls):`);
      console.log(`  💰 Revenue assigned: ${withRevenue}/${recentCalls.length} (${(withRevenue/recentCalls.length*100).toFixed(1)}%)`);
      console.log(`  🆔 Session attribution: ${withSessions}/${recentCalls.length} (${(withSessions/recentCalls.length*100).toFixed(1)}%)`);
      console.log(`  🖱️  Click ID attribution: ${withClickIds}/${recentCalls.length} (${(withClickIds/recentCalls.length*100).toFixed(1)}%)`);
      console.log(`  📞 Hangup data: ${withHangup}/${recentCalls.length} (${(withHangup/recentCalls.length*100).toFixed(1)}%)`);
    }
  } catch (error) {
    console.log('❌ Failed to fetch calls:', error.message);
  }
  
  // Test 3: DNI session creation and attribution
  console.log('\n🔗 3. Testing DNI session creation...');
  
  const sessionData = {
    campaign_id: '928a699e-e241-46ab-bc54-9f6779d38b32',
    visitor_id: 'test_visitor_' + Date.now(),
    click_id: 'test_click_' + Date.now(),
    utm_source: 'webhook_test',
    utm_campaign: 'attribution_fix',
    utm_medium: 'test',
    referrer: 'https://test.com',
    user_agent: 'Test Agent',
    ip_address: '192.168.1.100'
  };
  
  try {
    const dniResponse = await fetch(`${API_BASE}/api/dni/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    
    if (dniResponse.ok) {
      const dniResult = await dniResponse.json();
      console.log('✅ DNI session created:', dniResult.sessionId || 'Success');
      console.log('📱 Assigned number:', dniResult.assignedNumber || 'None');
    } else {
      console.log('❌ DNI session failed:', await dniResponse.text());
    }
  } catch (error) {
    console.log('❌ DNI error:', error.message);
  }
  
  console.log('\n🎯 === WEBHOOK ATTRIBUTION TEST COMPLETE ===');
}

// Run the test
testWebhookAttribution().catch(console.error);