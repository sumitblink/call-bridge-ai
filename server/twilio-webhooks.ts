import { Request, Response } from 'express';
import { storage } from './storage';
import { CallRouter } from './call-routing';
import { twilioService } from './twilio-service';

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
    const callData: TwilioCallRequest = req.body;
    console.log('[Webhook] Incoming call:', callData);
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

    // Use call router to select best buyer
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
    await storage.createCall({
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

    // Log routing decision
    await storage.createCallLog({
      callId: 0, // Will be updated with actual call ID
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
    const statusCallbackUrl = `${req.protocol}://${req.get('host')}/api/webhooks/twilio/status`;
    
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Please hold while we connect you.</Say>
        <Dial timeout="30" record="record-from-answer" 
              recordingStatusCallback="${statusCallbackUrl}"
              action="${statusCallbackUrl}">
          <Number>${buyerNumber}</Number>
        </Dial>
      </Response>`);

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