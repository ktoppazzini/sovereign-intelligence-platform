// lib/mailer.js
// Nodemailer wrapper for sending emails via Zoho SMTP
import nodemailer from 'nodemailer';

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_FROM,
    pass: process.env.SMTP_PASS,
  },
};

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@sovereignintelligence.com';

/**
 * Send an email via Nodemailer
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} [options.cc] - CC recipients
 * @param {string} [options.bcc] - BCC recipients
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 * @param {Array} [options.attachments] - Array of attachment objects
 * @param {string} [options.from] - Override sender address
 * @returns {Promise<Object>} Nodemailer send result
 */
export async function sendMail(options) {
  try {
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
      throw new Error('SMTP credentials not configured. Check SMTP_USER and SMTP_PASS in .env.local');
    }

    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    // Prepare mail options
    const mailOptions = {
      from: options.from || FROM_ADDRESS,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
    };

    // Add optional CC/BCC
    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;

    console.log('[mailer] Sending email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasAttachments: (options.attachments || []).length > 0,
    });

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('[mailer] Email sent successfully:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return {
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  } catch (error) {
    console.error('[mailer] Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Verify SMTP connection
 * @returns {Promise<boolean>}
 */
export async function verifyConnection() {
  try {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    await transporter.verify();
    console.log('[mailer] SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('[mailer] SMTP connection failed:', error);
    return false;
  }
}

export default { sendMail, verifyConnection };
