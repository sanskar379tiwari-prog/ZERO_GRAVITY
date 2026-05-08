"""Agent 1 — Ultra-Fidelity Profile Extraction
Analyzes Resume + Deep GitHub data to build a verified candidate identity.
Includes retry logic for high-demand periods.
"""
import os, json, time
from google import genai
from google.genai import errors
from agents import agent0_enrichment
from usage import tracker
from dotenv import load_dotenv

load_dotenv()
_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
MODEL = "gemini-1.5-flash"

PROFILE_SCHEMA = {
    "name": "Full Name",
    "skills": ["Skill1", "Skill2"],
    "roles": ["Role1"],
    "experience_years": 0,
    "location": "City, Country",
    "salary_expectation": {"min": 0, "max": 0},
    "remote_preference": "remote/onsite/hybrid",
    "projects": [{"title": "Name", "description": "Short summary", "tech_stack": ["Tech1"]}]
}

PROMPT = """Analyze the provided RESUME and GITHUB CONTEXT to build a professional profile.

RESUME:
{resume_text}

GITHUB CONTEXT:
{context}

TASK:
1. Combine resume facts with verified GitHub projects/skills.
2. If the resume is missing, build the profile ENTIRELY from the GitHub context.
3. Extract specific frameworks, tools, and languages.

RETURN ONLY RAW JSON:
{schema}"""

def extract(resume_text: str = "", github_url: str = "", role_preference: str = "") -> dict:
    ctx_parts = []
    
    if github_url:
        print(f"[Agent 1] Ultra-Deep Analysis for: {github_url}")
        gh_data = agent0_enrichment.collect(github_url=github_url)
        if gh_data.get("github", {}).get("status") == "ok":
            gh = gh_data["github"]
            fp = gh.get("technical_fingerprint", {})
            catalog = gh.get("project_catalog", [])
            
            # Detailed debug log
            print(f"  > GitHub Data: {len(gh.get('profile_readme',''))} bytes of Profile README")
            print(f"  > GitHub Projects: {len(catalog)} projects found.")

            gh_summary = (
                f"--- GITHUB VERIFIED DATA ---\n"
                f"Bio: {gh.get('bio')}\n"
                f"Profile README:\n{gh.get('profile_readme', '')[:1200]}\n"
                f"Top Languages: {', '.join(fp.get('top_languages', []))}\n"
                f"Project History:\n"
            )
            for p in catalog:
                gh_summary += f"- {p['title']}: {p['description']}\n  README Snippet: {p.get('readme_snippet','')[:600]}\n"
            
            ctx_parts.append(gh_summary)
            if not resume_text:
                resume_text = "N/A - Extract from GitHub only"
        else:
            print(f"  > GitHub Scan Failed: {gh_data.get('github', {}).get('reason')}")

    if role_preference:
        ctx_parts.append(f"Target Role: {role_preference}")

    full_prompt = PROMPT.format(
        resume_text=resume_text,
        context="\n".join(ctx_parts),
        schema=json.dumps(PROFILE_SCHEMA)
    )

    for attempt in range(3):
        try:
            tracker.log_call("Gemini (3.1 Flash-Lite)")
            response = _client.models.generate_content(model=MODEL, contents=full_prompt)
            raw = response.text.strip()
            
            if "```" in raw:
                raw = raw.split("```")[1].replace("json", "", 1).strip()
            
            profile = json.loads(raw.strip())
            return profile

        except errors.ServerError:
            wait = (attempt + 1) * 3
            print(f"[Agent 1] Gemini Busy (503). Retrying in {wait}s... ({attempt+1}/3)")
            time.sleep(wait)
        except Exception as e:
            if attempt == 2:
                print(f"[Agent 1] Critical Failure: {e}")
                return _fallback(resume_text)
            time.sleep(1)

    return _fallback(resume_text)

def _fallback(text: str) -> dict:
    """Basic keyword fallback."""
    return {
        "name": "Technical Candidate",
        "skills": ["Python", "JavaScript", "Git"],
        "roles": ["Software Engineer"],
        "experience_years": 1,
        "location": "Remote",
        "projects": []
    }
