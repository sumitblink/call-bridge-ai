/**
 * Test script to verify RTB target deletion with foreign key constraint handling
 */

import { storage } from './server/storage-db.js';

async function testRtbDeletion() {
  console.log('Testing RTB target deletion with foreign key constraints...');
  
  try {
    // Get all RTB targets
    const targets = await storage.getRtbTargets();
    console.log(`Found ${targets.length} RTB targets`);
    
    if (targets.length === 0) {
      console.log('No RTB targets to delete');
      return;
    }
    
    // Try to delete the first target
    const targetToDelete = targets[0];
    console.log(`Attempting to delete target: ${targetToDelete.name} (ID: ${targetToDelete.id})`);
    
    // Check if there are bid requests that reference this target
    const bidRequests = await storage.getRtbBidRequests();
    const relatedRequests = bidRequests.filter(req => req.winningTargetId === targetToDelete.id);
    console.log(`Found ${relatedRequests.length} bid requests referencing target ${targetToDelete.id}`);
    
    // Get bid responses for this target
    const bidResponses = await storage.getRtbBidResponses();
    console.log(`Found ${bidResponses.length} total bid responses`);
    
    // Attempt deletion
    const deleteResult = await storage.deleteRtbTarget(targetToDelete.id);
    console.log(`Deletion result: ${deleteResult ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (error) {
    console.error('Error during RTB deletion test:', error.message);
  }
}

// Run the test
testRtbDeletion().then(() => {
  console.log('RTB deletion test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});