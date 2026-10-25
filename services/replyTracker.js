/**
 * Gmail Inbox & Reply Tracker
 * Uses IMAP to detect company replies, recruiter responses, and delivery status bounces.
 */

const { ImapFlow } = require('imapflow');
const fs = require('fs');

function createImapClient(smtpConfig) {
  if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
    return null;
  }

  const host = smtpConfig.imapHost || 'imap.gmail.com';
  const port = parseInt(smtpConfig.imapPort, 10) || 993;

  return new ImapFlow({
    host: host,
    port: port,
    secure: true,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    },
    logger: false,
    tls: {
      rejectUnauthorized: smtpConfig.rejectUnauthorized !== false
    }
  });
}

function cleanHtmlSnippet(str) {
  if (!str) return '';
  return str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check inbox for replies matching past outreach and delivery bounces
 */
async function checkGmailReplies({ profile, history = [], jobs = [] }) {
  if (!profile || !profile.smtp || !profile.smtp.user || !profile.smtp.pass) {
    throw new Error('Email credentials not configured. Please enter your Gmail App Password in settings.');
  }

  const client = createImapClient(profile.smtp);
  if (!client) {
    throw new Error('Could not initialize IMAP client.');
  }

  const trackedRecipients = new Set(history.map(h => (h.recipient || '').toLowerCase().trim()).filter(Boolean));
  const trackedSubjects = history.map(h => (h.subject || '').toLowerCase().trim()).filter(Boolean);
  const candidateName = (profile.name || '').toLowerCase().trim();

  const matchedItems = [];
  const candidateUids = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const totalMessages = client.mailbox.exists;
      if (totalMessages === 0) {
        return { success: true, count: 0, items: [] };
      }

      // Fast check of envelopes for last 40 messages
      const fetchRange = `${Math.max(1, totalMessages - 40)}:*`;

      for await (let msg of client.fetch(fetchRange, { envelope: true })) {
        const env = msg.envelope;
        if (!env) continue;

        const fromAddress = env.from && env.from[0] ? (env.from[0].address || '').toLowerCase() : '';
        const fromName = env.from && env.from[0] ? (env.from[0].name || fromAddress) : '';
        const subject = env.subject || '(No Subject)';
        const date = env.date ? new Date(env.date).toISOString() : new Date().toISOString();

        // 1. Is it a bounce notice?
        const isBounce = fromAddress.includes('mailer-daemon') ||
                         fromAddress.includes('postmaster') ||
                         subject.toLowerCase().includes('delivery status notification') ||
                         subject.toLowerCase().includes('undeliverable') ||
                         subject.toLowerCase().includes('failure');

        // 2. Is it a direct reply or company outreach?
        let isReply = false;
        let matchedHistory = null;

        if (!isBounce) {
          if (trackedRecipients.has(fromAddress)) {
            isReply = true;
            matchedHistory = history.find(h => (h.recipient || '').toLowerCase() === fromAddress);
          } else {
            const fromDomain = fromAddress.split('@')[1];
            if (fromDomain && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'google.com'].includes(fromDomain)) {
              matchedHistory = history.find(h => {
                const recDomain = (h.recipient || '').split('@')[1];
                return recDomain && recDomain.toLowerCase() === fromDomain;
              });
              if (matchedHistory) isReply = true;
            }
          }

          if (!isReply) {
            const subjectLower = subject.toLowerCase();
            for (const s of trackedSubjects) {
              if (subjectLower.includes(s)) {
                isReply = true;
                matchedHistory = history.find(h => (h.subject || '').toLowerCase().includes(s));
                break;
              }
            }

            if (!isReply && candidateName && candidateName.length > 2) {
              if (subjectLower.startsWith('re:') && subjectLower.includes(candidateName)) {
                isReply = true;
              }
            }
          }
        }

        if (isBounce || isReply) {
          candidateUids.push({
            uid: msg.uid,
            isBounce,
            isReply,
            fromAddress,
            fromName,
            subject,
            date,
            matchedHistory
          });
        }
      }

      // Download content for matched candidate UIDs sequentially
      for (const item of candidateUids) {
        try {
          const fetched = await client.fetchOne(item.uid, { source: true }, { uid: true });
          const rawText = fetched && fetched.source ? fetched.source.toString('utf-8') : '';

          if (item.isBounce) {
            const recMatch = rawText.match(/Final-Recipient:\s*rfc822;\s*([^\s;]+)/i);
            const bouncedEmail = recMatch ? recMatch[1].trim() : '';

            let diagCode = '';
            const diagMatch = rawText.match(/Diagnostic-Code:[^\n]*/i);
            if (diagMatch) diagCode = diagMatch[0].replace('Diagnostic-Code:', '').trim();

            let reason = 'Delivery failed or rejected by recipient mail server.';
            if (rawText.includes('550 5.7.124') || rawText.includes('RestrictedToGroupPermission') || rawText.includes('allowed senders list')) {
              reason = 'Rejected: Recipient is an internal-only distribution group (blocks external emails).';
            } else if (rawText.includes('550-5.1.1') || rawText.includes('550 5.1.1') || rawText.includes('does not exist')) {
              reason = 'Rejected: The email address does not exist on the target server.';
            } else if (rawText.includes('DNS Error') || rawText.includes('lookup')) {
              reason = 'Domain or DNS lookup failed for recipient.';
            }

            const matchedJob = history.find(h => (h.recipient || '').toLowerCase() === bouncedEmail.toLowerCase()) ||
                               jobs.find(j => (j.contactEmail || '').toLowerCase() === bouncedEmail.toLowerCase());

            matchedItems.push({
              id: `bounce_${item.uid}`,
              uid: item.uid,
              type: 'bounce',
              from: item.fromAddress,
              fromName: 'Mail Delivery Subsystem',
              targetEmail: bouncedEmail || item.fromAddress,
              company: matchedJob ? matchedJob.company : (bouncedEmail.split('@')[1] || 'Company'),
              roleTitle: matchedJob ? matchedJob.roleTitle : 'Job Outreach',
              subject: item.subject,
              date: item.date,
              reason: reason,
              diagnostic: diagCode,
              statusColor: 'rose'
            });
          } else if (item.isReply) {
            const cleanSnippet = cleanHtmlSnippet(rawText).substring(0, 350);

            matchedItems.push({
              id: `reply_${item.uid}`,
              uid: item.uid,
              type: 'reply',
              from: item.fromAddress,
              fromName: item.fromName,
              company: item.matchedHistory ? item.matchedHistory.company : 'Company Recruiter',
              roleTitle: item.matchedHistory ? item.matchedHistory.roleTitle : 'Application Response',
              subject: item.subject,
              date: item.date,
              snippet: cleanSnippet,
              statusColor: 'emerald'
            });
          }
        } catch (fetchErr) {
          console.warn(`Error fetching body for UID ${item.uid}:`, fetchErr.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    if (client.usable) {
      try { await client.logout(); } catch (_) {}
    }
    throw err;
  }

  // Sort newest first
  matchedItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    success: true,
    totalTracked: matchedItems.length,
    items: matchedItems,
    checkedAt: new Date().toISOString()
  };
}

module.exports = {
  checkGmailReplies
};
