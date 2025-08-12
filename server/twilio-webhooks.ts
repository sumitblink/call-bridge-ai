import { Request, Response } from 'express';
import { storage } from './hybrid-storage';
import { CallRouter } from './call-routing';
import { CallFlowTracker } from './call-flow-tracker';
import { RoutingDecisionTracker } from './routing-decision-tracker';
import { twilioService } from './twilio-service';
import { FlowExecutionEngine } from './flow-execution-engine';
import { RTBService } from './rtb-service';

// RTB Routing Utility Functions
const isSip = (dest: string): boolean => {
  if (!dest) return false;
  const trimmed = dest.trim();
  // Check for SIP URI format or domain-like strings with @ symbol
  // Also check for specific SIP domain patterns like .sip.telnyx.com
  return /^sip:/i.test(trimmed) || 
         /@/.test(trimmed) || 
         /\.sip\./i.test(trimmed) || 
         /\.(com|net|org|io)$/i.test(trimmed);
};

const toE164 = (n: string): string | null => {
  if (!n) return null;
  const trimmed = n.trim();
  
  // Don't attempt E.164 conversion on SIP addresses
  if (isSip(trimmed)) {
    console.log(`[toE164] Skipping E.164 conversion for SIP address: ${trimmed}`);
    return null;
  }
  
  let s = trimmed.replace(/[^\d+]/g, "");
  if (!s.startsWith("+")) s = "+" + s; // assume already has country code from bidders
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
};

// Caller ID Policy Function
function chooseCallerId(inboundAni: string, targetCfg: any, campaignCfg: any): string {
  if (targetCfg?.callerIdPolicy === "fixed" && targetCfg?.callerIdFixed) {
    const fixed = toE164(targetCfg.callerIdFixed);
    if (fixed) return fixed;
  }
  if (targetCfg?.callerIdPolicy === "passthrough") {
    const ani = toE164(inboundAni);
    if (ani) return ani;
  }
  // fallback to campaign default or environment default
  const fallback = toE164(campaignCfg?.defaultCallerId || process.env.DEFAULT_CALLER_ID || "+10000000000");
  return fallback || "+10000000000"; // never leave it blank
}

// Map RTB target to buyer based on naming patterns
async function mapTargetToBuyer(targetId: number): Promise<number | undefined> {
  try {
    const target = await storage.getRtbTarget(targetId);
    if (!target) return undefined;
    
    // Target-to-buyer mapping based on naming patterns
    const targetMapping: Record<string, string> = {
      'MHA': 'MyHealthAngel',
      'ADSparkX': 'AdSparkX', 
      'United': 'United',
      'WeGenerate': 'WeGenerate',
      'Naked': 'Naked Media - Medicare',
      'PM': 'PM',
      'PolicyBind': 'PolicyBind',
      'WeCall': 'WeCall',
      'Jet': 'Jet-Medicare',
      'Leadnomics': 'Leadnomics',
      'VIP': 'VIP Response'
    };
    
    // Find matching buyer company
    for (const [pattern, buyerCompany] of Object.entries(targetMapping)) {
      if (target.name.includes(pattern)) {
        const buyers = await storage.getBuyers();
        const buyer = buyers.find(b => b.companyName === buyerCompany);
        if (buyer) {
          console.log(`[Target Mapping] Mapped target "${target.name}" to buyer "${buyer.companyName}" (ID: ${buyer.id})`);
          return buyer.id;
        }
      }
    }
    
    console.log(`[Target Mapping] No buyer mapping found for target: ${target.name}`);
    return undefined;
  } catch (error) {
    console.error('[Target Mapping] Error mapping target to buyer:', error);
    return undefined;
  }
}

export interface TwilioCallRequest {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ForwardedFrom?: string;
  CallerName?: string;
  CallerCity?: string;
  CallerState?: string;
  CallerZip?: string;
  CallerCountry?: string;
}

export interface TwilioCallStatusRequest extends TwilioCallRequest {
  Duration?: string;
  RecordingUrl?: string;
  RecordingSid?: string;
  RecordingDuration?: string;
  // Enhanced hangup data from Twilio
  HangupCause?: string; // normal-clearing, caller-hangup, busy, no-answer, congestion, etc.
  CallReason?: string; // Twilio's reason for call termination
  DialCallStatus?: string; // Status of the dialed leg
  DialCallDuration?: string; // Duration of dialed leg
  DialHangupCause?: string; // Hangup cause of dialed leg
  // Who hung up the call - direct from Twilio
  WhoHungUp?: string; // "caller", "callee", or other Twilio values
  AnsweredBy?: string; // human, machine, fax, unknown
  // Additional timing data
  RingTime?: string; // Time spent ringing before answer
  TalkTime?: string; // Time spent in conversation
  // Call quality metrics
  ConnectionTime?: string; // Time to establish connection
  CallQuality?: string; // Twilio's call quality assessment
  AudioCodec?: string; // Audio codec used
}

/**
 * Handle incoming calls from Twilio
 */
export async function handleIncomingCall(req: Request, res: Response) {
  try {
    console.log('[Webhook] === INCOMING CALL RECEIVED ===');
    
    const callData: TwilioCallRequest = req.body;
    console.log('[Webhook] Call from', callData.From, 'to', callData.To, 'CallSid:', callData.CallSid);

    // Find campaign by phone number
    const campaign = await storage.getCampaignByPhoneNumber(callData.To);
    console.log('[Webhook] Campaign lookup result:', campaign);
    
    if (!campaign) {
      console.error('[Webhook] No campaign found for number:', callData.To);
      
      // List all available campaigns for debugging
      const allCampaigns = await storage.getCampaigns(1); // Get campaigns for user 1
      console.log('[Webhook] Available campaigns:', allCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        poolId: c.poolId
      })));
      
      // Return TwiML to reject the call
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Sorry, this number is not configured. The number you called is ${callData.To}. Goodbye.</Say>
          <Hangup/>
        </Response>`);
      return;
    }

    console.log('[Webhook] Found campaign:', campaign.name, 'ID:', campaign.id);

    // Check if campaign has an active call flow
    const callFlows = await storage.getCallFlows(campaign.userId);
    const activeFlow = callFlows.find(flow => 
      flow.campaignId === campaign.id && 
      flow.isActive && 
      flow.nodes && 
      flow.nodes.length > 0
    );

    if (activeFlow) {
      console.log('[Webhook] Found active call flow:', activeFlow.name, 'ID:', activeFlow.id);
      
      // Create call record first for Phase 2 tracking
      const callId = await createCallRecord(callData, campaign, 'flow');
      
      // Phase 2: Initialize call flow tracking
      try {
        await CallFlowTracker.initializeCall(callId, {
          flowId: activeFlow.id,
          flowName: activeFlow.name,
          campaignId: campaign.id,
          callerNumber: callData.From,
          targetNumber: callData.To,
          callSid: callData.CallSid,
          startTime: new Date()
        });
        console.log(`[FlowTracker] Initialized tracking for call ${callId}`);
      } catch (trackingError) {
        console.error('[FlowTracker] Failed to initialize call tracking:', trackingError);
      }
      
      // Start flow execution
      const flowResult = await FlowExecutionEngine.startFlowExecution(
        activeFlow.id,
        callId,
        callData.From,
        campaign.id
      );

      if (flowResult.success && flowResult.twimlResponse) {
        console.log('[Webhook] Flow execution started successfully');
        res.set('Content-Type', 'text/xml');
        res.send(flowResult.twimlResponse.twiml);
        return;
      } else {
        console.error('[Webhook] Flow execution failed:', flowResult.error);
        // Fall back to traditional routing
      }
    }

    // Phase 3: Check if RTB is enabled for this campaign first
    let callId: number;
    let routingSequence = 1;

    if (campaign.enableRtb) {
      console.log('[Webhook] RTB enabled for campaign, initiating auction...');
      
      // Create call record first for RTB tracking
      const enrichedCallData = {
        campaignId: campaign.id,
        callSid: callData.CallSid,
        fromNumber: callData.From,
        toNumber: callData.To,
        dialedNumber: callData.To,
        status: 'ringing',
        duration: 0,
        cost: '0.0000',
        payout: (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
        revenue: (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
        profit: (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
      };

      const callRecord = await storage.createCall(enrichedCallData);
      callId = callRecord.id;

      // Phase 3: Log RTB auction initiation
      await RoutingDecisionTracker.logRtbAuctionStart(callId, routingSequence++, campaign.id, 0, 'RTB auction initiated for incoming call');

      // Initiate RTB auction
      const auctionResult = await RTBService.initiateAuction(campaign, {
        requestId: `call_${callData.CallSid}`,
        campaignId: parseInt(campaign.id), // Convert UUID to number for compatibility
        callerId: callData.From,
        callerState: callData.CallerState,
        callerZip: callData.CallerZip,
        callStartTime: new Date(),
        timeoutMs: campaign.biddingTimeoutMs || 3000
      }, callId);

      if (auctionResult.success && auctionResult.winningBid) {
        console.log('[Webhook] RTB auction successful, routing to winner');
        const winnerTarget = await storage.getRtbTarget(auctionResult.winningBid.rtbTargetId);
        
        // UPDATE: Assign winning target to call record
        if (callId && auctionResult.winningBid.rtbTargetId) {
          try {
            // Map RTB target to buyer based on naming conventions
            const mappedBuyerId = await mapTargetToBuyer(auctionResult.winningBid.rtbTargetId);
            
            await storage.updateCall(callId, {
              targetId: auctionResult.winningBid.rtbTargetId,
              buyerId: mappedBuyerId, // Assign the mapped buyer
              // Update payout/revenue based on winning bid if needed
              payout: auctionResult.winningBid.bidAmount?.toString() || (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
              revenue: auctionResult.winningBid.bidAmount?.toString() || (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
              profit: (parseFloat(auctionResult.winningBid.bidAmount?.toString() || campaign.defaultPayout || '0.00') - 0).toFixed(4)
            });
            console.log(`[RTB Assignment] Call ${callId} assigned to target ${auctionResult.winningBid.rtbTargetId} (buyer: ${mappedBuyerId}) with bid $${auctionResult.winningBid.bidAmount}`);
          } catch (error) {
            console.error('[RTB Assignment] Failed to update call with target assignment:', error);
          }
        }
        
        // Get target configuration for routing decisions
        const winningTarget = await storage.getRtbTarget(auctionResult.winningBid.rtbTargetId);
        
        // Validate and normalize destination number
        const rawDestination = auctionResult.winningBid.destinationNumber;
        if (!rawDestination || rawDestination.trim() === '') {
          console.error('[Webhook] RTB winner has no destination number, falling back to traditional routing');
          // Phase 3: Log RTB failure due to missing destination
          await RoutingDecisionTracker.logRoutingDecision(callId, routingSequence++, 'rtb', undefined, 'RTB Auction', undefined, undefined, 'Missing destination number in winning bid', 'failed');
        } else {
          const dest = rawDestination.trim();
          let dialXml: string;
          let callerIdToPresent: string;
          
          // Determine caller ID based on target policy
          callerIdToPresent = chooseCallerId(callData.From, winningTarget, campaign);
          console.log(`[RTB Transfer] Using caller ID: ${callerIdToPresent} for call ${callId}`);

          if (isSip(dest)) {
            // SIP routing - prefer SIP when provided
            console.log(`[RTB Transfer] Processing SIP destination: ${dest}`);
            
            // Use Twilio-optimized SIP URI format to prevent phone number extraction
            let selectedSipUri = dest.startsWith("sip:") ? dest : `sip:${dest}`;
            
            console.log(`[RTB Transfer] Base SIP URI: ${selectedSipUri}`);
            console.log(`[RTB Transfer] Applying Twilio compatibility fixes...`);
            
            // Apply Twilio SIP URI formatting fixes to prevent phone number extraction
            let twilioCompatibleSipUri = selectedSipUri;
            
            // Fix 1: Ensure proper sip: prefix
            if (!twilioCompatibleSipUri.startsWith('sip:')) {
              twilioCompatibleSipUri = `sip:${twilioCompatibleSipUri}`;
            }
            
            // Fix 2: Add transport parameter to force SIP recognition
            if (!twilioCompatibleSipUri.includes('transport=')) {
              const separator = twilioCompatibleSipUri.includes('?') ? '&' : '?';
              twilioCompatibleSipUri = `${twilioCompatibleSipUri}${separator}transport=udp`;
            }
            
            // Fix 3: Ensure URI is under 255 character limit
            if (twilioCompatibleSipUri.length > 254) {
              console.warn(`[RTB Transfer] SIP URI too long (${twilioCompatibleSipUri.length} chars), truncating`);
              twilioCompatibleSipUri = twilioCompatibleSipUri.substring(0, 254);
            }
            
            console.log(`[RTB Transfer] Original SIP: ${selectedSipUri}`);
            console.log(`[RTB Transfer] Twilio-compatible SIP: ${twilioCompatibleSipUri}`);
            
            dialXml = `
              <Dial answerOnBridge="true" timeout="30" callerId="${callerIdToPresent}" action="/api/webhooks/rtb-dial-status" method="POST" record="record-from-answer">
                <Sip>${twilioCompatibleSipUri}</Sip>
              </Dial>`;
          } else {
            // DID routing - validate E.164 format
            const e164 = toE164(dest);
            if (!e164) {
              console.error(`[RTB Transfer] Invalid destination number format: ${dest}`);
              res.set('Content-Type', 'text/xml');
              res.send(`<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                  <Say voice="alice">All buyers unavailable. Please try again later.</Say>
                  <Hangup/>
                </Response>`);
              return;
            }
            
            console.log(`[RTB Transfer] Routing via DID to ${e164} for call ${callId}`);
            dialXml = `
              <Dial answerOnBridge="true" timeout="30" callerId="${callerIdToPresent}" action="/api/webhooks/rtb-dial-status" method="POST" record="record-from-answer">
                <Number>${e164}</Number>
              </Dial>`;
          }

          // Generate enhanced TwiML response
          const finalTwiML = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Say voice="alice">Connecting to our premium partner, please hold.</Say>
              ${dialXml}
              <Say voice="alice">We're sorry, that number appears to be experiencing issues. Please try again later.</Say>
              <Hangup/>
            </Response>`;
          
          console.log(`[RTB Transfer] Generated TwiML for call ${callId}:`, finalTwiML);
          res.set('Content-Type', 'text/xml');
          res.send(finalTwiML);
          return;
        }
      } else {
        console.log('[Webhook] RTB auction failed, falling back to traditional routing:', auctionResult.error);
        // Phase 3: Log RTB failure
        await RoutingDecisionTracker.logRoutingDecision(callId, routingSequence++, 'rtb', undefined, 'RTB Auction', undefined, undefined, auctionResult.error || 'Auction failed', 'failed');
      }
    }

    // Use call router to select best buyer (fallback when no active flow or RTB fails)
    console.log('[Webhook] Starting buyer selection for campaign ID:', campaign.id);
    const routingResult = await CallRouter.selectBuyer(campaign.id, callData.From);
    console.log('[Webhook] Routing result:', routingResult);
    
    if (!routingResult.selectedBuyer) {
      console.log('[Webhook] No available buyers:', routingResult.reason);
      
      // Create call record for fallback if not already created
      if (!callId) {
        const callRecord = await storage.createCall({
          campaignId: campaign.id,
          callSid: callData.CallSid,
          fromNumber: callData.From,
          toNumber: callData.To,
          dialedNumber: callData.To,
          status: 'failed',
          duration: 0,
          cost: '0.0000',
          payout: '0.0000',
          revenue: '0.0000',
          profit: '0.0000',
        });
        callId = callRecord.id;
      }

      // Phase 3: Log fallback routing
      await RoutingDecisionTracker.logFallbackRouting(callId, routingSequence, 'no_agents', routingResult.reason || 'No available buyers');
      
      // Return TwiML for no available buyers
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">All agents are currently busy. Please try again later.</Say>
          <Hangup/>
        </Response>`);
      return;
    }

    const selectedBuyer = routingResult.selectedBuyer;
    console.log('[Webhook] Selected buyer:', selectedBuyer.companyName || selectedBuyer.name, 'Getting target phone number...');

    // Create call record for traditional routing if not already created
    if (!callId) {
      const callRecord = await storage.createCall({
        campaignId: campaign.id,
        buyerId: selectedBuyer.id,
        callSid: callData.CallSid,
        fromNumber: callData.From,
        toNumber: callData.To,
        dialedNumber: callData.To,
        status: 'ringing',
        duration: 0,
        cost: '0.0000',
        payout: (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
        revenue: (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
        profit: (parseFloat(campaign.defaultPayout || '0.00')).toFixed(4),
      });
      callId = callRecord.id;
    }

    // Phase 3: Log successful buyer selection
    await RoutingDecisionTracker.logBuyerSelection(
      callId,
      routingSequence,
      selectedBuyer.id,
      selectedBuyer.name,
      selectedBuyer.priority || 1,
      `Selected buyer based on priority and availability`,
      'selected'
    );

    // Create call record with visitor session enrichment
    console.log('[Webhook] Creating call record...');
    console.log('[Webhook] Looking for visitor session data for phone:', callData.To);
    
    // Calculate financial values based on campaign configuration
    const defaultPayout = parseFloat(campaign.defaultPayout || '0.00');
    const cost = '0.0000'; // Keep cost as 0 for now
    const payout = defaultPayout.toFixed(4);
    const revenue = defaultPayout.toFixed(4); // For per_call model, revenue = payout
    const profit = (defaultPayout - 0).toFixed(4); // profit = revenue - cost
    
    console.log('[Webhook] Financial calculation - Payout:', payout, 'Revenue:', revenue, 'Profit:', profit);
    
    // Try to find recent visitor session for attribution
    let enrichedCallData: any = {
      campaignId: campaign.id,
      buyerId: selectedBuyer.id,
      callSid: callData.CallSid,
      fromNumber: callData.From,
      toNumber: callData.To,
      dialedNumber: callData.To,
      status: 'ringing',
      duration: 0,
      cost,
      payout,
      revenue,
      profit,
    };

    try {
      // Get recent visitor sessions to find attribution data
      const recentSessions = await storage.getVisitorSessions(2); // System user for DNI sessions
      console.log('[Webhook] Found', recentSessions.length, 'recent visitor sessions');
      
      // Find the most recent session with tracking data (within last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const matchingSession = recentSessions
        .filter(session => {
          const sessionTime = session.lastActivity || session.firstVisit;
          return sessionTime && sessionTime > thirtyMinutesAgo;
        })
        .sort((a, b) => {
          const timeA = (b.lastActivity || b.firstVisit)?.getTime() || 0;
          const timeB = (a.lastActivity || a.firstVisit)?.getTime() || 0; 
          return timeA - timeB;
        })
        .find(session => 
          session.utmSource || 
          session.redtrackClickId ||
          session.publisher ||
          session.gclid ||
          session.fbclid
        );
      
      if (matchingSession) {
        console.log('[Webhook] Found matching visitor session with clickId:', matchingSession.redtrackClickId);
        
        // Enrich call data with visitor session attribution
        enrichedCallData = {
          ...enrichedCallData,
          sessionId: matchingSession.sessionId,
          clickId: matchingSession.redtrackClickId || matchingSession.clickId, // Store in clickId field for database
          publisherName: matchingSession.publisher || matchingSession.source, // Extract publisher attribution
          utmSource: matchingSession.utmSource,
          utmMedium: matchingSession.utmMedium,
          utmCampaign: matchingSession.utmCampaign,
          utmContent: matchingSession.utmContent,
          utmTerm: matchingSession.utmTerm,
          referrer: matchingSession.referrer,
          landingPage: matchingSession.landingPage,
          userAgent: matchingSession.userAgent,
          ipAddress: matchingSession.ipAddress,
          geoLocation: matchingSession.location,
        };

      } else {
        console.log('[Webhook] No recent visitor session found for attribution');
      }
    } catch (error) {
      console.error('[Webhook] Error enriching call with visitor session:', error);
    }

    const callRecord = await storage.createCall(enrichedCallData);
    console.log('[Webhook] Call record created:', callRecord.id, 'with clickId:', callRecord.clickId);

    // Fire tracking pixels for "incoming" event
    try {
      const pixels = await storage.getTrackingPixels();
      const campaignPixels = pixels.filter(p => 
        p.isActive && 
        p.fireOnEvent === 'incoming' && 
        p.assignedCampaigns.includes(campaign.id)
      );

      for (const pixel of campaignPixels) {
        let fireUrl = pixel.code;
        
        // Replace token macros with actual values
        const clickId = callRecord.clickId || 'unknown';
        const payout = callRecord.payout || '0.00';
        
        fireUrl = fireUrl.replace(/\[tag:User:clickid\]/g, clickId);
        fireUrl = fireUrl.replace(/\[Call:ConversionPayout\]/g, payout);
        fireUrl = fireUrl.replace(/\{clickid\}/g, clickId);
        fireUrl = fireUrl.replace(/\{sum\}/g, payout);
        fireUrl = fireUrl.replace(/\{campaign_id\}/g, campaign.id);
        fireUrl = fireUrl.replace(/\{call_id\}/g, callRecord.id.toString());

        // Fire the postback pixel (async, don't wait for response)
        fetch(fireUrl, { method: 'GET' }).catch(err => 
          console.log('Tracking pixel fire failed:', err.message)
        );

        console.log(`🔥 POSTBACK FIRED: ${fireUrl}`);
      }
    } catch (pixelError) {
      console.error('Tracking pixel firing error:', pixelError);
    }

    // Log routing decision
    await storage.createCallLog({
      callId: callRecord.id,
      buyerId: selectedBuyer.id,
      action: 'route',
      response: `Routed to ${selectedBuyer.name} (Priority: ${selectedBuyer.priority})`,
    });

    // Get target phone number using intelligent routing
    const { CallRouter } = await import('./call-routing');
    const targetSelection = await CallRouter.selectTargetForBuyer(selectedBuyer.id, campaign.id, callData.From);
    if (!targetSelection) {
      console.error('[Webhook] No available targets for buyer:', selectedBuyer.companyName || selectedBuyer.name);
      
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Configuration error. Please contact support.</Say>
          <Hangup/>
        </Response>`);
      return;
    }

    const selectedTarget = targetSelection.target;
    const buyerNumber = selectedTarget.phoneNumber;
    
    // Update call record with selected target ID
    await storage.updateCall(callRecord.id, { targetId: selectedTarget.id });
    
    console.log(`[Webhook] Selected target: ${selectedTarget.name} (${buyerNumber}) using ${targetSelection.strategy} strategy`);

    // Generate TwiML to forward the call
    console.log('[Webhook] Generating TwiML to forward call to:', buyerNumber);
    const statusCallbackUrl = `${req.protocol}://${req.get('host')}/api/webhooks/twilio/status`;
    console.log('[Webhook] Status callback URL:', statusCallbackUrl);
    
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Please hold while we connect you.</Say>
        <Dial timeout="30" record="record-from-answer" 
              recordingStatusCallback="${statusCallbackUrl}">
          <Number>${buyerNumber}</Number>
        </Dial>
        <Say voice="alice">The call has ended. Thank you for calling.</Say>
        <Hangup/>
      </Response>`;
    
    console.log('[Webhook] Generated TwiML:', twimlResponse);
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);
    console.log('[Webhook] TwiML response sent successfully');

  } catch (error) {
    console.error('[Webhook] Error handling incoming call:', error);
    
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">System error. Please try again later.</Say>
        <Hangup/>
      </Response>`);
  }
}

/**
 * Handle call status updates from Twilio
 */
export async function handleCallStatus(req: Request, res: Response) {
  try {
    const statusData: TwilioCallStatusRequest = req.body;
    console.log('[Webhook] Call status update:', statusData);

    // Find the call record
    const calls = await storage.getCalls();
    const call = calls.find(c => c.callSid === statusData.CallSid);
    
    if (!call) {
      console.error('[Webhook] Call not found:', statusData.CallSid);
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    // Update call record with new status and duration
    const updates: any = {
      status: statusData.CallStatus,
    };

    if (statusData.Duration) {
      updates.duration = parseInt(statusData.Duration, 10);
    }

    if (statusData.RecordingUrl) {
      updates.recordingUrl = statusData.RecordingUrl;
      updates.recordingSid = statusData.RecordingSid;
      updates.recordingStatus = 'completed';
    }

    if (statusData.RecordingDuration) {
      updates.recordingDuration = parseInt(statusData.RecordingDuration, 10);
    }

    // Enhanced hangup data capture from Twilio webhook
    if (statusData.HangupCause) {
      updates.hangupCause = statusData.HangupCause;
      console.log(`[Webhook] Hangup cause captured: ${statusData.HangupCause}`);
    }

    // Capture WHO hung up the call - direct from Twilio
    if (statusData.WhoHungUp) {
      updates.whoHungUp = statusData.WhoHungUp.toLowerCase(); // "caller" or "callee"
      console.log(`[Webhook] Who hung up captured: ${statusData.WhoHungUp}`);
    }

    // Map Twilio call status to disposition
    if (statusData.CallStatus) {
      switch (statusData.CallStatus) {
        case 'completed':
          updates.disposition = 'connected';
          break;
        case 'busy':
          updates.disposition = 'busy';
          break;
        case 'no-answer':
          updates.disposition = 'no_answer';
          break;
        case 'failed':
          updates.disposition = 'failed';
          break;
        case 'canceled':
          updates.disposition = 'failed';
          break;
        default:
          updates.disposition = statusData.CallStatus;
      }
    }

    // Capture timing data from Twilio
    if (statusData.RingTime) {
      updates.ringTime = parseInt(statusData.RingTime, 10);
    }

    if (statusData.TalkTime) {
      updates.talkTime = parseInt(statusData.TalkTime, 10);
    }

    if (statusData.ConnectionTime) {
      updates.connectionTime = parseInt(statusData.ConnectionTime, 10);
    }

    // Capture call quality data
    if (statusData.CallQuality) {
      updates.callQuality = statusData.CallQuality;
    }

    // Handle answered by machine detection
    if (statusData.AnsweredBy) {
      console.log(`[Webhook] Call answered by: ${statusData.AnsweredBy}`);
      // Store in call log for detailed tracking
      await storage.createCallLog({
        callId: call.id,
        buyerId: call.buyerId,
        action: 'machine_detection',
        response: `Answered by: ${statusData.AnsweredBy}`,
      });
    }

    // Actually update the call record in storage
    const updatedCall = await storage.updateCall(call.id, updates);
    
    // Log the status change
    await storage.createCallLog({
      callId: call.id,
      buyerId: call.buyerId,
      action: 'status_update',
      response: `Status changed to ${statusData.CallStatus}${statusData.Duration ? `, Duration: ${statusData.Duration}s` : ''}`,
    });

    console.log('[Webhook] Call updated:', call.id, updates);

    // Trigger RedTrack quality tracking for call completion
    await triggerRedTrackQualityEvent(updatedCall, statusData);

    res.json({ success: true });

  } catch (error) {
    console.error('[Webhook] Error handling call status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create call record with enhanced tracking
 */
async function createCallRecord(callData: TwilioCallRequest, campaign: any, routingType: string): Promise<number> {
  try {
    // Calculate financial values based on campaign configuration
    const defaultPayout = parseFloat(campaign.defaultPayout || '0.00');
    const cost = '0.0000';
    const payout = defaultPayout.toFixed(4);
    const revenue = defaultPayout.toFixed(4);
    const profit = (defaultPayout - 0).toFixed(4);
    
    // Create enhanced call record with tracking fields
    const newCall = await storage.createCall({
      userId: campaign.userId,
      campaignId: campaign.id,
      callSid: callData.CallSid,
      fromNumber: callData.From,
      toNumber: callData.To,
      dialedNumber: callData.To,
      status: 'ringing',
      duration: 0,
      cost,
      payout,
      revenue,
      profit,
      routingType,
      // Phase 2 tracking fields
      flowExecutionId: null,
      ringTreeId: null,
      attemptSequence: 1,
      geographicLocation: `${callData.CallerCity || 'Unknown'}, ${callData.CallerState || 'Unknown'}`,
      deviceInfo: 'Phone Call',
      timestamp: new Date()
    });
    
    console.log(`[Webhook] Created call record ${newCall.id} for ${routingType} routing`);
    return newCall.id;
  } catch (error) {
    console.error('[Webhook] Error creating call record:', error);
    throw error;
  }
}

/**
 * Trigger RedTrack quality tracking events and postback URLs based on call completion
 */
async function triggerRedTrackQualityEvent(call: any, statusData: TwilioCallStatusRequest) {
  try {
    console.log('[Webhook] Checking call for RedTrack data:', {
      callId: call.id,
      sessionId: call.sessionId,
      clickId: call.clickId,
      redtrackClickid: call.redtrackClickid
    });

    // Try to find RedTrack data in multiple places
    let clickid = call.clickId || call.redtrackClickid;
    let visitorSession = null;

    // If no direct clickid, try to find visitor session with RedTrack data
    if (!clickid && call.sessionId) {
      try {
        const client = (await import('@neondatabase/serverless')).neon;
        const sql_client = client(process.env.DATABASE_URL!);
        
        const sessions = await sql_client`
          SELECT redtrack_clickid, redtrack_campaign_id, redtrack_offer_id, redtrack_affiliate_id,
                 redtrack_sub_1, redtrack_sub_2, redtrack_sub_3, redtrack_sub_4, redtrack_sub_5,
                 redtrack_sub_6, redtrack_sub_7, redtrack_sub_8, session_id
          FROM visitor_sessions 
          WHERE session_id LIKE ${call.sessionId + '%'} 
             OR session_id = ${call.sessionId}
          ORDER BY last_activity DESC 
          LIMIT 1
        `;

        if (sessions.length > 0) {
          visitorSession = sessions[0];
          clickid = visitorSession.redtrack_clickid;
          console.log('[Webhook] Found RedTrack data in visitor session:', {
            sessionId: visitorSession.session_id,
            clickid: clickid
          });
        }
      } catch (error) {
        console.error('[Webhook] Error fetching visitor session:', error);
      }
    }

    // Only process if we have RedTrack clickid
    if (!clickid) {
      console.log('[Webhook] No RedTrack clickid found for call:', call.id);
      return;
    }

    const duration = parseInt(statusData.Duration || '0', 10);
    const callStatus = statusData.CallStatus;
    
    // Determine conversion type based on call completion
    let conversionType = 'RAWCall';
    let answered = false;
    let converted = false;
    
    if (callStatus === 'completed') {
      answered = true;
      conversionType = 'AnsweredCall';
      
      // Consider calls > 30 seconds as converted
      if (duration > 30) {
        converted = true;
        conversionType = 'ConvertedCall';
      }
    }

    const revenue = parseFloat(call.revenue || '0');
    const payout = parseFloat(call.payout || '0');
    const conversionValue = payout > 0 ? payout : revenue > 0 ? revenue : 25.00; // Fallback to $25

    const qualityData = {
      clickid,
      conversionType,
      duration,
      answered,
      converted,
      revenue,
      sessionId: call.sessionId || `call_${call.id}_${Date.now()}`
    };

    console.log('[Webhook] Triggering RedTrack quality event:', qualityData);

    // Send to internal RedTrack quality endpoint
    const fetch = (await import('node-fetch')).default;
    try {
      const response = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/tracking/redtrack/quality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qualityData),
      });

      if (response.ok) {
        console.log('[Webhook] RedTrack quality event sent successfully');
      } else {
        console.error('[Webhook] RedTrack quality event failed:', response.status);
      }
    } catch (error) {
      console.error('[Webhook] Error sending internal RedTrack quality event:', error);
    }

    // Fire RedTrack postback URL if call is completed (answered or converted)
    if (callStatus === 'completed' && (answered || converted)) {
      await fireRedTrackPostback(clickid, conversionType, conversionValue, visitorSession);
    }

  } catch (error) {
    console.error('[Webhook] Error sending RedTrack quality event:', error);
  }
}

/**
 * Fire actual RedTrack postback URL for call completion
 */
async function fireRedTrackPostback(clickid: string, conversionType: string, conversionValue: number, visitorSession?: any) {
  try {
    // Extract RedTrack domain from clickid if it follows standard format
    let redtrackDomain = null;
    
    // Check if we have campaign/offer data to construct postback URL
    if (visitorSession?.redtrack_campaign_id || visitorSession?.redtrack_offer_id) {
      // Standard RedTrack postback format
      const campaignId = visitorSession.redtrack_campaign_id;
      const offerId = visitorSession.redtrack_offer_id;
      
      // Try common RedTrack domain patterns
      const commonDomains = [
        'cy9n0.rdtk.io', // User's specific domain from the URL they provided
        'rdtk.io',
        'redtrack.io'
      ];
      
      for (const domain of commonDomains) {
        try {
          const postbackUrl = `https://${domain}/postback?clickid=${clickid}&sum=${conversionValue}&type=${conversionType}`;
          
          console.log('[Webhook] Firing RedTrack postback:', postbackUrl);
          
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(postbackUrl, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'CallCenter-Pro-Webhook/1.0'
            }
          });

          if (response.ok) {
            console.log(`[Webhook] ✅ RedTrack postback fired successfully to ${domain}:`, {
              clickid,
              conversionType,
              conversionValue,
              status: response.status
            });
            return; // Success, stop trying other domains
          } else {
            console.log(`[Webhook] RedTrack postback failed for ${domain}:`, response.status);
          }
        } catch (error) {
          console.log(`[Webhook] RedTrack postback error for ${domain}:`, error.message);
        }
      }
    }

    // If no specific domain worked, log the data for manual verification
    console.log('[Webhook] RedTrack postback data (manual verification needed):', {
      clickid,
      conversionType,
      conversionValue,
      message: 'Add your specific RedTrack postback URL configuration'
    });

  } catch (error) {
    console.error('[Webhook] Error firing RedTrack postback:', error);
  }
}

/**
 * Handle recording status updates from Twilio
 */
export async function handleRecordingStatus(req: Request, res: Response) {
  try {
    const recordingData = req.body;
    console.log('[Webhook] Recording status update:', recordingData);

    // Find call by recording SID
    const calls = await storage.getCalls();
    const call = calls.find(c => c.recordingSid === recordingData.RecordingSid);
    
    if (!call) {
      console.error('[Webhook] Call not found for recording:', recordingData.RecordingSid);
      res.status(404).json({ error: 'Call not found' });
      return;
    }

    // Update recording status
    await storage.createCallLog({
      callId: call.id,
      buyerId: call.buyerId,
      action: 'recording_update',
      timestamp: new Date(),
      details: `Recording ${recordingData.RecordingStatus}: ${recordingData.RecordingUrl || 'N/A'}`,
    });

    console.log('[Webhook] Recording updated for call:', call.id);
    res.json({ success: true });

  } catch (error) {
    console.error('[Webhook] Error handling recording status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}