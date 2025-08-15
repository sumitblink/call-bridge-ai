// Comprehensive Test Suite for CallCenter Pro Platform
// Tests all critical systems: RTB, DNI, Webhooks, Revenue Attribution, and Call Tracking

import fetch from 'node-fetch';
import crypto from 'crypto';

const API_BASE = 'http://localhost:5000';
const TEST_PHONE_NUMBERS = [
  '+12125551234', // Test caller 1
  '+13055554567', // Test caller 2  
  '+14155557890', // Test caller 3
];

// Test Colors for Console Output
const Colors = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m'
};

class ComprehensiveTestSuite {
  constructor() {
    this.testResults = [];
    this.sessionCookie = null;
  }

  log(message, color = Colors.WHITE) {
    console.log(`${color}${message}${Colors.RESET}`);
  }

  async runAllTests() {
    this.log('\n🚀 === STARTING COMPREHENSIVE PLATFORM TESTS ===', Colors.CYAN);
    this.log('Testing: RTB System, DNI Attribution, Webhook Processing, Revenue Assignment', Colors.CYAN);
    
    try {
      // 1. Authentication Test
      await this.testAuthentication();
      
      // 2. RTB System Test
      await this.testRTBSystem();
      
      // 3. DNI Attribution Test  
      await this.testDNIAttribution();
      
      // 4. Webhook Processing Test
      await this.testWebhookProcessing();
      
      // 5. Revenue Assignment Test
      await this.testRevenueAssignment();
      
      // 6. Call Status Tracking Test
      await this.testCallStatusTracking();
      
      // 7. Session Linkage Test
      await this.testSessionLinkage();
      
      // 8. End-to-End Integration Test
      await this.testEndToEndIntegration();
      
      // Final Results
      this.generateTestReport();
      
    } catch (error) {
      this.log(`💥 CRITICAL TEST ERROR: ${error.message}`, Colors.RED);
      console.error(error);
    }
  }

  // Authentication Test
  async testAuthentication() {
    this.log('\n📋 1. TESTING AUTHENTICATION', Colors.BLUE);
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'sumit',
          password: 'demo123'
        })
      });
      
      if (response.ok) {
        // Extract session cookie
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
          this.sessionCookie = cookies.split(';')[0];
        }
        this.addResult('Authentication', true, 'Login successful');
        this.log('✅ Authentication: PASSED', Colors.GREEN);
      } else {
        this.addResult('Authentication', false, 'Login failed');
        this.log('❌ Authentication: FAILED', Colors.RED);
      }
    } catch (error) {
      this.addResult('Authentication', false, error.message);
      this.log(`❌ Authentication: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // RTB System Test
  async testRTBSystem() {
    this.log('\n💰 2. TESTING RTB AUCTION SYSTEM', Colors.BLUE);
    
    try {
      // Test RTB target creation
      const rtbResponse = await this.makeAuthenticatedRequest('/api/rtb/targets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test RTB Target',
          endpoint_url: 'https://test-bidder.example.com/bid',
          max_bid_amount: 25.00,
          timeout_seconds: 5,
          auth_method: 'none',
          is_active: true
        })
      });
      
      if (rtbResponse.ok) {
        const rtbTarget = await rtbResponse.json();
        this.addResult('RTB Target Creation', true, `Target ID: ${rtbTarget.id}`);
        this.log('✅ RTB Target Creation: PASSED', Colors.GREEN);
        
        // Test RTB auction simulation
        const auctionResponse = await this.makeAuthenticatedRequest('/_sim/rtb', {
          method: 'POST',
          body: JSON.stringify({
            scenario: 'accept',
            bid_amount: 18.50,
            destination_number: '+15551234567'
          })
        });
        
        if (auctionResponse.ok) {
          this.addResult('RTB Auction Simulation', true, 'Auction completed');
          this.log('✅ RTB Auction: PASSED', Colors.GREEN);
        } else {
          this.addResult('RTB Auction Simulation', false, 'Auction failed');
          this.log('❌ RTB Auction: FAILED', Colors.RED);
        }
      } else {
        this.addResult('RTB Target Creation', false, 'Target creation failed');
        this.log('❌ RTB Target Creation: FAILED', Colors.RED);
      }
    } catch (error) {
      this.addResult('RTB System', false, error.message);
      this.log(`❌ RTB System: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // DNI Attribution Test
  async testDNIAttribution() {
    this.log('\n🔗 3. TESTING DNI ATTRIBUTION', Colors.BLUE);
    
    try {
      // Simulate visitor session creation
      const sessionData = {
        campaign_id: '928a699e-e241-46ab-bc54-9f6779d38b32',
        visitor_id: 'test_visitor_' + Date.now(),
        click_id: 'test_click_' + Date.now(),
        utm_source: 'google',
        utm_campaign: 'healthcare_test',
        utm_medium: 'cpc',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0 Test Browser',
        ip_address: '192.168.1.100'
      };
      
      const dniResponse = await this.makeAuthenticatedRequest('/api/dni/track', {
        method: 'POST',
        body: JSON.stringify(sessionData)
      });
      
      if (dniResponse.ok) {
        const dniResult = await dniResponse.json();
        this.addResult('DNI Session Creation', true, `Session: ${dniResult.sessionId || 'Created'}`);
        this.log('✅ DNI Session Creation: PASSED', Colors.GREEN);
        
        // Test number assignment  
        if (dniResult.assignedNumber) {
          this.addResult('DNI Number Assignment', true, `Number: ${dniResult.assignedNumber}`);
          this.log('✅ DNI Number Assignment: PASSED', Colors.GREEN);
        } else {
          this.addResult('DNI Number Assignment', false, 'No number assigned');
          this.log('⚠️ DNI Number Assignment: WARNING', Colors.YELLOW);
        }
      } else {
        this.addResult('DNI Attribution', false, 'DNI tracking failed');
        this.log('❌ DNI Attribution: FAILED', Colors.RED);
      }
    } catch (error) {
      this.addResult('DNI Attribution', false, error.message);
      this.log(`❌ DNI Attribution: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // Webhook Processing Test
  async testWebhookProcessing() {
    this.log('\n🔔 4. TESTING WEBHOOK PROCESSING', Colors.BLUE);
    
    try {
      // Simulate Twilio call status webhook
      const callSid = 'CA' + Date.now() + '_test';
      const webhookData = {
        CallSid: callSid,
        CallStatus: 'completed', 
        CallDuration: '125',
        From: TEST_PHONE_NUMBERS[0],
        To: '+18562813889'
      };
      
      // First create a test call record
      const testCall = {
        call_sid: callSid,
        from_number: TEST_PHONE_NUMBERS[0],
        to_number: '+18562813889',
        status: 'in-progress',
        duration: 0
      };
      
      const createResponse = await this.makeAuthenticatedRequest('/api/test-calls', {
        method: 'POST',
        body: JSON.stringify(testCall)
      });
      
      if (createResponse.ok) {
        // Now test webhook processing
        const webhookResponse = await fetch(`${API_BASE}/api/webhooks/twilio/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(webhookData)
        });
        
        if (webhookResponse.ok) {
          this.addResult('Webhook Processing', true, 'Status webhook processed');
          this.log('✅ Webhook Processing: PASSED', Colors.GREEN);
        } else {
          this.addResult('Webhook Processing', false, 'Webhook failed');
          this.log('❌ Webhook Processing: FAILED', Colors.RED);
        }
      }
    } catch (error) {
      this.addResult('Webhook Processing', false, error.message);
      this.log(`❌ Webhook Processing: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // Revenue Assignment Test
  async testRevenueAssignment() {
    this.log('\n💸 5. TESTING REVENUE ASSIGNMENT', Colors.BLUE);
    
    try {
      // Get recent calls and check revenue assignment
      const callsResponse = await this.makeAuthenticatedRequest('/api/calls');
      
      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        const recentCalls = callsData.calls.slice(0, 5);
        
        let revenueAssigned = 0;
        let totalCalls = recentCalls.length;
        
        for (const call of recentCalls) {
          if (parseFloat(call.revenue || '0') > 0) {
            revenueAssigned++;
          }
        }
        
        const revenueRate = (revenueAssigned / totalCalls) * 100;
        
        if (revenueRate >= 50) {
          this.addResult('Revenue Assignment', true, `${revenueRate}% calls have revenue`);
          this.log(`✅ Revenue Assignment: PASSED (${revenueRate}%)`, Colors.GREEN);
        } else {
          this.addResult('Revenue Assignment', false, `Only ${revenueRate}% calls have revenue`);
          this.log(`⚠️ Revenue Assignment: WARNING (${revenueRate}%)`, Colors.YELLOW);
        }
      } else {
        this.addResult('Revenue Assignment', false, 'Could not fetch calls');
        this.log('❌ Revenue Assignment: FAILED', Colors.RED);
      }
    } catch (error) {
      this.addResult('Revenue Assignment', false, error.message);
      this.log(`❌ Revenue Assignment: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // Call Status Tracking Test
  async testCallStatusTracking() {
    this.log('\n📊 6. TESTING CALL STATUS TRACKING', Colors.BLUE);
    
    try {
      const callsResponse = await this.makeAuthenticatedRequest('/api/calls');
      
      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        const calls = callsData.calls.slice(0, 10);
        
        const statusTypes = ['completed', 'completed-long', 'short-call', 'no-answer', 'failed'];
        let statusCount = {};
        
        calls.forEach(call => {
          const status = call.status;
          statusCount[status] = (statusCount[status] || 0) + 1;
        });
        
        const hasProperStatuses = Object.keys(statusCount).some(status => 
          statusTypes.includes(status)
        );
        
        if (hasProperStatuses) {
          this.addResult('Call Status Tracking', true, `Status types: ${Object.keys(statusCount).join(', ')}`);
          this.log('✅ Call Status Tracking: PASSED', Colors.GREEN);
        } else {
          this.addResult('Call Status Tracking', false, 'No proper status categorization');
          this.log('❌ Call Status Tracking: FAILED', Colors.RED);
        }
      }
    } catch (error) {
      this.addResult('Call Status Tracking', false, error.message);
      this.log(`❌ Call Status Tracking: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // Session Linkage Test
  async testSessionLinkage() {
    this.log('\n🔗 7. TESTING SESSION LINKAGE', Colors.BLUE);
    
    try {
      const callsResponse = await this.makeAuthenticatedRequest('/api/calls');
      
      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        const calls = callsData.calls.slice(0, 10);
        
        let callsWithSessions = 0;
        let callsWithClickIds = 0;
        
        calls.forEach(call => {
          if (call.sessionId) callsWithSessions++;
          if (call.clickId) callsWithClickIds++;
        });
        
        const sessionRate = (callsWithSessions / calls.length) * 100;
        const clickIdRate = (callsWithClickIds / calls.length) * 100;
        
        if (sessionRate >= 30 || clickIdRate >= 30) {
          this.addResult('Session Linkage', true, `${sessionRate}% sessions, ${clickIdRate}% click IDs`);
          this.log(`✅ Session Linkage: PASSED`, Colors.GREEN);
        } else {
          this.addResult('Session Linkage', false, 'Low session attribution');
          this.log(`⚠️ Session Linkage: WARNING`, Colors.YELLOW);
        }
      }
    } catch (error) {
      this.addResult('Session Linkage', false, error.message);
      this.log(`❌ Session Linkage: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // End-to-End Integration Test
  async testEndToEndIntegration() {
    this.log('\n🔄 8. TESTING END-TO-END INTEGRATION', Colors.BLUE);
    
    try {
      // Test complete flow: Session → DNI → Call → RTB → Revenue
      const integrationTest = {
        sessionCreated: false,
        numberAssigned: false,
        callProcessed: false,
        rtbExecuted: false,
        revenueAssigned: false
      };
      
      // 1. Create session
      const sessionResponse = await this.makeAuthenticatedRequest('/api/dni/track', {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: '928a699e-e241-46ab-bc54-9f6779d38b32',
          visitor_id: 'integration_test_' + Date.now(),
          click_id: 'integration_click_' + Date.now(),
          utm_source: 'integration_test'
        })
      });
      
      if (sessionResponse.ok) {
        integrationTest.sessionCreated = true;
        const sessionData = await sessionResponse.json();
        if (sessionData.assignedNumber) {
          integrationTest.numberAssigned = true;
        }
      }
      
      // 2. Test call routing
      const routingResponse = await this.makeAuthenticatedRequest('/api/call-routing/test', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: '928a699e-e241-46ab-bc54-9f6779d38b32',
          callerNumber: TEST_PHONE_NUMBERS[2]
        })
      });
      
      if (routingResponse.ok) {
        integrationTest.callProcessed = true;
        const routingData = await routingResponse.json();
        if (routingData.selectedBuyer) {
          integrationTest.rtbExecuted = true;
        }
      }
      
      const passedTests = Object.values(integrationTest).filter(Boolean).length;
      const totalTests = Object.keys(integrationTest).length;
      
      if (passedTests >= 3) {
        this.addResult('End-to-End Integration', true, `${passedTests}/${totalTests} components working`);
        this.log(`✅ End-to-End Integration: PASSED (${passedTests}/${totalTests})`, Colors.GREEN);
      } else {
        this.addResult('End-to-End Integration', false, `Only ${passedTests}/${totalTests} components working`);
        this.log(`❌ End-to-End Integration: FAILED (${passedTests}/${totalTests})`, Colors.RED);
      }
    } catch (error) {
      this.addResult('End-to-End Integration', false, error.message);
      this.log(`❌ End-to-End Integration: ERROR - ${error.message}`, Colors.RED);
    }
  }

  // Helper Methods
  async makeAuthenticatedRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    if (this.sessionCookie) {
      headers.Cookie = this.sessionCookie;
    }
    
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  }

  addResult(testName, passed, details) {
    this.testResults.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateTestReport() {
    this.log('\n📊 === COMPREHENSIVE TEST REPORT ===', Colors.MAGENTA);
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    this.log(`\n📋 Overall Results: ${passed}/${total} tests passed (${passRate}%)`, Colors.CYAN);
    
    if (passRate >= 80) {
      this.log('🎉 EXCELLENT: Platform is working well!', Colors.GREEN);
    } else if (passRate >= 60) {
      this.log('⚠️ GOOD: Platform mostly working, minor issues', Colors.YELLOW);
    } else {
      this.log('🚨 NEEDS ATTENTION: Multiple systems require fixes', Colors.RED);
    }
    
    this.log('\n📝 Detailed Results:', Colors.CYAN);
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const color = result.passed ? Colors.GREEN : Colors.RED;
      this.log(`${status} ${result.test}: ${result.details}`, color);
    });
    
    this.log('\n🔧 Recommendations:', Colors.MAGENTA);
    
    const failedTests = this.testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      failedTests.forEach(test => {
        this.log(`• Fix ${test.test}: ${test.details}`, Colors.YELLOW);
      });
    } else {
      this.log('• All systems operational! 🚀', Colors.GREEN);
    }
  }
}

// Run the comprehensive test suite
const testSuite = new ComprehensiveTestSuite();
testSuite.runAllTests().then(() => {
  console.log('\n🏁 Comprehensive test suite completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});