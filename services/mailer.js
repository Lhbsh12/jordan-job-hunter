const nodemailer = require('nodemailer');
const path = require('path');

function createTransporter(smtpConfig) {
  if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    return null;
  }

  const port = parseInt(smtpConfig.port, 10) || (smtpConfig.secure ? 465 : 587);
  const secure = smtpConfig.secure === true || port === 465;

  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: port,
    secure: secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    },
    tls: {
      // Reject unauthorized certificates by default to protect credentials against MITM attacks
      rejectUnauthorized: smtpConfig.rejectUnauthorized !== false
    }
  });
}

async function verifySmtp(smtpConfig) {
  const transporter = createTransporter(smtpConfig);
  if (!transporter) {
    throw new Error('Incomplete SMTP configuration. Please supply Host, Port, Username, and Password/App Password.');
  }
  return await transporter.verify();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendOutreachEmail({ smtpConfig, fromName, to, subject, body, cc, bcc, attachments }) {
  const transporter = createTransporter(smtpConfig);
  if (!transporter) {
    throw new Error('SMTP is not configured. Please configure your email settings in the Profile tab, or use the "Open in Email Client / Copy" option.');
  }

  // 1. CRLF Injection / Header Splitting Defense
  const cleanTo = String(to || '').replace(/[\r\n]+/g, '').trim();
  const cleanSubject = String(subject || '').replace(/[\r\n]+/g, ' ').trim();
  const cleanFromName = String(fromName || smtpConfig.user || '').replace(/[\r\n"<>]+/g, '').trim();

  // 2. Strict recipient format verification
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanTo)) {
    throw new Error('Invalid recipient email address format.');
  }

  // 3. Sender address construction
  const senderAddress = `"${cleanFromName}" <${smtpConfig.user}>`;

  // 4. Safe HTML conversion with XSS escaping
  const safeHtmlBody = escapeHtml(body).replace(/\n/g, '<br/>');

  // 5. Strict attachment path confinement (must reside inside allowed public directory)
  const allowedPublicDir = path.resolve(__dirname, '..', 'public');
  const safeAttachments = (attachments || []).filter(att => {
    if (!att || !att.path) return false;
    const resolvedPath = path.resolve(att.path);
    return resolvedPath.startsWith(allowedPublicDir);
  });

  const mailOptions = {
    from: senderAddress,
    to: cleanTo,
    subject: cleanSubject,
    text: body,
    html: safeHtmlBody,
    attachments: safeAttachments
  };

  if (cc) mailOptions.cc = String(cc).replace(/[\r\n]+/g, '').trim();
  if (bcc) mailOptions.bcc = String(bcc).replace(/[\r\n]+/g, '').trim();

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted,
    response: info.response
  };
}

module.exports = {
  createTransporter,
  verifySmtp,
  sendOutreachEmail
};
