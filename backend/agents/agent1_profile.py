"""Agent 1 — Profile Extraction
Extracts structured candidate profile from resume text using Gemini 1.5 Flash.
"""
import json
import os
from google import genai
from dotenv import load_dotenv
from usage import tracker

def get_client():
    load_dotenv(override=True)
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))

MODEL = "gemini-3.1-flash-lite"

PROFILE_SCHEMA = {
    "name": "",
    "skills": [],
    "experience_years": 0,
    "roles": [],
    "location": "",
    "salary_expectation": {"min": 0, "max": 0},
    "remote_preference": "flexible"
}

PROMPT = """You are an expert resume parser. Extract the candidate profile from the resume text below.

Resume Text:
{resume_text}

{optional_context}

Return ONLY a valid JSON object with this exact schema:
{schema}

Rules:
- skills: technical and soft skills mentioned
- experience_years: total years of professional experience (estimate from dates)
- roles: job titles/roles held or targeted
- location: city/country from resume, or "Not specified"
- salary_expectation: estimate min/max in USD based on experience level
- remote_preference: one of "remote", "hybrid", "onsite", "flexible"

Return ONLY raw JSON. No markdown. No explanation."""


def extract(
    resume_text: str,
    github_url: str = "",
    role_preference: str = "",
    location_preference: str = "",
    remote_preference: str = "",
) -> dict:
    """Extract structured profile from resume text using Gemini."""
    ctx_parts = []
    if github_url:
        ctx_parts.append(f"GitHub: {github_url}")
    if role_preference:
        ctx_parts.append(f"Target role: {role_preference}")
    if location_preference:
        ctx_parts.append(f"Preferred location: {location_preference}")
    if remote_preference:
        ctx_parts.append(f"Remote preference: {remote_preference}")
    optional_context = "\n".join(ctx_parts)

    prompt = PROMPT.format(
        resume_text=resume_text[:12000], # Increased context
        optional_context=optional_context,
        schema=json.dumps(PROFILE_SCHEMA, indent=2),
    )

    try:
        client = get_client()
        tracker.log_call(f"Gemini ({MODEL})")
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )
        raw = response.text.strip()
        
        # Robust JSON extraction
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        
        profile = json.loads(raw.strip())
        # Ensure all schema keys exist
        for key, default in PROFILE_SCHEMA.items():
            if key not in profile:
                profile[key] = default
        return profile
    except Exception as e:
        print(f"[Agent 1] Error: {e}")
        return _fallback(resume_text)


def _fallback(resume_text: str) -> dict:
    """Basic fallback parser."""
    return {
        "name": "Candidate",
        "skills": ["Python", "General Engineering"],
        "experience_years": 1,
        "roles": ["Software Engineer"],
        "location": "Not specified",
        "salary_expectation": {"min": 50000, "max": 80000},
        "remote_preference": "flexible",
    }

