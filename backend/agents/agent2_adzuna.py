"""Agent 2.2 — Adzuna Job Source
Fetches jobs from the Adzuna API and normalizes them to the Zero Gravity schema.
"""
import os
import requests
from dotenv import load_dotenv
from usage import tracker

load_dotenv(override=True)

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")

def fetch(query: str, location: str = "", country: str = "us", limit: int = 20) -> list:
    """Fetch jobs from Adzuna."""
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        print("[Agent 2.2 Adzuna] WARNING: ADZUNA_APP_ID or APP_KEY missing. Skipping source.")
        return []

    print(f"[Agent 2.2 Adzuna] Fetching jobs for '{query}' in {location} ({country})")
    tracker.log_call("Adzuna API")
    
    # Adzuna uses different formatting for location/pagination
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": limit,
        "what": query,
        "content-type": "application/json"
    }
    
    if location:
        params["where"] = location

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        
        jobs = []
        for item in results:
            jobs.append({
                "id": str(item.get("id", "")),
                "source": "Adzuna",
                "title": item.get("title", ""),
                "company": item.get("company", {}).get("display_name", "Unknown"),
                "location": item.get("location", {}).get("display_name", "Unknown"),
                "remote": "remote" in (item.get("title", "") + item.get("description", "")).lower(),
                "salary_min": item.get("salary_min", 0) or 0,
                "salary_max": item.get("salary_max", 0) or 0,
                "description": item.get("description", ""),
                "posted_at": item.get("created", "Recently"),
                "url": item.get("redirect_url", "")
            })
        
        print(f"[Agent 2.2 Adzuna] Successfully fetched {len(jobs)} jobs.")
        return jobs
    except Exception as e:
        print(f"[Agent 2.2 Adzuna] Error: {e}")
        return []
