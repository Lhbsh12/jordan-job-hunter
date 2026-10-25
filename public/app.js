// Global State
let currentJobs = [];
let currentProfile = {};
let activeReviewJob = null;
let pendingSendJob = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  await loadJobs();
  await fetchHistory();
  await checkSyncStatus();
  await loadReplies();
  // Poll sync status & replies every 15 seconds
  setInterval(() => {
    checkSyncStatus();
    loadReplies(false);
  }, 15000);
});

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const msg = document.getElementById('toast-message');

  msg.textContent = message;

  // reset classes
  toast.className = 'fixed bottom-5 right-5 z-50 transform transition-all duration-300 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-xl border ';

  if (type === 'success') {
    toast.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-900');
    icon.className = 'fa-solid fa-circle-check text-emerald-600 text-lg';
  } else if (type === 'error') {
    toast.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-900');
    icon.className = 'fa-solid fa-circle-exclamation text-rose-600 text-lg';
  } else if (type === 'info') {
    toast.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-900');
    icon.className = 'fa-solid fa-circle-info text-blue-600 text-lg';
  } else {
    toast.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-900');
    icon.className = 'fa-solid fa-triangle-exclamation text-amber-600 text-lg';
  }

  // show toast
  toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
  }, 4000);
}

// Tab navigation
function switchTab(tabId) {
  const tabs = ['jobs', 'profile', 'settings', 'history', 'inbox'];
  tabs.forEach(t => {
    const pane = document.getElementById(`tab-content-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (t === tabId) {
      pane.classList.remove('hidden');
      pane.classList.add('block');
      btn.className = 'tab-btn active px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 bg-blue-50 text-blue-700';
    } else {
      pane.classList.remove('block');
      pane.classList.add('hidden');
      btn.className = 'tab-btn px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100';
    }
  });

  if (tabId === 'history') {
    fetchHistory();
  }
  if (tabId === 'inbox') {
    loadReplies();
  }
}

// ==================== PROFILE FUNCTIONS ====================
async function loadProfile() {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) throw new Error('Failed to load candidate profile');
    currentProfile = await res.json();

    document.getElementById('prof-name').value = currentProfile.name || '';
    document.getElementById('prof-email').value = currentProfile.email || '';
    document.getElementById('prof-phone').value = currentProfile.phone || '';
    document.getElementById('prof-major').value = currentProfile.major || 'Computer Science';
    document.getElementById('prof-degree').value = currentProfile.degree || 'B.S.';
    document.getElementById('prof-university').value = currentProfile.university || '';
    if (document.getElementById('prof-targetKeywords')) {
      document.getElementById('prof-targetKeywords').value = currentProfile.targetKeywords || '';
    }
    document.getElementById('prof-github').value = currentProfile.github || '';
    document.getElementById('prof-linkedin').value = currentProfile.linkedin || '';
    document.getElementById('prof-portfolio').value = currentProfile.portfolio || '';
    document.getElementById('prof-skills').value = currentProfile.skills || '';
    document.getElementById('prof-projects').value = currentProfile.projects || '';
    document.getElementById('prof-experience').value = currentProfile.experience || '';
    document.getElementById('prof-resumeText').value = currentProfile.resumeText || '';

    const inboxEmailLabel = document.getElementById('inbox-email-label');
    if (inboxEmailLabel) {
      inboxEmailLabel.textContent = (currentProfile.smtp && currentProfile.smtp.user) ? currentProfile.smtp.user : (currentProfile.email || 'Configure email in Settings');
    }

    // Load SMTP settings
    if (currentProfile.smtp) {
      document.getElementById('smtp-host').value = currentProfile.smtp.host || 'smtp.gmail.com';
      document.getElementById('smtp-port').value = currentProfile.smtp.port || '465';
      document.getElementById('smtp-secure').checked = currentProfile.smtp.secure !== false;
      document.getElementById('smtp-user').value = currentProfile.smtp.user || '';
      document.getElementById('smtp-pass').value = currentProfile.smtp.pass || '';
      document.getElementById('smtp-fromName').value = currentProfile.smtp.fromName || currentProfile.name || '';
    }

    // Load AI settings
    if (currentProfile.llm) {
      document.getElementById('ai-provider').value = currentProfile.llm.provider || 'local';
      document.getElementById('ai-key').value = currentProfile.llm.apiKey || '';
      document.getElementById('ai-model').value = currentProfile.llm.modelName || '';
      handleAiProviderChange();
    }
  } catch (err) {
    showToast(`Error loading profile: ${err.message}`, 'error');
  }
}

async function saveProfile() {
  const updatedData = {
    name: document.getElementById('prof-name').value.trim(),
    email: document.getElementById('prof-email').value.trim(),
    phone: document.getElementById('prof-phone').value.trim(),
    major: document.getElementById('prof-major').value.trim(),
    degree: document.getElementById('prof-degree').value,
    university: document.getElementById('prof-university').value.trim(),
    targetKeywords: document.getElementById('prof-targetKeywords') ? document.getElementById('prof-targetKeywords').value.trim() : '',
    github: document.getElementById('prof-github').value.trim(),
    linkedin: document.getElementById('prof-linkedin').value.trim(),
    portfolio: document.getElementById('prof-portfolio').value.trim(),
    skills: document.getElementById('prof-skills').value.trim(),
    projects: document.getElementById('prof-projects').value.trim(),
    experience: document.getElementById('prof-experience').value.trim(),
    resumeText: document.getElementById('prof-resumeText').value.trim()
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save');
    currentProfile = data.profile;
    showToast('Candidate Profile & Resume updated successfully!', 'success');
  } catch (err) {
    showToast(`Error saving profile: ${err.message}`, 'error');
  }
}

// SMTP settings save
async function saveSmtp() {
  const smtp = {
    host: document.getElementById('smtp-host').value.trim(),
    port: parseInt(document.getElementById('smtp-port').value, 10) || 465,
    secure: document.getElementById('smtp-secure').checked,
    user: document.getElementById('smtp-user').value.trim(),
    pass: document.getElementById('smtp-pass').value.trim(),
    fromName: document.getElementById('smtp-fromName').value.trim()
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save SMTP');
    currentProfile.smtp = smtp;
    showToast('SMTP settings saved successfully!', 'success');
  } catch (err) {
    showToast(`Error saving SMTP: ${err.message}`, 'error');
  }
}

async function testSmtpConnection() {
  const smtp = {
    host: document.getElementById('smtp-host').value.trim(),
    port: parseInt(document.getElementById('smtp-port').value, 10) || 465,
    secure: document.getElementById('smtp-secure').checked,
    user: document.getElementById('smtp-user').value.trim(),
    pass: document.getElementById('smtp-pass').value.trim()
  };

  if (!smtp.host || !smtp.user || !smtp.pass) {
    showToast('Please fill in Host, Username, and Password before testing.', 'error');
    return;
  }

  showToast('Testing SMTP connection with mail server...', 'info');
  try {
    const res = await fetch('/api/smtp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smtp)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Connection failed');
    showToast('SMTP Connection Successful! Ready to send.', 'success');
  } catch (err) {
    showToast(`SMTP Connection Failed: ${err.message}`, 'error');
  }
}

function handleAiProviderChange() {
  const provider = document.getElementById('ai-provider').value;
  const keyContainer = document.getElementById('ai-key-container');
  if (provider === 'local') {
    keyContainer.classList.add('opacity-40', 'pointer-events-none');
  } else {
    keyContainer.classList.remove('opacity-40', 'pointer-events-none');
  }
}

async function saveAiSettings() {
  const llm = {
    provider: document.getElementById('ai-provider').value,
    apiKey: document.getElementById('ai-key').value.trim(),
    modelName: document.getElementById('ai-model').value.trim()
  };

  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llm })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save AI settings');
    currentProfile.llm = llm;
    showToast('AI Provider preferences saved!', 'success');
  } catch (err) {
    showToast(`Error saving AI settings: ${err.message}`, 'error');
  }
}

// ==================== JOBS FUNCTIONS ====================
async function loadJobs() {
  try {
    const res = await fetch('/api/jobs');
    if (!res.ok) throw new Error('Failed to fetch jobs');
    currentJobs = await res.json();
    document.getElementById('jobs-count-badge').textContent = currentJobs.length;
    renderJobsList(currentJobs);
  } catch (err) {
    showToast(`Error loading jobs: ${err.message}`, 'error');
  }
}

let currentRoleFilter = '';
function applyRoleFilter(category) {
  currentRoleFilter = (category || '').toLowerCase().trim();
  document.querySelectorAll('.role-chip').forEach(btn => {
    btn.className = 'role-chip px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium whitespace-nowrap';
  });
  if (event && event.currentTarget) {
    event.currentTarget.className = 'role-chip active px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium whitespace-nowrap';
  }
  filterJobs();
}

function filterJobs() {
  const query = document.getElementById('job-search-input').value.toLowerCase().trim();
  const statusFilter = document.getElementById('status-filter').value;

  const filtered = currentJobs.filter(job => {
    const text = `${job.company} ${job.roleTitle} ${job.contactName || ''} ${job.contactEmail} ${job.jobDescription || ''}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    const matchesCategory = !currentRoleFilter || text.includes(currentRoleFilter);

    return matchesQuery && matchesStatus && matchesCategory;
  });

  renderJobsList(filtered);
}

function renderJobsList(jobs) {
  const container = document.getElementById('jobs-container');
  const emptyState = document.getElementById('no-jobs-state');

  if (!jobs || jobs.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = jobs.map(job => {
    // Status badge style
    let statusBadge = '';
    if (job.status === 'Sent') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center space-x-1"><i class="fa-solid fa-check-double text-[10px]"></i><span>Sent</span></span>';
    } else if (job.status === 'Approved') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1"><i class="fa-solid fa-thumbs-up text-[10px]"></i><span>Approved (Ready)</span></span>';
    } else if (job.status === 'Tailored') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center space-x-1"><i class="fa-solid fa-pen-ruler text-[10px]"></i><span>Tailored (Needs OK)</span></span>';
    } else if (job.status === 'Bounced') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center space-x-1"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i><span>Bounced</span></span>';
    } else if (job.status === 'Replied') {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 flex items-center space-x-1"><i class="fa-solid fa-reply text-[10px]"></i><span>Replied!</span></span>';
    } else {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">New</span>';
    }

    // Has tailored draft?
    const hasDraft = Boolean(job.tailoredSubject && job.tailoredBody);
    const hasEmail = Boolean(job.contactEmail && job.contactEmail.includes('@'));

    return `
      <div class="bg-white rounded-xl shadow-sm border ${job.status === 'Bounced' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'} hover:shadow-md transition-shadow flex flex-col justify-between p-5 space-y-4">
        <!-- Top Info -->
        <div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-blue-600">${escapeHtml(job.company)}</span>
              <h3 class="text-base font-bold text-slate-900 leading-snug">${escapeHtml(job.roleTitle)}</h3>
            </div>
            <div>${statusBadge}</div>
          </div>

          <!-- Contact / Email Status -->
          ${hasEmail ? `
            <div class="mt-3 flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2 text-slate-700 truncate">
                <i class="fa-regular fa-envelope ${job.emailType === 'verified_in_post' ? 'text-emerald-500' : 'text-blue-500'}"></i>
                <span class="font-semibold text-slate-800">${escapeHtml(job.contactEmail)}</span>
                ${job.contactName ? `<span class="text-slate-400">(${escapeHtml(job.contactName)})</span>` : ''}
              </div>
              <span class="px-1.5 py-0.5 text-[9px] font-bold ${job.emailType === 'verified_in_post' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'} rounded">
                ${job.emailType === 'verified_in_post' ? 'Verified in Post' : 'Direct Email'}
              </span>
            </div>
          ` : `
            <div class="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
              <span class="text-amber-900 font-medium flex items-center space-x-1.5 text-[11px]">
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-amber-600"></i>
                <span>Direct Portal Apply (No Public Email)</span>
              </span>
              <button onclick="openEditJobModal('${job.id}')" class="text-[11px] text-blue-700 hover:underline font-bold">
                + Add Email
              </button>
            </div>
          `}

          ${job.status === 'Bounced' ? `
            <div class="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start space-x-2">
              <i class="fa-solid fa-triangle-exclamation text-rose-600 mt-0.5 text-xs"></i>
              <div>
                <p class="font-bold text-[10px] uppercase tracking-wider text-rose-800">Gmail Delivery Failure Notice:</p>
                <p class="mt-0.5 text-[11px] leading-relaxed">${escapeHtml(job.bounceReason || 'Delivery rejected by recipient mail server.')}</p>
              </div>
            </div>
          ` : ''}

          ${job.isLiveScraped ? `
            <div class="mt-2.5 flex items-center space-x-2">
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center space-x-1">
                <i class="fa-solid fa-bolt text-indigo-500 text-[9px]"></i>
                <span>Live Web Scraped</span>
              </span>
              ${job.sourceUrl ? `
                <a href="${escapeHtml(job.sourceUrl)}" target="_blank" class="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1">
                  <span>View Post</span>
                  <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                </a>
              ` : ''}
            </div>
          ` : ''}

          <!-- Job description snippet -->
          <p class="mt-3 text-xs text-slate-500 line-clamp-3 leading-relaxed">
            ${escapeHtml(job.jobDescription)}
          </p>
        </div>

        <!-- Tailored Preview snippet if exists -->
        ${hasDraft ? `
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs text-slate-700">
            <div class="font-bold text-[11px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center space-x-1">
              <i class="fa-solid fa-envelope-open-text text-indigo-500"></i>
              <span>Draft Subject:</span>
            </div>
            <p class="truncate font-medium text-slate-800">${escapeHtml(job.tailoredSubject)}</p>
          </div>
        ` : ''}

        <!-- Bottom Action Buttons -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div class="flex items-center space-x-1">
            <button onclick="openEditJobModal('${escapeHtml(job.id)}')" class="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100" title="Edit Job Details">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deleteJob('${escapeHtml(job.id)}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100" title="Delete Job">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>

          <div class="flex items-center space-x-2">
            ${!hasEmail ? `
              ${job.sourceUrl ? `
                <a href="${escapeHtml(job.sourceUrl)}" target="_blank" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5">
                  <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  <span>Apply on Portal</span>
                </a>
              ` : ''}
              <button onclick="openEditJobModal('${escapeHtml(job.id)}')" class="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg">
                <span>Add Email</span>
              </button>
            ` : !hasDraft ? `
              <button onclick="generateEmailForJob('${escapeHtml(job.id)}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5">
                <i class="fa-solid fa-wand-magic-sparkles text-[11px]"></i>
                <span>Tailor Email</span>
              </button>
            ` : `
              <button onclick="openReviewModal('${escapeHtml(job.id)}')" class="px-3 py-1.5 ${job.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'} text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5" title="Review draft and give your OK">
                <i class="fa-solid fa-signature text-[11px]"></i>
                <span>${job.status === 'Approved' ? 'Approved (View)' : 'Review & OK'}</span>
              </button>
              <button onclick="promptSendDirectly('${escapeHtml(job.id)}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5">
                <i class="fa-solid fa-paper-plane text-[10px]"></i>
                <span>Send</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Add/Edit Job Modal
function openAddJobModal() {
  document.getElementById('modal-job-id').value = '';
  document.getElementById('job-modal-title').textContent = 'Add Target Data Science Role';
  document.getElementById('modal-company').value = '';
  document.getElementById('modal-roleTitle').value = 'Data Scientist';
  document.getElementById('modal-contactName').value = '';
  document.getElementById('modal-contactEmail').value = '';
  document.getElementById('modal-jobDescription').value = '';
  document.getElementById('modal-notes').value = '';
  document.getElementById('modal-tone').value = 'direct';

  document.getElementById('job-modal').classList.remove('hidden');
}

function openEditJobModal(jobId) {
  const job = currentJobs.find(j => j.id === jobId);
  if (!job) return;

  document.getElementById('modal-job-id').value = job.id;
  document.getElementById('job-modal-title').textContent = `Edit Job: ${job.company}`;
  document.getElementById('modal-company').value = job.company;
  document.getElementById('modal-roleTitle').value = job.roleTitle;
  document.getElementById('modal-contactName').value = job.contactName || '';
  document.getElementById('modal-contactEmail').value = job.contactEmail;
  document.getElementById('modal-jobDescription').value = job.jobDescription;
  document.getElementById('modal-notes').value = job.notes || '';
  document.getElementById('modal-tone').value = job.tone || 'direct';

  document.getElementById('job-modal').classList.remove('hidden');
}

function closeAddJobModal() {
  document.getElementById('job-modal').classList.add('hidden');
}

async function submitJobForm() {
  const id = document.getElementById('modal-job-id').value;
  const payload = {
    company: document.getElementById('modal-company').value.trim(),
    roleTitle: document.getElementById('modal-roleTitle').value.trim(),
    contactName: document.getElementById('modal-contactName').value.trim(),
    contactEmail: document.getElementById('modal-contactEmail').value.trim(),
    jobDescription: document.getElementById('modal-jobDescription').value.trim(),
    notes: document.getElementById('modal-notes').value.trim(),
    tone: document.getElementById('modal-tone').value
  };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) throw new Error('Failed to save job');
    closeAddJobModal();
    showToast(id ? 'Job details updated!' : 'New Data Science role added!', 'success');
    await loadJobs();
  } catch (err) {
    showToast(`Error saving job: ${err.message}`, 'error');
  }
}

async function deleteJob(jobId) {
  if (!confirm('Are you sure you want to delete this job lead?')) return;
  try {
    const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete job');
    showToast('Job removed from target list.', 'info');
    await loadJobs();
  } catch (err) {
    showToast(`Error deleting: ${err.message}`, 'error');
  }
}

async function seedSampleJobs() {
  try {
    const res = await fetch('/api/sample-jobs', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed sample jobs');
    showToast('Loaded 3 sample Data Science target leads!', 'success');
    await loadJobs();
  } catch (err) {
    showToast(`Error seeding jobs: ${err.message}`, 'error');
  }
}

async function seedJordanLeads() {
  try {
    const res = await fetch('/api/jobs/import-jordan-leads', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to import Jordan leads');
    showToast(`Imported ${data.addedCount} top Jordanian Data Science & Tech targets!`, 'success');
    await loadJobs();
  } catch (err) {
    showToast(`Error importing Jordan leads: ${err.message}`, 'error');
  }
}

// ==================== GENERATE & REVIEW & APPROVE (THE OK GATE) ====================
async function generateEmailForJob(jobId, toneOverride) {
  const job = currentJobs.find(j => j.id === jobId);
  if (!job) return;

  showToast(`Generating tailored Data Science email for ${job.company}...`, 'info');

  try {
    const res = await fetch(`/api/jobs/${jobId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone: toneOverride || job.tone || 'direct' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    showToast(`Tailored email draft generated! Opening for your review...`, 'success');
    await loadJobs();
    openReviewModal(jobId);
  } catch (err) {
    showToast(`Generation failed: ${err.message}`, 'error');
  }
}

function openReviewModal(jobId) {
  const job = currentJobs.find(j => j.id === jobId);
  if (!job) return;

  activeReviewJob = job;

  document.getElementById('review-company').textContent = job.company;
  document.getElementById('review-role').textContent = job.roleTitle;
  document.getElementById('review-recipient').textContent = job.contactEmail + (job.contactName ? ` (${job.contactName})` : '');
  document.getElementById('review-tone-select').value = job.tone || 'direct';

  document.getElementById('review-subject').value = job.tailoredSubject || '';
  document.getElementById('review-body').value = job.tailoredBody || '';

  const statusBadge = document.getElementById('review-status-badge');
  if (job.status === 'Approved') {
    statusBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800';
    statusBadge.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Approved by You';
  } else if (job.status === 'Sent') {
    statusBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800';
    statusBadge.innerHTML = '<i class="fa-solid fa-paper-plane mr-1"></i>Sent';
  } else {
    statusBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800';
    statusBadge.innerHTML = '<i class="fa-solid fa-pen-ruler mr-1"></i>Pending Your OK';
  }

  const genBadge = document.getElementById('generation-source-badge');
  genBadge.textContent = job.generationMethod ? `Generated via: ${job.generationMethod}` : '';

  const safeName = (currentProfile.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const attachLabel = document.getElementById('review-attachment-name');
  if (attachLabel) {
    attachLabel.innerHTML = `Attach CV PDF (<code class="bg-slate-200 px-1 py-0.5 rounded text-slate-800">${safeName}_Resume.pdf</code>)`;
  }

  document.getElementById('review-modal').classList.remove('hidden');
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
  activeReviewJob = null;
}

async function regenerateFromReviewModal() {
  if (!activeReviewJob) return;
  const newTone = document.getElementById('review-tone-select').value;
  await generateEmailForJob(activeReviewJob.id, newTone);
}

// User explicitly clicks "I Give My OK (Approve)"
async function approveMessageOnly() {
  if (!activeReviewJob) return;

  const subject = document.getElementById('review-subject').value.trim();
  const body = document.getElementById('review-body').value.trim();

  if (!subject || !body) {
    showToast('Subject and body cannot be empty.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/jobs/${activeReviewJob.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to approve');

    showToast('Message approved! Status set to Approved.', 'success');
    closeReviewModal();
    await loadJobs();
  } catch (err) {
    showToast(`Approval failed: ${err.message}`, 'error');
  }
}

// User clicks "Approve & Send Now"
function confirmAndSendApproved() {
  if (!activeReviewJob) return;
  const subject = document.getElementById('review-subject').value.trim();
  const body = document.getElementById('review-body').value.trim();

  if (!subject || !body) {
    showToast('Subject and body cannot be empty.', 'error');
    return;
  }

  const attachCv = document.getElementById('review-attach-cv') ? document.getElementById('review-attach-cv').checked : true;

  pendingSendJob = {
    ...activeReviewJob,
    tailoredSubject: subject,
    tailoredBody: body,
    attachCv: attachCv
  };

  const badge = document.getElementById('confirm-send-attachment-badge');
  if (badge) {
    if (attachCv) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  const safeName = (currentProfile.name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const confirmAttachLabel = document.getElementById('confirm-send-attachment-label');
  if (confirmAttachLabel) {
    confirmAttachLabel.innerHTML = `Attached: <strong>${safeName}_Resume.pdf</strong>`;
  }

  document.getElementById('confirm-send-email').textContent = `${pendingSendJob.contactEmail} (${pendingSendJob.company})`;
  document.getElementById('confirm-send-modal').classList.remove('hidden');
}

function promptSendDirectly(jobId) {
  const job = currentJobs.find(j => j.id === jobId);
  if (!job) return;

  pendingSendJob = job;
  document.getElementById('confirm-send-email').textContent = `${pendingSendJob.contactEmail} (${pendingSendJob.company})`;
  document.getElementById('confirm-send-modal').classList.remove('hidden');
}

function closeConfirmSendModal() {
  document.getElementById('confirm-send-modal').classList.add('hidden');
  pendingSendJob = null;
}

// Send execution
async function executeDispatch() {
  if (!pendingSendJob) return;

  const btn = document.getElementById('execute-dispatch-btn');
  const originalBtnText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Sending...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/jobs/${pendingSendJob.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: pendingSendJob.tailoredSubject,
        body: pendingSendJob.tailoredBody,
        to: pendingSendJob.contactEmail,
        confirmSend: true,
        attachCv: pendingSendJob.attachCv !== false
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send outreach');

    if (data.mode === 'mailto') {
      showToast('Opening in your desktop email client...', 'info');
      window.location.href = data.mailtoUrl;
    } else {
      showToast(`Outreach email dispatched successfully to ${pendingSendJob.contactEmail}!`, 'success');
    }

    closeConfirmSendModal();
    closeReviewModal();
    await loadJobs();
    await fetchHistory();
  } catch (err) {
    showToast(`Send Error: ${err.message}`, 'error');
  } finally {
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
}

// Quick helper: Open in mail client from review modal
function openInDesktopMail() {
  if (!activeReviewJob) return;
  const subject = encodeURIComponent(document.getElementById('review-subject').value.trim());
  const body = encodeURIComponent(document.getElementById('review-body').value.trim());
  const email = activeReviewJob.contactEmail;

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  showToast('Launched desktop mail client!', 'info');
}

// Quick helper: Copy to clipboard
function copyReviewToClipboard() {
  const subject = document.getElementById('review-subject').value.trim();
  const body = document.getElementById('review-body').value.trim();
  const fullText = `Subject: ${subject}\n\n${body}`;

  navigator.clipboard.writeText(fullText).then(() => {
    showToast('Email Subject and Body copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

// ==================== HISTORY AUDIT ====================
async function fetchHistory() {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Failed to fetch history');
    const history = await res.json();
    renderHistoryTable(history);
  } catch (err) {
    console.error('Error fetching history:', err);
  }
}

function renderHistoryTable(history) {
  const tbody = document.getElementById('history-tbody');
  const empty = document.getElementById('no-history-state');

  if (!history || history.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = history.map(item => {
    const dateFormatted = new Date(item.sentAt).toLocaleString();
    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">${dateFormatted}</td>
        <td class="py-3 px-4">
          <span class="font-bold text-slate-800">${escapeHtml(item.company)}</span>
          <span class="text-slate-400 block text-[11px]">${escapeHtml(item.roleTitle)}</span>
        </td>
        <td class="py-3 px-4 text-blue-700 font-medium">${escapeHtml(item.recipient)}</td>
        <td class="py-3 px-4 text-slate-700 max-w-xs truncate">${escapeHtml(item.subject)}</td>
        <td class="py-3 px-4 text-slate-500 font-mono text-[11px]">${escapeHtml(item.method || 'Direct')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            ${escapeHtml(item.status || 'Delivered')}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Utility: HTML escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==================== LIVE SYNC & AUTO-UPDATE LOGIC ====================
let lastKnownLiveCount = -1;

async function checkSyncStatus() {
  try {
    const res = await fetch('/api/jobs/sync-status');
    if (!res.ok) return;
    const status = await res.json();

    const ping = document.getElementById('sync-ping');
    const dot = document.getElementById('sync-dot');
    const statusText = document.getElementById('sync-status-text');
    const lastTime = document.getElementById('sync-last-time');
    const checkbox = document.getElementById('auto-sync-checkbox');
    const syncBtn = document.getElementById('sync-now-btn');
    const syncIcon = document.getElementById('sync-now-icon');

    if (checkbox) checkbox.checked = Boolean(status.autoSyncEnabled);

    if (status.isSyncing) {
      if (statusText) statusText.textContent = 'Syncing Web (Amman, Jordan)...';
      if (ping) ping.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75';
      if (dot) dot.className = 'relative inline-flex rounded-full h-3 w-3 bg-blue-500';
      if (syncIcon) syncIcon.className = 'fa-solid fa-arrows-rotate fa-spin text-[11px]';
    } else {
      if (status.autoSyncEnabled) {
        if (statusText) statusText.textContent = `Live Auto-Sync Active (Every ${status.intervalMinutes || 2}m)`;
        if (ping) ping.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
        if (dot) dot.className = 'relative inline-flex rounded-full h-3 w-3 bg-emerald-500';
      } else {
        if (statusText) statusText.textContent = 'Auto-Sync Paused (Manual Mode)';
        if (ping) ping.className = 'hidden';
        if (dot) dot.className = 'relative inline-flex rounded-full h-3 w-3 bg-slate-500';
      }
      if (syncIcon) syncIcon.className = 'fa-solid fa-arrows-rotate text-[11px]';
    }

    if (lastTime && status.lastSyncTime) {
      const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(status.lastSyncTime).getTime()) / 60000));
      const agoText = minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`;
      lastTime.textContent = `Last sync: ${agoText} • ${status.totalLiveJobsInDb} Live Jordan Jobs`;
    }

    // Auto-refresh jobs if new live jobs were discovered!
    if (lastKnownLiveCount !== -1 && status.totalLiveJobsInDb > lastKnownLiveCount) {
      showToast(`⚡ Discovered ${status.totalLiveJobsInDb - lastKnownLiveCount} new live Data Science opening(s) in Jordan!`, 'success');
      await loadJobs();
    }
    lastKnownLiveCount = status.totalLiveJobsInDb;
  } catch (err) {
    console.warn('Sync status poll error:', err);
  }
}

async function triggerManualSync() {
  const icon = document.getElementById('sync-now-icon');
  if (icon) icon.className = 'fa-solid fa-arrows-rotate fa-spin text-[11px]';

  showToast('Connecting to web & scraping fresh jobs in Jordan...', 'info');

  try {
    const keywords = currentProfile.targetKeywords || currentProfile.skills;
    const res = await fetch('/api/jobs/sync-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sync request failed');

    const added = data.syncState ? data.syncState.newJobsAddedInLastSync : 0;
    if (added > 0) {
      showToast(`Added ${added} brand new live jobs in Jordan!`, 'success');
    } else {
      showToast('Sync complete! All active listings are up to date.', 'success');
    }

    await loadJobs();
    await checkSyncStatus();
  } catch (err) {
    showToast(`Sync error: ${err.message}`, 'error');
  } finally {
    if (icon) icon.className = 'fa-solid fa-arrows-rotate text-[11px]';
  }
}

async function toggleAutoSyncSetting() {
  const checkbox = document.getElementById('auto-sync-checkbox');
  const enabled = checkbox.checked;

  try {
    const res = await fetch('/api/jobs/toggle-auto-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to toggle auto sync');

    showToast(data.autoSyncEnabled ? 'Auto-sync enabled (every 2 minutes)' : 'Auto-sync paused', 'info');
    await checkSyncStatus();
  } catch (err) {
    showToast(`Error toggling sync: ${err.message}`, 'error');
  }
}

// ==================== INBOX & REPLIES TRACKER LOGIC ====================
async function loadReplies(notify = false) {
  try {
    const res = await fetch('/api/replies');
    if (!res.ok) return;
    const data = await res.json();
    const items = data.items || [];

    const container = document.getElementById('inbox-items-container');
    const emptyState = document.getElementById('inbox-empty-state');
    const badge = document.getElementById('inbox-count-badge');
    const repliesCountEl = document.getElementById('inbox-replies-count');
    const bouncesCountEl = document.getElementById('inbox-bounces-count');

    const totalReplies = items.filter(i => i.type === 'reply').length;
    const totalBounces = items.filter(i => i.type === 'bounce').length;

    if (repliesCountEl) repliesCountEl.textContent = `${totalReplies} Responses`;
    if (bouncesCountEl) bouncesCountEl.textContent = `${totalBounces} Delivery Notices`;

    if (badge) {
      if (items.length > 0) {
        badge.classList.remove('hidden');
        badge.textContent = items.length;
      } else {
        badge.classList.add('hidden');
      }
    }

    if (items.length === 0) {
      if (container) container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (container) {
      container.innerHTML = items.map(item => {
        const isBounce = item.type === 'bounce';
        const formattedDate = new Date(item.date).toLocaleString();

        if (isBounce) {
          return `
            <div class="bg-white rounded-xl shadow-sm border border-rose-200 p-5 transition-shadow hover:shadow-md border-l-4 border-l-rose-500">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start space-x-3">
                  <div class="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-lg mt-0.5">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div>
                    <div class="flex items-center space-x-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                        Delivery Failed (550 / NDR)
                      </span>
                      <span class="text-xs text-slate-400 font-mono">${formattedDate}</span>
                    </div>
                    <h3 class="text-sm font-bold text-slate-900 mt-1">${escapeHtml(item.subject)}</h3>
                    <div class="mt-1 text-xs text-slate-600 flex items-center space-x-2">
                      <span>Target: <strong class="text-slate-800">${escapeHtml(item.company)}</strong></span>
                      <span class="text-slate-300">•</span>
                      <code class="bg-rose-50 text-rose-900 px-1.5 py-0.5 rounded text-[11px] font-mono">${escapeHtml(item.targetEmail)}</code>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Diagnostic Explanation -->
              <div class="mt-3 p-3 bg-rose-50/70 border border-rose-200/60 rounded-lg text-xs text-rose-950">
                <p class="font-bold text-[11px] text-rose-900 uppercase tracking-wider">Diagnosis from Mail Server:</p>
                <p class="mt-0.5 leading-relaxed">${escapeHtml(item.reason)}</p>
                ${item.diagnostic ? `<p class="mt-1 text-[10px] font-mono text-rose-800/80">${escapeHtml(item.diagnostic)}</p>` : ''}
              </div>
            </div>
          `;
        }

        // Direct recruiter / company reply
        return `
          <div class="bg-white rounded-xl shadow-sm border border-emerald-200 p-5 transition-shadow hover:shadow-md border-l-4 border-l-emerald-500">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start space-x-3">
                <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mt-0.5">
                  <i class="fa-solid fa-comment-dots"></i>
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      Company Response
                    </span>
                    <span class="text-xs text-slate-400 font-mono">${formattedDate}</span>
                  </div>
                  <h3 class="text-sm font-bold text-slate-900 mt-1">${escapeHtml(item.subject)}</h3>
                  <div class="mt-1 text-xs text-slate-600 flex items-center space-x-2">
                    <span>From: <strong class="text-emerald-800">${escapeHtml(item.fromName || item.from)}</strong> &lt;${escapeHtml(item.from)}&gt;</span>
                    ${item.company ? `<span class="text-slate-300">•</span><span class="text-slate-700 font-medium">${escapeHtml(item.company)}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-sans leading-relaxed">
              ${escapeHtml(item.snippet)}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.warn('Error loading replies:', err);
  }
}

async function checkInboxReplies(userTriggered = false) {
  const icon = document.getElementById('inbox-refresh-icon');
  if (icon) icon.className = 'fa-solid fa-arrows-rotate fa-spin text-[11px]';

  if (userTriggered) {
    showToast('Connecting to your Gmail inbox via IMAP to check for responses...', 'info');
  }

  try {
    const res = await fetch('/api/replies/sync', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Inbox check failed');

    await loadReplies();
    await loadJobs(); // Refresh job statuses in case bounces marked jobs

    if (userTriggered) {
      showToast(`Inbox updated: ${data.state.totalReplies} responses, ${data.state.totalBounces} delivery notices.`, 'success');
    }
  } catch (err) {
    if (userTriggered) {
      showToast(`Inbox sync error: ${err.message}`, 'error');
    }
  } finally {
    if (icon) icon.className = 'fa-solid fa-arrows-rotate text-[11px]';
  }
}
