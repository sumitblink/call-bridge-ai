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
    loc_interest_ms: urlParams.get('loc_interest_ms'),
    // RedTrack specific parameters
    redtrack_campaign_id: urlParams.get('campaign_id'),
    redtrack_offer_id: urlParams.get('offer_id'),
    redtrack_affiliate_id: urlParams.get('affiliate_id'),
    redtrack_sub_id: urlParams.get('sub_id')
  };
  
  // RedTrack Auto-Detection & Integration
  var isRedTrackDetected = trackingData.clickid || trackingData.redtrack_campaign_id || trackingData.redtrack_offer_id;
  
  if (isRedTrackDetected) {
    console.log('CallCenter Pro: RedTrack parameters detected, initializing integration...');
    
    // Store RedTrack clickid globally for Ringba-style integration
    if (trackingData.clickid) {
      window.rtkClickID = trackingData.clickid;
      console.log('CallCenter Pro: RedTrack clickID set globally:', window.rtkClickID);
    }
    
    // Initialize RedTrack tag system (Ringba-style)
    window._rgba_tags = window._rgba_tags || [];
    window._rgba_tags.push({ type: "User", track_attempted: "yes" });
    
    // Auto-inject RedTrack clickid transfer logic
    if (window.rtkClickID) {
      window._rgba_tags.push({ type: "User", clickid: window.rtkClickID });
      console.log('CallCenter Pro: RedTrack tags initialized with clickID:', window.rtkClickID);
    }
    
    // Enhanced conversion tracking for RedTrack events
    window.ccpRedTrackConfig = {
      clickid: trackingData.clickid,
      campaign_id: trackingData.redtrack_campaign_id,
      offer_id: trackingData.redtrack_offer_id,
      affiliate_id: trackingData.redtrack_affiliate_id,
      baseUrl: baseUrl,
      sessionId: sessionId
    };
  }
  
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
    console.log('CallCenter Pro: Making request to:', baseUrl + '/api/dni/ultra-fast');
    console.log('CallCenter Pro: Campaign ID:', campaignId);
    console.log('CallCenter Pro: Tracking data:', trackingData);
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', baseUrl + '/api/dni/ultra-fast', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            if (response.phoneNumber && response.formattedNumber) {
              replacePhoneNumbers(response.phoneNumber, response.formattedNumber);
              
              // CRITICAL: Create visitor session for call attribution
              console.log('CallCenter Pro: Creating visitor session for attribution...');
              createVisitorSession();
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
  
  // Create visitor session for call attribution
  function createVisitorSession() {
    console.log('CallCenter Pro: Creating visitor session with data:', trackingData);
    
    var sessionXhr = new XMLHttpRequest();
    sessionXhr.open('POST', baseUrl + '/api/dni/track-simple', true);
    sessionXhr.setRequestHeader('Content-Type', 'application/json');
    
    sessionXhr.onreadystatechange = function() {
      if (sessionXhr.readyState === 4) {
        if (sessionXhr.status === 200) {
          try {
            var sessionResponse = JSON.parse(sessionXhr.responseText);
            console.log('CallCenter Pro: Visitor session created successfully:', sessionResponse.trackingId);
          } catch (e) {
            console.error('CallCenter Pro: Invalid session response format');
          }
        } else {
          console.error('CallCenter Pro: Visitor session creation failed:', sessionXhr.status);
        }
      }
    };
    
    // Send same tracking data to create visitor session
    sessionXhr.send(JSON.stringify(trackingData));
  }
  
  // Enhanced phone click tracking with RedTrack conversion events
  function setupRedTrackConversionTracking() {
    if (!isRedTrackDetected) return;
    
    console.log('CallCenter Pro: Setting up RedTrack conversion tracking...');
    
    // Track phone clicks for RedTrack conversions
    document.addEventListener('click', function(e) {
      var target = e.target.closest('a[href^="tel:"]');
      if (target && window.ccpRedTrackConfig && window.ccpRedTrackConfig.clickid) {
        var phoneNumber = target.href.replace('tel:', '');
        
        console.log('CallCenter Pro: RedTrack phone click detected:', phoneNumber);
        
        // Send conversion event to CallCenter Pro
        var conversionData = {
          eventType: 'phone_click',
          phoneNumber: phoneNumber,
          clickid: window.ccpRedTrackConfig.clickid,
          campaign_id: window.ccpRedTrackConfig.campaign_id,
          offer_id: window.ccpRedTrackConfig.offer_id,
          affiliate_id: window.ccpRedTrackConfig.affiliate_id,
          sessionId: window.ccpRedTrackConfig.sessionId,
          timestamp: new Date().toISOString(),
          conversionType: 'RAWCall',
          conversionValue: 25.00 // Default value, will be overridden by campaign settings
        };
        
        // Send to internal tracking endpoint
        var xhr = new XMLHttpRequest();
        xhr.open('POST', baseUrl + '/api/tracking/redtrack/conversion', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              console.log('CallCenter Pro: RedTrack conversion tracked successfully');
            } else {
              console.error('CallCenter Pro: RedTrack conversion tracking failed');
            }
          }
        };
        xhr.send(JSON.stringify(conversionData));
        
        // Update Ringba-style tags for advanced integrations
        if (window._rgba_tags) {
          window._rgba_tags.push({
            type: "Conversion", 
            eventType: "RAWCall",
            clickid: window.ccpRedTrackConfig.clickid,
            phoneNumber: phoneNumber,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    // Setup call quality tracking (for AnsweredCall and ConvertedCall events)
    // This will be triggered by actual call completion webhooks
    window.ccpTrackCallQuality = function(callData) {
      if (!window.ccpRedTrackConfig || !window.ccpRedTrackConfig.clickid) return;
      
      var conversionType = 'RAWCall';
      if (callData.answered) conversionType = 'AnsweredCall';
      if (callData.converted) conversionType = 'ConvertedCall';
      
      var qualityData = {
        eventType: 'call_quality',
        conversionType: conversionType,
        clickid: window.ccpRedTrackConfig.clickid,
        duration: callData.duration || 0,
        answered: callData.answered || false,
        converted: callData.converted || false,
        revenue: callData.revenue || 0,
        sessionId: window.ccpRedTrackConfig.sessionId
      };
      
      // Send quality tracking
      var xhr = new XMLHttpRequest();
      xhr.open('POST', baseUrl + '/api/tracking/redtrack/quality', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(qualityData));
      
      console.log('CallCenter Pro: RedTrack call quality tracked:', conversionType);
    };
  }
  
  // Initialize tracking
  function initializeTracking() {
    requestTrackingNumber();
    setupRedTrackConversionTracking();
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    initializeTracking();
  }
  
})();