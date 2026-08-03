import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export async function sendOtpEmail(toEmail, otpCode) {
  const serviceId = SERVICE_ID || 'service_default';
  const templateId = TEMPLATE_ID || 'template_default';
  const publicKey = PUBLIC_KEY || '';

  const templateParams = {
    to_email: toEmail,
    email: toEmail,
    recipient: toEmail,
    user_email: toEmail,
    otp_code: otpCode,
    otp: otpCode,
    passcode: otpCode,
    code: otpCode,
    message: `Your DropTalk verification code is: ${otpCode}. Valid for 10 minutes.`,
  };

  // If EmailJS public key is provided, send via official @emailjs/browser SDK
  if (publicKey && serviceId && templateId) {
    try {
      const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
      return { success: true, response };
    } catch (err) {
      console.error('[EmailJS Error]', err);
      throw new Error(err?.text || err?.message || 'Failed to deliver email via EmailJS');
    }
  }

  // Fallback REST API call to EmailJS
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'EmailJS service response error');
    }
    return { success: true };
  } catch (err) {
    console.warn('[EmailJS Notification]', err.message);
    return { success: false, error: err.message };
  }
}
