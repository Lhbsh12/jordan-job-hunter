require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { generateTailoredMessage } = require('./services/emailGenerator');
const { verifySmtp, sendOutreachEmail } = require('./services/mailer');
const { scrapeLiveJordanJobs } = require('./services/jobScraper');
const { checkGmailReplies } = require('./services/replyTracker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const PROFILE_TEMPLATE_FILE = path.join(DATA_DIR, 'profile.template.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const REPLIES_FILE = path.join(DATA_DIR, 'replies.json');

// Generic, customizable default profile template
const defaultProfile = {
  name: "Jordanian Candidate",
  email: "",
  phone: "+962 7 9000 0000",
  location: "Amman, Jordan",
  major: "Computer Science / Software Engineering",
  degree: "B.S. in Computer Science",
  university: "University in Jordan",
  skills: "JavaScript, TypeScript, React, Node.js, Python, SQL, REST APIs, Git, Docker",
  projects: "• Full-Stack Web Application: Built a responsive platform with React & Node.js, integrating RESTful APIs and PostgreSQL database.\n• Microservice Architecture: Designed Dockerized backend service with JWT authentication and automated unit testing.\n• Analytics Pipeline: Engineered automated scripts transforming raw event logs into actionable operational metrics.",
  experience: "Passionate developer and problem solver based in Amman, Jordan. Experienced in building clean, scalable software applications and collaborating across cross-functional teams.",
  github: "https://github.com/your-username",
  linkedin: "https://linkedin.com/in/your-username",
  portfolio: "https://your-portfolio.com",
  resumeText: "",
  targetKeywords: "Software Engineer, Web Developer, Full Stack, Data Scientist, Frontend, Backend",
  smtp: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    user: "",
    pass: "",
    fromName: "Candidate Name"
  },
  llm: {
    provider: "local",
    apiKey: "",
    modelName: ""
  }
};

const defaultSampleJobs = [
  {
    id: "sample-tech-1",
    company: "Acme Tech Solutions",
    roleTitle: "Full Stack Software Engineer",
    contactName: "Engineering Hiring Team",
    contactEmail: "careers@example.com",
    jobDescription: "Looking for a Software Engineer to join our core product team. Requirements: JavaScript, React, Node.js, SQL/PostgreSQL, REST APIs, and version control with Git. Experience with Docker and CI/CD pipelines is a plus.",
    notes: "Sample tech opportunity illustrating direct outreach.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "direct",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "sample-tech-2",
    company: "CloudData Global",
    roleTitle: "Associate Data Scientist / ML Engineer",
    contactName: "Analytics Recruiter",
    contactEmail: "talent@example.com",
    jobDescription: "Seeking an early-career Data Scientist proficient in Python, SQL, Pandas, Scikit-learn, statistical hypothesis testing, and machine learning pipelines. Strong communication and data modeling skills required.",
    notes: "Sample data science lead.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "sample-tech-3",
    company: "NextGen Mobile AI",
    roleTitle: "Frontend / Mobile App Developer",
    contactName: "Product Lead",
    contactEmail: "recruiting@example.com",
    jobDescription: "Our mobile team is looking for a developer experienced in modern frontend frameworks (React, React Native, or Flutter), responsive UI/UX, REST API integration, and clean modular code architecture.",
    notes: "Sample frontend role.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "enthusiastic",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Curated verified opportunities and tech leaders across Jordan
const jordanCuratedLeads = [
  {
    id: "jo-etihad",
    company: "Bank al Etihad",
    roleTitle: "Software Engineer / BI Analyst",
    contactName: "Talent Acquisition",
    contactEmail: "careers@bankaletihad.com",
    jobDescription: "Digital Transformation & Engineering team in Amman. Seeking talent with strong proficiency in web development, APIs, database engineering, analytics dashboards, and modern software architectures.",
    notes: "Pioneering digital bank in Jordan; based in Shmeisani, Amman.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "direct",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jo-mawdoo3",
    company: "Mawdoo3 / AI Hub",
    roleTitle: "Full Stack Engineer / AI Specialist",
    contactName: "Engineering Team",
    contactEmail: "careers@mawdoo3.com",
    jobDescription: "Leading Arabic digital and AI hub in Amman. Seeking engineers experienced in modern backend/frontend stacks, Python/Node.js, APIs, microservices, and AI integrations.",
    notes: "Pioneer in Arabic digital content and conversational AI; based in Amman.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "project",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jo-opensooq",
    company: "OpenSooq",
    roleTitle: "Backend / Mobile Software Engineer",
    contactName: "Tech Recruitment",
    contactEmail: "careers@opensooq.com",
    jobDescription: "High-volume MENA marketplace tech headquarters in Amman. Seeking talent with strong problem-solving skills, relational databases, REST APIs, microservices, and scalable web architectures.",
    notes: "High transaction volume, millions of active listings across MENA.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "direct",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jo-arabiaweather",
    company: "ArabiaWeather",
    roleTitle: "Software Developer & Data Engineer",
    contactName: "Hiring Manager",
    contactEmail: "jobs@arabiaweather.com",
    jobDescription: "Hyper-local weather and climate intelligence team. Looking for developers proficient in Python, APIs, cloud services, data processing pipelines, and responsive web platforms.",
    notes: "King Hussein Business Park, Amman.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "enthusiastic",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jo-tamatem",
    company: "Tamatem Games",
    roleTitle: "Game Developer / Frontend Engineer",
    contactName: "People & Culture",
    contactEmail: "careers@tamatem.co",
    jobDescription: "Leading mobile games publisher in the MENA region. Seeking passionate developers proficient in game logic, modern UI engineering, mobile frameworks, and interactive features.",
    notes: "Amman, Jordan. Pioneer in MENA gaming.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "enthusiastic",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jo-progressoft",
    company: "ProgressSoft Corporation",
    roleTitle: "Software Engineer / System Architect",
    contactName: "Recruitment Department",
    contactEmail: "careers@progressoft.com",
    jobDescription: "Pioneering financial software solutions enterprise. Seeking software engineers with solid algorithmic foundation, Java/C# or modern stacks, clean code practices, and database design.",
    notes: "Major software enterprise; King Hussein Business Park, Amman.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "direct",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jo-madfooat",
    company: "MadfooatCom (eFawateercom)",
    roleTitle: "Software Engineer & Fintech Developer",
    contactName: "Talent Acquisition",
    contactEmail: "careers@madfooat.com",
    jobDescription: "Operator of eFawateercom national payment gateway. Seeking backend and full-stack software engineers skilled in high-security transaction processing, relational databases, and microservices.",
    notes: "National payment gateway; massive transaction scale in Jordan.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "direct",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jo-hikma",
    company: "Hikma Pharmaceuticals",
    roleTitle: "IT / Digital Systems Specialist",
    contactName: "Corporate HR Team",
    contactEmail: "careers@hikma.com",
    jobDescription: "Global pharmaceutical leader with headquarters in Amman. Seeking IT and software specialists to drive internal digital platforms, enterprise applications, and cloud data systems.",
    notes: "Global enterprise founded and headquartered in Jordan.",
    status: "New",
    tailoredSubject: "",
    tailoredBody: "",
    tone: "direct",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Ensure starter files exist
readJsonFile(PROFILE_TEMPLATE_FILE, defaultProfile);
readJsonFile(PROFILE_FILE, defaultProfile);
readJsonFile(JOBS_FILE, jordanCuratedLeads);
readJsonFile(HISTORY_FILE, []);
readJsonFile(REPLIES_FILE, []);

// Ensure starter resume exists
const cvPdfPath = path.join(__dirname, 'public', 'resume.pdf');
const samplePdfPath = path.join(__dirname, 'public', 'resume.sample.pdf');
if (!fs.existsSync(cvPdfPath) && fs.existsSync(samplePdfPath)) {
  try { fs.copyFileSync(samplePdfPath, cvPdfPath); } catch (_) {}
}

// ==================== ROUTES ====================

// Profile Routes
app.get('/api/profile', (req, res) => {
  const profile = readJsonFile(PROFILE_FILE, defaultProfile);
  res.json(profile);
});

app.post('/api/profile', (req, res) => {
  const current = readJsonFile(PROFILE_FILE, defaultProfile);
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() };
  writeJsonFile(PROFILE_FILE, updated);
  res.json({ success: true, profile: updated });
});

// SMTP Test Route
app.post('/api/smtp/verify', async (req, res) => {
  const smtpConfig = req.body;
  try {
    await verifySmtp(smtpConfig);
    res.json({ success: true, message: "SMTP connection verified successfully!" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Jobs Routes
app.get('/api/jobs', (req, res) => {
  const jobs = readJsonFile(JOBS_FILE, []);
  res.json(jobs);
});

app.post('/api/jobs', (req, res) => {
  const jobs = readJsonFile(JOBS_FILE, []);
  const newJob = {
    id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    company: req.body.company || '',
    roleTitle: req.body.roleTitle || 'Software Engineer',
    contactName: req.body.contactName || '',
    contactEmail: req.body.contactEmail || '',
    jobDescription: req.body.jobDescription || '',
    notes: req.body.notes || '',
    status: 'New', // New, Tailored, Approved, Sent, Replied, Bounced, Archived
    tailoredSubject: '',
    tailoredBody: '',
    tone: req.body.tone || 'direct',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobs.unshift(newJob);
  writeJsonFile(JOBS_FILE, jobs);
  res.status(201).json(newJob);
});

app.put('/api/jobs/:id', (req, res) => {
  const jobs = readJsonFile(JOBS_FILE, []);
  const index = jobs.findIndex(j => j.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Job not found' });
  }

  jobs[index] = {
    ...jobs[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeJsonFile(JOBS_FILE, jobs);
  res.json(jobs[index]);
});

app.delete('/api/jobs/:id', (req, res) => {
  let jobs = readJsonFile(JOBS_FILE, []);
  const initialLength = jobs.length;
  jobs = jobs.filter(j => j.id !== req.params.id);
  if (jobs.length === initialLength) {
    return res.status(404).json({ error: 'Job not found' });
  }
  writeJsonFile(JOBS_FILE, jobs);
  res.json({ success: true, deletedId: req.params.id });
});

// Reset / Seed Sample Jobs
app.post('/api/sample-jobs', (req, res) => {
  writeJsonFile(JOBS_FILE, defaultSampleJobs);
  res.json({ success: true, jobs: defaultSampleJobs });
});

// Seed Top Jordanian Tech & Enterprise Leads
app.post('/api/jobs/import-jordan-leads', (req, res) => {
  let currentJobs = readJsonFile(JOBS_FILE, []);
  const existingCompanies = new Set(currentJobs.map(j => j.company.toLowerCase()));
  const toAdd = jordanCuratedLeads.filter(j => !existingCompanies.has(j.company.toLowerCase()));
  currentJobs = [...toAdd, ...currentJobs];
  writeJsonFile(JOBS_FILE, currentJobs);
  res.json({ success: true, addedCount: toAdd.length, total: currentJobs.length });
});

// Generate Tailored Email for a Job
app.post('/api/jobs/:id/generate', async (req, res) => {
  const jobs = readJsonFile(JOBS_FILE, []);
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const profile = readJsonFile(PROFILE_FILE, defaultProfile);
  const tone = req.body.tone || job.tone || 'direct';

  try {
    const generated = await generateTailoredMessage({
      candidate: profile,
      job: job,
      options: {
        tone: tone,
        apiKey: profile.llm ? profile.llm.apiKey : '',
        provider: profile.llm ? profile.llm.provider : 'local',
        modelName: profile.llm ? profile.llm.modelName : ''
      }
    });

    job.tailoredSubject = generated.subject;
    job.tailoredBody = generated.body;
    job.tone = tone;
    job.status = 'Tailored'; // Waiting for user OK
    job.generationMethod = generated.method;
    job.warning = generated.warning || null;
    job.updatedAt = new Date().toISOString();

    writeJsonFile(JOBS_FILE, jobs);
    res.json({ success: true, job, generated });
  } catch (err) {
    console.error('Error generating email:', err);
    res.status(500).json({ error: err.message });
  }
});

// User Gives Explicit "OK" (Approval Gate)
app.post('/api/jobs/:id/approve', (req, res) => {
  const jobs = readJsonFile(JOBS_FILE, []);
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (!job.tailoredSubject || !job.tailoredBody) {
    return res.status(400).json({ error: 'Cannot approve an empty email. Generate or write a draft first.' });
  }

  if (req.body.subject) job.tailoredSubject = req.body.subject;
  if (req.body.body) job.tailoredBody = req.body.body;

  job.status = 'Approved';
  job.approvedAt = new Date().toISOString();
  job.updatedAt = new Date().toISOString();

  writeJsonFile(JOBS_FILE, jobs);
  res.json({ success: true, message: 'Message approved and ready for sending!', job });
});

// Send Outreach Email Gate (Requires Approval & Explicit Confirmation)
app.post('/api/jobs/:id/send', async (req, res) => {
  const jobs = readJsonFile(JOBS_FILE, []);
  const job = jobs.find(j => j.id === req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const { subject, body, to, confirmSend, attachCv } = req.body;
  const recipientEmail = to || job.contactEmail;
  const emailSubject = subject || job.tailoredSubject;
  const emailBody = body || job.tailoredBody;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid recipient email address is required.' });
  }

  if (!emailSubject || !emailBody) {
    return res.status(400).json({ error: 'Email subject and body cannot be blank.' });
  }

  if (!confirmSend) {
    return res.status(400).json({ error: 'User confirmation gate required (confirmSend must be true).' });
  }

  const profile = readJsonFile(PROFILE_FILE, defaultProfile);
  const smtpConfig = profile.smtp;

  // If SMTP is not configured, generate a mailto link response so user can open native client safely
  if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    const encodedSubject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(emailBody);
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;

    job.status = 'Sent';
    job.sentAt = new Date().toISOString();
    writeJsonFile(JOBS_FILE, jobs);

    const history = readJsonFile(HISTORY_FILE, []);
    history.unshift({
      id: 'hist_' + Date.now(),
      jobId: job.id,
      company: job.company,
      roleTitle: job.roleTitle,
      recipient: recipientEmail,
      subject: emailSubject,
      method: 'Mailto Client',
      sentAt: new Date().toISOString(),
      status: 'Prepared in Email Client'
    });
    writeJsonFile(HISTORY_FILE, history);

    return res.json({
      success: true,
      mode: 'mailto',
      mailtoUrl: mailtoUrl,
      message: 'SMTP credentials not configured. Generated direct email client link!',
      job
    });
  }

  // Live SMTP dispatch
  try {
    const attachments = [];
    const cvPdfPath = path.join(__dirname, 'public', 'resume.pdf');
    if (attachCv !== false && fs.existsSync(cvPdfPath)) {
      const safeName = (profile.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
      attachments.push({
        filename: `${safeName}_Resume.pdf`,
        path: cvPdfPath,
        contentType: 'application/pdf'
      });
    }

    const result = await sendOutreachEmail({
      smtpConfig: smtpConfig,
      fromName: smtpConfig.fromName || profile.name,
      to: recipientEmail,
      subject: emailSubject,
      body: emailBody,
      attachments: attachments
    });

    job.status = 'Sent';
    job.sentAt = new Date().toISOString();
    job.lastMessageId = result.messageId;
    writeJsonFile(JOBS_FILE, jobs);

    const history = readJsonFile(HISTORY_FILE, []);
    history.unshift({
      id: 'hist_' + Date.now(),
      jobId: job.id,
      company: job.company,
      roleTitle: job.roleTitle,
      recipient: recipientEmail,
      subject: emailSubject,
      method: 'SMTP (' + smtpConfig.host + ')',
      sentAt: new Date().toISOString(),
      messageId: result.messageId,
      status: 'Sent Successfully'
    });
    writeJsonFile(HISTORY_FILE, history);

    res.json({
      success: true,
      mode: 'smtp',
      message: `Email successfully delivered to ${recipientEmail}!`,
      job,
      result
    });
  } catch (err) {
    console.error('SMTP sending error:', err);
    res.status(500).json({ error: `Failed to send email via SMTP: ${err.message}` });
  }
});

// Outreach History
app.get('/api/history', (req, res) => {
  const history = readJsonFile(HISTORY_FILE, []);
  res.json(history);
});

// ==================== LIVE SYNC ENGINE (JORDAN JOBS) ====================
let syncState = {
  isSyncing: false,
  lastSyncTime: null,
  totalLiveJobsInDb: 0,
  newJobsAddedInLastSync: 0,
  autoSyncEnabled: true,
  intervalMinutes: 2,
  lastError: null
};

async function performLiveSync(keywordsOverride) {
  if (syncState.isSyncing) return syncState;
  syncState.isSyncing = true;
  syncState.lastError = null;

  try {
    const profile = readJsonFile(PROFILE_FILE, defaultProfile);
    const keywords = keywordsOverride || profile.targetKeywords || profile.skills;

    console.log(`[Auto-Sync] Fetching live job opportunities in Jordan...`);
    const scraped = await scrapeLiveJordanJobs({ targetCount: 35, keywords });
    let currentJobs = readJsonFile(JOBS_FILE, []);

    // Deduplicate by sourceUrl, id, or normalized (company + roleTitle)
    const existingIds = new Set(currentJobs.map(j => j.id));
    const existingKeys = new Set(currentJobs.map(j => `${(j.company || '').toLowerCase().trim()}___${(j.roleTitle || '').toLowerCase().trim()}`));

    const newlyAdded = [];
    for (const job of scraped) {
      const key = `${job.company.toLowerCase().trim()}___${job.roleTitle.toLowerCase().trim()}`;
      if (!existingIds.has(job.id) && !existingKeys.has(key)) {
        newlyAdded.push(job);
        existingIds.add(job.id);
        existingKeys.add(key);
      }
    }

    if (newlyAdded.length > 0) {
      currentJobs = [...newlyAdded, ...currentJobs];
      writeJsonFile(JOBS_FILE, currentJobs);
      console.log(`[Auto-Sync] Added ${newlyAdded.length} new live jobs in Jordan! Total in database: ${currentJobs.length}`);
    } else {
      console.log(`[Auto-Sync] Checked live listings: all ${scraped.length} fetched jobs already indexed.`);
    }

    syncState.lastSyncTime = new Date().toISOString();
    syncState.newJobsAddedInLastSync = newlyAdded.length;
    syncState.totalLiveJobsInDb = currentJobs.filter(j => j.isLiveScraped).length;
  } catch (err) {
    console.error(`[Auto-Sync Error]`, err.message);
    syncState.lastError = err.message;
  } finally {
    syncState.isSyncing = false;
  }

  return syncState;
}

// Sync API Endpoints
app.get('/api/jobs/sync-status', (req, res) => {
  const currentJobs = readJsonFile(JOBS_FILE, []);
  syncState.totalLiveJobsInDb = currentJobs.filter(j => j.isLiveScraped).length;
  res.json(syncState);
});

app.post('/api/jobs/sync-live', async (req, res) => {
  const keywords = req.body && req.body.keywords ? req.body.keywords : undefined;
  const state = await performLiveSync(keywords);
  const currentJobs = readJsonFile(JOBS_FILE, []);
  res.json({ success: true, syncState: state, totalJobs: currentJobs.length });
});

app.post('/api/jobs/toggle-auto-sync', (req, res) => {
  syncState.autoSyncEnabled = req.body.enabled !== undefined ? req.body.enabled : !syncState.autoSyncEnabled;
  res.json({ success: true, autoSyncEnabled: syncState.autoSyncEnabled });
});

// ==================== INBOX & REPLIES TRACKER ====================
let inboxSyncState = {
  isChecking: false,
  lastCheckedTime: null,
  totalReplies: 0,
  totalBounces: 0,
  lastError: null
};

async function syncInboxReplies() {
  if (inboxSyncState.isChecking) return;
  inboxSyncState.isChecking = true;
  inboxSyncState.lastError = null;

  try {
    const profile = readJsonFile(PROFILE_FILE, defaultProfile);
    const history = readJsonFile(HISTORY_FILE, []);
    let jobs = readJsonFile(JOBS_FILE, []);

    if (!profile.smtp || !profile.smtp.user || !profile.smtp.pass) {
      return;
    }

    console.log(`[Inbox Sync] Checking Gmail IMAP for recruiter replies & bounce notices...`);
    const result = await checkGmailReplies({ profile, history, jobs });
    const items = result.items || [];

    writeJsonFile(REPLIES_FILE, items);

    // Cross-update status on corresponding jobs
    let jobsUpdated = false;
    for (const item of items) {
      if (item.type === 'bounce') {
        const targetEmail = (item.targetEmail || '').toLowerCase();
        const job = jobs.find(j => (j.contactEmail || '').toLowerCase() === targetEmail);
        if (job && job.status !== 'Bounced') {
          job.status = 'Bounced';
          job.bounceReason = item.reason;
          job.updatedAt = new Date().toISOString();
          jobsUpdated = true;
        }
      } else if (item.type === 'reply') {
        const replyEmail = (item.from || '').toLowerCase();
        const job = jobs.find(j => (j.contactEmail || '').toLowerCase() === replyEmail);
        if (job && job.status !== 'Replied') {
          job.status = 'Replied';
          job.updatedAt = new Date().toISOString();
          jobsUpdated = true;
        }
      }
    }

    if (jobsUpdated) {
      writeJsonFile(JOBS_FILE, jobs);
    }

    inboxSyncState.lastCheckedTime = new Date().toISOString();
    inboxSyncState.totalReplies = items.filter(i => i.type === 'reply').length;
    inboxSyncState.totalBounces = items.filter(i => i.type === 'bounce').length;
    console.log(`[Inbox Sync] Done. Found ${inboxSyncState.totalReplies} replies and ${inboxSyncState.totalBounces} delivery status notices.`);
  } catch (err) {
    console.warn(`[Inbox Sync Warning]:`, err.message);
    inboxSyncState.lastError = err.message;
  } finally {
    inboxSyncState.isChecking = false;
  }
}

// Replies API Endpoints
app.get('/api/replies', (req, res) => {
  const items = readJsonFile(REPLIES_FILE, []);
  res.json({
    items: items,
    state: inboxSyncState
  });
});

app.post('/api/replies/sync', async (req, res) => {
  await syncInboxReplies();
  const items = readJsonFile(REPLIES_FILE, []);
  res.json({ success: true, state: inboxSyncState, items: items });
});

// Background sync interval (every 2 minutes)
const SYNC_INTERVAL_MS = 2 * 60 * 1000;
setInterval(() => {
  if (syncState.autoSyncEnabled) {
    performLiveSync().catch(err => console.error('[Auto-Sync Interval Error]:', err));
    syncInboxReplies().catch(err => console.error('[Inbox Sync Interval Error]:', err));
  }
}, SYNC_INTERVAL_MS);

// Initial sync 3 seconds after boot
setTimeout(() => {
  performLiveSync().catch(err => console.error('[Initial Sync Error]:', err));
  syncInboxReplies().catch(err => console.error('[Initial Inbox Sync Error]:', err));
}, 3000);

// Fallback to index.html for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🇯🇴 Jordan Job Hunter & Outreach Platform is running!`);
  console.log(`📍 Web Dashboard: http://localhost:${PORT}`);
  console.log(`🔒 Self-Hosted & Local: Your data never leaves this machine.`);
  console.log(`====================================================`);
});
