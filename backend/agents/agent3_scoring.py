"""Agent 3 — Match Scoring
Deterministic scoring: 40% skills + 20% ATS + 15% location + 10% salary + 10% experience + 5% boost.
"""
import re
from datetime import datetime, date


def score_all(profile: dict, jobs: list) -> list:
    """Score all jobs against profile, return sorted by match_score descending."""
    results = []
    for job in jobs:
        s = score_job(profile, job)
        results.append({**job, "score": s})
    results.sort(key=lambda x: x["score"]["match_score"], reverse=True)
    return results


def score_job(profile: dict, job: dict) -> dict:
    skills      = _skill_score(profile, job)
    ats         = _ats_score(profile, job)
    location    = _location_score(profile, job)
    salary      = _salary_score(profile, job)
    experience  = _experience_score(profile, job)
    freshness   = _freshness_score(job)
    remote      = _remote_score(profile, job)

    composite = (
        skills     * 0.40 +
        ats        * 0.20 +
        location   * 0.15 +
        salary     * 0.10 +
        experience * 0.10 +
        5          # base AI boost
    )
    match_score = min(100, round(composite))

    return {
        "match_score": match_score,
        "skill_overlap": round(skills),
        "experience_overlap": round(experience),
        "location_match": round(location),
        "remote_compatibility": round(remote),
        "ats_keyword_similarity": round(ats),
        "salary_match": round(salary),
        "job_freshness": round(freshness),
        "estimated_shortlist_probability": round(match_score * 0.75),
        "reasoning": _reasoning(profile, job, skills, ats, location),
    }


# ── sub-scores ────────────────────────────────────────────────────────────────

from agents.filters import KeywordMatcher

def _skill_score(profile: dict, job: dict) -> float:
    job_text = (job.get("title", "") + " " + job.get("description", "")).lower()
    profile_text = " ".join(profile.get("skills", [])).lower()
    
    if not profile_text or not job_text:
        return 50.0
        
    score = KeywordMatcher.match_score(job_text, profile_text)
    return min(100.0, score * 200.0) # Scale up cosine similarity


def _ats_score(profile: dict, job: dict) -> float:
    profile_text = " ".join(profile.get("skills", []) + profile.get("roles", [])).lower()
    job_text = job.get("description", "").lower()
    
    if not profile_text or not job_text:
        return 50.0
        
    score = KeywordMatcher.match_score(job_text, profile_text)
    return min(100.0, score * 200.0)


def _location_score(profile: dict, job: dict) -> float:
    if job.get("remote"):
        return 90.0
    cloc = profile.get("location", "").lower()
    jloc = job.get("location", "").lower()
    if not cloc or cloc == "not specified":
        return 60.0
    if cloc in jloc or jloc in cloc:
        return 95.0
    for token in cloc.split():
        if len(token) > 2 and token in jloc:
            return 70.0
    return 40.0


def _salary_score(profile: dict, job: dict) -> float:
    exp = profile.get("salary_expectation", {})
    emin, emax = exp.get("min", 0), exp.get("max", 0)
    jmin, jmax = job.get("salary_min", 0), job.get("salary_max", 0)
    if not emin and not emax:
        return 70.0
    if not jmin and not jmax:
        return 70.0
    emid = (emin + emax) / 2
    jmid = (jmin + jmax) / 2
    if jmid == 0:
        return 70.0
    diff_pct = abs(emid - jmid) / jmid
    return max(0.0, 100.0 - diff_pct * 100)


def _experience_score(profile: dict, job: dict) -> float:
    years = profile.get("experience_years", 0)
    text = job.get("description", "").lower()
    patterns = [
        r'(\d+)\+?\s*years?\s+of\s+experience',
        r'(\d+)\+?\s*years?\s+experience',
        r'minimum\s+(\d+)\s+years?',
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            req = int(m.group(1))
            if years >= req:      return 95.0
            if years >= req - 1:  return 70.0
            return 40.0
    return 70.0


def _freshness_score(job: dict) -> float:
    posted = job.get("posted_at", "")
    if not posted:
        return 60.0
    try:
        d = datetime.strptime(posted[:10], "%Y-%m-%d").date()
        age = (date.today() - d).days
        if age <= 3:   return 100.0
        if age <= 7:   return 90.0
        if age <= 14:  return 75.0
        if age <= 30:  return 60.0
        return 40.0
    except Exception:
        return 60.0


def _remote_score(profile: dict, job: dict) -> float:
    pref = profile.get("remote_preference", "flexible").lower()
    remote = job.get("remote", False)
    if pref == "remote":  return 100.0 if remote else 30.0
    if pref == "onsite":  return 30.0  if remote else 100.0
    return 80.0


def _reasoning(profile, job, skills, ats, location) -> list:
    reasons = []
    candidate = {s.lower() for s in profile.get("skills", [])}
    text = (job.get("title", "") + " " + job.get("description", "")).lower()
    matched = [s.title() for s in candidate if s in text]
    if matched:
        reasons.append(f"Matching skills: {', '.join(matched[:4])}")
    if skills >= 70:
        reasons.append("Strong skill alignment with job requirements")
    elif skills >= 40:
        reasons.append("Partial skill overlap — consider upskilling")
    else:
        reasons.append("Low skill overlap — consider related roles")
    if job.get("remote"):
        reasons.append("Remote-friendly role")
    if ats >= 60:
        reasons.append("Good ATS keyword match")
    if location >= 80:
        reasons.append("Location preference aligned")
    return reasons[:4]
