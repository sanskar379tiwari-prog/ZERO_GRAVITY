"""Agent 3 — High-Fidelity Match Scoring
Strict JSON implementation with standardized keys: matched_skills, reasoning.
"""
import os, json, time, re
from google import genai
from google.genai import errors, types
from dotenv import load_dotenv
from usage import tracker

load_dotenv()
_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
MODEL = "gemini-3.1-flash-lite"

PROMPT = """You are an expert technical recruiter. Compare the CANDIDATE PROFILE with the JOBS.

CANDIDATE PROFILE:
{profile}

JOBS:
{jobs_json}

TASK:
For each job, identify matching technical skills and provide a match_score (0-100).

STRICT SCHEMA:
{{
  "results": [
    {{
      "internal_id": "idx-0",
      "match_score": 85,
      "matched_skills": ["Python", "React"],
      "reasoning": ["Matches your project 'X'", "Verified skills on GitHub"]
    }}
  ]
}}"""

def score_all(profile: dict, jobs: list) -> list:
    if not jobs: return []
    target_jobs = jobs[:10]
    
    jobs_for_ai = []
    for idx, j in enumerate(target_jobs):
        jobs_for_ai.append({
            "internal_id": f"idx-{idx}",
            "title": j.get("title"),
            "company": j.get("company"),
            "description": j.get("description", "")[:800]
        })

    prompt = PROMPT.replace("{jobs_json}", json.dumps(jobs_for_ai)).replace("{profile}", json.dumps(profile))

    print(f"[Agent 3] Performing Strict JSON AI Scoring for {len(target_jobs)} jobs...")
    
    # Configure Gemini for strict JSON output
    config = types.GenerateContentConfig(
        response_mime_type='application/json',
    )

    for attempt in range(3):
        try:
            tracker.log_call("Gemini (3.1 Flash-Lite)")
            response = _client.models.generate_content(
                model=MODEL, 
                contents=prompt,
                config=config
            )
            
            # With response_mime_type='application/json', result is guaranteed JSON string
            data = json.loads(response.text.strip())
            ai_results = {res["internal_id"]: res for res in data.get("results", [])}
            
            final_results = []
            for idx, j in enumerate(target_jobs):
                res = ai_results.get(f"idx-{idx}")
                if res:
                    final_results.append({
                        **j,
                        "match_score": res.get("match_score", 0),
                        "matched_skills": res.get("matched_skills", []),
                        "reasoning": res.get("reasoning", ["Technical match analyzed."])
                    })
                else:
                    final_results.append({**j, "match_score": 0, "matched_skills": [], "reasoning": ["Analysis skipped."] })
            return final_results

        except errors.ServerError:
            wait = (attempt + 1) * 2
            print(f"[Agent 3] Gemini Busy. Retrying in {wait}s...")
            time.sleep(wait)
        except Exception as e:
            if attempt == 2: raise e
            time.sleep(1)
            
    return []
