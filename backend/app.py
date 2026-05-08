from fastapi import FastAPI
from fastapi.responses import JSONResponse
from schemas import Profile, Job, MatchScore

app = FastAPI(title="Zero Gravity AI Job Orchestrator")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/extract-profile")
def extract_profile(payload: dict):
    # TODO: connect resume parser and AI profile extraction
    sample = Profile(
        name="Jane Doe",
        skills=["Python", "FastAPI", "SQL"],
        experience_years=2,
        roles=["Software Engineer"],
        location="Remote",
        salary_expectation={"min": 60000, "max": 80000},
        remote_preference="remote",
    )
    return JSONResponse(content=sample.model_dump())

@app.get("/jobs")
def list_jobs():
    jobs = [
        Job(
            id="job-001",
            title="Junior Backend Engineer",
            company="Orbit Labs",
            location="Remote",
            remote=True,
            salary_min=55000,
            salary_max=75000,
            description="Build APIs for AI-powered workflows.",
            posted_at="2026-05-01",
            url="https://example.com/jobs/001",
        )
    ]
    return JSONResponse(content=[job.model_dump() for job in jobs])

@app.post("/score-job")
def score_job(profile: Profile, job: Job):
    score = MatchScore(
        match_score=78,
        skill_overlap=85,
        experience_overlap=70,
        location_match=90,
        remote_compatibility=100,
        ats_keyword_similarity=65,
        salary_match=75,
        job_freshness=80,
        estimated_shortlist_probability=58,
        reasoning=["Strong skill match", "Remote-friendly role", "Solid salary fit"],
    )
    return JSONResponse(content=score.model_dump())
