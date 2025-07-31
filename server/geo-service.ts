// Geographic Data Service
// IP-based geolocation lookup for Ringba-compliant geographic tokens

import geoip from 'geoip-lite';

export interface GeographicData {
  ipAddress: string;
  country: string;
  countryCode: string;
  region: string; // State/Province code (e.g., "NY", "CA")
  regionName: string; // Full state/province name (e.g., "New York", "California")
  city: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export class GeoService {
  /**
   * Get geographic data from IP address using geoip-lite
   * Returns Ringba-compliant geographic information
   */
  static getGeographicDataFromIP(ipAddress: string): GeographicData | null {
    try {
      // Handle local development IPs
      if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
        console.log(`[GeoService] Local IP detected (${ipAddress}), using default US location`);
        return {
          ipAddress: ipAddress || '127.0.0.1',
          country: 'United States',
          countryCode: 'US',
          region: 'NY', // Default to New York for testing
          regionName: 'New York',
          city: 'New York',
          zipCode: '10001',
          latitude: 40.7128,
          longitude: -74.0060,
          timezone: 'America/New_York'
        };
      }

      const geo = geoip.lookup(ipAddress);
      
      if (!geo) {
        console.log(`[GeoService] No geographic data found for IP: ${ipAddress}`);
        return null;
      }

      console.log(`[GeoService] Geographic lookup for ${ipAddress}:`, {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        ll: geo.ll
      });

      return {
        ipAddress,
        country: geo.country === 'US' ? 'United States' : geo.country,
        countryCode: geo.country,
        region: geo.region, // This is the state code (NY, CA, etc.)
        regionName: this.getFullStateName(geo.region), // Convert code to full name
        city: geo.city || 'Unknown',
        zipCode: geo.metro?.toString() || '00000', // geoip-lite doesn't provide ZIP, use metro code or default
        latitude: geo.ll?.[0] || 0,
        longitude: geo.ll?.[1] || 0,
        timezone: geo.timezone || 'America/New_York'
      };
    } catch (error) {
      console.error('[GeoService] Error looking up geographic data:', error);
      return null;
    }
  }

  /**
   * Convert US state code to full state name
   */
  private static getFullStateName(stateCode: string): string {
    const stateNames: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
    };

    return stateNames[stateCode] || stateCode;
  }

  /**
   * Generate Ringba-compliant geographic tokens for use in RTB requests
   */
  static generateRingbaTokens(geoData: GeographicData): Record<string, string> {
    return {
      // Number Pool geographic tokens (most common)
      '[tag:Geo:SubDivision]': geoData.regionName,
      '[tag:Geo:SubDivisionCode]': geoData.region,
      '[tag:Geo:City]': geoData.city,
      '[tag:Geo:ZipCode]': geoData.zipCode,
      '[tag:Technology:IPAddress]': geoData.ipAddress,
      
      // Alternative formats for compatibility
      '[tag:Address:State]': geoData.regionName,
      '[tag:Address:City]': geoData.city,
      '[tag:Address:Zip 5]': geoData.zipCode,
      
      // Additional geographic data
      '[tag:Geo:Country]': geoData.country,
      '[tag:Geo:CountryCode]': geoData.countryCode,
      '[tag:Geo:Latitude]': geoData.latitude.toString(),
      '[tag:Geo:Longitude]': geoData.longitude.toString(),
      '[tag:Geo:Timezone]': geoData.timezone
    };
  }
}