// Enhanced Twilio Webhook Handlers for Complete Call Attribution
import { HybridStorage } from './hybrid-storage.js';
import { TwilioVoiceInsights } from './twilio-voice-insights.js';

export class WebhookHandlers {
  private storage: HybridStorage;
  private voiceInsights: TwilioVoiceInsights;

  constructor(storage: HybridStorage) {
    this.storage = storage;
    this.voiceInsights = new TwilioVoiceInsights();
  }

  /**
   * Enhanced Call Status Webhook Handler
   * Captures all call lifecycle events with proper attribution
   */
  async handleCallStatusUpdate(webhookData: any): Promise<any> {
    console.log(`\n🔔 === TWILIO WEBHOOK: ${webhookData.CallStatus} ===`);
    console.log(`📞 Call SID: ${webhookData.CallSid}`);
    console.log(`📊 Status: ${webhookData.CallStatus}`);
    console.log(`⏱️ Duration: ${webhookData.CallDuration || 0}s`);

    try {
      // Find existing call record
      const calls = await this.storage.getCalls();
      const existingCall = calls.find(c => c.callSid === webhookData.CallSid);

      if (!existingCall) {
        console.log(`⚠️ Call not found in database: ${webhookData.CallSid}`);
        return { success: false, error: 'Call not found' };
      }

      console.log(`✅ Found call record ID: ${existingCall.id}`);

      // Prepare update data with comprehensive information
      const updateData: any = {
        status: this.mapTwilioStatus(webhookData.CallStatus),
        duration: parseInt(webhookData.CallDuration || '0'),
        hangupCause: webhookData.CallStatus === 'completed' ? 'completed' : webhookData.CallStatus,
        updatedAt: new Date()
      };

      // Add call quality and technical data
      if (webhookData.CallDuration) {
        updateData.callQuality = this.determineCallQuality(parseInt(webhookData.CallDuration));
      }

      // Capture hangup reasons for failed calls
      if (['busy', 'no-answer', 'failed', 'canceled'].includes(webhookData.CallStatus)) {
        updateData.hangupCause = webhookData.CallStatus;
        updateData.disposition = 'no_connection';
      } else if (webhookData.CallStatus === 'completed') {
        const duration = parseInt(webhookData.CallDuration || '0');
        updateData.disposition = duration >= 30 ? 'connected' : 'short_call';
      }

      // Update call costs (Twilio pricing)
      if (webhookData.CallDuration) {
        const durationMinutes = Math.ceil(parseInt(webhookData.CallDuration) / 60);
        updateData.cost = (durationMinutes * 0.0085).toFixed(4); // $0.0085/minute for US calls
      }

      // Assign revenue from RTB winning bid if available
      if (existingCall.targetId) {
        const rtbDetails = await this.storage.getRTBAuctionDetails(existingCall.id);
        if (rtbDetails.length > 0) {
          const winner = rtbDetails.find(r => r.isWinner);
          if (winner) {
            updateData.revenue = parseFloat(winner.bidAmount);
            console.log(`💰 RTB Revenue assigned: $${winner.bidAmount}`);
          }
        }
      }

      // Get detailed hangup information from Voice Insights API
      if (webhookData.CallStatus === 'completed' || webhookData.CallStatus === 'no-answer' || webhookData.CallStatus === 'busy') {
        console.log(`🔍 Fetching Voice Insights for precise hangup data...`);
        
        // Delay slightly to ensure call summary is available
        setTimeout(async () => {
          const insights = await this.voiceInsights.getCallSummary(webhookData.CallSid);
          
          if (insights && insights.whoHungUp) {
            const enhancedUpdateData = {
              whoHungUp: insights.whoHungUp,
              hangupCause: this.voiceInsights.getHangupDescription(insights.whoHungUp),
              lastSipResponse: insights.lastSipResponse,
              callQuality: this.voiceInsights.getCallQualityAssessment(insights),
              silenceDetected: insights.silenceDetected,
              packetLoss: insights.packetLossDetected,
              jitterDetected: insights.jitterDetected,
              codecUsed: insights.codecUsed,
              updatedAt: new Date()
            };
            
            console.log(`📞 Voice Insights - Who Hung Up: ${insights.whoHungUp}`);
            console.log(`📊 Call Quality: ${enhancedUpdateData.callQuality}`);
            
            // Update call with Voice Insights data
            await this.storage.updateCallStatus(existingCall.id, enhancedUpdateData);
            console.log(`✅ Enhanced hangup data applied to call ${existingCall.id}`);
          } else {
            console.log(`⚠️ Voice Insights not available yet for ${webhookData.CallSid}`);
          }
        }, 5000); // Wait 5 seconds for call summary to be available
      }

      // Update the call record with initial webhook data
      await this.storage.updateCallStatus(existingCall.id, updateData);
      
      console.log(`✅ Call updated successfully`);
      console.log(`📊 Final Status: ${updateData.status}`);
      console.log(`💰 Revenue: $${updateData.revenue || 0}`);
      console.log(`💸 Cost: $${updateData.cost || 0}`);

      return { success: true, callId: existingCall.id, status: updateData.status };

    } catch (error) {
      console.error(`💥 Webhook error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recording Webhook Handler
   * Captures recording URLs and metadata
   */
  async handleRecordingComplete(webhookData: any): Promise<any> {
    console.log(`\n🎙️ === RECORDING COMPLETE ===`);
    console.log(`📞 Call SID: ${webhookData.CallSid}`);
    console.log(`🎵 Recording SID: ${webhookData.RecordingSid}`);

    try {
      const calls = await this.storage.getCalls();
      const call = calls.find(c => c.callSid === webhookData.CallSid);

      if (!call) {
        console.log(`⚠️ Call not found for recording: ${webhookData.CallSid}`);
        return { success: false, error: 'Call not found' };
      }

      const recordingData = {
        recordingSid: webhookData.RecordingSid,
        recordingUrl: webhookData.RecordingUrl,
        recordingStatus: webhookData.RecordingStatus || 'completed',
        recordingDuration: parseInt(webhookData.RecordingDuration || '0'),
        updatedAt: new Date()
      };

      await this.storage.updateCallStatus(call.id, recordingData);
      console.log(`✅ Recording data updated for call ${call.id}`);

      return { success: true, callId: call.id };

    } catch (error) {
      console.error(`💥 Recording webhook error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Map Twilio call statuses to our internal statuses
   */
  private mapTwilioStatus(twilioStatus: string): string {
    const statusMap: { [key: string]: string } = {
      'queued': 'queued',
      'ringing': 'ringing', 
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'canceled'
    };

    return statusMap[twilioStatus] || twilioStatus;
  }

  /**
   * Determine call quality based on duration
   */
  private determineCallQuality(duration: number): string {
    if (duration >= 300) return 'excellent';    // 5+ minutes
    if (duration >= 120) return 'good';         // 2+ minutes
    if (duration >= 30) return 'fair';          // 30+ seconds
    if (duration > 0) return 'poor';            // Less than 30s
    return 'failed';                            // No connection
  }

  /**
   * Session Attribution - Link calls to visitor sessions
   */
  async attributeCallToSession(callSid: string, phoneNumber: string): Promise<any> {
    console.log(`\n🔗 === SESSION ATTRIBUTION ===`);
    console.log(`📞 Call SID: ${callSid}`);
    console.log(`📱 Phone: ${phoneNumber}`);

    try {
      // Find active DNI session for this phone number
      const activeSessions = await this.storage.getActiveDNISessions(phoneNumber);
      
      if (activeSessions.length === 0) {
        console.log(`⚠️ No active session found for ${phoneNumber}`);
        return { success: false, reason: 'No active session' };
      }

      // Get the most recent session (LIFO - Last In, First Out)
      const session = activeSessions[0];
      console.log(`✅ Found session: ${session.sessionId}`);

      // Update call with session attribution data
      const calls = await this.storage.getCalls();
      const call = calls.find(c => c.callSid === callSid);
      
      if (!call) {
        console.log(`⚠️ Call not found: ${callSid}`);
        return { success: false, reason: 'Call not found' };
      }

      const attributionData = {
        sessionId: session.sessionId,
        clickId: session.clickId,
        utmSource: session.utmSource,
        utmCampaign: session.utmCampaign,
        utmMedium: session.utmMedium,
        utmTerm: session.utmTerm,
        utmContent: session.utmContent,
        referrer: session.referrer,
        geoLocation: session.geoLocation,
        userAgent: session.userAgent,
        updatedAt: new Date()
      };

      await this.storage.updateCallStatus(call.id, attributionData);
      console.log(`✅ Call attributed to session successfully`);
      console.log(`🆔 Click ID: ${session.clickId}`);
      console.log(`📊 UTM Source: ${session.utmSource}`);

      return { success: true, sessionId: session.sessionId, clickId: session.clickId };

    } catch (error) {
      console.error(`💥 Session attribution error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * RTB Revenue Assignment - Ensure winning bids become revenue
   */
  async assignRTBRevenue(callId: number): Promise<any> {
    console.log(`\n💰 === RTB REVENUE ASSIGNMENT ===`);
    console.log(`📞 Call ID: ${callId}`);

    try {
      // Get RTB auction details for this call
      const auctionDetails = await this.storage.getRTBAuctionDetails(callId);
      
      if (auctionDetails.length === 0) {
        console.log(`⚠️ No RTB auction found for call ${callId}`);
        return { success: false, reason: 'No RTB auction' };
      }

      // Find the winning bid
      const winner = auctionDetails.find(detail => detail.isWinner);
      
      if (!winner) {
        console.log(`⚠️ No winning bid found for call ${callId}`);
        return { success: false, reason: 'No winning bid' };
      }

      const revenue = parseFloat(winner.bidAmount);
      console.log(`💰 Winner: ${winner.targetName} - $${revenue}`);

      // Update call with revenue
      await this.storage.updateCallStatus(callId, {
        revenue: revenue,
        targetId: winner.targetId,
        updatedAt: new Date()
      });

      console.log(`✅ RTB revenue assigned: $${revenue}`);
      return { success: true, revenue, targetName: winner.targetName };

    } catch (error) {
      console.error(`💥 RTB revenue assignment error:`, error);
      return { success: false, error: error.message };
    }
  }
}