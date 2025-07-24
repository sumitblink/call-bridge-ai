import { Request, Response } from 'express';
import { storage } from './hybrid-storage';
import { CallRouter } from './call-routing';
import { CallFlowTracker } from './call-flow-tracker';
import { RoutingDecisionTracker } from './routing-decision-tracker';
import { twilioService } from './twilio-service';
import { FlowExecutionEngine } from './flow-execution-engine';
import { RTBService } from './rtb-service';

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
        await CallFlowTracker.initializeCallTracking(callId, {
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
        callId.toString(),
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
        
        // Return TwiML for RTB winner
        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Connecting to our premium partner.</Say>
            <Dial timeout="30" record="record-from-ringing">
              <Number>${auctionResult.winningBid.destinationNumber}</Number>
            </Dial>
          </Response>`);
        return;
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
    console.log('[Webhook] Selected buyer:', selectedBuyer.name, 'Phone:', selectedBuyer.phoneNumber);

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
        .filter(session => session.createdAt && session.createdAt > thirtyMinutesAgo)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .find(session => session.utmSource || session.clickId || session.redtrackClickId);
      
      if (matchingSession) {
        console.log('[Webhook] Found matching visitor session with clickId:', matchingSession.clickId || matchingSession.redtrackClickId);
        
        // Enrich call data with visitor session attribution
        enrichedCallData = {
          ...enrichedCallData,
          sessionId: matchingSession.sessionId,
          clickId: matchingSession.clickId || matchingSession.redtrackClickId, // FIX: Map clickid to clickId
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

    // Log routing decision
    await storage.createCallLog({
      callId: callRecord.id,
      buyerId: selectedBuyer.id,
      action: 'route',
      response: `Routed to ${selectedBuyer.name} (Priority: ${selectedBuyer.priority})`,
    });

    // Return TwiML to forward call to buyer
    const buyerNumber = selectedBuyer.phoneNumber;
    if (!buyerNumber) {
      console.error('[Webhook] Buyer has no phone number:', selectedBuyer.name);
      
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Configuration error. Please contact support.</Say>
          <Hangup/>
        </Response>`);
      return;
    }

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
 * Trigger RedTrack quality tracking events based on call completion
 */
async function triggerRedTrackQualityEvent(call: any, statusData: TwilioCallStatusRequest) {
  try {
    // Only process if call has RedTrack clickid
    if (!call.clickId && !call.redtrackClickid) {
      return;
    }

    const clickid = call.clickId || call.redtrackClickid;
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

    const qualityData = {
      clickid,
      conversionType,
      duration,
      answered,
      converted,
      revenue: parseFloat(call.revenue || '0'),
      sessionId: call.sessionId || `call_${call.id}_${Date.now()}`
    };

    console.log('[Webhook] Triggering RedTrack quality event:', qualityData);

    // Send to RedTrack quality endpoint
    const fetch = (await import('node-fetch')).default;
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
    console.error('[Webhook] Error sending RedTrack quality event:', error);
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