"""Agent 0 — Social Link Enrichment
Collects profile signals from:
- GitHub (official public REST API)
- LinkedIn (Apify actor, optional if token configured)
"""

from __future__ import annotations

import os
from urllib.parse import urlparse

import requests
from apify_client import ApifyClient


def collect(github_url: str = "", linkedin_url: str = "") -> dict:
    return {
        "github": _collect_github(github_url),
        "linkedin": _collect_linkedin(linkedin_url),
    }


def _extract_github_username(github_url: str) -> str:
    if not github_url.strip():
        return ""

    try:
        parsed = urlparse(github_url.strip())
        parts = [p for p in parsed.path.split("/") if p]
        if parts:
            return parts[0]
    except Exception:
        pass

    cleaned = github_url.replace("https://", "").replace("http://", "").strip("/")
    parts = cleaned.split("/")
    if len(parts) >= 2 and "github.com" in parts[0].lower():
        return parts[1]
    return parts[0] if parts else ""


def _collect_github(github_url: str) -> dict:
    username = _extract_github_username(github_url)
    if not username:
        return {"status": "skipped", "reason": "No GitHub URL provided"}

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "zero-gravity-enrichment",
    }
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    user_res = requests.get(f"https://api.github.com/users/{username}", headers=headers, timeout=20)
    if user_res.status_code != 200:
        return {
            "status": "error",
            "reason": f"GitHub user lookup failed ({user_res.status_code})",
            "username": username,
        }
    user = user_res.json()

    repos_res = requests.get(
        f"https://api.github.com/users/{username}/repos?sort=updated&per_page=12",
        headers=headers,
        timeout=20,
    )
    repos = repos_res.json() if repos_res.status_code == 200 and isinstance(repos_res.json(), list) else []

    total_stars = 0
    languages: dict[str, int] = {}
    top_repos = []

    for repo in repos:
        stars = int(repo.get("stargazers_count", 0))
        total_stars += stars
        language = repo.get("language")
        if language:
            languages[language] = languages.get(language, 0) + 1

        top_repos.append(
            {
                "name": repo.get("name", ""),
                "url": repo.get("html_url", ""),
                "description": repo.get("description", "") or "",
                "language": language or "",
                "stars": stars,
            }
        )

    top_repos.sort(key=lambda r: r["stars"], reverse=True)

    return {
        "status": "ok",
        "username": username,
        "profile_url": user.get("html_url", github_url),
        "name": user.get("name", ""),
        "bio": user.get("bio", "") or "",
        "public_repos": int(user.get("public_repos", 0)),
        "followers": int(user.get("followers", 0)),
        "following": int(user.get("following", 0)),
        "total_stars": total_stars,
        "top_languages": sorted(languages.items(), key=lambda kv: kv[1], reverse=True)[:8],
        "top_repos": top_repos[:6],
    }


def _collect_linkedin(linkedin_url: str) -> dict:
    if not linkedin_url.strip():
        return {"status": "skipped", "reason": "No LinkedIn URL provided"}

    token = os.getenv("APIFY_API_TOKEN", "").strip()
    if not token:
        return {"status": "skipped", "reason": "APIFY_API_TOKEN not configured"}

    actor_id = os.getenv("APIFY_LINKEDIN_ACTOR", "curious_coder/linkedin-profile-scraper").strip()
    client = ApifyClient(token)

    run_input = {
        "minDelay": 15,
        "maxDelay": 60,
        "proxy": {"useApifyProxy": True, "apifyProxyCountry": "US"},
        "startUrls": [{"url": linkedin_url.strip()}],
        "profileUrls": [linkedin_url.strip()],
    }

    try:
        run = client.actor(actor_id).call(run_input=run_input)
        dataset_id = run.get("defaultDatasetId")
        if not dataset_id:
            return {"status": "error", "reason": "Apify run completed without dataset"}

        items = list(client.dataset(dataset_id).iterate_items())
        if not items:
            return {"status": "error", "reason": "No LinkedIn data returned by actor"}

        first = items[0]
        return {
            "status": "ok",
            "actor": actor_id,
            "dataset_id": dataset_id,
            "profile_url": first.get("url") or first.get("linkedinUrl") or linkedin_url.strip(),
            "full_name": first.get("fullName") or first.get("name") or "",
            "headline": first.get("headline") or "",
            "location": first.get("location") or "",
            "connections": first.get("connectionsCount") or first.get("connections") or "",
            "raw": first,
        }
    except Exception as e:
        return {"status": "error", "reason": f"Apify LinkedIn scrape failed: {e}"}
