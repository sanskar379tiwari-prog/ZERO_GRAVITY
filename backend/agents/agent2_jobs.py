"""Agent 2 — Unified Multi-Source Job Discovery
Aggregates jobs from JSearch and Adzuna.
Includes Deduplication Layer and Schema Normalization.
"""
import json
import os
import requests
import time
from pathlib import Path
from dotenv import load_dotenv
from usage import tracker
from agents import agent2_adzuna

load_dotenv(override=True)

JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY", "")
MOCK_PATH = Path(__file__).resolve().parents[2] / "mock_jobs.json"

def fetch_batch(queries: list, location: str = "", limit: int = 50) -> list:
    """
    Fetch and aggregate jobs from multiple sources.
    Includes Deduplication.
    """
    all_jobs = []
    
    if not queries:
        queries = ["software engineer"]

    # 1. Fetch from JSearch
    print(f"[Agent 2] Fetching from JSearch...")
    jsearch_jobs = _fetch_jsearch_batch(queries, location, limit=limit//2 + 10)
    all_jobs.extend(jsearch_jobs)

    # 2. Fetch from Adzuna
    print(f"[Agent 2] Fetching from Adzuna...")
    adzuna_jobs = agent2_adzuna.fetch(queries[0], location=location, limit=limit//2 + 10)
    all_jobs.extend(adzuna_jobs)

    # 3. Deduplication Layer ⭐
    unique_jobs = _deduplicate(all_jobs)
    
    print(f"[Agent 2] Combined {len(all_jobs)} jobs. After deduplication: {len(unique_jobs)}")
    
    if not unique_jobs and not JSEARCH_API_KEY:
        print("[Agent 2] Using mock fallback.")
        return _mock()
        
    return unique_jobs[:limit]

def _deduplicate(jobs: list) -> list:
    """Deduplicate by title + company + location (normalized)."""
    seen = set()
    unique = []
    for job in jobs:
        # Create a 'fingerprint'
        title = str(job.get("title", "")).lower().strip()
        company = str(job.get("company", "")).lower().strip()
        location = str(job.get("location", "")).lower().strip()
        
        # Remove common suffixes for better matching
        company = company.replace("inc.", "").replace("ltd.", "").replace("corp.", "").strip()
        
        fingerprint = f"{title}|{company}|{location[:20]}"
        if fingerprint not in seen:
            seen.add(fingerprint)
            unique.append(job)
    return unique

def _fetch_jsearch_batch(queries: list, location: str, limit: int) -> list:
    batch = []
    for q in queries:
        if len(batch) >= limit: break
        try:
            results = _jsearch_fetch(q, location, page=1)
            batch.extend(results)
        except: pass
    return batch

def _jsearch_fetch(query: str, location: str, page: int) -> list:
    if not JSEARCH_API_KEY: return []
    tracker.log_call("JSearch (RapidAPI)")
    url = "https://jsearch.p.rapidapi.com/search"
    full_query = f"{query} in {location}" if location else query
    
    headers = {"X-RapidAPI-Key": JSEARCH_API_KEY, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"}
    params = {"query": full_query, "page": str(page), "num_pages": "1"}
    
    res = requests.get(url, headers=headers, params=params, timeout=20)
    res.raise_for_status()
    results = res.json().get("data", [])
    
    jobs = []
    for item in results:
        jobs.append({
            "id": str(item.get("job_id", "")),
            "source": "JSearch",
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

def generate_queries(profile: dict) -> list:
    """Helper to generate variants."""
    roles = profile.get("roles", [])
    variants = roles[:3]
    if not variants: variants = ["software engineer"]
    return variants

def _mock() -> list:
    if MOCK_PATH.exists():
        with open(MOCK_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Add source to mock data
            for j in data: j["source"] = "Mock"
            return data
    return []
