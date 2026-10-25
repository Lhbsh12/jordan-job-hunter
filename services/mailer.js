const nodemailer = require('nodemailer');

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
      rejectUnauthorized: false
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

async function sendOutreachEmail({ smtpConfig, fromName, to, subject, body, cc, bcc, attachments }) {
  const transporter = createTransporter(smtpConfig);
  if (!transporter) {
    throw new Error('SMTP is not configured. Please configure your email settings in the Profile tab, or use the "Open in Email Client / Copy" option.');
  }

  const senderAddress = `"${fromName || smtpConfig.user}" <${smtpConfig.user}>`;

  const mailOptions = {
    from: senderAddress,
    to: to,
    subject: subject,
    text: body,
    html: body.replace(/\n/g, '<br/>'),
    attachments: attachments || []
  };

  if (cc) mailOptions.cc = cc;
  if (bcc) mailOptions.bcc = bcc;

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
