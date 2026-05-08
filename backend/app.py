import os
from dotenv import load_dotenv
from typing import List, Optional

# FORCE OVERRIDE to handle cases where old keys are stuck in the terminal environment
load_dotenv(override=True)

import json
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# FORCE OVERRIDE to handle cases where old keys are stuck in the terminal environment
load_dotenv(override=True)

from agents import agent1_profile, agent2_jobs, agent3_scoring, agent4_tailor
from agents import agent5_outreach, agent6_tracking, agent2_filter
from agents.resume_parser import parse_resume
from email_sender import send_email

# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------
def check_env():
    key = os.getenv("GEMINI_API_KEY", "")
    print(f"DEBUG: GEMINI_API_KEY raw length: {len(key)}")
    if not key:
        print("❌ ERROR: GEMINI_API_KEY is missing from .env")
    elif len(key) < 20:
        print(f"⚠️ WARNING: GEMINI_API_KEY looks too short ({len(key)} chars)")
    else:
        masked = key[:6] + "..." + key[-4:]
        print(f"✅ GEMINI_API_KEY loaded: {masked}")

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class MatchRequest(BaseModel):
    profile: dict
    query: Optional[str] = None
    location: Optional[str] = ""

class TailorRequest(BaseModel):
    profile: dict
    job: dict
    resume_text: str = ""

class EmailDraftRequest(BaseModel):
    profile: dict
    job: dict

class EmailSendRequest(BaseModel):
    to: str
    subject: str
    email_body: str
    pdf_base64: Optional[str] = None

class ApplicationCreate(BaseModel):
    job_id: str
    job_title: str
    company: str
    profile_name: str = "Candidate"
    status: str = "Applied"

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Zero Gravity AI Job Orchestrator",
    description="Intelligent Opportunity Ranking System",
    version="1.2.0",
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("\n" + "!"*60)
    print("!!! ZERO GRAVITY BACKEND RELOADED !!!")
    check_env()
    print(f"Model: gemini-3.1-flash-lite (FORCE)")
    print("Architecture: Intelligent Opportunity Ranking (Career-Ops inspired)")
    print("!"*60 + "\n")

@app.get("/")
def read_root():
    return {"status": "online", "message": "Zero Gravity Backend API is running"}

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/extract-profile", tags=["agent-1"])
async def extract_profile(
    resume_pdf: UploadFile = File(None),
    github_url: str = Form(default=""),
    role_preference: str = Form(default=""),
    location_preference: str = Form(default=""),
    remote_preference: str = Form(default=""),
):
    resume_text = ""
    if resume_pdf:
        content = await resume_pdf.read()
        resume_text = parse_resume(content, format="pdf")

    profile = agent1_profile.extract(
        resume_text=resume_text,
        github_url=github_url,
        role_preference=role_preference,
        location_preference=location_preference,
        remote_preference=remote_preference,
    )
    return profile

@app.post("/api/match", tags=["orchestrator"])
async def dashboard_match(req: MatchRequest):
    """
    Intelligent Opportunity Ranking Pipeline (Career-Ops inspired)
    1. Fetch batch (50-100 jobs)
    2. Apply Hard Filters
    3. Calculate Weighted AI Scores (Semantic + ATS + Exp)
    4. Return Top 10 with AI Reasoning
    """
    profile = req.profile
    location = req.location or profile.get("location", "")
    
    # 1. Generate search variants
    queries = agent2_jobs.generate_queries(profile)
    if req.query:
        queries.insert(0, req.query)
        
    # 2. Fetch Large Scale (50 jobs)
    print(f"[Orchestrator] Fetching large-scale batch for {profile.get('name')}...")
    raw_jobs = agent2_jobs.fetch_batch(queries=queries, location=location, limit=50)
    
    # 3. Apply Hard Filters
    filtered_jobs = agent2_filter.apply_hard_filters(raw_jobs, profile)
    
    # 4. Intelligent Scoring & Ranking
    # (Includes Semantic Similarity and Top 10 AI Reasoning)
    ranked_jobs = agent3_scoring.score_all(profile, filtered_jobs)
    
    # 5. Standardize response for frontend
    final_matches = []
    for job in ranked_jobs:
        final_matches.append({
            "job_id": str(job.get("id", "")),
            "title": str(job.get("title", "")),
            "company": str(job.get("company", "")),
            "location": str(job.get("location", "")),
            "match_score": int(job.get("match_score", 0)),
            "semantic_score": float(job.get("semantic_score", 0.0)),
            "ats_score": float(job.get("ats_score", 0.0)),
            "reasoning": job.get("reasoning", []),
            "skills_overlap": job.get("skills_overlap", []), # Filled by frontend or scoring
            "description": str(job.get("description", "")),
            "url": str(job.get("url", "")),
            "remote": bool(job.get("remote", False)),
            "posted_at": str(job.get("posted_at", "")),
            "salary_min": int(job.get("salary_min", 0) or 0),
            "salary_max": int(job.get("salary_max", 0) or 0),
            "source": str(job.get("source", "Unknown")),
        })
        
    return JSONResponse(content=final_matches)

@app.post("/tailor-resume", tags=["agent-4"])
async def tailor_resume(req: TailorRequest):
    try:
        result = agent4_tailor.tailor(req.profile, req.job, resume_text=req.resume_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/draft-email", tags=["agent-5"])
async def draft_email(req: EmailDraftRequest):
    return agent5_outreach.generate(profile=req.profile, job=req.job)

@app.post("/send-email", tags=["agent-5"])
async def send_outreach_email(req: EmailSendRequest):
    result = send_email(to=req.to, subject=req.subject, body=req.email_body, pdf_base64=req.pdf_base64)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))
    return result

@app.get("/applications", tags=["agent-6"])
def get_applications():
    return agent6_tracking.get_applications()

@app.post("/applications", tags=["agent-6"])
async def create_app(req: ApplicationCreate):
    return agent6_tracking.create_application(**req.dict())

@app.patch("/applications/{app_id}", tags=["agent-6"])
async def update_app(app_id: str, payload: dict = Body(...)):
    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
    updated = agent6_tracking.update_status(app_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found")
    return updated
