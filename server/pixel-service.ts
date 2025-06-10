import fetch from 'node-fetch';

export interface PixelMacroData {
  call_id: string;
  campaign_id: string;
  phone_number: string;
  timestamp: string;
  caller_id?: string;
  duration?: string;
  status?: string;
  buyer_id?: string;
  agent_id?: string;
  recording_url?: string;
  custom_field_1?: string;
  custom_field_2?: string;
  custom_field_3?: string;
}

export interface PixelFireRequest {
  pixelId: number;
  event: 'call_start' | 'call_complete' | 'call_transfer';
  campaignId: number;
  macroData: PixelMacroData;
}

export class PixelService {
  /**
   * Replace macros in pixel code with actual data
   */
  static replaceMacros(code: string, macroData: PixelMacroData): string {
    let processedCode = code;

    // Replace all available macros
    const macroMap: Record<string, string> = {
      '{call_id}': macroData.call_id || '',
      '{campaign_id}': macroData.campaign_id || '',
      '{phone_number}': macroData.phone_number || '',
      '{timestamp}': macroData.timestamp || '',
      '{caller_id}': macroData.caller_id || '',
      '{duration}': macroData.duration || '',
      '{status}': macroData.status || '',
      '{buyer_id}': macroData.buyer_id || '',
      '{agent_id}': macroData.agent_id || '',
      '{recording_url}': macroData.recording_url || '',
      '{custom_field_1}': macroData.custom_field_1 || '',
      '{custom_field_2}': macroData.custom_field_2 || '',
      '{custom_field_3}': macroData.custom_field_3 || '',
    };

    // Replace each macro in the code
    Object.entries(macroMap).forEach(([macro, value]) => {
      processedCode = processedCode.replace(new RegExp(macro, 'g'), encodeURIComponent(value));
    });

    return processedCode;
  }

  /**
   * Fire a postback pixel by making HTTP request
   */
  static async firePostbackPixel(url: string): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      console.log(`Firing postback pixel: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Ringba-Pixel-Service/1.0',
        },
      });
      
      clearTimeout(timeoutId);

      const success = response.ok;
      const responseText = await response.text();

      return {
        success,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 500), // Limit response body
        },
      };
    } catch (error) {
      console.error('Postback pixel error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fire an image pixel by making HTTP request
   */
  static async fireImagePixel(url: string): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      console.log(`Firing image pixel: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for images
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Ringba-Pixel-Service/1.0',
          'Accept': 'image/*',
        },
      });
      
      clearTimeout(timeoutId);

      return {
        success: response.ok,
        response: {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
        },
      };
    } catch (error) {
      console.error('Image pixel error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute JavaScript pixel code
   */
  static executeJavaScriptPixel(code: string): { success: boolean; error?: string } {
    try {
      console.log(`Executing JavaScript pixel: ${code.substring(0, 100)}...`);
      
      // For security, we'll just log the JavaScript code
      // In a real implementation, you might use a sandboxed environment
      console.log('JavaScript pixel code would be executed client-side:', code);
      
      return { success: true };
    } catch (error) {
      console.error('JavaScript pixel error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fire a pixel based on its type
   */
  static async firePixel(
    pixelType: 'postback' | 'image' | 'javascript',
    processedCode: string
  ): Promise<{ success: boolean; response?: any; error?: string }>;
  
  /**
   * Fire a pixel using PixelFireRequest
   */
  static async firePixel(
    request: PixelFireRequest
  ): Promise<{ success: boolean; response?: any; error?: string }>;
  
  static async firePixel(
    pixelTypeOrRequest: 'postback' | 'image' | 'javascript' | PixelFireRequest,
    processedCode?: string
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    // Handle overloaded method signatures
    if (typeof pixelTypeOrRequest === 'object') {
      // PixelFireRequest format - this will be handled by the calling code
      // which needs to get the pixel details and call this method with pixelType and processedCode
      throw new Error('PixelFireRequest format should be handled by calling code');
    }

    const pixelType = pixelTypeOrRequest;
    if (!processedCode) {
      return {
        success: false,
        error: 'processedCode is required',
      };
    }

    switch (pixelType) {
      case 'postback':
        return await this.firePostbackPixel(processedCode);
      
      case 'image':
        return await this.fireImagePixel(processedCode);
      
      case 'javascript':
        return this.executeJavaScriptPixel(processedCode);
      
      default:
        return {
          success: false,
          error: `Unknown pixel type: ${pixelType}`,
        };
    }
  }

  /**
   * Extract URL from different pixel code formats
   */
  static extractUrlFromCode(code: string, pixelType: string): string {
    if (pixelType === 'postback') {
      // For postback, the code should be a direct URL
      return code.trim();
    }
    
    if (pixelType === 'image') {
      // Extract URL from image tag or return direct URL
      const imgMatch = code.match(/src=["']([^"']+)["']/i);
      if (imgMatch) {
        return imgMatch[1];
      }
      // If no img tag found, assume it's a direct URL
      return code.trim();
    }
    
    // For JavaScript, return the code as-is
    return code;
  }
}