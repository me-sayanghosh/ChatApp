import nodemailer from 'nodemailer';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    console.log(`[Mailer] Configured SMTP transporter for host: ${host}`);
    return transporter;
  }

  // Fallback to automatic Ethereal test account if SMTP is not explicitly configured
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Mailer] No custom SMTP credentials found. Created auto Ethereal test account: ${testAccount.user}`);
    return transporter;
  } catch (err) {
    console.error('[Mailer] Failed to create test account:', err.message);
    throw err;
  }
}

export async function sendOtpEmail(toEmail, otpCode) {
  const mailer = await getTransporter();

  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"DropTalk Auth" <no-reply@droptalk.com>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B0F19; margin: 0; padding: 30px 15px; color: #F8FAFC; }
          .container { max-width: 480px; margin: 0 auto; background: #0F172A; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #0052FF, #7C3AED); border-radius: 14px; line-height: 48px; color: #FFF; font-size: 24px; font-weight: 800; }
          h2 { font-size: 22px; font-weight: 800; text-align: center; color: #F8FAFC; margin: 0 0 10px; }
          p { font-size: 14px; color: #94A3B8; line-height: 1.5; text-align: center; margin: 0 0 24px; }
          .otp-box { background: rgba(30, 41, 59, 0.8); border: 2px dashed #0052FF; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; }
          .otp-code { font-family: monospace, Consolas, Courier; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60A5FA; }
          .footer { text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <div class="logo-badge">💬</div>
          </div>
          <h2>Your Verification Code</h2>
          <p>Use the 6-digit code below to complete your sign-in to DropTalk workspace.</p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <p style="font-size: 12px; color: #64748B;">This verification code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
          <div class="footer">
            &copy; DropTalk Messaging System. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  const info = await mailer.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: `${otpCode} is your DropTalk verification code`,
    text: `Your DropTalk verification code is: ${otpCode}. Valid for 10 minutes.`,
    html: htmlContent,
  });

  console.log(`\x1b[32m[Mailer Success]\x1b[0m OTP Email delivered to \x1b[36m${toEmail}\x1b[0m (Message ID: ${info.messageId})`);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`\x1b[33m[Mailer Preview]\x1b[0m Ethereal Email Preview URL: \x1b[4m\x1b[36m${previewUrl}\x1b[0m`);
  }

  return { messageId: info.messageId, previewUrl };
}
