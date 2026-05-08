"""Agent 2 — Job Discovery (JSearch API)
The most reliable job search API on RapidAPI.
"""
import json
import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from usage import tracker

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
MOCK_PATH = Path(__file__).resolve().parents[2] / "mock_jobs.json"


def fetch(query: str = "software engineer", location: str = "", page: int = 1) -> list:
    """Fetch jobs — JSearch API with mock fallback."""
    # Build a powerful search query by combining role + location
    # Using 'in' keyword helps JSearch target the specific geography
    if location:
        full_query = f"{query} in {location}".strip()
    else:
        full_query = query
        
    print(f"[Agent 2] Fetching jobs from JSearch: '{full_query}'")
    
    if RAPIDAPI_KEY:
        try:
            results = _jsearch_fetch(full_query, page)
            if results and len(results) > 0:
                print(f"[Agent 2] Successfully fetched {len(results)} jobs from JSearch")
                return results
            else:
                print("[Agent 2] JSearch returned 0 jobs. Falling back to mock data.")
        except Exception as e:
            print(f"[Agent 2] JSearch API failed: {e}. Using mock jobs.")
    
    print("[Agent 2] No RapidAPI key or API returned 0 results. Using mock data.")
    return _mock()


def _jsearch_fetch(query: str, page: int) -> list:
    """Call JSearch API via RapidAPI."""
    tracker.log_call("JSearch (RapidAPI)")
    url = "https://jsearch.p.rapidapi.com/search"
    
    querystring = {
        "query": query,
        "page": str(page),
        "num_pages": "1"
    }

    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    if not RAPIDAPI_KEY:
        print("[Agent 2] WARNING: RAPIDAPI_KEY is missing from .env")

    response = requests.get(url, headers=headers, params=querystring, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    results = data.get("data", [])
    
    jobs = []
    for item in results:
        # Normalize to internal Job schema
        jobs.append({
            "id": str(item.get("job_id", "")),
            "title": item.get("job_title", ""),
            "company": item.get("employer_name", "Unknown"),
            "location": f"{item.get('job_city', '')}, {item.get('job_country', '')}",
            "remote": item.get("job_is_remote", False),
            "salary_min": item.get("job_min_salary", 0) or 0,
            "salary_max": item.get("job_max_salary", 0) or 0,
            "description": item.get("job_description", ""),
            "posted_at": "Recently",
            "url": item.get("job_apply_link", "")
        })
        
    return jobs


def _mock() -> list:
    """Load mock_jobs.json as demo fallback."""
    if MOCK_PATH.exists():
        with open(MOCK_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []
