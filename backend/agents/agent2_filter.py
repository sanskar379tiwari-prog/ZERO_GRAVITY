"""Agent 2.1 — Hard Filtering Layer
Deterministic, fast filtering to prune weak matches before AI scoring.
Inspired by Career-Ops evaluation philosophy.
"""
import re

def apply_hard_filters(jobs: list, profile: dict) -> list:
    """
    Apply fast deterministic filters.
    - Role/Seniority Mismatch
    - Tech Stack (Must-have skills)
    - Remote Preference
    """
    filtered = []
    
    # 1. Extract seniority from profile
    experience_years = profile.get("experience_years", 0)
    is_senior_profile = experience_years >= 5
    is_junior_profile = experience_years < 2
    
    # 2. Tech stack (top 3 skills as soft-required)
    profile_skills = [s.lower() for s in profile.get("skills", [])[:5]]
    
    # 3. Remote pref
    remote_pref = str(profile.get("remote_preference", "flexible")).lower()
    
    for job in jobs:
        title = job.get("title", "").lower()
        desc = job.get("description", "").lower()
        
        # A. Seniority Filter
        # Prune Senior/Lead/Staff roles for Junior profiles
        if is_junior_profile:
            if any(word in title for word in ["senior", "sr.", "lead", "staff", "principal", "architect"]):
                continue
        
        # Prune Intern/Junior roles for Senior profiles
        if is_senior_profile:
            if any(word in title for word in ["intern", "junior", "jr.", "entry"]):
                continue
                
        # B. Tech Stack Filter (Obvious mismatches)
        # If profile is very specific to a stack (e.g. React) but job is totally different (e.g. PHP)
        # We only do this if we have enough jobs to be picky
        if "react" in profile_skills and "php" in title and "react" not in desc:
             continue
        if "python" in profile_skills and "java" in title and "python" not in desc:
             continue

        # C. Remote Check
        if remote_pref == "remote" and not job.get("remote"):
            # If user EXPLICITLY wants remote, and job isn't, prune it
            # But JSearch remote flag is sometimes unreliable, so we also check desc
            if "remote" not in desc and "work from home" not in desc:
                continue
        
        filtered.append(job)
        
    print(f"[Agent 2.1 Filter] Pruned {len(jobs) - len(filtered)} jobs. {len(filtered)} remaining.")
    return filtered
