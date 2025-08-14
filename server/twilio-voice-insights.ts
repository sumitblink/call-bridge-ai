import twilio from 'twilio';

/**
 * Twilio Voice Insights service for fetching detailed call analytics
 * Provides "Who Hung Up" data and other Voice Insights properties
 */
export class TwilioVoiceInsightsService {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  /**
   * Fetch Voice Insights Call Summary for a specific call
   * @param callSid - Twilio Call SID
   * @returns Call summary with detailed insights
   */
  async getCallSummary(callSid: string) {
    try {
      console.log(`[Voice Insights] Fetching call summary for ${callSid}`);
      
      const summary = await this.client.insights.v1
        .calls(callSid)
        .summary()
        .fetch();

      console.log(`[Voice Insights] Successfully fetched summary for ${callSid}`);
      return summary;
    } catch (error: any) {
      console.error(`[Voice Insights] Error fetching call summary for ${callSid}:`, error.message);
      
      // Check if this is a "not found" error or requires Advanced Features
      if (error.status === 404) {
        console.log(`[Voice Insights] Call ${callSid} not found in Voice Insights (call may be too old or not eligible)`);
      } else if (error.status === 401) {
        console.log(`[Voice Insights] Voice Insights Advanced Features required for account`);
      }
      
      return null;
    }
  }

  /**
   * Extract "Who Hung Up" information from Voice Insights Call Summary
   * @param summary - Twilio Voice Insights Call Summary
   * @returns Object with who hung up and hangup cause data
   */
  extractHangupInfo(summary: any) {
    try {
      // Extract "who hung up" from properties.disconnected_by
      const disconnectedBy = summary.properties?.disconnected_by;
      
      // Extract hangup cause from various sources
      let hangupCause = null;
      
      // Check carrier edge for Q.850 cause codes
      if (summary.carrierEdge?.properties?.q850_cause) {
        hangupCause = `Q850-${summary.carrierEdge.properties.q850_cause}`;
      }
      
      // Check SIP edge for Q.850 cause codes
      if (!hangupCause && summary.sipEdge?.properties?.q850_cause) {
        hangupCause = `Q850-${summary.sipEdge.properties.q850_cause}`;
      }
      
      // Map Twilio's disconnected_by values to our format
      let whoHungUp = null;
      switch (disconnectedBy) {
        case 'caller':
          whoHungUp = 'caller';
          break;
        case 'callee':
          whoHungUp = 'callee';
          break;
        case 'unknown':
          whoHungUp = 'unknown';
          break;
        default:
          whoHungUp = disconnectedBy || 'unknown';
      }

      // If we don't have hangup cause from Q.850, use call state
      if (!hangupCause) {
        const callState = summary.callState;
        switch (callState) {
          case 'completed':
            hangupCause = 'normal_completion';
            break;
          case 'busy':
            hangupCause = 'busy';
            break;
          case 'noanswer':
            hangupCause = 'no_answer';
            break;
          case 'failed':
            hangupCause = 'failed';
            break;
          case 'canceled':
            hangupCause = 'canceled';
            break;
          default:
            hangupCause = callState || 'unknown';
        }
      }

      return {
        whoHungUp,
        hangupCause,
        disconnectedBy,
        callState: summary.callState,
        answeredBy: summary.answeredBy,
        processingState: summary.processingState
      };
    } catch (error: any) {
      console.error('[Voice Insights] Error extracting hangup info:', error.message);
      return {
        whoHungUp: 'unknown',
        hangupCause: 'extraction_error',
        disconnectedBy: null,
        callState: null,
        answeredBy: null,
        processingState: null
      };
    }
  }

  /**
   * Update call record with Voice Insights data
   * @param callSid - Twilio Call SID
   * @param callId - Internal call ID
   * @returns Updated hangup information
   */
  async updateCallWithVoiceInsights(callSid: string, callId: number) {
    try {
      console.log(`[Voice Insights] Updating call ${callId} with Voice Insights data`);
      
      // Fetch Voice Insights summary
      const summary = await this.getCallSummary(callSid);
      if (!summary) {
        console.log(`[Voice Insights] No summary available for call ${callId}`);
        return null;
      }

      // Extract hangup information
      const hangupInfo = this.extractHangupInfo(summary);
      
      console.log(`[Voice Insights] Call ${callId} hangup info:`, {
        whoHungUp: hangupInfo.whoHungUp,
        hangupCause: hangupInfo.hangupCause,
        callState: hangupInfo.callState
      });

      return hangupInfo;
    } catch (error: any) {
      console.error(`[Voice Insights] Error updating call ${callId}:`, error.message);
      return null;
    }
  }

  /**
   * Extract additional quality metrics from Voice Insights
   * @param summary - Voice Insights Call Summary
   * @returns Quality metrics object
   */
  extractQualityMetrics(summary: any) {
    try {
      const metrics: any = {
        postDialDelay: summary.properties?.pdd_ms || null,
        lastSipResponse: summary.properties?.last_sip_response_num || null,
        direction: summary.properties?.direction || null,
        queueTime: summary.properties?.queue_time || null,
        tags: summary.tags || [],
        callType: summary.callType || null,
        duration: summary.duration || null,
        connectDuration: summary.connectDuration || null
      };

      // Extract audio quality indicators
      if (summary.sdkEdge?.metrics) {
        const sdkMetrics = summary.sdkEdge.metrics;
        
        // MOS (Mean Opinion Score) for call quality
        if (sdkMetrics.inbound?.mos) {
          metrics.mosScore = sdkMetrics.inbound.mos.average || null;
        }
        
        // Packet loss percentage
        if (sdkMetrics.inbound?.packets_loss_percentage) {
          metrics.packetLoss = sdkMetrics.inbound.packets_loss_percentage;
        }
        
        // Jitter information
        if (sdkMetrics.inbound?.jitter) {
          metrics.jitter = sdkMetrics.inbound.jitter.average || null;
        }
        
        // RTT (Round Trip Time)
        if (sdkMetrics.inbound?.rtt) {
          metrics.rtt = sdkMetrics.inbound.rtt.average || null;
        }
      }

      return metrics;
    } catch (error: any) {
      console.error('[Voice Insights] Error extracting quality metrics:', error.message);
      return {};
    }
  }
}

// Export singleton instance
export const twilioVoiceInsights = new TwilioVoiceInsightsService();