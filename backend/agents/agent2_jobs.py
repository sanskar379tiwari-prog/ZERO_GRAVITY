"""Agent 2 — Job Discovery (Google Jobs via SerpApi)
Fetches jobs using the Google Jobs Search API.
Falls back to mock_jobs.json if API key is missing or fails.
"""
import json
import os
from pathlib import Path
from serpapi import GoogleSearch
from dotenv import load_dotenv

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
MOCK_PATH = Path(__file__).resolve().parents[2] / "mock_jobs.json"


def fetch(query: str = "software engineer", location: str = "", page: int = 1) -> list:
    """Fetch jobs — Google Jobs API with mock fallback."""
    if SERPAPI_KEY:
        try:
            return _google_jobs(query, location, page)
        except Exception as e:
            print(f"[Agent 2] Google Jobs API failed: {e}. Using mock jobs.")
    
    print("[Agent 2] No SerpApi key found or API failed. Using mock data.")
    return _mock()


def _google_jobs(query: str, location: str, page: int) -> list:
    """Search Google Jobs via SerpApi."""
    search_query = f"{query} {location}".strip()
    
    # SerpApi parameters for Google Jobs
    params = {
        "engine": "google_jobs",
        "q": search_query,
        "hl": "en",
        "api_key": SERPAPI_KEY,
        "start": (page - 1) * 10
    }

    search = GoogleSearch(params)
    results = search.get_dict()
    
    jobs_results = results.get("jobs_results", [])
    
    jobs = []
    for item in jobs_results:
        # Normalize to our internal Job schema
        jobs.append({
            "id": item.get("job_id", ""),
            "title": item.get("title", ""),
            "company": item.get("company_name", ""),
            "location": item.get("location", "Remote"),
            "remote": "remote" in (item.get("location", "").lower() + item.get("description", "").lower()),
            "salary_min": 0, # SerpApi often doesn't give structured salary
            "salary_max": 0,
            "description": item.get("description", "")[:2000],
            "posted_at": item.get("detected_extensions", {}).get("posted_at", "Recently"),
            "url": item.get("related_links", [{}])[0].get("link", "") if item.get("related_links") else ""
        })
        
    return jobs


def _mock() -> list:
    """Load mock_jobs.json as demo fallback."""
    if MOCK_PATH.exists():
        with open(MOCK_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []
