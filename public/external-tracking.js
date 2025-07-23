(function() {
  'use strict';
  
  // CONFIGURATION - Replace with your server URL
  var TRACKING_SERVER = 'http://localhost:5000'; // Change this to your domain
  
  // Get campaign ID from script tag data attribute
  var scriptTag = document.querySelector('script[data-campaign]');
  if (!scriptTag) {
    console.error('CallCenter Pro: No campaign ID found. Add data-campaign attribute to script tag.');
    return;
  }
  
  var campaignId = scriptTag.getAttribute('data-campaign');
  
  // Generate unique session ID
  var sessionId = 'dni_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Capture URL parameters
  var urlParams = new URLSearchParams(window.location.search);
  var trackingData = {
    campaignId: campaignId,
    sessionId: sessionId,
    domain: window.location.hostname,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    // Standard UTM parameters
    utmSource: urlParams.get('utm_source'),
    utmMedium: urlParams.get('utm_medium'),
    utmCampaign: urlParams.get('utm_campaign'),
    utmContent: urlParams.get('utm_content'),
    utmTerm: urlParams.get('utm_term'),
    // Extended tracking parameters
    publisher: urlParams.get('publisher'),
    gclid: urlParams.get('gclid'),
    fbclid: urlParams.get('fbclid'),
    msclkid: urlParams.get('msclkid'),
    ttclid: urlParams.get('ttclid'),
    twclid: urlParams.get('twclid'),
    liclid: urlParams.get('liclid'),
    subid: urlParams.get('subid'),
    clickid: urlParams.get('clickid'),
    affid: urlParams.get('affid'),
    pubid: urlParams.get('pubid'),
    source: urlParams.get('source'),
    medium: urlParams.get('medium'),
    campaign: urlParams.get('campaign'),
    content: urlParams.get('content'),
    term: urlParams.get('term'),
    keyword: urlParams.get('keyword'),
    placement: urlParams.get('placement'),
    adgroup: urlParams.get('adgroup'),
    creative: urlParams.get('creative'),
    device: urlParams.get('device'),
    network: urlParams.get('network'),
    matchtype: urlParams.get('matchtype'),
    adposition: urlParams.get('adposition'),
    target: urlParams.get('target'),
    targetid: urlParams.get('targetid'),
    loc_physical_ms: urlParams.get('loc_physical_ms'),
    loc_interest_ms: urlParams.get('loc_interest_ms')
  };
  
  // Phone number patterns to detect
  var phonePatterns = [
    /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,  // US format
    /(\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,  // +1 format
    /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g  // Simple format
  ];
  
  // Function to detect and replace phone numbers
  function replacePhoneNumbers(trackingNumber, formattedNumber) {
    console.log('CallCenter Pro: Replacing phone numbers with', formattedNumber);
    
    // Find all text nodes in the document
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    var textNodes = [];
    var node;
    while (node = walker.nextNode()) {
      // Skip script and style elements
      if (node.parentNode.tagName === 'SCRIPT' || node.parentNode.tagName === 'STYLE') {
        continue;
      }
      textNodes.push(node);
    }
    
    var replacedCount = 0;
    
    // Replace phone numbers in text nodes
    textNodes.forEach(function(textNode) {
      var originalText = textNode.textContent;
      var newText = originalText;
      
      phonePatterns.forEach(function(pattern) {
        if (pattern.test(newText)) {
          newText = newText.replace(pattern, formattedNumber);
          replacedCount++;
        }
      });
      
      if (newText !== originalText) {
        textNode.textContent = newText;
      }
    });
    
    // Find and update phone number links
    var phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(function(link) {
      link.href = 'tel:' + trackingNumber.replace(/[^\d+]/g, '');
      if (link.textContent.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/)) {
        link.textContent = formattedNumber;
        replacedCount++;
      }
    });
    
    // Find elements with tracking classes/attributes
    var trackingElements = document.querySelectorAll('.tracking-number, [data-tracking-number]');
    trackingElements.forEach(function(element) {
      element.textContent = formattedNumber;
      if (element.tagName === 'A') {
        element.href = 'tel:' + trackingNumber.replace(/[^\d+]/g, '');
      }
      replacedCount++;
    });
    
    console.log('CallCenter Pro: Replaced', replacedCount, 'phone numbers');
  }
  
  // Make the tracking request
  function requestTrackingNumber() {
    console.log('CallCenter Pro: Requesting tracking number for campaign', campaignId);
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', TRACKING_SERVER + '/api/dni/track-simple', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            console.log('CallCenter Pro: Got tracking response:', response);
            if (response.phoneNumber && response.formattedNumber) {
              replacePhoneNumbers(response.phoneNumber, response.formattedNumber);
            } else {
              console.error('CallCenter Pro: No phone number in response');
            }
          } catch (e) {
            console.error('CallCenter Pro: Invalid response format', e);
          }
        } else {
          console.error('CallCenter Pro: Tracking request failed with status', xhr.status);
          console.error('CallCenter Pro: Response:', xhr.responseText);
        }
      }
    };
    
    xhr.send(JSON.stringify(trackingData));
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requestTrackingNumber);
  } else {
    requestTrackingNumber();
  }
  
})();