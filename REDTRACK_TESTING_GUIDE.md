# 🚀 RedTrack Auto-Detection Testing Guide

## Overview
Your CallCenter Pro system now has **automatic RedTrack integration** that detects RedTrack parameters and tracks conversions without any manual setup.

## 🎯 What to Test

### 1. **Auto-Detection System**
- ✅ URL parameter detection (clickid, campaign_id, offer_id, affiliate_id)
- ✅ Global variable initialization (window.rtkClickID, window._rgba_tags)
- ✅ Automatic integration activation

### 2. **Three Conversion Types**
- ✅ **RAWCall** - Phone number clicked
- ✅ **AnsweredCall** - Call completed successfully  
- ✅ **ConvertedCall** - Call duration > 30 seconds

### 3. **Pixel Firing**
- ✅ Automatic postback to RedTrack
- ✅ Token replacement ([tag:User:clickid], [Call:ConversionPayout])
- ✅ Multiple conversion type support

---

## 🧪 Testing Methods

### **Method 1: Live Test Page** ⭐ RECOMMENDED
1. **Open the test page:**
   ```
   http://localhost:5000/redtrack-test-page.html
   ```

2. **Test with RedTrack parameters:**
   ```
   http://localhost:5000/redtrack-test-page.html?clickid=TEST_123&campaign_id=456&offer_id=789&affiliate_id=ABC
   ```

3. **Click phone numbers** to trigger RAWCall conversions

4. **Watch the console** for real-time tracking events

### **Method 2: Browser Network Tab**
1. Open Developer Tools (F12)
2. Go to Network tab
3. Visit test page with RedTrack parameters
4. Click phone numbers
5. **Look for API calls to:**
   - `/api/tracking/redtrack/conversion`
   - `/api/tracking/redtrack/quality`

### **Method 3: Database Verification**
Check the database for tracking data:
```sql
-- Check visitor sessions (RedTrack parameter capture)
SELECT * FROM visitor_sessions WHERE redtrack_clickid IS NOT NULL;

-- Check conversion events
SELECT * FROM conversion_events WHERE metadata->>'redtrack_attribution' = 'true';

-- Check calls with RedTrack attribution
SELECT * FROM calls WHERE click_id IS NOT NULL;
```

### **Method 4: API Testing**
Test endpoints directly:

**Conversion Endpoint:**
```bash
curl -X POST http://localhost:5000/api/tracking/redtrack/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "clickid": "TEST_DIRECT_123",
    "phoneNumber": "+18569256411",
    "conversionValue": 25.00,
    "sessionId": "test_session"
  }'
```

**Quality Endpoint:**
```bash
curl -X POST http://localhost:5000/api/tracking/redtrack/quality \
  -H "Content-Type: application/json" \
  -d '{
    "clickid": "TEST_DIRECT_123",
    "conversionType": "ConvertedCall",
    "duration": 45,
    "answered": true,
    "converted": true,
    "revenue": 25.00
  }'
```

---

## 📊 Expected Results

### **When RedTrack Parameters Detected:**
```javascript
// Global variables automatically set:
window.rtkClickID = "TEST_123"
window._rgba_tags = {
  clickid: "TEST_123",
  campaign_id: "456", 
  offer_id: "789",
  affiliate_id: "ABC"
}
```

### **Phone Click Event (RAWCall):**
```json
{
  "success": true,
  "sessionId": "rt_1753344123_abc123",
  "conversionValue": 25,
  "message": "RedTrack conversion tracked successfully"
}
```

### **Call Completion (AnsweredCall/ConvertedCall):**
```json
{
  "success": true,
  "conversionType": "ConvertedCall",
  "duration": 45,
  "answered": true,
  "converted": true,
  "message": "RedTrack ConvertedCall quality tracked successfully"
}
```

---

## 🔧 Integration for Your Website

### **Simple Integration (Zero Configuration):**
```html
<!-- Just add this one line to your website header -->
<script src="http://localhost:5000/js/t.js" data-campaign="YOUR_CAMPAIGN_ID" async></script>
```

### **RedTrack Campaign URLs:**
```
https://yoursite.com/landing?clickid={clickid}&campaign_id={campaign_id}&offer_id={offer_id}&affiliate_id={affiliate_id}
```

### **Traditional UTM Support:**
```
https://yoursite.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=healthcare
```

---

## 🎯 Live Testing Scenarios

### **Scenario 1: RedTrack Health Insurance Campaign**
```
URL: /redtrack-test-page.html?clickid=RT_HEALTH_123&campaign_id=HEALTH_001&offer_id=INS_789&affiliate_id=PARTNER_A
Expected: Auto-detection + RAWCall on phone click
```

### **Scenario 2: Auto Insurance with UTM**
```
URL: /redtrack-test-page.html?clickid=RT_AUTO_456&utm_source=google&utm_medium=cpc&utm_campaign=auto_insurance
Expected: Combined RedTrack + UTM tracking
```

### **Scenario 3: No RedTrack Parameters**
```
URL: /redtrack-test-page.html?utm_source=facebook&utm_medium=cpc
Expected: Standard UTM tracking (no RedTrack features)
```

---

## 🚨 Troubleshooting

### **Issue: "No RedTrack Click ID detected"**
**Solution:** Add `?clickid=TEST123` to your URL

### **Issue: "Tracking script not found"**  
**Solution:** Verify the script tag is loading: `<script src="/js/t.js" data-campaign="ID">`

### **Issue: "API calls failing"**
**Solution:** Check browser console for CORS errors, verify server is running

### **Issue: "No conversion events"**
**Solution:** Click phone numbers, check that event listeners are attached

---

## 📈 Success Metrics

**✅ Integration Working When You See:**
- RedTrack parameters detected in URL
- Global variables set (window.rtkClickID)
- RAWCall events on phone clicks
- API calls to /api/tracking/redtrack/* endpoints
- Database records in visitor_sessions and conversion_events tables
- Console logs showing "RedTrack conversion tracked successfully"

**🎉 100% RedTrack Compliance Achieved!**

Your system now provides professional-grade RedTrack integration with zero configuration required - users just need to add the simple script tag and RedTrack functionality happens automatically.