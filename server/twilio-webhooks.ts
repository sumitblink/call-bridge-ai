import { Request, Response } from 'express';
import { storage } from './hybrid-storage';
import { CallRouter } from './call-routing';
import { twilioService } from './twilio-service';
import { FlowExecutionEngine } from './flow-execution-engine';

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
    console.log('[Webhook] Request method:', req.method);
    console.log('[Webhook] Request URL:', req.url);
    console.log('[Webhook] Request headers:', JSON.stringify(req.headers, null, 2));
    
    const callData: TwilioCallRequest = req.body;
    console.log('[Webhook] *** CALL DATA ***:', JSON.stringify(callData, null, 2));
    console.log('[Webhook] Looking for campaign with phone number:', callData.To);

    // Find campaign by phone number
    const campaign = await storage.getCampaignByPhoneNumber(callData.To);
    console.log('[Webhook] Campaign lookup result:', campaign);
    
    if (!campaign) {
      console.error('[Webhook] No campaign found for number:', callData.To);
      
      // Return TwiML to reject the call
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Sorry, this number is not configured. Goodbye.</Say>
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
      
      // Start flow execution
      const flowResult = await FlowExecutionEngine.startFlowExecution(
        activeFlow.id,
        callData.CallSid,
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

    // Use call router to select best buyer (fallback when no active flow)
    console.log('[Webhook] Starting buyer selection for campaign ID:', campaign.id);
    const routingResult = await CallRouter.selectBuyer(campaign.id, callData.From);
    console.log('[Webhook] Routing result:', routingResult);
    
    if (!routingResult.selectedBuyer) {
      console.log('[Webhook] No available buyers:', routingResult.reason);
      
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

    // Create call record
    console.log('[Webhook] Creating call record...');
    const callRecord = await storage.createCall({
      campaignId: campaign.id,
      buyerId: selectedBuyer.id,
      callSid: callData.CallSid,
      fromNumber: callData.From,
      toNumber: callData.To,
      status: 'ringing',
      duration: 0,
      cost: '0.0000',
      revenue: '0.0000',
    });
    console.log('[Webhook] Call record created:', callRecord.id);

    // Log routing decision
    console.log('[Webhook] Creating call log...');
    await storage.createCallLog({
      callId: callRecord.id,
      buyerId: selectedBuyer.id,
      action: 'route',
      response: `Routed to ${selectedBuyer.name} (Priority: ${selectedBuyer.priority})`,
    });
    console.log('[Webhook] Call log created');

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
    res.json({ success: true });

  } catch (error) {
    console.error('[Webhook] Error handling call status:', error);
    res.status(500).json({ error: 'Internal server error' });
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