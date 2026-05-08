"""Agent 6 — Application Tracking & Interview Scheduling (Supabase)
Manages application state and basic interview slot conflict detection.
Uses Supabase for persistent storage on Render.
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Supabase Initialization
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Agent 6: Supabase persistence active.")
    except Exception as e:
        print(f"⚠️ Agent 6: Supabase init failed: {e}. Falling back to in-memory (NON-PERSISTENT).")
else:
    print("⚠️ Agent 6: SUPABASE_URL/KEY missing. Using in-memory store (NON-PERSISTENT).")

# Fallback stores if Supabase is unavailable
_applications_mem: Dict[str, dict] = {}
_interviews_mem: Dict[str, dict] = {}

VALID_STATUSES = {"Applied", "Pending", "Interview", "Rejected", "Offer"}

# ---------------------------------------------------------------------------
# Application helpers
# ---------------------------------------------------------------------------

def create_application(
    job_id: str,
    job_title: str,
    company: str,
    profile_name: str,
    status: str = "Applied",
) -> dict:
    """Create and store a new application record."""
    app_id = f"app-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat() + "Z"
    
    record = {
        "app_id": app_id,
        "job_id": job_id,
        "job_title": job_title,
        "company": company,
        "profile_name": profile_name,
        "status": status if status in VALID_STATUSES else "Applied",
        "created_at": now,
        "updated_at": now,
        "interview_id": None,
        "notes": "",
    }

    if _supabase:
        try:
            _supabase.table("applications").insert(record).execute()
            return record
        except Exception as e:
            print(f"❌ Supabase Insert Error: {e}")
            # Fallback to memory on error
    
    _applications_mem[app_id] = record
    return record


def get_applications() -> list:
    """Return all tracked applications sorted by most recent."""
    if _supabase:
        try:
            res = _supabase.table("applications").select("*").order("created_at", desc=True).execute()
            return res.data
        except Exception as e:
            print(f"❌ Supabase Fetch Error: {e}")

    return sorted(
        _applications_mem.values(),
        key=lambda a: a["created_at"],
        reverse=True,
    )


def update_status(app_id: str, status: str) -> Optional[dict]:
    """Update the status of an existing application."""
    if status not in VALID_STATUSES:
        return None
    
    now = datetime.utcnow().isoformat() + "Z"

    if _supabase:
        try:
            res = _supabase.table("applications").update({
                "status": status,
                "updated_at": now
            }).eq("app_id", app_id).execute()
            
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"❌ Supabase Update Error: {e}")

    if app_id in _applications_mem:
        _applications_mem[app_id]["status"] = status
        _applications_mem[app_id]["updated_at"] = now
        return _applications_mem[app_id]
        
    return None


# ---------------------------------------------------------------------------
# Interview scheduling helpers
# ---------------------------------------------------------------------------

def schedule_interview(
    app_id: str,
    datetime_iso: str,
    duration_minutes: int = 60,
    platform: str = "Google Meet",
    notes: str = "",
) -> dict:
    """
    Schedule an interview for an application.
    Detects time conflicts with existing interviews.
    """
    conflict = _detect_conflict(datetime_iso, duration_minutes)
    if conflict:
        return {
            "error": "time_conflict",
            "message": f"Conflict with interview at {conflict['scheduled_at']}",
            "conflicting_interview": conflict,
        }

    interview_id = f"iv-{uuid.uuid4().hex[:8]}"
    
    # Get company name from application
    company = "Unknown"
    apps = get_applications()
    for a in apps:
        if a.get("app_id") == app_id:
            company = a.get("company", "Unknown")
            break

    record = {
        "id": interview_id,
        "app_id": app_id,
        "company": company,
        "scheduled_at": datetime_iso,
        "duration_minutes": duration_minutes,
        "platform": platform,
        "notes": notes,
        "status": "Scheduled",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    if _supabase:
        try:
            _supabase.table("interviews").insert(record).execute()
            # Bump application status
            update_status(app_id, "Interview")
            return record
        except Exception as e:
            print(f"❌ Supabase Interview Insert Error: {e}")

    _interviews_mem[interview_id] = record
    if app_id in _applications_mem:
        _applications_mem[app_id]["interview_id"] = interview_id
        _applications_mem[app_id]["status"] = "Interview"
        _applications_mem[app_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"

    return record


def get_interviews() -> list:
    """Return all scheduled interviews sorted chronologically."""
    if _supabase:
        try:
            res = _supabase.table("interviews").select("*").order("scheduled_at").execute()
            return res.data
        except Exception as e:
            print(f"❌ Supabase Interview Fetch Error: {e}")

    return sorted(
        _interviews_mem.values(),
        key=lambda i: i["scheduled_at"],
    )


def _detect_conflict(new_start_iso: str, duration: int) -> Optional[dict]:
    """Return the first conflicting interview record, or None."""
    try:
        new_start = datetime.fromisoformat(new_start_iso.replace("Z", "+00:00"))
    except ValueError:
        return None

    new_end = new_start + timedelta(minutes=duration)
    interviews = get_interviews()

    for iv in interviews:
        try:
            iv_start = datetime.fromisoformat(iv["scheduled_at"].replace("Z", "+00:00"))
            iv_end = iv_start + timedelta(minutes=iv.get("duration_minutes", 60))
        except ValueError:
            continue

        if new_start < iv_end and new_end > iv_start:
            return iv

    return None
