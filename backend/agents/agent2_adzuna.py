"""Agent 2.2 — Adzuna Job Source (via RapidAPI)
Fetches jobs from the Adzuna API using the RapidAPI Hub.
"""
import os
import requests
from dotenv import load_dotenv
from usage import tracker

load_dotenv(override=True)

RAPIDAPI_KEY = os.getenv("JSEARCH_API_KEY", "") # Reuse the same RapidAPI key
ADZUNA_HOST = "adzuna-adzuna-v1.p.rapidapi.com" # Common RapidAPI Adzuna host

def fetch(query: str, location: str = "", country: str = "us", limit: int = 20) -> list:
    """Fetch jobs from Adzuna via RapidAPI."""
    if not RAPIDAPI_KEY:
        print("[Agent 2.2 Adzuna] ERROR: RapidAPI Key missing.")
        return []

    print(f"[Agent 2.2 Adzuna] Fetching jobs for '{query}' in {location} via RapidAPI")
    tracker.log_call("Adzuna (RapidAPI)")
    
    # Adzuna RapidAPI URL structure
    # Country code is part of the path
    url = f"https://{ADZUNA_HOST}/jobs/{country}/search/1"
    
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": ADZUNA_HOST
    }
    
    params = {
        "what": query,
        "results_per_page": str(limit),
        "content-type": "application/json"
    }
    
    if location:
        params["where"] = location

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        
        jobs = []
        for item in results:
            # Schema normalization
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
        
        return jobs
    except Exception as e:
        print(f"[Agent 2.2 Adzuna] RapidAPI Error: {e}")
        return []
