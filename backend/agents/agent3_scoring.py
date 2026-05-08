"""Agent 3 — Intelligent Job Ranking Engine
Implements a weighted scoring system inspired by Career-Ops.
Stages:
1. Deterministic Scoring (ATS, Exp, Loc)
2. Semantic Scoring (Gemini Embeddings)
3. AI Reasoning (Gemini Flash - Top 10 Only)
"""
import os, json, time
from google import genai
from google.genai import types
from dotenv import load_dotenv
from usage import tracker
from agents.filters import KeywordMatcher
from agents.agent3_semantic import batch_semantic_score

load_dotenv(override=True)

def get_client():
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

MODEL = "gemini-3.1-flash-lite"

REASONING_PROMPT = """You are a technical recruiter. Explain why this job is a good match for the candidate.
CANDIDATE:
{profile}

JOB:
{job}

Return a list of 3-4 specific bullet points in JSON format:
{{ "reasoning": ["point 1", "point 2", ...] }}
"""

def score_all(profile: dict, jobs: list) -> list:
    """
    Overhauled scoring pipeline.
    """
    if not jobs: return []
    
    # 1. Semantic Scoring (Weights 40%)
    # This also adds 'semantic_score' to the jobs
    scored_jobs = batch_semantic_score(profile, jobs)
    
    # 2. Weighted Calculation for ALL jobs
    print(f"[Agent 3] Calculating weighted scores for {len(scored_jobs)} jobs...")
    
    profile_skills_text = " ".join(profile.get("skills", []))
    profile_roles_text = " ".join(profile.get("roles", []))
    profile_location = profile.get("location", "").lower()
    remote_pref = str(profile.get("remote_preference", "flexible")).lower()
    
    for job in scored_jobs:
        # A. ATS Overlap (25%)
        job_text = f"{job.get('title')} {job.get('description')}"
        ats_score = KeywordMatcher.match_score(job_text, f"{profile_roles_text} {profile_skills_text}")
        job["ats_score"] = round(ats_score, 2)
        
        # B. Heuristic Scores (Experience, Location, Remote) (35% total)
        exp_score = 0.8 # Default
        loc_score = 0.5
        remote_score = 0.5
        
        # Experience check
        title_lower = job.get("title", "").lower()
        exp_years = profile.get("experience_years", 0)
        if exp_years < 2 and any(w in title_lower for w in ["senior", "lead", "staff"]):
            exp_score = 0.3
        elif exp_years >= 5:
            exp_score = 1.0
            
        # Location check
        if profile_location and profile_location in job.get("location", "").lower():
            loc_score = 1.0
        
        # Remote check
        if job.get("remote"):
            remote_score = 1.0
        elif remote_pref == "onsite":
            remote_score = 0.8
            
        # Weighted Total
        # 40% Semantic + 25% ATS + 15% Experience + 10% Location + 10% Remote
        semantic_component = job.get("semantic_score", 0.5) * 40
        ats_component = job.get("ats_score", 0.5) * 25
        exp_component = exp_score * 15
        loc_component = loc_score * 10
        rem_component = remote_score * 10
        
        total_score = semantic_component + ats_component + exp_component + loc_component + rem_component
        job["match_score"] = int(min(99, total_score)) # Cap at 99 for realism
        job["reasoning"] = ["Analyzing match..."] # Placeholder

    # 3. Ranking
    scored_jobs.sort(key=lambda x: x["match_score"], reverse=True)
    
    # 4. AI Reasoning (Top 10 Only)
    top_jobs = scored_jobs[:10]
    print(f"[Agent 3] Generating AI reasoning for Top {len(top_jobs)} jobs...")
    
    client = get_client()
    for job in top_jobs:
        try:
            tracker.log_call(f"Gemini ({MODEL})")
            prompt = REASONING_PROMPT.format(
                profile=json.dumps(profile),
                job=json.dumps({
                    "title": job.get("title"),
                    "company": job.get("company"),
                    "description": job.get("description", "")[:1000]
                })
            )
            
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type='application/json')
            )
            
            data = json.loads(response.text.strip())
            job["reasoning"] = data.get("reasoning", ["Strong technical alignment detected."])
            
        except Exception as e:
            print(f"[Agent 3] Reasoning failed for {job.get('title')}: {e}")
            job["reasoning"] = ["Strong alignment with your profile."]

    return top_jobs
