/**
 * Working DNI Code for External Websites
 * Copy this code to your website to enable dynamic number insertion
 */

(function() {
  'use strict';
  
  // DNI Configuration - Update these values for your setup
  var DNI_CONFIG = {
    tagCode: 'kfc_tracking_tag',           // Your tracking tag code
    apiUrl: 'http://localhost:5000/api/dni/track',  // Update this to your domain
    timeout: 8000,
    debug: true  // Set to false in production
  };
  
  var DNI = {
    init: function() {
      if (this.debug('DNI System starting...')) {
        this.debug('Looking for elements with class "tracking-number" or attribute "data-tracking-number"');
      }
      
      // Replace numbers immediately when page loads
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this.replaceNumbers.bind(this));
      } else {
        this.replaceNumbers();
      }
    },
    
    replaceNumbers: function() {
      var elements = document.querySelectorAll('.tracking-number, [data-tracking-number]');
      this.debug('Found ' + elements.length + ' elements to replace');
      
      if (elements.length === 0) {
        this.debug('No tracking elements found. Add class="tracking-number" to phone number elements.');
        return;
      }
      
      var self = this;
      this.getTrackingNumber(function(response) {
        if (response && response.success && response.formattedNumber) {
          // Success - replace all phone numbers
          for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            element.textContent = response.formattedNumber;
            
            // Update tel: links
            if (element.tagName === 'A' && element.href.indexOf('tel:') === 0) {
              element.href = 'tel:' + response.phoneNumber;
            }
          }
          
          self.debug('✓ Successfully replaced ' + elements.length + ' numbers with: ' + response.formattedNumber);
          self.debug('Campaign: ' + response.campaignName + ' (ID: ' + response.campaignId + ')');
          
        } else {
          var error = response ? response.error : 'No response received';
          self.debug('✗ DNI Error: ' + error);
          console.error('DNI failed:', response);
        }
      });
    },
    
    getTrackingNumber: function(callback) {
      var requestData = {
        tagCode: DNI_CONFIG.tagCode,
        sessionId: this.getSessionId(),
        domain: window.location.hostname,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      };
      
      // Capture UTM parameters from URL
      var urlParams = new URLSearchParams(window.location.search);
      requestData.utmSource = urlParams.get('utm_source');
      requestData.utmMedium = urlParams.get('utm_medium');
      requestData.utmCampaign = urlParams.get('utm_campaign');
      requestData.utmContent = urlParams.get('utm_content');
      requestData.utmTerm = urlParams.get('utm_term');
      
      this.debug('Making API request to: ' + DNI_CONFIG.apiUrl);
      this.debug('Request data: ' + JSON.stringify(requestData, null, 2));
      
      var self = this;
      
      // Create timeout promise
      var timeoutPromise = new Promise(function(_, reject) {
        setTimeout(function() {
          reject(new Error('Request timeout after ' + DNI_CONFIG.timeout + 'ms'));
        }, DNI_CONFIG.timeout);
      });
      
      // Create fetch promise
      var fetchPromise = fetch(DNI_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        mode: 'cors'
      })
      .then(function(response) {
        self.debug('Response status: ' + response.status);
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        return response.json();
      });
      
      // Race between fetch and timeout
      Promise.race([fetchPromise, timeoutPromise])
        .then(function(data) {
          self.debug('Response: ' + JSON.stringify(data, null, 2));
          callback(data);
        })
        .catch(function(error) {
          self.debug('Request failed: ' + error.message);
          callback({ success: false, error: error.message });
        });
    },
    
    getSessionId: function() {
      var sessionId = sessionStorage.getItem('dni_session_id');
      if (!sessionId) {
        sessionId = 'dni_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('dni_session_id', sessionId);
        this.debug('Created new session: ' + sessionId);
      }
      return sessionId;
    },
    
    debug: function(message) {
      if (DNI_CONFIG.debug) {
        console.log('DNI: ' + message);
        return true;
      }
      return false;
    }
  };
  
  // Start DNI system
  DNI.init();
  
  // Expose for debugging
  if (DNI_CONFIG.debug) {
    window.DNI = DNI;
  }
})();

/*
USAGE INSTRUCTIONS:

1. Add this script to your website before the closing </body> tag
2. Update DNI_CONFIG.apiUrl to point to your server
3. Update DNI_CONFIG.tagCode to match your tracking tag
4. Add class="tracking-number" to phone number elements you want to replace

Example HTML:
<p>Call us: <span class="tracking-number">(555) 123-4567</span></p>
<a href="tel:+15551234567" class="tracking-number">(555) 123-4567</a>

The script will automatically replace these with campaign-specific tracking numbers.
*/