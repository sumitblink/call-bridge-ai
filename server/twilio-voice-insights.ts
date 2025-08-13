// Twilio Voice Insights Call Summary API Integration
import fetch from 'node-fetch';

export class TwilioVoiceInsights {
  private accountSid: string;
  private authToken: string;
  private baseUrl: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.baseUrl = `https://insights.twilio.com/v1/Voice`;
    
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not found in environment');
    }
  }

  /**
   * Fetch Call Summary from Twilio Voice Insights
   * This provides detailed "who hung up" information and call quality metrics
   */
  async getCallSummary(callSid: string): Promise<any> {
    try {
      console.log(`🔍 Fetching Voice Insights for call: ${callSid}`);
      
      const url = `${this.baseUrl}/${this.accountSid}/Calls/${callSid}/Summary`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Voice Insights API error: ${response.status} - ${errorText}`);
        return null;
      }

      const callSummary = await response.json();
      console.log(`✅ Voice Insights data retrieved for ${callSid}`);
      
      return this.parseCallSummary(callSummary);
      
    } catch (error) {
      console.error(`💥 Voice Insights API error:`, error);
      return null;
    }
  }

  /**
   * Parse Call Summary response to extract key hangup and quality data
   */
  private parseCallSummary(summary: any): any {
    const parsed = {
      whoHungUp: null,
      lastSipResponse: null,
      callState: null,
      silenceDetected: false,
      packetLossDetected: false,
      jitterDetected: false,
      postDialDelay: null,
      twilioRtpLatency: null,
      // Connection details
      fromConnection: null,
      toConnection: null,
      // Quality metrics
      codecUsed: null,
      packetLossPercentage: null,
      averageJitter: null,
      maxJitter: null,
      mosScore: null,
      roundTripTime: null
    };

    try {
      // Extract core properties
      if (summary.properties) {
        parsed.whoHungUp = summary.properties.who_hung_up || summary.properties.whoHungUp;
        parsed.lastSipResponse = summary.properties.last_sip_response || summary.properties.lastSipResponse;
        parsed.callState = summary.properties.call_state || summary.properties.callState;
        parsed.silenceDetected = summary.properties.silence_detected || false;
        parsed.postDialDelay = summary.properties.post_dial_delay || summary.properties.postDialDelay;
        parsed.twilioRtpLatency = summary.properties.twilio_rtp_latency || summary.properties.twilioRtpLatency;
      }

      // Extract connection info from edges
      if (summary.edges && summary.edges.length > 0) {
        summary.edges.forEach((edge: any) => {
          if (edge.from && edge.from.connection) {
            parsed.fromConnection = edge.from.connection;
          }
          if (edge.to && edge.to.connection) {
            parsed.toConnection = edge.to.connection;
          }
        });
      }

      // Extract quality metrics
      if (summary.metrics && summary.metrics.length > 0) {
        summary.metrics.forEach((metric: any) => {
          if (metric.codec) parsed.codecUsed = metric.codec;
          if (metric.packet_loss_detected) {
            parsed.packetLossDetected = true;
            parsed.packetLossPercentage = metric.packet_loss_percentage;
          }
          if (metric.jitter_detected) {
            parsed.jitterDetected = true;
            parsed.averageJitter = metric.average_jitter;
            parsed.maxJitter = metric.max_jitter;
          }
          if (metric.mos_score) parsed.mosScore = metric.mos_score;
          if (metric.round_trip_time) parsed.roundTripTime = metric.round_trip_time;
        });
      }

      console.log(`📊 Parsed Voice Insights - Who Hung Up: ${parsed.whoHungUp}`);
      return parsed;
      
    } catch (error) {
      console.error(`💥 Error parsing call summary:`, error);
      return parsed;
    }
  }

  /**
   * Get enhanced hangup information with human-readable descriptions
   */
  getHangupDescription(whoHungUp: string): string {
    switch (whoHungUp?.toLowerCase()) {
      case 'caller':
        return 'Caller hung up';
      case 'callee':
        return 'Callee hung up';
      case 'twilio':
        return 'Twilio terminated call';
      case 'carrier':
        return 'Carrier terminated call';
      case 'unknown':
        return 'Unknown termination';
      default:
        return whoHungUp || 'Not determined';
    }
  }

  /**
   * Get call quality assessment based on metrics
   */
  getCallQualityAssessment(insights: any): string {
    const issues = [];
    
    if (insights.silenceDetected) issues.push('silence detected');
    if (insights.packetLossDetected) issues.push(`packet loss (${insights.packetLossPercentage}%)`);
    if (insights.jitterDetected) issues.push(`jitter (avg: ${insights.averageJitter}ms)`);
    if (insights.mosScore && insights.mosScore < 3.5) issues.push(`low MOS score (${insights.mosScore})`);
    
    if (issues.length === 0) return 'Good quality';
    return `Quality issues: ${issues.join(', ')}`;
  }
}