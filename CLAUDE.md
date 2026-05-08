# Zero Gravity — Developer Guide (Frontend & AI)

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS v4, Framer Motion, Lucide React.
- **AI Backend**: Gemini 2.5 Flash, PyMuPDF, ReportLab.

## Frontend Structure
- `/src/app/page.tsx`: Onboarding and Resume Upload.
- `/src/app/dashboard/page.tsx`: Job Dashboard with AI scoring.
- `/src/app/resume-compare/[jobId]/page.tsx`: Side-by-side resume comparison and tailoring.
- `/src/app/applications/page.tsx`: Application tracker.

## AI Agents (`/backend/agents/`)
- `agent1_profile.py`: Extracts structured JSON profile from PDF text.
- `agent2_jobs.py`: Fetches jobs with JSearch/Mock fallback.
- `agent3_scoring.py`: Deterministic weighted scoring logic.
- `agent4_tailor.py`: Tailors resume content and generates PDF.

## Wiring Instructions for Person 1 (Backend)
The frontend expects the following endpoints on `http://localhost:8000`:

1. `POST /extract-profile` (Multipart/FormData)
   - Input: `resume_pdf` (file), `linkedin_about`, `github_url`, `role_preference`, etc.
   - Output: JSON Profile (Agent 1).

2. `GET /jobs?query=...`
   - Output: List of JSON Jobs (Agent 2).

3. `POST /score-jobs`
   - Input: `{ profile, jobs }`
   - Output: List of Jobs with `score` object (Agent 3).

4. `POST /tailor-resume`
   - Input: `{ profile, job }`
   - Output: `{ tailored_sections, pdf_base64, ats_keywords }` (Agent 4).

## Env Vars
- Frontend: `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Backend: `GEMINI_API_KEY`, `JSEARCH_API_KEY`
