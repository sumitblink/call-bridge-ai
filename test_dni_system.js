#!/usr/bin/env node

/**
 * DNI System Test Script
 * Tests if Dynamic Number Insertion is working correctly
 */

const BASE_URL = 'http://localhost:5000';

async function testDNI() {
  console.log('🔍 Testing DNI System...\n');
  
  // Test 1: Request tracking numbers for different sessions
  const testSessions = [
    { sessionId: 'test_session_1', campaignId: '928a699e-e241-46ab-bc54-9f6779d38b32' },
    { sessionId: 'test_session_2', campaignId: '928a699e-e241-46ab-bc54-9f6779d38b32' },
    { sessionId: 'test_session_3', campaignId: '928a699e-e241-46ab-bc54-9f6779d38b32' },
    { sessionId: 'test_session_4', campaignId: '928a699e-e241-46ab-bc54-9f6779d38b32' },
    { sessionId: 'test_session_5', campaignId: '928a699e-e241-46ab-bc54-9f6779d38b32' }
  ];
  
  const results = [];
  
  for (const test of testSessions) {
    try {
      const url = `${BASE_URL}/api/dni/tracking-number?campaign_id=${test.campaignId}&session_id=${test.sessionId}&utm_source=test&utm_medium=web`;
      
      console.log(`📞 Requesting DNI for session ${test.sessionId}...`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      results.push({
        sessionId: test.sessionId,
        phoneNumber: data.phoneNumber,
        success: data.success,
        error: data.error
      });
      
      console.log(`   → Phone: ${data.phoneNumber} (${data.success ? 'SUCCESS' : 'FAILED'})`);
      if (data.error) console.log(`   → Error: ${data.error}`);
      
    } catch (error) {
      console.error(`   → Request failed: ${error.message}`);
      results.push({
        sessionId: test.sessionId,
        phoneNumber: null,
        success: false,
        error: error.message
      });
    }
  }
  
  // Analysis
  console.log('\n📊 Analysis:');
  const uniqueNumbers = [...new Set(results.filter(r => r.phoneNumber).map(r => r.phoneNumber))];
  const successfulRequests = results.filter(r => r.success).length;
  
  console.log(`   Successful requests: ${successfulRequests}/${results.length}`);
  console.log(`   Unique numbers assigned: ${uniqueNumbers.length}`);
  console.log(`   Numbers assigned: ${uniqueNumbers.join(', ')}`);
  
  if (uniqueNumbers.length === 1 && successfulRequests > 1) {
    console.log('\n⚠️  ISSUE DETECTED: All sessions getting the same number!');
    console.log('   This means DNI pool rotation is not working correctly.');
  } else if (uniqueNumbers.length > 1) {
    console.log('\n✅ SUCCESS: Multiple unique numbers assigned - DNI working correctly!');
  }
  
  console.log('\n🔍 Check your database for visitor session assignments:');
  console.log('   SELECT session_id, assigned_phone_number_id, campaign FROM visitor_sessions WHERE session_id LIKE \'test_session_%\' ORDER BY id DESC;');
}

// Run the test
if (require.main === module) {
  testDNI().catch(console.error);
}

module.exports = { testDNI };