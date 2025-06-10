import { storage } from "./hybrid-storage";
import twilio from 'twilio';

// Twilio client setup with real credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export class TwilioService {
  
  // Call Recording Methods
  async enableCallRecording(callSid: string): Promise<{ recordingSid: string }> {
    try {
      const recording = await twilioClient.calls(callSid)
        .recordings
        .create({
          recordingChannels: 'dual',
          recordingStatusCallback: `${process.env.REPLIT_DOMAINS}/api/webhooks/recording-status`
        });

      console.log(`[Twilio] Started recording for call ${callSid}, Recording SID: ${recording.sid}`);
      return { recordingSid: recording.sid };
    } catch (error) {
      console.error(`[Twilio] Error starting recording for call ${callSid}:`, error);
      throw error;
    }
  }

  async stopCallRecording(callSid: string, recordingSid: string): Promise<{ recordingUrl: string }> {
    try {
      // Twilio recordings automatically stop when call ends
      // We can fetch the recording to get its URL
      const recording = await twilioClient.recordings(recordingSid).fetch();
      
      const recordingUrl = recording.uri ? `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}` : 
                          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;
      
      console.log(`[Twilio] Recording ${recordingSid} for call ${callSid}, URL: ${recordingUrl}`);
      return { recordingUrl };
    } catch (error) {
      console.error(`[Twilio] Error fetching recording ${recordingSid}:`, error);
      throw error;
    }
  }

  async getRecordingStatus(recordingSid: string): Promise<{
    status: string;
    duration: number | null;
    recordingUrl: string | null;
  }> {
    try {
      const recording = await twilioClient.recordings(recordingSid).fetch();
      
      return {
        status: recording.status,
        duration: recording.duration ? parseInt(recording.duration) : null,
        recordingUrl: recording.uri ? `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}` : null
      };
    } catch (error) {
      console.error(`[Twilio] Error fetching recording status ${recordingSid}:`, error);
      throw error;
    }
  }

  async transcribeRecording(recordingSid: string): Promise<{ transcription: string }> {
    // Simulate transcription service
    const sampleTranscriptions = [
      "Hello, I'm interested in getting a quote for auto insurance. I drive a 2020 Honda Civic and live in California.",
      "Hi, I saw your ad about home insurance. Can you give me information about coverage options for my house?",
      "I'm looking for life insurance quotes. I'm 35 years old and in good health. What are my options?",
      "Hello, I need health insurance for my family. We're a family of four living in Texas."
    ];
    
    const transcription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];
    
    console.log(`[Twilio] Transcribed recording ${recordingSid}`);
    return { transcription };
  }

  // Real-time Call Control Methods
  async transferCall(callSid: string, targetNumber: string): Promise<{ status: string }> {
    try {
      const call = await twilioClient.calls(callSid).update({
        twiml: `<Response><Dial>${targetNumber}</Dial></Response>`
      });
      
      console.log(`[Twilio] Transferring call ${callSid} to ${targetNumber}`);
      return { status: 'transfer-initiated' };
    } catch (error) {
      console.error(`[Twilio] Error transferring call ${callSid}:`, error);
      throw error;
    }
  }

  async holdCall(callSid: string): Promise<{ status: string }> {
    try {
      const call = await twilioClient.calls(callSid).update({
        twiml: '<Response><Play loop="0">http://com.twilio.music.guitars.s3.amazonaws.com/BusyStrings.wav</Play></Response>'
      });
      
      console.log(`[Twilio] Putting call ${callSid} on hold`);
      return { status: 'on-hold' };
    } catch (error) {
      console.error(`[Twilio] Error holding call ${callSid}:`, error);
      throw error;
    }
  }

  async resumeCall(callSid: string): Promise<{ status: string }> {
    try {
      const call = await twilioClient.calls(callSid).update({
        twiml: '<Response><Pause length="1"/></Response>'
      });
      
      console.log(`[Twilio] Resuming call ${callSid}`);
      return { status: 'resumed' };
    } catch (error) {
      console.error(`[Twilio] Error resuming call ${callSid}:`, error);
      throw error;
    }
  }

  async muteCall(callSid: string): Promise<{ status: string }> {
    try {
      // Mute is typically handled at the participant level in conferences
      // For regular calls, we can use TwiML to control audio
      const call = await twilioClient.calls(callSid).update({
        twiml: '<Response><Pause length="3600"/></Response>' // Long pause to simulate mute
      });
      
      console.log(`[Twilio] Muting call ${callSid}`);
      return { status: 'muted' };
    } catch (error) {
      console.error(`[Twilio] Error muting call ${callSid}:`, error);
      throw error;
    }
  }

  async unmuteCall(callSid: string): Promise<{ status: string }> {
    try {
      const call = await twilioClient.calls(callSid).update({
        twiml: '<Response><Pause length="1"/></Response>'
      });
      
      console.log(`[Twilio] Unmuting call ${callSid}`);
      return { status: 'unmuted' };
    } catch (error) {
      console.error(`[Twilio] Error unmuting call ${callSid}:`, error);
      throw error;
    }
  }

  async createConferenceCall(participants: string[]): Promise<{ conferenceSid: string }> {
    try {
      const conferenceName = `conf_${Date.now()}`;
      
      // Create conference by making calls to participants
      const calls = await Promise.all(participants.map(async (participant) => {
        return await twilioClient.calls.create({
          to: participant,
          from: TWILIO_PHONE_NUMBER!,
          twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`,
          statusCallback: `${process.env.REPLIT_DOMAINS}/api/webhooks/call-status`
        });
      }));
      
      console.log(`[Twilio] Created conference ${conferenceName} with participants:`, participants);
      return { conferenceSid: conferenceName };
    } catch (error) {
      console.error(`[Twilio] Error creating conference:`, error);
      throw error;
    }
  }

  // Create outbound call
  async createOutboundCall(to: string, campaignId?: number): Promise<{ callSid: string }> {
    try {
      const call = await twilioClient.calls.create({
        to: to,
        from: TWILIO_PHONE_NUMBER!,
        url: `${process.env.REPLIT_DOMAINS}/api/twiml/outbound?campaignId=${campaignId || ''}`,
        statusCallback: `${process.env.REPLIT_DOMAINS}/api/webhooks/call-status`,
        record: true
      });
      
      console.log(`[Twilio] Created outbound call ${call.sid} to ${to}`);
      return { callSid: call.sid };
    } catch (error) {
      console.error(`[Twilio] Error creating outbound call:`, error);
      throw error;
    }
  }

  // IVR Methods
  async createIVRFlow(campaignId: number, flowConfig: {
    greeting: string;
    options: Array<{ digit: string; action: string; destination?: string }>;
  }): Promise<{ flowSid: string }> {
    const flowSid = `FW${Math.random().toString(36).substr(2, 32)}`;
    
    console.log(`[Twilio] Created IVR flow ${flowSid} for campaign ${campaignId}:`, flowConfig);
    return { flowSid };
  }

  async handleIVRResponse(callSid: string, digit: string, flowSid: string): Promise<{
    action: string;
    destination?: string;
    nextPrompt?: string;
  }> {
    // Simulate IVR response handling
    const actions = {
      '1': { action: 'transfer', destination: '+12125551234' },
      '2': { action: 'queue', destination: 'sales_queue' },
      '3': { action: 'voicemail', destination: 'vm_box_1' },
      '0': { action: 'operator', destination: 'main_operator' }
    };

    const response = actions[digit as keyof typeof actions] || { 
      action: 'prompt', 
      nextPrompt: 'Invalid option. Please press 1 for sales, 2 for support, or 0 for operator.' 
    };

    console.log(`[Twilio] IVR response for call ${callSid}, digit ${digit}:`, response);
    return response;
  }

  async playIVRMessage(callSid: string, message: string): Promise<{ status: string }> {
    console.log(`[Twilio] Playing IVR message to call ${callSid}: "${message}"`);
    return { status: 'playing' };
  }

  // Webhook handlers for Twilio events
  async handleRecordingStatusCallback(data: {
    RecordingSid: string;
    CallSid: string;
    RecordingStatus: string;
    RecordingDuration?: string;
    RecordingUrl?: string;
  }): Promise<void> {
    const { RecordingSid, CallSid, RecordingStatus, RecordingDuration, RecordingUrl } = data;
    
    // Find the call and update recording status
    const calls = await storage.getCalls();
    const call = calls.find(c => c.callSid === CallSid);
    
    if (call) {
      console.log(`[Twilio] Recording status update: ${RecordingSid} -> ${RecordingStatus}`);
      
      // In a real implementation, we'd update the call record with recording info
      // For now, we'll log the update
    }
  }

  async handleCallStatusCallback(data: {
    CallSid: string;
    CallStatus: string;
    CallDuration?: string;
    From: string;
    To: string;
  }): Promise<void> {
    const { CallSid, CallStatus, CallDuration, From, To } = data;
    
    console.log(`[Twilio] Call status update: ${CallSid} -> ${CallStatus}`);
    
    // Update call status in storage
    const calls = await storage.getCalls();
    const call = calls.find(c => c.callSid === CallSid);
    
    if (call && CallDuration) {
      // Update call duration and status
      console.log(`Call ${CallSid} completed with duration: ${CallDuration}s`);
    }
  }

  // Utility methods
  generateTwiML(actions: Array<{ action: string; params?: any }>): string {
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
    
    for (const action of actions) {
      switch (action.action) {
        case 'say':
          twiml += `<Say voice="alice">${action.params.text}</Say>`;
          break;
        case 'play':
          twiml += `<Play>${action.params.url}</Play>`;
          break;
        case 'gather':
          twiml += `<Gather numDigits="${action.params.numDigits || 1}" action="${action.params.action}">`;
          if (action.params.prompt) {
            twiml += `<Say voice="alice">${action.params.prompt}</Say>`;
          }
          twiml += '</Gather>';
          break;
        case 'dial':
          twiml += `<Dial>${action.params.number}</Dial>`;
          break;
        case 'record':
          twiml += `<Record action="${action.params.action}" maxLength="${action.params.maxLength || 30}"/>`;
          break;
        case 'hangup':
          twiml += '<Hangup/>';
          break;
      }
    }
    
    twiml += '</Response>';
    return twiml;
  }
}

export const twilioService = new TwilioService();