"""Agent 0 — Fault-Tolerant GitHub Enrichment (GraphQL)
Safely extracts deep technical signals using a single GraphQL query.
"""
from __future__ import annotations
import os, requests, json
from urllib.parse import urlparse

def collect(github_url: str = "", linkedin_url: str = "") -> dict:
    """Main entry point. Guaranteed to return a valid dictionary."""
    return {
        "github": _collect_github(github_url),
        "linkedin": {"status": "skipped", "reason": "LinkedIn disabled"}
    }

def _parse_username(url: str) -> str:
    """Robust username extraction from various URL formats."""
    if not url: return ""
    try:
        # Clean up URL
        url = url.strip().lower()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
            
        parsed = urlparse(url)
        path = parsed.path.strip('/')
        parts = path.split('/')
        
        if not parts: return ""
        
        # If the first part is 'github.com', the username is the second part
        if parts[0] == 'github.com':
            return parts[1] if len(parts) > 1 else ""
            
        # Otherwise, the first part is the username
        return parts[0].split('?')[0].split('#')[0]
    except:
        return ""

def _collect_github(github_url: str) -> dict:
    # 1. Fail-Safe Initial State
    fallback = {
        "status": "partial",
        "username": "",
        "bio": "",
        "profile_readme": "",
        "technical_fingerprint": {"top_languages": [], "total_repos": 0},
        "project_catalog": []
    }

    username = _parse_username(github_url)
    if not username:
        return {**fallback, "status": "skipped", "reason": "Invalid GitHub URL"}

    print(f"[Agent 0] Starting GraphQL Deep Extraction for: {username}")
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if not token:
        print("⚠️  [Agent 0] GITHUB_TOKEN missing. Falling back to (limited) REST or mock.")
        return {**fallback, "status": "error", "reason": "GITHUB_TOKEN missing"}

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 2. Optimized GraphQL Query
    query = """
    query($username: String!) {
      user(login: $username) {
        name
        bio
        publicRepos: repositories {
          totalCount
        }
        followers {
          totalCount
        }
        profileReadme: repository(name: $username) {
          object(expression: "HEAD:README.md") {
            ... on Blob {
              text
            }
          }
        }
        repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}, isFork: false) {
          nodes {
            name
            description
            stargazerCount
            repositoryTopics(first: 10) {
              nodes {
                topic {
                  name
                }
              }
            }
            languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                }
              }
            }
            readme: object(expression: "HEAD:README.md") {
              ... on Blob {
                text
              }
            }
          }
        }
      }
    }
    """

    try:
        response = requests.post(
            "https://api.github.com/graphql",
            headers=headers,
            json={"query": query, "variables": {"username": username}},
            timeout=15
        )
        
        if response.status_code != 200:
            return {**fallback, "status": "error", "reason": f"GitHub API {response.status_code}"}

        res_data = response.json()
        if "errors" in res_data:
            err_msg = res_data["errors"][0].get("message", "Unknown GraphQL error")
            print(f"❌ [Agent 0] GraphQL Errors: {err_msg}")
            return {**fallback, "status": "error", "reason": err_msg}

        user_data = res_data.get("data", {}).get("user")
        if not user_data:
            return {**fallback, "status": "error", "reason": "User not found"}

        # 3. Data Aggregation
        profile_readme = ""
        if user_data.get("profileReadme") and user_data["profileReadme"].get("object"):
            profile_readme = user_data["profileReadme"]["object"].get("text", "")

        aggregated_languages = {}
        project_catalog = []
        
        repos = user_data.get("repositories", {}).get("nodes", [])
        for r in repos:
            repo_name = r.get("name")
            
            # Languages
            lang_edges = r.get("languages", {}).get("edges", [])
            for edge in lang_edges:
                lang_name = edge["node"]["name"]
                size = edge["size"]
                aggregated_languages[lang_name] = aggregated_languages.get(lang_name, 0) + size
            
            # Topics
            topics = [t["topic"]["name"] for t in r.get("repositoryTopics", {}).get("nodes", [])]
            
            # README snippet
            readme_text = ""
            if r.get("readme"):
                readme_text = r["readme"].get("text", "")[:1000]

            project_catalog.append({
                "title": repo_name,
                "description": r.get("description") or "Technical repository",
                "readme_snippet": readme_text,
                "topics": topics,
                "stars": r.get("stargazerCount", 0)
            })

        sorted_langs = sorted(aggregated_languages.items(), key=lambda x: x[1], reverse=True)
        top_langs = [l[0] for l in sorted_langs[:8]]

        return {
            "status": "ok",
            "username": username,
            "bio": user_data.get("bio", ""),
            "profile_readme": profile_readme,
            "technical_fingerprint": {
                "top_languages": top_langs,
                "total_repos": user_data.get("publicRepos", {}).get("totalCount", 0)
            },
            "project_catalog": project_catalog[:5]
        }

    except Exception as e:
        print(f"[Agent 0] Fatal Crash in Scraper: {e}")
        return {**fallback, "status": "error", "reason": str(e)}
