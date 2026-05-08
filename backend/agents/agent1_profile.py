"""Agent 1 — Profile Extraction
Extracts structured candidate profile from resume text using Gemini 2.5 Flash Lite.
"""
import json
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
MODEL = "gemini-1.5-flash"

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
- skills: all technical and soft skills mentioned
- experience_years: total years of professional experience (estimate from dates)
- roles: job titles/roles held or targeted
- location: city/country from resume, or "Not specified"
- salary_expectation: estimate min/max in USD based on experience level
- remote_preference: one of "remote", "hybrid", "onsite", "flexible"

Return ONLY raw JSON. No markdown. No explanation."""


def extract(
    resume_text: str,
    linkedin_about: str = "",
    github_url: str = "",
    role_preference: str = "",
    location_preference: str = "",
    remote_preference: str = "",
) -> dict:
    """Extract structured profile from resume text using Gemini 2.5 Flash."""
    ctx_parts = []
    if linkedin_about:
        ctx_parts.append(f"LinkedIn About: {linkedin_about}")
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
        resume_text=resume_text[:6000],
        optional_context=optional_context,
        schema=json.dumps(PROFILE_SCHEMA, indent=2),
    )

    model = MODEL
    for attempt in range(3):
        try:
            response = _client.models.generate_content(
                model=model,
                contents=prompt,
            )
            raw = response.text.strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = raw.split("```", 2)[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            profile = json.loads(raw.strip())
            # Ensure all schema keys exist
            for key, default in PROFILE_SCHEMA.items():
                if key not in profile:
                    profile[key] = default
            return profile
        except json.JSONDecodeError as e:
            print(f"[Agent 1] JSON parse error (attempt {attempt+1}): {e}")
        except Exception as e:
            print(f"[Agent 1] Gemini error: {e}. Using fallback parser.")
            break
    return _fallback(resume_text)


def _fallback(resume_text: str) -> dict:
    """Basic keyword fallback when Gemini is unavailable."""
    lines = [l.strip() for l in resume_text.splitlines() if l.strip()]
    name = lines[0] if lines else "Unknown Candidate"
    keywords = [
        "python", "javascript", "typescript", "react", "node", "sql",
        "java", "aws", "docker", "git", "fastapi", "machine learning",
    ]
    skills = [k.title() for k in keywords if k in resume_text.lower()]
    return {
        "name": name,
        "skills": skills or ["Python", "JavaScript"],
        "experience_years": 1,
        "roles": ["Software Engineer"],
        "location": "Not specified",
        "salary_expectation": {"min": 50000, "max": 80000},
        "remote_preference": "flexible",
    }
