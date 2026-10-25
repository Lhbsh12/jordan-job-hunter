# 🇯🇴 Jordan Job Hunter (مُساعد الباحثين عن عمل في الأردن)

> **Self-Hosted, Automated Job Discovery & Cold Outreach Platform for Job Seekers in Jordan.**  
> *Find verified openings in Amman & Jordan, craft targeted outreach emails, attach your CV, track recruiter replies, and manage your applications—100% locally and privately.*

---

## 🌟 Why Jordan Job Hunter?

Finding a job or internship in Jordan often means sending hundreds of applications into black-hole portals or struggling to reach real hiring managers. **Jordan Job Hunter** bridges this gap by combining automated web discovery with personalized, human-approved email outreach:

- 🇯🇴 **Tailored for Jordan**: Pre-configured with top employers, banks, tech hubs, and verified careers inboxes across Amman and Jordan (Bank al Etihad, Mawdoo3, OpenSooq, ArabiaWeather, Tamatem, ProgressSoft, MadfooatCom, Hikma, etc.).
- 🔒 **100% Private & Self-Hosted**: Runs entirely on your own laptop or server (`http://localhost:3000`). Your profile, resume, and email credentials **never** leave your machine.
- 🛡️ **Human-in-the-Loop Approval Gate**: No automated spamming! Every generated email draft must be reviewed, customized, and given an explicit **"I Give My OK"** approval before dispatch.
- ⚡ **Dual Dispatch Mode**: Send directly via SMTP (e.g. Gmail) or generate an instant one-click `mailto:` link that opens your native desktop email client (Outlook, Thunderbird, Apple Mail).
- 🤖 **Smart Tailoring (Free & LLM)**: Uses a built-in algorithmic engine (100% free, zero API keys required) to match your skills with job requirements, or connects optionally to Groq, OpenAI, Anthropic, or local Ollama.
- 📬 **Live Inbox & Response Tracker**: Connects securely via IMAP to automatically detect recruiter replies and delivery status bounce notices (550 / NDR).

---

## 📸 Screenshots & Workflow

1. **Discover & Index**: Live background sync fetches active listings in Amman & Jordan.
2. **Profile Alignment**: Cross-references your skills, major, and projects with the job description.
3. **Draft & Customize**: Generates a concise, impactful 120-word cold email.
4. **Approve Gate**: You review and approve the draft with your attached PDF CV.
5. **Dispatch & Track**: Delivers the email and monitors your inbox for replies.

---

## 🚀 Quick Start (Running Locally)

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended) — [Download Node.js](https://nodejs.org/)
- **Git** (optional, to clone)

### 2. Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/jordan-job-hunter.git
cd jordan-job-hunter

# 2. Install dependencies
npm install

# 3. Start the application
npm start
```

Open your browser and navigate to:  
👉 **`http://localhost:3000`**

---

## 🐳 Running with Docker

If you prefer Docker, you can run the application with a single command:

```bash
docker-compose up -d --build
```

Access the dashboard at **`http://localhost:3000`**. Your data and resume will persist in the local `./data` and `./public` folders.

---

## ⚙️ Configuration & Setup Guide

### 1. Set Up Your Candidate Profile
1. Open the **"My Profile & CV"** tab in the dashboard.
2. Fill in your name, contact email, phone number, university, degree, and skills.
3. Add your key project highlights (include metrics like % improvement, accuracy, or users served).
4. **Attach your CV/Resume**:
   - Save your PDF resume as `public/resume.pdf` in the project root.
   - When dispatching emails, it will be automatically renamed and attached cleanly as `[Your_Name]_Resume.pdf`.

### 2. Configure Email Dispatch (Gmail SMTP)
To send outreach emails directly through the app:
1. Go to your **Google Account** → **Security** → **2-Step Verification**.
2. Scroll to the bottom and select **App passwords** (or search "App passwords" in settings).
3. Create a new app password named `Job Hunter`.
4. Copy the generated 16-character password (e.g. `abcd efgh ijkl mnop`).
5. In the **"Email & AI Config"** tab:
   - **SMTP Host**: `smtp.gmail.com`
   - **Port**: `465` (SSL checked)
   - **Username**: `your-email@gmail.com`
   - **Password**: Your 16-character Google App Password.
   - **Display Name**: Your full name.
6. Click **Test Connection** to verify!

> 💡 *Note: If you don't want to use SMTP, you can leave it blank! The app will automatically open your default desktop mail app (Outlook, Thunderbird, etc.) with the recipient, subject, and body pre-filled.*

### 3. Choose Your Tailoring Engine
In **Email & AI Config**, select your tailoring preference:
- **Smart Algorithmic Engine (Default)**: Completely free, runs offline, zero API keys required. Analyzes keywords and creates clean, structured emails.
- **Groq (Recommended for AI)**: Ultra-fast and has a generous free tier. Use model `llama-3.3-70b-versatile`.
- **OpenAI / Anthropic**: Enter your API key to use GPT-4o-mini or Claude 3.5 Haiku.
- **Ollama**: 100% offline, free local LLMs running on your machine.

---

## 📁 Project Architecture

```text
jordan-job-hunter/
├── data/                      # Local database (JSON files)
│   ├── profile.template.json  # Starter profile template
│   ├── jobs.json              # Curated Jordan opportunities
│   ├── history.json           # Sent outreach audit trail (gitignored)
│   └── replies.json           # Inbound replies and bounces (gitignored)
├── public/                    # Web dashboard frontend
│   ├── app.js                 # Frontend application logic
│   ├── index.html             # Responsive UI (Tailwind CSS)
│   ├── resume.sample.pdf      # Sample template CV
│   └── resume.pdf             # Your personal CV (gitignored)
├── services/                  # Backend services
│   ├── emailGenerator.js      # Cold outreach synthesis engine
│   ├── jobScraper.js          # Live Jordan jobs scraper & email extractor
│   ├── mailer.js              # SMTP transporter & attachment handler
│   └── replyTracker.js        # IMAP response & bounce tracker
├── .env.example               # Environment variable examples
├── .gitignore                 # Strict privacy protection rules
├── Dockerfile                 # Container image specification
├── docker-compose.yml         # Container orchestration
├── package.json               # Node.js project manifest
├── LICENSE                    # MIT Open Source License
└── server.js                  # Express backend & auto-sync scheduler
```

---

## 🔒 Security & Privacy Guarantee

- 🚫 **No Analytics or Remote Logging**: We do not collect telemetry, track usage, or store your data remotely.
- 🔐 **Zero Hardcoded Secrets**: All user passwords, credentials, and API keys are stored only in your local `data/profile.json` or `.env`.
- 🛡️ **Protected by `.gitignore`**: The `.gitignore` file is pre-configured to strictly ignore `data/profile.json`, `data/history.json`, `data/replies.json`, `public/resume.pdf`, and `.env`. Even if you commit and push to a public GitHub repository, your private information and passwords **will never be uploaded**.

---

## 🇯🇴 دليل الاستخدام باللغة العربية (Arabic Quick Guide)

### ما هو Jordan Job Hunter؟
مشروع مفتوح المصدر ومستضاف محلياً (Self-Hosted) صُمم خصيصاً لمساعدة الخريجين والباحثين عن عمل في الأردن على:
1. **اكتشاف الشواغر الوظيفية الحقيقية** في عمّان والأردن بشكل مستمر وتلقائي.
2. **استخراج إيميلات مسؤولي التوظيف (Recruiters)** في الشركات الأردنية ومطابقتها.
3. **صياغة رسائل تقديم احترافية ومخصصة (Cold Emails)** بناءً على مهاراتك ومشاريعك ومتطلبات كل وظيفة.
4. **بوابة موافقة بشرية صارمة**: لن يتم إرسال أي إيميل تلقائياً بدون مراجعتك وضغطك على زر الموافقة بنفسك.
5. **متابعة الردود (Inbox Tracking)**: يقوم النظام بفحص بريدك الوارد تلقائياً عبر IMAP لمعرفة ما إذا قامت الشركة بالرد عليك أو إذا كان الإيميل غير صالح (Bounce / 550).

### خطوات التشغيل السريعة:
1. تأكد من تثبيت **Node.js** على جهازك.
2. قم بتحميل أو استنساخ المشروع:
   ```bash
   git clone https://github.com/your-username/jordan-job-hunter.git
   cd jordan-job-hunter
   npm install
   npm start
   ```
3. افتح المتصفح على: `http://localhost:3000`
4. توجّه إلى تبويب **"My Profile & CV"** وأدخل بياناتك ومهاراتك وضع سيرتك الذاتية في مجلد `public/resume.pdf`.
5. في تبويب **"Email & AI Config"**، ضع كلمة مرور التطبيقات (App Password) من بريدك في Gmail، أو استخدم خيار فتح بريدك المباشر.

---

## 🤝 Responsible Outreach Guidelines (أخلاقيات التقديم)

- **Quality Over Quantity**: Send tailored, well-thought-out inquiries to relevant companies rather than spamming unrelated roles.
- **Respect Recruiter Time**: Keep outreach messages concise (~120–150 words). Focus on what you can solve for the team.
- **Honor Company Preferences**: If a company states portal applications only, use the **Apply on Portal** link provided in the dashboard.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal, educational, and community use.

*Built with ❤️ for the ambitious developers, engineers, and graduates of Jordan.*
