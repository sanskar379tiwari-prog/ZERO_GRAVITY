# Zero Gravity — AI Job Application Orchestration

A fast-start repository scaffold for the AI Job Application Orchestration System.

## Purpose

This repo is a minimal starting point for:
- resume upload and profile extraction
- job discovery and ranking
- tailored resume generation
- outreach email drafting
- application tracking

## Contents

- `backend/` — FastAPI backend and AI orchestrator stubs
- `frontend/` — placeholder React/Next.js app structure
- `schemas.py` — shared JSON schema models
- `mock_jobs.json` — fallback jobs for demo mode

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Goals

1. Upload resume
2. Extract candidate profile
3. Fetch jobs
4. Display matches

## Notes

This repo is intentionally lightweight and can be extended to add the full workflow.
