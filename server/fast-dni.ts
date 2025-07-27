// Ultra-Fast DNI Service - Sub-50ms response times
// Optimized for instant phone number replacement without delays

import { db } from './db';
import { sql } from 'drizzle-orm';

// In-memory cache for campaign data
const campaignCache = new Map<string, any>();
const cacheExpiry = new Map<string, number>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export class FastDNI {
  
  static async getPhoneNumber(campaignId: string): Promise<{ phoneNumber: string; success: boolean; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = `campaign_${campaignId}`;
      const cached = campaignCache.get(cacheKey);
      const expiry = cacheExpiry.get(cacheKey);
      
      if (cached && expiry && Date.now() < expiry) {
        const responseTime = Date.now() - startTime;
        console.log(`⚡ CACHED DNI Response: ${cached.phoneNumber} in ${responseTime}ms`);
        return { phoneNumber: cached.phoneNumber, success: true };
      }
      
      // Single optimized query for campaign and pool numbers
      const result = await db.execute(sql`
        SELECT 
          c.id as campaign_id,
          c.name as campaign_name,
          c.routing_type,
          c.phone_number as direct_phone,
          c.pool_id,
          p.phone_number as pool_phone
        FROM campaigns c
        LEFT JOIN number_pool_assignments npa ON npa.pool_id = c.pool_id
        LEFT JOIN phone_numbers p ON p.id = npa.phone_number_id AND p.is_active = true
        WHERE c.id = ${campaignId}
        LIMIT 10
      `);

      if (result.rows.length === 0) {
        return { phoneNumber: '', success: false, error: 'Campaign not found' };
      }

      const campaignData = result.rows[0] as any;
      let selectedPhone: string;

      // Fast phone selection
      if (campaignData.routing_type === 'pool') {
        const poolPhones = result.rows
          .map(r => (r as any).pool_phone)
          .filter(Boolean);
        
        if (poolPhones.length > 0) {
          const randomIndex = Math.floor(Math.random() * poolPhones.length);
          selectedPhone = poolPhones[randomIndex];
        } else {
          selectedPhone = campaignData.direct_phone;
        }
      } else {
        selectedPhone = campaignData.direct_phone;
      }

      if (!selectedPhone) {
        return { phoneNumber: '', success: false, error: 'No phone numbers available' };
      }

      // Cache the result
      const cacheData = { phoneNumber: selectedPhone };
      campaignCache.set(cacheKey, cacheData);
      cacheExpiry.set(cacheKey, Date.now() + CACHE_TTL);

      const responseTime = Date.now() - startTime;
      console.log(`⚡ FAST DNI Response: ${selectedPhone} in ${responseTime}ms`);

      return { phoneNumber: selectedPhone, success: true };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ FAST DNI Error in ${responseTime}ms:`, error);
      return { phoneNumber: '', success: false, error: 'Database error' };
    }
  }

  static formatPhoneNumber(phone: string): string {
    // Simple phone formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const formatted = cleaned.substring(1);
      return `(${formatted.substring(0, 3)}) ${formatted.substring(3, 6)}-${formatted.substring(6)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  }
}