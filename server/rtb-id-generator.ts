import { randomBytes } from 'crypto';
import { db } from './db';
import { campaigns } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * RTB ID Generation Service
 * Generates secure 32-character hexadecimal IDs for external RTB operations
 */
export class RTBIdGenerator {
  /**
   * Generate a secure 32-character hexadecimal RTB ID
   * @returns {string} 32-character hex string (e.g., 1c22a98c60a74cf38944c0cc77eb0t12)
   */
  static generateRTBId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generate a unique RTB ID that doesn't already exist in the database
   * @returns {Promise<string>} Unique RTB ID
   */
  static async generateUniqueRTBId(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const rtbId = this.generateRTBId();
      
      // Check if this ID already exists
      const existingCampaign = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.rtbId, rtbId))
        .limit(1);

      if (existingCampaign.length === 0) {
        return rtbId;
      }

      attempts++;
      console.log(`RTB ID collision detected (attempt ${attempts}/${maxAttempts}), generating new ID...`);
    }

    throw new Error('Failed to generate unique RTB ID after multiple attempts');
  }

  /**
   * Assign RTB ID to a campaign when RTB is enabled
   * @param {number} campaignId - Campaign ID to assign RTB ID to
   * @returns {Promise<string>} The assigned RTB ID
   */
  static async assignRTBIdToCampaign(campaignId: number): Promise<string> {
    const rtbId = await this.generateUniqueRTBId();
    
    await db
      .update(campaigns)
      .set({ rtbId })
      .where(eq(campaigns.id, campaignId));

    console.log(`Assigned RTB ID ${rtbId} to campaign ${campaignId}`);
    return rtbId;
  }

  /**
   * Get campaign by RTB ID for external lookups
   * @param {string} rtbId - RTB ID to lookup
   * @returns {Promise<any>} Campaign data or null if not found
   */
  static async getCampaignByRTBId(rtbId: string) {
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.rtbId, rtbId))
      .limit(1);

    return campaign[0] || null;
  }

  /**
   * Validate RTB ID format
   * @param {string} rtbId - RTB ID to validate
   * @returns {boolean} True if valid format
   */
  static isValidRTBId(rtbId: string): boolean {
    return /^[0-9a-f]{32}$/.test(rtbId);
  }
}