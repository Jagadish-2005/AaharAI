// Textlocal credentials from Environment Variables
const TEXTLOCAL_API_KEY = process.env.TEXTLOCAL_API_KEY;
const TEXTLOCAL_SENDER = process.env.TEXTLOCAL_SENDER || 'TXTLCL';

if (!TEXTLOCAL_API_KEY) {
  console.warn('⚠️ Textlocal API Key missing in .env. Falling back to log-based mockup.');
}

// Simple text translator for the supported message templates
// Languages: 'en' = English, 'hi' = Hindi, 'ta' = Tamil
function getMessageTemplate(lang, type, data) {
  const templates = {
    otp: {
      en: `Hello ${data.name}, your Aahar AI ration OTP is ${data.otp}. Available: ${data.rationQty}. Visit ${data.shopName} to collect.`,
      hi: `नमस्ते ${data.name}, आपका आहार AI राशन OTP ${data.otp} है। उपलब्ध: ${data.rationQty}। राशन लेने के लिए ${data.shopName} पर जाएं।`,
      ta: `வணக்கம் ${data.name}, உங்கள் ஆகார் AI ரேஷன் முகாமிக்கான OTP ${data.otp}. கிடைக்கும் அளவு: ${data.rationQty}. இதை பெற ${data.shopName} ஐ அணுகவும்.`
    },
    voice_otp: {
      en: `Hello ${data.name}, your Aahar AI verification code is ${data.otp}. I repeat, your code is ${data.otp}. Thank you.`,
      hi: `नमस्ते ${data.name}, आपका आहार ए आई वेरिफिकेशन कोड है ${data.otp}. मैं दोहराती हूँ, आपका कोड है ${data.otp}. धन्यवाद.`,
      ta: `வணக்கம் ${data.name}, உங்கள் ஆகார் ஏ ஐ சரிபார்ப்பு குறியீடு ${data.otp}. மீண்டும் சொல்கிறேன், உங்கள் குறியீடு ${data.otp}. நன்றி.`
    },
    alert: {
      en: `Dear ${data.name}, your ration is ready for collection at ${data.vendorName}. Please visit with your Aahar card.`,
      hi: `प्रिय ${data.name}, आपका राशन ${data.vendorName} पर संग्रह के लिए तैयार है। कृपया अपने आहार कार्ड के साथ आएं।`,
      ta: `அன்புள்ள ${data.name}, உங்கள் ரேஷன் ${data.vendorName} கடையில் தயாராக உள்ளது. தயவுசெய்து உங்கள் ஆகார் அட்டை எடுத்து வரவும்.`
    }
  };
  return templates[type][lang] || templates[type]['en'];
}

export async function sendSMS(to, messageText) {
  if (!TEXTLOCAL_API_KEY) {
    console.log(`📱 [MOCK Textlocal SMS to ${to}]: ${messageText}`);
    return { success: true, sid: `SM_DEMO_${Date.now()}`, status: 'delivered' };
  }
  
  try {
    const params = new URLSearchParams();
    params.append('apikey', TEXTLOCAL_API_KEY);
    params.append('numbers', to);
    params.append('message', encodeURIComponent(messageText));
    params.append('sender', TEXTLOCAL_SENDER);

    const response = await fetch('https://api.textlocal.in/send/', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      console.log(`📱 Textlocal SMS Sent to ${to}: Batch ID ${data.batch_id}`);
      return { success: true, sid: data.batch_id, status: 'delivered' };
    } else {
      console.error(`🚨 Textlocal SMS Failed to ${to}:`, data.errors);
      return { success: false, error: data.errors };
    }
  } catch (err) {
    console.error(`🚨 Textlocal SMS Failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendVoiceCall(to, messageText, lang = 'en') {
  // Textlocal does not natively support TwiML text-to-speech APIs easily via HTTPS.
  // We will retain the fallback mock logging for Automated Calls.
  console.log(`📞 [MOCK Voice Call to ${to}]: ${messageText} [lang: ${lang}]`);
  return { success: true, sid: `CA_DEMO_${Date.now()}`, status: 'completed' };
}

export async function sendOTPNotification(phone, data, preferVoice = false, lang = 'en') {
  if (preferVoice) {
    const message = getMessageTemplate(lang, 'voice_otp', data);
    return sendVoiceCall(phone, message, lang);
  } else {
    const message = getMessageTemplate(lang, 'otp', data);
    return sendSMS(phone, message);
  }
}

export async function sendDistributionAlert(phone, beneficiaryName, vendorName, lang = 'en') {
  const message = getMessageTemplate(lang, 'alert', { name: beneficiaryName, vendorName });
  return sendSMS(phone, message);
}
