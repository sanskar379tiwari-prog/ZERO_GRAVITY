"""Zero Gravity — FastAPI Backend
Main application entry point.
All endpoints follow the contract defined in CLAUDE.md.

Run:
    uvicorn app:app --reload --port 8000
"""

import os
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from agents import agent0_enrichment, agent1_profile, agent2_jobs, agent3_scoring, agent4_tailor
from agents import agent5_outreach, agent6_tracking
from resume_parser import extract_text
from email_sender import send_email

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Zero Gravity AI Job Orchestrator",
    description="6-agent AI pipeline: profile extraction → job discovery → scoring → tailoring → outreach → tracking",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "zero-gravity-backend"}


# ---------------------------------------------------------------------------
# Agent 0 — Social Link Enrichment
# POST /collect-link-data
# ---------------------------------------------------------------------------

@app.post("/collect-link-data", tags=["agent-0"])
async def collect_link_data(payload: dict):
    """
    Collect profile signals from GitHub and LinkedIn links.

    Body:
      {
        "github_url": "...",
        "linkedin_url": "..."
      }
    """
    github_url = payload.get("github_url", "")
    linkedin_url = payload.get("linkedin_url", "")
    data = agent0_enrichment.collect(github_url=github_url, linkedin_url=linkedin_url)
    return JSONResponse(content=data)


# ---------------------------------------------------------------------------
# Agent 1 — Profile Extraction
# POST /extract-profile
# ---------------------------------------------------------------------------

@app.post("/extract-profile", tags=["agent-1"])
async def extract_profile(
    resume_pdf: UploadFile = File(...),
    linkedin_about: str = Form(default=""),
    github_url: str = Form(default=""),
    role_preference: str = Form(default=""),
    location_preference: str = Form(default=""),
    remote_preference: str = Form(default=""),
):
    """
    Accept a resume PDF + optional context fields.
    Returns a structured candidate Profile JSON.
    """
    if not resume_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await resume_pdf.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    resume_text = extract_text(pdf_bytes)
    profile = agent1_profile.extract(
        resume_text=resume_text,
        linkedin_about=linkedin_about,
        github_url=github_url,
        role_preference=role_preference,
        location_preference=location_preference,
        remote_preference=remote_preference,
    )
    return JSONResponse(content=profile)


# ---------------------------------------------------------------------------
# Agent 2 — Job Discovery
# GET /jobs?query=...&location=...&remote=...
# ---------------------------------------------------------------------------

@app.get("/jobs", tags=["agent-2"])
def list_jobs(
    query: str = "software engineer",
    location: str = "",
    remote: str = "",
    page: int = 1,
):
    """
    Fetch jobs from JSearch API.
    Falls back to mock_jobs.json when JSEARCH_API_KEY is absent or API fails.
    """
    jobs = agent2_jobs.fetch(query=query, location=location, page=page)

    # Optional client-side remote filter
    if remote.lower() == "true":
        jobs = [j for j in jobs if j.get("remote")]
    elif remote.lower() == "false":
        jobs = [j for j in jobs if not j.get("remote")]

    return JSONResponse(content=jobs)


# ---------------------------------------------------------------------------
# Agent 3 — Match Scoring
# POST /score-jobs
# ---------------------------------------------------------------------------

@app.post("/score-jobs", tags=["agent-3"])
async def score_jobs(payload: dict):
    """
    Score a list of jobs against a candidate profile.

    Body: { "profile": {...}, "jobs": [...] }
    Returns: List of jobs each with a "score" sub-object.
    """
    print(f"[DEBUG] /score-jobs keys: {list(payload.keys())}")
    profile = payload.get("profile") or payload.get("profiles")
    jobs = payload.get("jobs")
 
    if not profile or not isinstance(profile, dict):
        print(f"[DEBUG] /score-jobs error: profile missing or invalid")
        raise HTTPException(status_code=400, detail="'profile' object is required.")
    if not jobs or not isinstance(jobs, list):
        print(f"[DEBUG] /score-jobs error: jobs missing or invalid")
        raise HTTPException(status_code=400, detail="'jobs' list is required.")

    scored = agent3_scoring.score_all(profile, jobs)
    
    # Add dashboard-compatible fields (overlap, etc.)
    profile_skills = {str(s).strip().lower() for s in profile.get("skills", []) if isinstance(s, str)}
    for job in scored:
        score_obj = job.get("score", {})
        job_skills = [s for s in job.get("skills", []) if isinstance(s, str)]
        
        job["job_id"] = str(job.get("id", ""))
        job["match_score"] = int(score_obj.get("match_score", 0))
        job["reasoning"] = score_obj.get("reasoning", [])
        job["skills_overlap"] = [s for s in job_skills if s.strip().lower() in profile_skills]
        if not job["skills_overlap"]:
            job["skills_overlap"] = job_skills[:3]

    return JSONResponse(content=scored)


# ---------------------------------------------------------------------------
# Dashboard Match API
# POST /api/match
# ---------------------------------------------------------------------------

@app.post("/api/match", tags=["dashboard"])
async def dashboard_match(payload: dict):
    """
    Build dashboard-ready matched jobs in one call.

    Body:
      {
        "profile": {...},
        "query": "frontend engineer",   # optional
        "location": "Remote"            # optional
      }

    Returns:
      [
        {
          "job_id": "...",
          "title": "...",
          "company": "...",
          "location": "...",
          "match_score": 91,
          "reasoning": [...],
          "skills_overlap": [...]
        }
      ]
    """
    profile = payload.get("profile") or payload.get("profiles")
    query = payload.get("query", "software engineer")
    location = payload.get("location", "")
 
    print(f"[DEBUG] /api/match request: query='{query}', location='{location}'")

    if not profile or not isinstance(profile, dict):
        print(f"[DEBUG] /api/match error: profile missing or invalid")
        raise HTTPException(status_code=400, detail="'profile' object is required.")

    jobs = agent2_jobs.fetch(query=query, location=location)
    print(f"[DEBUG] /api/match found {len(jobs)} jobs from Agent 2")
    scored_jobs = agent3_scoring.score_all(profile, jobs)

    profile_skills = {
        str(s).strip().lower()
        for s in profile.get("skills", [])
        if isinstance(s, str)
    }

    matches = []
    for idx, job in enumerate(scored_jobs):
        score = job.get("score", {}) if isinstance(job.get("score"), dict) else {}
        job_skills = [
            s for s in job.get("skills", []) if isinstance(s, str)
        ]

        overlap = [
            skill for skill in job_skills
            if skill.strip().lower() in profile_skills
        ]
        if not overlap:
            overlap = job_skills[:3]

        reasoning = score.get("reasoning", [])
        if not isinstance(reasoning, list):
            reasoning = []
        reasoning = [r for r in reasoning if isinstance(r, str)]

        matches.append({
            "job_id": str(job.get("id", f"job-{idx + 1}")),
            "title": str(job.get("title", "Untitled Role")),
            "company": str(job.get("company", "Unknown Company")),
            "location": str(job.get("location", "Unknown")),
            "match_score": int(score.get("match_score", 0)),
            "reasoning": reasoning,
            "skills_overlap": overlap,
            "description": str(job.get("description", "")),
            "url": str(job.get("url", "")),
            "remote": bool(job.get("remote", False)),
            "posted_at": str(job.get("posted_at", "")),
            "salary_min": int(job.get("salary_min", 0) or 0),
            "salary_max": int(job.get("salary_max", 0) or 0),
        })

    return JSONResponse(content=matches)


# ---------------------------------------------------------------------------
# Agent 4 — Resume Tailoring
# POST /tailor-resume
# ---------------------------------------------------------------------------

@app.post("/tailor-resume", tags=["agent-4"])
async def tailor_resume(payload: dict):
    """
    Tailor a resume for a specific job.

    Body: { "profile": {...}, "job": {...}, "resume_text": "..." }
    Returns: { tailored_sections, pdf_base64, ats_keywords }
    """
    profile = payload.get("profile")
    job = payload.get("job")
    resume_text = payload.get("resume_text", "")

    if not profile or not isinstance(profile, dict):
        raise HTTPException(status_code=400, detail="'profile' is required.")
    if not job or not isinstance(job, dict):
        raise HTTPException(status_code=400, detail="'job' is required.")

    result = agent4_tailor.tailor(profile=profile, job=job, resume_text=resume_text)
    return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# Agent 5 — Outreach Email Drafting
# POST /draft-email
# ---------------------------------------------------------------------------

@app.post("/draft-email", tags=["agent-5"])
async def draft_email(payload: dict):
    """
    Generate a personalized outreach email for a job application.

    Body: { "profile": {...}, "job": {...} }
    Returns: { subject, email_body, short_cover }
    """
    profile = payload.get("profile")
    job = payload.get("job")

    if not profile or not isinstance(profile, dict):
        raise HTTPException(status_code=400, detail="'profile' is required.")
    if not job or not isinstance(job, dict):
        raise HTTPException(status_code=400, detail="'job' is required.")

    draft = agent5_outreach.draft(profile=profile, job=job)
    return JSONResponse(content=draft)


# ---------------------------------------------------------------------------
# Email Sending
# POST /send-email
# ---------------------------------------------------------------------------

@app.post("/send-email", tags=["agent-5"])
async def send_outreach_email(payload: dict):
    """
    Send an outreach email via Gmail SMTP.

    Body: {
      "to": "recruiter@company.com",
      "subject": "...",
      "email_body": "...",
      "pdf_base64": "..."    (optional — tailored resume attachment)
    }
    """
    to = payload.get("to", "").strip()
    subject = payload.get("subject", "").strip()
    body = payload.get("email_body", "").strip()
    pdf_b64 = payload.get("pdf_base64", "")

    if not to:
        raise HTTPException(status_code=400, detail="'to' email address is required.")
    if not subject or not body:
        raise HTTPException(status_code=400, detail="'subject' and 'email_body' are required.")

    result = send_email(to=to, subject=subject, body=body, pdf_base64=pdf_b64)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Email sending failed."))
    return JSONResponse(content=result)


# ---------------------------------------------------------------------------
# Agent 6 — Application Tracking
# GET  /applications
# POST /applications
# PATCH /applications/{app_id}
# ---------------------------------------------------------------------------

@app.get("/applications", tags=["agent-6"])
def get_applications():
    """Return all tracked job applications."""
    return JSONResponse(content=agent6_tracking.get_applications())


@app.post("/applications", tags=["agent-6"])
async def create_application(payload: dict):
    """
    Log a new application.

    Body: { "job_id": "...", "job_title": "...", "company": "...", "profile_name": "...", "status": "Applied" }
    """
    job_id = payload.get("job_id", "")
    job_title = payload.get("job_title", "")
    company = payload.get("company", "")
    profile_name = payload.get("profile_name", "Candidate")
    status = payload.get("status", "Applied")

    if not job_id or not job_title or not company:
        raise HTTPException(
            status_code=400,
            detail="'job_id', 'job_title', and 'company' are required.",
        )

    record = agent6_tracking.create_application(
        job_id=job_id,
        job_title=job_title,
        company=company,
        profile_name=profile_name,
        status=status,
    )
    return JSONResponse(content=record, status_code=201)


@app.patch("/applications/{app_id}", tags=["agent-6"])
async def update_application_status(app_id: str, payload: dict):
    """
    Update the status of an application.

    Body: { "status": "Interview" }
    """
    status = payload.get("status", "").strip()
    if not status:
        raise HTTPException(status_code=400, detail="'status' is required.")

    updated = agent6_tracking.update_status(app_id=app_id, status=status)
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail=f"Application '{app_id}' not found or invalid status.",
        )
    return JSONResponse(content=updated)


# ---------------------------------------------------------------------------
# Interview Scheduling
# GET  /interviews
# POST /interviews
# ---------------------------------------------------------------------------

@app.get("/interviews", tags=["agent-6"])
def get_interviews():
    """Return all scheduled interviews."""
    return JSONResponse(content=agent6_tracking.get_interviews())


@app.post("/interviews", tags=["agent-6"])
async def schedule_interview(payload: dict):
    """
    Schedule an interview for an application.

    Body: {
      "app_id": "...",
      "datetime_iso": "2026-05-15T10:00:00Z",
      "duration_minutes": 60,
      "platform": "Google Meet",
      "notes": "..."
    }
    Returns interview record or conflict error.
    """
    app_id = payload.get("app_id", "")
    dt_iso = payload.get("datetime_iso", "")
    duration = int(payload.get("duration_minutes", 60))
    platform = payload.get("platform", "Google Meet")
    notes = payload.get("notes", "")

    if not app_id or not dt_iso:
        raise HTTPException(status_code=400, detail="'app_id' and 'datetime_iso' are required.")

    result = agent6_tracking.schedule_interview(
        app_id=app_id,
        datetime_iso=dt_iso,
        duration_minutes=duration,
        platform=platform,
        notes=notes,
    )

    # If conflict was detected, return 409
    if result.get("error") == "time_conflict":
        return JSONResponse(content=result, status_code=409)

    return JSONResponse(content=result, status_code=201)


# ---------------------------------------------------------------------------
# Orchestrator — Full Pipeline (Phase 1)
# POST /orchestrate/pipeline
# ---------------------------------------------------------------------------

@app.post("/orchestrate/pipeline", tags=["orchestrator"])
async def full_pipeline(
    resume_pdf: UploadFile = File(...),
    linkedin_about: str = Form(default=""),
    github_url: str = Form(default=""),
    role_preference: str = Form(default=""),
    location_preference: str = Form(default=""),
    remote_preference: str = Form(default=""),
    job_query: str = Form(default=""),
):
    """
    Run the full Phase-1 pipeline in a single call:
      1. Extract candidate profile from uploaded resume
      2. Discover jobs (uses role + skills as query)
      3. Score all jobs against the profile

    Returns: { profile, jobs, scored_matches }

    This is the primary endpoint for the frontend's onboarding → dashboard flow.
    """
    # Step 1 — Profile extraction
    if not resume_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await resume_pdf.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    resume_text = extract_text(pdf_bytes)
    profile = agent1_profile.extract(
        resume_text=resume_text,
        linkedin_about=linkedin_about,
        github_url=github_url,
        role_preference=role_preference,
        location_preference=location_preference,
        remote_preference=remote_preference,
    )

    # Step 2 — Job discovery
    # Build a smart query from profile if the caller didn't supply one
    if not job_query:
        roles = profile.get("roles", [])
        skills = profile.get("skills", [])[:3]
        job_query = " ".join(roles[:1] + skills) or "software engineer"

    jobs = agent2_jobs.fetch(
        query=job_query,
        location=location_preference,
    )

    # Step 3 — Match scoring
    scored_matches = agent3_scoring.score_all(profile, jobs)

    return JSONResponse(content={
        "profile": profile,
        "jobs": jobs,
        "scored_matches": scored_matches,
    })
