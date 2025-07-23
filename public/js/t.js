(function() {
  'use strict';
  
  // Get campaign ID from script tag data attribute
  var scriptTag = document.querySelector('script[data-campaign]');
  if (!scriptTag) {
    console.error('CallCenter Pro: No campaign ID found. Add data-campaign attribute to script tag.');
    return;
  }
  
  var campaignId = scriptTag.getAttribute('data-campaign');
  
  // Use the script's source domain as the API base URL (for external websites)
  var scriptSrc = scriptTag.src;
  var baseUrl;
  
  if (scriptSrc && scriptSrc.indexOf('http') === 0) {
    // Extract domain from script source URL
    var url = new URL(scriptSrc);
    baseUrl = url.protocol + '//' + url.host;
  } else {
    // Fallback to current domain (for same-domain usage)
    var currentDomain = window.location.hostname;
    var protocol = window.location.protocol;
    var port = window.location.port ? `:${window.location.port}` : '';
    baseUrl = `${protocol}//${currentDomain}${port}`;
  }
  
  // Generate unique session ID
  var sessionId = 'dni_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Capture URL parameters
  var urlParams = new URLSearchParams(window.location.search);
  var trackingData = {
    campaignId: campaignId,
    sessionId: sessionId,
    domain: currentDomain,
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
    
    // Replace phone numbers in text nodes
    textNodes.forEach(function(textNode) {
      var originalText = textNode.textContent;
      var newText = originalText;
      
      phonePatterns.forEach(function(pattern) {
        newText = newText.replace(pattern, formattedNumber);
      });
      
      if (newText !== originalText) {
        textNode.textContent = newText;
      }
    });
    
    // Find and update phone number links
    var phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(function(link) {
      link.href = 'tel:' + trackingNumber;
      if (link.textContent.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/)) {
        link.textContent = formattedNumber;
      }
    });
    
    // Find elements with tracking classes/attributes (includes common patterns from real websites)
    var trackingElements = document.querySelectorAll('.tracking-number, [data-tracking-number], .btn-call, .call-button, .phone-number, .tel-link, .phone-highlight');
    trackingElements.forEach(function(element) {
      element.textContent = formattedNumber;
      if (element.tagName === 'A') {
        element.href = 'tel:' + trackingNumber;
      }
    });
  }
  
  // Make the tracking request
  function requestTrackingNumber() {
    console.log('CallCenter Pro: Making request to:', baseUrl + '/api/dni/track-simple');
    console.log('CallCenter Pro: Campaign ID:', campaignId);
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', baseUrl + '/api/dni/track-simple', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            if (response.phoneNumber && response.formattedNumber) {
              replacePhoneNumbers(response.phoneNumber, response.formattedNumber);
            }
          } catch (e) {
            console.error('CallCenter Pro: Invalid response format');
          }
        } else {
          console.error('CallCenter Pro: Tracking request failed');
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