# 🚀 Zero Gravity — AI Career Command Center

**Zero Gravity** is a production-ready, multi-agent AI orchestrator that automates the entire job search lifecycle. From semantic profile enrichment to ATS-optimized resume tailoring and real-time application tracking, Zero Gravity transforms the job search from a manual chore into an **automated, data-driven trajectory**.

---

## 🌐 Live Demo Available

Zero Gravity is fully deployed and production-ready. Experience the orchestration pipeline in real time:

### 🔗 [Try Zero Gravity Now](https://zero-gravity-eight.vercel.app/)

**What you can test right now:**
- Upload a resume and extract AI-powered structured profiles
- Discover intelligently ranked job opportunities via semantic matching
- View multi-factor "Gravity Score" reasoning
- Generate ATS-tailored, job-specific resume sections
- Experience live multi-agent orchestration in the terminal feed
- Draft personalized outreach emails for target companies
- Track applications with interview conflict detection

---

## 🎯 The Problem Zero Gravity Solves

Modern job hunting is fragmented, repetitive, and inefficient:

| ❌ Old Way | ✅ Zero Gravity |
|-----------|-----------------|
| Endless, manual job searching | Intelligent semantic discovery with parallel job fetching |
| Repetitive resume editing for each role | Automatic ATS-optimized resume generation |
| Blind application submissions | Multi-factor "Gravity Score" match analysis |
| No application tracking | Persistent tracker with interview conflict detection |
| Generic cover letters | Personalized, company-aware outreach orchestration |
| No visibility into recruiter systems | AI-driven profile enrichment & keyword optimization |

---

## 🧠 Multi-Agent Architecture

Zero Gravity operates as a **coordinated pipeline of specialized AI agents**, each optimized for a specific job search function:

### **Agent 0: GitHub Enrichment** 🔗
Automatically pulls and analyzes your public repositories to detect hidden technical skills, programming languages, and project complexity metrics. Surfaces overlooked capabilities that match job requirements.

### **Agent 1: Profile Extraction** 📋
Uses **Gemini 3.1 Flash-Lite** to transform raw resume text into high-fidelity structured profiles. Captures technical skills, soft skills, experience duration, certifications, and contextual achievements as queryable JSON.

### **Agent 2: Intelligent Discovery** 🔍
Parallel job fetching via **JSearch** with semantic query expansion. Instead of rigid keyword matching, expands your search intent across synonymous roles, industries, and skill clusters. Fetches 50+ opportunities simultaneously.

### **Agent 3: Weighted Scoring Engine** ⚖️
Combines **three orthogonal signals** into a 0–100% "Gravity Score":
1. **Semantic Similarity (40%)**: Embeddings-based conceptual match between your profile and job requirements
2. **ATS Optimization (30%)**: Critical keyword overlap detection for recruiter system visibility
3. **Experience Delta (20%)**: Penalizes/boosts based on years-of-experience alignment
4. **Contextual Logic (10%)**: Location, remote preference, role-specific nuances

**Result**: Not just keyword-matching, but intelligent, human-interpretable match reasoning.

### **Agent 4: Resume Tailoring** ✍️
Generates job-specific resume sections and injects ATS-optimized keywords based on target job descriptions. Maintains your authentic experience while strategically highlighting role-relevant achievements. Outputs both raw markdown and production-ready PDF.

### **Agent 5: Outreach Orchestrator** 💌
Drafts personalized cold emails and LinkedIn inquiries tailored to the company's specific role, pain points, and culture. Includes context-aware opening lines, value propositions, and soft CTAs. Persists drafts for review and scheduling.

### **Agent 6: Tracker & Conflict Detector** 📅
Persistent application management with Supabase. Tracks application date, status, interview dates, and company details. Automatically detects and alerts you to interview schedule conflicts. Integrates with your calendar for real-time conflict management.

---

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+) with async request handling
- **AI Core**: Google Gemini 3.1 Flash-Lite (structured reasoning, semantic analysis, content generation)
- **Database**: Supabase (PostgreSQL + JSONB for flexible asset storage)
- **External APIs**: 
  - JSearch (RapidAPI) for real-time job market data
  - Google Calendar API (optional, for conflict detection)
- **PDF Processing**: Advanced layout-aware resume parsing with text extraction and structure analysis

### Frontend
- **Framework**: Next.js 14+ (App Router, Server Components)
- **Styling**: Tailwind CSS + custom Neo-Minimalist design system
- **Animations**: Framer Motion for smooth, purposeful transitions
- **Component Library**: Lucide Icons, Canvas Confetti, custom interactive elements
- **State Management**: React Query for async agent polling, Zustand for local state
- **Terminal Emulation**: Custom bash-terminal component for live orchestration observability

---

## 📂 Project Structure

```
ZERO_GRAVITY/
├── backend/
│   ├── agents/
│   │   ├── github_enrichment.py     # Agent 0: Repository analysis
│   │   ├── profile_extraction.py    # Agent 1: Resume → structured profile
│   │   ├── job_discovery.py         # Agent 2: JSearch orchestration
│   │   ├── scoring_engine.py        # Agent 3: Multi-factor Gravity Score
│   │   ├── resume_tailor.py         # Agent 4: Job-specific resume generation
│   │   ├── outreach_orchestrator.py # Agent 5: Personalized email drafting
│   │   └── tracker.py               # Agent 6: Application tracking & conflicts
│   ├── app.py                       # FastAPI entry point & orchestration routes
│   ├── email_sender.py              # SMTP integration for outreach delivery
│   ├── utils/
│   │   ├── gemini_client.py         # Gemini API wrapper
│   │   ├── supabase_client.py       # Supabase CRUD operations
│   │   └── jsearch_client.py        # JSearch API orchestration
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx                 # Dashboard home & orchestration UI
│   │   ├── tracker/page.tsx         # Application tracker & conflict view
│   │   ├── assets/page.tsx          # Resume compare & outreach draft viewer
│   │   └── layout.tsx               # Root layout with theme provider
│   ├── src/components/
│   │   ├── BashTerminal.tsx         # Live agent execution terminal
│   │   ├── GravityScoreCard.tsx     # Multi-factor score breakdown
│   │   ├── JobCard.tsx              # Individual job opportunity card
│   │   ├── Loader.tsx               # Animated loading states
│   │   └── UiverseInput.tsx         # Interactive form components
│   ├── src/lib/
│   │   ├── api.ts                   # Typed API client for backend
│   │   ├── gemini.ts                # Client-side Gemini integration (optional)
│   │   └── hooks.ts                 # React Query hooks for agent polling
│   ├── tailwind.config.ts           # Neo-Minimalist design tokens
│   └── package.json
├── mock_jobs.json                   # Pre-scored demo data for offline testing
└── README.md                        # This file
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+
- **API Keys** (free tier available for all):
  - [Google Gemini API Key](https://aistudio.google.com/)
  - [RapidAPI Key](https://rapidapi.com/) (for JSearch)
  - [Supabase Project](https://supabase.com/) (optional, for persistence)

### 1️⃣ Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_gemini_key_here
JSEARCH_API_KEY=your_jsearch_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Run the server:
```bash
uvicorn app:app --reload --port 8001
```

✅ Backend running at `http://localhost:8001`

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Start the dev server:
```bash
npm run dev
```

✅ Frontend running at `http://localhost:3000`

### 3️⃣ Test the Pipeline

1. Open [http://localhost:3000](http://localhost:3000)
2. Upload a sample resume
3. Watch the orchestration unfold in the terminal feed
4. Explore generated jobs, tailored resumes, and outreach drafts

---

## 📊 The "Gravity Score" — Intelligent Matching Logic

Instead of simple keyword matching, Zero Gravity uses a **multi-factor weighting system** to rank job opportunities:

```
Gravity Score = (Semantic Fit × 0.40) + (ATS Overlap × 0.30) + (Exp Delta × 0.20) + (Context × 0.10)
```

### Factor Breakdown

| Factor | Weight | What It Measures |
|--------|--------|------------------|
| **Semantic Fit** | 40% | Conceptual alignment between your skills and job's core requirements using embeddings |
| **ATS Optimization** | 30% | Recruiter system visibility via critical keyword overlap |
| **Experience Delta** | 20% | Years-of-experience alignment (penalizes over/underqualification) |
| **Contextual Logic** | 10% | Location, remote preference, seniority level, industry match |

**Example**: A job requiring "Python & Machine Learning" will match your profile higher if you have demonstrated ML projects, not just "Python" in your resume—capturing intent over literal keywords.

---

## 🎨 Neo-Minimalist Design System

Zero Gravity features a **premium, high-contrast dashboard** built for clarity and sophistication:

- **High-Fidelity UI**: Thick black borders, deliberate shadow-play, and bold typography
- **Live Terminal Feed**: Real-time observability into multi-agent orchestration
- **Interactive Asset Viewer**: Dedicated page to manage tailored resumes and outreach drafts
- **Responsive Design**: Optimized for desktop, tablet, and mobile workflows
- **Accessibility**: WCAG 2.1 AA compliance with semantic HTML and ARIA labels

---

## 🔌 API Endpoints

### Core Orchestration

```bash
POST /api/orchestrate
```
Triggers the full Zero Gravity pipeline:
1. Extract profile from resume
2. Discover jobs via semantic search
3. Score and rank opportunities
4. Tailor resume for top matches
5. Generate outreach emails

**Request**:
```json
{
  "resume_text": "...",
  "github_username": "optional",
  "target_roles": ["Software Engineer", "ML Engineer"],
  "location": "San Francisco, CA",
  "remote_preference": "hybrid"
}
```

**Response**:
```json
{
  "profile": { /* extracted structured profile */ },
  "jobs": [ /* ranked with Gravity Scores */ ],
  "tailored_resumes": { /* job_id: resume_markdown */ },
  "outreach_drafts": { /* job_id: email_draft */ },
  "execution_log": [ /* agent execution timeline */ ]
}
```

### Individual Agent Routes

```bash
POST /api/agents/extract-profile      # Agent 1
POST /api/agents/discover-jobs        # Agent 2
POST /api/agents/score-jobs           # Agent 3
POST /api/agents/tailor-resume        # Agent 4
POST /api/agents/generate-outreach    # Agent 5
GET  /api/tracker/applications        # Agent 6
POST /api/tracker/log-application     # Agent 6
```

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy via Vercel CLI or GitHub integration
vercel deploy
```

### Backend (Railway / Render / Fly.io)

1. Set environment variables on your hosting platform
2. Deploy FastAPI app:
   ```bash
   # On Render / Railway
   gunicorn app:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
   ```

3. Update `NEXT_PUBLIC_API_URL` to your deployed backend URL

---

## 🧪 Testing & Demo Data

For offline testing, use the pre-scored demo data:

```bash
# Load mock jobs
curl http://localhost:8001/api/mock-jobs
```

This returns 20 pre-scored opportunities ranked by Gravity Score without requiring live API calls.

---

## 🎓 How It Differs From Traditional Job Boards

| Aspect | Traditional Job Boards | Zero Gravity |
|--------|------------------------|--------------|
| **Discovery** | Manual keyword search | Semantic expansion + parallel fetching |
| **Matching** | Boolean (match/no match) | Multi-factor Gravity Score (0–100%) |
| **Application** | Generic resume & cover letter | ATS-optimized, job-tailored assets |
| **Tracking** | Spreadsheets or email | Persistent database with analytics |
| **Outreach** | Template emails | Company & role-aware personalization |
| **Reasoning** | Hidden | Explainable (agent execution log) |

---


To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Commit your changes (`git commit -m 'Add your-idea'`)
4. Push to the branch (`git push origin feature/your-idea`)
5. Open a pull request


## 🎯 Our Mission

To eliminate the "zero gravity" phase of job hunting—the weightless, directionless period of sending hundreds of applications—and replace it with a **focused, AI-driven trajectory toward your next career milestone**.

**Zero Gravity isn't a job board. It's a career copilot.**


## Acknowledgments

Built with:
- Google Antigravity
- [Google Gemini API](https://ai.google.dev/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [JSearch API](https://rapidapi.com/laimoon/api/jsearch)
- Google Antigravity

---



**[Try Zero Gravity Now →](https://zero-gravity-eight.vercel.app/)**
