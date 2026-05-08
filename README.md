# Zero Gravity — AI Job Application Orchestration

A multi-agent AI workflow platform that automates the job application process from resume extraction to interview tracking.

## Features

- **Agent 1 — Profile Extraction**: Extracts structured JSON from resume PDFs using Gemini.
- **Agent 2 — Job Discovery**: Fetches real-time jobs via JSearch API (with mock fallback).
- **Agent 3 — Match Scoring**: Intelligent weighted scoring (Skills, ATS, Location, Salary).
- **Agent 4 — Resume Tailoring**: Rewrites resume sections and generates tailored PDFs.
- **Agent 5 — Outreach Drafting**: Generates personalized cold emails/cover letters.
- **Agent 6 — Tracking**: Manages application states and detects interview conflicts.

## Project Structure

- `backend/` — FastAPI application and AI agents.
- `frontend/` — Next.js 14 dashboard (Tailwind CSS, shadcn/ui).
- `mock_jobs.json` — Demo data for local testing.

## Getting Started

### Backend Setup

1. **Environment**:
   ```bash
   cd backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configuration**:
   Copy `.env.example` to `.env` and add your `GEMINI_API_KEY`.

3. **Run**:
   ```bash
   uvicorn app:app --reload --port 8000
   ```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## API Highlights

- `POST /orchestrate/pipeline` — Single call to run Agent 1, 2, and 3 (Phase 1 milestone).
- `POST /extract-profile` — Resume to JSON conversion.
- `POST /tailor-resume` — Job-specific PDF generation.

## License

Community Track Hackathon Project.
