"""Agent 5 — Outreach Drafting
Generates a personalized cold-outreach email + short cover letter
for a given candidate profile and target job using Gemini 2.5 Flash Lite.
"""
import json
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
MODEL = "gemini-2.5-flash-lite-preview-06-17"

PROMPT = """You are an expert career coach and copywriter.
Write a personalized cold-outreach email from a candidate to a recruiter/hiring manager.

CANDIDATE PROFILE:
{profile}

TARGET JOB:
Title: {title}
Company: {company}
Description: {description}

Return ONLY a valid JSON object (no markdown):
{{
  "subject": "compelling email subject line",
  "email_body": "full professional email body (3-4 paragraphs, warm but confident tone, specific to the job)",
  "short_cover": "2-3 sentence elevator pitch / cover note"
}}

Rules:
- Address the email to "Hiring Team" if no contact name is available
- Reference the specific role and company by name
- Mention 2-3 of the candidate's most relevant skills for this role
- Keep total email under 250 words
- Sound human, not like a template
- Return ONLY raw JSON. No markdown. No explanation."""


def draft(profile: dict, job: dict) -> dict:
    """Generate personalized outreach email for a job application."""
    prompt = PROMPT.format(
        profile=json.dumps(profile, indent=2),
        title=job.get("title", ""),
        company=job.get("company", ""),
        description=job.get("description", "")[:1200],
    )

    model = MODEL
    for attempt in range(3):
        try:
            response = _client.models.generate_content(
                model=model,
                contents=prompt,
            )
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```", 2)[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw.strip())
            # Ensure all keys present
            for key in ("subject", "email_body", "short_cover"):
                if key not in result:
                    result[key] = ""
            return result
        except json.JSONDecodeError as e:
            print(f"[Agent 5] JSON parse error (attempt {attempt + 1}): {e}")
        except Exception as e:
            print(f"[Agent 5] Gemini error: {e}. Using fallback.")
            break

    return _fallback(profile, job)


def _fallback(profile: dict, job: dict) -> dict:
    """Template-based fallback when Gemini is unavailable."""
    name = profile.get("name", "Candidate")
    title = job.get("title", "the open position")
    company = job.get("company", "your company")
    skills = profile.get("skills", [])
    top_skills = ", ".join(skills[:3]) if skills else "relevant technical skills"

    subject = f"Application for {title} — {name}"
    email_body = (
        f"Dear Hiring Team,\n\n"
        f"I am writing to express my strong interest in the {title} role at {company}. "
        f"With hands-on experience in {top_skills}, I am confident I can contribute meaningfully "
        f"to your team from day one.\n\n"
        f"My background aligns well with the requirements outlined in the job description. "
        f"I have consistently delivered high-quality results in fast-paced environments, and I am "
        f"excited about the opportunity to bring that same drive to {company}.\n\n"
        f"I would love to schedule a brief call to discuss how my skills can support your goals. "
        f"Please find my tailored resume attached for your review.\n\n"
        f"Thank you for your time and consideration.\n\nBest regards,\n{name}"
    )
    short_cover = (
        f"I'm {name}, a candidate with experience in {top_skills}. "
        f"I'm excited about the {title} role at {company} and would love to connect."
    )
    return {"subject": subject, "email_body": email_body, "short_cover": short_cover}
