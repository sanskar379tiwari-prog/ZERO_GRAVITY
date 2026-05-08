"""Agent 2 — Job Discovery
Fetches jobs from JSearch API (RapidAPI). Falls back to mock_jobs.json.
"""
import json
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

JSEARCH_KEY = os.getenv("JSEARCH_API_KEY", "")
MOCK_PATH = Path(__file__).resolve().parents[2] / "mock_jobs.json"


def fetch(query: str = "software engineer", location: str = "", page: int = 1) -> list:
    """Fetch jobs — JSearch API with mock fallback."""
    if JSEARCH_KEY:
        try:
            return _jsearch(query, location, page)
        except Exception as e:
            print(f"[Agent 2] JSearch failed: {e}. Using mock jobs.")
    return _mock()


def _jsearch(query: str, location: str, page: int) -> list:
    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": JSEARCH_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {
        "query": f"{query} {location}".strip(),
        "page": str(page),
        "num_results": "10",
        "date_posted": "month",
    }
    resp = requests.get(url, headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    jobs = []
    for item in data.get("data", []):
        city = item.get("job_city", "")
        country = item.get("job_country", "")
        location_str = ", ".join(filter(None, [city, country]))
        jobs.append({
            "id": item.get("job_id", ""),
            "title": item.get("job_title", ""),
            "company": item.get("employer_name", ""),
            "location": location_str or "Not specified",
            "remote": bool(item.get("job_is_remote", False)),
            "salary_min": item.get("job_min_salary") or 0,
            "salary_max": item.get("job_max_salary") or 0,
            "description": (item.get("job_description") or "")[:1000],
            "posted_at": (item.get("job_posted_at_datetime_utc") or "")[:10],
            "url": item.get("job_apply_link", ""),
        })
    return jobs


def _mock() -> list:
    """Load mock_jobs.json as demo fallback."""
    if MOCK_PATH.exists():
        with open(MOCK_PATH, "r") as f:
            return json.load(f)
    return [
        {
            "id": "mock-001",
            "title": "Junior Software Engineer",
            "company": "Acme Corp",
            "location": "Remote",
            "remote": True,
            "salary_min": 55000,
            "salary_max": 75000,
            "description": "Build scalable APIs using Python and FastAPI.",
            "posted_at": "2026-05-01",
            "url": "https://example.com/jobs/mock-001",
        }
    ]
