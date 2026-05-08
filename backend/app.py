import os
from dotenv import load_dotenv

# FORCE OVERRIDE to handle cases where old keys are stuck in the terminal environment
load_dotenv(override=True)

from typing import List, Optional
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from agents import agent0_enrichment, agent1_profile, agent2_jobs, agent3_scoring, agent4_tailor
from agents import agent5_outreach, agent6_tracking
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
        
        # LIST AVAILABLE MODELS
        try:
            from google import genai
            client = genai.Client(api_key=key)
            print("🔍 Fetching available models...")
            models = client.models.list()
            print("📦 Available Model IDs:")
            for m in models:
                if "generateContent" in m.supported_generation_methods:
                    print(f"  - {m.name}")
        except Exception as e:
            print(f"⚠️ Could not list models: {e}")

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProfileSchema(BaseModel):
    name: str = ""
    skills: List[str] = []
    experience_years: int = 0
    roles: List[str] = []
    location: str = ""
    salary_expectation: dict = {"min": 0, "max": 0}
    remote_preference: str = "flexible"

class JobSchema(BaseModel):
    id: str
    title: str
    company: str
    location: str = ""
    remote: bool = False
    salary_min: int = 0
    salary_max: int = 0
    description: str
    posted_at: str = ""
    url: str = ""

class MatchRequest(BaseModel):
    profile: dict
    query: Optional[str] = None
    location: Optional[str] = ""

class ScoreRequest(BaseModel):
    profile: dict
    jobs: List[dict]

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
    description="6-agent AI pipeline",
    version="1.1.0",
)

# CORS setup with environment variable support
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
    print(f"CORS: {allowed_origins}")
    print("!"*60 + "\n")

@app.get("/")
def read_root():
    return {"status": "online", "message": "Zero Gravity Backend API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

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

@app.get("/jobs", tags=["agent-2"])
def list_jobs(query: str = "software engineer", location: str = "", remote: str = ""):
    jobs = agent2_jobs.fetch(query=query, location=location)
    if remote.lower() == "true":
        jobs = [j for j in jobs if j.get("remote")]
    return jobs

@app.post("/api/match", tags=["orchestrator"])
async def dashboard_match(req: MatchRequest):
    profile = req.profile
    query = req.query or " ".join(profile.get("roles", [])[:1] + profile.get("skills", [])[:2]) or "software engineer"
    
    jobs = agent2_jobs.fetch(query=query, location=req.location)
    scored_jobs = agent3_scoring.score_all(profile, jobs)
    
    # Standardize response keys for the frontend
    matches = []
    for job in scored_jobs:
        score_obj = job.get("score", {})
        matches.append({
            "job_id": str(job.get("id", "")),
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "location": job.get("location", ""),
            "match_score": score_obj.get("match_score", 0),
            "reasoning": score_obj.get("reasoning", []),
            "skills_overlap": [s for s in job.get("skills", []) if s.lower() in [ps.lower() for ps in profile.get("skills", [])]],
            "description": job.get("description", ""),
            "url": job.get("url", ""),
            "remote": job.get("remote", False),
            "posted_at": job.get("posted_at", ""),
            "salary_min": job.get("salary_min", 0),
            "salary_max": job.get("salary_max", 0),
        })
    return matches

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

@app.post("/orchestrate/pipeline", tags=["orchestrator"])
async def full_pipeline(
    resume_pdf: UploadFile = File(...),
    github_url: str = Form(default=""),
    role_preference: str = Form(default=""),
    location_preference: str = Form(default=""),
    remote_preference: str = Form(default=""),
):
    content = await resume_pdf.read()
    resume_text = parse_resume(content, format="pdf")
    
    profile = agent1_profile.extract(
        resume_text=resume_text,
        github_url=github_url,
        role_preference=role_preference,
        location_preference=location_preference,
        remote_preference=remote_preference,
    )
    
    query = role_preference or " ".join(profile.get("roles", [])[:1] + profile.get("skills", [])[:2]) or "software engineer"
    jobs = agent2_jobs.fetch(query=query, location=location_preference)
    scored = agent3_scoring.score_all(profile, jobs)
    
    return {
        "profile": profile,
        "jobs": jobs,
        "scored_matches": scored
    }
